'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

interface IngestionJob {
  id: string;
  fileName: string;
  status: 'completed' | 'processing' | 'queued' | 'failed';
  stage: 'parsing' | 'chunking' | 'embedding' | 'indexing' | 'done' | 'error';
  progress: number;
  started: string;
  completed: string;
  retryCount: number;
  errorDetails: string | null;
}

const DEMO_JOBS: IngestionJob[] = [
  { id: 'ingest-001', fileName: 'quarterly_report_Q1_2026.pdf', status: 'processing', stage: 'embedding', progress: 68, started: '2026-03-26 14:28:05', completed: '—', retryCount: 0, errorDetails: null },
  { id: 'ingest-002', fileName: 'product_roadmap.docx', status: 'processing', stage: 'chunking', progress: 42, started: '2026-03-26 14:29:30', completed: '—', retryCount: 0, errorDetails: null },
  { id: 'ingest-003', fileName: 'engineering_wiki_export.md', status: 'queued', stage: 'parsing', progress: 0, started: '2026-03-26 14:31:00', completed: '—', retryCount: 0, errorDetails: null },
  { id: 'ingest-004', fileName: 'customer_feedback_march.csv', status: 'completed', stage: 'done', progress: 100, started: '2026-03-26 14:10:22', completed: '2026-03-26 14:18:36', retryCount: 0, errorDetails: null },
  { id: 'ingest-005', fileName: 'api_documentation_v3.html', status: 'completed', stage: 'done', progress: 100, started: '2026-03-26 14:05:10', completed: '2026-03-26 14:10:12', retryCount: 1, errorDetails: null },
  { id: 'ingest-006', fileName: 'internal_policies.pdf', status: 'failed', stage: 'error', progress: 34, started: '2026-03-26 13:58:40', completed: '2026-03-26 14:00:58', retryCount: 3, errorDetails: 'PDF parsing error: encrypted document requires password. Chunking aborted at page 12. Max retries (3) exhausted.' },
  { id: 'ingest-007', fileName: 'meeting_notes_2026-03-25.md', status: 'completed', stage: 'done', progress: 100, started: '2026-03-26 13:45:00', completed: '2026-03-26 13:46:05', retryCount: 0, errorDetails: null },
  { id: 'ingest-008', fileName: 'design_system_tokens.json', status: 'completed', stage: 'done', progress: 100, started: '2026-03-26 13:40:12', completed: '2026-03-26 13:40:54', retryCount: 0, errorDetails: null },
  { id: 'ingest-009', fileName: 'competitor_analysis.pdf', status: 'failed', stage: 'error', progress: 78, started: '2026-03-26 13:30:05', completed: '2026-03-26 13:38:22', retryCount: 2, errorDetails: 'Embedding service returned 503: Service temporarily unavailable. Retry scheduled.' },
  { id: 'ingest-010', fileName: 'sales_data_Q4_2025.xlsx', status: 'completed', stage: 'done', progress: 100, started: '2026-03-26 13:20:00', completed: '2026-03-26 13:28:44', retryCount: 0, errorDetails: null },
];

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  completed: { bg: 'rgba(52,211,153,0.12)', color: '#34d399', label: 'Completed' },
  processing: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa', label: 'Processing' },
  queued: { bg: 'rgba(255,255,255,0.06)', color: 'var(--color-text-tertiary)', label: 'Queued' },
  failed: { bg: 'rgba(248,113,113,0.12)', color: '#f87171', label: 'Failed' },
};

const STAGE_LABELS: Record<string, string> = {
  parsing: 'Parsing',
  chunking: 'Chunking',
  embedding: 'Embedding',
  indexing: 'Indexing',
  done: 'Done',
  error: 'Error',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function IngestionJobsPanel() {
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedJob((prev) => (prev === id ? null : id));
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--color-text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    textAlign: 'left',
    borderBottom: '1px solid var(--color-border)',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--color-text)',
    borderBottom: '1px solid var(--color-border-card)',
    fontVariantNumeric: 'tabular-nums',
  };

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
        Ingestion Jobs
      </div>

      {/* Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
        }}
      >
        {(['processing', 'queued', 'completed', 'failed'] as const).map((s) => {
          const count = DEMO_JOBS.filter((j) => j.status === s).length;
          const ss = STATUS_STYLES[s];
          return (
            <div className="dash-card" key={s} style={{ padding: 14 }}>
              <div className="dash-card-title">{ss.label}</div>
              <div
                className="dash-card-value"
                style={{ fontSize: 24, color: ss.color }}
              >
                {count}
              </div>
            </div>
          );
        })}
      </div>

      {/* Jobs table */}
      <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 28 }} />
                {['Job ID', 'File Name', 'Status', 'Stage', 'Progress', 'Started', 'Completed', 'Retries'].map(
                  (h) => (
                    <th key={h} style={thStyle}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {DEMO_JOBS.map((job) => {
                const ss = STATUS_STYLES[job.status];
                const isExpanded = expandedJob === job.id;
                const hasDetails = !!job.errorDetails;

                return (
                  <>
                    <tr
                      key={job.id}
                      onClick={() => hasDetails && toggleExpand(job.id)}
                      style={{
                        cursor: hasDetails ? 'pointer' : 'default',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background =
                          'var(--color-fill-tertiary)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background =
                          'transparent';
                      }}
                    >
                      {/* Expand icon */}
                      <td style={{ ...tdStyle, width: 28, padding: '10px 8px' }}>
                        {hasDetails &&
                          (isExpanded ? (
                            <ChevronDown size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                          ) : (
                            <ChevronRight size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                          ))}
                      </td>

                      <td style={{ ...tdStyle, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                        {job.id}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: 500,
                          maxWidth: 220,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {job.fileName}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: ss.bg,
                            color: ss.color,
                          }}
                        >
                          {ss.label}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            fontSize: 12,
                            color:
                              job.stage === 'error'
                                ? '#f87171'
                                : 'var(--color-text-secondary)',
                          }}
                        >
                          {STAGE_LABELS[job.stage]}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, minWidth: 120 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: 5,
                              borderRadius: 3,
                              background: 'var(--color-fill-tertiary)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${job.progress}%`,
                                borderRadius: 3,
                                background:
                                  job.status === 'failed'
                                    ? '#f87171'
                                    : job.status === 'completed'
                                      ? '#34d399'
                                      : '#60a5fa',
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--color-text-tertiary)',
                              minWidth: 28,
                              textAlign: 'right',
                            }}
                          >
                            {job.progress}%
                          </span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {job.started.slice(11)}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {job.completed === '—' ? '—' : job.completed.slice(11)}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            color: job.retryCount > 0 ? '#fbbf24' : 'var(--color-text-tertiary)',
                          }}
                        >
                          {job.retryCount}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded error details */}
                    {isExpanded && job.errorDetails && (
                      <tr key={`${job.id}-details`}>
                        <td
                          colSpan={9}
                          style={{
                            padding: '12px 20px 12px 46px',
                            borderBottom: '1px solid var(--color-border-card)',
                            background: 'rgba(248,113,113,0.04)',
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#f87171',
                              textTransform: 'uppercase',
                              letterSpacing: '0.4px',
                              marginBottom: 6,
                            }}
                          >
                            Error Details
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: 'var(--color-text-secondary)',
                              lineHeight: 1.5,
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {job.errorDetails}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
