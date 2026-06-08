import axios from 'axios';
import { encode } from '@msgpack/msgpack';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import ffmpegPath from 'ffmpeg-static';

const execFileAsync = promisify(execFile);
const BASE = 'https://api.fish.audio';

function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${process.env.FISH_AUDIO_API_KEY}`,
    model: 's2-pro',
    ...extra,
  };
}

// Converts any audio buffer to 16kHz mono WAV (accepted by Fish Audio)
async function convertToWav(inputBuffer, ext) {
  const id = randomUUID();
  const inputPath  = path.join(os.tmpdir(), `${id}.${ext}`);
  const outputPath = path.join(os.tmpdir(), `${id}.wav`);

  try {
    await fs.writeFile(inputPath, inputBuffer);
    await execFileAsync(ffmpegPath, [
      '-y', '-i', inputPath,
      '-ar', '44100',
      '-ac', '1',
      '-sample_fmt', 's16',
      outputPath,
    ]);
    return await fs.readFile(outputPath);
  } finally {
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}

/**
 * Synthesize speech using Fish Audio.
 * Pass referenceAudio + referenceText + ext for zero-shot voice cloning.
 * Pass referenceId to use a pre-built Fish Audio voice model instead.
 */
export async function synthesizeSpeech({ text, referenceAudio, referenceText, referenceId, ext = 'mp3' }) {
  const payload = {
    text,
    format: 'mp3',
    mp3_bitrate: 192,
    latency: 'balanced',
    normalize: true,
    temperature: 0.85,
    top_p: 0.85,
  };

  if (referenceId) {
    payload.reference_id = referenceId;
  } else if (referenceAudio) {
    // Convert to WAV so Fish Audio always receives a supported format
    const wavBuffer = await convertToWav(referenceAudio, ext);
    payload.references = [
      {
        audio: new Uint8Array(wavBuffer),
        text:  referenceText || '',
      },
    ];
  }

  const packed = encode(payload);

  const response = await axios.post(`${BASE}/v1/tts`, packed, {
    headers: authHeaders({ 'Content-Type': 'application/msgpack' }),
    responseType: 'arraybuffer',
  });

  return Buffer.from(response.data);
}
