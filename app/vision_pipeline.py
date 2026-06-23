from datetime import datetime, timezone
import logging
from pathlib import Path
from typing import Any, Protocol
from uuid import uuid4

from app.config import MAX_DURATION_SECONDS, MIN_DURATION_SECONDS
from app.services.input_files import save_report, staged_upload, validate_video_input
from app.services.vision import MediaPipeVisionAnalyzer

LOGGER = logging.getLogger(__name__)


class VisionAnalyzer(Protocol):
    def analyze(self, video_path: Path) -> dict[str, Any]: ...


def analyze_vision(
    source_path: Path,
    output_path: Path | None = None,
    analyzer: VisionAnalyzer | None = None,
) -> tuple[dict[str, Any], Path]:
    source_path = source_path.expanduser().resolve()
    LOGGER.info("Stage 2 received: %s", source_path)
    LOGGER.info("Detected extension: %s", source_path.suffix.lower() or "<none>")
    probed_duration = validate_video_input(source_path)
    engine = analyzer or MediaPipeVisionAnalyzer()

    with staged_upload(source_path) as staged_path:
        vision_metrics = engine.analyze(staged_path)

    duration = probed_duration or float(vision_metrics["duration_seconds"])
    if not MIN_DURATION_SECONDS <= duration <= MAX_DURATION_SECONDS:
        raise ValueError("Video duration must be between 10 seconds and 10 minutes.")

    report = {
        "report_id": str(uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "stage": 2,
        "input_file": source_path.name,
        "vision_metrics": vision_metrics,
        "limitations": [
            "Eye contact is estimated from face direction and iris position; it is not exact gaze tracking.",
            "Face direction and head stability are approximate camera-based estimates.",
            "Lighting, glasses, occlusion, camera position, and video quality can affect results.",
            "A dedicated emotion-classification model is intentionally excluded.",
            "Facial expression categories are landmark-based estimates and do not reveal true emotion.",
        ],
    }
    report_path = save_report(report, output_path)
    return report, report_path
