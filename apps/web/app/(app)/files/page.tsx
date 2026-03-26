'use client';

import React, { useState, type DragEvent } from 'react';

/* ------------------------------------------------------------------ */
/*  Demo file data                                                    */
/* ------------------------------------------------------------------ */
interface FileEntry {
  id: string;
  name: string;
  type: string;
  size: string;
  status: 'processed' | 'processing' | 'failed';
  date: string;
}

const demoFiles: FileEntry[] = [
  {
    id: '1',
    name: 'product-roadmap.pdf',
    type: 'PDF',
    size: '2.4 MB',
    status: 'processed',
    date: '2026-03-24',
  },
  {
    id: '2',
    name: 'meeting-notes-q1.md',
    type: 'Markdown',
    size: '48 KB',
    status: 'processed',
    date: '2026-03-23',
  },
  {
    id: '3',
    name: 'architecture-diagram.png',
    type: 'Image',
    size: '1.1 MB',
    status: 'processing',
    date: '2026-03-26',
  },
  {
    id: '4',
    name: 'api-spec.yaml',
    type: 'YAML',
    size: '96 KB',
    status: 'failed',
    date: '2026-03-22',
  },
  {
    id: '5',
    name: 'user-research.csv',
    type: 'CSV',
    size: '320 KB',
    status: 'processed',
    date: '2026-03-20',
  },
];

/* ------------------------------------------------------------------ */
/*  Status badge                                                      */
/* ------------------------------------------------------------------ */
const statusColors: Record<FileEntry['status'], { bg: string; fg: string }> = {
  processed: { bg: 'rgba(34,197,94,0.10)', fg: '#22c55e' },
  processing: { bg: 'rgba(245,158,11,0.10)', fg: '#f59e0b' },
  failed: { bg: 'rgba(239,68,68,0.10)', fg: '#ef4444' },
};

function StatusBadge({ status }: { status: FileEntry['status'] }) {
  const { bg, fg } = statusColors[status];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 'var(--radius-pill)',
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color: fg,
        textTransform: 'capitalize',
      }}
    >
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default function FilesPage() {
  const [dragOver, setDragOver] = useState(false);
  const [files] = useState<FileEntry[]>(demoFiles);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    // TODO: handle file upload
  };

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--color-text-quaternary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid var(--color-border)',
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 14px',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
    borderBottom: '1px solid var(--color-border-card)',
  };

  return (
    <div className="page-scroll" style={{ width: '100%' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--color-text)',
            marginBottom: 4,
          }}
        >
          Files
        </h1>
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-text-tertiary)',
            marginBottom: 24,
          }}
        >
          Upload documents for RAG ingestion and embedding.
        </p>

        {/* Upload area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)',
            background: dragOver ? 'var(--color-primary-bg)' : 'var(--bg-card)',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.25s var(--ease-out)',
            marginBottom: 28,
          }}
        >
          <div
            style={{
              fontSize: 32,
              marginBottom: 8,
              opacity: 0.5,
            }}
          >
            &#8682;
          </div>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Drag &amp; drop files here, or{' '}
            <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
              browse
            </span>
          </p>
          <p
            style={{
              fontSize: 12,
              color: 'var(--color-text-quaternary)',
              marginTop: 4,
            }}
          >
            PDF, Markdown, YAML, CSV, images &mdash; up to 25 MB each
          </p>
        </div>

        {/* File list table */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--color-border-card)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Size</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Date</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr
                  key={f.id}
                  style={{ transition: 'background 0.15s' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--color-fill-tertiary)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <td style={{ ...tdStyle, color: 'var(--color-text)', fontWeight: 500 }}>
                    {f.name}
                  </td>
                  <td style={tdStyle}>{f.type}</td>
                  <td style={tdStyle}>{f.size}</td>
                  <td style={tdStyle}>
                    <StatusBadge status={f.status} />
                  </td>
                  <td style={tdStyle}>{f.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
