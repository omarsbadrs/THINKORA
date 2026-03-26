'use client';

import {
  Cpu,
  Zap,
  Scale,
  Sparkles,
  Brain,
  FileSearch,
  BarChart3,
  Eye,
  Code,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Routing modes                                                      */
/* ------------------------------------------------------------------ */

const MODES = [
  { id: 'auto',          label: 'Auto',            desc: 'Automatically selects the best model for each request',  icon: Cpu },
  { id: 'fast',          label: 'Fast',            desc: 'Optimized for low latency on simple tasks',              icon: Zap },
  { id: 'balanced',      label: 'Balanced',        desc: 'Balances response quality with speed',                   icon: Scale },
  { id: 'best',          label: 'Best Quality',    desc: 'Routes to highest-capability models',                    icon: Sparkles },
  { id: 'reasoning',     label: 'Reasoning',       desc: 'Complex logic, math, and multi-step problems',          icon: Brain },
  { id: 'file-analysis', label: 'File Analysis',   desc: 'Optimized for analyzing uploaded files',                 icon: FileSearch },
  { id: 'data',          label: 'Data Analysis',   desc: 'Structured data, tables, and analytics',                icon: BarChart3 },
  { id: 'vision',        label: 'Vision',          desc: 'Image understanding, OCR, and visual analysis',         icon: Eye },
  { id: 'coding',        label: 'Coding',          desc: 'Code generation, debugging, and review',                icon: Code },
] as const;

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface RoutingModeSelectorProps {
  selected: string;
  onSelect: (mode: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function RoutingModeSelector({ selected, onSelect }: RoutingModeSelectorProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 8,
      }}
    >
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const isSelected = mode.id === selected;

        return (
          <button
            key={mode.id}
            onClick={() => onSelect(mode.id)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              border: `1px solid ${isSelected ? 'var(--color-primary-border)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)',
              background: isSelected ? 'var(--color-primary-bg)' : 'var(--bg-card)',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'var(--font)',
              transition: 'all 0.2s var(--ease-out)',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card-hover)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.10)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
              }
            }}
          >
            <Icon
              size={18}
              style={{
                flexShrink: 0,
                marginTop: 2,
                color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                transition: 'color 0.15s',
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                  marginBottom: 2,
                }}
              >
                {mode.label}
              </div>
              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: 'var(--color-text-tertiary)',
                }}
              >
                {mode.desc}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
