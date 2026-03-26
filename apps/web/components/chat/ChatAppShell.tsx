'use client';

import { ChatStateProvider, useChatState } from './ChatStateProvider';
import Sidebar from './Sidebar';
import WelcomeView from './WelcomeView';
import ChatView from './ChatView';
import TopicPanel from './TopicPanel';

/* ------------------------------------------------------------------ */
/*  Inner shell (consumes store)                                       */
/* ------------------------------------------------------------------ */

function ChatAppShellInner() {
  const { activeConversation } = useChatState();
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {activeConversation ? <ChatView /> : <WelcomeView />}
      </main>
      <TopicPanel />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Public export (provides store)                                     */
/* ------------------------------------------------------------------ */

export default function ChatAppShell() {
  return (
    <ChatStateProvider>
      <ChatAppShellInner />
    </ChatStateProvider>
  );
}
