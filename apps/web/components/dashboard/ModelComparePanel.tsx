'use client';

import { useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

interface ModelSpec {
  id: string;
  name: string;
  provider: string;
  speed: number;       // 0-100
  quality: number;     // 0-100
  costScore: number;   // 0-100 (lower cost = higher score)
  contextLength: number; // in K tokens
}

const MODELS: ModelSpec[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', speed: 65, quality: 92, costScore: 40, contextLength: 128 },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', speed: 60, quality: 95, costScore: 38, contextLength: 200 },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', speed: 78, quality: 82, costScore: 65, contextLength: 128 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', speed: 90, quality: 75, costScore: 85, contextLength: 128 },
  { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', provider: 'Meta', speed: 72, quality: 78, costScore: 90, contextLength: 128 },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', speed: 95, quality: 68, costScore: 92, contextLength: 200 },
];

const COMPARE_METRICS: { key: keyof ModelSpec; label: string; unit: string }[] = [
  { key: 'speed', label: 'Speed', unit: '/100' },
  { key: 'quality', label: 'Quality', unit: '/100' },
  { key: 'costScore', label: 'Cost Efficiency', unit: '/100' },
  { key: 'contextLength', label: 'Context Length', unit: 'K' },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ModelSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--color-text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          background: 'var(--bg-elevated)',
          color: 'var(--color-text)',
          fontSize: 13,
          fontFamily: 'var(--font)',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} ({m.provider})
          </option>
        ))}
      </select>
    </div>
  );
}

function CompareBar({
  label,
  valueA,
  valueB,
  max,
  unit,
}: {
  label: string;
  valueA: number;
  valueB: number;
  max: number;
  unit: string;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>

      {/* Model A */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 6,
        }}
      >
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
              width: `${(valueA / max) * 100}%`,
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
            color: 'var(--color-primary)',
            minWidth: 50,
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {valueA}{unit}
        </span>
      </div>

      {/* Model B */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              width: `${(valueB / max) * 100}%`,
              borderRadius: 4,
              background: '#60a5fa',
              transition: 'width 0.3s var(--ease-out)',
            }}
          />
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#60a5fa',
            minWidth: 50,
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {valueB}{unit}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ModelComparePanel() {
  const [modelA, setModelA] = useState(MODELS[0].id);
  const [modelB, setModelB] = useState(MODELS[1].id);

  const specA = MODELS.find((m) => m.id === modelA) ?? MODELS[0];
  const specB = MODELS.find((m) => m.id === modelB) ?? MODELS[1];

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div className="dash-card">
        <div className="dash-card-title" style={{ marginBottom: 16 }}>
          Model Comparison
        </div>

        {/* Model selectors */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <ModelSelect value={modelA} onChange={setModelA} label="Model A" />
          <ModelSelect value={modelB} onChange={setModelB} label="Model B" />
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: 'var(--color-primary)',
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: 'var(--color-text-secondary)',
              }}
            >
              {specA.name}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: '#60a5fa',
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: 'var(--color-text-secondary)',
              }}
            >
              {specB.name}
            </span>
          </div>
        </div>

        {/* Comparison bars */}
        {COMPARE_METRICS.map((metric) => (
          <CompareBar
            key={metric.key}
            label={metric.label}
            valueA={specA[metric.key] as number}
            valueB={specB[metric.key] as number}
            max={metric.key === 'contextLength' ? 200 : 100}
            unit={metric.unit}
          />
        ))}
      </div>
    </div>
  );
}
