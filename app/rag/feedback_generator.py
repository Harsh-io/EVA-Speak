"""LLM-powered feedback generator for personalized coaching reports."""

import os
import json
from typing import Any


def generate_coaching_feedback(
    report: dict[str, Any],
    question_text: str | None = None,
    mode: str = "general",
) -> dict[str, Any]:
    """Generate personalized coaching feedback using LLM."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        # Return rule-based feedback if no API key
        return _rule_based_feedback(report)

    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage
    except ImportError:
        return _rule_based_feedback(report)

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.5, api_key=api_key)

    metrics_summary = _extract_metrics_summary(report)

    system_prompt = """You are EVA, an expert communication coach. Analyze the speech metrics and provide actionable, encouraging coaching feedback.

Return JSON with these fields:
{
  "feedback": ["list of specific, actionable feedback points"],
  "sample_answer": "A model answer to the question (if applicable, else null)",
  "improvement_tips": ["list of specific improvement tips"],
  "overall_assessment": "A brief 1-2 sentence overall assessment",
  "strengths": ["list of identified strengths"],
  "areas_to_improve": ["list of specific areas needing improvement"]
}

Be specific, reference actual numbers from the metrics, and be encouraging."""

    context_parts = [f"Practice Mode: {mode}"]
    if question_text:
        context_parts.append(f"Interview Question: {question_text}")
    context_parts.append(f"Speech & Visual Metrics:\n{metrics_summary}")

    try:
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content="\n\n".join(context_parts)),
        ])

        response_text = response.content.strip()
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()

        result = json.loads(response_text)
        return result
    except Exception:
        return _rule_based_feedback(report)


def _extract_metrics_summary(report: dict[str, Any]) -> str:
    """Extract key metrics into a readable summary for the LLM."""
    parts = []

    scores = report.get("scores", {})
    if scores:
        parts.append("Scores:")
        for key, val in scores.items():
            if not isinstance(val, dict):
                parts.append(f"  - {key.replace('_', ' ').title()}: {val}")

    speech = report.get("speech_metrics", {})
    if speech:
        rate = speech.get("speech_rate", {})
        if rate:
            parts.append(f"  - Words per minute: {rate.get('words_per_minute', 'N/A')}")
            parts.append(f"  - Speech rate category: {rate.get('speech_rate_category', 'N/A')}")

        fillers = speech.get("fillers", {})
        if fillers:
            parts.append(f"  - Total filler words: {fillers.get('total_filler_words', 0)}")

        pauses = speech.get("pauses", {})
        if pauses:
            parts.append(f"  - Long pauses: {pauses.get('long_pause_count', 0)}")

        comparison = speech.get("comparison", {})
        if comparison:
            parts.append(f"  - Pronunciation accuracy: {comparison.get('pronunciation_accuracy_score', 'N/A')}")
            parts.append(f"  - WER: {comparison.get('wer', 'N/A')}")

    vision = report.get("vision_metrics", {})
    if vision:
        parts.append(f"  - Eye contact: {vision.get('estimated_eye_contact_percent', 'N/A')}%")
        parts.append(f"  - Head stability: {vision.get('head_stability_score', 'N/A')}/100")
        parts.append(f"  - Dominant direction: {vision.get('dominant_face_direction', 'N/A')}")

    recognized = report.get("recognized_text", "")
    if recognized:
        parts.append(f"  - Recognized text length: {len(recognized.split())} words")

    return "\n".join(parts) if parts else "No metrics available."


def _rule_based_feedback(report: dict[str, Any]) -> dict[str, Any]:
    """Generate feedback using rule-based logic (no LLM needed)."""
    feedback = list(report.get("feedback", []))
    tips = []
    strengths = []
    areas = []

    scores = report.get("scores", {})
    speech = report.get("speech_metrics", {})
    vision = report.get("vision_metrics", {})

    # Analyze speech rate
    wpm = speech.get("speech_rate", {}).get("words_per_minute", 0)
    if wpm:
        if wpm < 110:
            tips.append("Try to increase your speaking pace slightly. Aim for 120-150 WPM.")
            areas.append("Speaking speed is below optimal range")
        elif wpm > 160:
            tips.append("Slow down a bit. A pace of 120-150 WPM is ideal for clarity.")
            areas.append("Speaking speed is above optimal range")
        else:
            strengths.append(f"Good speaking pace at {wpm} WPM")

    # Analyze fillers
    filler_count = speech.get("fillers", {}).get("total_filler_words", 0)
    if filler_count > 5:
        tips.append(f"You used {filler_count} filler words. Try pausing silently instead of saying 'um' or 'uh'.")
        areas.append("Excessive filler words")
    elif filler_count <= 2:
        strengths.append("Minimal use of filler words")

    # Analyze eye contact
    eye_contact = vision.get("estimated_eye_contact_percent", 0)
    if eye_contact:
        if eye_contact >= 70:
            strengths.append(f"Strong eye contact at {eye_contact:.0f}%")
        elif eye_contact >= 50:
            tips.append("Try to maintain more consistent eye contact with the camera.")
        else:
            tips.append("Focus on looking directly at the camera to improve eye contact.")
            areas.append("Low eye contact percentage")

    return {
        "feedback": feedback,
        "sample_answer": None,
        "improvement_tips": tips,
        "overall_assessment": f"Score: {scores.get('interview_readiness_score', 'N/A')}/100",
        "strengths": strengths,
        "areas_to_improve": areas,
    }
