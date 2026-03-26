'use client';

import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="msg assistant">
      <div className="msg-avatar">{'\u{1F916}'}</div>
      <div className="msg-body">
        <div className="msg-meta">
          <span>Thinkora</span>
        </div>
        <div className="msg-content">
          <div className="typing-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}
