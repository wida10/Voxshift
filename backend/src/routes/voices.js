import { Router }  from 'express';
import multer       from 'multer';
import crypto       from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { supabase }    from '../middleware/auth.js';
import { uploadVoiceSample, deleteVoiceSample, getVoiceSamplePublicUrl } from '../services/storage.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const db = () => supabase.schema('voxshift');

const VOICE_LIMIT = { free: 3, starter: 20, pro: 100 };

function getMime(ext) {
  const map = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/m4a', webm: 'audio/webm', ogg: 'audio/ogg' };
  return map[ext] || 'audio/mpeg';
}

function withUrl(voice) {
  return { ...voice, preview_url: getVoiceSamplePublicUrl(voice.sample_path) };
}

// GET /api/voices/debug  — temporary diagnostic, no auth
router.get('/debug', async (_req, res) => {
  const results = {};
  try {
    const { data, error } = await supabase.schema('voxshift').from('voices').select('id').limit(1);
    results.db = error ? `ERROR: ${error.message}` : 'OK';
  } catch (e) { results.db = `THROW: ${e.message}`; }

  try {
    const tiny = Buffer.from('test');
    const { error } = await supabase.storage.from('voice-samples').upload('_debug_test.txt', tiny, { upsert: true });
    if (!error) await supabase.storage.from('voice-samples').remove(['_debug_test.txt']);
    results.storage = error ? `ERROR: ${error.message}` : 'OK';
  } catch (e) { results.storage = `THROW: ${e.message}`; }

  res.json(results);
});

// GET /api/voices
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await db()
    .from('voices')
    .select('*')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Could not fetch voices' });
  res.json(data.map(withUrl));
});

// POST /api/voices
router.post('/', requireAuth, upload.single('audio'), async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  if (!req.file)     return res.status(400).json({ error: 'Audio file required' });

  try {
    // Check plan limit
    const { data: profile } = await db().from('users').select('plan').eq('id', req.userId).single();
    const { count } = await db().from('voices').select('*', { count: 'exact', head: true }).eq('user_id', req.userId);
    const limit = VOICE_LIMIT[profile?.plan] ?? 3;
    if ((count || 0) >= limit) {
      return res.status(403).json({ error: 'voice_limit', message: `Límite de ${limit} voces para tu plan.` });
    }

    const voiceId    = crypto.randomUUID();
    const ext        = (req.file.originalname.split('.').pop() || 'webm').toLowerCase();
    const samplePath = `${req.userId}/${voiceId}.${ext}`;

    await uploadVoiceSample(samplePath, req.file.buffer, getMime(ext));

    const { data: voice, error: dbErr } = await db().from('voices').insert({
      id:          voiceId,
      user_id:     req.userId,
      name:        name.trim(),
      sample_path: samplePath,
    }).select().single();

    if (dbErr) throw new Error(dbErr.message);
    res.status(201).json(withUrl(voice));
  } catch (err) {
    console.error('[voices] Create error:', err.message);
    res.status(500).json({ error: 'Could not create voice' });
  }
});

// DELETE /api/voices/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const { data: voice, error } = await db()
    .from('voices')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .single();

  if (error || !voice) return res.status(404).json({ error: 'Voice not found' });

  await deleteVoiceSample(voice.sample_path);
  await db().from('voices').delete().eq('id', req.params.id);

  res.json({ ok: true });
});

export default router;
