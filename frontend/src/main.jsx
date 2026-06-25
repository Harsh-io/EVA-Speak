import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const sample = "The quick brown fox jumps over the lazy dog.";
const maxFileSizeBytes = 100 * 1024 * 1024;
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function formatPercent(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(digits)}%` : "Unavailable";
}

function formatScore(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number)}/100` : "Unavailable";
}

function formatDecimal(value, digits = 3) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "Unavailable";
}

function formatFileSize(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds) {
  return Number.isFinite(seconds) ? `${seconds.toFixed(1)} seconds` : "Unavailable";
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoList({ title, values }) {
  const items = Array.isArray(values) ? values : [];
  return (
    <section className="mini-card">
      <h4>{title}</h4>
      {items.length ? (
        <div className="pill-list">
          {items.map((value, index) => (
            <span className="pill" key={`${value}-${index}`}>{String(value)}</span>
          ))}
        </div>
      ) : (
        <p className="muted">None</p>
      )}
    </section>
  );
}

function DataTable({ title, rows, empty = "None" }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const columns = [...new Set(safeRows.flatMap((row) => Object.keys(row || {})))];
  return (
    <section className="mini-card">
      <h4>{title}</h4>
      {safeRows.length && columns.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>{columns.map((column) => <th key={column}>{column.replaceAll("_", " ")}</th>)}</tr>
            </thead>
            <tbody>
              {safeRows.map((row, index) => (
                <tr key={index}>
                  {columns.map((column) => <td key={column}>{String(row?.[column] ?? "")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">{empty}</p>
      )}
    </section>
  );
}

function BarChart({ title, data }) {
  const entries = Object.entries(data || {});
  return (
    <section className="mini-card">
      <h4>{title}</h4>
      {entries.length ? (
        <div className="bar-list">
          {entries.map(([label, rawValue]) => {
            const value = Math.max(0, Math.min(100, Number(rawValue) || 0));
            return (
              <div className="bar-row" key={label}>
                <div className="bar-label">
                  <span>{label.replaceAll("_", " ")}</span>
                  <strong>{value.toFixed(1)}%</strong>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${value}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="muted">Unavailable</p>
      )}
    </section>
  );
}

function tokenizeWords(text) {
  return String(text || "").toLowerCase().match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) || [];
}

function alignWords(expectedText, recognizedText) {
  const expectedWords = tokenizeWords(expectedText);
  const recognizedWords = tokenizeWords(recognizedText);
  const rowCount = expectedWords.length + 1;
  const columnCount = recognizedWords.length + 1;
  const lengths = Array.from({ length: rowCount }, () => Array(columnCount).fill(0));

  for (let row = expectedWords.length - 1; row >= 0; row -= 1) {
    for (let column = recognizedWords.length - 1; column >= 0; column -= 1) {
      lengths[row][column] = expectedWords[row] === recognizedWords[column]
        ? lengths[row + 1][column + 1] + 1
        : Math.max(lengths[row + 1][column], lengths[row][column + 1]);
    }
  }

  const operations = [];
  let expectedIndex = 0;
  let recognizedIndex = 0;
  while (expectedIndex < expectedWords.length && recognizedIndex < recognizedWords.length) {
    if (expectedWords[expectedIndex] === recognizedWords[recognizedIndex]) {
      operations.push({ operation: "equal", expected_index: expectedIndex, recognized_index: recognizedIndex });
      expectedIndex += 1;
      recognizedIndex += 1;
    } else if (lengths[expectedIndex + 1][recognizedIndex] >= lengths[expectedIndex][recognizedIndex + 1]) {
      operations.push({ operation: "delete", expected_index: expectedIndex, recognized_index: null });
      expectedIndex += 1;
    } else {
      operations.push({ operation: "insert", expected_index: null, recognized_index: recognizedIndex });
      recognizedIndex += 1;
    }
  }
  while (expectedIndex < expectedWords.length) {
    operations.push({ operation: "delete", expected_index: expectedIndex, recognized_index: null });
    expectedIndex += 1;
  }
  while (recognizedIndex < recognizedWords.length) {
    operations.push({ operation: "insert", expected_index: null, recognized_index: recognizedIndex });
    recognizedIndex += 1;
  }
  return operations;
}

function HighlightedRecognizedText({ expectedText, recognizedText, alignment }) {
  if (!recognizedText) return <span>No speech recognized.</span>;

  const operations = Array.isArray(alignment) && alignment.length
    ? alignment
    : alignWords(expectedText, recognizedText);
  const mismatchIndexes = new Set(
    operations
      .filter((item) => item.recognized_index !== null && item.operation !== "equal")
      .map((item) => item.recognized_index)
  );
  const parts = String(recognizedText).match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?|\s+|[^\sA-Za-z0-9]+/g) || [];
  let wordIndex = 0;

  return parts.map((part, index) => {
    if (/^[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?$/.test(part)) {
      const currentWordIndex = wordIndex;
      wordIndex += 1;
      return (
        <span className={mismatchIndexes.has(currentWordIndex) ? "word-mismatch" : undefined} key={index}>
          {part}
        </span>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

function DownloadButton({ report }) {
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `eva-speak-${report.report_id || "report"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <button className="secondary" onClick={download}>Download JSON</button>;
}

const resultPages = [
  { id: "comparison", label: "Expected vs recognized text" },
  { id: "speech", label: "Speech metrics" },
  { id: "visual", label: "Visual metrics" },
  { id: "feedback", label: "Feedback" },
  { id: "limitations", label: "Known limitations" },
];

function Results({ report }) {
  const [activePage, setActivePage] = useState("comparison");
  const speech = report.speech_metrics || {};
  const comparison = speech.comparison || {};
  const confidence = speech.confidence || {};
  const fillers = speech.fillers || {};
  const pauses = speech.pauses || {};
  const repetitions = speech.repetitions || {};
  const sentiment = speech.sentiment || {};
  const vision = report.vision_metrics || {};
  const expression = vision.facial_expression_estimate || {};
  const scores = report.scores || {};

  return (
    <section className="results">
      <div className="result-head">
        <div>
          <p className="eyebrow">ANALYSIS REPORT</p>
          <h2>Results</h2>
        </div>
        <DownloadButton report={report} />
      </div>

      {Array.isArray(report.warnings) && report.warnings.map((warning, index) => (
        <p className="warning" key={index}>{warning}</p>
      ))}

      <div className="metrics hero-metrics">
        <Metric label="Readiness score" value={formatScore(scores.interview_readiness_score)} />
        <Metric label="Fluency score" value={formatScore(scores.fluency_score)} />
        <Metric label="Pronunciation score" value={formatScore(comparison.pronunciation_accuracy_score)} />
        <Metric label="Eye contact estimate" value={formatPercent(vision.estimated_eye_contact_percent)} />
      </div>

      <nav className="result-tabs" aria-label="Result sections">
        {resultPages.map((page) => (
          <button
            className={page.id === activePage ? "tab active" : "tab"}
            key={page.id}
            onClick={() => setActivePage(page.id)}
            type="button"
          >
            {page.label}
          </button>
        ))}
      </nav>

      <div className="result-page">
        {activePage === "comparison" && (
        <article className="card">
          <h3>Expected vs recognized text</h3>
          <div className="compare-grid">
            <div>
              <h4>Expected text</h4>
              <p className="text-box">{report.expected_text || "No expected text provided."}</p>
            </div>
            <div>
              <h4>Recognized text</h4>
              <p className="text-box recognized-text">
                <HighlightedRecognizedText
                  alignment={comparison.alignment}
                  expectedText={report.expected_text}
                  recognizedText={report.recognized_text}
                />
              </p>
              <p className="note">Words shown in red do not match the expected text.</p>
            </div>
          </div>
          <div className="metrics compact">
            <Metric label="WER" value={formatDecimal(comparison.wer)} />
            <Metric label="CER" value={formatDecimal(comparison.cer)} />
            <Metric label="Sentiment" value={sentiment.label ? sentiment.label : "Unavailable"} />
          </div>
          <div className="detail-grid">
            <InfoList title="Missing words" values={comparison.missing_words} />
            <InfoList title="Inserted words" values={comparison.inserted_words} />
            <DataTable title="Substituted words" rows={comparison.substituted_words} />
          </div>
        </article>
        )}

        {activePage === "speech" && (
        <article className="card">
          <h3>Speech metrics</h3>
          <div className="metrics compact">
            <Metric label="Words per minute" value={speech.speech_rate?.words_per_minute ?? "Unavailable"} />
            <Metric label="Speech rate" value={speech.speech_rate?.speech_rate_category ?? "Unavailable"} />
            <Metric label="Average confidence" value={formatPercent(Number(confidence.average_word_confidence) * 100)} />
            <Metric label="Long pauses" value={pauses.long_pause_count ?? "Unavailable"} />
            <Metric label="Fillers" value={fillers.total_filler_words ?? "Unavailable"} />
            <Metric label="Repetitions" value={repetitions.repetition_count ?? "Unavailable"} />
          </div>
          <div className="detail-grid">
            <DataTable title="Low-confidence words" rows={confidence.low_confidence_words} />
            <BarChart title="Filler breakdown" data={fillers.filler_breakdown} />
          </div>
        </article>
        )}

        {activePage === "visual" && (
        <article className="card">
          <h3>Visual metrics</h3>
          <div className="metrics compact">
            <Metric label="Face detected" value={formatPercent(Number(vision.face_detected_ratio) * 100)} />
            <Metric label="Looking-away events" value={vision.looking_away_event_count ?? "Unavailable"} />
            <Metric label="Dominant direction" value={vision.dominant_face_direction ?? "Unavailable"} />
            <Metric label="Head stability" value={formatScore(vision.head_stability_score)} />
            <Metric label="Expression estimate" value={expression.dominant ?? "Unavailable"} />
          </div>
          <div className="detail-grid">
            <BarChart title="Face direction distribution" data={vision.face_direction_distribution_percent} />
            <BarChart title="Facial expression estimate" data={expression.distribution_percent} />
          </div>
          <p className="note">
            Eye contact, face direction, and facial expression are approximate landmark-based estimates. Expression does not reveal true emotion or affect scoring.
          </p>
        </article>
        )}

        {activePage === "feedback" && (
        <article className="card">
          <h3>Feedback</h3>
          {Array.isArray(report.feedback) && report.feedback.length ? (
            <ul className="feedback-list">
              {report.feedback.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          ) : (
            <p className="muted">No feedback available.</p>
          )}
        </article>
        )}

        {activePage === "limitations" && (
        <article className="card">
          <h3>Known limitations</h3>
          {Array.isArray(report.limitations) && report.limitations.length ? (
            <ul className="feedback-list">
              {report.limitations.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          ) : (
            <p className="muted">No limitations reported.</p>
          )}
        </article>
        )}
      </div>
    </section>
  );
}

function App() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState(sample);
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState("");
  const [fallback, setFallback] = useState(false);
  const [duration, setDuration] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const videoUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const isMp4 = file ? file.name.toLowerCase().endsWith(".mp4") : false;
  const isTooLarge = file ? file.size > maxFileSizeBytes : false;
  const canAnalyze = Boolean(file && isMp4 && !isTooLarge && text.trim() && !isAnalyzing);

  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  function handleFileChange(event) {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setReport(null);
    setDuration(null);
    if (!selected) {
      setStatus("");
    } else if (!selected.name.toLowerCase().endsWith(".mp4")) {
      setStatus("Only MP4 video files are supported. Choose a file ending in .mp4.");
    } else if (selected.size > maxFileSizeBytes) {
      setStatus("The uploaded video exceeds the 100 MB limit.");
    } else {
      setStatus("");
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (!canAnalyze) return;
    setIsAnalyzing(true);
    setStatus("Analyzing speech and video. This can take several minutes...");
    setReport(null);
    const body = new FormData();
    body.append("video", file);
    body.append("expectedText", text);
    try {
      const response = await fetch(`${apiBaseUrl}/api/analyze/full${fallback ? "?fallback=last" : ""}`, {
        method: "POST",
        body,
      });
      const data = await response.json();
      if (!response.ok && response.status !== 206) {
        const retryText = data.retryAfterSeconds
          ? ` Try again in about ${data.retryAfterSeconds} seconds.`
          : "";
        throw new Error(`${data.error || "Analysis failed."}${retryText}`);
      }
      setReport(data.report);
      setStatus(data.degraded ? data.warning : "Analysis complete.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main>
      <header>
        <p className="eyebrow">INTERVIEW PRACTICE</p>
        <h1>EVA Speak</h1>
        <p>Clear, local communication feedback from one short recording.</p>
      </header>

      <section className="panel">
        <form onSubmit={submit}>
          <label>
            MP4 video
            <input type="file" accept="video/mp4,.mp4" required onChange={handleFileChange} />
          </label>

          {file && (
            <section className="preview-card">
              <div className="preview-copy">
                <h2>Video preview</h2>
                <p>Review the uploaded video before analysis. The preview remains here after results load.</p>
              </div>
              {videoUrl && (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  src={videoUrl}
                  onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
                />
              )}
              <div className="metrics compact">
                <Metric label="Filename" value={file.name} />
                <Metric label="File size" value={formatFileSize(file.size)} />
                <Metric label="Duration" value={formatDuration(duration)} />
              </div>
            </section>
          )}

          <label>
            Expected text
            <textarea
              value={text}
              maxLength="5000"
              required
              placeholder="Enter the exact prompt or paragraph the speaker should read..."
              onChange={(event) => setText(event.target.value)}
            />
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={fallback}
              onChange={(event) => setFallback(event.target.checked)}
            />
            Use last successful report if live analysis fails
          </label>

          {!file && <p className="hint">Upload an MP4 video to enable analysis.</p>}
          {file && !isMp4 && <p className="warning">Only MP4 video files are supported.</p>}
          {file && isTooLarge && <p className="warning">Video exceeds the 100 MB upload limit.</p>}
          {!text.trim() && <p className="warning">Enter expected text before starting analysis.</p>}

          <button disabled={!canAnalyze}>{isAnalyzing ? "Analyzing..." : "Analyze communication"}</button>
        </form>
        {status && <p className="status" role="status">{status}</p>}
      </section>

      {report && <Results report={report} />}

      <footer>Estimates for practice only. Not a clinical speech, gaze, or emotion assessment.</footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
