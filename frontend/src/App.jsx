import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import Landing      from './pages/Landing.jsx';
import Dashboard    from './pages/Dashboard.jsx';
import Process      from './pages/Process.jsx';
import Settings     from './pages/Settings.jsx';
import Voices       from './pages/Voices.jsx';
import AuthCallback from './pages/AuthCallback.jsx';

function ProtectedRoute({ children }) {
  const { loading, user } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  if (!user)   return <Navigate to="/" replace />;
  return children;
}

function Spinner() {
  return (
    <div className="w-8 h-8 border-2 border-violet border-t-transparent rounded-full animate-spin" />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"              element={<Landing />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/dashboard"     element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/process"       element={<ProtectedRoute><Process /></ProtectedRoute>} />
        <Route path="/settings"      element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/voices"        element={<ProtectedRoute><Voices /></ProtectedRoute>} />
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
