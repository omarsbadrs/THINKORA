'use client';

import { useState } from 'react';
import { X, Search, Shield, AlertTriangle } from 'lucide-react';
import { useChatState } from './ChatStateProvider';
import RoutingModeSelector from './RoutingModeSelector';

/* ------------------------------------------------------------------ */
/*  Fallback model list                                                */
/* ------------------------------------------------------------------ */

const FALLBACK_MODELS = [
  { id: 'gpt-4o',            name: 'GPT-4o',              provider: 'OpenAI' },
  { id: 'gpt-4o-mini',       name: 'GPT-4o Mini',         provider: 'OpenAI' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet',   provider: 'Anthropic' },
  { id: 'claude-3-haiku',    name: 'Claude 3 Haiku',      provider: 'Anthropic' },
  { id: 'gemini-pro',        name: 'Gemini Pro',           provider: 'Google' },
  { id: 'llama-3.1-70b',     name: 'Llama 3.1 70B',       provider: 'Meta' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdvancedModelDrawer() {
  const advancedModelDrawerOpen = useChatState((s) => s.advancedModelDrawerOpen);
  const toggleAdvancedModelDrawer = useChatState((s) => s.toggleAdvancedModelDrawer);
  const selectedRoutingMode = useChatState((s) => s.selectedRoutingMode);
  const setSelectedRoutingMode = useChatState((s) => s.setSelectedRoutingMode);

  const [filterText, setFilterText] = useState('');
  const [maxCost, setMaxCost] = useState('');
  const [zdrEnabled, setZdrEnabled] = useState(false);
  const [paramReqEnabled, setParamReqEnabled] = useState(false);
  const [selectedFallbacks, setSelectedFallbacks] = useState<string[]>([]);

  const toggleFallback = (id: string) => {
    setSelectedFallbacks((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  const filteredModels = FALLBACK_MODELS.filter(
    (m) =>
      !filterText ||
      m.name.toLowerCase().includes(filterText.toLowerCase()) ||
      m.provider.toLowerCase().includes(filterText.toLowerCase()),
  );

  return (
    <>
      {/* Backdrop */}
      {advancedModelDrawerOpen && (
        <div
          onClick={toggleAdvancedModelDrawer}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 299,
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 420,
          maxWidth: '100vw',
          height: '100vh',
          background: 'var(--bg-container)',
          borderLeft: '1px solid var(--color-border)',
          zIndex: 300,
          display: 'flex',
          flexDirection: 'column',
          transform: advancedModelDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s var(--ease-out)',
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
          <h3
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--color-text)',
              margin: 0,
            }}
          >
            Advanced Model Configuration
          </h3>
          <button
            className="icon-btn"
            onClick={toggleAdvancedModelDrawer}
            aria-label="Close drawer"
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
          {/* --- Model Filter --- */}
          <section>
            <SectionLabel>Filter Models</SectionLabel>
            <div
              className="sb-search"
              style={{ margin: 0 }}
            >
              <Search size={14} />
              <input
                placeholder="Search models or providers..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
          </section>

          {/* --- Routing Mode --- */}
          <section>
            <SectionLabel>Routing Mode</SectionLabel>
            <RoutingModeSelector
              selected={selectedRoutingMode}
              onSelect={setSelectedRoutingMode}
            />
          </section>

          {/* --- Fallback Models --- */}
          <section>
            <SectionLabel>Fallback Models</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filteredModels.map((model) => {
                const checked = selectedFallbacks.includes(model.id);
                return (
                  <label
                    key={model.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      background: checked ? 'var(--color-primary-bg)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!checked) {
                        (e.currentTarget as HTMLLabelElement).style.background =
                          'var(--color-fill-tertiary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!checked) {
                        (e.currentTarget as HTMLLabelElement).style.background = 'transparent';
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFallback(model.id)}
                      style={{
                        accentColor: 'var(--color-primary)',
                        width: 16,
                        height: 16,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--color-text)',
                        }}
                      >
                        {model.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                        {model.provider}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* --- Max Cost --- */}
          <section>
            <SectionLabel>Max Cost per Request</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={maxCost}
                onChange={(e) => setMaxCost(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--color-text)',
                  fontFamily: 'var(--font)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
          </section>

          {/* --- ZDR Toggle --- */}
          <section>
            <ToggleRow
              icon={<Shield size={16} />}
              label="Zero Data Retention (ZDR)"
              description="Requests are not stored or used for training"
              checked={zdrEnabled}
              onChange={setZdrEnabled}
            />
          </section>

          {/* --- Parameter Requirement Toggle --- */}
          <section>
            <ToggleRow
              icon={<AlertTriangle size={16} />}
              label="Require Parameter Support"
              description="Only route to models supporting all specified parameters"
              checked={paramReqEnabled}
              onChange={setParamReqEnabled}
            />
          </section>
        </div>
      </div>
    </>
  );
}

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

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${checked ? 'var(--color-primary-border)' : 'var(--color-border)'}`,
        background: checked ? 'var(--color-primary-bg)' : 'var(--bg-card)',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <span
        style={{
          color: checked ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          marginTop: 2,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>
          {description}
        </div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: 'var(--color-primary)', width: 16, height: 16, marginTop: 2 }}
      />
    </label>
  );
}
