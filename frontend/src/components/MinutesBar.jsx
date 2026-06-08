import { PLANS } from '../lib/utils.js';

export default function MinutesBar({ used, limit, plan }) {
  const pct  = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const info = PLANS[plan] || PLANS.free;
  const isNearLimit = pct >= 80;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm text-gray-400">Minutos usados</span>
          <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${info.color} bg-current/10`}>
            {info.name}
          </span>
        </div>
        <span className="text-sm font-semibold">
          {used}<span className="text-gray-500">/{limit} min</span>
        </span>
      </div>

      <div className="h-2 bg-[#1f1f1f] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isNearLimit ? 'bg-red-500' : 'bg-violet'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {isNearLimit && (
        <p className="text-xs text-red-400 mt-2">
          Estás cerca del límite de tu plan.
        </p>
      )}
    </div>
  );
}
