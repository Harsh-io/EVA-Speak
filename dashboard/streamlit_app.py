import importlib
import inspect
import json
import logging
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import streamlit as st
import pandas as pd

st.set_page_config(page_title="EVA Speak", layout="wide")

try:
    from app.config import EXPECTED_TEXT, HISTORY_PATH, MAX_FILE_SIZE_BYTES
    from app import full_pipeline as full_pipeline_module
    from app.services.input_files import probe_duration, uploaded_file_path
except ModuleNotFoundError as exc:
    st.error(f"The active Python environment is missing the '{exc.name}' package.")
    st.code(r".\.venv\Scripts\python.exe -m streamlit run dashboard\streamlit_app.py")
    st.caption(f"Active interpreter: {sys.executable}")
    st.stop()

if "expected_text" not in inspect.signature(full_pipeline_module.analyze_full).parameters:
    full_pipeline_module = importlib.reload(full_pipeline_module)
analyze_full = full_pipeline_module.analyze_full
LOGGER = logging.getLogger(__name__)

st.title("EVA Speak")
st.caption("Local AI speaking coach MVP: transcript comparison, fluency, visual estimates, and feedback.")

with st.sidebar:
    st.header("Expected Text")
    text_mode_label = st.radio("Choose prompt source", ["Default sample", "User-entered"])
    if text_mode_label == "Default sample":
        expected_text = EXPECTED_TEXT
        expected_text_mode = "default_sample"
        st.info(expected_text)
    else:
        expected_text = st.text_area(
            "Enter expected text",
            value=EXPECTED_TEXT,
            max_chars=5000,
            height=160,
        )
        expected_text_mode = "user_entered"

uploaded_file = st.file_uploader("Upload MP4 video", type=["mp4"])

if uploaded_file is not None:
    st.video(uploaded_file)
    if uploaded_file.size > MAX_FILE_SIZE_BYTES:
        st.error("Input exceeds the 100 MB size limit.")
        st.stop()

    uploaded_bytes = uploaded_file.getvalue()
    try:
        with uploaded_file_path(uploaded_bytes, uploaded_file.name) as preview_path:
            duration = probe_duration(preview_path)
        if duration is not None:
            st.caption(f"Detected duration: {duration:.1f} seconds")
    except ValueError as exc:
        st.error(str(exc))
        st.stop()

    if st.button("Analyze communication", type="primary"):
        try:
            with st.spinner("Analyzing video locally..."):
                with uploaded_file_path(uploaded_bytes, uploaded_file.name) as video_path:
                    report, report_path, saved_history_path = analyze_full(
                        video_path,
                        expected_text=expected_text,
                        expected_text_mode=expected_text_mode,
                    )
        except Exception as exc:
            LOGGER.exception("Analysis failed")
            st.error(f"Analysis failed: {exc}")
            st.stop()

        st.success("Analysis complete")

        scores = report.get("scores", {})
        speech_metrics = report.get("speech_metrics", {})
        vision_metrics = report.get("vision_metrics", {})
        comparison = speech_metrics.get("comparison", {})

        cols = st.columns(4)
        cols[0].metric("Readiness", scores.get("interview_readiness_score", "N/A"))
        cols[1].metric("Speech", scores.get("speech_communication_score", "N/A"))
        cols[2].metric("Visual", scores.get("visual_communication_score", "N/A"))
        cols[3].metric("Accuracy", comparison.get("pronunciation_accuracy_score", "N/A"))

        st.subheader("Transcript")
        st.write("Expected text")
        st.info(report.get("expected_text", ""))
        st.write("Recognized text")
        st.write(report.get("recognized_text", ""))

        st.subheader("Speech Metrics")
        st.json(
            {
                "wer": comparison.get("wer"),
                "cer": comparison.get("cer"),
                "sentiment": speech_metrics.get("sentiment"),
                "speech_rate": speech_metrics.get("speech_rate"),
                "fillers": speech_metrics.get("fillers"),
                "pauses": speech_metrics.get("pauses"),
                "repetitions": speech_metrics.get("repetitions"),
            }
        )

        st.subheader("Visual Metrics")
        st.json(
            {
                "estimated_eye_contact_percent": vision_metrics.get("estimated_eye_contact_percent"),
                "face_detected_ratio": vision_metrics.get("face_detected_ratio"),
                "face_direction_distribution_percent": vision_metrics.get(
                    "face_direction_distribution_percent"
                ),
                "head_stability_score": vision_metrics.get("head_stability_score"),
                "facial_expression_estimate": vision_metrics.get("facial_expression_estimate"),
            }
        )

        st.subheader("Feedback")
        for item in report.get("feedback", []):
            st.write(f"- {item}")

        report_json = json.dumps(report, indent=2, ensure_ascii=True)
        st.download_button(
            "Download JSON report",
            report_json,
            file_name=f"{report.get('report_id', 'eva-report')}.json",
            mime="application/json",
        )
        st.caption(f"Report saved to: {report_path}")
        st.caption(f"History saved to: {saved_history_path}")
else:
    st.info("Upload an MP4 video to begin.")

if HISTORY_PATH.exists():
    st.divider()
    st.subheader("History")
    st.caption(str(HISTORY_PATH))
    st.dataframe(pd.read_csv(HISTORY_PATH), use_container_width=True)
