'use client';

import { useMemo } from 'react';
import { MoreHorizontal } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ConversationItem {
  id: string;
  title: string;
  preview: string;
  icon: string;
  time: string;
  group: string;
}

interface ConversationListProps {
  conversations: ConversationItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ConversationList({
  conversations,
  activeId,
  onSelect,
}: ConversationListProps) {
  /* Group conversations by their `group` field, preserving insertion order */
  const groups = useMemo(() => {
    const map = new Map<string, ConversationItem[]>();
    for (const conv of conversations) {
      const list = map.get(conv.group);
      if (list) {
        list.push(conv);
      } else {
        map.set(conv.group, [conv]);
      }
    }
    return Array.from(map.entries());
  }, [conversations]);

  /* Running index across all items for staggered animation */
  let itemIndex = 0;

  return (
    <div className="sb-list">
      {groups.map(([group, items]) => (
        <div key={group}>
          {/* Group header */}
          <div className="sb-group">{group}</div>

          {items.map((conv) => {
            const idx = itemIndex++;
            const isActive = conv.id === activeId;

            return (
              <div
                key={conv.id}
                className={`sb-item${isActive ? ' active' : ''}`}
                onClick={() => onSelect(conv.id)}
                style={{
                  animation: `sidebarItemIn 0.35s var(--ease-out) ${idx * 0.04}s both`,
                }}
              >
                {/* Icon */}
                <span className="sb-item-icon">{conv.icon}</span>

                {/* Body */}
                <div className="sb-item-body">
                  <div className="sb-item-title">{conv.title}</div>
                  <div className="sb-item-preview">{conv.preview}</div>
                </div>

                {/* Meta (time) — hidden on hover via CSS */}
                <span className="sb-item-meta">{conv.time}</span>

                {/* Actions — visible on hover via CSS */}
                <div className="sb-item-actions">
                  <button
                    className="icon-btn xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      /* menu handler placeholder */
                    }}
                    aria-label="More actions"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
