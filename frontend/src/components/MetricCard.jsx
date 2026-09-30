// Reusable metric display card component
import React from 'react';

/**
 * MetricCard — displays a single metric value with label, optional icon, and color coding.
 *
 * @param {string}  label       - The metric name displayed at the top
 * @param {string|number} value - The metric value to display
 * @param {string}  [icon]      - Emoji or character to display above the label
 * @param {string}  [quality]   - 'good' | 'warning' | 'bad' for color coding the value
 * @param {string}  [suffix]    - Optional suffix appended to value (e.g. '%', 'WPM')
 * @param {string}  [subtitle]  - Small text below the value for context
 * @param {boolean} [glowing]   - Whether to apply accent glow styling
 */
export default function MetricCard({
  label,
  value,
  icon,
  quality,
  suffix = '',
  subtitle,
  glowing = false,
  style,
}) {
  const valueClass = quality
    ? `metric-value ${quality}`
    : 'metric-value';

  return (
    <div className={`metric-card${glowing ? ' metric-card--glow' : ''}`} style={style}>
      {icon && <div className="metric-card-icon">{icon}</div>}
      <div className="metric-label">{label}</div>
      <div className={valueClass}>
        {value !== null && value !== undefined ? `${value}${suffix}` : '—'}
      </div>
      {subtitle && <div className="metric-card-subtitle">{subtitle}</div>}
    </div>
  );
}

/**
 * Returns a quality string ('good' | 'warning' | 'bad') based on a numeric score (0–100).
 */
export function scoreQuality(score, goodThreshold = 70, warnThreshold = 50) {
  const n = Number(score);
  if (!Number.isFinite(n)) return undefined;
  if (n >= goodThreshold) return 'good';
  if (n >= warnThreshold) return 'warning';
  return 'bad';
}
