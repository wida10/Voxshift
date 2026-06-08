import OpenAI, { toFile } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// language: ISO 639-1 code (en, es, pt, fr, de)
export async function transcribe(audioBuffer, filename, language) {
  const file = await toFile(audioBuffer, filename, { type: getMimeType(filename) });

  const response = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language,
    response_format: 'text',
  });

  return response;
}

function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const map = { mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/m4a', webm: 'audio/webm', ogg: 'audio/ogg' };
  return map[ext] || 'audio/mpeg';
}
