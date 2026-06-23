import argparse
import json
import sys
from pathlib import Path

from app.config import EXPECTED_TEXT
from app.full_pipeline import analyze_full


def main() -> int:
    parser = argparse.ArgumentParser(description="Run complete EVA Speak analysis on an MP4.")
    parser.add_argument(
        "video", type=Path, help="MP4 file between 10 seconds and 10 minutes, up to 100 MB"
    )
    parser.add_argument("--output", type=Path, help="Optional combined JSON report path")
    parser.add_argument(
        "--expected-text", default=EXPECTED_TEXT, help="Reference text; defaults to the sample prompt"
    )
    args = parser.parse_args()
    try:
        report, report_path, history_path = analyze_full(
            args.video,
            args.output,
            expected_text=args.expected_text,
            expected_text_mode=(
                "default_sample" if args.expected_text == EXPECTED_TEXT else "user_entered"
            ),
        )
    except (RuntimeError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print(
        json.dumps(
            {
                "report_path": str(report_path),
                "history_path": str(history_path),
                "recognized_text": report["recognized_text"],
                "fluency_score": report["scores"]["fluency_score"],
                "interview_readiness_score": report["scores"]["interview_readiness_score"],
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
