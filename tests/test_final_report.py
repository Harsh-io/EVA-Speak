from app.services.final_report import calculate_combined_scores, combine_reports


def test_combined_score_uses_documented_weights() -> None:
    result = calculate_combined_scores(
        {"fluency_score": 80, "interview_communication_score": 80},
        {
            "estimated_eye_contact_percent": 80,
            "face_detected_ratio": 1.0,
            "head_stability_score": 80,
        },
    )

    assert result["visual_communication_score"] == 84
    assert result["interview_readiness_score"] == 81
    assert result["weights"] == {"speech": 0.75, "visual": 0.25}


def test_combine_reports_preserves_both_metric_groups() -> None:
    speech_report = {
        "expected_text_mode": "fixed",
        "expected_text": "expected",
        "recognized_text": "recognized",
        "transcription": {"engine": "test"},
        "speech_metrics": {"comparison": {}},
        "scores": {"fluency_score": 80, "interview_communication_score": 80},
        "feedback": ["speech feedback"],
        "limitations": ["speech limitation"],
    }
    vision_report = {
        "vision_metrics": {
            "estimated_eye_contact_percent": 80,
            "face_detected_ratio": 1.0,
            "head_stability_score": 80,
            "looking_away_event_count": 1,
        },
        "limitations": ["vision limitation"],
    }

    report = combine_reports("sample.mp4", speech_report, vision_report)

    assert report["stage"] == 3
    assert report["input_file"] == "sample.mp4"
    assert report["speech_metrics"] == speech_report["speech_metrics"]
    assert report["vision_metrics"] == vision_report["vision_metrics"]
    assert "speech feedback" in report["feedback"]
