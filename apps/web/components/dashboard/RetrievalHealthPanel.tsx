'use client';

import { Database, Clock, Target, Zap } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

const STATS = [
  { title: 'Total Chunks Indexed', value: '148,230', icon: Database, accent: 'var(--color-primary)' },
  { title: 'Avg Retrieval Latency', value: '45ms', icon: Clock, accent: '#60a5fa' },
  { title: 'Avg Relevance Score', value: '0.87', icon: Target, accent: '#34d399' },
  { title: 'Cache Hit Rate', value: '62%', icon: Zap, accent: '#fbbf24' },
];

const QUALITY_DISTRIBUTION = [
  { range: '0.9-1.0', count: 340, pct: 34 },
  { range: '0.8-0.9', count: 280, pct: 28 },
  { range: '0.7-0.8', count: 190, pct: 19 },
  { range: '0.6-0.7', count: 110, pct: 11 },
  { range: '0.5-0.6', count: 50, pct: 5 },
  { range: '<0.5', count: 30, pct: 3 },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function RetrievalHealthPanel() {
  const maxPct = Math.max(...QUALITY_DISTRIBUTION.map((d) => d.pct));

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div className="dash-card" key={stat.title}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-md)',
                    background: `${stat.accent}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={16} style={{ color: stat.accent }} />
                </div>
                <span className="dash-card-title" style={{ marginBottom: 0 }}>
                  {stat.title}
                </span>
              </div>
              <div className="dash-card-value">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Retrieval quality distribution chart */}
      <div className="dash-card">
        <div className="dash-card-title" style={{ marginBottom: 20 }}>
          Retrieval Quality Distribution
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {QUALITY_DISTRIBUTION.map((bucket) => (
            <div
              key={bucket.range}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  minWidth: 55,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {bucket.range}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 20,
                  borderRadius: 4,
                  background: 'var(--color-fill-tertiary)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(bucket.pct / maxPct) * 100}%`,
                    borderRadius: 4,
                    background:
                      bucket.pct >= 25
                        ? '#34d399'
                        : bucket.pct >= 15
                          ? '#60a5fa'
                          : bucket.pct >= 8
                            ? '#fbbf24'
                            : '#f87171',
                    transition: 'width 0.4s var(--ease-out)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'rgba(0,0,0,0.7)',
                    }}
                  >
                    {bucket.count}
                  </span>
                </div>
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-tertiary)',
                  minWidth: 32,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {bucket.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
