import { LeadDetailsPanel } from './LeadDetailsPanel';
import { RecentEvents } from './RecentEvents';
import { MeetingPanel } from './MeetingPanel';
import { FollowUpSchedule } from './FollowUpSchedule';

export function DashboardPanel() {
  return (
    <div className="grid h-full min-h-0 auto-rows-fr grid-cols-1 gap-3 overflow-y-auto md:grid-cols-2 md:gap-4">
      <LeadDetailsPanel className="md:col-span-2" />
      <MeetingPanel />
      <FollowUpSchedule />
      <RecentEvents className="md:col-span-2" />
    </div>
  );
}
