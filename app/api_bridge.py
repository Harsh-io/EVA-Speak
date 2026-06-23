"""Machine-readable bridge used by the JavaScript API."""

import argparse
import json
import sys
from pathlib import Path

from app.config import EXPECTED_TEXT
from app.full_pipeline import analyze_full


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("video", type=Path)
    parser.add_argument("--expected-text", default=EXPECTED_TEXT)
    args = parser.parse_args()
    try:
        report, _, _ = analyze_full(args.video, expected_text=args.expected_text)
    except (RuntimeError, ValueError) as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        return 1
    print(json.dumps(report, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
