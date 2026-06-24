from app.services.sentiment import sentiment_label


def test_sentiment_labels() -> None:
    assert sentiment_label(0.5) == "positive"
    assert sentiment_label(-0.5) == "negative"
    assert sentiment_label(0.0) == "neutral"
