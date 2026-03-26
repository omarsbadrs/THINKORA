'use client';

import React, { createContext, useContext, useRef } from 'react';
import { createStore, useStore } from 'zustand';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Conversation {
  id: string;
  icon: string;
  title: string;
  preview: string;
  time: string;
  group: string;
}

export interface Citation {
  source: string;
  text: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Citation[];
}

export interface ChatState {
  /* sidebar */
  sidebarCollapsed: boolean;
  searchOpen: boolean;

  /* topic panel */
  isTopicPanelOpen: boolean;

  /* conversation */
  activeConversation: string | null;
  conversations: Conversation[];

  /* messages — keyed by conversation id */
  messages: Record<string, Message[]>;
  isTyping: boolean;

  /* model / routing */
  selectedModel: string;
  selectedRoutingMode: string;

  /* drawers */
  advancedModelDrawerOpen: boolean;

  /* actions */
  toggleCollapsed: () => void;
  toggleSearch: () => void;
  toggleTopicPanel: () => void;
  toggleAdvancedModelDrawer: () => void;
  setActiveConversation: (id: string) => void;
  setSelectedModel: (model: string) => void;
  setSelectedRoutingMode: (mode: string) => void;
  createNewConversation: () => void;
  sendMessage: (text: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

const DEMO_CONVERSATIONS: Conversation[] = [
  { id: 'conv-1', icon: '\u{1F4AC}', title: 'Project Setup Guide',       preview: 'Let me help you configure\u2026',         time: '2m',  group: 'Today' },
  { id: 'conv-2', icon: '\u{1F517}', title: 'API Integration',            preview: "Here's how to connect the REST\u2026",    time: '1h',  group: 'Today' },
  { id: 'conv-3', icon: '\u{1F41B}', title: 'Debugging Session',          preview: 'The error originates from\u2026',         time: '3h',  group: 'Today' },
  { id: 'conv-4', icon: '\u{1F3D7}\uFE0F', title: 'Architecture Design',  preview: "For microservices, I'd recommend\u2026", time: '1d',  group: 'Yesterday' },
  { id: 'conv-5', icon: '\u{1F4DD}', title: 'Code Review Notes',          preview: 'Found a few improvements\u2026',          time: '1d',  group: 'Yesterday' },
  { id: 'conv-6', icon: '\u{1F680}', title: 'Deployment Pipeline',        preview: 'CI/CD with GitHub Actions\u2026',         time: '3d',  group: 'This Week' },
  { id: 'conv-7', icon: '\u26A1',    title: 'Performance Optimization',   preview: 'Bundle size can be reduced\u2026',        time: '5d',  group: 'This Week' },
];

const DEMO_MESSAGES: Record<string, Message[]> = {
  'conv-1': [
    {
      id: 'msg-1',
      role: 'user',
      content: 'How do I set up a new project?',
      timestamp: '2 min ago',
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: "Great question! Here's a step-by-step guide...",
      timestamp: '2 min ago',
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Store factory                                                      */
/* ------------------------------------------------------------------ */

type ChatStore = ReturnType<typeof createChatStore>;

function createChatStore() {
  return createStore<ChatState>((set, get) => ({
    sidebarCollapsed: false,
    searchOpen: false,
    isTopicPanelOpen: false,
    activeConversation: null,
    conversations: DEMO_CONVERSATIONS,
    messages: DEMO_MESSAGES,
    isTyping: false,
    selectedModel: 'auto',
    selectedRoutingMode: 'auto',
    advancedModelDrawerOpen: false,

    toggleCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
    toggleTopicPanel: () => set((s) => ({ isTopicPanelOpen: !s.isTopicPanelOpen })),
    toggleAdvancedModelDrawer: () =>
      set((s) => ({ advancedModelDrawerOpen: !s.advancedModelDrawerOpen })),

    setActiveConversation: (id) => set({ activeConversation: id }),
    setSelectedModel: (model) => set({ selectedModel: model }),
    setSelectedRoutingMode: (mode) => set({ selectedRoutingMode: mode }),

    createNewConversation: () => set({ activeConversation: null }),

    sendMessage: (text: string) => {
      const state = get();
      const convId = state.activeConversation ?? `conv-${Date.now()}`;
      const existing = state.messages[convId] ?? [];

      const userMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      set({
        messages: { ...state.messages, [convId]: [...existing, userMsg] },
        isTyping: true,
        activeConversation: convId,
      });

      // If we just created a new conversation, add it to the list
      if (!state.activeConversation) {
        const newConv: Conversation = {
          id: convId,
          icon: '\u{1F4AC}',
          title: text.slice(0, 40) || 'New Chat',
          preview: text.slice(0, 60),
          time: 'now',
          group: 'Today',
        };
        set((s) => ({ conversations: [newConv, ...s.conversations] }));
      }

      // Simulate assistant reply after 1.2s delay
      setTimeout(() => {
        const assistantMsg: Message = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content:
            "Thank you for your message. I'm processing your request and will provide a detailed response shortly.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        set((s) => ({
          messages: {
            ...s.messages,
            [convId]: [...(s.messages[convId] ?? []), assistantMsg],
          },
          isTyping: false,
        }));
      }, 1200);
    },
  }));
}

/* ------------------------------------------------------------------ */
/*  React context                                                      */
/* ------------------------------------------------------------------ */

const ChatStoreContext = createContext<ChatStore | null>(null);

export function ChatStateProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<ChatStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createChatStore();
  }
  return (
    <ChatStoreContext.Provider value={storeRef.current}>
      {children}
    </ChatStoreContext.Provider>
  );
}

export function useChatState(): ChatState;
export function useChatState<T>(selector: (s: ChatState) => T): T;
export function useChatState<T>(selector?: (s: ChatState) => T) {
  const store = useContext(ChatStoreContext);
  if (!store) throw new Error('useChatState must be used within ChatStateProvider');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useStore(store, (selector ?? ((s: ChatState) => s)) as any);
}
