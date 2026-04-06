# Propuesta Técnica — Especialista IA × Aerya × Back9

Landing page interactiva con demo de NLP en vivo (análisis de sentimiento via Claude API), terminal DevOps simulada, red neuronal animada y métricas de impacto.

## Arquitectura

```
┌──────────────────┐     POST /analyze     ┌──────────────────┐     ┌─────────────┐
│   Frontend       │ ──────────────────→   │   Backend        │ ──→ │ Anthropic   │
│   (React/Vite)   │                       │   (FastAPI)      │ ←── │ Claude API  │
│   GitHub Pages   │ ←──────────────────   │   Railway/Render │     └─────────────┘
└──────────────────┘     JSON response     └──────────────────┘
```

---

## 🚀 Deploy Rápido

### 1. Backend (Railway — gratis)

```bash
cd backend
```

**Opción A — Railway (recomendado):**
1. Ve a [railway.app](https://railway.app) y crea una cuenta
2. Crea un nuevo proyecto → "Deploy from GitHub repo"
3. Apunta al directorio `/backend` de tu repo
4. En **Variables**, agrega:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
   ```
5. Railway auto-detecta el Dockerfile y despliega
6. Copia la URL pública (ej: `https://tu-app.railway.app`)

**Opción B — Render (gratis):**
1. Ve a [render.com](https://render.com)
2. New → Web Service → conecta tu repo
3. Root directory: `backend`
4. Build: `pip install -r requirements.txt`
5. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Agrega env var `ANTHROPIC_API_KEY`

**Opción C — Local (para testing):**
```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
uvicorn main:app --reload --port 8000
```

Prueba: `curl http://localhost:8000/health`

---

### 2. Frontend

```bash
cd frontend
```

**Setup:**
```bash
npm create vite@latest . -- --template react
# (si ya tienes el proyecto Vite, solo copia src/App.jsx)
npm install
```

**Configura la URL del backend:**

Edita `.env.production`:
```
VITE_API_URL=https://tu-backend.railway.app
```

**Para desarrollo local:**
```bash
# .env ya tiene http://localhost:8000
npm run dev
```

**Deploy a GitHub Pages:**
```bash
npm install gh-pages --save-dev
```

Agrega a `package.json`:
```json
{
  "homepage": "https://tu-usuario.github.io/propuesta-aerya",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

Agrega a `vite.config.js`:
```js
export default defineConfig({
  plugins: [react()],
  base: '/propuesta-aerya/'
})
```

```bash
npm run deploy
```

**Deploy a Vercel (alternativa):**
```bash
npx vercel
```

---

## 📁 Estructura

```
propuesta-aerya/
├── backend/
│   ├── main.py              # FastAPI proxy → Claude API
│   ├── requirements.txt
│   ├── Dockerfile
│   └── railway.toml
├── frontend/
│   ├── src/
│   │   └── App.jsx          # React app completa
│   ├── .env                 # URL backend (dev)
│   └── .env.production      # URL backend (prod)
└── README.md
```

## 🔒 Seguridad

- La API key de Anthropic **nunca** se expone al frontend
- El backend proxy la inyecta server-side
- CORS configurado (ajusta `allow_origins` en producción)

## ✨ Features

- **Demo NLP en vivo**: Análisis de sentimiento con Claude API via backend proxy
- **Red neuronal animada**: Canvas que simula inferencia capa por capa
- **Terminal DevOps**: Comandos interactivos (status, train, benchmark)
- **Métricas animadas**: Contadores que se activan con scroll
- **100% Responsive**: Funciona en móvil, tablet y desktop
