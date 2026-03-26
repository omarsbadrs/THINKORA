'use client';

import { Users, Activity, Coins, Hash } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

const REQUESTS_BY_USER = [
  { user: 'alice@company.com', requests: 3420, pct: 27 },
  { user: 'bob@company.com', requests: 2810, pct: 22 },
  { user: 'carol@company.com', requests: 2140, pct: 17 },
  { user: 'dave@company.com', requests: 1680, pct: 13 },
  { user: 'eve@company.com', requests: 1320, pct: 10 },
  { user: 'frank@company.com', requests: 890, pct: 7 },
  { user: 'grace@company.com', requests: 587, pct: 4 },
];

const TOKENS_BY_MODEL = [
  { model: 'GPT-4o', tokens: 1420000, pct: 34 },
  { model: 'Claude 3.5 Sonnet', tokens: 1180000, pct: 28 },
  { model: 'GPT-4o Mini', tokens: 620000, pct: 15 },
  { model: 'Gemini Pro', tokens: 480000, pct: 11 },
  { model: 'Llama 3.1 70B', tokens: 320000, pct: 8 },
  { model: 'Claude 3 Haiku', tokens: 180000, pct: 4 },
];

const COST_OVER_TIME = [
  { date: 'Mar 20', cost: 3.82 },
  { date: 'Mar 21', cost: 4.56 },
  { date: 'Mar 22', cost: 4.12 },
  { date: 'Mar 23', cost: 3.45 },
  { date: 'Mar 24', cost: 4.88 },
  { date: 'Mar 25', cost: 5.21 },
  { date: 'Mar 26', cost: 4.23 },
];

const BAR_COLORS = [
  'var(--color-primary)',
  '#60a5fa',
  '#34d399',
  '#a78bfa',
  '#fbbf24',
  '#fb7185',
  '#38bdf8',
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function UsagePanel() {
  const maxCost = Math.max(...COST_OVER_TIME.map((d) => d.cost));

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--color-text)',
          marginBottom: 4,
        }}
      >
        Usage Analytics
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        <div className="dash-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(236,132,53,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Activity size={15} style={{ color: 'var(--color-primary)' }} />
            </div>
            <span className="dash-card-title" style={{ marginBottom: 0 }}>
              Total Requests
            </span>
          </div>
          <div className="dash-card-value">12,847</div>
          <div className="dash-card-sub">Last 7 days</div>
        </div>
        <div className="dash-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(96,165,250,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Hash size={15} style={{ color: '#60a5fa' }} />
            </div>
            <span className="dash-card-title" style={{ marginBottom: 0 }}>
              Total Tokens
            </span>
          </div>
          <div className="dash-card-value">4.2M</div>
          <div className="dash-card-sub">Last 7 days</div>
        </div>
        <div className="dash-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(52,211,153,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Coins size={15} style={{ color: '#34d399' }} />
            </div>
            <span className="dash-card-title" style={{ marginBottom: 0 }}>
              Total Cost
            </span>
          </div>
          <div className="dash-card-value">$127.45</div>
          <div className="dash-card-sub">Last 7 days</div>
        </div>
        <div className="dash-card">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(167,139,250,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={15} style={{ color: '#a78bfa' }} />
            </div>
            <span className="dash-card-title" style={{ marginBottom: 0 }}>
              Active Users
            </span>
          </div>
          <div className="dash-card-value">7</div>
          <div className="dash-card-sub">Last 7 days</div>
        </div>
      </div>

      {/* Two-column layout for breakdowns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 16,
        }}
      >
        {/* Requests by user */}
        <div className="dash-card">
          <div className="dash-card-title" style={{ marginBottom: 14 }}>
            Requests by User
          </div>
          {REQUESTS_BY_USER.map((row, i) => (
            <div key={row.user} style={{ marginBottom: 10 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--color-text)',
                    fontWeight: 500,
                  }}
                >
                  {row.user}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-secondary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {row.requests.toLocaleString()} ({row.pct}%)
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: 'var(--color-fill-tertiary)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${row.pct}%`,
                    borderRadius: 3,
                    background: BAR_COLORS[i % BAR_COLORS.length],
                    transition: 'width 0.3s var(--ease-out)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Tokens by model */}
        <div className="dash-card">
          <div className="dash-card-title" style={{ marginBottom: 14 }}>
            Tokens by Model
          </div>
          {TOKENS_BY_MODEL.map((row, i) => (
            <div key={row.model} style={{ marginBottom: 10 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--color-text)',
                    fontWeight: 500,
                  }}
                >
                  {row.model}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-secondary)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatTokens(row.tokens)} ({row.pct}%)
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: 'var(--color-fill-tertiary)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${row.pct}%`,
                    borderRadius: 3,
                    background: BAR_COLORS[i % BAR_COLORS.length],
                    transition: 'width 0.3s var(--ease-out)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost over time */}
      <div className="dash-card">
        <div className="dash-card-title" style={{ marginBottom: 16 }}>
          Cost Over Time (Last 7 Days)
        </div>
        <svg
          width="100%"
          height={160}
          viewBox={`0 0 ${COST_OVER_TIME.length * 80} 160`}
          preserveAspectRatio="none"
          style={{ display: 'block' }}
        >
          {COST_OVER_TIME.map((d, i) => {
            const barWidth = 60;
            const barHeight = (d.cost / maxCost) * 120;
            const x = i * 80 + 10;
            const y = 120 - barHeight;

            return (
              <g key={d.date}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  fill="var(--color-primary)"
                  opacity={0.7}
                />
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fill="var(--color-text-secondary)"
                  fontSize={10}
                  fontWeight={600}
                  fontFamily="var(--font)"
                >
                  ${d.cost.toFixed(2)}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={145}
                  textAnchor="middle"
                  fill="var(--color-text-quaternary)"
                  fontSize={10}
                  fontFamily="var(--font)"
                >
                  {d.date.slice(4)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
