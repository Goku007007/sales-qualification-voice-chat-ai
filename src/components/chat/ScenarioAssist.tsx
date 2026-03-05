'use client';

import { useMemo } from 'react';
import { Lightbulb, Target } from 'lucide-react';
import type { ScenarioGuide } from '@/lib/scenarioGuides';
import { useSessionStore } from '@/stores/sessionStore';
import { useChatStore } from '@/stores/chatStore';
import { useDashboardStore } from '@/stores/dashboardStore';
import { getReplySuggestions } from '@/lib/scenario/replySuggestions';

interface ScenarioAssistProps {
  guide: ScenarioGuide;
}

export function ScenarioAssist({ guide }: ScenarioAssistProps) {
  const sessionId = useSessionStore((state) => state.sessionId);
  const industry = useSessionStore((state) => state.industry);
  const currentState = useSessionStore((state) => state.currentState);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const messages = useChatStore((state) => state.messages);
  const isAgentTyping = useChatStore((state) => state.isAgentTyping);
  const isSendingMessage = useChatStore((state) => state.isSendingMessage);
  const leadFields = useDashboardStore((state) => state.leadFields);
  const meeting = useDashboardStore((state) => state.meeting);

  const latestAgentMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'agent')?.content ?? '',
    [messages],
  );

  const suggestions = useMemo(() => {
    if (!industry) return guide.suggestedInputs;
    return getReplySuggestions({
      industry,
      currentState,
      latestAgentMessage,
      leadFields,
      meeting,
      fallback: guide.suggestedInputs,
    });
  }, [industry, currentState, latestAgentMessage, leadFields, meeting, guide.suggestedInputs]);

  const isClosed = currentState === 'COMPLETED' || currentState === 'ERROR';
  const canSendSuggestion = Boolean(sessionId) && !isAgentTyping && !isSendingMessage && !isClosed;

  const handleSuggestion = async (text: string) => {
    if (!sessionId || !canSendSuggestion) return;
    await sendMessage(sessionId, text, 'text');
  };

  return (
    <div className="border-b border-slate-700/55 bg-slate-900/60 px-4 py-3">
      <div className="rounded-xl border border-slate-700/80 bg-slate-950/35 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-cyan-300">
          {guide.title}
        </p>
        <p className="mt-1 text-xs text-slate-300">{guide.situation}</p>
        <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-400">
          <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
          {guide.objective}
        </p>

        <div className="mt-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            <Lightbulb className="h-3.5 w-3.5 text-amber-300" />
            Suggested replies
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={!canSendSuggestion}
                onClick={() => void handleSuggestion(suggestion)}
                className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-left text-xs text-blue-100 transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
