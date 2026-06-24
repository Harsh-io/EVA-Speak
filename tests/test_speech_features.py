from app.services.speech_features import (
    analyze_speech_rate,
    detect_fillers,
    detect_pauses,
    detect_repetitions,
)


def test_detect_fillers_including_phrases() -> None:
    result = detect_fillers("Um, I mean, basically you know, so I agree.")

    assert result["total_filler_words"] == 5
    assert result["filler_breakdown"] == {
        "basically": 1,
        "i mean": 1,
        "so": 1,
        "um": 1,
        "you know": 1,
    }


def test_detect_pauses_uses_word_timestamp_gaps() -> None:
    words = [
        {"word": "hello", "start": 0.0, "end": 0.4},
        {"word": "um", "start": 1.7, "end": 1.9},
        {"word": "world", "start": 2.1, "end": 2.5},
    ]
    result = detect_pauses(words)

    assert result["long_pause_count"] == 1
    assert result["long_pauses"][0]["duration"] == 1.3
    assert result["filler_pause_count"] == 1


def test_detect_word_and_phrase_repetitions() -> None:
    result = detect_repetitions("I I I think you know you know the answer")

    assert result["repetition_count"] == 2
    assert result["repetitions"][0]["phrase"] == "i"
    assert result["repetitions"][0]["consecutive_uses"] == 3
    assert result["repetitions"][1]["phrase"] == "you know"


def test_speech_rate_categories() -> None:
    slow = analyze_speech_rate("word " * 100, 60)
    normal = analyze_speech_rate("word " * 130, 60)
    fast = analyze_speech_rate("word " * 170, 60)

    assert slow["speech_rate_category"] == "Too slow"
    assert normal["speech_rate_category"] == "Normal"
    assert fast["speech_rate_category"] == "Too fast"
