from pathlib import Path
from typing import Any

from app.config import MODEL_COMPUTE_TYPE, MODEL_DEVICE, MODEL_SIZE


class FasterWhisperTranscriber:
    def __init__(
        self,
        model_size: str = MODEL_SIZE,
        device: str = MODEL_DEVICE,
        compute_type: str = MODEL_COMPUTE_TYPE,
    ) -> None:
        try:
            from faster_whisper import WhisperModel
        except ImportError as exc:
            raise RuntimeError(
                "faster-whisper is not installed. Run: python -m pip install -r requirements.txt"
            ) from exc

        self.model_size = model_size
        try:
            self._model = WhisperModel(model_size, device=device, compute_type=compute_type)
        except Exception as exc:
            raise RuntimeError(
                f"Could not load the faster-whisper model '{model_size}'. "
                "The first run requires internet access to download it; later runs are local."
            ) from exc

    def transcribe(self, audio_path: Path) -> dict[str, Any]:
        segments_iterator, info = self._model.transcribe(
            str(audio_path),
            language="en",
            task="transcribe",
            beam_size=5,
            vad_filter=True,
            word_timestamps=True,
            condition_on_previous_text=False,
        )
        source_segments = list(segments_iterator)
        segments = []
        words = []
        for segment in source_segments:
            segment_words = []
            for word in segment.words or []:
                item = {
                    "word": word.word.strip(),
                    "start": round(float(word.start), 3),
                    "end": round(float(word.end), 3),
                    "probability": round(float(word.probability), 4),
                }
                words.append(item)
                segment_words.append(item)
            segments.append(
                {
                    "start": round(float(segment.start), 3),
                    "end": round(float(segment.end), 3),
                    "text": segment.text.strip(),
                    "words": segment_words,
                }
            )

        transcript = " ".join(segment["text"] for segment in segments).strip()
        return {
            "text": transcript,
            "segments": segments,
            "words": words,
            "duration_seconds": float(info.duration),
            "language": info.language,
            "language_probability": round(float(info.language_probability), 4),
            "model": self.model_size,
        }
