'use client';

import { Info } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ActualModelBadgeProps {
  requested: string;
  actual: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ActualModelBadge({ requested, actual }: ActualModelBadgeProps) {
  if (requested === actual) return null;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--color-fill-tertiary)',
        color: 'var(--color-text-tertiary)',
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <Info size={12} style={{ opacity: 0.6, flexShrink: 0 }} />
      Routed to: {actual}
    </span>
  );
}
