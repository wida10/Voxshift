export const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
];

export const PLANS = {
  free:    { name: 'Free',    minutes: 5,   price: 0,  color: 'text-gray-400' },
  creator: { name: 'Creator', minutes: 60,  price: 9,  color: 'text-violet' },
  pro:     { name: 'Pro',     minutes: 300, price: 29, color: 'text-yellow-400' },
};

export function formatDuration(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export const STATUS_LABELS = {
  pending:    'En cola',
  processing: 'Procesando',
  completed:  'Completado',
  failed:     'Error',
};

export const STATUS_COLORS = {
  pending:    'text-yellow-400 bg-yellow-400/10',
  processing: 'text-blue-400 bg-blue-400/10',
  completed:  'text-green-400 bg-green-400/10',
  failed:     'text-red-400 bg-red-400/10',
};
