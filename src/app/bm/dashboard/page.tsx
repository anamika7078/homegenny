'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics';
import { api } from '@/lib/api/client';
import { Users, Briefcase, AlertCircle, TrendingUp, Clock } from 'lucide-react';

function unwrapStats(body: unknown): Record<string, number | string> {
  if (body == null || typeof body !== 'object') return {};
  const wrapped = body as { data?: Record<string, number | string> };
  return (wrapped.data !== undefined ? wrapped.data : body) as Record<string, number | string>;
}

export default function BMDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'bm'],
    queryFn: () => api.getDashboardBm(),
  });

  const stats = unwrapStats(data);

  const metrics = [
    { label: 'Total Applicants', value: Number(stats.total_applicants ?? 0), sub: 'All series', icon: <Users size={18} /> },
    { label: 'Deployed (S5)', value: Number(stats.deployed ?? 0), tone: 'in_progress' as const, icon: <Briefcase size={18} /> },
    { label: 'Pending Approvals', value: Number(stats.pending_approvals ?? 0), tone: 'pending' as const, icon: <Clock size={18} /> },
    { label: 'Escalation Queue', value: Number(stats.escalation_queue ?? 0), tone: 'escalated' as const, icon: <AlertCircle size={18} /> },
    { label: 'Trial Expiry Alerts', value: Number(stats.trial_expiry_alerts ?? 0), tone: 'denied' as const, icon: <TrendingUp size={18} /> },
  ];

  return (
    <>
      <DashboardMetrics
        title="Branch Manager Dashboard"
        metrics={metrics}
        loading={isLoading}
      />
      {isError && !isLoading && (
        <p className="px-6 pb-6 text-sm text-secondary-foreground text-center">
          Could not load live KPIs — showing zeros. Check that the API is running.
        </p>
      )}
    </>
  );
}