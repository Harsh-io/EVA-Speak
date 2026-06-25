# AI Speaking Coach MVP — Codex/GPT-5.5 Build Brief

## 1. Project Goal

Build an MVP of an **AI Speaking Coach / Interview Communication Analyzer**.

The user uploads or records a video/audio clip and optionally enters an expected text prompt such as:

> The quick brown fox jumps over the lazy dog.

The system should:

1. Extract audio from uploaded video.
2. Transcribe speech using Whisper or WhisperX.
3. Compare expected text vs recognized text.
4. Calculate pronunciation-style accuracy metrics.
5. Calculate WER, CER, missing words, inserted words, substituted words, and a score out of 100.
6. Use Whisper/WhisperX probabilities when available for confidence analysis.
7. Detect pauses, filler words, repetitions, and speech rate.
8. Estimate fluency/interview readiness score.
9. Use OpenCV/MediaPipe for face direction and eye-contact estimation.
10. Optionally add basic emotion detection if feasible.
11. Generate a feedback report and dashboard.

This project is for a **college/resume MVP**, not a clinical speech therapy tool. Avoid medical or clinical claims.

---

## 2. Inspiration

You may take product inspiration from apps like **ELSA Speak**, but do not copy brand assets, UI, proprietary algorithms, or copyrighted content.

The MVP should feel like:

> Upload/record speech → analyze pronunciation, fluency, confidence, eye contact, fillers, pauses → generate interview-style communication feedback.

Core differentiation:

- Pronunciation accuracy using expected-vs-spoken comparison.
- Interview readiness score.
- Eye-contact estimation using OpenCV/MediaPipe.
- Clear dashboard and actionable feedback.

---

## 3. Important Rule: Ask Questions Before Coding

Before writing any code or creating files, ask all important questions first.

Ask me at least these questions:

1. Should the MVP support only English or multiple languages?
2. Should users upload video only, audio only, or both?
3. What maximum file size and duration should we support for the MVP?
4. Should we use `Whisper`, `faster-whisper`, or `WhisperX`?
5. Should transcription run locally or be API-switchable?
6. Should the expected text be fixed initially as `The quick brown fox jumps over the lazy dog.` or entered by the user?
7. Should the dashboard be React only, or should the API serve additional clients separately?
8. Should reports be downloadable as JSON, CSV, PDF, or all three?
9. Should uploaded files be deleted automatically after analysis?
10. Should emotion detection be included in the MVP or kept as optional enhancement?
11. Should the final deployment prioritize local demo, Vercel, Render, or Railway?
12. Do I want simple working MVP code first or more production-style code?

Do not proceed until I answer.

---

## 4. Required 3-Stage Development Plan

You must build the project in exactly 3 stages.

### Stage 1 — Speaking Analysis MVP

Goal: Build the speech/audio analysis engine first.

Implement:

- Upload video/audio file.
- Extract audio from video using `moviepy` or `ffmpeg-python`.
- Transcribe audio using Whisper/WhisperX/faster-whisper.
- Generate transcript.
- Compare expected text vs recognized transcript.
- Calculate:
  - Word Error Rate (WER)
  - Character Error Rate (CER)
  - Missing words
  - Inserted words
  - Substituted words
  - Pronunciation accuracy score out of 100
- Confidence analysis:
  - Use WhisperX/Whisper word probabilities if available.
  - If exact word-level probabilities are unavailable, calculate a confidence proxy and clearly label it as proxy.
  - Output examples like: `You should improve pronunciation of 'fox'.`
- Speech rate analysis:
  - Words per minute
  - Category: Too slow / Normal / Too fast
- Pause detection:
  - Detect long pauses using word timestamps or audio silence.
  - Count long pauses.
  - Detect filler pauses such as `umm`, `uh`, `ahh`.
- Filler word detection:
  - Detect words such as:
    - umm
    - um
    - uh
    - ahh
    - like
    - you know
    - basically
    - actually
    - literally
    - so
  - Output total filler count and per-word count.
- Repetition detection:
  - Detect repeated words or phrases like `I I I think` or `the the problem`.
- Fluency score:
  - Combine WER/CER, confidence, filler count, pause count, and speech rate.
  - Output: `Fluency Score = 82/100`.
  - Output: `Interview Communication Score = 84/100`.
- Export Stage 1 JSON report.

After Stage 1:

- Stop completely.
- Show file tree.
- Show how to run.
- Show sample JSON output.
- Ask me to test.
- Do not continue until I say: `CONTINUE_STAGE_2`.

---

### Stage 2 — Computer Vision: Eye Contact + Face Direction

Goal: Add visual communication analysis.

Implement:

- Use OpenCV to read frames from uploaded video.
- Use MediaPipe Face Mesh / Face Detection.
- Estimate:
  - Face present or not
  - Face direction: center / left / right / up / down
  - Looking away events
  - Approximate eye-contact percentage
  - Head pose stability
- Optional if feasible:
  - Basic emotion detection using a lightweight model or library.
  - Categories can be simple: neutral, happy, serious, unsure.

Important limitation:

- Do not claim exact gaze tracking.
- Use terms like:
  - `eye-contact estimate`
  - `face direction estimate`
  - `looking-away estimate`

Generate Stage 2 visual metrics JSON.

Example metrics:

```json
{
  "face_detected_ratio": 0.93,
  "estimated_eye_contact_percent": 72.5,
  "looking_away_events": 6,
  "dominant_face_direction": "center",
  "head_stability_score": 81,
  "emotion_summary": {
    "neutral": 68,
    "happy": 20,
    "serious": 12
  }
}
```

After Stage 2:

- Stop completely.
- Show file tree.
- Show how to run.
- Show sample visual JSON output.
- Ask me to test.
- Do not continue until I say: `CONTINUE_STAGE_3`.

---

### Stage 3 — Feedback, Dashboard, API, Deployment

Goal: Combine speech + CV metrics into a polished MVP.

Implement:

- Final feedback generation.
- Interview readiness score.
- React dashboard.
- JavaScript API backend.
- Optional LLM-based feedback generation.
- Downloadable reports.
- README and deployment guide.

Dashboard should show:

- Uploaded video preview if possible.
- Expected text.
- Recognized transcript.
- WER and CER.
- Pronunciation accuracy score.
- Low-confidence words.
- Missing/inserted/substituted words.
- Words per minute.
- Speech rate category.
- Pause count.
- Filler word count.
- Repetition count.
- Estimated eye-contact score.
- Face direction summary.
- Fluency score.
- Interview communication score.
- Final improvement suggestions.

Feedback examples:

- `Your speech speed is normal for interviews.`
- `You used 7 filler words. Try pausing silently instead of saying umm or uh.`
- `Your pronunciation accuracy is 82/100. Focus on: fox, jumps.`
- `Your eye-contact estimate is 71%. Try looking more consistently toward the camera.`
- `Your interview communication score is 84/100.`

After Stage 3:

- Create final README.
- Add setup instructions.
- Add local run instructions.
- Add API documentation.
- Add deployment instructions.
- Add known limitations.
- Add future improvements.

---

## 5. Architecture

```text
Audio/Video Input
      ↓
Audio Extraction
      ↓
Whisper / WhisperX
      ↓
Feature Extraction
      ↓
Speech Metrics
(Pronunciation, WER, CER, Fillers, Pauses, WPM, Confidence)
      ↓
Computer Vision Metrics
(Eye Contact, Face Direction, Emotion Optional)
      ↓
LLM / Rule-Based Feedback Engine
      ↓
Final Report
      ↓
Dashboard
```

---

## 6. Tech Stack

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic

### Speech

- OpenAI Whisper / faster-whisper
- WhisperX for word-level timestamps if feasible
- ffmpeg
- moviepy or ffmpeg-python

### NLP / Text Metrics

- jiwer for WER
- rapidfuzz or difflib for alignment
- NLTK or spaCy for tokenization if useful

### Audio Features

- librosa
- pydub
- numpy

### Computer Vision

- OpenCV
- MediaPipe
- Optional: lightweight emotion detection library/model

### ML / Scoring

- scikit-learn only if needed
- Rule-based scoring is acceptable for MVP

### Frontend

- React

### Deployment

Use a practical MVP deployment plan:

1. Local-first demo should work perfectly.
2. React static assets can be deployed separately if the API is hosted.
3. The JavaScript API can be deployed on Render/Railway/Fly.io.
4. Vercel can be used for lightweight API/frontend parts, but heavy video/audio processing may be better on Render/Railway or local due to serverless limits.

If Vercel is used, create a Vercel-compatible minimal FastAPI deployment only if feasible. Otherwise clearly document why heavy processing is better elsewhere.

---

## 7. Suggested Folder Structure

```text
ai-speaking-coach-mvp/
│
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI entrypoint
│   ├── config.py
│   │
│   ├── services/
│   │   ├── audio_extraction.py
│   │   ├── transcription.py
│   │   ├── pronunciation.py
│   │   ├── confidence.py
│   │   ├── speech_rate.py
│   │   ├── pause_detection.py
│   │   ├── filler_detection.py
│   │   ├── repetition_detection.py
│   │   ├── scoring.py
│   │   ├── feedback.py
│   │   ├── vision.py
│   │   └── emotion.py              # optional
│   │
│   ├── schemas/
│   │   ├── request_schema.py
│   │   └── report_schema.py
│   │
│   └── utils/
│       ├── file_utils.py
│       ├── text_utils.py
│       └── time_utils.py
│
├── frontend/
│   └── src/
│
├── backend/
│   └── server.js
│
├── data/
│   ├── uploads/
│   ├── audio/
│   └── reports/
│
├── tests/
│   ├── test_pronunciation.py
│   ├── test_filler_detection.py
│   ├── test_scoring.py
│   └── test_pause_detection.py
│
├── sample_inputs/
│   └── README.md
│
├── requirements.txt
├── .gitignore
├── README.md
├── DEPLOYMENT.md
└── CODEX_MVP_BUILD_BRIEF.md
```

---

## 8. Stage 1 Metrics Details

### 8.1 Pronunciation Accuracy

Input:

```text
Expected: The quick brown fox jumps over the lazy dog.
Recognized: The quick brown box jump over the lazy dog.
```

Calculate:

- WER
- CER
- Missing words
- Inserted words
- Substituted words
- Accuracy score out of 100

Example output:

```json
{
  "expected_text": "The quick brown fox jumps over the lazy dog.",
  "recognized_text": "The quick brown box jump over the lazy dog.",
  "wer": 0.22,
  "cer": 0.08,
  "missing_words": [],
  "inserted_words": [],
  "substituted_words": [
    {"expected": "fox", "recognized": "box"},
    {"expected": "jumps", "recognized": "jump"}
  ],
  "pronunciation_accuracy_score": 78
}
```

### 8.2 Confidence Analysis

Use Whisper/WhisperX probabilities if available.

Example output:

```json
{
  "average_word_confidence": 0.83,
  "low_confidence_words": [
    {"word": "fox", "confidence": 0.51},
    {"word": "jumps", "confidence": 0.58}
  ],
  "suggestion": "You should improve pronunciation of 'fox' and 'jumps'."
}
```

If probabilities are unavailable, use fallback:

- Alignment mismatch confidence proxy.
- Edit-distance-based proxy.
- Clearly label as `confidence_proxy`.

### 8.3 Speech Rate Analysis

Calculate:

```text
WPM = total spoken words / duration in minutes
```

Categories:

- Too slow: below 110 WPM
- Normal: 110–160 WPM
- Too fast: above 160 WPM

These thresholds can be configurable.

Example:

```json
{
  "words_per_minute": 134,
  "speech_rate_category": "Normal",
  "comment": "Your speech speed is suitable for interviews."
}
```

### 8.4 Pause Detection

Detect:

- Long pauses between words using timestamps.
- Silence-based pauses using librosa/pydub if timestamps are unavailable.
- Filler pauses like `umm`, `uh`, `ahh`.

Example:

```json
{
  "long_pause_count": 3,
  "long_pauses": [
    {"start": 4.2, "end": 5.6, "duration": 1.4},
    {"start": 12.1, "end": 13.5, "duration": 1.4}
  ],
  "filler_pause_count": 2
}
```

### 8.5 Filler Word Detection

Detect:

```python
FILLER_WORDS = [
    "um", "umm", "uh", "ah", "ahh", "like", "you know", "basically",
    "actually", "literally", "so", "I mean", "right"
]
```

Output:

```json
{
  "total_filler_words": 7,
  "filler_breakdown": {
    "umm": 3,
    "uh": 2,
    "like": 1,
    "basically": 1
  },
  "comment": "You used 7 filler words. Try replacing fillers with short silent pauses."
}
```

### 8.6 Repetition Detection

Detect repeated words or short phrases.

Example:

```json
{
  "repetition_count": 2,
  "repetitions": [
    {"phrase": "I I", "timestamp": 3.4},
    {"phrase": "the the", "timestamp": 8.9}
  ]
}
```

### 8.7 Fluency and Interview Readiness Score

Use a simple weighted score for MVP.

Suggested formula:

```text
Pronunciation Score: 35%
Confidence Score: 20%
Speech Rate Score: 15%
Pause Score: 10%
Filler Score: 10%
Repetition Score: 10%
```

Output:

```json
{
  "fluency_score": 82,
  "interview_communication_score": 84,
  "summary": "Good interview communication. Improve filler word usage and eye contact consistency."
}
```

---

## 9. API Endpoints

Use FastAPI.

### Health Check

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

### Analyze Speech Only

```http
POST /analyze/speech
```

Inputs:

- uploaded audio/video file
- expected text

Returns Stage 1 report.

### Analyze Vision Only

```http
POST /analyze/vision
```

Input:

- uploaded video file

Returns Stage 2 visual report.

### Full Analysis

```http
POST /analyze/full
```

Inputs:

- uploaded video/audio file
- expected text

Returns final combined report.

### Get Report

```http
GET /reports/{report_id}
```

Returns saved report.

---

## 10. Final Report Schema

```json
{
  "report_id": "uuid",
  "input_file": "sample.mp4",
  "expected_text": "The quick brown fox jumps over the lazy dog.",
  "recognized_text": "The quick brown box jump over the lazy dog.",
  "speech_metrics": {
    "wer": 0.22,
    "cer": 0.08,
    "pronunciation_accuracy_score": 78,
    "average_word_confidence": 0.83,
    "low_confidence_words": ["fox", "jumps"],
    "words_per_minute": 134,
    "speech_rate_category": "Normal",
    "long_pause_count": 3,
    "filler_word_count": 7,
    "repetition_count": 2
  },
  "vision_metrics": {
    "estimated_eye_contact_percent": 72.5,
    "looking_away_events": 6,
    "dominant_face_direction": "center",
    "head_stability_score": 81,
    "emotion_summary": {
      "neutral": 68,
      "happy": 20,
      "serious": 12
    }
  },
  "scores": {
    "fluency_score": 82,
    "interview_communication_score": 84
  },
  "feedback": [
    "Your speech speed is normal for interviews.",
    "You used 7 filler words. Try replacing fillers with silent pauses.",
    "You should improve pronunciation of 'fox' and 'jumps'.",
    "Your eye-contact estimate is 72.5%. Try looking more consistently toward the camera."
  ]
}
```

---

## 11. Dashboard Requirements

Build with React.

Pages/sections:

1. Upload section
   - Upload video/audio
   - Enter expected text
   - Default sample text button: `The quick brown fox jumps over the lazy dog.`
2. Transcript section
   - Expected text
   - Recognized text
   - Highlight differences
3. Pronunciation section
   - WER
   - CER
   - Missing words
   - Inserted words
   - Substituted words
   - Pronunciation score
4. Confidence section
   - Average confidence
   - Low-confidence words
   - Suggestions
5. Fluency section
   - WPM
   - Speech rate category
   - Pause count
   - Filler count
   - Repetition count
6. Eye-contact section
   - Eye-contact estimate
   - Looking-away events
   - Face direction summary
7. Final score section
   - Fluency score
   - Interview communication score
   - Final feedback
8. Download section
   - Download JSON report
   - Optional CSV/PDF report

---

## 12. Acceptance Criteria

### Stage 1 Acceptance Criteria

Stage 1 is complete only when:

- Audio can be extracted from video.
- Whisper/WhisperX transcription works.
- Expected text vs recognized text comparison works.
- WER and CER are calculated.
- Missing/inserted/substituted words are detected.
- WPM is calculated.
- Fillers are detected.
- Pauses are detected.
- Repetitions are detected.
- Fluency score is generated.
- A JSON report is created.

### Stage 2 Acceptance Criteria

Stage 2 is complete only when:

- Video frames can be processed.
- Face detection works.
- Face direction estimate works.
- Eye-contact estimate works.
- Looking-away events are counted.
- Visual metrics JSON is created.

### Stage 3 Acceptance Criteria

Stage 3 is complete only when:

- FastAPI backend works.
- React dashboard works.
- Speech and vision reports are combined.
- Final feedback is generated.
- Reports are downloadable.
- README is complete.
- Deployment guide is complete.

---

## 13. Safety and Honesty Requirements

Do not make false claims.

Avoid saying:

- `This perfectly detects pronunciation.`
- `This clinically detects stuttering.`
- `This accurately tracks gaze.`
- `This replaces professional speech coaching.`

Use safer terms:

- `pronunciation-style accuracy`
- `confidence proxy`
- `stutter-like repetition detection`
- `eye-contact estimate`
- `face direction estimate`
- `interview communication feedback`

---

## 14. Coding Rules

- Keep code modular.
- Write readable Python.
- Add comments where needed.
- Add proper error handling.
- Do not hardcode absolute paths.
- Do not commit uploaded files.
- Do not commit extracted audio files.
- Do not commit large model files.
- Add `.gitignore`.
- Add sample dummy files only if they are tiny.
- Use environment variables where needed.
- Keep functions testable.
- Add simple unit tests for text metrics and filler detection.

---

## 15. Recommended Dependencies

Start with:

```text
fastapi
uvicorn
react
express
openai-whisper
whisperx
faster-whisper
moviepy
ffmpeg-python
opencv-python
mediapipe
librosa
pydub
numpy
pandas
scikit-learn
jiwer
rapidfuzz
nltk
spacy
python-multipart
pydantic
matplotlib
```

If some dependencies conflict, choose the simplest stable setup and explain the decision.

---

## 16. Stage Gate Commands

You must stop after each stage.

At the end of Stage 1 say:

```text
Stage 1 is complete. Test it locally. I will not continue until you say CONTINUE_STAGE_2.
```

At the end of Stage 2 say:

```text
Stage 2 is complete. Test it locally. I will not continue until you say CONTINUE_STAGE_3.
```

At the end of Stage 3 say:

```text
Stage 3 is complete. The MVP is ready for final testing and deployment.
```

---

## 17. First Task for Codex

Before coding, ask me all clarification questions listed above. Then wait.

After I answer, start Stage 1 only.
