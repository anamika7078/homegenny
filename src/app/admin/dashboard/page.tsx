'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics';
import { api } from '@/lib/api/client';
import { Users, Briefcase, IndianRupee, Clock, AlertTriangle, Bell, UserCheck } from 'lucide-react';

function unwrapStats(body: unknown): Record<string, number | string> {
  if (body == null || typeof body !== 'object') return {};
  const wrapped = body as { data?: Record<string, number | string> };
  return (wrapped.data !== undefined ? wrapped.data : body) as Record<string, number | string>;
}

export default function AdminDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => api.getDashboardAdmin(),
  });

  const stats = unwrapStats(data);

  const metrics = [
    { label: 'Total Staff', value: Number(stats.total_staff ?? 0), sub: 'All series', icon: <Users size={18} /> },
    { label: 'Active Deployments', value: Number(stats.active_deployments ?? 0), tone: 'in_progress' as const, icon: <Briefcase size={18} /> },
    { label: 'Revenue (Paid)', value: `₹${Number(stats.revenue ?? 0).toLocaleString('en-IN')}`, sub: 'Invoices settled', icon: <IndianRupee size={18} /> },
    { label: 'Pending Verification', value: Number(stats.pending_verifications ?? 0), tone: 'pending' as const, icon: <Clock size={18} /> },
    { label: 'Open Escalations', value: Number(stats.open_escalations ?? 0), tone: 'escalated' as const, icon: <AlertTriangle size={18} /> },
    { label: 'Open Alerts', value: Number(stats.open_alerts ?? 0), tone: 'denied' as const, icon: <Bell size={18} /> },
    { label: 'Active Clients', value: Number(stats.active_clients ?? 0), icon: <UserCheck size={18} /> },
  ];

  return (
    <>
      <DashboardMetrics
        title="Super Admin Dashboard"
        metrics={metrics}
        loading={isLoading}
      />
      {isError && !isLoading && (
        <p className="px-6 pb-6 text-sm text-secondary-foreground">
          Could not load live KPIs — showing zeros. Check that the API is running and you are signed in as Admin.
        </p>
      )}
    </>
  );
}
