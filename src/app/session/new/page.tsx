'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IndustrySelector } from '@/components/landing/IndustrySelector';
import { ScenarioGuideCard } from '@/components/session/ScenarioGuideCard';
import { BrandMark } from '@/components/brand/BrandMark';
import type { IndustryType } from '@/types';
import { useSessionStore } from '@/stores/sessionStore';

export default function NewSessionPage() {
  const router = useRouter();
  const createSession = useSessionStore((state) => state.createSession);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>('saas');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (isCreating) return;

    setIsCreating(true);
    setError(null);
    try {
      const sessionId = await createSession(selectedIndustry);
      router.push(`/session/${sessionId}`);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Could not start a session. Please try again.');
      setIsCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        <header className="flex items-center gap-3 px-1">
          <BrandMark
            size={44}
            className="h-11 w-11 rounded-xl shadow-lg shadow-blue-500/20"
            priority
          />
          <div>
            <h1 className="text-2xl font-bold text-white md:text-3xl">Sales Qualification AI</h1>
            <p className="text-sm text-slate-400 md:text-base">
              AI-powered lead qualification &middot; Live demo
            </p>
          </div>
        </header>

        <section className="glass-card border border-slate-700/60 bg-slate-900/40 p-5 md:p-7">
          <h2 className="text-2xl font-bold text-white md:text-3xl">Select Category</h2>
          <p className="mt-2 text-sm text-slate-300 md:text-base">
            Pick an industry and review the scenario prompts before starting.
          </p>
          <IndustrySelector
            onSelect={setSelectedIndustry}
            selectedId={selectedIndustry}
            showTitle={false}
          />
        </section>

        <ScenarioGuideCard industry={selectedIndustry} />

        <section className="glass-card border border-slate-700/60 bg-slate-900/40 p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-200">
              Ready to run the qualification call for{' '}
              <span className="font-semibold text-white">{selectedIndustry}</span>?
            </p>
            <button
              type="button"
              onClick={handleStart}
              disabled={isCreating}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {isCreating ? 'Starting...' : 'Start Session'}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        </section>
      </div>
    </main>
  );
}
