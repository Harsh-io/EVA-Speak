import argparse
import json
import sys
from pathlib import Path

from app.config import EXPECTED_TEXT
from app.pipeline import analyze_speech


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Analyze an English MP3 with EVA Speak Stage 1.")
    parser.add_argument(
        "audio", type=Path, help="MP3 file between 10 seconds and 10 minutes, up to 100 MB"
    )
    parser.add_argument("--output", type=Path, help="Optional JSON report path")
    parser.add_argument(
        "--expected-text", default=EXPECTED_TEXT, help="Reference text; defaults to the sample prompt"
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        report, report_path = analyze_speech(
            args.audio,
            args.output,
            expected_text=args.expected_text,
            expected_text_mode=(
                "default_sample" if args.expected_text == EXPECTED_TEXT else "user_entered"
            ),
        )
    except (RuntimeError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    summary = {
        "report_path": str(report_path),
        "recognized_text": report["recognized_text"],
        "pronunciation_accuracy_score": report["speech_metrics"]["comparison"][
            "pronunciation_accuracy_score"
        ],
        "fluency_score": report["scores"]["fluency_score"],
        "interview_communication_score": report["scores"]["interview_communication_score"],
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
