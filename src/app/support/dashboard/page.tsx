'use client';

import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics';

export default function SupportDashboardPage() {
  return (
    <>
      <DashboardMetrics
        title="Support & Admin Operations"
        metrics={[
          { label: 'Open Tickets', value: 14, tone: 'pending' },
          { label: 'Critical Alerts', value: 3, tone: 'denied' },
          { label: 'Follow-ups Due', value: 9, tone: 'in_progress' },
          { label: 'Notifications Sent', value: 128, sub: 'Last 24h' },
          { label: 'SLA Breaches', value: 2, tone: 'escalated' },
        ]}
      />
    </>
  );
}
