'use client';

import { X, Check, Minus } from 'lucide-react';
import type { CatalogModel } from './ModelCatalogExplorer';

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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
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
          color: 'var(--color-text)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ModelDetailPanel({
  model,
  onClose,
}: {
  model: CatalogModel;
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
          width: 480,
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
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--color-text)',
                margin: 0,
              }}
            >
              {model.name}
            </h3>
            <div
              style={{
                fontSize: 12,
                color: 'var(--color-text-tertiary)',
                marginTop: 2,
              }}
            >
              {model.provider}
            </div>
          </div>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Close panel"
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
          {/* Description */}
          <section>
            <SectionLabel>Description</SectionLabel>
            <p
              style={{
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {model.description}
            </p>
          </section>

          {/* Pricing */}
          <section>
            <SectionLabel>Pricing</SectionLabel>
            <InfoRow label="Input Price" value={`$${model.inputPrice.toFixed(2)} / 1M tokens`} />
            <InfoRow label="Output Price" value={`$${model.outputPrice.toFixed(2)} / 1M tokens`} />
            <InfoRow label="Context Length" value={`${model.contextLength}K tokens`} />
          </section>

          {/* Supported features */}
          <section>
            <SectionLabel>Supported Features</SectionLabel>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {model.features.map((f) => (
                <div
                  key={f}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 0',
                    fontSize: 13,
                    color: 'var(--color-text)',
                  }}
                >
                  <Check
                    size={14}
                    style={{ color: '#34d399', flexShrink: 0 }}
                  />
                  {f}
                </div>
              ))}
            </div>
          </section>

          {/* Ideal use cases */}
          <section>
            <SectionLabel>Ideal Use Cases</SectionLabel>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {model.idealUseCases.map((uc) => (
                <span
                  key={uc}
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
                  {uc}
                </span>
              ))}
            </div>
          </section>

          {/* Strengths & weaknesses */}
          <section>
            <SectionLabel>Strengths</SectionLabel>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                marginBottom: 16,
              }}
            >
              {model.strengths.map((s) => (
                <div
                  key={s}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: '#34d399',
                    padding: '3px 0',
                  }}
                >
                  <Check size={13} style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--color-text)' }}>{s}</span>
                </div>
              ))}
            </div>

            <SectionLabel>Weaknesses</SectionLabel>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {model.weaknesses.map((w) => (
                <div
                  key={w}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: '#f87171',
                    padding: '3px 0',
                  }}
                >
                  <Minus size={13} style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--color-text)' }}>{w}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Benchmark scores */}
          <section>
            <SectionLabel>Internal Benchmark Scores</SectionLabel>
            {model.benchmarkScores.map((b) => (
              <div key={b.name} style={{ marginBottom: 10 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {b.name}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--color-text)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {b.score}/100
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: 'var(--color-fill-tertiary)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${b.score}%`,
                      borderRadius: 3,
                      background:
                        b.score >= 90
                          ? '#34d399'
                          : b.score >= 80
                            ? '#60a5fa'
                            : b.score >= 70
                              ? '#fbbf24'
                              : '#f87171',
                      transition: 'width 0.4s var(--ease-out)',
                    }}
                  />
                </div>
              </div>
            ))}
          </section>

          {/* Historical metrics */}
          <section>
            <SectionLabel>Historical Metrics</SectionLabel>
            <InfoRow label="Avg Latency" value={`${model.avgLatency}ms`} />
            <InfoRow label="Avg Cost per Request" value={`$${model.avgCost.toFixed(4)}`} />
            <InfoRow
              label="Error Rate"
              value={
                <span
                  style={{
                    color: model.errorRate > 1 ? '#f87171' : 'var(--color-text)',
                  }}
                >
                  {model.errorRate}%
                </span>
              }
            />
          </section>

          {/* Tags */}
          <section>
            <SectionLabel>Tags</SectionLabel>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {model.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-fill-secondary)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
