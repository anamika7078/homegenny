'use client';

import { useAuthStore } from '@/lib/store/auth.store';
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics';
import { Users, Calendar, Bell, BarChart2, FileText } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

const QUICK_LINKS = [
  { href: '/hr/employees',     label: 'Employees',     icon: Users,     color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  { href: '/hr/attendance',    label: 'Attendance',    icon: Calendar,  color: 'text-green-400',  bg: 'bg-green-500/10' },
  { href: '/hr/categories',    label: 'Categories',    icon: FileText,  color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { href: '/hr/notifications', label: 'Notifications', icon: Bell,      color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { href: '/hr/reports',       label: 'Reports',       icon: BarChart2, color: 'text-orange-400', bg: 'bg-orange-500/10' },
];

export default function HrDashboardPage() {
  const { user } = useAuthStore();

  // Fetch admin dashboard stats (total_staff, pending_verifications, open_alerts, active_deployments)
  const { data: dashRaw } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => api.getDashboardAdmin(),
    staleTime: 60_000,
  });

  // Fetch full staff list to derive accurate total + category count
  const { data: staffRaw } = useQuery({
    queryKey: ['staff', 'hr'],
    queryFn: () => api.listStaff({ limit: 500 }),
    staleTime: 60_000,
  });

  // Fetch open alarms for unread notifications count
  const { data: alarmsRaw } = useQuery({
    queryKey: ['alarms', 'open'],
    queryFn: () => api.getAlarms({ status: 'OPEN' }),
    staleTime: 60_000,
  });

  // Fetch actual attendance stats
  const { data: attStatsRaw } = useQuery({
    queryKey: ['attendance', 'stats'],
    queryFn: () => api.getAttendanceStats({ date: new Date().toISOString().split('T')[0] }),
    staleTime: 60_000,
  });

  const dash = dashRaw?.data ?? dashRaw ?? {};

  const employees: any[] = Array.isArray(staffRaw)
    ? staffRaw
    : (staffRaw as any)?.data?.items ?? (staffRaw as any)?.data ?? [];

  const alarms: any[] = Array.isArray(alarmsRaw)
    ? alarmsRaw
    : (alarmsRaw as any)?.data?.items ?? (alarmsRaw as any)?.data ?? [];

  // Derive counts
  const totalEmployees = Number(dash.total_staff ?? employees.length) || 0;
  const pendingActions  = Number(dash.pending_verifications ?? 0);
  const openAlerts      = Number(dash.open_alerts ?? alarms.length) || 0;
  const activeDeployments = Number(dash.active_deployments ?? 0);

  const attStats = attStatsRaw?.data ?? attStatsRaw ?? {};

  // Unique series/categories from staff list
  const categories = employees.length
    ? new Set(employees.map((e: any) => e.series).filter(Boolean)).size
    : 0;

  // Present/Absent: use actual attendance stats
  const presentToday = Number(attStats.present ?? 0);
  const absentToday  = Number(attStats.absent ?? 0);

  const fmt = (n: number) => n > 0 ? String(n) : n === 0 ? '0' : '—';

  return (
    <div className="page-padding max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">HR Dashboard</h1>
        <p className="text-sm text-secondary-foreground mt-1">
          Welcome back, {user?.full_name ?? 'HR Admin'}. Manage your workforce from here.
        </p>
      </div>

      {/* Metrics */}
      <DashboardMetrics
        embedded
        title=""
        metrics={[
          { label: 'Total Employees',      value: fmt(totalEmployees),   sub: 'All active staff' },
          { label: 'Present Today',        value: fmt(presentToday),     tone: 'in_progress', sub: 'Actively deployed' },
          { label: 'Absent Today',         value: fmt(absentToday),      tone: 'pending',     sub: 'Not deployed' },
          { label: 'Pending Actions',      value: fmt(pendingActions),   tone: 'escalated',   sub: 'Verification queue' },
          { label: 'Categories',           value: fmt(categories),       sub: 'Job categories' },
          { label: 'Unread Notifications', value: fmt(openAlerts),       tone: 'pending',     sub: 'Open alerts' },
        ]}
      />

      {/* Quick Links */}
      <div>
        <h2 className="text-base font-semibold text-white mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {QUICK_LINKS.map(({ href, label, icon: Icon, color, bg }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-background/40 p-5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:border-white/20 hover:shadow-lg"
            >
              <div className={`rounded-xl p-3 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <span className="text-sm font-medium text-foreground">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
