import { useState, useRef, useEffect } from 'react';
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
  { key: 'processing', label: 'Transcribiendo / procesando…' },
  { key: 'translating',label: 'Traduciendo…' },
  { key: 'generating', label: 'Generando audio con tu voz…' },
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
              i < activeIdx ? 'bg-green-500 text-white'
              : i === activeIdx ? 'bg-violet text-white animate-pulse'
              : 'bg-[#1f1f1f] text-gray-600'
            }`}>
              {i < activeIdx ? '✓' : i + 1}
            </div>
            <span className={`text-sm ${i <= activeIdx ? 'text-white' : 'text-gray-600'}`}>{step.label}</span>
            {i === activeIdx && (
              <div className="w-3 h-3 border border-violet border-t-transparent rounded-full animate-spin ml-auto" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Process() {
  const navigate = useNavigate();

  const [pageMode, setPageMode] = useState('translate');

  const [jobId, setJobId]             = useState(null);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [sourceLanguage, setSourceLanguage] = useState('es');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [file, setFile]               = useState(null);
  const [inputMode, setInputMode]     = useState('upload');
  const fileInputRef                  = useRef(null);

  const [ttsText, setTtsText]           = useState('');
  const [ttsFile, setTtsFile]           = useState(null);
  const [ttsInputMode, setTtsInputMode] = useState('record');
  const ttsFileInputRef                 = useRef(null);

  const [editingText, setEditingText]             = useState(false);
  const [editedTranslation, setEditedTranslation] = useState('');
  const [regenerating, setRegenerating]           = useState(false);

  const { job } = useJobPolling(jobId);

  useEffect(() => {
    if (regenerating && job?.status === 'completed') setRegenerating(false);
  }, [job?.status, regenerating]);

  const resetAll = () => {
    setJobId(null); setFile(null); setTtsFile(null); setTtsText('');
    setError(''); setEditingText(false); setRegenerating(false);
  };

  const handleTranslateSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setError('Selecciona o graba un audio primero.');
    if (sourceLanguage === targetLanguage) return setError('Los idiomas no pueden ser iguales.');
    setSubmitting(true); setError('');
    const form = new FormData();
    form.append('audio', file);
    form.append('source_language', sourceLanguage);
    form.append('target_language', targetLanguage);
    try {
      const { data } = await api.post('/api/jobs', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setJobId(data.jobId);
    } catch (err) {
      if (err.response?.data?.error === 'no_minutes') setShowUpgrade(true);
      else setError(err.response?.data?.message || 'Ocurrió un error. Inténtalo de nuevo.');
    } finally { setSubmitting(false); }
  };

  const handleTtsSubmit = async (e) => {
    e.preventDefault();
    if (!ttsFile) return setError('Graba o sube una muestra de tu voz primero.');
    if (!ttsText.trim()) return setError('Escribe el texto que deseas sintetizar.');
    setSubmitting(true); setError('');
    const form = new FormData();
    form.append('audio', ttsFile);
    form.append('mode', 'tts');
    form.append('text', ttsText);
    form.append('source_language', 'es');
    form.append('target_language', 'es');
    try {
      const { data } = await api.post('/api/jobs', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setJobId(data.jobId);
    } catch (err) {
      if (err.response?.data?.error === 'no_minutes') setShowUpgrade(true);
      else setError(err.response?.data?.message || 'Ocurrió un error. Inténtalo de nuevo.');
    } finally { setSubmitting(false); }
  };

  const handleRegenerate = async () => {
    if (!editedTranslation.trim()) return;
    const currentJobId = job.id;
    setRegenerating(true); setEditingText(false); setError('');
    try {
      await api.post(`/api/jobs/${currentJobId}/regenerate`, { translated_text: editedTranslation });
      setJobId(null);
      setTimeout(() => setJobId(currentJobId), 100);
    } catch {
      setRegenerating(false);
      setError('No se pudo regenerar. Inténtalo de nuevo.');
    }
  };

  if (regenerating) {
    return (
      <Layout>
        <h1 className="text-2xl font-bold mb-6">Regenerando audio…</h1>
        <ProcessingSteps status="processing" />
        <p className="text-sm text-gray-500 text-center mt-6">Sintetizando con el texto corregido.</p>
      </Layout>
    );
  }

  if (job?.status === 'completed') {
    return (
      <Layout>
        <h1 className="text-2xl font-bold mb-6">¡Audio listo!</h1>
        <AudioPlayer url={job.output_url} label="Tu audio generado" />

        {job.transcript_original && (
          <div className="card mt-4">
            <p className="text-xs text-gray-500 uppercase mb-2">Transcripción original</p>
            <p className="text-sm text-gray-300">{job.transcript_original}</p>
          </div>
        )}

        {job.transcript_translated && (
          <div className="card mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 uppercase">
                {pageMode === 'tts' ? 'Texto sintetizado' : 'Texto traducido'}
              </p>
              {!editingText && (
                <button
                  onClick={() => { setEditingText(true); setEditedTranslation(job.transcript_translated); }}
                  className="text-xs text-violet hover:opacity-75 transition-opacity"
                >
                  Editar y regenerar
                </button>
              )}
            </div>
            {editingText ? (
              <div>
                <textarea
                  value={editedTranslation}
                  onChange={(e) => setEditedTranslation(e.target.value)}
                  rows={4}
                  className="input w-full text-sm resize-y"
                />
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                <div className="flex gap-2 mt-3">
                  <button onClick={handleRegenerate} className="btn-primary text-sm py-2">
                    Regenerar audio
                  </button>
                  <button onClick={() => { setEditingText(false); setError(''); }} className="btn-ghost text-sm py-2">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-300">{job.transcript_translated}</p>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={resetAll} className="btn-primary">Nueva traducción</button>
          <button onClick={() => navigate('/dashboard')} className="btn-ghost">Ver historial</button>
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
          <button onClick={resetAll} className="btn-primary mt-5">Intentar de nuevo</button>
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

      <div className="flex gap-2 mb-6">
        {[
          { key: 'translate', label: '🌐 Traducir audio' },
          { key: 'tts',       label: '✍️ Texto a voz' },
        ].map((m) => (
          <button key={m.key}
            onClick={() => { setPageMode(m.key); setError(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              pageMode === m.key ? 'bg-violet text-white' : 'bg-surface text-gray-400 hover:text-white border border-border'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {pageMode === 'translate' && (
        <form onSubmit={handleTranslateSubmit} className="flex flex-col gap-6 max-w-xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Idioma origen</label>
              <select value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)} className="input">
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Idioma destino</label>
              <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} className="input">
                {LANGUAGES.filter((l) => l.code !== sourceLanguage).map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-xl border border-violet/30 bg-violet/5">
            <span className="text-lg mt-0.5">🎙️</span>
            <div>
              <p className="text-sm font-semibold text-white">Tu voz será clonada automáticamente</p>
              <p className="text-xs text-gray-400 mt-0.5">VoxShift analiza tu audio y genera la traducción con tu misma voz en el idioma destino.</p>
            </div>
          </div>

          <div>
            <div className="flex gap-2 mb-4">
              {['upload', 'record'].map((mode) => (
                <button key={mode} type="button"
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
                    <p className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl mb-2">📁</p>
                    <p className="text-gray-400">Haz clic para seleccionar</p>
                    <p className="text-xs text-gray-600 mt-1">MP3, WAV, M4A — máximo 50 MB</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="audio/*" className="hidden"
                  onChange={(e) => { const f = e.target.files[0]; if (f?.size > 50*1024*1024) { setError('Máximo 50 MB.'); return; } setFile(f||null); setError(''); }} />
              </div>
            )}

            {inputMode === 'record' && (
              <AudioRecorder onRecordingComplete={(f) => { setFile(f); setError(''); }} />
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={!file || submitting} className="btn-primary py-3 text-base">
            {submitting ? 'Enviando…' : 'Traducir audio'}
          </button>
        </form>
      )}

      {pageMode === 'tts' && (
        <form onSubmit={handleTtsSubmit} className="flex flex-col gap-6 max-w-xl">
          <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
            <span className="text-lg mt-0.5">✍️</span>
            <div>
              <p className="text-sm font-semibold text-white">Escribe un texto y habla con tu voz</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Graba una muestra de tu voz (5–30 seg) y el sistema sintetizará el texto con ella.
              </p>
            </div>
          </div>

          <div>
            <label className="label">Texto a sintetizar</label>
            <textarea
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              placeholder="Escribe aquí el texto que quieres que se diga con tu voz…"
              rows={5}
              className="input w-full resize-y"
            />
            <p className="text-xs text-gray-600 mt-1">{ttsText.length} caracteres</p>
          </div>

          <div>
            <label className="label">Muestra de tu voz</label>
            <p className="text-xs text-gray-500 mb-3">Habla naturalmente durante 5–30 segundos para clonar tu voz.</p>

            <div className="flex gap-2 mb-4">
              {['record', 'upload'].map((mode) => (
                <button key={mode} type="button"
                  onClick={() => { setTtsInputMode(mode); setTtsFile(null); setError(''); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    ttsInputMode === mode ? 'bg-violet text-white' : 'bg-surface text-gray-400 hover:text-white'
                  }`}
                >
                  {mode === 'record' ? '🎙️ Grabar' : '📂 Subir archivo'}
                </button>
              ))}
            </div>

            {ttsInputMode === 'upload' && (
              <div
                onClick={() => ttsFileInputRef.current?.click()}
                className={`card border-dashed border-2 cursor-pointer hover:border-violet/50 transition-colors text-center py-8 ${
                  ttsFile ? 'border-violet/50 bg-violet/5' : 'border-border'
                }`}
              >
                {ttsFile ? (
                  <div>
                    <p className="text-violet font-medium">✓ {ttsFile.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{(ttsFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xl mb-2">🎤</p>
                    <p className="text-gray-400 text-sm">Haz clic para seleccionar tu muestra de voz</p>
                    <p className="text-xs text-gray-600 mt-1">MP3, WAV, M4A — máximo 50 MB</p>
                  </>
                )}
                <input ref={ttsFileInputRef} type="file" accept="audio/*" className="hidden"
                  onChange={(e) => { const f = e.target.files[0]; if (f?.size > 50*1024*1024) { setError('Máximo 50 MB.'); return; } setTtsFile(f||null); setError(''); }} />
              </div>
            )}

            {ttsInputMode === 'record' && (
              <AudioRecorder onRecordingComplete={(f) => { setTtsFile(f); setError(''); }} />
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={!ttsFile || !ttsText.trim() || submitting} className="btn-primary py-3 text-base">
            {submitting ? 'Enviando…' : 'Generar audio con mi voz'}
          </button>
        </form>
      )}

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </Layout>
  );
}
