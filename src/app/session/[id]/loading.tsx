import { Loader2 } from 'lucide-react';

export default function SessionLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="glass-card flex w-full max-w-2xl flex-col items-center gap-4 border border-slate-700/60 bg-slate-900/40 p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        <p className="text-base font-medium text-slate-200">Loading session context...</p>
        <div className="h-2 w-full animate-pulse rounded bg-slate-700/60" />
        <div className="h-2 w-5/6 animate-pulse rounded bg-slate-700/50" />
      </div>
    </main>
  );
}
