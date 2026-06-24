import csv

from app.services import history as history_service
from app.services.history import append_history, append_history_with_fallback


def test_append_history_writes_header_once(tmp_path) -> None:
    report = {
        "report_id": "report-1",
        "created_at": "2026-06-22T00:00:00+00:00",
        "input_file": "sample.mp4",
        "expected_text_mode": "user_entered",
        "speech_metrics": {
            "comparison": {"pronunciation_accuracy_score": 80, "wer": 0.2, "cer": 0.1},
            "speech_rate": {"words_per_minute": 130},
            "fillers": {"total_filler_words": 2},
            "pauses": {"long_pause_count": 1},
            "repetitions": {"repetition_count": 0},
        },
        "vision_metrics": {
            "estimated_eye_contact_percent": 75,
            "looking_away_event_count": 2,
            "head_stability_score": 85,
        },
        "scores": {"fluency_score": 82, "interview_readiness_score": 81},
    }
    history_path = tmp_path / "history.csv"

    append_history(report, history_path)
    report["report_id"] = "report-2"
    append_history(report, history_path)

    with history_path.open(newline="", encoding="utf-8") as history_file:
        rows = list(csv.DictReader(history_file))
    assert [row["report_id"] for row in rows] == ["report-1", "report-2"]


def test_append_history_migrates_an_old_header(tmp_path) -> None:
    history_path = tmp_path / "history.csv"
    history_path.write_text("report_id,input_file\nold-report,old.mp4\n", encoding="utf-8")
    report = {
        "report_id": "new-report",
        "created_at": "2026-06-22T00:00:00+00:00",
        "input_file": "new.mp4",
        "expected_text_mode": "default_sample",
        "speech_metrics": {
            "comparison": {"pronunciation_accuracy_score": 90, "wer": 0.1, "cer": 0.05},
            "speech_rate": {"words_per_minute": 130},
            "fillers": {"total_filler_words": 0},
            "pauses": {"long_pause_count": 0},
            "repetitions": {"repetition_count": 0},
            "sentiment": {"label": "positive"},
        },
        "vision_metrics": {
            "estimated_eye_contact_percent": 80,
            "looking_away_event_count": 1,
            "head_stability_score": 90,
            "facial_expression_estimate": {"dominant": "neutral"},
        },
        "scores": {"fluency_score": 90, "interview_readiness_score": 88},
    }

    append_history(report, history_path)

    with history_path.open(newline="", encoding="utf-8") as history_file:
        rows = list(csv.DictReader(history_file))
    assert rows[0]["report_id"] == "old-report"
    assert rows[1]["sentiment_label"] == "positive"
    assert rows[1]["dominant_facial_expression"] == "neutral"


def test_history_falls_back_when_main_csv_is_locked(tmp_path, monkeypatch) -> None:
    report = {
        "report_id": "12345678-report",
        "created_at": "2026-06-22T00:00:00+00:00",
        "input_file": "sample.mp4",
        "expected_text_mode": "default_sample",
        "speech_metrics": {
            "comparison": {"pronunciation_accuracy_score": 90, "wer": 0.1, "cer": 0.05},
            "speech_rate": {"words_per_minute": 130},
            "fillers": {"total_filler_words": 0},
            "pauses": {"long_pause_count": 0},
            "repetitions": {"repetition_count": 0},
            "sentiment": {"label": "neutral"},
        },
        "vision_metrics": {
            "estimated_eye_contact_percent": 80,
            "looking_away_event_count": 1,
            "head_stability_score": 90,
            "facial_expression_estimate": {"dominant": "neutral"},
        },
        "scores": {"fluency_score": 90, "interview_readiness_score": 88},
    }
    main_path = tmp_path / "analysis_history.csv"
    original_append = history_service.append_history

    def locked_once(current_report, current_path):
        if current_path == main_path:
            raise PermissionError("locked")
        return original_append(current_report, current_path)

    monkeypatch.setattr(history_service, "append_history", locked_once)
    saved_path, warning = append_history_with_fallback(report, main_path)

    assert saved_path.name == "analysis_history-12345678.csv"
    assert saved_path.exists()
    assert warning is not None and "locked" in warning
