# Codex Build Brief — MVP: AI Speaking + Eye Contact Feedback App

## 0. Project Summary

Build an MVP web app where a user uploads a speaking practice video and optionally provides the expected script/text. The system should:

1. Extract audio from the uploaded video.
2. Transcribe the audio using Whisper or faster-whisper.
3. Compare expected text vs spoken transcript.
4. Calculate word-level confidence or an MVP confidence proxy.
5. Detect pauses, repetitions, filler words, stutter-like patterns, and speaking speed.
6. Use MediaPipe/OpenCV to estimate face direction and eye-contact behavior from the video.
7. Generate a feedback report with scores, charts, problem words, timing issues, and improvement suggestions.
8. Provide a Flask API backend and Streamlit dashboard/frontend.
9. Prepare a practical deployment path using Streamlit for the dashboard and Vercel-compatible Flask API structure where feasible.

Important: This is an MVP, not a medically accurate speech disorder diagnosis tool. Do not claim clinical stutter detection or perfect pronunciation scoring. Use terms like “stutter-like repetition detection,” “eye-contact estimate,” and “pronunciation confidence proxy.”

---

## 1. Before Coding: Ask Questions First

Before writing any code, ask me all necessary questions. Do not create files until I answer.

Ask at least these questions:

1. Should the MVP accept only `.mp4` videos, or also `.mov`, `.mkv`, `.webm`, and direct `.wav/.mp3` audio?
2. What is the maximum upload length for MVP? Default suggestion: 2–5 minutes.
3. Should transcription run locally using `faster-whisper`, or should it be written in a way that can later switch to an external API?
4. Which Whisper model size should be the default? Default suggestion: `base` or `small` for speed.
5. Should the expected text be typed/pasted by the user, uploaded as `.txt`, or both?
6. Should the first version support only English? Default suggestion: English-only MVP.
7. Do we need user login? Default suggestion: no login for MVP.
8. Should uploaded files be deleted after processing? Default suggestion: yes, delete temporary files after report generation.
9. Should reports be downloadable as JSON, CSV, and PDF? Default suggestion: JSON + CSV in MVP; PDF optional.
10. Should Stage 3 deployment be a real production deployment or a deployment-ready project structure with instructions?

After asking these questions, wait for my answers.

---

## 2. Hard Stage Gates

You must complete the work in exactly 3 stages.

### Stage 1 — Speaking Analysis Only

Build the audio/video upload pipeline and speech analysis engine.

At the end of Stage 1:
- Stop.
- Summarize what was completed.
- Show how to run and test Stage 1 locally.
- List files created/changed.
- Show sample output JSON.
- Ask me to test it.
- Do not start Stage 2 until I explicitly say: `CONTINUE_STAGE_2`.

### Stage 2 — Computer Vision Eye/Face Direction

Add MediaPipe/OpenCV-based face direction and eye-contact estimate.

At the end of Stage 2:
- Stop.
- Summarize what was completed.
- Show how to run and test Stage 2 locally.
- List files created/changed.
- Show sample CV output JSON.
- Ask me to test it.
- Do not start Stage 3 until I explicitly say: `CONTINUE_STAGE_3`.

### Stage 3 — Feedback Dashboard + Deployment

Add final feedback report, Flask API endpoints, Streamlit dashboard, and deployment instructions/configs.

Before deployment work:
- Stop once and ask me to confirm deployment target.
- Default practical target: Streamlit dashboard on Streamlit Community Cloud, Flask API as Vercel-compatible if feasible, and local fallback for full video processing.

At the end of Stage 3:
- Provide final run commands.
- Provide deployment instructions.
- Provide known limitations.
- Provide next improvement roadmap.

---

## 3. MVP Feature Scope

### Must-Have Features

#### Input
- Upload a video file.
- Extract audio from video.
- Accept expected script/text from user.
- Save temporary working files in a safe `/tmp` or local `data/uploads` directory.

#### Speech-to-Text
- Use `faster-whisper` or `whisper` for transcription.
- Prefer `faster-whisper` if it provides word timestamps and word probabilities.
- Store transcript with segments and word-level timing where available.

#### Expected Text vs Spoken Text
- Normalize both texts:
  - lowercase
  - remove extra spaces
  - remove unnecessary punctuation
  - keep meaningful contractions if needed
- Compare using word-level alignment.
- Use `rapidfuzz`, `difflib`, or `jiwer`.
- Detect:
  - matched words
  - missed words
  - extra words
  - replaced/misread words

#### Word-Level Confidence
- If the chosen transcription library provides word probability/confidence, use that.
- If not available, create an MVP proxy using:
  - ASR segment confidence/log probability if available
  - word alignment correctness
  - word timing quality
  - repeated low-confidence tokens
- Clearly label this as `confidence_proxy`, not true pronunciation confidence.

#### Pronunciation Analysis MVP
- Do not attempt advanced phoneme-level scoring in Stage 1 unless easy.
- MVP pronunciation flags should be based on:
  - low-confidence words
  - words replaced during expected-vs-spoken alignment
  - skipped expected words
  - extra spoken words
- Output a list of likely problem words.

#### Pause Detection
- Use word timestamps.
- Detect pauses when gap between end of one word and start of next word exceeds a threshold.
- Default thresholds:
  - short pause: 0.7–1.2 sec
  - long pause: >1.2 sec
- Output pause events with start time, end time, duration, and nearby words.

#### Repetition / Stutter-like Pattern Detection
- Detect repeated words or short phrases.
- Examples:
  - “I I I think”
  - “the the project”
  - “I want I want to”
- Count repetition events.
- Label as “stutter-like repetitions,” not medical stutter diagnosis.

#### Filler Word Detection
- Detect common filler words:
  - um
  - uh
  - like
  - you know
  - actually
  - basically
  - literally
  - so
  - right
  - okay
- Count filler words.
- Show timestamps when possible.

#### Speaking Speed
- Calculate words per minute.
- Calculate total speaking duration.
- Calculate silent time and active speaking time if possible.
- Suggested feedback:
  - <110 WPM: slow
  - 110–160 WPM: balanced
  - 160–190 WPM: fast
  - >190 WPM: too fast

---

## 4. Stage 2 Computer Vision Scope

Use OpenCV + MediaPipe to analyze video frames.

### Must-Have CV Features

1. Read the uploaded video frame by frame.
2. Sample frames instead of processing every frame for speed.
   - Default: process 2–5 FPS.
3. Detect face landmarks using MediaPipe Face Mesh or Face Landmarker.
4. Estimate:
   - face present percentage
   - face centered percentage
   - looking left/right/up/down/center estimate
   - eye-contact estimate percentage
5. Output timeline events:
   - face not detected
   - looking away
   - looking center

### MVP Eye Contact Logic

Do not claim exact gaze tracking. Use approximate visual engagement scoring.

Possible simple approach:
- Use face bounding box center relative to frame center.
- Use nose tip / face landmarks to estimate head pose direction.
- Use eye/iris landmarks if available to estimate gaze direction.
- Combine these into rough categories:
  - center
  - left
  - right
  - up
  - down
  - unknown

### CV Output Example

```json
{
  "video_duration_sec": 92.4,
  "frames_sampled": 220,
  "face_detected_percent": 94.2,
  "eye_contact_estimate_percent": 67.5,
  "looking_away_percent": 32.5,
  "dominant_direction": "center",
  "events": [
    {
      "start_sec": 12.4,
      "end_sec": 15.8,
      "event": "looking_away_right"
    }
  ]
}
```

---

## 5. Stage 3 Feedback + Dashboard Scope

### Feedback Report

Generate a final report combining Stage 1 and Stage 2 outputs.

Report should include:

1. Overall speaking score out of 100.
2. Transcript accuracy score.
3. Average confidence/proxy confidence.
4. Speaking pace score.
5. Pause score.
6. Filler word score.
7. Repetition score.
8. Eye-contact estimate score.
9. Top 5 improvement suggestions.
10. Problem words table.
11. Timeline of pauses, fillers, repetitions, and looking-away events.

### Suggested Scoring Formula

Use a simple weighted score:

```text
overall_score =
  25% transcript_accuracy
+ 20% confidence_score
+ 15% speaking_pace_score
+ 10% pause_score
+ 10% filler_score
+ 10% repetition_score
+ 10% eye_contact_score
```

Make the scoring logic configurable in `config.yaml` or `src/config.py`.

### Flask Backend

Create Flask API endpoints:

```text
GET  /health
POST /api/analyze-speech
POST /api/analyze-video
POST /api/analyze-full
GET  /api/report/<report_id>
GET  /api/report/<report_id>/download-json
GET  /api/report/<report_id>/download-csv
```

For MVP, local file storage is acceptable. Keep code modular so cloud storage can be added later.

### Streamlit Dashboard

Create a Streamlit UI with:

1. App title and short description.
2. Video upload component.
3. Expected text input box.
4. “Analyze” button.
5. Progress/status messages.
6. Final report display:
   - scores as metric cards
   - transcript comparison table
   - problem words table
   - filler/repetition list
   - pause timeline
   - eye-contact summary
   - downloadable JSON/CSV report

### Deployment

Create practical deployment instructions.

Important deployment rule:
- Do not force heavy Whisper + MediaPipe processing onto Vercel if it becomes impractical due to model size, runtime, or serverless constraints.
- Provide a Vercel-compatible Flask API structure if feasible.
- Provide Streamlit Cloud deployment instructions for the dashboard.
- Provide local deployment instructions that always work.

Expected deployment files:

```text
requirements.txt
runtime.txt or python version note
vercel.json
api/index.py
README.md
.env.example
```

---

## 6. Recommended Tech Stack

Use Python.

Recommended packages:

```text
flask
streamlit
opencv-python
mediapipe
faster-whisper
moviepy
ffmpeg-python
pydub
numpy
pandas
rapidfuzz
jiwer
plotly
python-dotenv
pydantic
pytest
```

Use `ffmpeg` for audio extraction. If `moviepy` is unreliable, fallback to direct `ffmpeg` command.

---

## 7. Suggested Project Structure

```text
ai-speaking-coach-mvp/
│
├── api/
│   └── index.py                  # Vercel-compatible Flask entrypoint
│
├── app/
│   └── streamlit_app.py           # Streamlit dashboard
│
├── src/
│   ├── __init__.py
│   ├── config.py
│   ├── audio_extraction.py
│   ├── transcription.py
│   ├── text_alignment.py
│   ├── speech_metrics.py
│   ├── pause_detection.py
│   ├── filler_detection.py
│   ├── repetition_detection.py
│   ├── cv_eye_contact.py
│   ├── scoring.py
│   ├── report_generator.py
│   └── utils.py
│
├── tests/
│   ├── test_text_alignment.py
│   ├── test_speech_metrics.py
│   └── test_report_generator.py
│
├── data/
│   ├── uploads/.gitkeep
│   ├── audio/.gitkeep
│   └── reports/.gitkeep
│
├── samples/
│   ├── expected_text.txt
│   └── README.md
│
├── requirements.txt
├── .env.example
├── .gitignore
├── vercel.json
└── README.md
```

---

## 8. Final Report JSON Schema

Create a report object similar to this:

```json
{
  "report_id": "uuid",
  "created_at": "ISO_TIMESTAMP",
  "input": {
    "video_filename": "sample.mp4",
    "expected_text": "..."
  },
  "transcription": {
    "spoken_text": "...",
    "language": "en",
    "duration_sec": 120.5,
    "segments": []
  },
  "scores": {
    "overall_score": 82,
    "transcript_accuracy": 88,
    "confidence_score": 79,
    "speaking_pace_score": 85,
    "pause_score": 72,
    "filler_score": 80,
    "repetition_score": 90,
    "eye_contact_score": 65
  },
  "speech_metrics": {
    "words_per_minute": 142,
    "total_words": 284,
    "filler_count": 12,
    "repetition_count": 4,
    "long_pause_count": 5,
    "average_confidence": 0.78
  },
  "word_analysis": [
    {
      "expected": "machine",
      "spoken": "matching",
      "status": "replaced",
      "confidence": 0.52,
      "start_sec": 34.2,
      "end_sec": 34.8
    }
  ],
  "pause_events": [],
  "filler_events": [],
  "repetition_events": [],
  "visual_metrics": {
    "face_detected_percent": 94.2,
    "eye_contact_estimate_percent": 67.5,
    "looking_away_percent": 32.5
  },
  "feedback": [
    "Your speaking pace is balanced.",
    "Reduce long pauses after key points.",
    "Practice the words flagged with low confidence.",
    "Try to maintain more consistent eye contact with the camera."
  ]
}
```

---

## 9. Coding Rules

Follow these rules strictly:

1. Write clean, modular Python code.
2. Do not put all logic inside one file.
3. Add comments only where useful.
4. Add type hints where practical.
5. Add error handling for:
   - missing file
   - unsupported file format
   - empty expected text
   - failed audio extraction
   - failed transcription
   - no face detected
6. Keep temporary files organized.
7. Add `.gitignore` for videos, audio files, model cache, reports, and `.env`.
8. Do not commit large files.
9. Add small unit tests for text alignment and scoring.
10. Keep the UI simple but presentable.

---

## 10. README Requirements

Create a README with:

1. Project overview.
2. Features.
3. Tech stack.
4. Folder structure.
5. Installation steps.
6. How to run Flask API.
7. How to run Streamlit dashboard.
8. How to test with sample video.
9. Explanation of metrics.
10. Deployment notes.
11. Limitations.
12. Future improvements.

---

## 11. Local Run Commands

Expected local commands:

```bash
python -m venv .venv
source .venv/bin/activate   # macOS/Linux
# OR
.venv\Scripts\activate      # Windows

pip install -r requirements.txt

python api/index.py
streamlit run app/streamlit_app.py
```

If Flask runs on a different command, document the exact command.

---

## 12. Stage 1 Acceptance Criteria

Stage 1 is complete only when:

- A user can provide a video/audio file.
- Audio is extracted successfully.
- Whisper/faster-whisper transcription works.
- Expected text vs spoken text comparison works.
- Word-level or proxy confidence is calculated.
- Filler words are detected.
- Repetitions are detected.
- Pauses are detected.
- Speaking speed is calculated.
- A Stage 1 JSON report is generated.
- A simple test script or CLI command works.

---

## 13. Stage 2 Acceptance Criteria

Stage 2 is complete only when:

- Video frames are processed.
- Face landmarks are detected.
- Face presence percentage is calculated.
- Eye/head direction estimate is calculated.
- Looking-away events are generated.
- CV output is saved as JSON.
- The code handles cases where no face is detected.

---

## 14. Stage 3 Acceptance Criteria

Stage 3 is complete only when:

- Flask API has working endpoints.
- Streamlit dashboard can upload video and expected text.
- Full report is displayed in the UI.
- Report can be downloaded as JSON/CSV.
- Deployment files/instructions are present.
- README is complete.
- Known limitations are clearly documented.

---

## 15. Important Limitations to Document

Mention these in the README:

1. Pronunciation scoring is an MVP proxy, not phoneme-level expert evaluation.
2. Stutter detection is limited to repetition and pause patterns, not clinical diagnosis.
3. Eye-contact detection is approximate and depends on camera angle, lighting, and face visibility.
4. Whisper transcription may be inaccurate in noisy audio.
5. Serverless deployment may not be ideal for heavy video/audio processing.
6. Long videos may require background jobs in future versions.

---

## 16. Future Improvements

After MVP, suggest:

1. Use WhisperX or forced alignment for better word timestamps.
2. Add phoneme-level pronunciation scoring.
3. Add downloadable PDF report.
4. Add user accounts and progress history.
5. Add database storage.
6. Add background job queue for long videos.
7. Add webcam live practice mode.
8. Add emotion/confidence detection carefully and ethically.
9. Add multi-language support.
10. Add teacher/interviewer mode.

---

## 17. Final Instruction to Codex

Start by asking the questions from Section 1. After I answer, implement Stage 1 only. Do not begin Stage 2 or Stage 3 until I explicitly approve the next stage using the required continuation phrase.
