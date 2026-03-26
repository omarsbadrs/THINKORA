'use client';

import React from 'react';

export interface MessageItemProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    citations?: { source: string; text: string }[];
  };
}

export default function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  return (
    <div className={`msg ${message.role}`}>
      {/* Avatar */}
      <div className="msg-avatar">
        {isUser ? 'O' : '\u{1F916}'}
      </div>

      {/* Body */}
      <div className="msg-body">
        <div className="msg-meta">
          <span>{isUser ? 'You' : 'Thinkora'}</span>
          <span>{message.timestamp}</span>
        </div>

        <div className="msg-content">
          {isUser ? (
            message.content
          ) : (
            message.content.split('\n').map((paragraph, i) =>
              paragraph.trim() === '' ? null : <p key={i}>{paragraph}</p>
            )
          )}
        </div>

        {/* Citations */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginTop: '8px',
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-text-quaternary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              alignSelf: 'center',
            }}>
              Sources
            </span>
            {message.citations.map((citation, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-fill-tertiary)',
                  border: '1px solid var(--color-border)',
                  fontSize: '11px',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                title={citation.text}
              >
                {citation.source}
              </span>
            ))}
          </div>
        )}

        {/* Actions (visible on hover via CSS) */}
        <div className="msg-actions">
          {/* Copy */}
          <button className="msg-act" onClick={handleCopy} data-tip="Copy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>

          {/* Retry */}
          <button className="msg-act" data-tip="Retry">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
            </svg>
          </button>

          {/* Edit */}
          <button className="msg-act" data-tip="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
