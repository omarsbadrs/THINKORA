'use client';

import React from 'react';

interface FeatureUnavailableBannerProps {
  feature: string;
  requiredCredential: string;
}

/**
 * Amber warning banner shown when a feature cannot be used because a
 * required credential / integration has not been configured.
 */
export default function FeatureUnavailableBanner({
  feature,
  requiredCredential,
}: FeatureUnavailableBannerProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid rgba(245, 158, 11, 0.4)',
        borderLeft: '4px solid #f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        color: '#fbbf24',
        fontSize: '14px',
        lineHeight: '1.5',
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
      role="alert"
    >
      {/* Warning icon */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <path
          d="M8.57 3.22L1.52 15.5A1.67 1.67 0 003 17.5h14.06a1.67 1.67 0 001.43-2.5L11.43 3.22a1.67 1.67 0 00-2.86 0z"
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 7.5v3.33"
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="14.17" r="0.83" fill="#f59e0b" />
      </svg>

      <span>
        <strong>{feature}</strong> is not available. Configure{' '}
        <code
          style={{
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            color: '#fbbf24',
            fontSize: '13px',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          }}
        >
          {requiredCredential}
        </code>{' '}
        to enable.
      </span>
    </div>
  );
}
