import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics Dashboard',
  description:
    'Conversion funnel, outcome distribution, question drop-off analysis, and recent session metrics for the Sales Qualification AI Agent.',
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
