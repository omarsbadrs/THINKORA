'use client';

import { AlertCircle, Clock, Hash } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

interface ErrorEntry {
  id: string;
  type: 'rate_limit' | 'timeout' | 'auth' | 'invalid_request' | 'server';
  message: string;
  model: string;
  count: number;
  lastSeen: string;
}

const DEMO_ERRORS: ErrorEntry[] = [
  {
    id: 'err-1',
    type: 'rate_limit',
    message: 'Rate limit exceeded: 429 Too Many Requests',
    model: 'GPT-4o',
    count: 34,
    lastSeen: '2 min ago',
  },
  {
    id: 'err-2',
    type: 'timeout',
    message: 'Request timeout after 30000ms',
    model: 'GPT-4o',
    count: 18,
    lastSeen: '12 min ago',
  },
  {
    id: 'err-3',
    type: 'server',
    message: 'Internal server error: 500 — upstream provider unavailable',
    model: 'Gemini Pro',
    count: 12,
    lastSeen: '28 min ago',
  },
  {
    id: 'err-4',
    type: 'invalid_request',
    message: 'Context length exceeded: input 132K tokens exceeds 128K limit',
    model: 'Llama 3.1 70B',
    count: 8,
    lastSeen: '1 hr ago',
  },
  {
    id: 'err-5',
    type: 'auth',
    message: 'Authentication failed: invalid API key for provider',
    model: 'DeepSeek V3',
    count: 3,
    lastSeen: '3 hr ago',
  },
];

const ERROR_TYPE_META: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  rate_limit: { label: 'Rate Limit', color: '#fbbf24', bgColor: 'rgba(251,191,36,0.12)' },
  timeout: { label: 'Timeout', color: '#f97316', bgColor: 'rgba(249,115,22,0.12)' },
  auth: { label: 'Authentication', color: '#f87171', bgColor: 'rgba(248,113,113,0.12)' },
  invalid_request: { label: 'Invalid Request', color: '#a78bfa', bgColor: 'rgba(167,139,250,0.12)' },
  server: { label: 'Server Error', color: '#fb7185', bgColor: 'rgba(251,113,133,0.12)' },
};

/* ------------------------------------------------------------------ */
/*  Group errors by type                                               */
/* ------------------------------------------------------------------ */

function groupByType(errors: ErrorEntry[]) {
  const groups: Record<string, ErrorEntry[]> = {};
  for (const e of errors) {
    if (!groups[e.type]) groups[e.type] = [];
    groups[e.type].push(e);
  }
  return groups;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ErrorPanel() {
  const grouped = groupByType(DEMO_ERRORS);
  const totalErrors = DEMO_ERRORS.reduce((s, e) => s + e.count, 0);

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        <div className="dash-card">
          <div className="dash-card-title">Total Errors</div>
          <div className="dash-card-value" style={{ color: '#f87171' }}>
            {totalErrors}
          </div>
          <div className="dash-card-sub">Last 24 hours</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-title">Error Rate</div>
          <div className="dash-card-value">0.8%</div>
          <div className="dash-card-sub">103 / 12,847 requests</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-title">Most Common</div>
          <div
            className="dash-card-value"
            style={{ fontSize: 18, color: '#fbbf24' }}
          >
            Rate Limit
          </div>
          <div className="dash-card-sub">34 occurrences</div>
        </div>
      </div>

      {/* Error groups */}
      {Object.entries(grouped).map(([type, errors]) => {
        const meta = ERROR_TYPE_META[type];
        return (
          <div className="dash-card" key={type}>
            {/* Group header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: meta.bgColor,
                  color: meta.color,
                  textTransform: 'uppercase',
                }}
              >
                {meta.label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-tertiary)',
                }}
              >
                {errors.length} unique error{errors.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Error entries */}
            {errors.map((err) => (
              <div
                key={err.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-fill-tertiary)',
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <AlertCircle
                    size={16}
                    style={{
                      color: meta.color,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--color-text)',
                        fontWeight: 500,
                        marginBottom: 6,
                        lineHeight: 1.4,
                      }}
                    >
                      {err.message}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 16,
                        fontSize: 12,
                        color: 'var(--color-text-tertiary)',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        Model: {err.model}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Hash size={11} />
                        {err.count} occurrences
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Clock size={11} />
                        {err.lastSeen}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
