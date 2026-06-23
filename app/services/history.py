import csv
from pathlib import Path
from typing import Any


HISTORY_FIELDS = [
    "report_id", "created_at", "input_file", "expected_text_mode",
    "pronunciation_accuracy_score", "wer", "cer", "words_per_minute",
    "total_filler_words", "long_pause_count", "repetition_count",
    "sentiment_label", "estimated_eye_contact_percent",
    "looking_away_event_count", "head_stability_score",
    "dominant_facial_expression", "fluency_score", "interview_readiness_score",
]


def _history_row(report: dict[str, Any]) -> dict[str, Any]:
    speech = report.get("speech_metrics", {})
    comparison = speech.get("comparison", {})
    vision = report.get("vision_metrics", {})
    scores = report.get("scores", {})
    return {
        "report_id": report.get("report_id", ""),
        "created_at": report.get("created_at", ""),
        "input_file": report.get("input_file", ""),
        "expected_text_mode": report.get("expected_text_mode", ""),
        "pronunciation_accuracy_score": comparison.get("pronunciation_accuracy_score", ""),
        "wer": comparison.get("wer", ""),
        "cer": comparison.get("cer", ""),
        "words_per_minute": speech.get("speech_rate", {}).get("words_per_minute", ""),
        "total_filler_words": speech.get("fillers", {}).get("total_filler_words", ""),
        "long_pause_count": speech.get("pauses", {}).get("long_pause_count", ""),
        "repetition_count": speech.get("repetitions", {}).get("repetition_count", ""),
        "sentiment_label": speech.get("sentiment", {}).get("label", ""),
        "estimated_eye_contact_percent": vision.get("estimated_eye_contact_percent", ""),
        "looking_away_event_count": vision.get("looking_away_event_count", ""),
        "head_stability_score": vision.get("head_stability_score", ""),
        "dominant_facial_expression": vision.get("facial_expression_estimate", {}).get("dominant", ""),
        "fluency_score": scores.get("fluency_score", ""),
        "interview_readiness_score": scores.get("interview_readiness_score", ""),
    }


def append_history(report: dict[str, Any], history_path: Path) -> Path:
    history_path = Path(history_path)
    history_path.parent.mkdir(parents=True, exist_ok=True)
    existing_rows: list[dict[str, Any]] = []
    if history_path.exists() and history_path.stat().st_size:
        with history_path.open(newline="", encoding="utf-8") as history_file:
            reader = csv.DictReader(history_file)
            if reader.fieldnames != HISTORY_FIELDS:
                existing_rows = list(reader)

    mode = "w" if existing_rows else "a"
    write_header = mode == "w" or not history_path.exists() or history_path.stat().st_size == 0
    with history_path.open(mode, newline="", encoding="utf-8") as history_file:
        writer = csv.DictWriter(history_file, fieldnames=HISTORY_FIELDS, extrasaction="ignore")
        if write_header:
            writer.writeheader()
        if existing_rows:
            writer.writerows(existing_rows)
        writer.writerow(_history_row(report))
    return history_path


def append_history_with_fallback(report: dict[str, Any], history_path: Path) -> tuple[Path, str | None]:
    history_path = Path(history_path)
    try:
        return append_history(report, history_path), None
    except (OSError, PermissionError) as exc:
        report_id = str(report.get("report_id", "unknown"))[:8]
        fallback_path = history_path.with_name(f"{history_path.stem}-{report_id}{history_path.suffix}")
        saved_path = append_history(report, fallback_path)
        warning = f"History file was locked or unavailable; saved this row to {saved_path.name}: {exc}"
        return saved_path, warning
