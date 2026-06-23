import logging
import tempfile
from time import perf_counter
from pathlib import Path
from typing import Any

from app.config import EXPECTED_TEXT, HISTORY_PATH, REPORT_DIR, UPLOAD_DIR
from app.pipeline import Transcriber, analyze_speech
from app.services.audio_extraction import extract_mp3
from app.services.final_report import combine_reports
from app.services.history import append_history_with_fallback
from app.services.input_files import save_report, validate_video_input
from app.vision_pipeline import VisionAnalyzer, analyze_vision

LOGGER = logging.getLogger(__name__)


def analyze_full(
    source_path: Path,
    output_path: Path | None = None,
    history_path: Path = HISTORY_PATH,
    transcriber: Transcriber | None = None,
    vision_analyzer: VisionAnalyzer | None = None,
    expected_text: str = EXPECTED_TEXT,
    expected_text_mode: str | None = None,
) -> tuple[dict[str, Any], Path, Path]:
    source_path = source_path.expanduser().resolve()
    started_at = perf_counter()
    LOGGER.info("Starting combined analysis for %s", source_path.name)
    validate_video_input(source_path)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="eva-full-", dir=UPLOAD_DIR) as temporary_directory:
        work_dir = Path(temporary_directory)
        audio_path = extract_mp3(source_path, work_dir / "extracted_audio.mp3")
        speech_report, _ = analyze_speech(
            audio_path,
            output_path=work_dir / "speech_report.json",
            transcriber=transcriber,
            expected_text=expected_text,
            expected_text_mode=expected_text_mode,
        )
        vision_report, _ = analyze_vision(
            source_path,
            output_path=work_dir / "vision_report.json",
            analyzer=vision_analyzer,
        )
        report = combine_reports(source_path.name, speech_report, vision_report)

    report["processing_metadata"] = {
        "pipeline": "local_combined_analysis",
        "runtime_seconds": round(perf_counter() - started_at, 3),
        "temporary_media_deleted": True,
    }

    saved_history_path, history_warning = append_history_with_fallback(report, history_path)
    if history_warning:
        report.setdefault("warnings", []).append(history_warning)
        LOGGER.warning(history_warning)
    destination = output_path or REPORT_DIR / f"{report['report_id']}.json"
    report_path = save_report(report, destination)
    LOGGER.info("Completed combined analysis report %s", report["report_id"])
    return report, report_path, saved_history_path
