from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


def calculate_combined_scores(
    speech_scores: dict[str, Any], vision_metrics: dict[str, Any]
) -> dict[str, Any]:
    eye_contact = float(vision_metrics["estimated_eye_contact_percent"])
    face_presence = float(vision_metrics["face_detected_ratio"]) * 100.0
    head_stability = float(vision_metrics["head_stability_score"])
    visual_score = round((eye_contact * 0.55) + (face_presence * 0.20) + (head_stability * 0.25))
    speech_score = int(speech_scores["interview_communication_score"])
    readiness_score = round((speech_score * 0.75) + (visual_score * 0.25))

    return {
        "fluency_score": int(speech_scores["fluency_score"]),
        "speech_communication_score": speech_score,
        "visual_communication_score": max(0, min(100, visual_score)),
        "interview_communication_score": max(0, min(100, readiness_score)),
        "interview_readiness_score": max(0, min(100, readiness_score)),
        "weights": {"speech": 0.75, "visual": 0.25},
    }


def generate_visual_feedback(vision_metrics: dict[str, Any]) -> list[str]:
    feedback: list[str] = []
    eye_contact = float(vision_metrics["estimated_eye_contact_percent"])
    if eye_contact >= 70:
        feedback.append(
            f"Your eye-contact estimate is {eye_contact:.1f}%, showing consistent camera focus."
        )
    elif eye_contact >= 50:
        feedback.append(
            f"Your eye-contact estimate is {eye_contact:.1f}%. Aim for more consistent camera focus."
        )
    else:
        feedback.append(
            f"Your eye-contact estimate is {eye_contact:.1f}%. Practise looking toward the camera more often."
        )

    event_count = int(vision_metrics["looking_away_event_count"])
    if event_count:
        feedback.append(f"Detected {event_count} sustained looking-away event(s).")
    if float(vision_metrics["face_detected_ratio"]) < 0.8:
        feedback.append("Keep your face clearly visible and centered in the frame.")
    if int(vision_metrics["head_stability_score"]) < 60:
        feedback.append("Try to reduce frequent head movement while keeping natural gestures.")
    return feedback


def combine_reports(
    input_file: str,
    speech_report: dict[str, Any],
    vision_report: dict[str, Any],
) -> dict[str, Any]:
    combined_scores = calculate_combined_scores(
        speech_report["scores"], vision_report["vision_metrics"]
    )
    feedback = list(speech_report["feedback"])
    sentiment = speech_report["speech_metrics"].get("sentiment")
    if sentiment:
        feedback.append(
            f"Transcript sentiment estimate: {sentiment['label']}. This does not affect your score."
        )
    feedback.extend(generate_visual_feedback(vision_report["vision_metrics"]))
    feedback.append(
        f"Your interview readiness estimate is {combined_scores['interview_readiness_score']}/100."
    )

    return {
        "report_id": str(uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "stage": 3,
        "report_schema_version": "1.2",
        "input_file": input_file,
        "expected_text_mode": speech_report["expected_text_mode"],
        "expected_text": speech_report["expected_text"],
        "recognized_text": speech_report["recognized_text"],
        "transcription": speech_report["transcription"],
        "speech_metrics": speech_report["speech_metrics"],
        "vision_metrics": vision_report["vision_metrics"],
        "scores": combined_scores,
        "feedback": feedback,
        "limitations": list(
            dict.fromkeys(speech_report["limitations"] + vision_report["limitations"])
        ),
    }
