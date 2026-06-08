import { supabase } from './auth.js';

export async function checkMinutes(req, res, next) {
  const { data: user, error } = await supabase
    .schema('voxshift')
    .from('users')
    .select('minutes_used, minutes_limit, plan')
    .eq('id', req.userId)
    .single();

  if (error || !user) return res.status(404).json({ error: 'User not found' });

  const available = user.minutes_limit - user.minutes_used;
  if (available <= 0) {
    return res.status(402).json({
      error: 'no_minutes',
      message: 'No tienes minutos disponibles este mes.',
      plan: user.plan,
      minutes_used: user.minutes_used,
      minutes_limit: user.minutes_limit,
    });
  }

  req.userProfile = user;
  next();
}
