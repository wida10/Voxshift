import { useState } from 'react';
import api from '../lib/api.js';

const plans = [
  {
    key:      'starter',
    name:     'Starter',
    price:    9,
    minutes:  60,
    features: ['60 min/mes', 'Clonación de voz', 'Descarga en MP3', 'Historial ilimitado'],
  },
  {
    key:      'pro',
    name:     'Pro',
    price:    19,
    minutes:  250,
    features: ['250 min/mes', 'Clonación de voz', 'Descarga en MP3', 'Historial ilimitado', 'Prioridad en procesamiento'],
    highlight: true,
  },
];

export default function UpgradeModal({ onClose }) {
  const [loading, setLoading] = useState(null);
  const [error, setError]     = useState('');

  const handleUpgrade = async (planKey) => {
    setLoading(planKey);
    setError('');
    try {
      const { data } = await api.post('/api/lemonsqueezy/checkout', { plan: planKey });
      window.location.href = data.url;
    } catch {
      setError('No se pudo iniciar el pago. Inténtalo de nuevo.');
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl p-8 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Mejora tu plan</h2>
            <p className="text-gray-400 mt-1">Has alcanzado el límite de minutos de tu plan actual.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="grid md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`rounded-xl p-6 border transition-all ${
                plan.highlight
                  ? 'border-violet bg-violet/5'
                  : 'border-border bg-[#1a1a1a]'
              }`}
            >
              {plan.highlight && (
                <span className="text-xs font-semibold text-violet bg-violet/20 px-2 py-0.5 rounded-full mb-3 inline-block">
                  Más popular
                </span>
              )}
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              <p className="text-3xl font-bold text-white mt-2">
                ${plan.price}<span className="text-base text-gray-400 font-normal">/mes</span>
              </p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-violet">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade(plan.key)}
                disabled={loading !== null}
                className={`w-full mt-5 py-2.5 rounded-lg font-semibold transition-colors ${
                  plan.highlight
                    ? 'bg-violet hover:bg-violet-dark text-white'
                    : 'bg-[#2a2a2a] hover:bg-[#333] text-white'
                } disabled:opacity-50`}
              >
                {loading === plan.key ? 'Redirigiendo…' : `Elegir ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
