import pytest

from app.services.text_metrics import compare_text, tokenize, validate_expected_text


def test_tokenize_normalizes_case_and_punctuation() -> None:
    assert tokenize("The FOX's quick!") == ["the", "fox's", "quick"]


def test_compare_text_reports_substitutions() -> None:
    result = compare_text(
        "The quick brown fox jumps over the lazy dog.",
        "The quick brown box jump over the lazy dog.",
    )

    assert result["wer"] == pytest.approx(2 / 9, abs=0.0001)
    assert result["missing_words"] == []
    assert result["inserted_words"] == []
    assert result["substituted_words"] == [
        {"expected": "fox", "recognized": "box"},
        {"expected": "jumps", "recognized": "jump"},
    ]
    assert 0 <= result["pronunciation_accuracy_score"] <= 100


def test_compare_text_reports_insertions_and_deletions() -> None:
    result = compare_text("one two three", "zero one three four")

    assert result["missing_words"] == ["two"]
    assert result["inserted_words"] == ["zero", "four"]


def test_expected_text_supports_default_and_user_entered_modes() -> None:
    default_text, default_mode = validate_expected_text(
        "The quick brown fox jumps over the lazy dog."
    )
    custom_text, custom_mode = validate_expected_text("  My custom   interview response.  ")

    assert default_mode == "default_sample"
    assert default_text.startswith("The quick")
    assert custom_mode == "user_entered"
    assert custom_text == "My custom interview response."


def test_expected_text_rejects_empty_custom_input() -> None:
    with pytest.raises(ValueError, match="must not be empty"):
        validate_expected_text("   ", "user_entered")
