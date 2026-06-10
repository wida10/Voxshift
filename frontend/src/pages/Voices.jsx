import { useState, useRef } from 'react';
import Layout        from '../components/Layout.jsx';
import AudioRecorder from '../components/AudioRecorder.jsx';
import { useVoices } from '../hooks/useVoices.js';
import api           from '../lib/api.js';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

function VoiceCard({ voice, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar la voz "${voice.name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/api/voices/${voice.id}`);
      onDelete(voice.id);
    } catch {
      alert('No se pudo eliminar. Inténtalo de nuevo.');
      setDeleting(false);
    }
  };

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-white">{voice.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">Creada el {formatDate(voice.created_at)}</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/10 disabled:opacity-40"
          title="Eliminar voz"
        >
          {deleting ? (
            <span className="w-4 h-4 border border-gray-500 border-t-transparent rounded-full animate-spin block" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      </div>
      <audio controls src={voice.preview_url} className="w-full h-9 rounded" />
    </div>
  );
}

function CreateVoiceForm({ onCreated, onCancel }) {
  const [name, setName]         = useState('');
  const [file, setFile]         = useState(null);
  const [inputMode, setInputMode] = useState('record');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const fileInputRef            = useRef(null);

  const handleSave = async () => {
    if (!name.trim()) return setError('Ponle un nombre a la voz.');
    if (!file)        return setError('Graba o sube una muestra de tu voz.');

    setSaving(true);
    setError('');
    const form = new FormData();
    form.append('audio', file);
    form.append('name', name.trim());

    try {
      const { data } = await api.post('/api/voices', form);
      onCreated(data);
    } catch (err) {
      if (err.response?.data?.error === 'voice_limit') {
        setError(err.response.data.message);
      } else {
        setError('No se pudo guardar la voz. Inténtalo de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card border-violet/30 flex flex-col gap-5">
      <h3 className="font-semibold text-white">Nueva voz</h3>

      <div>
        <label className="label">Nombre de la voz</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Mi voz, Juan, María…"
          className="input w-full"
          maxLength={40}
        />
      </div>

      <div>
        <label className="label">Muestra de voz</label>
        <p className="text-xs text-gray-500 mb-3">Habla naturalmente durante 10–30 segundos para una mejor clonación.</p>

        <div className="flex gap-2 mb-4">
          {['record', 'upload'].map((mode) => (
            <button key={mode} type="button"
              onClick={() => { setInputMode(mode); setFile(null); setError(''); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                inputMode === mode ? 'bg-violet text-white' : 'bg-surface text-gray-400 hover:text-white'
              }`}
            >
              {mode === 'record' ? '🎙️ Grabar' : '📂 Subir'}
            </button>
          ))}
        </div>

        {inputMode === 'record' && (
          <AudioRecorder onRecordingComplete={(f) => { setFile(f); setError(''); }} />
        )}

        {inputMode === 'upload' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`card border-dashed border-2 cursor-pointer hover:border-violet/50 transition-colors text-center py-8 ${
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
                <p className="text-xl mb-2">🎤</p>
                <p className="text-gray-400 text-sm">Haz clic para seleccionar tu muestra de voz</p>
                <p className="text-xs text-gray-600 mt-1">MP3, WAV, M4A — máximo 50 MB</p>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="audio/*" className="hidden"
              onChange={(e) => { setFile(e.target.files[0] || null); setError(''); }} />
          </div>
        )}

        {file && inputMode === 'upload' && (
          <audio controls src={URL.createObjectURL(file)} className="w-full h-9 rounded mt-3" />
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Guardando…' : 'Guardar voz'}
        </button>
        <button onClick={onCancel} className="btn-ghost">
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function Voices() {
  const { voices, loading, refetch } = useVoices();
  const [voiceList, setVoiceList]    = useState(null);
  const [creating, setCreating]      = useState(false);

  const list = voiceList ?? voices;

  const handleCreated = (newVoice) => {
    setVoiceList([newVoice, ...(voiceList ?? voices)]);
    setCreating(false);
  };

  const handleDelete = (id) => {
    setVoiceList((voiceList ?? voices).filter((v) => v.id !== id));
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Mis voces</h1>
          <p className="text-sm text-gray-400 mt-1">Guarda voces para usarlas al traducir o sintetizar texto.</p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="btn-primary">
            + Crear voz
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-6">
          <CreateVoiceForm
            onCreated={handleCreated}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-violet border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && list.length === 0 && !creating && (
        <div className="card text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">🎙️</p>
          <p>No tienes voces guardadas aún.</p>
          <button onClick={() => setCreating(true)} className="btn-primary mt-4 text-sm">
            Crear tu primera voz
          </button>
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="flex flex-col gap-3">
          {list.map((voice) => (
            <VoiceCard key={voice.id} voice={voice} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </Layout>
  );
}
