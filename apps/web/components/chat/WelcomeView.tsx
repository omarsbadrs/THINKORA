'use client';

import React from 'react';
import HomePromptInput from './HomePromptInput';
import ExampleCards from './ExampleCards';
import { useChatState } from './ChatStateProvider';

export default function WelcomeView() {
  const { sendMessage } = useChatState();

  const handleActionPill = (label: string) => {
    sendMessage(label);
  };

  return (
    <div className="welcome-view">
      <h1 className="hero-heading">Let&apos;s do this 💪</h1>

      <HomePromptInput />

      {/* Skills Bar */}
      <div className="skills-bar">
        <div className="skills-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          <span>Add skills to Thinkora AI</span>
        </div>
        <div className="integrations">
          <div className="integ-icon" title="Gmail">📧</div>
          <div className="integ-icon" title="Drive">📁</div>
          <div className="integ-icon" title="Sheets">📊</div>
          <div className="integ-icon" title="Slack">💬</div>
          <div className="integ-icon letter" title="Notion">N</div>
          <div
            className="integ-icon"
            style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text)' }}
            title="X"
          >
            𝕏
          </div>
          <div className="integ-icon" title="GitHub">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="var(--color-text)">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Action Pills Row */}
      <div className="action-row">
        <button className="action-pill" onClick={() => handleActionPill('Create Agent')}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Create Agent
        </button>
        <button className="action-pill" onClick={() => handleActionPill('Create Group')}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
          Create Group
        </button>
        <button className="action-pill" onClick={() => handleActionPill('Write')}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Write
        </button>
        <button className="action-pill" onClick={() => handleActionPill('Image Generation')}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          Image Generation
        </button>
        <button className="action-pill" onClick={() => handleActionPill('Video Generation')}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M10 9l5 3-5 3V9z" />
          </svg>
          Video Generation
        </button>
      </div>

      {/* Examples Section */}
      <div className="examples-section">
        <div className="examples-header">
          <div className="examples-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9.663 17h4.674M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Try these examples
          </div>
          <button className="switch-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6" />
              <path d="M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
            </svg>
            Switch
          </button>
        </div>
        <ExampleCards onSelect={(text) => sendMessage(text)} />
      </div>
    </div>
  );
}
