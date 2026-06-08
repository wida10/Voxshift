import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase }    from '../middleware/auth.js';

const router = Router();
const db     = () => supabase.schema('voxshift');

// GET /api/users/me
router.get('/me', requireAuth, async (req, res) => {
  const { data, error } = await db()
    .from('users')
    .select('id, email, full_name, avatar_url, plan, minutes_used, minutes_limit, created_at')
    .eq('id', req.userId)
    .single();

  if (error || !data) return res.status(404).json({ error: 'User not found' });
  res.json(data);
});

// GET /api/users/me/subscription
router.get('/me/subscription', requireAuth, async (req, res) => {
  const { data } = await db()
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('user_id', req.userId)
    .eq('status', 'active')
    .single();

  res.json(data || null);
});

export default router;
