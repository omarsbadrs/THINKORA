'use client';

import { useState } from 'react';
import {
  FileText,
  Code,
  AlertTriangle,
  Table,
  Layers,
  Eye,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

interface ParsedFile {
  id: string;
  fileName: string;
  detectedType: string;
  parserUsed: string;
  sectionsFound: number;
  tablesFound: number;
  chunkCount: number;
  warnings: string[];
  rawTextPreview: string;
}

const DEMO_FILES: ParsedFile[] = [
  {
    id: 'file-001',
    fileName: 'quarterly_report_Q1_2026.pdf',
    detectedType: 'application/pdf',
    parserUsed: 'PDFPlumber + OCR fallback',
    sectionsFound: 14,
    tablesFound: 6,
    chunkCount: 42,
    warnings: [
      'Page 8: Low-quality scan detected, OCR accuracy may be reduced',
      'Table on page 11: Complex merged cells — layout extraction approximate',
    ],
    rawTextPreview: `QUARTERLY REPORT — Q1 2026\n\nExecutive Summary\n\nThinkora Inc. delivered strong results in Q1 2026, with total revenue reaching $42.3M, representing a 15% year-over-year increase. Growth was driven by enterprise SaaS adoption and expanded partnerships.\n\nKey Highlights:\n- Revenue: $42.3M (+15% YoY)\n- ARR: $168M (+18% YoY)\n- Net Revenue Retention: 124%\n- Customers >$100K ARR: 87 (+12)\n\nProduct Line Performance\n\nEnterprise SaaS: $24.1M (+18%)\nSMB: $12.8M (+11%)\nProfessional Services: $5.4M (+9%)`,
  },
  {
    id: 'file-002',
    fileName: 'api_documentation_v3.html',
    detectedType: 'text/html',
    parserUsed: 'BeautifulSoup HTML Parser',
    sectionsFound: 28,
    tablesFound: 3,
    chunkCount: 64,
    warnings: [],
    rawTextPreview: `API Documentation v3\n\nAuthentication\n\nAll API requests require a valid bearer token in the Authorization header.\n\nEndpoints\n\nPOST /api/v3/chat/completions\nCreate a chat completion with model routing.\n\nRequest Body:\n{\n  "messages": [...],\n  "model": "auto",\n  "routing_mode": "balanced"\n}\n\nResponse:\n{\n  "id": "resp_abc123",\n  "model": "gpt-4o",\n  "routed_model": "gpt-4o",\n  "usage": { "prompt_tokens": 120, "completion_tokens": 340 }\n}`,
  },
  {
    id: 'file-003',
    fileName: 'customer_feedback_march.csv',
    detectedType: 'text/csv',
    parserUsed: 'CSV/Pandas Parser',
    sectionsFound: 1,
    tablesFound: 1,
    chunkCount: 18,
    warnings: [
      'Row 147: UTF-8 decoding error — replaced with placeholder',
      'Column "sentiment_score": 3 null values detected',
    ],
    rawTextPreview: `id,customer,date,feedback,sentiment_score,category\n1,acme_corp,2026-03-01,"The new RAG pipeline is significantly faster.",0.92,performance\n2,beta_inc,2026-03-02,"Model routing sometimes picks slower models for simple queries.",0.45,routing\n3,gamma_llc,2026-03-03,"Love the new dashboard analytics features.",0.88,features\n4,delta_co,2026-03-04,"API response times have improved dramatically.",0.91,performance\n5,epsilon_io,2026-03-05,"Documentation could be more detailed for edge cases.",0.52,docs`,
  },
  {
    id: 'file-004',
    fileName: 'internal_policies.pdf',
    detectedType: 'application/pdf',
    parserUsed: 'PDFPlumber + OCR fallback',
    sectionsFound: 8,
    tablesFound: 0,
    chunkCount: 0,
    warnings: [
      'CRITICAL: Document is password-protected — parsing failed',
      'No content extracted — file skipped',
    ],
    rawTextPreview: '[Unable to extract text — document is encrypted]',
  },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatPill({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof FileText;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-fill-tertiary)',
      }}
    >
      <Icon size={14} style={{ color, flexShrink: 0 }} />
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--color-text)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function FileParseInspector() {
  const [selectedFile, setSelectedFile] = useState<ParsedFile>(DEMO_FILES[0]);
  const [showRawText, setShowRawText] = useState(false);

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
        File Parse Inspector
      </div>

      {/* File selector */}
      <div className="dash-card" style={{ padding: 14 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 8,
          }}
        >
          Select File
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {DEMO_FILES.map((f) => {
            const active = selectedFile.id === f.id;
            const hasError = f.warnings.some((w) =>
              w.toLowerCase().includes('critical'),
            );
            return (
              <button
                key={f.id}
                onClick={() => setSelectedFile(f)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${
                    active
                      ? 'var(--color-primary-border)'
                      : hasError
                        ? 'rgba(248,113,113,0.2)'
                        : 'var(--color-border)'
                  }`,
                  background: active
                    ? 'var(--color-primary-bg)'
                    : 'transparent',
                  color: active
                    ? 'var(--color-primary)'
                    : hasError
                      ? '#f87171'
                      : 'var(--color-text-secondary)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FileText size={12} />
                {f.fileName.length > 28
                  ? f.fileName.slice(0, 25) + '...'
                  : f.fileName}
              </button>
            );
          })}
        </div>
      </div>

      {/* File details */}
      <div className="dash-card">
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: 4,
          }}
        >
          {selectedFile.fileName}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            marginBottom: 16,
          }}
        >
          {selectedFile.id}
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <StatPill
            icon={Code}
            label="Detected Type"
            value={selectedFile.detectedType}
            color="#60a5fa"
          />
          <StatPill
            icon={Layers}
            label="Parser"
            value={selectedFile.parserUsed.split(' ')[0]}
            color="var(--color-primary)"
          />
          <StatPill
            icon={FileText}
            label="Sections"
            value={selectedFile.sectionsFound}
            color="#34d399"
          />
          <StatPill
            icon={Table}
            label="Tables"
            value={selectedFile.tablesFound}
            color="#a78bfa"
          />
          <StatPill
            icon={Layers}
            label="Chunks"
            value={selectedFile.chunkCount}
            color="#fbbf24"
          />
        </div>

        {/* Parser used */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              marginBottom: 6,
            }}
          >
            Parser Used
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--color-text)',
              fontWeight: 500,
            }}
          >
            {selectedFile.parserUsed}
          </div>
        </div>

        {/* Warnings */}
        {selectedFile.warnings.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#fbbf24',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <AlertTriangle size={12} />
              Warnings ({selectedFile.warnings.length})
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {selectedFile.warnings.map((w, i) => {
                const isCritical = w.toLowerCase().includes('critical');
                return (
                  <div
                    key={i}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius)',
                      background: isCritical
                        ? 'rgba(248,113,113,0.06)'
                        : 'rgba(251,191,36,0.06)',
                      border: `1px solid ${
                        isCritical
                          ? 'rgba(248,113,113,0.12)'
                          : 'rgba(251,191,36,0.12)'
                      }`,
                      fontSize: 12,
                      color: isCritical
                        ? '#f87171'
                        : 'var(--color-text-secondary)',
                      lineHeight: 1.4,
                    }}
                  >
                    {w}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedFile.warnings.length === 0 && (
          <div
            style={{
              fontSize: 12,
              color: '#34d399',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            No warnings — file parsed successfully
          </div>
        )}

        {/* Raw text preview */}
        <div>
          <button
            onClick={() => setShowRawText((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              transition: 'all 0.15s',
              marginBottom: showRawText ? 10 : 0,
            }}
          >
            <Eye size={13} />
            {showRawText ? 'Hide' : 'Show'} Raw Text Preview
          </button>

          {showRawText && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-layout)',
                border: '1px solid var(--color-border-card)',
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                maxHeight: 300,
                overflowY: 'auto',
                animation: 'fadeIn 0.15s ease',
              }}
            >
              {selectedFile.rawTextPreview}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
