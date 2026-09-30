// Reusable bar chart component — wraps recharts BarChart for EVA Speak data
import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-default)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: '0.82rem',
      boxShadow: 'var(--shadow-md)',
    }}>
      {label && <p style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.fill || 'var(--accent-primary)' }}>
          {entry.name ? `${entry.name}: ` : ''}{entry.value}{entry.unit || ''}
        </p>
      ))}
    </div>
  );
}

/**
 * BarChart — a styled recharts bar chart.
 *
 * @param {Array}   data         - Array of objects: [{ name, value, color? }]
 * @param {string}  [dataKey]    - Key for the bar value (default: 'value')
 * @param {string}  [nameKey]    - Key for the category name (default: 'name')
 * @param {number}  [height]     - Chart height in px (default: 220)
 * @param {string}  [color]      - Default bar color (default: accent-primary)
 * @param {boolean} [colorCoded] - If true, bars are colored based on value (≥70 green, ≥50 amber, else red)
 * @param {string}  [unit]       - Unit label for tooltip
 * @param {number}  [maxValue]   - YAxis max value (default: 100)
 */
export default function BarChart({
  data = [],
  dataKey = 'value',
  nameKey = 'name',
  height = 220,
  color = COLORS.primary,
  colorCoded = false,
  unit = '',
  maxValue = 100,
}) {
  const getColor = (entry) => {
    if (entry.color) return entry.color;
    if (colorCoded) {
      const v = Number(entry[dataKey] ?? entry.value);
      if (v >= 70) return COLORS.success;
      if (v >= 50) return COLORS.warning;
      return COLORS.error;
    }
    return color;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
        barCategoryGap="30%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
        <XAxis
          dataKey={nameKey}
          tick={{ fill: '#64748b', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, maxValue]}
          tick={{ fill: '#64748b', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ fill: 'rgba(99,102,241,0.07)' }} />
        <Bar dataKey={dataKey} radius={[6, 6, 0, 0]} maxBarSize={56}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry)} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
