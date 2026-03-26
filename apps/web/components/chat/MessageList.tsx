'use client';

import React, { useEffect, useRef } from 'react';
import { useChatState } from '@/components/chat/ChatStateProvider';
import MessageItem from '@/components/chat/MessageItem';
import TypingIndicator from '@/components/chat/TypingIndicator';

export default function MessageList() {
  const activeConversation = useChatState((s) => s.activeConversation);
  const allMessages = useChatState((s) => s.messages);
  const isTyping = useChatState((s) => s.isTyping);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = activeConversation ? (allMessages[activeConversation] ?? []) : [];

  // Auto-scroll to bottom on new messages or when typing starts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="chat-messages" ref={scrollRef}>
      <div className="chat-scroll">
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
        {isTyping && <TypingIndicator />}
      </div>
    </div>
  );
}
