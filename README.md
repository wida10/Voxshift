# VoxShift

Traduce tu voz a cualquier idioma manteniendo tu voz real.

## Stack

| Capa       | Tecnología              |
|------------|-------------------------|
| Frontend   | React + Vite + Tailwind |
| Backend    | Node.js + Express       |
| Base datos | Supabase (PostgreSQL)   |
| Auth       | Supabase Auth (Google)  |
| Pagos      | Stripe                  |
| Voz IA     | ElevenLabs              |
| STT        | OpenAI Whisper          |
| Traducción | DeepL                   |

## Estructura

```
voxshift/
├── frontend/        React + Vite (→ Vercel)
├── backend/         Node.js + Express (→ Railway)
├── supabase/
│   └── migrations/  SQL para aplicar en Supabase
└── .gitignore
```

## Setup local

### 1. Supabase

1. Abre tu proyecto **SeriYA** en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta `supabase/migrations/001_voxshift_schema.sql`
3. En **Authentication → Providers**, activa **Google** y configura el OAuth redirect a `http://localhost:5173/auth/callback`

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Rellena .env con tus claves reales
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Rellena .env con tus claves reales
npm run dev
```

Abre http://localhost:5173

## Variables de entorno

### backend/.env

| Variable                  | Descripción                              |
|---------------------------|------------------------------------------|
| `OPENAI_API_KEY`          | OpenAI — para Whisper                    |
| `DEEPL_API_KEY`           | DeepL — termina en `:fx` si es free tier |
| `ELEVENLABS_API_KEY`      | ElevenLabs                               |
| `SUPABASE_URL`            | URL del proyecto Supabase                |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (no la anon key)      |
| `STRIPE_SECRET_KEY`       | Stripe secret key                        |
| `STRIPE_WEBHOOK_SECRET`   | Del Stripe dashboard → Webhooks          |
| `STRIPE_PRICE_CREATOR`    | Price ID del plan Creator                |
| `STRIPE_PRICE_PRO`        | Price ID del plan Pro                    |
| `FRONTEND_URL`            | URL del frontend (para CORS)             |

### frontend/.env

| Variable                    | Descripción                  |
|-----------------------------|------------------------------|
| `VITE_SUPABASE_URL`         | URL del proyecto Supabase    |
| `VITE_SUPABASE_ANON_KEY`    | Anon key pública de Supabase |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key     |
| `VITE_BACKEND_URL`          | URL del backend              |

## Despliegue a producción

### Supabase
- El esquema ya está creado con el SQL de migrations.
- Activa el proveedor **Google** en Authentication → Providers.
- Agrega la URL de producción en Authentication → URL Configuration:
  - Site URL: `https://tu-app.vercel.app`
  - Redirect URLs: `https://tu-app.vercel.app/auth/callback`

### Backend → Railway
1. Conecta tu repo en [railway.app](https://railway.app)
2. Configura las variables de entorno del backend en Railway
3. Railway detecta automáticamente Node.js y corre `npm start`
4. Copia la URL pública de Railway (ej. `https://voxshift-backend.up.railway.app`)

### Frontend → Vercel
1. Conecta tu repo en [vercel.com](https://vercel.com)
2. Root directory: `frontend`
3. Configura las variables de entorno con las claves de producción
4. `VITE_BACKEND_URL` debe apuntar a la URL de Railway

### Stripe Webhooks
1. En Stripe Dashboard → Webhooks → Add endpoint
2. URL: `https://tu-backend.railway.app/api/stripe/webhook`
3. Eventos a escuchar:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copia el signing secret y ponlo en `STRIPE_WEBHOOK_SECRET`

## Checklist de pruebas

- [ ] `GET /health` devuelve `{"ok":true}`
- [ ] Login con Google funciona y redirige a `/dashboard`
- [ ] Se crea el registro en `voxshift.users` automáticamente
- [ ] Se puede subir un audio y el job aparece como `pending`
- [ ] El procesamiento completa y el job queda `completed`
- [ ] El audio traducido se puede reproducir y descargar
- [ ] Los minutos se descuentan correctamente
- [ ] El modal de upgrade aparece cuando no hay minutos
- [ ] El checkout de Stripe redirige a la página de pago
- [ ] El webhook actualiza el plan del usuario
