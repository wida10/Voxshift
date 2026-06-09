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

export async function uploadVoiceSample(path, buffer, mimetype) {
  const { error } = await supabase.storage.from('voice-samples').upload(path, buffer, { contentType: mimetype, upsert: true });
  if (error) throw new Error(`Voice sample upload failed: ${error.message}`);
}

export async function downloadVoiceSample(path) {
  const { data, error } = await supabase.storage.from('voice-samples').download(path);
  if (error) throw new Error(`Voice sample download failed: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteVoiceSample(path) {
  await supabase.storage.from('voice-samples').remove([path]);
}

export function getVoiceSamplePublicUrl(path) {
  const { data } = supabase.storage.from('voice-samples').getPublicUrl(path);
  return data.publicUrl;
}

export async function downloadOriginal(userId, jobId, ext) {
  const path = `${userId}/${jobId}/original.${ext}`;
  const { data, error } = await supabase.storage.from('audio-originals').download(path);
  if (error) throw new Error(`Download failed: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
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
