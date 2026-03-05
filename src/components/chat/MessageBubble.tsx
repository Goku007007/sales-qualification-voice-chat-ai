import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ChatMessage } from '@/types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAgent = message.role === 'agent';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="animate-fade-in-up my-3 flex justify-center">
        <span className="rounded-full border border-slate-700/60 bg-slate-800/55 px-3 py-1 text-xs text-slate-400">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'animate-fade-in-up mb-3 flex w-full',
        isAgent ? 'justify-start' : 'justify-end',
      )}
    >
      <div
        className={cn(
          'max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[76%]',
          isAgent
            ? 'bg-blue-900/28 rounded-tl-md border border-blue-400/30 text-slate-100'
            : 'rounded-tr-md border border-slate-300/30 bg-slate-100 text-slate-900',
        )}
      >
        <p
          className={cn(
            'mb-1 text-xs font-semibold tracking-wide',
            isAgent ? 'text-blue-200/95' : 'text-slate-600',
          )}
        >
          {isAgent ? 'AI Agent' : 'Lead'}
        </p>
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  );
}
