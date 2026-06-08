import { useState, useRef } from 'react';
import { useNavigate }   from 'react-router-dom';
import Layout            from '../components/Layout.jsx';
import AudioRecorder     from '../components/AudioRecorder.jsx';
import AudioPlayer       from '../components/AudioPlayer.jsx';
import UpgradeModal      from '../components/UpgradeModal.jsx';
import { useJobPolling } from '../hooks/useJobs.js';
import { LANGUAGES }     from '../lib/utils.js';
import api               from '../lib/api.js';


const STEPS = [
  { key: 'upload',     label: 'Subiendo audio…' },
  { key: 'processing', label: 'Transcribiendo…' },
  { key: 'translating',label: 'Traduciendo…' },
  { key: 'generating', label: 'Generando audio…' },
];

function ProcessingSteps({ status }) {
  const activeIdx = status === 'processing' ? 1 : status === 'completed' ? STEPS.length : 0;
  return (
    <div className="card">
      <p className="text-sm text-gray-400 mb-4">Estado del procesamiento</p>
      <div className="flex flex-col gap-3">
        {STEPS.map((step, i) => (
          <div key={step.key} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 transition-all ${
              i < activeIdx
                ? 'bg-green-500 text-white'
                : i === activeIdx
                ? 'bg-violet text-white animate-pulse'
                : 'bg-[#1f1f1f] text-gray-600'
            }`}>
              {i < activeIdx ? '✓' : i + 1}
            </div>
            <span className={`text-sm ${i <= activeIdx ? 'text-white' : 'text-gray-600'}`}>
              {step.label}
            </span>
            {i === activeIdx && (
              <div className="w-3 h-3 border border-violet border-t-transparent rounded-full animate-spin ml-auto" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function VoiceCloningBadge() {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-violet/30 bg-violet/5">
      <span className="text-lg mt-0.5">🎙️</span>
      <div>
        <p className="text-sm font-semibold text-white">Tu voz será clonada automáticamente</p>
        <p className="text-xs text-gray-400 mt-0.5">
          VoxShift analiza tu audio y genera la traducción con tu misma voz en el idioma destino.
        </p>
      </div>
    </div>
  );
}

export default function Process() {
  const navigate = useNavigate();

  const [sourceLanguage, setSourceLanguage] = useState('es');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [file, setFile]                     = useState(null);
  const [inputMode, setInputMode]           = useState('upload');
  const [jobId, setJobId]                   = useState(null);
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState('');
  const [showUpgrade, setShowUpgrade]       = useState(false);
  const fileInputRef                        = useRef(null);

  const { job } = useJobPolling(jobId);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f && f.size > 50 * 1024 * 1024) {
      setError('El archivo no puede superar los 50 MB.');
      return;
    }
    setFile(f || null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setError('Selecciona o graba un audio primero.');
    if (sourceLanguage === targetLanguage) return setError('Los idiomas no pueden ser iguales.');

    setSubmitting(true);
    setError('');

    const form = new FormData();
    form.append('audio', file);
    form.append('source_language', sourceLanguage);
    form.append('target_language', targetLanguage);

    try {
      const { data } = await api.post('/api/jobs', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setJobId(data.jobId);
    } catch (err) {
      if (err.response?.data?.error === 'no_minutes') {
        setShowUpgrade(true);
      } else {
        setError(err.response?.data?.message || 'Ocurrió un error. Inténtalo de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (job?.status === 'completed') {
    return (
      <Layout>
        <h1 className="text-2xl font-bold mb-6">¡Audio traducido!</h1>
        <AudioPlayer url={job.output_url} label="Tu audio traducido" />

        {job.transcript_original && (
          <div className="card mt-4">
            <p className="text-xs text-gray-500 uppercase mb-2">Transcripción original</p>
            <p className="text-sm text-gray-300">{job.transcript_original}</p>
          </div>
        )}
        {job.transcript_translated && (
          <div className="card mt-4">
            <p className="text-xs text-gray-500 uppercase mb-2">Texto traducido</p>
            <p className="text-sm text-gray-300">{job.transcript_translated}</p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={() => { setJobId(null); setFile(null); }} className="btn-primary">
            Nueva traducción
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-ghost">
            Ver historial
          </button>
        </div>
      </Layout>
    );
  }

  if (job?.status === 'failed') {
    return (
      <Layout>
        <div className="card border-red-500/30 bg-red-500/5 text-center py-10">
          <p className="text-2xl mb-3">⚠️</p>
          <p className="text-red-400 font-semibold">El procesamiento falló</p>
          <p className="text-sm text-gray-500 mt-2">
            {job.error_message?.includes('API') ? 'Hubo un problema con uno de nuestros servicios.' : 'Ocurrió un error inesperado.'}
          </p>
          <button onClick={() => { setJobId(null); setFile(null); }} className="btn-primary mt-5">
            Intentar de nuevo
          </button>
        </div>
      </Layout>
    );
  }

  if (jobId && job) {
    return (
      <Layout>
        <h1 className="text-2xl font-bold mb-6">Procesando tu audio</h1>
        <ProcessingSteps status={job.status} />
        <p className="text-sm text-gray-500 text-center mt-6">
          Esto puede tardar entre 30 segundos y 2 minutos según la duración del audio.
        </p>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Nueva traducción</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-xl">
        {/* Language selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Idioma origen</label>
            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              className="input"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Idioma destino</label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="input"
            >
              {LANGUAGES.filter((l) => l.code !== sourceLanguage).map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Voice cloning notice */}
        <VoiceCloningBadge />

        {/* Input mode toggle */}
        <div>
          <div className="flex gap-2 mb-4">
            {['upload', 'record'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => { setInputMode(mode); setFile(null); setError(''); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  inputMode === mode ? 'bg-violet text-white' : 'bg-surface text-gray-400 hover:text-white'
                }`}
              >
                {mode === 'upload' ? '📂 Subir archivo' : '🎙️ Grabar'}
              </button>
            ))}
          </div>

          {inputMode === 'upload' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`card border-dashed border-2 cursor-pointer hover:border-violet/50 transition-colors text-center py-10 ${
                file ? 'border-violet/50 bg-violet/5' : 'border-border'
              }`}
            >
              {file ? (
                <div>
                  <p className="text-violet font-medium">✓ {file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-2xl mb-2">📁</p>
                  <p className="text-gray-400">Haz clic para seleccionar</p>
                  <p className="text-xs text-gray-600 mt-1">MP3, WAV, M4A — máximo 50 MB</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {inputMode === 'record' && (
            <AudioRecorder onRecordingComplete={(f) => { setFile(f); setError(''); }} />
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={!file || submitting}
          className="btn-primary py-3 text-base"
        >
          {submitting ? 'Enviando…' : 'Traducir audio'}
        </button>
      </form>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </Layout>
  );
}
