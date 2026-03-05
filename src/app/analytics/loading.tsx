export default function AnalyticsLoading() {
  return (
    <main className="min-h-screen bg-background p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        <div className="glass-card border border-slate-700/50 bg-slate-900/40 p-6">
          <div className="h-5 w-48 animate-pulse rounded bg-slate-700/60" />
          <div className="mt-4 h-8 w-96 max-w-full animate-pulse rounded bg-slate-700/60" />
          <div className="mt-3 h-4 w-[32rem] max-w-full animate-pulse rounded bg-slate-700/50" />
        </div>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="glass-card col-span-1 border border-slate-700/50 bg-slate-900/40 p-6 xl:col-span-2">
            <div className="h-[320px] w-full animate-pulse rounded-xl bg-slate-800/60" />
          </div>
          <div className="glass-card border border-slate-700/50 bg-slate-900/40 p-6">
            <div className="h-[320px] w-full animate-pulse rounded-xl bg-slate-800/60" />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="glass-card border border-slate-700/50 bg-slate-900/40 p-6">
            <div className="h-[240px] w-full animate-pulse rounded-xl bg-slate-800/60" />
          </div>
          <div className="glass-card border border-slate-700/50 bg-slate-900/40 p-6 xl:col-span-2">
            <div className="h-[240px] w-full animate-pulse rounded-xl bg-slate-800/60" />
          </div>
        </section>
      </div>
    </main>
  );
}
