'use client';

import React from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import ModelSelector from './ModelSelector';
import { useChatState } from './ChatStateProvider';

export default function ChatView() {
  const { activeConversation, toggleTopicPanel } = useChatState();

  return (
    <div className="chat-view active">
      {/* Chat Header */}
      <header className="chat-header">
        <div className="ch-left">
          <div className="ch-avatar">🤖</div>
          <div>
            <div className="ch-name">Thinkora Assistant</div>
            <div className="ch-model">
              <ModelSelector />
            </div>
          </div>
        </div>
        <div className="ch-right">
          {/* Knowledge */}
          <button className="icon-btn" data-tip="Knowledge">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
          </button>
          {/* Plugins */}
          <button className="icon-btn" data-tip="Plugins">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          {/* Topics */}
          <button className="icon-btn" data-tip="Topics" onClick={toggleTopicPanel}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </button>
          {/* Share */}
          <button className="icon-btn" data-tip="Share">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
        </div>
      </header>

      {/* Messages */}
      <MessageList />

      {/* Chat Input */}
      <ChatInput />
    </div>
  );
}
