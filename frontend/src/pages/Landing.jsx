import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const plans = [
  {
    name: 'Free', price: 0, minutes: 5,
    features: ['5 min/mes', '5 idiomas disponibles', 'Descarga en MP3'],
    cta: 'Empezar gratis',
  },
  {
    name: 'Creator', price: 9, minutes: 60,
    features: ['60 min/mes', '5 idiomas disponibles', 'Clonación de voz', 'Descarga en MP3'],
    cta: 'Elegir Creator', highlight: true,
  },
  {
    name: 'Pro', price: 29, minutes: 300,
    features: ['300 min/mes', '5 idiomas disponibles', 'Clonación de voz', 'Descarga en MP3', 'Prioridad en procesamiento'],
    cta: 'Elegir Pro',
  },
];

const steps = [
  { icon: '🎙️', title: 'Graba o sube tu audio',    desc: 'MP3, WAV, M4A hasta 50 MB o graba directo desde el navegador.' },
  { icon: '🌐', title: 'Elige los idiomas',         desc: 'Selecciona el idioma origen y el idioma al que quieres traducir.' },
  { icon: '✨', title: 'La IA hace la magia',        desc: 'Whisper transcribe, DeepL traduce y ElevenLabs clona tu voz.' },
  { icon: '⬇️', title: 'Descarga tu audio',         desc: 'Recibe el audio traducido con tu propia voz. Listo para compartir.' },
];

export default function Landing() {
  const { user, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  const handleCTA = () => {
    if (user) navigate('/dashboard');
    else signInWithGoogle();
  };

  return (
    <div className="min-h-screen bg-bg text-white">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-bg/80 backdrop-blur z-50">
        <span className="text-xl font-bold">Vox<span className="text-violet">Shift</span></span>
        <button
          onClick={handleCTA}
          disabled={loading}
          className="btn-primary text-sm"
        >
          {loading ? '…' : user ? 'Ir al dashboard' : 'Iniciar sesión'}
        </button>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-violet/10 border border-violet/20 text-violet text-sm px-4 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-violet" />
          IA de última generación
        </div>
        <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
          Tu voz.<br />
          <span className="text-violet">Cualquier idioma.</span>
        </h1>
        <p className="mt-6 text-xl text-gray-400 max-w-2xl mx-auto">
          Traduce tu audio o podcast a 5 idiomas manteniendo exactamente tu voz.
          Sin subtítulos. Sin doblaje genérico. Tu voz real.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={handleCTA} disabled={loading} className="btn-primary text-lg px-8 py-3">
            Empieza gratis — 5 minutos
          </button>
          <a href="#how" className="btn-ghost text-lg px-8 py-3">
            Cómo funciona
          </a>
        </div>

        {/* Before/after demo */}
        <div className="mt-16 grid md:grid-cols-2 gap-6 text-left max-w-2xl mx-auto">
          <div className="card">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Antes</p>
            <p className="text-sm text-gray-300 italic">
              "Hola, soy María y este es mi podcast sobre tecnología."
            </p>
            <p className="text-xs text-gray-600 mt-2">🇪🇸 Español</p>
          </div>
          <div className="card border-violet/30 bg-violet/5">
            <p className="text-xs text-violet mb-2 uppercase tracking-wider">Después ✦</p>
            <p className="text-sm text-gray-300 italic">
              "Hi, I'm María and this is my tech podcast."
            </p>
            <p className="text-xs text-gray-600 mt-2">🇺🇸 English — <span className="text-violet">tu voz</span></p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">¿Cómo funciona?</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="card text-center">
                <span className="text-3xl">{step.icon}</span>
                <h3 className="font-semibold text-white mt-3 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-border py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Planes</h2>
          <p className="text-center text-gray-400 mb-12">Sin sorpresas. Cancela cuando quieras.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-6 border flex flex-col ${
                  plan.highlight ? 'border-violet bg-violet/5' : 'border-border bg-surface'
                }`}
              >
                {plan.highlight && (
                  <span className="text-xs font-semibold text-violet bg-violet/20 px-2 py-0.5 rounded-full mb-3 self-start">
                    Más popular
                  </span>
                )}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-4xl font-bold mt-3">
                  {plan.price === 0 ? 'Gratis' : `$${plan.price}`}
                  {plan.price > 0 && <span className="text-base text-gray-400 font-normal">/mes</span>}
                </p>
                <ul className="mt-5 space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-gray-300">
                      <span className="text-violet">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleCTA}
                  className={`mt-6 w-full py-2.5 rounded-lg font-semibold transition-colors ${
                    plan.highlight
                      ? 'bg-violet hover:bg-violet-dark text-white'
                      : 'bg-[#1a1a1a] hover:bg-[#222] text-white border border-border'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} VoxShift. Construido con OpenAI, DeepL y ElevenLabs.
      </footer>
    </div>
  );
}
