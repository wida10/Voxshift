import { useState, useRef, useCallback } from 'react';

export default function AudioRecorder({ onRecordingComplete }) {
  const [state, setState]     = useState('idle'); // idle | recording | preview
  const [audioUrl, setAudioUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorder = useRef(null);
  const chunks        = useRef([]);
  const timerRef      = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const url  = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState('preview');
        onRecordingComplete(new File([blob], 'recording.webm', { type: 'audio/webm' }));
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.current.start(100);
      setState('recording');
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      alert('No se pudo acceder al micrófono. Verifica los permisos.');
    }
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    mediaRecorder.current?.stop();
    clearInterval(timerRef.current);
  }, []);

  const reset = useCallback(() => {
    setAudioUrl(null);
    setState('idle');
    setDuration(0);
    onRecordingComplete(null);
  }, [onRecordingComplete]);

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="card flex flex-col items-center gap-4 py-8">
      {state === 'idle' && (
        <button onClick={startRecording} className="btn-primary flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          Grabar audio
        </button>
      )}

      {state === 'recording' && (
        <>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 font-mono text-lg">{fmt(duration)}</span>
          </div>
          <button onClick={stopRecording} className="btn-primary bg-red-600 hover:bg-red-700">
            Detener grabación
          </button>
        </>
      )}

      {state === 'preview' && audioUrl && (
        <>
          <audio controls src={audioUrl} className="w-full max-w-sm" />
          <button onClick={reset} className="btn-ghost text-sm">
            Volver a grabar
          </button>
        </>
      )}
    </div>
  );
}
