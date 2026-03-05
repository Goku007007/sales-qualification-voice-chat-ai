import type { IndustryType } from '@/types';
import { scenarioGuides } from '@/lib/scenarioGuides';

export function ScenarioGuideCard({ industry }: { industry: IndustryType }) {
  const guide = scenarioGuides[industry];

  return (
    <section className="glass-card border border-slate-700/60 bg-slate-900/40 p-4 md:p-5">
      <h2 className="text-base font-bold text-slate-100 md:text-lg">{guide.title}</h2>
      <p className="mt-2 text-sm text-slate-300">{guide.situation}</p>
      <p className="mt-2 text-sm text-slate-300">{guide.objective}</p>

      <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-950/50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          Try Typing
        </p>
        <ul className="mt-2 space-y-1 text-sm text-slate-200">
          {guide.suggestedInputs.slice(0, 3).map((line) => (
            <li key={line} className="leading-relaxed">
              {line}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
