from __future__ import annotations

from collections import Counter
from math import hypot
import os
from pathlib import Path
from statistics import mean
from typing import Any

from app.config import (
    FACE_PITCH_THRESHOLD_DEGREES,
    FACE_YAW_THRESHOLD_DEGREES,
    LOOKING_AWAY_MIN_CONSECUTIVE_FRAMES,
    PROJECT_ROOT,
    VISION_SAMPLE_FPS,
)


def classify_face_direction(yaw: float, pitch: float) -> str:
    if yaw < -FACE_YAW_THRESHOLD_DEGREES:
        return "left"
    if yaw > FACE_YAW_THRESHOLD_DEGREES:
        return "right"
    if pitch < -FACE_PITCH_THRESHOLD_DEGREES:
        return "down"
    if pitch > FACE_PITCH_THRESHOLD_DEGREES:
        return "up"
    return "center"


def iris_is_centered(
    iris_x: float,
    iris_y: float,
    corner_x_values: tuple[float, float],
    eyelid_y_values: tuple[float, float],
) -> bool:
    horizontal_min, horizontal_max = sorted(corner_x_values)
    vertical_min, vertical_max = sorted(eyelid_y_values)
    eye_width = horizontal_max - horizontal_min
    eye_height = vertical_max - vertical_min
    if eye_width <= 0 or eye_height <= 0:
        return False
    horizontal_ratio = (iris_x - horizontal_min) / eye_width
    vertical_ratio = (iris_y - vertical_min) / eye_height
    return 0.30 <= horizontal_ratio <= 0.70 and 0.15 <= vertical_ratio <= 0.85


def estimate_face_pose_proxy(
    nose_x: float,
    nose_y: float,
    left_cheek_x: float,
    right_cheek_x: float,
    forehead_y: float,
    chin_y: float,
) -> tuple[float, float] | None:
    """Map normalized landmark offsets to degree-like yaw and pitch estimates."""
    face_width = abs(right_cheek_x - left_cheek_x)
    face_height = abs(chin_y - forehead_y)
    if face_width <= 0 or face_height <= 0:
        return None
    face_center_x = (left_cheek_x + right_cheek_x) / 2.0
    nose_vertical_ratio = (nose_y - min(forehead_y, chin_y)) / face_height
    yaw = ((nose_x - face_center_x) / face_width) * 120.0
    pitch = (0.60 - nose_vertical_ratio) * 100.0
    return max(-45.0, min(45.0, yaw)), max(-45.0, min(45.0, pitch))


def classify_facial_expression(smile_curve: float, mouth_open_ratio: float) -> str:
    if smile_curve >= 0.012:
        return "happy"
    if smile_curve <= 0.002 and mouth_open_ratio <= 0.018:
        return "serious"
    return "neutral"


def estimate_facial_expression(landmarks: Any) -> str | None:
    face_height = abs(landmarks[152].y - landmarks[10].y)
    if face_height <= 0:
        return None
    corner_y = (landmarks[61].y + landmarks[291].y) / 2.0
    lip_center_y = (landmarks[13].y + landmarks[14].y) / 2.0
    smile_curve = (lip_center_y - corner_y) / face_height
    mouth_open_ratio = abs(landmarks[14].y - landmarks[13].y) / face_height
    return classify_facial_expression(smile_curve, mouth_open_ratio)


def build_looking_away_events(
    samples: list[dict[str, Any]],
    sample_interval_seconds: float,
    minimum_consecutive_frames: int = LOOKING_AWAY_MIN_CONSECUTIVE_FRAMES,
) -> list[dict[str, float]]:
    events: list[dict[str, float]] = []
    run_start: int | None = None

    for index, sample in enumerate(samples):
        if not sample["estimated_eye_contact"] and run_start is None:
            run_start = index
        if sample["estimated_eye_contact"] and run_start is not None:
            run_length = index - run_start
            if run_length >= minimum_consecutive_frames:
                start = float(samples[run_start]["timestamp"])
                end = float(sample["timestamp"])
                events.append(
                    {"start": round(start, 3), "end": round(end, 3), "duration": round(end - start, 3)}
                )
            run_start = None

    if run_start is not None:
        run_length = len(samples) - run_start
        if run_length >= minimum_consecutive_frames:
            start = float(samples[run_start]["timestamp"])
            end = float(samples[-1]["timestamp"]) + sample_interval_seconds
            events.append(
                {"start": round(start, 3), "end": round(end, 3), "duration": round(end - start, 3)}
            )
    return events


def calculate_head_stability(poses: list[tuple[float, float]]) -> int:
    if len(poses) < 2:
        return 100 if poses else 0
    movements = [
        hypot(current[0] - previous[0], current[1] - previous[1])
        for previous, current in zip(poses, poses[1:])
    ]
    return round(max(0.0, min(100.0, 100.0 - (mean(movements) * 4.0))))


class MediaPipeVisionAnalyzer:
    def __init__(self, sample_fps: float = VISION_SAMPLE_FPS) -> None:
        if sample_fps <= 0:
            raise ValueError("Vision sample FPS must be greater than zero.")
        matplotlib_cache = PROJECT_ROOT / "Data" / ".matplotlib"
        matplotlib_cache.mkdir(parents=True, exist_ok=True)
        os.environ.setdefault("MPLCONFIGDIR", str(matplotlib_cache))
        try:
            import cv2
            import mediapipe as mp
            import numpy as np
        except ImportError as exc:
            raise RuntimeError(
                "Stage 2 dependencies are missing. Run: python -m pip install -r requirements.txt"
            ) from exc

        try:
            face_mesh_module = mp.solutions.face_mesh
        except AttributeError as exc:
            raise RuntimeError(
                "This MediaPipe build does not provide Face Mesh. Install the version in requirements.txt."
            ) from exc

        self.cv2 = cv2
        self.np = np
        self.face_mesh_module = face_mesh_module
        self.sample_fps = sample_fps

    def _estimate_head_pose(
        self, landmarks: Any, width: int, height: int
    ) -> tuple[float, float] | None:
        del width, height
        return estimate_face_pose_proxy(
            nose_x=landmarks[1].x,
            nose_y=landmarks[1].y,
            left_cheek_x=landmarks[234].x,
            right_cheek_x=landmarks[454].x,
            forehead_y=landmarks[10].y,
            chin_y=landmarks[152].y,
        )

    def _irises_are_centered(self, landmarks: Any) -> bool | None:
        if len(landmarks) < 478:
            return None
        left_centered = iris_is_centered(
            landmarks[468].x,
            landmarks[468].y,
            (landmarks[33].x, landmarks[133].x),
            (landmarks[159].y, landmarks[145].y),
        )
        right_centered = iris_is_centered(
            landmarks[473].x,
            landmarks[473].y,
            (landmarks[362].x, landmarks[263].x),
            (landmarks[386].y, landmarks[374].y),
        )
        return left_centered and right_centered

    def analyze(self, video_path: Path) -> dict[str, Any]:
        capture = self.cv2.VideoCapture(str(video_path))
        if not capture.isOpened():
            raise ValueError("OpenCV could not open the video file.")

        source_fps = float(capture.get(self.cv2.CAP_PROP_FPS))
        frame_count = int(capture.get(self.cv2.CAP_PROP_FRAME_COUNT))
        if source_fps <= 0 or frame_count <= 0:
            capture.release()
            raise ValueError("Video FPS or frame count is invalid.")
        duration_seconds = frame_count / source_fps
        sampling_step = max(1, round(source_fps / self.sample_fps))
        effective_sample_fps = source_fps / sampling_step
        sample_interval = 1.0 / effective_sample_fps

        samples: list[dict[str, Any]] = []
        detected_poses: list[tuple[float, float]] = []
        direction_counts: Counter[str] = Counter()
        expression_counts: Counter[str] = Counter()
        iris_samples = 0
        frame_index = 0

        try:
            with self.face_mesh_module.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            ) as face_mesh:
                while True:
                    success, frame = capture.read()
                    if not success:
                        break
                    if frame_index % sampling_step:
                        frame_index += 1
                        continue

                    timestamp = frame_index / source_fps
                    rgb_frame = self.cv2.cvtColor(frame, self.cv2.COLOR_BGR2RGB)
                    result = face_mesh.process(rgb_frame)
                    frame_sample: dict[str, Any] = {
                        "timestamp": round(timestamp, 3),
                        "face_detected": False,
                        "face_direction": "not_detected",
                        "estimated_eye_contact": False,
                    }
                    if result.multi_face_landmarks:
                        landmarks = result.multi_face_landmarks[0].landmark
                        pose = self._estimate_head_pose(landmarks, frame.shape[1], frame.shape[0])
                        if pose is not None:
                            yaw, pitch = pose
                            direction = classify_face_direction(yaw, pitch)
                            detected_poses.append((yaw, pitch))
                            direction_counts[direction] += 1
                            irises_centered = self._irises_are_centered(landmarks)
                            if irises_centered is not None:
                                iris_samples += 1
                            expression = estimate_facial_expression(landmarks)
                            if expression is not None:
                                expression_counts[expression] += 1
                            frame_sample.update(
                                {
                                    "face_detected": True,
                                    "face_direction": direction,
                                    "yaw": round(yaw, 2),
                                    "pitch": round(pitch, 2),
                                    "estimated_eye_contact": direction == "center"
                                    and (irises_centered is not False),
                                }
                            )
                    samples.append(frame_sample)
                    frame_index += 1
        finally:
            capture.release()

        processed_frames = len(samples)
        if not processed_frames:
            raise ValueError("No video frames were available for visual analysis.")
        face_frames = sum(1 for sample in samples if sample["face_detected"])
        eye_contact_frames = sum(1 for sample in samples if sample["estimated_eye_contact"])
        looking_away_events = build_looking_away_events(samples, sample_interval)
        dominant_direction = direction_counts.most_common(1)[0][0] if direction_counts else "not_detected"
        direction_distribution = {
            direction: round((count / face_frames) * 100.0, 2)
            for direction, count in sorted(direction_counts.items())
        }
        expression_frames = sum(expression_counts.values())
        expression_distribution = {
            expression: round((count / expression_frames) * 100.0, 2)
            for expression, count in sorted(expression_counts.items())
        }
        dominant_expression = (
            expression_counts.most_common(1)[0][0] if expression_counts else "not_detected"
        )

        return {
            "duration_seconds": round(duration_seconds, 3),
            "source_fps": round(source_fps, 3),
            "sample_fps": round(effective_sample_fps, 3),
            "processed_frames": processed_frames,
            "face_detected_frames": face_frames,
            "face_detected_ratio": round(face_frames / processed_frames, 4),
            "estimated_eye_contact_percent": round((eye_contact_frames / processed_frames) * 100.0, 2),
            "eye_contact_estimation_method": (
                "face_direction_and_iris_position_proxy" if iris_samples else "face_direction_proxy"
            ),
            "looking_away_event_count": len(looking_away_events),
            "looking_away_events": looking_away_events,
            "dominant_face_direction": dominant_direction,
            "face_direction_distribution_percent": direction_distribution,
            "head_stability_score": calculate_head_stability(detected_poses),
            "facial_expression_estimate": {
                "dominant": dominant_expression,
                "distribution_percent": expression_distribution,
                "method": "MediaPipe facial-landmark geometry heuristic",
                "affects_interview_score": False,
            },
            "emotion_summary": expression_distribution,
        }
