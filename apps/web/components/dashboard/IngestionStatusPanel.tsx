'use client';

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

interface IngestionJob {
  id: string;
  file: string;
  status: 'completed' | 'processing' | 'queued' | 'failed';
  progress: number;
  started: string;
  duration: string;
}

const DEMO_JOBS: IngestionJob[] = [
  { id: 'job-001', file: 'quarterly_report_Q1_2026.pdf', status: 'processing', progress: 68, started: '14:28:05', duration: '4m 21s' },
  { id: 'job-002', file: 'product_roadmap.docx', status: 'processing', progress: 42, started: '14:29:30', duration: '2m 56s' },
  { id: 'job-003', file: 'engineering_wiki_export.md', status: 'queued', progress: 0, started: '14:31:00', duration: '—' },
  { id: 'job-004', file: 'customer_feedback_march.csv', status: 'completed', progress: 100, started: '14:10:22', duration: '8m 14s' },
  { id: 'job-005', file: 'api_documentation_v3.html', status: 'completed', progress: 100, started: '14:05:10', duration: '5m 02s' },
  { id: 'job-006', file: 'internal_policies.pdf', status: 'failed', progress: 34, started: '13:58:40', duration: '2m 18s' },
  { id: 'job-007', file: 'meeting_notes_2026-03-25.md', status: 'completed', progress: 100, started: '13:45:00', duration: '1m 05s' },
  { id: 'job-008', file: 'design_system_tokens.json', status: 'completed', progress: 100, started: '13:40:12', duration: '0m 42s' },
];

const STATUS_STYLES: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  completed: { bg: 'rgba(52,211,153,0.12)', color: '#34d399', label: 'Completed' },
  processing: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa', label: 'Processing' },
  queued: { bg: 'rgba(255,255,255,0.06)', color: 'var(--color-text-tertiary)', label: 'Queued' },
  failed: { bg: 'rgba(248,113,113,0.12)', color: '#f87171', label: 'Failed' },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function IngestionStatusPanel() {
  const active = DEMO_JOBS.filter(
    (j) => j.status === 'processing' || j.status === 'queued',
  ).length;

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 16,
        }}
      >
        <div className="dash-card">
          <div className="dash-card-title">Active Jobs</div>
          <div className="dash-card-value" style={{ color: '#60a5fa' }}>
            {active}
          </div>
        </div>
        <div className="dash-card">
          <div className="dash-card-title">Completed Today</div>
          <div className="dash-card-value" style={{ color: '#34d399' }}>
            {DEMO_JOBS.filter((j) => j.status === 'completed').length}
          </div>
        </div>
        <div className="dash-card">
          <div className="dash-card-title">Failed</div>
          <div className="dash-card-value" style={{ color: '#f87171' }}>
            {DEMO_JOBS.filter((j) => j.status === 'failed').length}
          </div>
        </div>
      </div>

      {/* Jobs table */}
      <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border-card)',
          }}
        >
          <div className="dash-card-title" style={{ marginBottom: 0 }}>
            Ingestion Jobs
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
                {['File', 'Status', 'Progress', 'Started', 'Duration'].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 14px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--color-text-tertiary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        textAlign: 'left',
                        borderBottom: '1px solid var(--color-border)',
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {DEMO_JOBS.map((job) => {
                const ss = STATUS_STYLES[job.status];
                return (
                  <tr
                    key={job.id}
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
                    {/* File */}
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 13,
                        color: 'var(--color-text)',
                        fontWeight: 500,
                        borderBottom: '1px solid var(--color-border-card)',
                        maxWidth: 260,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {job.file}
                    </td>

                    {/* Status badge */}
                    <td
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--color-border-card)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          background: ss.bg,
                          color: ss.color,
                          textTransform: 'capitalize',
                        }}
                      >
                        {ss.label}
                      </span>
                    </td>

                    {/* Progress bar */}
                    <td
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--color-border-card)',
                        minWidth: 140,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            height: 6,
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
                              transition: 'width 0.3s var(--ease-out)',
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--color-text-secondary)',
                            fontVariantNumeric: 'tabular-nums',
                            minWidth: 32,
                            textAlign: 'right',
                          }}
                        >
                          {job.progress}%
                        </span>
                      </div>
                    </td>

                    {/* Started */}
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 13,
                        color: 'var(--color-text-secondary)',
                        borderBottom: '1px solid var(--color-border-card)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {job.started}
                    </td>

                    {/* Duration */}
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 13,
                        color: 'var(--color-text-secondary)',
                        borderBottom: '1px solid var(--color-border-card)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {job.duration}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
