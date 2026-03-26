'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Zap, Scale, Sparkles, Brain, Code, Eye, BarChart3, Cpu } from 'lucide-react';
import { useChatState } from './ChatStateProvider';

/* ------------------------------------------------------------------ */
/*  Routing modes                                                      */
/* ------------------------------------------------------------------ */

const ROUTING_MODES = [
  { id: 'auto',         label: 'Auto',           desc: 'Automatically select the best model', icon: Cpu },
  { id: 'fast',         label: 'Fast',           desc: 'Low latency, simple tasks',           icon: Zap },
  { id: 'balanced',     label: 'Balanced',       desc: 'Good mix of speed and quality',       icon: Scale },
  { id: 'best',         label: 'Best Quality',   desc: 'Highest capability models',           icon: Sparkles },
  { id: 'reasoning',    label: 'Reasoning',      desc: 'Complex logic and math',              icon: Brain },
  { id: 'coding',       label: 'Coding',         desc: 'Code generation and review',          icon: Code },
  { id: 'vision',       label: 'Vision',         desc: 'Image understanding and analysis',    icon: Eye },
  { id: 'data',         label: 'Data Analysis',  desc: 'Structured data and analytics',       icon: BarChart3 },
] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ModelSelector() {
  const selectedModel = useChatState((s) => s.selectedModel);
  const setSelectedModel = useChatState((s) => s.setSelectedModel);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const current = ROUTING_MODES.find((m) => m.id === selectedModel) ?? ROUTING_MODES[0];

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Trigger badge */}
      <button
        className="ch-model"
        onClick={() => setOpen((v) => !v)}
        style={{ cursor: 'pointer', border: 'none' }}
      >
        {current.label}
        <ChevronDown
          size={12}
          style={{
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            minWidth: 240,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            zIndex: 200,
            padding: '6px',
            animation: 'scaleIn 0.15s var(--ease-out)',
          }}
        >
          {ROUTING_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = mode.id === selectedModel;

            return (
              <button
                key={mode.id}
                onClick={() => {
                  setSelectedModel(mode.id);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '8px 10px',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'var(--color-primary-bg)' : 'transparent',
                  color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  fontSize: 13,
                  textAlign: 'left',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'var(--color-fill-tertiary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }
                }}
              >
                <Icon size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                    }}
                  >
                    {mode.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--color-text-tertiary)',
                      marginTop: 1,
                    }}
                  >
                    {mode.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
