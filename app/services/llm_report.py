"""LLM-powered personalized coaching report — aggregates all session metrics into a rich report."""

import json
import os
from typing import Any


def generate_coaching_report(
    sessions: list[dict[str, Any]],
    user_name: str | None = None,
) -> dict[str, Any]:
    """
    Generate a personalized coaching report from a list of practice sessions.

    Args:
        sessions: List of session documents (each with 'mode', 'score', 'scores', 'report', etc.)
        user_name: Optional user name for personalized language.

    Returns:
        A dict with keys: summary, strengths, growth_areas, recommendations, trends, raw_stats
    """
    if not sessions:
        return _empty_report(user_name)

    raw_stats = _compute_raw_stats(sessions)

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return _rule_based_report(raw_stats, user_name)

    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage
    except ImportError:
        return _rule_based_report(raw_stats, user_name)

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.4, api_key=api_key)

    stats_text = _format_stats_for_llm(raw_stats, sessions)
    name_clause = f"The user's name is {user_name}." if user_name else ""

    system_prompt = f"""You are EVA, an expert AI communication coach. {name_clause}
Analyze the user's practice history and generate a comprehensive, personalized coaching report.

Return ONLY valid JSON with these fields:
{{
  "summary": "Encouraging 2-3 sentence overall summary of their communication progress",
  "strengths": ["3-5 specific strengths with evidence from their metrics"],
  "growth_areas": ["3-5 specific areas they should work on, with actionable context"],
  "recommendations": [
    {{
      "title": "Short recommendation title",
      "description": "Specific, actionable recommendation",
      "priority": "high|medium|low"
    }}
  ],
  "trends": {{
    "overall": "improving|stable|declining",
    "insights": "1-2 sentences about their trajectory"
  }},
  "next_session_focus": "One specific thing they should focus on in their next practice session"
}}

Be specific, data-driven, and encouraging. Reference actual numbers and patterns."""

    try:
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Coaching report request:\n\n{stats_text}"),
        ])

        text = response.content.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        result = json.loads(text)
        result["raw_stats"] = raw_stats
        return result

    except Exception:
        return _rule_based_report(raw_stats, user_name)


def _compute_raw_stats(sessions: list[dict]) -> dict:
    """Compute aggregate statistics from session list."""
    scores = [s["score"] for s in sessions if s.get("score") is not None]
    modes = [s.get("mode", "unknown") for s in sessions]
    mode_counts: dict[str, int] = {}
    mode_scores: dict[str, list] = {}

    for s in sessions:
        m = s.get("mode", "unknown")
        mode_counts[m] = mode_counts.get(m, 0) + 1
        if s.get("score") is not None:
            mode_scores.setdefault(m, []).append(s["score"])

    # Calculate trends: compare first half vs second half scores
    trend = "stable"
    if len(scores) >= 4:
        mid = len(scores) // 2
        first_avg = sum(scores[:mid]) / mid
        second_avg = sum(scores[mid:]) / (len(scores) - mid)
        diff = second_avg - first_avg
        if diff > 5:
            trend = "improving"
        elif diff < -5:
            trend = "declining"

    # Most common mode
    most_practiced = max(mode_counts, key=mode_counts.get) if mode_counts else None

    return {
        "total_sessions": len(sessions),
        "average_score": round(sum(scores) / len(scores), 1) if scores else None,
        "best_score": round(max(scores), 1) if scores else None,
        "worst_score": round(min(scores), 1) if scores else None,
        "mode_distribution": {
            m: {"count": mode_counts[m], "avg_score": round(sum(mode_scores.get(m, [])) / len(mode_scores.get(m, [])), 1) if mode_scores.get(m) else None}
            for m in mode_counts
        },
        "score_trend": trend,
        "most_practiced_mode": most_practiced,
        "recent_scores": scores[-5:] if len(scores) >= 2 else scores,
    }


def _format_stats_for_llm(stats: dict, sessions: list[dict]) -> str:
    """Format stats for the LLM prompt."""
    lines = [
        f"Total practice sessions: {stats['total_sessions']}",
        f"Average score: {stats['average_score']}/100" if stats['average_score'] else "Average score: N/A",
        f"Best score: {stats['best_score']}/100" if stats['best_score'] else "Best score: N/A",
        f"Score trend: {stats['score_trend']}",
        f"Recent scores: {stats['recent_scores']}",
        "",
        "Mode breakdown:",
    ]
    for mode, mdata in stats.get("mode_distribution", {}).items():
        lines.append(f"  - {mode}: {mdata['count']} sessions, avg score {mdata['avg_score'] or 'N/A'}")

    # Aggregate speech metrics from recent sessions
    speech_data = []
    for s in sessions[-5:]:
        report = s.get("report", {})
        if isinstance(report, dict):
            sm = report.get("speech_metrics", {})
            if sm:
                wpm = sm.get("speech_rate", {}).get("words_per_minute")
                fillers = sm.get("fillers", {}).get("total_filler_words")
                if wpm:
                    speech_data.append(f"WPM={wpm}")
                if fillers is not None:
                    speech_data.append(f"fillers={fillers}")

    if speech_data:
        lines.append(f"\nRecent speech samples: {', '.join(speech_data)}")

    return "\n".join(lines)


def _rule_based_report(stats: dict, user_name: str | None = None) -> dict:
    """Generate a rule-based coaching report without LLM."""
    name = user_name or "the user"
    avg = stats.get("average_score")
    best = stats.get("best_score")
    trend = stats.get("score_trend", "stable")
    total = stats.get("total_sessions", 0)
    most_practiced = stats.get("most_practiced_mode")

    # Summary
    if trend == "improving":
        summary = f"{name} is showing consistent improvement across practice sessions. Keep up the great momentum!"
    elif trend == "declining":
        summary = f"{name} has been practicing regularly. A few targeted improvements can turn the trend around."
    else:
        summary = f"{name} has been maintaining a consistent practice routine with {total} sessions completed."

    if avg:
        summary += f" Current average score: {avg}/100."

    # Strengths
    strengths = ["Regular practice habit — consistency is key to improvement"]
    if best and best >= 75:
        strengths.append(f"Demonstrated strong performance with a best score of {best}/100")
    if total >= 5:
        strengths.append("Strong commitment with 5+ completed sessions")
    if most_practiced:
        strengths.append(f"Dedicated focus on {most_practiced} practice mode")

    # Growth areas
    growth = []
    if avg and avg < 60:
        growth.append("Focus on foundational speech delivery — pacing, clarity, and structure")
    if avg and avg < 75:
        growth.append("Work on reducing filler words and increasing speech confidence")
    growth.append("Try practicing across all modes (Interview, Impromptu, Vocal) for balanced growth")
    if trend == "declining":
        growth.append("Review past sessions to identify specific areas causing score drops")

    # Recommendations
    recs = [
        {
            "title": "Practice Daily",
            "description": "Even 10 minutes of impromptu speaking daily builds fluency significantly.",
            "priority": "high",
        },
        {
            "title": "Record & Review",
            "description": "Watch your recorded sessions to spot patterns in body language and speech habits.",
            "priority": "medium",
        },
        {
            "title": "Target Weak Modes",
            "description": f"If you haven't tried all practice modes, diversify your routine.",
            "priority": "medium",
        },
    ]

    return {
        "summary": summary,
        "strengths": strengths,
        "growth_areas": growth,
        "recommendations": recs,
        "trends": {
            "overall": trend,
            "insights": f"Your scores are {trend} over the last {total} sessions.",
        },
        "next_session_focus": "Focus on maintaining eye contact and reducing filler words.",
        "raw_stats": stats,
    }


def _empty_report(user_name: str | None = None) -> dict:
    name = user_name or "You"
    return {
        "summary": f"{name} haven't completed any practice sessions yet. Start with an Impromptu Speaking session!",
        "strengths": [],
        "growth_areas": ["Complete your first practice session to unlock personalized insights."],
        "recommendations": [
            {"title": "Get Started", "description": "Try Impromptu Speaking — just 60 seconds to begin!", "priority": "high"}
        ],
        "trends": {"overall": "stable", "insights": "No data yet."},
        "next_session_focus": "Complete your first session!",
        "raw_stats": {"total_sessions": 0},
    }


if __name__ == '__main__':
    import sys
    data = json.load(sys.stdin)
    result = generate_coaching_report(data.get('sessions', []), data.get('user_name'))
    print(json.dumps(result, ensure_ascii=True))
