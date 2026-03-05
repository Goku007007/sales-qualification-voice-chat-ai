'use client';

import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global app error boundary caught:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="glass-card w-full max-w-xl border border-red-500/30 bg-red-950/20 p-8">
        <div className="mb-4 flex items-center gap-3 text-red-300">
          <AlertTriangle className="h-6 w-6" />
          <h1 className="text-xl font-bold">Something went wrong</h1>
        </div>

        <p className="text-sm text-red-100/90">
          An unexpected error occurred while rendering this page.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md bg-red-500/80 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>

          <Link
            href="/"
            className="rounded-md border border-slate-600 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-700"
          >
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}
