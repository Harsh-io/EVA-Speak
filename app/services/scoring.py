from typing import Any


def _speech_rate_score(words_per_minute: float) -> float:
    if 110.0 <= words_per_minute <= 160.0:
        return 100.0
    if words_per_minute < 110.0:
        return max(0.0, 100.0 - ((110.0 - words_per_minute) * 1.5))
    return max(0.0, 100.0 - ((words_per_minute - 160.0) * 1.5))


def calculate_scores(
    pronunciation_score: float,
    average_confidence: float,
    words_per_minute: float,
    duration_seconds: float,
    long_pause_count: int,
    filler_count: int,
    repetition_count: int,
) -> dict[str, Any]:
    duration_minutes = max(duration_seconds / 60.0, 1 / 60.0)
    component_scores = {
        "pronunciation": max(0.0, min(100.0, pronunciation_score)),
        "confidence": max(0.0, min(100.0, average_confidence * 100.0)),
        "speech_rate": _speech_rate_score(words_per_minute),
        "pauses": max(0.0, 100.0 - ((long_pause_count / duration_minutes) * 10.0)),
        "fillers": max(0.0, 100.0 - ((filler_count / duration_minutes) * 8.0)),
        "repetitions": max(0.0, 100.0 - ((repetition_count / duration_minutes) * 10.0)),
    }
    weights = {
        "pronunciation": 0.35,
        "confidence": 0.20,
        "speech_rate": 0.15,
        "pauses": 0.10,
        "fillers": 0.10,
        "repetitions": 0.10,
    }
    fluency_score = round(sum(component_scores[name] * weight for name, weight in weights.items()))
    interview_score = round(
        (fluency_score * 0.75)
        + (component_scores["pronunciation"] * 0.15)
        + (component_scores["speech_rate"] * 0.10)
    )
    return {
        "fluency_score": max(0, min(100, fluency_score)),
        "interview_communication_score": max(0, min(100, interview_score)),
        "component_scores": {name: round(value, 2) for name, value in component_scores.items()},
        "score_scope": "speech-only Stage 1 estimate",
    }


def generate_feedback(
    comparison: dict[str, Any],
    confidence: dict[str, Any],
    speech_rate: dict[str, Any],
    pauses: dict[str, Any],
    fillers: dict[str, Any],
    repetitions: dict[str, Any],
) -> list[str]:
    feedback = [speech_rate["comment"]]
    if fillers["total_filler_words"]:
        feedback.append(fillers["comment"])
    if pauses["long_pause_count"]:
        feedback.append(
            f"You had {pauses['long_pause_count']} pause(s) of at least "
            f"{pauses['long_pause_threshold_seconds']:.1f} seconds."
        )
    if repetitions["repetition_count"]:
        feedback.append(
            f"Detected {repetitions['repetition_count']} repeated word or short-phrase event(s)."
        )
    if confidence["low_confidence_words"]:
        feedback.append(confidence["suggestion"])
    mismatch_words = [item["expected"] for item in comparison["substituted_words"]]
    mismatch_words.extend(comparison["missing_words"])
    if mismatch_words:
        feedback.append(f"Practise these expected words: {', '.join(dict.fromkeys(mismatch_words))}.")
    feedback.append(
        f"Pronunciation-style accuracy is {comparison['pronunciation_accuracy_score']}/100; "
        "this is an automated practice estimate, not a clinical assessment."
    )
    return feedback
