'use client';

import { RefreshCw, FileText, AlertTriangle } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

interface Connector {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'degraded' | 'disconnected';
  lastSync: string;
  docsSynced: number;
  errorCount: number;
  description: string;
}

const CONNECTORS: Connector[] = [
  {
    id: 'notion-mcp',
    name: 'Notion MCP',
    type: 'Knowledge Base',
    status: 'connected',
    lastSync: '3 min ago',
    docsSynced: 1247,
    errorCount: 0,
    description: 'Notion workspace via MCP protocol',
  },
  {
    id: 'supabase-mcp',
    name: 'Supabase MCP',
    type: 'Database',
    status: 'connected',
    lastSync: '1 min ago',
    docsSynced: 8432,
    errorCount: 2,
    description: 'Supabase vector store and metadata',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'Model Provider',
    status: 'degraded',
    lastSync: '15 min ago',
    docsSynced: 0,
    errorCount: 5,
    description: 'Multi-model routing gateway',
  },
];

const STATUS_META: Record<
  string,
  { label: string; color: string; dotColor: string }
> = {
  connected: { label: 'Connected', color: '#34d399', dotColor: '#34d399' },
  degraded: { label: 'Degraded', color: '#fbbf24', dotColor: '#fbbf24' },
  disconnected: { label: 'Disconnected', color: '#f87171', dotColor: '#f87171' },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ConnectorStatusPanel() {
  return (
    <div className="dashboard-grid">
      {CONNECTORS.map((conn) => {
        const sm = STATUS_META[conn.status];

        return (
          <div className="dash-card" key={conn.id}>
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
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
                    fontSize: 12,
                    color: 'var(--color-text-tertiary)',
                    marginTop: 2,
                  }}
                >
                  {conn.type}
                </div>
              </div>
              {/* Status dot */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: sm.dotColor,
                    boxShadow: `0 0 6px ${sm.dotColor}`,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: sm.color,
                  }}
                >
                  {sm.label}
                </span>
              </div>
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                marginBottom: 16,
                lineHeight: 1.4,
              }}
            >
              {conn.description}
            </div>

            {/* Stats */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  <RefreshCw size={12} />
                  Last Sync
                </span>
                <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>
                  {conn.lastSync}
                </span>
              </div>

              {conn.docsSynced > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    <FileText size={12} />
                    Documents Synced
                  </span>
                  <span
                    style={{ color: 'var(--color-text)', fontWeight: 500 }}
                  >
                    {conn.docsSynced.toLocaleString()}
                  </span>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  <AlertTriangle size={12} />
                  Errors
                </span>
                <span
                  style={{
                    color: conn.errorCount > 0 ? '#f87171' : '#34d399',
                    fontWeight: 500,
                  }}
                >
                  {conn.errorCount}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
