'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, BarChart3, RefreshCw, Users } from 'lucide-react';

interface FunnelPoint {
  state: string;
  count: number;
  percentage: number;
}

interface OutcomePoint {
  label: string;
  count: number;
  percentage: number;
}

interface DropOffPoint {
  question: number;
  count: number;
  percentage: number;
}

interface RecentSession {
  id: string;
  industry: string | null;
  score: number | null;
  scoreLabel: string | null;
  status: string | null;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
}

interface AnalyticsResponse {
  generatedAt: string;
  totalSessions: number;
  funnel: FunnelPoint[];
  outcomes: OutcomePoint[];
  dropOff: DropOffPoint[];
  recentSessions: RecentSession[];
}

const OUTCOME_COLORS = ['#22c55e', '#f59e0b', '#3b82f6'];

function toTitle(value: string | null) {
  if (!value) return 'N/A';
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDuration(durationMs: number | null) {
  if (!durationMs || durationMs <= 0) return '—';

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/analytics');
      if (!res.ok) {
        throw new Error('Failed to load analytics data');
      }

      const payload: AnalyticsResponse = await res.json();
      setData(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const funnelData = useMemo(
    () =>
      (data?.funnel ?? []).map((point) => ({
        ...point,
        stateLabel: toTitle(point.state),
      })),
    [data],
  );

  const outcomeData = useMemo(
    () =>
      (data?.outcomes ?? []).map((point) => ({
        ...point,
        labelText: toTitle(point.label),
      })),
    [data],
  );

  const dropOffData = data?.dropOff ?? [];
  const recentSessions = data?.recentSessions ?? [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background p-6 md:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-10%] top-[-15%] h-[38%] w-[38%] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute right-[-8%] top-[15%] h-[35%] w-[35%] rounded-full bg-emerald-500/10 blur-[110px]" />
        <div className="absolute bottom-[-20%] left-[30%] h-[50%] w-[50%] rounded-full bg-indigo-500/10 blur-[150px]" />
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        <div className="glass-card border border-slate-700/50 bg-slate-900/40 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Analytics Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white">
                Conversion and Qualification Metrics
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Funnel progress, outcome distribution, question drop-off, and recent sessions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full border border-slate-700/60 bg-slate-900/60 px-4 py-2 text-sm text-slate-300">
                Total Sessions:{' '}
                <span className="font-semibold text-white">{data?.totalSessions ?? 0}</span>
              </div>
              <button
                type="button"
                onClick={fetchAnalytics}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="glass-card flex items-center justify-center gap-3 border border-slate-700/50 bg-slate-900/40 p-10 text-slate-300">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
            <span>Loading analytics...</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="glass-card border border-red-500/40 bg-red-950/20 p-5">
            <p className="font-medium text-red-300">Unable to load analytics data.</p>
            <p className="mt-1 text-sm text-red-200/90">{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="glass-card col-span-1 border border-slate-700/50 bg-slate-900/40 p-6 xl:col-span-2">
                <div className="mb-5 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-300" />
                  <h2 className="text-lg font-bold text-slate-100">Conversion Funnel</h2>
                </div>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                      <XAxis
                        dataKey="stateLabel"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={65}
                      />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                        contentStyle={{
                          backgroundColor: 'rgba(15,23,42,0.95)',
                          border: '1px solid rgba(100,116,139,0.4)',
                          borderRadius: '0.75rem',
                          color: '#e2e8f0',
                        }}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card border border-slate-700/50 bg-slate-900/40 p-6">
                <div className="mb-5 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-300" />
                  <h2 className="text-lg font-bold text-slate-100">Outcome Distribution</h2>
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={outcomeData}
                        dataKey="count"
                        nameKey="labelText"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {outcomeData.map((entry, index) => (
                          <Cell
                            key={entry.label}
                            fill={OUTCOME_COLORS[index % OUTCOME_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15,23,42,0.95)',
                          border: '1px solid rgba(100,116,139,0.4)',
                          borderRadius: '0.75rem',
                          color: '#e2e8f0',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {outcomeData.map((item, index) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: OUTCOME_COLORS[index % OUTCOME_COLORS.length] }}
                        />
                        <span className="text-slate-300">{item.labelText}</span>
                      </div>
                      <span className="font-semibold text-slate-100">
                        {item.percentage.toFixed(1)}% ({item.count})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="glass-card border border-slate-700/50 bg-slate-900/40 p-6 xl:col-span-1">
                <div className="mb-5 flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-300" />
                  <h2 className="text-lg font-bold text-slate-100">Drop-Off by Question</h2>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {dropOffData.map((point) => {
                    const intensity = Math.min(0.12 + point.percentage / 100, 0.7);
                    return (
                      <div
                        key={point.question}
                        className="rounded-xl border border-slate-700/60 p-3"
                        style={{ backgroundColor: `rgba(239,68,68,${intensity})` }}
                      >
                        <p className="text-xs uppercase tracking-[0.15em] text-slate-200/90">
                          Question {point.question}
                        </p>
                        <p className="mt-1 text-2xl font-bold text-white">
                          {point.percentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-200/90">
                          {point.count} sessions dropped here
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass-card border border-slate-700/50 bg-slate-900/40 p-6 xl:col-span-2">
                <h2 className="mb-5 text-lg font-bold text-slate-100">Recent Sessions</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                        <th className="px-3 py-2">Session</th>
                        <th className="px-3 py-2">Industry</th>
                        <th className="px-3 py-2">Score</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Duration</th>
                        <th className="px-3 py-2">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSessions.length === 0 && (
                        <tr>
                          <td className="px-3 py-6 text-center text-slate-500" colSpan={6}>
                            No sessions available yet.
                          </td>
                        </tr>
                      )}

                      {recentSessions.map((session) => (
                        <tr key={session.id} className="rounded-xl bg-slate-800/50 text-slate-200">
                          <td className="rounded-l-xl px-3 py-3 font-mono text-xs text-slate-300">
                            {session.id.slice(0, 8)}...
                          </td>
                          <td className="px-3 py-3">{toTitle(session.industry)}</td>
                          <td className="px-3 py-3">
                            {typeof session.score === 'number'
                              ? `${session.score} (${toTitle(session.scoreLabel)})`
                              : '—'}
                          </td>
                          <td className="px-3 py-3">{toTitle(session.status)}</td>
                          <td className="px-3 py-3">{formatDuration(session.durationMs)}</td>
                          <td className="rounded-r-xl px-3 py-3 text-slate-300">
                            {formatDate(session.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
