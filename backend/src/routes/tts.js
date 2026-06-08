import { Router } from 'express';
import { requireAuth }              from '../middleware/auth.js';
import { generateSpeech, VALID_VOICES } from '../services/tts.js';

const router = Router();

const PREVIEW_TEXT = 'Hola, esta es mi voz. Puedo traducir tu audio a cualquier idioma con un sonido natural.';

router.get('/preview/:voice', requireAuth, async (req, res) => {
  const { voice } = req.params;
  if (!VALID_VOICES.includes(voice)) {
    return res.status(400).json({ error: 'Voz no válida' });
  }

  try {
    const buffer = await generateSpeech(PREVIEW_TEXT, voice);
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('[tts] Preview error:', err.message);
    res.status(500).json({ error: 'No se pudo generar la previsualización' });
  }
});

export default router;
