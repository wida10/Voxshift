import { Router } from 'express';
import axios      from 'axios';
import crypto     from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { supabase }    from '../middleware/auth.js';

const router = Router();
const BASE   = 'https://api.lemonsqueezy.com/v1';
const db     = () => supabase.schema('voxshift');

const LS_HEADERS = {
  Authorization:  `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
  Accept:         'application/vnd.api+json',
  'Content-Type': 'application/vnd.api+json',
};

const PLANS = {
  starter: { variantId: process.env.LEMONSQUEEZY_VARIANT_STARTER, minutesLimit: 60  },
  pro:     { variantId: process.env.LEMONSQUEEZY_VARIANT_PRO,     minutesLimit: 250 },
};

let cachedStoreId = null;
async function getStoreId() {
  if (cachedStoreId) return cachedStoreId;
  const { data } = await axios.get(`${BASE}/stores`, { headers: LS_HEADERS });
  cachedStoreId = data.data[0].id;
  return cachedStoreId;
}

// POST /api/lemonsqueezy/checkout
router.post('/checkout', requireAuth, async (req, res) => {
  const { plan } = req.body;
  if (!PLANS[plan]) return res.status(400).json({ error: 'Plan inválido' });

  try {
    const storeId   = await getStoreId();
    const variantId = PLANS[plan].variantId;

    const { data: authUser } = await supabase.auth.admin.getUserById(req.userId);
    const email = authUser?.user?.email || '';

    const { data } = await axios.post(`${BASE}/checkouts`, {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email,
            custom: { user_id: req.userId },
          },
          product_options: {
            redirect_url: `${process.env.FRONTEND_URL}/dashboard?upgraded=1`,
          },
        },
        relationships: {
          store:   { data: { type: 'stores',   id: String(storeId)   } },
          variant: { data: { type: 'variants',  id: String(variantId) } },
        },
      },
    }, { headers: LS_HEADERS });

    res.json({ url: data.data.attributes.url });
  } catch (err) {
    console.error('[LS checkout]', err.response?.data || err.message);
    res.status(500).json({ error: 'No se pudo crear el checkout' });
  }
});

// POST /api/lemonsqueezy/webhook  (raw body — mounted before express.json in index.js)
router.post('/webhook', async (req, res) => {
  const signature = req.headers['x-signature'];
  const secret    = process.env.LEMONSQUEEZY_SIGNING_SECRET;

  const hmac   = crypto.createHmac('sha256', secret);
  const digest = hmac.update(req.body).digest('hex');

  if (!signature || !crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
    return res.status(401).json({ error: 'Firma inválida' });
  }

  const payload   = JSON.parse(req.body.toString());
  const eventName = payload.meta?.event_name;
  const userId    = payload.meta?.custom_data?.user_id;
  const variantId = String(payload.data?.attributes?.variant_id);

  console.log(`[LS webhook] ${eventName} — user: ${userId}`);

  try {
    if (eventName === 'subscription_created') {
      const planKey  = variantId === process.env.LEMONSQUEEZY_VARIANT_PRO ? 'pro' : 'starter';
      const planData = PLANS[planKey];
      await db().from('users').update({
        plan:          planKey,
        minutes_limit: planData.minutesLimit,
      }).eq('id', userId);
    }

    if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
      await db().from('users').update({
        plan:          'free',
        minutes_limit: 3,
      }).eq('id', userId);
    }

    if (eventName === 'subscription_payment_failed') {
      console.warn(`[LS webhook] Pago fallido para usuario ${userId}`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[LS webhook] Error:', err.message);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
});

// POST /api/lemonsqueezy/cancel
router.post('/cancel', requireAuth, async (req, res) => {
  try {
    const { data } = await axios.get(`${BASE}/subscriptions`, {
      headers: LS_HEADERS,
      params:  { 'filter[user_email]': req.userEmail },
    });

    const sub = data.data?.[0];
    if (!sub) return res.status(404).json({ error: 'No hay suscripción activa' });

    await axios.delete(`${BASE}/subscriptions/${sub.id}`, { headers: LS_HEADERS });
    res.json({ ok: true });
  } catch (err) {
    console.error('[LS cancel]', err.response?.data || err.message);
    res.status(500).json({ error: 'No se pudo cancelar' });
  }
});

export default router;
