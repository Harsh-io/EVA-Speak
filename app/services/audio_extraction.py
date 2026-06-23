import subprocess
from pathlib import Path


def extract_mp3(video_path: Path, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        result = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(video_path),
                "-vn",
                "-ac",
                "1",
                "-ar",
                "16000",
                "-codec:a",
                "libmp3lame",
                "-b:a",
                "64k",
                str(output_path),
            ],
            check=False,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("FFmpeg is not installed or is not available on PATH.") from exc

    if result.returncode != 0 or not output_path.is_file():
        details = result.stderr.strip().splitlines()
        message = details[-1] if details else "unknown FFmpeg error"
        raise RuntimeError(f"Could not extract audio from the video: {message}")
    return output_path
