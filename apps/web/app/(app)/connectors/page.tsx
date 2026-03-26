'use client';

import React, { useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Demo connector data                                               */
/* ------------------------------------------------------------------ */
interface Connector {
  id: string;
  name: string;
  description: string;
  connected: boolean;
  health: 'healthy' | 'degraded' | 'down' | 'unknown';
}

const initial: Connector[] = [
  {
    id: 'notion',
    name: 'Notion MCP',
    description: 'Sync pages, databases, and comments from Notion workspaces.',
    connected: true,
    health: 'healthy',
  },
  {
    id: 'supabase',
    name: 'Supabase MCP',
    description: 'Read/write Supabase tables, storage buckets, and edge functions.',
    connected: true,
    health: 'degraded',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Multi-provider LLM gateway — GPT, Claude, Gemini, LLaMA, and more.',
    connected: false,
    health: 'unknown',
  },
];

/* ------------------------------------------------------------------ */
/*  Health badge                                                      */
/* ------------------------------------------------------------------ */
const healthColors: Record<Connector['health'], string> = {
  healthy: '#22c55e',
  degraded: '#f59e0b',
  down: '#ef4444',
  unknown: 'var(--color-text-quaternary)',
};

function HealthDot({ health }: { health: Connector['health'] }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: healthColors[health],
        boxShadow: `0 0 6px ${healthColors[health]}`,
        marginRight: 6,
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>(initial);

  const toggle = (id: string) => {
    setConnectors((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              connected: !c.connected,
              health: !c.connected ? 'healthy' : 'unknown',
            }
          : c,
      ),
    );
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--color-border-card)',
    borderRadius: 'var(--radius-lg)',
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    transition: 'all 0.2s var(--ease-out)',
  };

  return (
    <div className="page-scroll" style={{ width: '100%' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--color-text)',
            marginBottom: 4,
          }}
        >
          Connectors
        </h1>
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-text-tertiary)',
            marginBottom: 24,
          }}
        >
          Manage MCP servers and third-party integrations.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {connectors.map((c) => (
            <div key={c.id} style={cardStyle}>
              {/* Title + health */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</span>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: 12,
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  <HealthDot health={c.health} />
                  {c.health}
                </span>
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                  flex: 1,
                }}
              >
                {c.description}
              </p>

              {/* Status + action */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: c.connected ? '#22c55e' : 'var(--color-text-quaternary)',
                  }}
                >
                  {c.connected ? 'Connected' : 'Disconnected'}
                </span>

                <button
                  onClick={() => toggle(c.id)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid',
                    borderColor: c.connected
                      ? 'rgba(239,68,68,0.4)'
                      : 'var(--color-primary-border)',
                    background: c.connected
                      ? 'rgba(239,68,68,0.08)'
                      : 'var(--color-primary-bg)',
                    color: c.connected ? '#ef4444' : 'var(--color-primary)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'var(--font)',
                    transition: 'all 0.2s',
                  }}
                >
                  {c.connected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
