'use client';

import {
  Activity,
  Coins,
  Clock,
  AlertTriangle,
  Cpu,
  Hash,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

const STATS = [
  {
    title: 'Total Requests',
    value: '12,847',
    trend: '+12%',
    trendUp: true,
    sub: 'vs last 7 days',
    icon: Activity,
    accent: 'var(--color-primary)',
  },
  {
    title: 'Total Tokens',
    value: '4.2M',
    trend: '+8.3%',
    trendUp: true,
    sub: 'prompt + completion',
    icon: Hash,
    accent: '#60a5fa',
  },
  {
    title: 'Total Cost',
    value: '$127.45',
    trend: '-3.2%',
    trendUp: false,
    sub: 'this billing period',
    icon: Coins,
    accent: '#34d399',
  },
  {
    title: 'Avg Latency',
    value: '342ms',
    trend: '-5.1%',
    trendUp: false,
    sub: 'p50 across all models',
    icon: Clock,
    accent: '#a78bfa',
  },
  {
    title: 'Error Rate',
    value: '0.8%',
    trend: '+0.2%',
    trendUp: true,
    sub: '103 errors total',
    icon: AlertTriangle,
    accent: '#f87171',
  },
  {
    title: 'Active Models',
    value: '24',
    trend: '+2',
    trendUp: true,
    sub: 'across 5 providers',
    icon: Cpu,
    accent: '#fbbf24',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OverviewCards() {
  return (
    <div className="dashboard-grid">
      {STATS.map((stat) => {
        const Icon = stat.icon;
        const isPositiveTrend =
          (stat.title === 'Error Rate' && !stat.trendUp) ||
          (stat.title === 'Avg Latency' && !stat.trendUp) ||
          (stat.title !== 'Error Rate' &&
            stat.title !== 'Avg Latency' &&
            stat.trendUp);

        return (
          <div className="dash-card" key={stat.title}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <span className="dash-card-title" style={{ marginBottom: 0 }}>
                {stat.title}
              </span>
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
            </div>

            <div className="dash-card-value">{stat.value}</div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 8,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: isPositiveTrend ? '#34d399' : '#f87171',
                  background: isPositiveTrend
                    ? 'rgba(52,211,153,0.1)'
                    : 'rgba(248,113,113,0.1)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {stat.trend}
              </span>
              <span className="dash-card-sub" style={{ marginTop: 0 }}>
                {stat.sub}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
