import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';

import jobsRouter          from './routes/jobs.js';
import usersRouter         from './routes/users.js';
import ttsRouter           from './routes/tts.js';
import lemonsqueezyRouter  from './routes/lemonsqueezy.js';

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Health check (before all middleware) ─────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ── Body parsers ─────────────────────────────────────────────
app.use('/api/lemonsqueezy/webhook', express.raw({ type: '*/*' }));
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────
app.use('/api/jobs',          jobsRouter);
app.use('/api/users',         usersRouter);
app.use('/api/tts',           ttsRouter);
app.use('/api/lemonsqueezy',  lemonsqueezyRouter);

// ── Global error handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[express error]', err.message, err.stack);
  res.status(500).json({ error: err.message });
});

// ── Monthly minute reset (runs at 00:00 on day 1 of each month)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

cron.schedule('0 0 1 * *', async () => {
  console.log('[cron] Resetting monthly minutes…');
  const { error } = await supabase.rpc('voxshift.reset_monthly_minutes');
  if (error) console.error('[cron] Reset failed:', error.message);
  else console.log('[cron] Minutes reset OK');
});

app.listen(PORT, () => {
  console.log(`VoxShift backend running on port ${PORT}`);
});
