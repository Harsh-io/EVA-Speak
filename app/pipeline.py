from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Protocol
from uuid import uuid4

from app.config import EXPECTED_TEXT, MAX_DURATION_SECONDS, MIN_DURATION_SECONDS
from app.services.input_files import save_report, staged_upload, validate_input
from app.services.scoring import calculate_scores, generate_feedback
from app.services.sentiment import analyze_sentiment
from app.services.speech_features import (
    analyze_confidence,
    analyze_speech_rate,
    detect_fillers,
    detect_pauses,
    detect_repetitions,
)
from app.services.text_metrics import compare_text, validate_expected_text
from app.services.transcription import FasterWhisperTranscriber


class Transcriber(Protocol):
    def transcribe(self, audio_path: Path) -> dict[str, Any]: ...


def analyze_speech(
    source_path: Path,
    output_path: Path | None = None,
    transcriber: Transcriber | None = None,
    expected_text: str = EXPECTED_TEXT,
    expected_text_mode: str | None = None,
) -> tuple[dict[str, Any], Path]:
    source_path = source_path.expanduser().resolve()
    expected_text, expected_text_mode = validate_expected_text(expected_text, expected_text_mode)
    probed_duration = validate_input(source_path)
    engine = transcriber or FasterWhisperTranscriber()

    with staged_upload(source_path) as staged_path:
        transcription = engine.transcribe(staged_path)

    duration = probed_duration or float(transcription["duration_seconds"])
    if not MIN_DURATION_SECONDS <= duration <= MAX_DURATION_SECONDS:
        raise ValueError("Recording duration must be between 10 seconds and 10 minutes.")

    comparison = compare_text(expected_text, transcription["text"])
    confidence = analyze_confidence(transcription["words"], comparison["alignment"])
    speech_rate = analyze_speech_rate(transcription["text"], duration)
    pauses = detect_pauses(transcription["words"])
    fillers = detect_fillers(transcription["text"])
    repetitions = detect_repetitions(transcription["text"], transcription["words"])
    sentiment = analyze_sentiment(transcription["text"])
    scores = calculate_scores(
        pronunciation_score=comparison["pronunciation_accuracy_score"],
        average_confidence=confidence["average_word_confidence"],
        words_per_minute=speech_rate["words_per_minute"],
        duration_seconds=duration,
        long_pause_count=pauses["long_pause_count"],
        filler_count=fillers["total_filler_words"],
        repetition_count=repetitions["repetition_count"],
    )

    report = {
        "report_id": str(uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "stage": 1,
        "input_file": source_path.name,
        "expected_text_mode": expected_text_mode,
        "expected_text": expected_text,
        "recognized_text": transcription["text"],
        "transcription": {
            "engine": "faster-whisper",
            "model": transcription["model"],
            "language": transcription["language"],
            "language_probability": transcription["language_probability"],
            "segments": transcription["segments"],
        },
        "speech_metrics": {
            "comparison": comparison,
            "confidence": confidence,
            "speech_rate": speech_rate,
            "pauses": pauses,
            "fillers": fillers,
            "repetitions": repetitions,
            "sentiment": sentiment,
        },
        "scores": scores,
        "feedback": generate_feedback(
            comparison, confidence, speech_rate, pauses, fillers, repetitions
        ),
        "limitations": [
            "Pronunciation-style accuracy is based on transcript differences, not phoneme scoring.",
            "Word confidence is a model probability and is not a clinical pronunciation assessment.",
            "Repetition detection identifies repeated text patterns and does not diagnose stuttering.",
            "Transcript sentiment is a language-based estimate and does not reveal a speaker's true feelings.",
        ],
    }
    report_path = save_report(report, output_path)
    return report, report_path
