import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { PLANS, formatDate } from '../lib/utils.js';
import api from '../lib/api.js';

export default function Settings() {
  const { user, signOut } = useAuth();
  const [profile, setProfile]         = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [cancelling, setCancelling]   = useState(false);
  const [cancelled, setCancelled]     = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    api.get('/api/users/me').then(({ data }) => setProfile(data)).catch(() => {});
    api.get('/api/users/me/subscription').then(({ data }) => setSubscription(data)).catch(() => {});
  }, []);

  const handleCancel = async () => {
    if (!confirm('¿Confirmas que quieres cancelar tu suscripción? Seguirás teniendo acceso hasta el final del período.')) return;
    setCancelling(true);
    setError('');
    try {
      await api.post('/api/stripe/cancel');
      setCancelled(true);
    } catch {
      setError('No se pudo cancelar la suscripción. Contacta a soporte.');
    } finally {
      setCancelling(false);
    }
  };

  const planInfo = PLANS[profile?.plan] || PLANS.free;

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>

      {/* Profile */}
      <section className="card mb-4">
        <h2 className="font-semibold mb-4">Perfil</h2>
        <div className="flex items-center gap-4">
          <img
            src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.email}`}
            alt="avatar"
            className="w-14 h-14 rounded-full"
          />
          <div>
            <p className="font-medium text-white">
              {user?.user_metadata?.full_name || user?.user_metadata?.name || 'Usuario'}
            </p>
            <p className="text-sm text-gray-400">{user?.email}</p>
            <p className="text-xs text-gray-600 mt-1">
              Miembro desde {formatDate(profile?.created_at)}
            </p>
          </div>
        </div>
      </section>

      {/* Plan */}
      <section className="card mb-4">
        <h2 className="font-semibold mb-4">Plan actual</h2>
        <div className="flex items-center justify-between">
          <div>
            <span className={`font-bold text-lg ${planInfo.color}`}>{planInfo.name}</span>
            <p className="text-sm text-gray-400 mt-0.5">
              {planInfo.minutes} min/mes ·{' '}
              {planInfo.price === 0 ? 'Gratis' : `$${planInfo.price}/mes`}
            </p>
          </div>
          {profile?.plan === 'free' && (
            <a href="/dashboard" className="btn-primary text-sm">
              Mejorar plan
            </a>
          )}
        </div>

        {subscription && (
          <div className="mt-4 pt-4 border-t border-border text-sm text-gray-400">
            <p>
              Próxima renovación:{' '}
              <span className="text-white">{formatDate(subscription.current_period_end)}</span>
            </p>
          </div>
        )}
      </section>

      {/* Cancel subscription */}
      {subscription && !cancelled && (
        <section className="card mb-4 border-red-500/20">
          <h2 className="font-semibold mb-2">Cancelar suscripción</h2>
          <p className="text-sm text-gray-400 mb-4">
            Seguirás teniendo acceso hasta el{' '}
            <span className="text-white">{formatDate(subscription.current_period_end)}</span>.
            Después tu plan volverá a Free.
          </p>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="text-red-400 border border-red-500/30 hover:bg-red-500/10 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {cancelling ? 'Cancelando…' : 'Cancelar suscripción'}
          </button>
        </section>
      )}

      {cancelled && (
        <div className="card border-yellow-500/30 bg-yellow-500/5 text-sm text-yellow-400 mb-4">
          Tu suscripción ha sido cancelada. Seguirás con acceso hasta el final del período.
        </div>
      )}

      {/* Sign out */}
      <section className="card">
        <h2 className="font-semibold mb-3">Sesión</h2>
        <button
          onClick={signOut}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          Cerrar sesión
        </button>
      </section>
    </Layout>
  );
}
