'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { LiveCallPanel } from '@/components/chat/LiveCallPanel';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';
import { BrandMark } from '@/components/brand/BrandMark';
import { useSSEConnection } from '@/lib/sse/useSSEConnection';
import { useSessionStore } from '@/stores/sessionStore';
import { useChatStore } from '@/stores/chatStore';
import { useDashboardStore } from '@/stores/dashboardStore';
import { scenarioGuides } from '@/lib/scenarioGuides';
import { industryCatalog } from '@/lib/industryCatalog';
import type { IndustryType, ChatMessage, TimelineEvent, WorkflowState } from '@/types';
import type {
  DashboardFollowUpState,
  DashboardLeadFields,
  DashboardMeetingState,
} from '@/stores/dashboardStore';
import { mapLeadFieldsForDashboard } from '@/lib/dashboard/leadFieldMapping';
import { meetingFromEvents } from '@/lib/dashboard/meetingMapping';

interface SessionApiFollowUpJob {
  day: number;
  type: string;
  description: string;
  status: string;
}

interface SessionApiEvent {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface SessionApiResponse {
  id: string;
  industry: IndustryType;
  currentState: WorkflowState;
  messages?: ChatMessage[];
  followUpJobs?: SessionApiFollowUpJob[];
  events?: SessionApiEvent[];
  leadFields?: Record<string, unknown>;
}

export default function SessionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = params.id;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'chat' | 'dashboard'>('chat');
  const [isSwitchingIndustry, setIsSwitchingIndustry] = useState(false);

  const { industry, isConnected, createSession } = useSessionStore();
  const setMessages = useChatStore((state) => state.setMessages);
  const setHydratedState = useDashboardStore((state) => state.setHydratedState);

  const handleSwitchIndustry = async (nextIndustry: IndustryType) => {
    if (isSwitchingIndustry || !industry || nextIndustry === industry) return;

    try {
      setIsSwitchingIndustry(true);
      const nextSessionId = await createSession(nextIndustry);
      router.push(`/session/${nextSessionId}`);
    } catch (err) {
      console.error('Failed to switch industry:', err);
      setIsSwitchingIndustry(false);
    }
  };

  useSSEConnection(sessionId);

  useEffect(() => {
    if (isConnected) {
      setHasConnectedOnce(true);
    }
  }, [isConnected]);

  useEffect(() => {
    async function loadSession() {
      if (!sessionId) return;

      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Session not found');
          throw new Error('Failed to load session');
        }

        const session: SessionApiResponse = await res.json();

        useSessionStore.setState({
          sessionId: session.id,
          industry: session.industry,
          currentState: session.currentState,
        });

        setMessages(session.messages || []);

        const followUps: DashboardFollowUpState[] = (session.followUpJobs || []).map((job) => ({
          day: job.day,
          label: job.type,
          description: job.description,
          status: String(job.status).toLowerCase(),
        }));

        const events: TimelineEvent[] = (session.events || []).map((ev) => ({
          id: ev.id,
          type: ev.type,
          description: ev.description,
          timestamp: ev.createdAt,
          metadata: ev.metadata ?? {},
        }));
        const meeting: DashboardMeetingState | null = meetingFromEvents(session.events);

        const mappedLeadFields = mapLeadFieldsForDashboard(
          session.leadFields,
        ) as Partial<DashboardLeadFields>;

        setHydratedState(mappedLeadFields, meeting, events, followUps);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, [sessionId, setMessages, setHydratedState]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-slate-400">Loading session context...</p>
      </div>
    );
  }

  if (error || !industry) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4 bg-background">
        <p className="text-lg text-red-400">Error loading session</p>
        <p className="text-slate-500">{error || 'Session is corrupted or missing industry'}</p>
        <button
          onClick={() => {
            window.location.href = '/';
          }}
          className="mt-4 rounded-md bg-slate-800 px-4 py-2 text-slate-200 transition-colors hover:bg-slate-700"
        >
          New Session
        </button>
      </div>
    );
  }

  const guide = scenarioGuides[industry];

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background">
      {/* Reconnection banner */}
      {hasConnectedOnce && !isConnected && (
        <div
          aria-live="polite"
          className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 shadow-lg backdrop-blur"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Reconnecting...
        </div>
      )}

      {/* Background blurs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="bg-blue-600/18 absolute -left-[12%] top-[-14%] h-[42%] w-[42%] rounded-full blur-[130px]" />
        <div className="bg-indigo-500/14 absolute -right-[18%] bottom-[-24%] h-[62%] w-[62%] rounded-full blur-[170px]" />
      </div>

      {/* ─── Compact Title Bar ─── */}
      <header className="relative z-10 flex-shrink-0 border-b border-slate-700/50 bg-slate-900/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 md:px-6">
          {/* Left: Title */}
          <div className="flex items-center gap-3">
            <BrandMark
              size={36}
              className="h-9 w-9 rounded-xl shadow-lg shadow-blue-500/20"
              priority
            />
            <div>
              <h1 className="text-lg font-bold leading-tight text-white md:text-xl">
                Sales Qualification AI
              </h1>
              <p className="hidden text-xs text-slate-400 sm:block">
                AI-powered lead qualification &middot; Live demo
              </p>
            </div>
          </div>

          {/* Center: Industry Pills */}
          <nav className="hidden items-center gap-1.5 md:flex" aria-label="Select industry">
            {industryCatalog.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === industry;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSwitchIndustry(item.id)}
                  disabled={isSwitchingIndustry}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    isActive
                      ? 'border border-blue-400/50 bg-blue-500/20 text-white shadow-sm shadow-blue-500/10'
                      : 'border border-transparent text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                  aria-pressed={isActive}
                >
                  <Icon
                    className="h-3.5 w-3.5"
                    style={{ color: isActive ? item.color : undefined }}
                  />
                  <span className="hidden lg:inline">{item.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Scenario Hint */}
          <div className="hidden items-center gap-2 xl:flex">
            <div className="flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span className="max-w-[220px] truncate">{guide.suggestedInputs[0]}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Mobile Tab Switcher ─── */}
      <div className="flex flex-shrink-0 border-b border-slate-700/50 bg-slate-900/50 p-1.5 lg:hidden">
        <button
          type="button"
          onClick={() => setActiveMobileTab('chat')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            activeMobileTab === 'chat'
              ? 'bg-blue-600/85 text-white'
              : 'text-slate-300 hover:bg-slate-800/80'
          }`}
        >
          Live Call
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('dashboard')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            activeMobileTab === 'dashboard'
              ? 'bg-blue-600/85 text-white'
              : 'text-slate-300 hover:bg-slate-800/80'
          }`}
        >
          Dashboard
        </button>
      </div>

      {/* ─── Main Content: Chat + Dashboard ─── */}
      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 gap-4 p-3 md:p-4">
        {/* Chat Panel */}
        <div
          className={`${activeMobileTab === 'chat' ? 'flex' : 'hidden'} min-h-0 w-full flex-col lg:flex lg:w-[42%] lg:min-w-[380px] xl:w-[38%]`}
        >
          <LiveCallPanel guide={guide} />
        </div>

        {/* Dashboard Panel */}
        <div
          className={`${activeMobileTab === 'dashboard' ? 'flex' : 'hidden'} min-h-0 w-full flex-1 flex-col lg:flex`}
        >
          <DashboardPanel />
        </div>
      </main>
    </div>
  );
}
