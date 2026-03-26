'use client';

import React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
}

interface SetupChecklistProps {
  /** Override individual item statuses. Keyed by item `id`. */
  overrides?: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// Default checklist items
// ---------------------------------------------------------------------------

const DEFAULT_ITEMS: ChecklistItem[] = [
  {
    id: 'supabase',
    label: 'Supabase configured',
    description: 'Database URL and service role key set in environment',
    completed: false,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter configured',
    description: 'API key configured for multi-model routing',
    completed: false,
  },
  {
    id: 'notion',
    label: 'Notion connected',
    description: 'Notion MCP connector authenticated and syncing',
    completed: false,
  },
  {
    id: 'supabase-mcp',
    label: 'Supabase MCP connected',
    description: 'Database MCP connector linked for schema introspection',
    completed: false,
  },
  {
    id: 'first-upload',
    label: 'First file uploaded',
    description: 'At least one document ingested into the RAG pipeline',
    completed: false,
  },
  {
    id: 'model-catalog',
    label: 'Model catalog synced',
    description: 'Model registry populated from OpenRouter catalog',
    completed: false,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SetupChecklist({ overrides }: SetupChecklistProps) {
  const items = DEFAULT_ITEMS.map((item) => ({
    ...item,
    completed: overrides?.[item.id] ?? item.completed,
  }));

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div
      style={{
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: '#111113',
        padding: '24px',
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: '#e4e4e7',
        maxWidth: '480px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3
          style={{
            margin: '0 0 4px 0',
            fontSize: '16px',
            fontWeight: 600,
            color: '#fafafa',
          }}
        >
          Setup Progress
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: '#71717a',
          }}
        >
          {completedCount} of {totalCount} steps completed ({progressPercent}%)
        </p>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '4px',
          borderRadius: '2px',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          marginBottom: '20px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            borderRadius: '2px',
            backgroundColor: progressPercent === 100 ? '#34d399' : '#6366f1',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Checklist */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((item) => (
          <li
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '10px 0',
              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
            }}
          >
            {/* Status indicator */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                flexShrink: 0,
                marginTop: '1px',
                fontSize: '13px',
                ...(item.completed
                  ? {
                      backgroundColor: 'rgba(52, 211, 153, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(52, 211, 153, 0.3)',
                    }
                  : {
                      backgroundColor: 'transparent',
                      color: '#52525b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }),
              }}
              aria-label={item.completed ? 'Completed' : 'Pending'}
            >
              {item.completed ? '\u2713' : '\u25CB'}
            </span>

            {/* Label + description */}
            <div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: item.completed ? '#a1a1aa' : '#e4e4e7',
                  textDecoration: item.completed ? 'line-through' : 'none',
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#52525b',
                  marginTop: '2px',
                }}
              >
                {item.description}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
