'use client';

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

const COST_BY_MODEL = [
  { model: 'GPT-4o', cost: 42.18, pct: 33 },
  { model: 'Claude 3.5 Sonnet', cost: 31.54, pct: 25 },
  { model: 'Gemini Pro', cost: 22.30, pct: 17 },
  { model: 'GPT-4o Mini', cost: 18.67, pct: 15 },
  { model: 'Llama 3.1 70B', cost: 12.76, pct: 10 },
];

const COST_BY_TASK = [
  { task: 'Chat Completion', cost: 58.12, pct: 46 },
  { task: 'RAG Retrieval', cost: 32.40, pct: 25 },
  { task: 'Code Generation', cost: 21.88, pct: 17 },
  { task: 'Summarization', cost: 10.05, pct: 8 },
  { task: 'Other', cost: 5.00, pct: 4 },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function CostBreakdownBar({
  label,
  amount,
  pct,
  color,
}: {
  label: string;
  amount: number;
  pct: number;
  color: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <span
          style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 500 }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ${amount.toFixed(2)} ({pct}%)
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
            width: `${pct}%`,
            borderRadius: 3,
            background: color,
            transition: 'width 0.4s var(--ease-out)',
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CostPanel() {
  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
        }}
      >
        <div className="dash-card">
          <div className="dash-card-title">Daily Cost</div>
          <div className="dash-card-value">$4.23</div>
          <div className="dash-card-sub">Average over last 30 days</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-title">Monthly Cost</div>
          <div className="dash-card-value">$127.45</div>
          <div className="dash-card-sub">March 2026 to date</div>
        </div>
        <div className="dash-card">
          <div className="dash-card-title">Projected Monthly</div>
          <div className="dash-card-value">$158.20</div>
          <div className="dash-card-sub">Based on current usage</div>
        </div>
      </div>

      {/* Cost by model */}
      <div className="dash-card">
        <div className="dash-card-title" style={{ marginBottom: 16 }}>
          Cost by Model
        </div>
        {COST_BY_MODEL.map((item, i) => (
          <CostBreakdownBar
            key={item.model}
            label={item.model}
            amount={item.cost}
            pct={item.pct}
            color={
              [
                'var(--color-primary)',
                '#60a5fa',
                '#34d399',
                '#a78bfa',
                '#fbbf24',
              ][i]
            }
          />
        ))}
      </div>

      {/* Cost by task type */}
      <div className="dash-card">
        <div className="dash-card-title" style={{ marginBottom: 16 }}>
          Cost by Task Type
        </div>
        {COST_BY_TASK.map((item, i) => (
          <CostBreakdownBar
            key={item.task}
            label={item.task}
            amount={item.cost}
            pct={item.pct}
            color={
              [
                'var(--color-primary)',
                '#60a5fa',
                '#34d399',
                '#a78bfa',
                '#fbbf24',
              ][i]
            }
          />
        ))}
      </div>
    </div>
  );
}
