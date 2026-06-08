import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function uploadOriginal(userId, jobId, buffer, mimetype, ext) {
  const path = `${userId}/${jobId}/original.${ext}`;
  const { error } = await supabase.storage
    .from('audio-originals')
    .upload(path, buffer, { contentType: mimetype, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

export async function deleteJobFiles(userId, jobId) {
  await supabase.storage.from('audio-originals').remove([
    `${userId}/${jobId}/original.mp3`,
    `${userId}/${jobId}/original.wav`,
    `${userId}/${jobId}/original.m4a`,
    `${userId}/${jobId}/original.webm`,
    `${userId}/${jobId}/original.ogg`,
  ]);
  await supabase.storage.from('audio-processed').remove([
    `${userId}/${jobId}/translated.mp3`,
  ]);
}

export async function uploadProcessed(userId, jobId, buffer) {
  const path = `${userId}/${jobId}/translated.mp3`;
  const { error } = await supabase.storage
    .from('audio-processed')
    .upload(path, buffer, { contentType: 'audio/mpeg', upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from('audio-processed').getPublicUrl(path);
  return data.publicUrl;
}
