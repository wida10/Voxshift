import { Router } from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth.js';
import { supabase }    from '../middleware/auth.js';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const db     = () => supabase.schema('voxshift');

const PLANS = {
  creator: { priceId: process.env.STRIPE_PRICE_CREATOR, minutesLimit: 60  },
  pro:     { priceId: process.env.STRIPE_PRICE_PRO,     minutesLimit: 300 },
};

// POST /api/stripe/create-checkout
router.post('/create-checkout', requireAuth, async (req, res) => {
  const { plan } = req.body;
  if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });

  const { data: user } = await db()
    .from('users')
    .select('email, stripe_customer_id')
    .eq('id', req.userId)
    .single();

  let customerId = user?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email:    user.email,
      metadata: { supabase_id: req.userId },
    });
    customerId = customer.id;
    await db().from('users').update({ stripe_customer_id: customerId }).eq('id', req.userId);
  }

  const session = await stripe.checkout.sessions.create({
    customer:   customerId,
    mode:       'subscription',
    line_items: [{ price: PLANS[plan].priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/dashboard?upgraded=1`,
    cancel_url:  `${process.env.FRONTEND_URL}/dashboard`,
    metadata:   { userId: req.userId, plan },
  });

  res.json({ url: session.url });
});

// POST /api/stripe/cancel
router.post('/cancel', requireAuth, async (req, res) => {
  const { data: sub } = await db()
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', req.userId)
    .eq('status', 'active')
    .single();

  if (!sub) return res.status(404).json({ error: 'No active subscription' });

  await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
  res.json({ ok: true });
});

// POST /api/stripe/webhook
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe] Webhook sig failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId  = session.metadata.userId;
      const plan    = session.metadata.plan;
      const subId   = session.subscription;
      const stripeSub = await stripe.subscriptions.retrieve(subId);

      await db().from('subscriptions').upsert({
        user_id:                userId,
        stripe_subscription_id: subId,
        plan,
        status:                 'active',
        current_period_start:   new Date(stripeSub.current_period_start * 1000).toISOString(),
        current_period_end:     new Date(stripeSub.current_period_end   * 1000).toISOString(),
      }, { onConflict: 'stripe_subscription_id' });

      await db().from('users').update({
        plan,
        minutes_limit: PLANS[plan].minutesLimit,
      }).eq('id', userId);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const { data: dbSub } = await db()
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', sub.id)
        .single();

      await db().from('subscriptions').update({ status: 'cancelled' }).eq('stripe_subscription_id', sub.id);

      if (dbSub) {
        await db().from('users').update({ plan: 'free', minutes_limit: 5 }).eq('id', dbSub.user_id);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      if (invoice.subscription) {
        await db().from('subscriptions').update({ status: 'past_due' }).eq('stripe_subscription_id', invoice.subscription);
      }
      break;
    }
  }

  res.json({ received: true });
});

export default router;
