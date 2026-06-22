# EVA Speak

Stage 1 is a local, English-only speaking analysis MVP. It accepts an MP3, transcribes it with
`faster-whisper` using `tiny.en` on CPU, compares the transcript with the fixed prompt, and writes
a JSON report.

Stage 2 accepts the matching MP4 and uses OpenCV with MediaPipe Face Mesh to estimate face presence,
face direction, eye contact, looking-away events, and head stability. These are approximate visual
communication signals, not exact gaze measurements.

Stage 3 combines both analyses in a local Streamlit dashboard, generates rule-based feedback and an
interview readiness estimate, stores JSON reports, and appends a CSV history row.

Default sample prompt:

> The quick brown fox jumps over the lazy dog.

The dashboard supports two expected-text modes:

- **Default sample** keeps the prompt above available as the fixed sample.
- **User-entered** accepts a custom prompt or paragraph up to 5,000 characters.

This project provides automated interview-practice feedback. Its pronunciation-style accuracy,
confidence, pause, and repetition metrics are estimates and are not clinical assessments.

## Requirements

- Python 3.12.3
- FFmpeg/FFprobe available on `PATH`
- Windows, macOS, or Linux
- Internet access on the first run so `faster-whisper` can download `tiny.en`

## Setup

PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

The project is verified with Python 3.12.3.

## Run

### React UI and JavaScript API

The React client uses a lightweight Express API. The API validates and temporarily stores uploads,
then calls the existing Python pipeline through `app.api_bridge`; it does not duplicate the speech
or vision analysis.

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:3001`. For a production-style local
run, use `npm.cmd run build`, then `npm.cmd start`, and open `http://localhost:3001`.

API endpoints:

- `GET /api/health`
- `POST /api/analyze/full` with multipart fields `video` and `expectedText`
- `GET /api/reports/{report_id}`

Analysis requests are limited to 5 per client per 15 minutes and one active analysis per process.
Configure these with `EVA_RATE_LIMIT`, `EVA_RATE_WINDOW_MS`, and `EVA_ANALYSIS_TIMEOUT_MS`. A client
may add `?fallback=last` to explicitly accept the last successful in-memory report when live analysis
fails. Such a response uses HTTP 206 and includes `degraded: true`; the API never invents fallback
scores. Rate-limit responses use HTTP 429, and busy responses use HTTP 503.

### Streamlit dashboard

```powershell
.\run_dashboard.cmd
```

The launcher deliberately uses the project `.venv`. This avoids accidentally running the global
Anaconda Streamlit executable, which does not necessarily contain EVA Speak dependencies. Equivalent
explicit command:

```powershell
.\.venv\Scripts\python.exe -m streamlit run dashboard\streamlit_app.py
```

Open the displayed local URL, upload an MP4, and select **Analyze communication**. The dashboard
previews the video and provides transcript, pronunciation-style, confidence, fluency, pause, filler,
repetition, eye-contact estimate, face direction, head stability, feedback, and download sections.

It also shows VADER transcript sentiment (`positive`, `neutral`, or `negative`) and a basic
MediaPipe landmark-based facial-expression estimate (`happy`, `neutral`, or `serious`). These
estimates are informational only and do not affect interview scores.

The expected text is fixed. A recording that says different words will correctly receive a high
WER and low pronunciation-style accuracy even if the speaker sounds clear.

### Complete command-line analysis

```powershell
python -m app.full_cli "Videos\01.Video.mp4" --output "jsons\full-report.json"
```

Use custom expected text from the CLI:

```powershell
python -m app.full_cli "Videos\01.Video.mp4" --expected-text "Tell me about yourself."
```

This extracts temporary MP3 audio, runs speech and vision analysis, creates a combined JSON report,
and appends `Data/history/analysis_history.csv`.

### Speech-only analysis

Input rules:

- MP3 only
- 100 MB maximum
- 10 seconds to 10 minutes inclusive

```powershell
python mp3_to_json.py "Audios\01_Video.mp3"
```

Choose the report location:

```powershell
python -m app.cli "Audios\01_Video.mp3" --output "jsons\stage1-report.json"
```

The source MP3 is preserved. During analysis it is copied into an isolated upload directory, and
that processing copy is deleted immediately afterward. Reports default to `Data/reports/`.

### Stage 2 visual analysis

Stage 2 accepts MP4 files from 10 seconds to 10 minutes and up to 100 MB:

```powershell
python video_to_visual_json.py "Videos\01.Video.mp4"
```

Choose the report location:

```powershell
python -m app.vision_cli "Videos\01.Video.mp4" --output "jsons\stage2-visual-report.json"
```

The source MP4 is preserved; its temporary processing copy is always deleted after analysis.

## Report contents

- Transcript and word timestamps
- WER, CER, missing, inserted, and substituted words
- Pronunciation-style accuracy score
- Faster Whisper word confidence and low-confidence words
- Words per minute and rate category
- Long pauses and filler pauses
- Filler expressions and repeated words/phrases
- Fluency and speech-only interview communication scores
- Face presence, eye-contact estimate, face direction, looking-away events, and head stability
- Visual communication and combined interview readiness scores
- Transcript sentiment and basic facial-expression estimates
- Rule-based improvement feedback and limitations

The combined interview readiness score weights speech communication at 75% and visual communication
at 25%. The visual score uses the eye-contact estimate, face presence, and head stability.

## Data handling

- Uploaded browser files, extracted MP3 files, and internal processing copies are deleted immediately.
- JSON reports remain in `Data/reports/` unless another output path is selected.
- Summary history remains in `Data/history/analysis_history.csv`.
- Audio, video, report, and history directories are excluded from Git.

## Tests

```powershell
python -m pytest
npm.cmd run test:api
npm.cmd run build
```

## Project structure

```text
app/                       Analysis services and CLI entry points
dashboard/streamlit_app.py Streamlit dashboard
tests/                     Unit tests
sample_outputs/            Compact example report schemas
Data/                      Runtime uploads, reports, and history
DEPLOYMENT.md              Local and hosted deployment guidance
```

## Architecture decision

This MVP is Streamlit-only, as selected during planning. It does not expose a FastAPI service. Heavy
audio/video processing is local-first; see `DEPLOYMENT.md` for hosting limitations.

Production-oriented safeguards included in the local architecture:

- Environment-variable configuration with documented defaults in `.env.example`
- Separate transcription, NLP, vision, scoring, persistence, and orchestration services
- Dependency injection for reusable cached model instances and test doubles
- Atomic JSON report writes to prevent partial files
- Thread-safe CSV writes with automatic history schema migration
- Versioned combined report schema and processing metadata
- Strict upload type, size, duration, and expected-text validation
- Guaranteed temporary-media cleanup through context managers

## Known limitations

- Transcript comparison is not phoneme-level pronunciation assessment.
- Model probability is not a clinical confidence or pronunciation measurement.
- Repetition detection identifies repeated text patterns and does not diagnose stuttering.
- Eye contact and face direction are camera-based estimates, not exact gaze tracking.
- Sentiment describes transcript language, not the speaker's true mood or intent.
- Facial-expression categories are geometry heuristics, not reliable emotion recognition.
- Lighting, glasses, occlusion, camera placement, and model transcription errors affect results.
- Emotion detection is intentionally excluded.

## Status

Stages 1, 2, and 3 are implemented for local MVP testing.
