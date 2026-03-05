import { useSessionStore } from '@/stores/sessionStore';

export function CallHeader() {
  const isConnected = useSessionStore((state) => state.isConnected);

  return (
    <div className="flex items-center justify-between border-b border-slate-700/65 bg-slate-900/85 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="relative inline-flex h-3 w-3 items-center justify-center">
          <span
            className={`absolute h-2.5 w-2.5 rounded-full ${
              isConnected ? 'bg-emerald-400' : 'bg-slate-500'
            }`}
          />
          {isConnected && (
            <span className="absolute h-full w-full animate-ping rounded-full border border-emerald-400/40" />
          )}
        </span>
        <span
          className="text-[1.35rem] font-bold uppercase tracking-[0.08em] text-slate-100"
          data-testid="live-call-title"
        >
          Live Call
        </span>
      </div>

      <div className="rounded-full border border-slate-700/70 bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-300">
        {isConnected ? 'Connected' : 'Reconnecting'}
      </div>
    </div>
  );
}
