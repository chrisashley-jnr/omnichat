'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/lib/useVideoChat';

export default function ChatPanel({
  messages,
  strangerTyping,
  disabled,
  onSend,
  onTyping,
}: {
  messages: ChatMessage[];
  strangerTyping: boolean;
  disabled: boolean;
  onSend: (text: string) => void;
  onTyping: (isTyping: boolean) => void;
}) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, strangerTyping]);

  function handleChange(value: string) {
    setDraft(value);
    onTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping(false), 1200);
  }

  function submit() {
    if (!draft.trim() || disabled) return;
    onSend(draft);
    setDraft('');
    onTyping(false);
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-edge bg-panel">
      <div
        ref={listRef}
        className="flex-1 space-y-2 overflow-y-auto px-3 py-3 text-sm"
      >
        {messages.length === 0 && (
          <p className="text-mist/60">
            Say hi — messages here are only visible to the two of you.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-1.5 ${
              m.from === 'me'
                ? 'ml-auto bg-signal/15 text-white'
                : 'bg-edge/60 text-white'
            }`}
          >
            {m.text}
          </div>
        ))}
        {strangerTyping && (
          <div className="w-fit rounded-lg bg-edge/40 px-3 py-1.5 text-mist/70">
            Stranger is typing…
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-edge p-2">
        <input
          value={draft}
          disabled={disabled}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={disabled ? 'Connect to chat' : 'Type a message'}
          className="flex-1 rounded-md bg-ink px-3 py-2 text-sm text-white placeholder:text-mist/50 disabled:opacity-50"
          maxLength={1000}
        />
        <button
          onClick={submit}
          disabled={disabled || !draft.trim()}
          className="rounded-md bg-signal px-3 py-2 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
