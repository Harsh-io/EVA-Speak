import re
from difflib import SequenceMatcher
from typing import Any

from jiwer import cer as jiwer_cer
from jiwer import wer as jiwer_wer

from app.config import EXPECTED_TEXT, MAX_EXPECTED_TEXT_CHARACTERS

TOKEN_PATTERN = re.compile(r"[a-z0-9]+(?:'[a-z0-9]+)?")


def tokenize(text: str) -> list[str]:
    """Return lowercase English word tokens with punctuation removed."""
    return TOKEN_PATTERN.findall(text.lower())


def normalize_text(text: str) -> str:
    return " ".join(tokenize(text))


def validate_expected_text(text: str, mode: str | None = None) -> tuple[str, str]:
    cleaned = " ".join(text.split())
    if not cleaned:
        raise ValueError("Expected text must not be empty.")
    if len(cleaned) > MAX_EXPECTED_TEXT_CHARACTERS:
        raise ValueError(
            f"Expected text must not exceed {MAX_EXPECTED_TEXT_CHARACTERS} characters."
        )
    resolved_mode = mode or ("default_sample" if cleaned == EXPECTED_TEXT else "user_entered")
    if resolved_mode not in {"default_sample", "user_entered"}:
        raise ValueError("Expected text mode must be default_sample or user_entered.")
    return cleaned, resolved_mode


def align_words(expected_words: list[str], recognized_words: list[str]) -> list[dict[str, Any]]:
    """Align word sequences while preserving stable matching blocks."""
    operations: list[dict[str, Any]] = []
    matcher = SequenceMatcher(None, expected_words, recognized_words, autojunk=False)
    for tag, expected_start, expected_end, recognized_start, recognized_end in matcher.get_opcodes():
        if tag == "equal":
            for offset in range(expected_end - expected_start):
                expected_index = expected_start + offset
                recognized_index = recognized_start + offset
                operations.append(
                    {
                        "operation": "equal",
                        "expected": expected_words[expected_index],
                        "recognized": recognized_words[recognized_index],
                        "expected_index": expected_index,
                        "recognized_index": recognized_index,
                    }
                )
            continue

        expected_count = expected_end - expected_start
        recognized_count = recognized_end - recognized_start
        substitutions = min(expected_count, recognized_count) if tag == "replace" else 0
        for offset in range(substitutions):
            operations.append(
                {
                    "operation": "substitute",
                    "expected": expected_words[expected_start + offset],
                    "recognized": recognized_words[recognized_start + offset],
                    "expected_index": expected_start + offset,
                    "recognized_index": recognized_start + offset,
                }
            )
        for expected_index in range(expected_start + substitutions, expected_end):
            operations.append(
                {
                    "operation": "delete",
                    "expected": expected_words[expected_index],
                    "recognized": None,
                    "expected_index": expected_index,
                    "recognized_index": None,
                }
            )
        for recognized_index in range(recognized_start + substitutions, recognized_end):
            operations.append(
                {
                    "operation": "insert",
                    "expected": None,
                    "recognized": recognized_words[recognized_index],
                    "expected_index": None,
                    "recognized_index": recognized_index,
                }
            )
    return operations


def compare_text(expected_text: str, recognized_text: str) -> dict[str, Any]:
    expected_normalized = normalize_text(expected_text)
    recognized_normalized = normalize_text(recognized_text)
    expected_words = expected_normalized.split()
    recognized_words = recognized_normalized.split()

    if not expected_words:
        raise ValueError("Expected text must contain at least one word.")

    operations = align_words(expected_words, recognized_words)
    word_error_rate = float(jiwer_wer(expected_normalized, recognized_normalized))
    character_error_rate = float(jiwer_cer(expected_normalized, recognized_normalized))
    combined_error = (0.7 * word_error_rate) + (0.3 * character_error_rate)

    return {
        "expected_text": expected_text,
        "recognized_text": recognized_text,
        "normalized_expected_text": expected_normalized,
        "normalized_recognized_text": recognized_normalized,
        "wer": round(word_error_rate, 4),
        "cer": round(character_error_rate, 4),
        "missing_words": [item["expected"] for item in operations if item["operation"] == "delete"],
        "inserted_words": [item["recognized"] for item in operations if item["operation"] == "insert"],
        "substituted_words": [
            {"expected": item["expected"], "recognized": item["recognized"]}
            for item in operations
            if item["operation"] == "substitute"
        ],
        "pronunciation_accuracy_score": round(max(0.0, min(100.0, (1.0 - combined_error) * 100.0))),
        "alignment": operations,
    }
