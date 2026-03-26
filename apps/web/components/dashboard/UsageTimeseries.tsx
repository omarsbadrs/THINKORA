'use client';

import { useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Demo data — daily request counts for 14 days                       */
/* ------------------------------------------------------------------ */

const DAILY_DATA = [
  { label: 'Mar 13', value: 720 },
  { label: 'Mar 14', value: 860 },
  { label: 'Mar 15', value: 940 },
  { label: 'Mar 16', value: 810 },
  { label: 'Mar 17', value: 1120 },
  { label: 'Mar 18', value: 1050 },
  { label: 'Mar 19', value: 970 },
  { label: 'Mar 20', value: 1200 },
  { label: 'Mar 21', value: 1340 },
  { label: 'Mar 22', value: 1180 },
  { label: 'Mar 23', value: 890 },
  { label: 'Mar 24', value: 1060 },
  { label: 'Mar 25', value: 1150 },
  { label: 'Mar 26', value: 1307 },
];

const PERIODS = ['24h', '7d', '30d'] as const;
type Period = (typeof PERIODS)[number];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function UsageTimeseries() {
  const [period, setPeriod] = useState<Period>('7d');

  const maxValue = Math.max(...DAILY_DATA.map((d) => d.value));
  const chartHeight = 180;
  const barGap = 6;

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div className="dash-card">
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div>
            <div className="dash-card-title">Requests Over Time</div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--color-text-secondary)',
              }}
            >
              Daily request volume
            </div>
          </div>

          {/* Period selector */}
          <div
            style={{
              display: 'flex',
              gap: 2,
              background: 'var(--color-fill-tertiary)',
              borderRadius: 'var(--radius)',
              padding: 2,
            }}
          >
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background:
                    period === p
                      ? 'var(--color-fill-secondary)'
                      : 'transparent',
                  color:
                    period === p
                      ? 'var(--color-text)'
                      : 'var(--color-text-tertiary)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  transition: 'all 0.15s',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Bar Chart */}
        <svg
          width="100%"
          height={chartHeight + 30}
          viewBox={`0 0 ${DAILY_DATA.length * 52} ${chartHeight + 30}`}
          preserveAspectRatio="none"
          style={{ display: 'block' }}
        >
          {DAILY_DATA.map((d, i) => {
            const barWidth = 52 - barGap;
            const barHeight = (d.value / maxValue) * chartHeight;
            const x = i * 52;
            const y = chartHeight - barHeight;

            return (
              <g key={d.label}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  fill="var(--color-primary)"
                  opacity={0.75}
                  style={{ transition: 'height 0.3s, y 0.3s' }}
                />
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 18}
                  textAnchor="middle"
                  fill="var(--color-text-quaternary)"
                  fontSize={9}
                  fontFamily="var(--font)"
                >
                  {d.label.slice(4)}
                </text>
                {/* Hover value label */}
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fill="var(--color-text-secondary)"
                  fontSize={10}
                  fontWeight={600}
                  fontFamily="var(--font)"
                >
                  {d.value.toLocaleString()}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
