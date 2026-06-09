import { createClient } from '@supabase/supabase-js';
import { transcribe }       from './whisper.js';
import { translate }        from './deepl.js';
import { synthesizeSpeech } from './fishAudio.js';
import { uploadOriginal, uploadProcessed, downloadOriginal } from './storage.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const db = () => supabase.schema('voxshift');

async function updateJob(jobId, fields) {
  await db().from('audio_jobs').update(fields).eq('id', jobId);
}

async function addMinutes(userId, durationSeconds) {
  const minutesToAdd = Math.ceil(durationSeconds / 60);
  const { data } = await db().from('users').select('minutes_used').eq('id', userId).single();
  if (data) {
    await db().from('users').update({ minutes_used: data.minutes_used + minutesToAdd }).eq('id', userId);
  }
}

function getMime(ext) {
  const map = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/m4a', webm: 'audio/webm', ogg: 'audio/ogg' };
  return map[ext] || 'audio/mpeg';
}

// ── Translation job (existing flow) ──────────────────────────
export async function processJob({ jobId, userId, audioBuffer, filename, sourceLanguage, targetLanguage, mode, ttsText }) {
  if (mode === 'tts') return processTtsJob({ jobId, userId, audioBuffer, filename, ttsText });

  const ext = filename.split('.').pop().toLowerCase();

  try {
    console.log(`[processor] ${jobId} — uploading original…`);
    await uploadOriginal(userId, jobId, audioBuffer, getMime(ext), ext);
    await updateJob(jobId, { status: 'processing' });

    console.log(`[processor] ${jobId} — transcribing…`);
    const transcriptOriginal = await transcribe(audioBuffer, filename, sourceLanguage);

    console.log(`[processor] ${jobId} — translating…`);
    const transcriptTranslated = await translate(transcriptOriginal, targetLanguage);

    console.log(`[processor] ${jobId} — cloning voice & synthesizing…`);
    const mp3Buffer = await synthesizeSpeech({
      text:           transcriptTranslated,
      referenceAudio: audioBuffer,
      referenceText:  transcriptOriginal,
      ext,
    });

    console.log(`[processor] ${jobId} — uploading result…`);
    const outputUrl = await uploadProcessed(userId, jobId, mp3Buffer);
    const durationSeconds = Math.round((audioBuffer.length * 8) / 128000);

    await updateJob(jobId, {
      status:                    'completed',
      output_url:                outputUrl,
      transcript_original:       transcriptOriginal,
      transcript_translated:     transcriptTranslated,
      elevenlabs_voice_id:       null,
      original_duration_seconds: durationSeconds,
      completed_at:              new Date().toISOString(),
    });

    await addMinutes(userId, durationSeconds);
  } catch (err) {
    console.error(`[processor] Job ${jobId} failed:`, err.message);
    const errData = err?.response?.data;
    const decoded = Buffer.isBuffer(errData) ? JSON.parse(errData.toString('utf8')) : errData;
    console.error(`[processor] Full error:`, JSON.stringify(decoded || err?.message, null, 2));
    await updateJob(jobId, { status: 'failed', error_message: err.message, completed_at: new Date().toISOString() });
  }
}

// ── TTS job (text + voice sample → synthesized audio) ────────
async function processTtsJob({ jobId, userId, audioBuffer, filename, ttsText }) {
  const ext = filename.split('.').pop().toLowerCase();

  try {
    console.log(`[processor-tts] ${jobId} — uploading voice sample…`);
    await uploadOriginal(userId, jobId, audioBuffer, getMime(ext), ext);
    await updateJob(jobId, { status: 'processing' });

    console.log(`[processor-tts] ${jobId} — synthesizing with cloned voice…`);
    const mp3Buffer = await synthesizeSpeech({
      text:           ttsText,
      referenceAudio: audioBuffer,
      referenceText:  '',
      ext,
    });

    console.log(`[processor-tts] ${jobId} — uploading result…`);
    const outputUrl = await uploadProcessed(userId, jobId, mp3Buffer);
    const durationSeconds = Math.round((mp3Buffer.length * 8) / 128000);

    await updateJob(jobId, {
      status:                    'completed',
      output_url:                outputUrl,
      transcript_translated:     ttsText,
      original_duration_seconds: durationSeconds,
      completed_at:              new Date().toISOString(),
    });

    await addMinutes(userId, durationSeconds);
  } catch (err) {
    console.error(`[processor-tts] Job ${jobId} failed:`, err.message);
    await updateJob(jobId, { status: 'failed', error_message: err.message, completed_at: new Date().toISOString() });
  }
}

// ── Regenerate job (re-synthesize with edited text) ───────────
export async function regenerateJob({ job, userId, newText }) {
  const ext = job.original_filename?.split('.').pop()?.toLowerCase() || 'mp3';

  try {
    console.log(`[processor-regen] ${job.id} — downloading original…`);
    const audioBuffer = await downloadOriginal(userId, job.id, ext);

    console.log(`[processor-regen] ${job.id} — synthesizing with edited text…`);
    const mp3Buffer = await synthesizeSpeech({
      text:           newText,
      referenceAudio: audioBuffer,
      referenceText:  job.transcript_original || '',
      ext,
    });

    console.log(`[processor-regen] ${job.id} — uploading result…`);
    const outputUrl = await uploadProcessed(userId, job.id, mp3Buffer);

    await updateJob(job.id, {
      status:               'completed',
      output_url:           outputUrl,
      transcript_translated: newText,
      completed_at:         new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[processor-regen] Job ${job.id} failed:`, err.message);
    await updateJob(job.id, { status: 'failed', error_message: err.message, completed_at: new Date().toISOString() });
  }
}
