'use client';

import { Activity, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useDashboardStore } from '@/stores/dashboardStore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function RecentEvents({ className }: { className?: string }) {
  const events = useDashboardStore((state) => state.events);

  return (
    <section
      className={cn(
        'glass-card bg-slate-900/58 flex min-h-0 flex-col rounded-2xl border border-slate-700/70 p-4 md:p-5',
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-slate-300" />
        <h3 className="text-xl font-semibold text-slate-100">Recent Events</h3>
      </div>

      <div
        aria-label="Recent events timeline"
        className="-mr-1 flex-1 space-y-3 overflow-y-auto pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        role="region"
        tabIndex={0}
      >
        {events.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-700/75 bg-slate-950/35 text-sm text-slate-400">
            Waiting for events...
          </div>
        ) : (
          [...events].reverse().map((event, index) => (
            <article
              key={event.id}
              className="bg-slate-950/38 animate-fade-in-up flex items-start gap-2.5 rounded-lg border border-slate-700/75 p-2.5"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <div className="min-w-0">
                <p className="text-sm leading-snug text-slate-100">{event.description}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {format(new Date(event.timestamp), 'h:mm:ss a')}
                </p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
