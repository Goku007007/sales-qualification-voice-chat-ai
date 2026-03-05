'use client';

import { Filter } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useDashboardStore } from '@/stores/dashboardStore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function LeadDetailsPanel({ className }: { className?: string }) {
  const fields = useDashboardStore((state) => state.leadFields);

  const displayFields = [
    { key: 'budget', label: 'Budget', value: fields.budget },
    { key: 'timeline', label: 'Timeline', value: fields.timeline },
    { key: 'need', label: 'Need', value: fields.need },
    { key: 'decisionMaker', label: 'Decision Maker', value: fields.decisionMaker },
  ];

  return (
    <section
      className={cn(
        'glass-card bg-slate-900/58 flex min-h-0 flex-col rounded-2xl border border-slate-700/70 p-4 md:p-5',
        className,
      )}
    >
      <div className="mb-5 flex items-center gap-2">
        <Filter className="h-5 w-5 text-slate-300" />
        <h3 className="text-xl font-semibold text-slate-100">Lead Details</h3>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-3.5">
        {displayFields.map((field) => (
          <div key={field.key} className="flex items-center gap-3 text-sm">
            <span className="w-[108px] shrink-0 text-slate-300">{field.label}</span>
            <span className="h-px flex-1 border-b border-dotted border-slate-700/85" />
            <span
              className={cn(
                'min-w-[96px] text-right font-medium',
                field.value && field.value !== 'unknown' ? 'text-slate-100' : 'text-slate-500',
              )}
              title={field.value || undefined}
            >
              {field.value && field.value !== 'unknown' ? field.value : '—'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
