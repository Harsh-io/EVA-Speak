import pytest

from app.services import input_files


def test_audio_duration_accepts_ten_seconds(tmp_path, monkeypatch) -> None:
    audio_path = tmp_path / "sample.mp3"
    audio_path.write_bytes(b"test")
    monkeypatch.setattr(input_files, "probe_duration", lambda _: 10.0)

    assert input_files.validate_input(audio_path) == 10.0


def test_video_duration_rejects_less_than_ten_seconds(tmp_path, monkeypatch) -> None:
    video_path = tmp_path / "sample.mp4"
    video_path.write_bytes(b"test")
    monkeypatch.setattr(input_files, "probe_duration", lambda _: 9.99)

    with pytest.raises(ValueError, match="between 10 seconds and 10 minutes"):
        input_files.validate_video_input(video_path)


def test_uploaded_mp4_keeps_extension_and_logs_saved_path(tmp_path, monkeypatch, caplog) -> None:
    monkeypatch.setattr(input_files, "UPLOAD_DIR", tmp_path)

    with caplog.at_level("INFO"), input_files.uploaded_file_path(b"video", "01.Video.MP4") as path:
        assert path.is_file()
        assert path.name == "01.Video.MP4"
        assert path.suffix.lower() == ".mp4"
        assert "Saved absolute path" in caplog.text

    assert not path.exists()


def test_uploaded_file_path_rejects_non_mp4(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(input_files, "UPLOAD_DIR", tmp_path)

    with pytest.raises(ValueError, match="Only MP4"):
        with input_files.uploaded_file_path(b"video", "not-a-video.txt"):
            pass


def test_video_validation_accepts_uppercase_mp4(tmp_path, monkeypatch) -> None:
    video_path = tmp_path / "sample.MP4"
    video_path.write_bytes(b"test")
    monkeypatch.setattr(input_files, "probe_duration", lambda _: 10.0)

    assert input_files.validate_video_input(video_path) == 10.0
