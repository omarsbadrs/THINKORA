'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Authenticated app shell layout.
 * Wraps all (app) route-group pages.
 * Chat page manages its own full layout via ChatAppShell.
 * Other pages (dashboard, settings, etc.) get a scrollable container.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isChatPage = pathname === '/chat';

  // Chat page provides its own full-bleed layout
  if (isChatPage) {
    return <>{children}</>;
  }

  // Non-chat pages get a scrollable full-height container
  return (
    <div style={{
      height: '100dvh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-layout)',
    }}>
      {/* Top navigation bar for non-chat pages */}
      <nav style={{
        height: 56,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--bg-container)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/chat" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            color: 'var(--color-text)',
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: 'linear-gradient(135deg, var(--color-primary), #c2631a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              color: '#fff',
            }}>T</div>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Thinkora</span>
          </a>
          <div style={{ display: 'flex', gap: 2 }}>
            {[
              { href: '/chat', label: 'Chat' },
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/files', label: 'Files' },
              { href: '/connectors', label: 'Connectors' },
              { href: '/settings', label: 'Settings' },
            ].map(link => (
              <a
                key={link.href}
                href={link.href}
                className={`page-nav-tab${pathname === link.href ? ' active' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="sb-user-wrap">
            <div className="sb-user" style={{ width: 28, height: 28, fontSize: 11 }}>O</div>
          </div>
        </div>
      </nav>
      <div className="page-scroll">
        {children}
      </div>
    </div>
  );
}
