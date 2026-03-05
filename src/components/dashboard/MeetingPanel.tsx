'use client';

import { Calendar, Clock, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useDashboardStore } from '@/stores/dashboardStore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function MeetingPanel({ className }: { className?: string }) {
  const meeting = useDashboardStore((state) => state.meeting);
  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  return (
    <section
      className={cn(
        'glass-card bg-slate-900/58 flex min-h-0 flex-col rounded-2xl border border-slate-700/70 p-4 md:p-5',
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-slate-300" />
        <h3 className="text-xl font-semibold text-slate-100">Meeting Scheduled</h3>
      </div>

      <div className="flex flex-1 items-center">
        {!meeting ? (
          <div className="flex w-full flex-col items-center rounded-xl border border-dashed border-slate-700/90 bg-slate-950/35 px-5 py-6 text-center">
            <Info className="mb-2 h-6 w-6 text-slate-500" />
            <p className="text-sm text-slate-300">No meeting scheduled yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Meeting slots appear after qualification completes.
            </p>
          </div>
        ) : (
          <div className="animate-fade-in-up w-full rounded-xl border border-blue-500/35 bg-blue-500/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-base font-semibold text-slate-100">{meeting.title}</p>
              <span className="rounded-full border border-blue-400/40 bg-blue-500/15 px-2 py-0.5 text-[11px] font-medium text-blue-200">
                {meeting.status}
              </span>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-blue-200">
              <Clock className="h-3.5 w-3.5" />
              {formatDateTime(meeting.dateTime)}
            </p>
            {meeting.status.toLowerCase() === 'proposed' &&
              Array.isArray(meeting.proposedTimes) && (
                <div className="mt-3 space-y-2">
                  {meeting.proposedTimes.slice(0, 2).map((time, index) => (
                    <div
                      key={`${time}-${index}`}
                      className="rounded-md border border-slate-600/70 bg-slate-900/55 px-3 py-2 text-xs text-slate-200"
                    >
                      Option {index + 1}: {formatDateTime(time)}
                    </div>
                  ))}
                  <p className="text-xs text-slate-400">
                    Reply with <span className="font-semibold text-slate-200">Option 1</span> or{' '}
                    <span className="font-semibold text-slate-200">Option 2</span> in chat.
                  </p>
                </div>
              )}
            {meeting.meetingLink && (
              <a
                href={meeting.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-xs font-medium text-cyan-200 underline-offset-2 hover:underline"
              >
                Open meeting link
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
