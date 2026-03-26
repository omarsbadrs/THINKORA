'use client';

import { useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ModelFilterState {
  priceMin: string;
  priceMax: string;
  contextMin: string;
  modality: { text: boolean; vision: boolean; multimodal: boolean };
  features: { tools: boolean; structuredOutput: boolean; reasoning: boolean };
  providers: Record<string, boolean>;
}

const PROVIDERS = ['OpenAI', 'Anthropic', 'Google', 'Meta', 'Mistral', 'DeepSeek'];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--color-text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function CheckboxItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 0',
        cursor: 'pointer',
        fontSize: 13,
        color: checked ? 'var(--color-text)' : 'var(--color-text-secondary)',
        transition: 'color 0.15s',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          accentColor: 'var(--color-primary)',
          width: 15,
          height: 15,
          cursor: 'pointer',
        }}
      />
      {label}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ModelFilters({
  filters,
  onChange,
}: {
  filters: ModelFilterState;
  onChange: (f: ModelFilterState) => void;
}) {
  const update = (partial: Partial<ModelFilterState>) =>
    onChange({ ...filters, ...partial });

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '7px 10px',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--color-border)',
    background: 'var(--bg-elevated)',
    color: 'var(--color-text)',
    fontSize: 13,
    fontFamily: 'var(--font)',
    outline: 'none',
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <div className="dash-card">
      <div
        className="dash-card-title"
        style={{ marginBottom: 16, fontSize: 13 }}
      >
        Filters
      </div>

      {/* Price range */}
      <FilterSection title="Price Range (per 1M tokens)">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                fontSize: 11,
                color: 'var(--color-text-quaternary)',
                marginBottom: 4,
                display: 'block',
              }}
            >
              Min ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={filters.priceMin}
              onChange={(e) => update({ priceMin: e.target.value })}
              style={inputStyle}
            />
          </div>
          <span
            style={{
              color: 'var(--color-text-quaternary)',
              marginTop: 16,
            }}
          >
            -
          </span>
          <div style={{ flex: 1 }}>
            <label
              style={{
                fontSize: 11,
                color: 'var(--color-text-quaternary)',
                marginBottom: 4,
                display: 'block',
              }}
            >
              Max ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="100.00"
              value={filters.priceMax}
              onChange={(e) => update({ priceMax: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>
      </FilterSection>

      {/* Context length min */}
      <FilterSection title="Minimum Context Length">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="0"
            value={filters.contextMin}
            onChange={(e) => update({ contextMin: e.target.value })}
            style={{ ...inputStyle, flex: 1 }}
          />
          <span
            style={{
              fontSize: 12,
              color: 'var(--color-text-tertiary)',
              whiteSpace: 'nowrap',
            }}
          >
            K tokens
          </span>
        </div>
      </FilterSection>

      {/* Modality */}
      <FilterSection title="Modality">
        <CheckboxItem
          label="Text"
          checked={filters.modality.text}
          onChange={(v) =>
            update({ modality: { ...filters.modality, text: v } })
          }
        />
        <CheckboxItem
          label="Vision"
          checked={filters.modality.vision}
          onChange={(v) =>
            update({ modality: { ...filters.modality, vision: v } })
          }
        />
        <CheckboxItem
          label="Multimodal"
          checked={filters.modality.multimodal}
          onChange={(v) =>
            update({ modality: { ...filters.modality, multimodal: v } })
          }
        />
      </FilterSection>

      {/* Feature toggles */}
      <FilterSection title="Features">
        <CheckboxItem
          label="Tool Use / Function Calling"
          checked={filters.features.tools}
          onChange={(v) =>
            update({ features: { ...filters.features, tools: v } })
          }
        />
        <CheckboxItem
          label="Structured Output"
          checked={filters.features.structuredOutput}
          onChange={(v) =>
            update({
              features: { ...filters.features, structuredOutput: v },
            })
          }
        />
        <CheckboxItem
          label="Reasoning"
          checked={filters.features.reasoning}
          onChange={(v) =>
            update({ features: { ...filters.features, reasoning: v } })
          }
        />
      </FilterSection>

      {/* Providers */}
      <FilterSection title="Providers">
        {PROVIDERS.map((p) => (
          <CheckboxItem
            key={p}
            label={p}
            checked={!!filters.providers[p]}
            onChange={(v) =>
              update({
                providers: { ...filters.providers, [p]: v },
              })
            }
          />
        ))}
      </FilterSection>

      {/* Reset button */}
      <button
        onClick={() =>
          onChange({
            priceMin: '',
            priceMax: '',
            contextMin: '',
            modality: { text: false, vision: false, multimodal: false },
            features: {
              tools: false,
              structuredOutput: false,
              reasoning: false,
            },
            providers: {},
          })
        }
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          background: 'transparent',
          color: 'var(--color-text-secondary)',
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'var(--font)',
          transition: 'all 0.15s',
        }}
      >
        Reset All Filters
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Standalone demo wrapper                                            */
/* ------------------------------------------------------------------ */

export function ModelFiltersDemo() {
  const [filters, setFilters] = useState<ModelFilterState>({
    priceMin: '',
    priceMax: '',
    contextMin: '',
    modality: { text: false, vision: false, multimodal: false },
    features: { tools: false, structuredOutput: false, reasoning: false },
    providers: {},
  });

  return <ModelFilters filters={filters} onChange={setFilters} />;
}
