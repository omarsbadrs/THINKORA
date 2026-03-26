'use client';

import { useState } from 'react';
import { Search, Clock, Target, Layers, Filter } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

interface RetrievalChunk {
  id: string;
  source: string;
  text: string;
  relevanceScore: number;
  deduplicated: boolean;
  includedInContext: boolean;
}

interface RetrievalTrace {
  id: string;
  query: string;
  timestamp: string;
  totalChunks: number;
  chunksAfterDedup: number;
  chunksInFinalContext: number;
  timeBreakdown: { stage: string; durationMs: number }[];
  chunks: RetrievalChunk[];
}

const DEMO_TRACES: RetrievalTrace[] = [
  {
    id: 'ret-001',
    query: 'What were the Q1 2026 revenue figures by product line?',
    timestamp: '2026-03-26 14:32:05',
    totalChunks: 12,
    chunksAfterDedup: 9,
    chunksInFinalContext: 5,
    timeBreakdown: [
      { stage: 'Query Embedding', durationMs: 8 },
      { stage: 'Vector Search', durationMs: 22 },
      { stage: 'Re-ranking', durationMs: 14 },
      { stage: 'Deduplication', durationMs: 3 },
      { stage: 'Context Assembly', durationMs: 2 },
    ],
    chunks: [
      { id: 'c1', source: 'quarterly_report_Q1_2026.pdf (p.4)', text: 'Total revenue for Q1 2026 reached $42.3M, representing a 15% year-over-year increase...', relevanceScore: 0.96, deduplicated: false, includedInContext: true },
      { id: 'c2', source: 'quarterly_report_Q1_2026.pdf (p.5)', text: 'Product line breakdown: Enterprise SaaS $24.1M (+18%), SMB $12.8M (+11%), Services $5.4M (+9%)...', relevanceScore: 0.94, deduplicated: false, includedInContext: true },
      { id: 'c3', source: 'quarterly_report_Q1_2026.pdf (p.3)', text: 'Executive summary: Q1 exceeded expectations with strong growth across all segments...', relevanceScore: 0.88, deduplicated: false, includedInContext: true },
      { id: 'c4', source: 'investor_deck_march_2026.pdf (p.12)', text: 'Revenue trends show consistent acceleration since Q3 2025, with Q1 2026 being the strongest quarter...', relevanceScore: 0.85, deduplicated: false, includedInContext: true },
      { id: 'c5', source: 'quarterly_report_Q1_2026.pdf (p.4)', text: 'Total revenue for Q1 2026 reached $42.3M, with enterprise contributing the largest share...', relevanceScore: 0.93, deduplicated: true, includedInContext: false },
      { id: 'c6', source: 'board_meeting_notes_mar.md', text: 'Q1 revenue discussion: Management highlighted product-led growth in enterprise segment...', relevanceScore: 0.82, deduplicated: false, includedInContext: true },
      { id: 'c7', source: 'quarterly_report_Q4_2025.pdf (p.4)', text: 'Q4 2025 revenue reached $38.2M, setting the stage for continued growth into Q1 2026...', relevanceScore: 0.72, deduplicated: false, includedInContext: false },
      { id: 'c8', source: 'investor_deck_march_2026.pdf (p.13)', text: 'Revenue by product line chart data for Q1 2026, showing breakdowns...', relevanceScore: 0.91, deduplicated: true, includedInContext: false },
      { id: 'c9', source: 'quarterly_report_Q1_2026.pdf (p.8)', text: 'Regional revenue breakdown: North America $28.4M, EMEA $9.2M, APAC $4.7M...', relevanceScore: 0.78, deduplicated: false, includedInContext: false },
    ],
  },
  {
    id: 'ret-002',
    query: 'How does the new authentication flow work for SSO users?',
    timestamp: '2026-03-26 14:29:30',
    totalChunks: 8,
    chunksAfterDedup: 7,
    chunksInFinalContext: 4,
    timeBreakdown: [
      { stage: 'Query Embedding', durationMs: 7 },
      { stage: 'Vector Search', durationMs: 18 },
      { stage: 'Re-ranking', durationMs: 11 },
      { stage: 'Deduplication', durationMs: 2 },
      { stage: 'Context Assembly', durationMs: 1 },
    ],
    chunks: [
      { id: 'd1', source: 'api_documentation_v3.html (section: auth)', text: 'SSO authentication flow: 1. User clicks SSO login 2. Redirect to IdP 3. SAML assertion returned 4. Token exchange...', relevanceScore: 0.97, deduplicated: false, includedInContext: true },
      { id: 'd2', source: 'engineering_wiki_export.md (auth-flows)', text: 'The SSO implementation uses SAML 2.0 with PKCE extension for enhanced security...', relevanceScore: 0.92, deduplicated: false, includedInContext: true },
      { id: 'd3', source: 'api_documentation_v3.html (section: tokens)', text: 'After SSO authentication, a JWT access token is issued with a 1-hour TTL and a refresh token with 30-day TTL...', relevanceScore: 0.89, deduplicated: false, includedInContext: true },
      { id: 'd4', source: 'internal_policies.pdf (p.22)', text: 'SSO integration requirements: All enterprise customers must use SSO with approved identity providers...', relevanceScore: 0.81, deduplicated: false, includedInContext: true },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function RetrievalTracePanel() {
  const [selectedTrace, setSelectedTrace] = useState<RetrievalTrace>(DEMO_TRACES[0]);
  const [showDeduplicated, setShowDeduplicated] = useState(true);

  const totalTimeMs = selectedTrace.timeBreakdown.reduce(
    (s, t) => s + t.durationMs,
    0,
  );

  const displayedChunks = showDeduplicated
    ? selectedTrace.chunks
    : selectedTrace.chunks.filter((c) => !c.deduplicated);

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
        Retrieval Trace Debugger
      </div>

      {/* Trace selector */}
      <div className="dash-card" style={{ padding: 14 }}>
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
          }}
        >
          {DEMO_TRACES.map((trace) => (
            <button
              key={trace.id}
              onClick={() => setSelectedTrace(trace)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${
                  selectedTrace.id === trace.id
                    ? 'var(--color-primary-border)'
                    : 'var(--color-border)'
                }`,
                background:
                  selectedTrace.id === trace.id
                    ? 'var(--color-primary-bg)'
                    : 'transparent',
                color:
                  selectedTrace.id === trace.id
                    ? 'var(--color-primary)'
                    : 'var(--color-text-secondary)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font)',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {trace.id}
            </button>
          ))}
        </div>
      </div>

      {/* Query */}
      <div className="dash-card">
        <div className="dash-card-title">Query</div>
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-fill-tertiary)',
            fontSize: 14,
            color: 'var(--color-text)',
            fontWeight: 500,
            lineHeight: 1.5,
          }}
        >
          <Search
            size={14}
            style={{
              display: 'inline',
              verticalAlign: 'middle',
              marginRight: 8,
              color: 'var(--color-primary)',
            }}
          />
          {selectedTrace.query}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            marginTop: 8,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {selectedTrace.timestamp}
        </div>
      </div>

      {/* Summary stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        <div className="dash-card" style={{ padding: 14 }}>
          <div className="dash-card-title">Total Chunks</div>
          <div className="dash-card-value" style={{ fontSize: 22 }}>
            {selectedTrace.totalChunks}
          </div>
        </div>
        <div className="dash-card" style={{ padding: 14 }}>
          <div className="dash-card-title">After Dedup</div>
          <div className="dash-card-value" style={{ fontSize: 22 }}>
            {selectedTrace.chunksAfterDedup}
          </div>
        </div>
        <div className="dash-card" style={{ padding: 14 }}>
          <div className="dash-card-title">In Context</div>
          <div className="dash-card-value" style={{ fontSize: 22, color: '#34d399' }}>
            {selectedTrace.chunksInFinalContext}
          </div>
        </div>
        <div className="dash-card" style={{ padding: 14 }}>
          <div className="dash-card-title">Total Time</div>
          <div className="dash-card-value" style={{ fontSize: 22 }}>
            {totalTimeMs}ms
          </div>
        </div>
      </div>

      {/* Time breakdown */}
      <div className="dash-card">
        <div className="dash-card-title" style={{ marginBottom: 14 }}>
          <Clock
            size={13}
            style={{
              display: 'inline',
              verticalAlign: 'middle',
              marginRight: 6,
            }}
          />
          Time Breakdown
        </div>
        {selectedTrace.timeBreakdown.map((stage) => (
          <div
            key={stage.stage}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                minWidth: 130,
              }}
            >
              {stage.stage}
            </span>
            <div
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                background: 'var(--color-fill-tertiary)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${(stage.durationMs / totalTimeMs) * 100}%`,
                  borderRadius: 4,
                  background: 'var(--color-primary)',
                  transition: 'width 0.3s var(--ease-out)',
                }}
              />
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-text)',
                minWidth: 36,
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {stage.durationMs}ms
            </span>
          </div>
        ))}
      </div>

      {/* Chunks retrieved */}
      <div className="dash-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div className="dash-card-title" style={{ marginBottom: 0 }}>
            <Layers
              size={13}
              style={{
                display: 'inline',
                verticalAlign: 'middle',
                marginRight: 6,
              }}
            />
            Chunks Retrieved
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={showDeduplicated}
              onChange={(e) => setShowDeduplicated(e.target.checked)}
              style={{
                accentColor: 'var(--color-primary)',
                width: 14,
                height: 14,
              }}
            />
            Show deduplicated
          </label>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {displayedChunks.map((chunk) => (
            <div
              key={chunk.id}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: chunk.deduplicated
                  ? 'rgba(248,113,113,0.04)'
                  : chunk.includedInContext
                    ? 'rgba(52,211,153,0.04)'
                    : 'var(--color-fill-tertiary)',
                border: `1px solid ${
                  chunk.deduplicated
                    ? 'rgba(248,113,113,0.12)'
                    : chunk.includedInContext
                      ? 'rgba(52,211,153,0.12)'
                      : 'var(--color-border-card)'
                }`,
                opacity: chunk.deduplicated ? 0.6 : 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  {chunk.source}
                </span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {chunk.deduplicated && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(248,113,113,0.12)',
                        color: '#f87171',
                      }}
                    >
                      DEDUP
                    </span>
                  )}
                  {chunk.includedInContext && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(52,211,153,0.12)',
                        color: '#34d399',
                      }}
                    >
                      IN CONTEXT
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color:
                        chunk.relevanceScore >= 0.9
                          ? '#34d399'
                          : chunk.relevanceScore >= 0.8
                            ? '#60a5fa'
                            : '#fbbf24',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <Target
                      size={10}
                      style={{
                        display: 'inline',
                        verticalAlign: 'middle',
                        marginRight: 3,
                      }}
                    />
                    {chunk.relevanceScore.toFixed(2)}
                  </span>
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                  textDecoration: chunk.deduplicated ? 'line-through' : 'none',
                }}
              >
                {chunk.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
