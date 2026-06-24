from app.services.scoring import calculate_scores


def test_scores_are_bounded() -> None:
    result = calculate_scores(
        pronunciation_score=78,
        average_confidence=0.83,
        words_per_minute=134,
        duration_seconds=120,
        long_pause_count=3,
        filler_count=7,
        repetition_count=2,
    )

    assert 0 <= result["fluency_score"] <= 100
    assert 0 <= result["interview_communication_score"] <= 100
    assert result["score_scope"] == "speech-only Stage 1 estimate"
