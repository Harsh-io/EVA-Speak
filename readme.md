# EVA Speak

EVA Speak is a local AI practice tool that helps a person review how they speak in a recorded interview or presentation.

Upload an MP4 video, enter the expected text, and the app analyzes speech clarity plus basic visual communication estimates. Results are shown in the React UI and saved as JSON/CSV artifacts by the Python pipeline.

## What the project does

The project has three analysis stages:

1. Speech analysis
2. Visual analysis
3. Combined React UI, API, and reporting

### Stage 1: Speech analysis

Stage 1 takes an MP3 file, transcribes it with `faster-whisper`, compares the transcript with the expected text, and produces a JSON report.

It helps answer questions like:

- Did the speaker say the expected words?
- Were there missing or extra words?
- How fluent was the speech?
- Were there long pauses, fillers, or repeated phrases?

### Stage 2: Visual analysis

Stage 2 takes an MP4 file and uses OpenCV plus MediaPipe Face Mesh to estimate visual communication signals.

It looks at things like:

- Whether a face was detected
- Estimated eye contact
- Face direction
- Looking-away events
- Head stability

These are approximate estimates, not exact gaze tracking or emotion detection.

### Stage 3: Combined report and UI

Stage 3 combines the speech and visual results in the React UI through a lightweight Express API.

It also:

- Generates rule-based feedback
- Calculates an interview-readiness score
- Saves JSON reports
- Appends a CSV history row

## Main features

- Upload and preview an MP4 video in the browser
- Compare spoken words with the expected text
- See readiness, fluency, pronunciation, and eye-contact estimates at the top of the results
- See transcript comparison, missing words, inserted words, and substitutions
- See speech metrics including confidence, low-confidence words, pauses, fillers, repetitions, and filler breakdown
- See visual metrics including face direction and facial-expression estimate graphs
- See feedback and known limitations
- Download the final JSON report
- Keep a local CSV history of previous analyses
- Run the same pipeline from the command line

Default sample prompt:

> The quick brown fox jumps over the lazy dog.

## Requirements

- Python 3.12.3
- Node.js 20 or newer
- FFmpeg and FFprobe available on `PATH`
- Windows, macOS, or Linux
- Internet access on the first run so `faster-whisper` can download `tiny.en`

## Setup

PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
npm.cmd install
```

The project is verified with Python 3.12.3.

## Run the React UI and JavaScript API

```powershell
npm.cmd run dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:3001`.

After the page opens:

1. Upload an MP4 video.
2. Preview the uploaded video.
3. Enter or edit the expected text.
4. Click **Analyze communication**.
5. Review the transcript, speech metrics, visual metrics, feedback, and limitations.

For a production-style local run:

```powershell
npm.cmd run build
npm.cmd start
```

API endpoints:

- `GET /api/health`
- `POST /api/analyze/full` with multipart fields `video` and `expectedText`
- `GET /api/reports/{report_id}`

Request limits:

- 5 analyses per client per 15 minutes
- 1 active analysis per process

Helpful environment variables:

- `EVA_RATE_LIMIT`
- `EVA_RATE_WINDOW_MS`
- `EVA_ANALYSIS_TIMEOUT_MS`

If you add `?fallback=last`, the API can return the last successful in-memory report when live analysis fails. That response uses HTTP 206 and includes `degraded: true`.

## Run from the command line

### Combined analysis

Use this when you want one JSON report for both speech and visual analysis:

```powershell
python -m app.full_cli "Videos\01.Video.mp4" --output "jsons\full-report.json"
```

You can also pass custom expected text:

```powershell
python -m app.full_cli "Videos\01.Video.mp4" --expected-text "Tell me about yourself."
```

This extracts temporary audio, runs the analysis, writes a combined JSON report, and appends `Data/history/analysis_history.csv`.

### Speech-only analysis

Input rules:

- MP3 only
- Up to 100 MB
- Between 10 seconds and 10 minutes

```powershell
python mp3_to_json.py "Audios\01_Video.mp3"
```

To choose the output file:

```powershell
python -m app.cli "Audios\01_Video.mp3" --output "jsons\stage1-report.json"
```

The source MP3 is preserved. The temporary processing copy is deleted after analysis.

### Visual-only analysis

Use this when you only want the video analysis:

```powershell
python video_to_visual_json.py "Videos\01.Video.mp4"
```

To choose the output file:

```powershell
python -m app.vision_cli "Videos\01.Video.mp4" --output "jsons\stage2-visual-report.json"
```

The source MP4 is preserved. The temporary processing copy is deleted after analysis.

## Report contents

The final report can include:

- Transcript and word timestamps
- WER and CER
- Missing, inserted, and substituted words
- Pronunciation-style accuracy score
- Word confidence and low-confidence words
- Words per minute and speech-rate category
- Long pauses and filler pauses
- Repeated words or phrases
- Fluency and interview communication scores
- Face presence, eye-contact estimate, face direction, looking-away events, and head stability
- Visual communication and combined interview-readiness scores
- Transcript sentiment and facial-expression estimates
- Rule-based feedback and limitations

The combined interview-readiness score gives more weight to speech than visual cues:

- Speech communication: 75%
- Visual communication: 25%

## Data handling

- Uploaded browser files are removed after processing
- Temporary audio extraction files are removed after processing
- JSON reports are saved in `Data/reports/` unless you choose another path
- CSV history is saved in `Data/history/analysis_history.csv`
- Runtime upload, report, and history folders are ignored by Git

## Project structure

```text
app/                       Core analysis services and CLI entry points
backend/server.js          Express API for the React front end
frontend/                  React client
tests/                     Unit tests
sample_outputs/            Example report schemas
Data/                      Runtime uploads, reports, and history
DEPLOYMENT.md              Local and hosted deployment guidance
```

## Tests

```powershell
python -m pytest
npm.cmd run test:api
npm.cmd run build
```

## Limitations

- Transcript comparison is not phoneme-level pronunciation assessment.
- Model confidence is not a clinical measure.
- Repetition detection finds repeated text patterns and does not diagnose stuttering.
- Eye contact and face direction are camera-based estimates, not exact gaze tracking.
- Sentiment describes transcript language, not the speaker's true mood or intent.
- Facial-expression categories are simple geometry heuristics, not reliable emotion recognition.
- Lighting, glasses, occlusion, camera placement, and transcription errors affect results.
- Emotion detection is intentionally excluded.

## Status

Stages 1, 2, and 3 are implemented for local MVP testing with the React UI as the supported browser interface.
