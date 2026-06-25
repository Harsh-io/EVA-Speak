# Deployment Notes

EVA Speak can run in two modes:

- Local Streamlit dashboard for demos.
- React frontend on Vercel plus Express/Python API on Render.

Vercel alone is not a good target for the full analysis backend because the app
needs FFmpeg, Python model loading, large uploads, and CPU-heavy video/audio
processing.

## Local Streamlit Demo

```powershell
.\run_dashboard.cmd
```

## Render Backend

Render should deploy the backend from the root `Dockerfile` or `render.yaml`.
The Docker image installs:

- Node/Express API
- Python 3.12
- FFmpeg/FFprobe
- Python analysis dependencies from `requirements.txt`

Set this environment variable on Render after you know the Vercel URL:

```text
EVA_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
```

For demo-friendly rate limiting, also set:

```text
EVA_RATE_LIMIT=20
EVA_RATE_WINDOW_MS=600000
EVA_ANALYSIS_TIMEOUT_MS=300000
```

Optional but recommended if Hugging Face downloads are slow or rate-limited:

```text
HF_TOKEN=your_hugging_face_token
```

If these variables already exist in the Render dashboard, update them there and
redeploy. Existing dashboard values can override `render.yaml`.

The backend health endpoint is:

```text
https://your-render-service.onrender.com/api/health
```

## Vercel Frontend

Deploy the same repository to Vercel with:

```text
Build Command: npm run build
Output Directory: dist
```

Set this Vercel environment variable:

```text
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

After Vercel gives you the final app URL, copy it back into Render as
`EVA_ALLOWED_ORIGINS`.

## Data Retention

Uploaded videos and extracted audio are temporary and deleted after analysis.
Generated JSON reports and CSV history are written under `Data/` on the backend.
On Render free instances, local disk may not be durable across restarts.
