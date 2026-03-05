'use client';

import { CalendarClock, CheckCircle, Clock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useDashboardStore } from '@/stores/dashboardStore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function FollowUpSchedule({ className }: { className?: string }) {
  const followUps = useDashboardStore((state) => state.followUps);

  return (
    <section
      className={cn(
        'glass-card bg-slate-900/58 flex min-h-0 flex-col rounded-2xl border border-slate-700/70 p-4 md:p-5',
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-2 border-b border-slate-700/65 pb-3">
        <CalendarClock className="h-5 w-5 text-slate-300" />
        <h3 className="text-xl font-semibold text-slate-100">Follow-Up Schedule</h3>
      </div>

      <div
        aria-label="Follow-up schedule list"
        className="flex-1 overflow-y-auto pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        role="region"
        tabIndex={0}
      >
        {followUps.length === 0 ? (
          <div className="flex h-full min-h-[140px] items-center justify-center rounded-xl border border-dashed border-slate-700/80 bg-slate-950/35 text-sm italic text-slate-300">
            Follow-ups will appear after qualification
          </div>
        ) : (
          <div className="space-y-3">
            {followUps.map((job, index) => (
              <article
                key={`${job.day}-${job.label}-${index}`}
                className={cn(
                  'animate-fade-in-up rounded-xl border p-3.5',
                  job.status === 'completed'
                    ? 'bg-emerald-500/8 border-emerald-400/35'
                    : job.status === 'active' || job.status === 'scheduled'
                      ? 'border-blue-400/35 bg-blue-500/10'
                      : 'border-slate-700/80 bg-slate-900/40',
                )}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      In {job.day} {job.day === 1 ? 'Day' : 'Days'}
                    </p>
                    <p className="text-sm text-slate-200">{job.description}</p>
                  </div>

                  {job.status === 'completed' ? (
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
