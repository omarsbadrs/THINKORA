'use client';

import { RefreshCw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

interface ConnectorHealth {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  uptimePercent: number;
  retryStatus: 'idle' | 'retrying' | 'exhausted';
  retryCount: number;
  errorLog: { time: string; message: string }[];
}

const CONNECTORS: ConnectorHealth[] = [
  {
    id: 'notion-mcp',
    name: 'Notion MCP',
    status: 'healthy',
    lastCheck: '2026-03-26 14:31:45',
    uptimePercent: 99.97,
    retryStatus: 'idle',
    retryCount: 0,
    errorLog: [],
  },
  {
    id: 'supabase-mcp',
    name: 'Supabase MCP',
    status: 'healthy',
    lastCheck: '2026-03-26 14:31:42',
    uptimePercent: 99.82,
    retryStatus: 'idle',
    retryCount: 0,
    errorLog: [
      { time: '2026-03-26 08:12:03', message: 'Connection timeout — resolved after retry' },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    status: 'degraded',
    lastCheck: '2026-03-26 14:31:40',
    uptimePercent: 97.45,
    retryStatus: 'retrying',
    retryCount: 3,
    errorLog: [
      { time: '2026-03-26 14:28:11', message: '502 Bad Gateway — upstream provider timeout' },
      { time: '2026-03-26 14:15:44', message: 'Rate limit exceeded (429) — backing off 30s' },
      { time: '2026-03-26 13:52:18', message: '502 Bad Gateway — intermittent connectivity' },
    ],
  },
];

const STATUS_META: Record<
  string,
  { label: string; color: string; Icon: typeof CheckCircle }
> = {
  healthy: { label: 'Healthy', color: '#34d399', Icon: CheckCircle },
  degraded: { label: 'Degraded', color: '#fbbf24', Icon: AlertTriangle },
  down: { label: 'Down', color: '#f87171', Icon: XCircle },
};

const RETRY_META: Record<string, { label: string; color: string }> = {
  idle: { label: 'Idle', color: 'var(--color-text-tertiary)' },
  retrying: { label: 'Retrying', color: '#fbbf24' },
  exhausted: { label: 'Retries Exhausted', color: '#f87171' },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ConnectorHealthPanel() {
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
        Connector Health Monitoring
      </div>

      {CONNECTORS.map((conn) => {
        const sm = STATUS_META[conn.status];
        const rm = RETRY_META[conn.retryStatus];
        const StatusIcon = sm.Icon;

        return (
          <div className="dash-card" key={conn.id}>
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <StatusIcon size={18} style={{ color: sm.color }} />
                <div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--color-text)',
                    }}
                  >
                    {conn.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: sm.color,
                      fontWeight: 500,
                    }}
                  >
                    {sm.label}
                  </div>
                </div>
              </div>
              <div
                style={{
                  textAlign: 'right',
                  fontSize: 12,
                  color: 'var(--color-text-tertiary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                  <RefreshCw size={11} />
                  Last check
                </div>
                <div
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--color-text-secondary)',
                    marginTop: 2,
                  }}
                >
                  {conn.lastCheck}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                marginBottom: 16,
              }}
            >
              {/* Uptime */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-fill-tertiary)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    marginBottom: 4,
                  }}
                >
                  Uptime
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color:
                      conn.uptimePercent >= 99.9
                        ? '#34d399'
                        : conn.uptimePercent >= 99
                          ? '#fbbf24'
                          : '#f87171',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {conn.uptimePercent}%
                </div>
              </div>

              {/* Retry Status */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-fill-tertiary)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    marginBottom: 4,
                  }}
                >
                  Retry Status
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: rm.color,
                  }}
                >
                  {rm.label}
                </div>
              </div>

              {/* Retry Count */}
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-fill-tertiary)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    marginBottom: 4,
                  }}
                >
                  Retries
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--color-text)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {conn.retryCount}
                </div>
              </div>
            </div>

            {/* Error log */}
            {conn.errorLog.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    marginBottom: 8,
                  }}
                >
                  Recent Errors
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {conn.errorLog.map((err, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius)',
                        background: 'rgba(248,113,113,0.06)',
                        border: '1px solid rgba(248,113,113,0.1)',
                        fontSize: 12,
                      }}
                    >
                      <div
                        style={{
                          color: 'var(--color-text-tertiary)',
                          fontVariantNumeric: 'tabular-nums',
                          marginBottom: 3,
                        }}
                      >
                        {err.time}
                      </div>
                      <div style={{ color: 'var(--color-text-secondary)' }}>
                        {err.message}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {conn.errorLog.length === 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-tertiary)',
                  fontStyle: 'italic',
                }}
              >
                No recent errors
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
