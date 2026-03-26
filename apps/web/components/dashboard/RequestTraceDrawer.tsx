'use client';

import { X } from 'lucide-react';
import type { RequestTrace } from './LogsPanel';

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--color-text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function InfoRow({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0',
        borderBottom: '1px solid var(--color-border-card)',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: color ?? 'var(--color-text)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  success: '#34d399',
  error: '#f87171',
  timeout: '#fbbf24',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function RequestTraceDrawer({
  trace,
  onClose,
}: {
  trace: RequestTrace;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 299,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 460,
          maxWidth: '100vw',
          height: '100vh',
          background: 'var(--bg-container)',
          borderLeft: '1px solid var(--color-border)',
          zIndex: 300,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInLeft 0.3s var(--ease-out)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <div>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--color-text)',
                margin: 0,
              }}
            >
              Request Trace
            </h3>
            <div
              style={{
                fontSize: 12,
                color: 'var(--color-text-tertiary)',
                marginTop: 2,
              }}
            >
              {trace.id}
            </div>
          </div>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {/* Prompt metadata */}
          <section>
            <SectionLabel>Prompt Preview</SectionLabel>
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-fill-tertiary)',
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                fontStyle: 'italic',
              }}
            >
              {trace.promptPreview}
            </div>
          </section>

          {/* Routing info */}
          <section>
            <SectionLabel>Routing</SectionLabel>
            <InfoRow label="Selected Model" value={trace.model} />
            <InfoRow label="Routed Model" value={trace.routedModel} color="var(--color-primary)" />
            <InfoRow label="Routing Mode" value={trace.routingMode} />
            <InfoRow
              label="Fallback Used"
              value={trace.fallbackUsed ? 'Yes' : 'No'}
              color={trace.fallbackUsed ? '#fbbf24' : '#34d399'}
            />
            {trace.fallbackChain.length > 0 && (
              <InfoRow
                label="Fallback Chain"
                value={trace.fallbackChain.join(' -> ')}
              />
            )}
          </section>

          {/* Performance */}
          <section>
            <SectionLabel>Performance</SectionLabel>
            <InfoRow label="Total Tokens" value={trace.tokens.toLocaleString()} />
            <InfoRow label="Prompt Tokens" value={trace.promptTokens.toLocaleString()} />
            <InfoRow label="Completion Tokens" value={trace.completionTokens.toLocaleString()} />
            <InfoRow label="Latency" value={`${trace.latency}ms`} />
            <InfoRow label="Cost" value={`$${trace.cost.toFixed(4)}`} />
            <InfoRow
              label="Status"
              value={
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: `${STATUS_COLORS[trace.status]}20`,
                    color: STATUS_COLORS[trace.status],
                    textTransform: 'uppercase',
                  }}
                >
                  {trace.status}
                </span>
              }
            />
          </section>

          {/* Source retrieval */}
          <section>
            <SectionLabel>Source Retrieval</SectionLabel>
            <InfoRow label="Chunks Retrieved" value={trace.sourceChunks} />
            <InfoRow
              label="Avg Relevance"
              value={trace.avgRelevance > 0 ? trace.avgRelevance.toFixed(2) : '—'}
            />
            <InfoRow label="Citations" value={trace.citations} />
          </section>

          {/* Tool calls */}
          <section>
            <SectionLabel>Tool Calls</SectionLabel>
            {trace.toolCalls.length > 0 ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {trace.toolCalls.map((tool) => (
                  <span
                    key={tool}
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      padding: '4px 10px',
                      borderRadius: 'var(--radius)',
                      background: 'var(--color-primary-bg)',
                      color: 'var(--color-primary)',
                      border: '1px solid var(--color-primary-border)',
                    }}
                  >
                    {tool}
                  </span>
                ))}
              </div>
            ) : (
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--color-text-tertiary)',
                }}
              >
                No tool calls in this request
              </div>
            )}
          </section>

          {/* Answer status */}
          <section>
            <SectionLabel>Answer Status</SectionLabel>
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background:
                  trace.status === 'success'
                    ? 'rgba(52,211,153,0.08)'
                    : trace.status === 'error'
                      ? 'rgba(248,113,113,0.08)'
                      : 'rgba(251,191,36,0.08)',
                border: `1px solid ${STATUS_COLORS[trace.status]}30`,
                fontSize: 13,
                color: STATUS_COLORS[trace.status],
                fontWeight: 500,
              }}
            >
              {trace.status === 'success'
                ? 'Response generated successfully'
                : trace.status === 'error'
                  ? 'Request failed with error'
                  : 'Request timed out before completion'}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
