import argparse
import json
import sys
from pathlib import Path

from app.vision_pipeline import analyze_vision


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Analyze MP4 visual communication with EVA Speak.")
    parser.add_argument(
        "video", type=Path, help="MP4 file between 10 seconds and 10 minutes, up to 100 MB"
    )
    parser.add_argument("--output", type=Path, help="Optional visual JSON report path")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        report, report_path = analyze_vision(args.video, args.output)
    except (RuntimeError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    metrics = report["vision_metrics"]
    summary = {
        "report_path": str(report_path),
        "face_detected_ratio": metrics["face_detected_ratio"],
        "estimated_eye_contact_percent": metrics["estimated_eye_contact_percent"],
        "looking_away_event_count": metrics["looking_away_event_count"],
        "dominant_face_direction": metrics["dominant_face_direction"],
        "head_stability_score": metrics["head_stability_score"],
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
