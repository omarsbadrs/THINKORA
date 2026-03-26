'use client';

import { useState } from 'react';
import { useChatState, type Conversation } from './ChatStateProvider';

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

export default function Sidebar() {
  const {
    sidebarCollapsed: collapsed,
    searchOpen,
    activeConversation,
    conversations,
    setActiveConversation,
    toggleCollapsed,
    toggleSearch,
    createNewConversation,
  } = useChatState();

  const [activeTab, setActiveTab] = useState<'Chat' | 'Explore'>('Chat');

  /* ---- group conversations ---- */
  const groups = groupConversations(conversations);

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* ===== HEADER ===== */}
      <div className="sb-header">
        <div className="sb-agent" onClick={toggleCollapsed}>
          <div className="sb-avatar">{'\u{1F916}'}</div>
          <span className="sb-agent-name">Thinkora</span>
          {/* chevron */}
          <svg
            className="sb-hide"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: 'var(--color-text-quaternary)', flexShrink: 0 }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>

        <div className="sb-header-actions">
          {/* Search button */}
          <button className="icon-btn" data-tip="Search" onClick={toggleSearch}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </button>
          {/* New Chat button */}
          <button className="icon-btn" data-tip="New Chat" onClick={createNewConversation}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div className="sb-tabs">
        <button
          className={`sb-tab${activeTab === 'Chat' ? ' active' : ''}`}
          onClick={() => setActiveTab('Chat')}
        >
          Chat
        </button>
        <button
          className={`sb-tab${activeTab === 'Explore' ? ' active' : ''}`}
          onClick={() => setActiveTab('Explore')}
        >
          Explore
        </button>
      </div>

      {/* ===== SEARCH (animated open/close) ===== */}
      <div className={`sb-search-wrap${searchOpen ? ' open' : ''}`}>
        <div className="sb-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input type="text" placeholder="Search conversations\u2026" />
        </div>
      </div>

      {/* ===== NEW CONVERSATION BUTTON ===== */}
      <button className="sb-new-chat" onClick={createNewConversation}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span className="sb-hide">New Conversation</span>
      </button>

      {/* ===== CONVERSATION LIST ===== */}
      <div className="sb-list no-scrollbar">
        {groups.map(({ group, items }) => (
          <ConversationGroup
            key={group}
            group={group}
            items={items}
            activeConversation={activeConversation}
            onSelect={setActiveConversation}
          />
        ))}
      </div>

      {/* ===== FOOTER ===== */}
      <div className="sb-footer">
        <div className="sb-footer-left">
          <div className="sb-user-wrap">
            <div className="sb-user">O</div>
          </div>
        </div>
        <div className="sb-footer-right">
          {/* Help */}
          <button className="icon-btn sm" data-tip="Help">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          {/* Theme toggle */}
          <ThemeToggle />
          {/* Settings */}
          <button className="icon-btn sm" data-tip="Settings">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ===== COLLAPSE HANDLE ===== */}
      <div className="sb-collapse-btn" onClick={toggleCollapsed}>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {collapsed ? (
            <path d="M9 18l6-6-6-6" />
          ) : (
            <path d="M15 18l-6-6 6-6" />
          )}
        </svg>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Conversation group                                                 */
/* ------------------------------------------------------------------ */

function ConversationGroup({
  group,
  items,
  activeConversation,
  onSelect,
}: {
  group: string;
  items: Conversation[];
  activeConversation: string | null;
  onSelect: (id: string) => void;
}) {
  /* stagger animation delay per-item within a group */
  const baseDelay = group === 'Today' ? 0.05 : group === 'Yesterday' ? 0.2 : 0.3;

  return (
    <>
      <div className="sb-group">{group}</div>
      {items.map((conv, idx) => (
        <div
          key={conv.id}
          className={`sb-item${activeConversation === conv.id ? ' active' : ''}`}
          onClick={() => onSelect(conv.id)}
          style={{
            animation: `sidebarItemIn 0.3s var(--ease-out) ${baseDelay + idx * 0.05}s both`,
          }}
        >
          <div className="sb-item-icon">{conv.icon}</div>
          <div className="sb-item-body">
            <div className="sb-item-title">{conv.title}</div>
            <div className="sb-item-preview">{conv.preview}</div>
          </div>
          <span className="sb-item-meta">{conv.time}</span>
          <div className="sb-item-actions">
            <button className="icon-btn xs">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Theme toggle                                                       */
/* ------------------------------------------------------------------ */

function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  };

  return (
    <div className="theme-toggle" onClick={toggle} data-tip="Theme">
      <div className="theme-knob">
        <span>{isDark ? '\u{1F319}' : '\u2600\uFE0F'}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function groupConversations(conversations: Conversation[]) {
  const order: Conversation['group'][] = ['Today', 'Yesterday', 'This Week'];
  const map = new Map<string, Conversation[]>();

  for (const conv of conversations) {
    const list = map.get(conv.group) ?? [];
    list.push(conv);
    map.set(conv.group, list);
  }

  return order
    .filter((g) => map.has(g))
    .map((g) => ({ group: g, items: map.get(g)! }));
}
