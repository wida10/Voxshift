import { Router } from 'express';
import multer      from 'multer';
import { requireAuth }  from '../middleware/auth.js';
import { checkMinutes } from '../middleware/checkMinutes.js';
import { supabase }     from '../middleware/auth.js';
import { processJob }      from '../services/processor.js';
import { deleteJobFiles }  from '../services/storage.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/m4a','audio/webm','audio/ogg','audio/x-m4a'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Formato de archivo no soportado'));
  },
});

const db = () => supabase.schema('voxshift');

// POST /api/jobs — create job and kick off async processing
router.post('/', requireAuth, checkMinutes, upload.single('audio'), async (req, res) => {
  const { source_language, target_language, voice } = req.body;

  if (!req.file)        return res.status(400).json({ error: 'Audio file required' });
  if (!source_language) return res.status(400).json({ error: 'source_language required' });
  if (!target_language) return res.status(400).json({ error: 'target_language required' });
  if (source_language === target_language)
    return res.status(400).json({ error: 'Source and target languages must differ' });

  const { data: job, error } = await db()
    .from('audio_jobs')
    .insert({
      user_id:           req.userId,
      status:            'pending',
      source_language,
      target_language,
      original_filename: req.file.originalname,
    })
    .select()
    .single();

  if (error) {
    console.error('[jobs] Insert failed:', error);
    return res.status(500).json({ error: 'Could not create job' });
  }

  processJob({
    jobId:          job.id,
    userId:         req.userId,
    audioBuffer:    req.file.buffer,
    filename:       req.file.originalname,
    sourceLanguage: source_language,
    targetLanguage: target_language,
    voice:          voice || 'nova',
  });

  res.status(201).json({ jobId: job.id });
});

// GET /api/jobs/:id — polling endpoint
router.get('/:id', requireAuth, async (req, res) => {
  const { data: job, error } = await db()
    .from('audio_jobs')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .single();

  if (error || !job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// GET /api/jobs — list user's jobs
router.get('/', requireAuth, async (req, res) => {
  const { data: jobs, error } = await db()
    .from('audio_jobs')
    .select('id,status,source_language,target_language,original_filename,original_duration_seconds,output_url,created_at,completed_at,error_message')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: 'Could not fetch jobs' });
  res.json(jobs);
});

// DELETE /api/jobs/:id — delete a job and its audio files
router.delete('/:id', requireAuth, async (req, res) => {
  const { data: job, error } = await db()
    .from('audio_jobs')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .single();

  if (error || !job) return res.status(404).json({ error: 'Job not found' });

  await deleteJobFiles(req.userId, req.params.id);
  await db().from('audio_jobs').delete().eq('id', req.params.id);

  res.json({ ok: true });
});

export default router;
