import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const { pathname }      = useLocation();
  const navigate          = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/process',   label: 'Nuevo audio' },
    { to: '/settings',  label: 'Configuración' },
  ];

  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-bg/80 backdrop-blur z-50">
        <Link to="/dashboard" className="text-xl font-bold text-white">
          Vox<span className="text-violet">Shift</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === to
                  ? 'text-white bg-surface'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <img
            src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.email}`}
            alt="avatar"
            className="w-8 h-8 rounded-full"
          />
          <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-white transition-colors">
            Salir
          </button>
        </div>
      </nav>

      {/* Mobile nav */}
      <div className="md:hidden border-b border-border px-4 py-2 flex gap-2 overflow-x-auto">
        {navLinks.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === to
                ? 'text-white bg-surface'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
