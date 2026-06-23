import json
import logging
import os
import shutil
import subprocess
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from app.config import (
    MAX_DURATION_SECONDS,
    MAX_FILE_SIZE_BYTES,
    MIN_DURATION_SECONDS,
    REPORT_DIR,
    SUPPORTED_AUDIO_SUFFIXES,
    SUPPORTED_VIDEO_SUFFIXES,
    UPLOAD_DIR,
)

LOGGER = logging.getLogger(__name__)


def probe_duration(audio_path: Path) -> float | None:
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(audio_path),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        return float(result.stdout.strip())
    except (FileNotFoundError, subprocess.CalledProcessError, ValueError):
        return None


def validate_input(audio_path: Path) -> float | None:
    if not audio_path.is_file():
        raise ValueError(f"Input file does not exist: {audio_path}")
    if audio_path.suffix.lower() not in SUPPORTED_AUDIO_SUFFIXES:
        raise ValueError("Stage 1 accepts MP3 files only.")
    if audio_path.stat().st_size > MAX_FILE_SIZE_BYTES:
        raise ValueError("Input exceeds the 100 MB size limit.")

    duration = probe_duration(audio_path)
    if duration is not None and not MIN_DURATION_SECONDS <= duration <= MAX_DURATION_SECONDS:
        raise ValueError("Recording duration must be between 10 seconds and 10 minutes.")
    return duration


def validate_video_input(video_path: Path) -> float | None:
    video_path = video_path.expanduser().resolve()
    detected_extension = video_path.suffix.lower()
    LOGGER.info("Stage 2 received: %s", video_path)
    LOGGER.info("Detected extension: %s", detected_extension or "<none>")
    if not video_path.is_file():
        raise ValueError(f"Input file does not exist: {video_path}")
    if detected_extension not in SUPPORTED_VIDEO_SUFFIXES:
        raise ValueError(
            f"Stage 2 accepts MP4 files only; saved file has extension "
            f"'{detected_extension or '<none>'}'."
        )
    if video_path.stat().st_size > MAX_FILE_SIZE_BYTES:
        raise ValueError("Input exceeds the 100 MB size limit.")

    duration = probe_duration(video_path)
    if duration is not None and not MIN_DURATION_SECONDS <= duration <= MAX_DURATION_SECONDS:
        raise ValueError("Video duration must be between 10 seconds and 10 minutes.")
    return duration


@contextmanager
def staged_upload(source_path: Path) -> Iterator[Path]:
    """Copy input to an isolated upload directory and always remove that copy."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    temporary_directory = Path(tempfile.mkdtemp(prefix="eva-speak-", dir=UPLOAD_DIR))
    staged_path = temporary_directory / source_path.name
    try:
        shutil.copy2(source_path, staged_path)
        yield staged_path
    finally:
        shutil.rmtree(temporary_directory, ignore_errors=True)


@contextmanager
def uploaded_file_path(data: bytes, filename: str) -> Iterator[Path]:
    """Persist browser-uploaded bytes only for the duration of analysis."""
    if len(data) > MAX_FILE_SIZE_BYTES:
        raise ValueError("Input exceeds the 100 MB size limit.")
    safe_name = Path(filename).name
    if not safe_name:
        raise ValueError("Uploaded file name is invalid.")
    if Path(safe_name).suffix.lower() not in SUPPORTED_VIDEO_SUFFIXES:
        raise ValueError("Only MP4 video uploads are supported.")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    temporary_directory = Path(tempfile.mkdtemp(prefix="eva-upload-", dir=UPLOAD_DIR))
    upload_path = temporary_directory / safe_name
    try:
        upload_path.write_bytes(data)
        LOGGER.info("Uploaded file: %s", filename)
        LOGGER.info("Saved file: %s", upload_path.name)
        LOGGER.info("Saved absolute path: %s", upload_path.resolve())
        yield upload_path
    finally:
        shutil.rmtree(temporary_directory, ignore_errors=True)


def save_report(report: dict[str, Any], output_path: Path | None = None) -> Path:
    destination = output_path or REPORT_DIR / f"{report['report_id']}.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=destination.parent,
            prefix=f".{destination.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            json.dump(report, temporary_file, indent=2, ensure_ascii=True)
            temporary_file.flush()
            os.fsync(temporary_file.fileno())
            temporary_path = Path(temporary_file.name)
        os.replace(temporary_path, destination)
    finally:
        if temporary_path is not None and temporary_path.exists():
            temporary_path.unlink(missing_ok=True)
    return destination
