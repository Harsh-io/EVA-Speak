from typing import Any


def sentiment_label(compound_score: float) -> str:
    if compound_score >= 0.05:
        return "positive"
    if compound_score <= -0.05:
        return "negative"
    return "neutral"


def analyze_sentiment(text: str) -> dict[str, Any]:
    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    except ImportError as exc:
        raise RuntimeError(
            "Sentiment dependency is missing. Run: python -m pip install -r requirements.txt"
        ) from exc

    scores = SentimentIntensityAnalyzer().polarity_scores(text)
    label = sentiment_label(float(scores["compound"]))
    return {
        "label": label,
        "compound_score": round(float(scores["compound"]), 4),
        "positive": round(float(scores["pos"]), 4),
        "neutral": round(float(scores["neu"]), 4),
        "negative": round(float(scores["neg"]), 4),
        "method": "VADER transcript sentiment estimate",
        "affects_interview_score": False,
    }
