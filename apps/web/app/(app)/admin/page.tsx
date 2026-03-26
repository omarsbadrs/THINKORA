'use client';

import React from 'react';

/* ------------------------------------------------------------------ */
/*  Admin page                                                        */
/* ------------------------------------------------------------------ */
const panelStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--color-border-card)',
  borderRadius: 'var(--radius-lg)',
  padding: 24,
};

const panelTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--color-text)',
  marginBottom: 12,
};

const placeholderText: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--color-text-quaternary)',
  lineHeight: 1.6,
};

/* ------------------------------------------------------------------ */
/*  Tiny health indicator                                             */
/* ------------------------------------------------------------------ */
function StatusRow({
  label,
  status,
}: {
  label: string;
  status: 'ok' | 'warn' | 'error';
}) {
  const color =
    status === 'ok' ? '#22c55e' : status === 'warn' ? '#f59e0b' : '#ef4444';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid var(--color-border-card)',
        fontSize: 13,
        color: 'var(--color-text-secondary)',
      }}
    >
      <span>{label}</span>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 500,
          color,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 6px ${color}`,
            display: 'inline-block',
          }}
        />
        {status === 'ok' ? 'Healthy' : status === 'warn' ? 'Degraded' : 'Down'}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default function AdminPage() {
  return (
    <div className="page-scroll" style={{ width: '100%' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px' }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--color-text)',
            marginBottom: 4,
          }}
        >
          Admin
        </h1>
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-text-tertiary)',
            marginBottom: 24,
          }}
        >
          System administration and operational monitoring.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {/* System Health */}
          <div style={panelStyle}>
            <h2 style={panelTitle}>System Health</h2>
            <StatusRow label="API Server" status="ok" />
            <StatusRow label="Database (Supabase)" status="ok" />
            <StatusRow label="Vector Store (pgvector)" status="ok" />
            <StatusRow label="Redis Cache" status="warn" />
            <StatusRow label="Background Workers" status="ok" />
          </div>

          {/* Connector Status */}
          <div style={panelStyle}>
            <h2 style={panelTitle}>Connector Status</h2>
            <StatusRow label="Notion MCP" status="ok" />
            <StatusRow label="Supabase MCP" status="warn" />
            <StatusRow label="OpenRouter" status="error" />
            <StatusRow label="GitHub MCP" status="ok" />
            <StatusRow label="Slack MCP" status="ok" />
          </div>

          {/* Ingestion Jobs */}
          <div style={panelStyle}>
            <h2 style={panelTitle}>Ingestion Jobs</h2>
            <p style={placeholderText}>
              3 jobs completed in the last hour.
              <br />
              1 job currently processing (12 / 48 chunks).
              <br />
              0 jobs failed.
            </p>
            <div
              style={{
                marginTop: 12,
                height: 6,
                borderRadius: 3,
                background: 'var(--color-fill)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '25%',
                  height: '100%',
                  borderRadius: 3,
                  background: 'linear-gradient(90deg, #f59e0b, #ec8435)',
                  transition: 'width 0.5s var(--ease-out)',
                }}
              />
            </div>
          </div>

          {/* Usage Stats */}
          <div style={panelStyle}>
            <h2 style={panelTitle}>Usage Stats</h2>
            <p style={placeholderText}>
              Active users today: <strong style={{ color: 'var(--color-text)' }}>14</strong>
              <br />
              Requests (24 h): <strong style={{ color: 'var(--color-text)' }}>1,247</strong>
              <br />
              Tokens consumed (24 h): <strong style={{ color: 'var(--color-text)' }}>820 K</strong>
              <br />
              Estimated cost (24 h): <strong style={{ color: 'var(--color-text)' }}>$12.40</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
