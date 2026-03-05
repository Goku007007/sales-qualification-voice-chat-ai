import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { useChatStore } from '@/stores/chatStore';

export function MessageList() {
  const messages = useChatStore((state) => state.messages);
  const isAgentTyping = useChatStore((state) => state.isAgentTyping);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentTyping]);

  return (
    <div
      aria-label="Conversation messages"
      className="h-full min-h-0 overflow-y-auto overscroll-contain scroll-smooth px-4 py-3.5 pb-24 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
      role="log"
      tabIndex={0}
    >
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="max-w-[260px] rounded-xl border border-slate-700/70 bg-slate-900/55 px-4 py-3 text-center text-sm text-slate-300">
            Start with the scenario prompts above and the AI agent will continue the call.
          </p>
        </div>
      ) : (
        messages.map((message) => <MessageBubble key={message.id} message={message} />)
      )}

      {isAgentTyping && (
        <div className="animate-fade-in-up mb-3 flex justify-start">
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/70 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 animate-bounce rounded-full bg-slate-300"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="h-2 w-2 animate-bounce rounded-full bg-slate-300"
                style={{ animationDelay: '130ms' }}
              />
              <span
                className="h-2 w-2 animate-bounce rounded-full bg-slate-300"
                style={{ animationDelay: '260ms' }}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
