'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

interface ModelRow {
  model: string;
  provider: string;
  requests: number;
  tokens: number;
  avgLatency: number;
  errorRate: number;
  cost: number;
}

const DEMO_ROWS: ModelRow[] = [
  { model: 'GPT-4o', provider: 'OpenAI', requests: 3240, tokens: 1420000, avgLatency: 480, errorRate: 0.5, cost: 42.18 },
  { model: 'Claude 3.5 Sonnet', provider: 'Anthropic', requests: 2810, tokens: 1180000, avgLatency: 520, errorRate: 0.3, cost: 31.54 },
  { model: 'Gemini Pro', provider: 'Google', requests: 1960, tokens: 620000, avgLatency: 310, errorRate: 0.9, cost: 22.30 },
  { model: 'GPT-4o Mini', provider: 'OpenAI', requests: 1720, tokens: 480000, avgLatency: 180, errorRate: 0.4, cost: 18.67 },
  { model: 'Llama 3.1 70B', provider: 'Meta', requests: 1340, tokens: 320000, avgLatency: 260, errorRate: 1.2, cost: 12.76 },
  { model: 'Claude 3 Haiku', provider: 'Anthropic', requests: 890, tokens: 210000, avgLatency: 140, errorRate: 0.2, cost: 5.40 },
  { model: 'Mixtral 8x7B', provider: 'Mistral', requests: 560, tokens: 160000, avgLatency: 220, errorRate: 1.8, cost: 3.20 },
  { model: 'DeepSeek V3', provider: 'DeepSeek', requests: 327, tokens: 110000, avgLatency: 380, errorRate: 2.1, cost: 1.90 },
];

type SortKey = keyof ModelRow;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  textAlign: 'left',
  borderBottom: '1px solid var(--color-border)',
  cursor: 'pointer',
  userSelect: 'none',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 13,
  color: 'var(--color-text)',
  borderBottom: '1px solid var(--color-border-card)',
  fontVariantNumeric: 'tabular-nums',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ModelUsageTable() {
  const [sortKey, setSortKey] = useState<SortKey>('requests');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sorted = [...DEMO_ROWS].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return null;
    return sortAsc ? (
      <ChevronUp size={12} style={{ marginLeft: 4, opacity: 0.6 }} />
    ) : (
      <ChevronDown size={12} style={{ marginLeft: 4, opacity: 0.6 }} />
    );
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: 'model', label: 'Model' },
    { key: 'requests', label: 'Requests' },
    { key: 'tokens', label: 'Tokens' },
    { key: 'avgLatency', label: 'Avg Latency' },
    { key: 'errorRate', label: 'Error Rate' },
    { key: 'cost', label: 'Cost' },
  ];

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border-card)',
          }}
        >
          <div className="dash-card-title" style={{ marginBottom: 0 }}>
            Model Usage
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 700,
            }}
          >
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={thStyle}
                    onClick={() => handleSort(col.key)}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      {col.label}
                      <SortIcon column={col.key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr
                  key={row.model}
                  style={{ transition: 'background 0.15s' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      'var(--color-fill-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      'transparent';
                  }}
                >
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{row.model}</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--color-text-tertiary)',
                      }}
                    >
                      {row.provider}
                    </div>
                  </td>
                  <td style={tdStyle}>{row.requests.toLocaleString()}</td>
                  <td style={tdStyle}>{formatTokens(row.tokens)}</td>
                  <td style={tdStyle}>{row.avgLatency}ms</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        color: row.errorRate > 1 ? '#f87171' : 'var(--color-text)',
                      }}
                    >
                      {row.errorRate}%
                    </span>
                  </td>
                  <td style={tdStyle}>${row.cost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
