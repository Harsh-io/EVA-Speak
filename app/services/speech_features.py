from collections import Counter
from typing import Any

from app.config import (
    FAST_WPM_THRESHOLD,
    LONG_PAUSE_SECONDS,
    LOW_CONFIDENCE_THRESHOLD,
    SLOW_WPM_THRESHOLD,
)
from app.services.text_metrics import tokenize

FILLER_PHRASES = (
    ("you", "know"),
    ("i", "mean"),
    ("basically",),
    ("actually",),
    ("literally",),
    ("umm",),
    ("um",),
    ("uh",),
    ("ahh",),
    ("ah",),
    ("like",),
    ("so",),
    ("right",),
)
FILLER_PAUSE_WORDS = {"umm", "um", "uh", "ahh", "ah"}


def analyze_confidence(
    words: list[dict[str, Any]], alignment: list[dict[str, Any]]
) -> dict[str, Any]:
    probabilities = [word.get("probability") for word in words]
    has_probabilities = bool(words) and all(value is not None for value in probabilities)

    if has_probabilities:
        entries = [
            {
                "word": word["word"],
                "confidence": round(float(word["probability"]), 4),
                "start": word.get("start"),
                "end": word.get("end"),
            }
            for word in words
        ]
        method = "faster_whisper_word_probability"
    else:
        confidence_by_index = {
            item["recognized_index"]: (0.9 if item["operation"] == "equal" else 0.5)
            for item in alignment
            if item["recognized_index"] is not None
        }
        entries = [
            {
                "word": word["word"],
                "confidence": confidence_by_index.get(index, 0.35),
                "start": word.get("start"),
                "end": word.get("end"),
            }
            for index, word in enumerate(words)
        ]
        method = "alignment_confidence_proxy"

    average = sum(item["confidence"] for item in entries) / len(entries) if entries else 0.0
    low_confidence = [
        item for item in entries if item["confidence"] < LOW_CONFIDENCE_THRESHOLD
    ]
    focus_words = list(dict.fromkeys(item["word"] for item in low_confidence))
    suggestion = (
        f"Review the pronunciation of: {', '.join(focus_words)}."
        if focus_words
        else "No low-confidence words were detected."
    )

    return {
        "method": method,
        "average_word_confidence": round(average, 4),
        "low_confidence_threshold": LOW_CONFIDENCE_THRESHOLD,
        "low_confidence_words": low_confidence,
        "suggestion": suggestion,
    }


def analyze_speech_rate(recognized_text: str, duration_seconds: float) -> dict[str, Any]:
    if duration_seconds <= 0:
        raise ValueError("Audio duration must be greater than zero.")
    word_count = len(tokenize(recognized_text))
    words_per_minute = word_count / (duration_seconds / 60.0)

    if words_per_minute < SLOW_WPM_THRESHOLD:
        category = "Too slow"
        comment = "Your speech rate is below the typical interview practice range."
    elif words_per_minute > FAST_WPM_THRESHOLD:
        category = "Too fast"
        comment = "Your speech rate is above the typical interview practice range."
    else:
        category = "Normal"
        comment = "Your speech rate is within the configured interview practice range."

    return {
        "word_count": word_count,
        "duration_seconds": round(duration_seconds, 3),
        "words_per_minute": round(words_per_minute, 2),
        "speech_rate_category": category,
        "comment": comment,
    }


def detect_pauses(words: list[dict[str, Any]]) -> dict[str, Any]:
    timed_words = [word for word in words if word.get("start") is not None and word.get("end") is not None]
    long_pauses = []
    for previous, current in zip(timed_words, timed_words[1:]):
        gap = float(current["start"]) - float(previous["end"])
        if gap >= LONG_PAUSE_SECONDS:
            long_pauses.append(
                {
                    "start": round(float(previous["end"]), 3),
                    "end": round(float(current["start"]), 3),
                    "duration": round(gap, 3),
                }
            )

    filler_pause_count = sum(
        1 for word in words if tokenize(word["word"]) and tokenize(word["word"])[0] in FILLER_PAUSE_WORDS
    )
    return {
        "timestamp_source_available": len(timed_words) == len(words) and bool(words),
        "long_pause_threshold_seconds": LONG_PAUSE_SECONDS,
        "long_pause_count": len(long_pauses),
        "long_pauses": long_pauses,
        "filler_pause_count": filler_pause_count,
    }


def detect_fillers(text: str) -> dict[str, Any]:
    tokens = tokenize(text)
    counts: Counter[str] = Counter()
    index = 0
    while index < len(tokens):
        match = next(
            (phrase for phrase in FILLER_PHRASES if tuple(tokens[index : index + len(phrase)]) == phrase),
            None,
        )
        if match is None:
            index += 1
            continue
        counts[" ".join(match)] += 1
        index += len(match)

    total = sum(counts.values())
    return {
        "total_filler_words": total,
        "filler_breakdown": dict(sorted(counts.items())),
        "comment": (
            f"You used {total} filler expression(s). Try replacing fillers with short silent pauses."
            if total
            else "No configured filler expressions were detected."
        ),
    }


def detect_repetitions(text: str, words: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    tokens = tokenize(text)
    repetitions = []
    index = 0
    while index < len(tokens) - 1:
        matched_length = 0
        for phrase_length in range(min(3, (len(tokens) - index) // 2), 0, -1):
            first = tokens[index : index + phrase_length]
            second = tokens[index + phrase_length : index + (2 * phrase_length)]
            if first == second:
                matched_length = phrase_length
                break

        if not matched_length:
            index += 1
            continue

        phrase = tokens[index : index + matched_length]
        repeats = 2
        while (
            tokens[index + (repeats * matched_length) : index + ((repeats + 1) * matched_length)]
            == phrase
        ):
            repeats += 1
        timestamp = None
        if words and index < len(words):
            timestamp = words[index].get("start")
        repetitions.append(
            {
                "phrase": " ".join(phrase),
                "consecutive_uses": repeats,
                "timestamp": timestamp,
            }
        )
        index += repeats * matched_length

    return {
        "repetition_count": len(repetitions),
        "repetitions": repetitions,
        "label": "stutter-like repetition detection",
    }
