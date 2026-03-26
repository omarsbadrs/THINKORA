'use client';

import type { ReactNode } from 'react';

interface AuthCardProps {
  children: ReactNode;
}

/**
 * Reusable auth-page wrapper that renders the Thinkora branding (logo + name)
 * above a card styled with the `auth-card` CSS class from globals.css.
 *
 * Wrap any auth form content with this component to get a consistent look
 * across login, signup, forgot-password, etc.
 */
export default function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="page-centered">
      <div className="auth-card">
        {/* Thinkora branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background:
                'linear-gradient(135deg, var(--color-primary), #c2631a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              color: '#fff',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(236,132,53,0.18)',
            }}
          >
            T
          </div>
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--color-text)',
              letterSpacing: '-0.3px',
            }}
          >
            Thinkora
          </span>
        </div>

        {children}
      </div>
    </div>
  );
}
