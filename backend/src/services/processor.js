import { createClient } from '@supabase/supabase-js';
import { transcribe }          from './whisper.js';
import { translate }           from './deepl.js';
import { synthesizeSpeech }    from './fishAudio.js';
import { uploadOriginal, uploadProcessed } from './storage.js';

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
  const { data } = await db()
    .from('users')
    .select('minutes_used')
    .eq('id', userId)
    .single();

  if (data) {
    await db()
      .from('users')
      .update({ minutes_used: data.minutes_used + minutesToAdd })
      .eq('id', userId);
  }
}

export async function processJob({
  jobId,
  userId,
  audioBuffer,
  filename,
  sourceLanguage,
  targetLanguage,
}) {
  const ext = filename.split('.').pop().toLowerCase();

  try {
    // a. Upload original audio
    console.log(`[processor] ${jobId} — step a: uploading original…`);
    await uploadOriginal(userId, jobId, audioBuffer, getMime(ext), ext);

    // b. Mark as processing
    await updateJob(jobId, { status: 'processing' });

    // c. Transcribe with Whisper
    console.log(`[processor] ${jobId} — step c: transcribing…`);
    const transcriptOriginal = await transcribe(audioBuffer, filename, sourceLanguage);

    // d. Translate with DeepL
    console.log(`[processor] ${jobId} — step d: translating…`);
    const transcriptTranslated = await translate(transcriptOriginal, targetLanguage);

    // e. Clone voice + synthesize in target language with Fish Audio
    console.log(`[processor] ${jobId} — step e: cloning voice & generating speech…`);
    const mp3Buffer = await synthesizeSpeech({
      text:           transcriptTranslated,
      referenceAudio: audioBuffer,
      referenceText:  transcriptOriginal,
      ext,
    });

    // f. Upload translated audio
    console.log(`[processor] ${jobId} — step f: uploading result…`);
    const outputUrl = await uploadProcessed(userId, jobId, mp3Buffer);

    // g. Rough duration estimate (~128kbps mp3)
    const durationSeconds = Math.round((audioBuffer.length * 8) / 128000);

    // h. Mark completed
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
    console.error(`[processor] Full error:`, JSON.stringify(decoded || err?.cause || err?.message, null, 2));
    await updateJob(jobId, {
      status:        'failed',
      error_message: err.message,
      completed_at:  new Date().toISOString(),
    });
  }
}

function getMime(ext) {
  const map = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/m4a', webm: 'audio/webm', ogg: 'audio/ogg' };
  return map[ext] || 'audio/mpeg';
}
