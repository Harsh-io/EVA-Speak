from app.services.vision import (
    build_looking_away_events,
    calculate_head_stability,
    classify_face_direction,
    classify_facial_expression,
    estimate_face_pose_proxy,
    iris_is_centered,
)
from app import vision_pipeline
from app.services import input_files


def test_classify_face_direction() -> None:
    assert classify_face_direction(0, 0) == "center"
    assert classify_face_direction(-20, 0) == "left"
    assert classify_face_direction(20, 0) == "right"
    assert classify_face_direction(0, -20) == "down"
    assert classify_face_direction(0, 20) == "up"


def test_iris_center_proxy() -> None:
    assert iris_is_centered(0.5, 0.5, (0.0, 1.0), (0.0, 1.0))
    assert not iris_is_centered(0.9, 0.5, (0.0, 1.0), (0.0, 1.0))


def test_face_pose_proxy_is_centered_for_balanced_landmarks() -> None:
    pose = estimate_face_pose_proxy(0.5, 0.6, 0.2, 0.8, 0.0, 1.0)

    assert pose == (0.0, 0.0)
    assert estimate_face_pose_proxy(0.65, 0.6, 0.2, 0.8, 0.0, 1.0)[0] > 15


def test_facial_expression_heuristic() -> None:
    assert classify_facial_expression(0.02, 0.01) == "happy"
    assert classify_facial_expression(0.0, 0.01) == "serious"
    assert classify_facial_expression(0.005, 0.03) == "neutral"


def test_looking_away_events_are_debounced() -> None:
    samples = [
        {"timestamp": 0.0, "estimated_eye_contact": True},
        {"timestamp": 0.5, "estimated_eye_contact": False},
        {"timestamp": 1.0, "estimated_eye_contact": True},
        {"timestamp": 1.5, "estimated_eye_contact": False},
        {"timestamp": 2.0, "estimated_eye_contact": False},
        {"timestamp": 2.5, "estimated_eye_contact": True},
    ]

    assert build_looking_away_events(samples, 0.5) == [
        {"start": 1.5, "end": 2.5, "duration": 1.0}
    ]


def test_head_stability_score() -> None:
    assert calculate_head_stability([]) == 0
    assert calculate_head_stability([(0.0, 0.0)]) == 100
    assert calculate_head_stability([(0.0, 0.0), (1.0, 1.0)]) > 90
    assert calculate_head_stability([(0.0, 0.0), (40.0, 40.0)]) == 0


def test_stage_2_receives_saved_mp4_path(tmp_path, monkeypatch) -> None:
    source = tmp_path / "01.Video.MP4"
    source.write_bytes(b"video")
    monkeypatch.setattr(input_files, "probe_duration", lambda _: 10.0)
    monkeypatch.setattr(input_files, "UPLOAD_DIR", tmp_path / "uploads")

    class RecordingAnalyzer:
        def analyze(self, video_path):
            assert video_path.is_file()
            assert video_path.suffix.lower() == ".mp4"
            return {"duration_seconds": 10.0}

    report, _ = vision_pipeline.analyze_vision(
        source, output_path=tmp_path / "vision.json", analyzer=RecordingAnalyzer()
    )

    assert report["stage"] == 2
