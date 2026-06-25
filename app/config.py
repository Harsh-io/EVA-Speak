import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

EXPECTED_TEXT = os.getenv(
    "EVA_DEFAULT_EXPECTED_TEXT", "The quick brown fox jumps over the lazy dog."
).strip()
MAX_EXPECTED_TEXT_CHARACTERS = int(os.getenv("EVA_MAX_EXPECTED_TEXT_CHARACTERS", "5000"))
MODEL_SIZE = os.getenv("EVA_MODEL_SIZE", "tiny.en")
MODEL_DEVICE = "cpu"
MODEL_COMPUTE_TYPE = "int8"
WHISPER_BEAM_SIZE = int(os.getenv("EVA_WHISPER_BEAM_SIZE", "5"))
WHISPER_VAD_FILTER = os.getenv("EVA_WHISPER_VAD_FILTER", "true").strip().lower() not in {
    "0",
    "false",
    "no",
}

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024
MIN_DURATION_SECONDS = 10.0
MAX_DURATION_SECONDS = 600.0
SUPPORTED_AUDIO_SUFFIXES = {".mp3"}
SUPPORTED_VIDEO_SUFFIXES = {".mp4"}

LOW_CONFIDENCE_THRESHOLD = 0.65
LONG_PAUSE_SECONDS = 1.0
SLOW_WPM_THRESHOLD = 110.0
FAST_WPM_THRESHOLD = 160.0

VISION_SAMPLE_FPS = float(os.getenv("EVA_VISION_SAMPLE_FPS", "2.0"))
VISION_MAX_WIDTH = int(os.getenv("EVA_VISION_MAX_WIDTH", "960"))
VISION_REFINE_LANDMARKS = os.getenv("EVA_VISION_REFINE_LANDMARKS", "true").strip().lower() not in {
    "0",
    "false",
    "no",
}
FACE_YAW_THRESHOLD_DEGREES = 15.0
FACE_PITCH_THRESHOLD_DEGREES = 12.0
LOOKING_AWAY_MIN_CONSECUTIVE_FRAMES = 2

UPLOAD_DIR = PROJECT_ROOT / "Data" / "uploads"
REPORT_DIR = PROJECT_ROOT / "Data" / "reports"
HISTORY_PATH = PROJECT_ROOT / "Data" / "history" / "analysis_history.csv"
