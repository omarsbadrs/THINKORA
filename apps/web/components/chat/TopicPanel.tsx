'use client';

import React, { useState } from 'react';
import { useChatState } from '@/components/chat/ChatStateProvider';

const DEMO_TOPICS = [
  'Project Setup Guide',
  'Environment Config',
  'Package Installation',
  'TypeScript Config',
  'Tailwind CSS Setup',
  'Zustand Store Pattern',
  'Animation Patterns',
];

export default function TopicPanel() {
  const isTopicPanelOpen = useChatState((s) => s.isTopicPanelOpen);
  const toggleTopicPanel = useChatState((s) => s.toggleTopicPanel);
  const [activeTopic, setActiveTopic] = useState(0);

  return (
    <div className={`topic-panel${isTopicPanelOpen ? ' open' : ''}`}>
      {/* Header */}
      <div className="tp-header">
        <span className="tp-title">Topics</span>
        <button className="icon-btn sm" onClick={toggleTopicPanel}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Topic list */}
      <div className="tp-list">
        {DEMO_TOPICS.map((topic, index) => (
          <div
            key={index}
            className={`tp-item${index === activeTopic ? ' active' : ''}`}
            onClick={() => setActiveTopic(index)}
          >
            {topic}
          </div>
        ))}
      </div>
    </div>
  );
}
