import { useState } from 'react';
import { LANGUAGES, STATUS_LABELS, STATUS_COLORS, formatDuration, formatDate } from '../lib/utils.js';
import api from '../lib/api.js';

const langLabel = (code) => LANGUAGES.find((l) => l.code === code)?.label || code;

export default function JobCard({ job, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const statusClass = STATUS_COLORS[job.status] || '';

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta traducción? Esta acción no se puede deshacer.')) return;
    setDeleting(true);
    try {
      await api.delete(`/api/jobs/${job.id}`);
      onDelete(job.id);
    } catch {
      alert('No se pudo eliminar. Inténtalo de nuevo.');
      setDeleting(false);
    }
  };

  return (
    <div className="card flex flex-col sm:flex-row sm:items-center gap-4">
      {/* Status badge */}
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${statusClass}`}>
        {STATUS_LABELS[job.status] || job.status}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {job.original_filename || 'Audio sin nombre'}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {langLabel(job.source_language)} → {langLabel(job.target_language)}
          {job.original_duration_seconds ? ` · ${formatDuration(job.original_duration_seconds)}` : ''}
          {' · '}{formatDate(job.created_at)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {job.status === 'completed' && job.output_url && (
          <a href={job.output_url} download className="btn-primary text-sm whitespace-nowrap">
            Descargar
          </a>
        )}
        {job.status === 'failed' && (
          <span className="text-xs text-red-400">Procesamiento fallido</span>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/10 disabled:opacity-40"
          title="Eliminar"
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
    </div>
  );
}
