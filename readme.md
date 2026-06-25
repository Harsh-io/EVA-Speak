# EVA Speak

EVA Speak is a local AI speaking-coach MVP for interview and presentation practice.
It analyzes an uploaded MP4 video, transcribes the speaker locally, compares the
transcript with an expected text prompt, estimates basic visual communication
signals, and produces a JSON report plus CSV history.

This is a college/resume MVP, not a medical or clinical speech tool.

## Current Architecture

- Python 3.12.3
- Streamlit dashboard for local demos
- React frontend + Express/Python API for Vercel/Render deployment
- Local `faster-whisper` transcription with `tiny.en`
- CPU-only processing
- OpenCV + MediaPipe for basic visual estimates
- VADER sentiment estimate for transcript tone
- Temporary uploaded/extracted media deleted after analysis

## Directory Structure

```text
EVA Speak/
  app/                  Core Python analysis pipeline
  app/services/         Speech, vision, scoring, history, and file helpers
  backend/              Express API used by the deployed React frontend
  dashboard/            Streamlit dashboard entry point
  docs/                 Project notes and deployment notes
  frontend/             React/Vite frontend for Vercel
  tests/                Python tests
  .streamlit/           Streamlit local config
  Dockerfile            Render backend image
  .env.example          Optional environment variables
  package.json          React/Express scripts and dependencies
  requirements.txt      Python dependencies
  render.yaml           Render blueprint
  run_dashboard.cmd     Windows launcher
  vercel.json           Vercel frontend config
  readme.md             This file
```

Runtime output is generated under `Data/` when the app runs. Uploaded media is
temporary; reports and CSV history are generated locally.

## Setup

PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

FFmpeg and FFprobe must be available on `PATH`.

## Run

### Local Streamlit Demo

```powershell
.\run_dashboard.cmd
```

Then open:

```text
http://localhost:8501
```

Equivalent explicit command:

```powershell
.\.venv\Scripts\python.exe -m streamlit run --server.port 8501 --server.headless true dashboard\streamlit_app.py
```

### Local React + API

```powershell
npm install
npm run dev
```

The React app runs on `http://localhost:5173` and the API runs on
`http://localhost:3001`.

## Deploy: Vercel + Render

Use Render for the backend and Vercel for the frontend.

1. Deploy the backend on Render from this repo using `render.yaml` or the root
   `Dockerfile`.
2. After Render deploys, check:

```text
https://your-render-service.onrender.com/api/health
```

3. Deploy the frontend on Vercel with:

```text
Build Command: npm run build
Output Directory: dist
```

4. Set this Vercel environment variable:

```text
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

5. Set this Render environment variable after Vercel gives you the frontend URL:

```text
EVA_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
```

More detail is in `docs/DEPLOYMENT.md`.

## Upload Rules

- MP4 video only
- Maximum file size: 100 MB
- Recording duration: 10 seconds to 10 minutes
- English only

## Expected Text

The dashboard supports:

- Default sample: `The quick brown fox jumps over the lazy dog.`
- User-entered expected text

## Tests

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```
