import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const VALID_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

export async function generateSpeech(text, voice = 'nova') {
  const useVoice = VALID_VOICES.includes(voice) ? voice : 'nova';
  const response = await openai.audio.speech.create({
    model: 'tts-1-hd',
    voice: useVoice,
    input: text,
    response_format: 'mp3',
  });
  return Buffer.from(await response.arrayBuffer());
}
