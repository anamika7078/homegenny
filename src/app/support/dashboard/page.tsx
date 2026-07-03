'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics';
import { api } from '@/lib/api/client';
import { Spinner } from '@/components/ui/loading';

export default function SupportDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['support', 'alarms'],
    queryFn: () => api.getAlarms(),
    refetchInterval: 60000,
  });

  const alarms: any[] = Array.isArray(data) ? data : (data as any)?.data ?? [];
  const open = alarms.filter((a) => a.status === 'OPEN' || !a.is_read);
  const critical = alarms.filter((a) => a.severity === 'CRITICAL' || a.severity === 'HIGH');

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <DashboardMetrics
      title="Support & Admin Operations"
      metrics={[
        { label: 'Open Alarms', value: open.length, tone: open.length > 0 ? 'pending' : undefined },
        { label: 'Critical / High', value: critical.length, tone: critical.length > 0 ? 'denied' : undefined },
        { label: 'Total Issues', value: alarms.length },
        { label: 'Unread', value: alarms.filter((a) => !a.is_read).length, tone: 'in_progress' },
        { label: 'Resolved', value: alarms.filter((a) => a.status === 'RESOLVED').length, tone: 'escalated' },
      ]}
    />
  );
}
