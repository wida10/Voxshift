import axios from 'axios';
import FormData from 'form-data';

const BASE = 'https://api.elevenlabs.io/v1';
const headers = () => ({ 'xi-api-key': process.env.ELEVENLABS_API_KEY });

export async function addVoice(audioBuffer, voiceName) {
  const form = new FormData();
  form.append('name', voiceName);
  form.append('files', audioBuffer, {
    filename: 'sample.mp3',
    contentType: 'audio/mpeg',
  });

  const response = await axios.post(`${BASE}/voices/add`, form, {
    headers: { ...headers(), ...form.getHeaders() },
  });

  return response.data.voice_id;
}

// Rachel — available on all ElevenLabs plans including free
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export async function generateSpeech(voiceId, text) {
  const useVoice = voiceId || DEFAULT_VOICE_ID;

  const response = await axios.post(
    `${BASE}/text-to-speech/${useVoice}`,
    {
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    },
    {
      headers: { ...headers(), 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      responseType: 'arraybuffer',
    }
  );

  return Buffer.from(response.data);
}

export async function deleteVoice(voiceId) {
  await axios.delete(`${BASE}/voices/${voiceId}`, { headers: headers() });
}
