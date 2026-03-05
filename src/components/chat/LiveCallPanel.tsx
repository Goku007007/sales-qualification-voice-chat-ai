import { CallHeader } from './CallHeader';
import { AudioWaveform } from './AudioWaveform';
import { MessageList } from './MessageList';
import { ComposerBar } from './ComposerBar';
import { ScenarioAssist } from './ScenarioAssist';
import type { ScenarioGuide } from '@/lib/scenarioGuides';

interface LiveCallPanelProps {
  guide: ScenarioGuide;
}

export function LiveCallPanel({ guide }: LiveCallPanelProps) {
  return (
    <div className="glass-card bg-slate-900/56 flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-700/70 shadow-xl">
      <CallHeader />

      <div className="bg-slate-900/72 border-b border-slate-700/55 px-4 py-2.5">
        <AudioWaveform />
      </div>
      <ScenarioAssist guide={guide} />

      <div className="relative flex min-h-0 flex-1 overflow-hidden bg-gradient-to-b from-slate-950/25 via-slate-900/45 to-slate-900/60">
        <MessageList />
      </div>

      <div className="bg-slate-900/78 relative z-10 border-t border-slate-700/55 px-4 py-3">
        <ComposerBar />
      </div>
    </div>
  );
}
