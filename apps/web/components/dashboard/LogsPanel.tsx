'use client';

import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import RequestTraceDrawer from './RequestTraceDrawer';

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

export interface RequestTrace {
  id: string;
  time: string;
  model: string;
  routedModel: string;
  tokens: number;
  promptTokens: number;
  completionTokens: number;
  latency: number;
  status: 'success' | 'error' | 'timeout';
  cost: number;
  routingMode: string;
  fallbackUsed: boolean;
  fallbackChain: string[];
  sourceChunks: number;
  avgRelevance: number;
  toolCalls: string[];
  citations: number;
  promptPreview: string;
}

const DEMO_LOGS: RequestTrace[] = [
  { id: 'req-001', time: '14:32:05', model: 'auto', routedModel: 'GPT-4o', tokens: 1840, promptTokens: 1200, completionTokens: 640, latency: 520, status: 'success', cost: 0.0092, routingMode: 'auto', fallbackUsed: false, fallbackChain: [], sourceChunks: 4, avgRelevance: 0.92, toolCalls: ['web_search'], citations: 3, promptPreview: 'Summarize the latest quarterly report...' },
  { id: 'req-002', time: '14:31:42', model: 'claude-3.5-sonnet', routedModel: 'Claude 3.5 Sonnet', tokens: 3200, promptTokens: 2800, completionTokens: 400, latency: 890, status: 'success', cost: 0.0210, routingMode: 'best', fallbackUsed: false, fallbackChain: [], sourceChunks: 8, avgRelevance: 0.88, toolCalls: [], citations: 5, promptPreview: 'Analyze the code architecture for...' },
  { id: 'req-003', time: '14:31:18', model: 'auto', routedModel: 'GPT-4o Mini', tokens: 620, promptTokens: 480, completionTokens: 140, latency: 180, status: 'success', cost: 0.0008, routingMode: 'fast', fallbackUsed: false, fallbackChain: [], sourceChunks: 0, avgRelevance: 0, toolCalls: [], citations: 0, promptPreview: 'What is the capital of France?' },
  { id: 'req-004', time: '14:30:55', model: 'auto', routedModel: 'Gemini Pro', tokens: 1420, promptTokens: 1100, completionTokens: 320, latency: 340, status: 'error', cost: 0.0045, routingMode: 'auto', fallbackUsed: true, fallbackChain: ['GPT-4o', 'Gemini Pro'], sourceChunks: 3, avgRelevance: 0.85, toolCalls: ['calculator'], citations: 1, promptPreview: 'Calculate the compound interest on...' },
  { id: 'req-005', time: '14:30:22', model: 'auto', routedModel: 'Claude 3 Haiku', tokens: 480, promptTokens: 320, completionTokens: 160, latency: 120, status: 'success', cost: 0.0003, routingMode: 'fast', fallbackUsed: false, fallbackChain: [], sourceChunks: 0, avgRelevance: 0, toolCalls: [], citations: 0, promptPreview: 'Translate this sentence to Spanish...' },
  { id: 'req-006', time: '14:29:58', model: 'gpt-4o', routedModel: 'GPT-4o', tokens: 4800, promptTokens: 4200, completionTokens: 600, latency: 1200, status: 'success', cost: 0.0340, routingMode: 'best', fallbackUsed: false, fallbackChain: [], sourceChunks: 12, avgRelevance: 0.91, toolCalls: ['code_interpreter', 'web_search'], citations: 8, promptPreview: 'Generate a full implementation of...' },
  { id: 'req-007', time: '14:29:30', model: 'auto', routedModel: 'Llama 3.1 70B', tokens: 960, promptTokens: 720, completionTokens: 240, latency: 280, status: 'success', cost: 0.0012, routingMode: 'balanced', fallbackUsed: false, fallbackChain: [], sourceChunks: 2, avgRelevance: 0.78, toolCalls: [], citations: 2, promptPreview: 'List the top 10 features of...' },
  { id: 'req-008', time: '14:29:05', model: 'auto', routedModel: 'GPT-4o', tokens: 2100, promptTokens: 1800, completionTokens: 300, latency: 15000, status: 'timeout', cost: 0.0000, routingMode: 'auto', fallbackUsed: true, fallbackChain: ['GPT-4o'], sourceChunks: 6, avgRelevance: 0.89, toolCalls: ['web_search'], citations: 0, promptPreview: 'Research and compile a report on...' },
  { id: 'req-009', time: '14:28:40', model: 'claude-3.5-sonnet', routedModel: 'Claude 3.5 Sonnet', tokens: 1600, promptTokens: 1200, completionTokens: 400, latency: 640, status: 'success', cost: 0.0105, routingMode: 'best', fallbackUsed: false, fallbackChain: [], sourceChunks: 5, avgRelevance: 0.94, toolCalls: [], citations: 4, promptPreview: 'Write a detailed comparison of...' },
  { id: 'req-010', time: '14:28:12', model: 'auto', routedModel: 'GPT-4o Mini', tokens: 380, promptTokens: 280, completionTokens: 100, latency: 140, status: 'success', cost: 0.0004, routingMode: 'fast', fallbackUsed: false, fallbackChain: [], sourceChunks: 0, avgRelevance: 0, toolCalls: [], citations: 0, promptPreview: 'Define machine learning in one...' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  success: { bg: 'rgba(52,211,153,0.12)', text: '#34d399' },
  error: { bg: 'rgba(248,113,113,0.12)', text: '#f87171' },
  timeout: { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24' },
};

const MODEL_OPTIONS = ['All Models', 'GPT-4o', 'Claude 3.5 Sonnet', 'GPT-4o Mini', 'Gemini Pro', 'Llama 3.1 70B', 'Claude 3 Haiku'];
const STATUS_OPTIONS = ['All Status', 'success', 'error', 'timeout'];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LogsPanel() {
  const [searchText, setSearchText] = useState('');
  const [modelFilter, setModelFilter] = useState('All Models');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedTrace, setSelectedTrace] = useState<RequestTrace | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = DEMO_LOGS.filter((log) => {
    if (searchText && !log.promptPreview.toLowerCase().includes(searchText.toLowerCase()) && !log.routedModel.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    if (modelFilter !== 'All Models' && log.routedModel !== modelFilter) return false;
    if (statusFilter !== 'All Status' && log.status !== statusFilter) return false;
    return true;
  });

  const selectStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--color-border)',
    background: 'var(--bg-elevated)',
    color: 'var(--color-text)',
    fontSize: 12,
    fontFamily: 'var(--font)',
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div style={{ padding: 20 }}>
      <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header & search */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div className="dash-card-title" style={{ marginBottom: 0 }}>
              Request Logs
            </div>
            <button
              className="icon-btn"
              onClick={() => setShowFilters((v) => !v)}
              aria-label="Toggle filters"
              style={{
                color: showFilters ? 'var(--color-primary)' : undefined,
              }}
            >
              <Filter size={16} />
            </button>
          </div>

          {/* Search */}
          <div className="sb-search" style={{ margin: 0 }}>
            <Search size={14} />
            <input
              placeholder="Search logs by prompt or model..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div
              style={{
                display: 'flex',
                gap: 10,
                animation: 'fadeIn 0.15s ease',
              }}
            >
              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                style={selectStyle}
              >
                {MODEL_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={selectStyle}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 750,
            }}
          >
            <thead>
              <tr>
                {['Time', 'Model', 'Tokens', 'Latency', 'Status', 'Cost'].map(
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
              {filtered.map((log) => {
                const sc = STATUS_COLORS[log.status];
                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedTrace(log)}
                    style={{
                      cursor: 'pointer',
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
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 13,
                        color: 'var(--color-text-secondary)',
                        borderBottom: '1px solid var(--color-border-card)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {log.time}
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 13,
                        color: 'var(--color-text)',
                        fontWeight: 500,
                        borderBottom: '1px solid var(--color-border-card)',
                      }}
                    >
                      {log.routedModel}
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 13,
                        color: 'var(--color-text)',
                        borderBottom: '1px solid var(--color-border-card)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {log.tokens.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 13,
                        color: 'var(--color-text)',
                        borderBottom: '1px solid var(--color-border-card)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {log.latency}ms
                    </td>
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
                          background: sc.bg,
                          color: sc.text,
                          textTransform: 'uppercase',
                        }}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontSize: 13,
                        color: 'var(--color-text)',
                        borderBottom: '1px solid var(--color-border-card)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      ${log.cost.toFixed(4)}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 40,
                      textAlign: 'center',
                      color: 'var(--color-text-tertiary)',
                      fontSize: 13,
                    }}
                  >
                    No logs match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trace drawer */}
      {selectedTrace && (
        <RequestTraceDrawer
          trace={selectedTrace}
          onClose={() => setSelectedTrace(null)}
        />
      )}
    </div>
  );
}
