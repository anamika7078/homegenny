'use client';

import { useAuthStore } from '@/lib/store/auth.store';
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics';
import { Users, Calendar, Bell, FileText } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrapData, unwrapItems } from '@/lib/hr/utils';

const QUICK_LINKS = [
  { href: '/hr/employees', label: 'Employees', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { href: '/hr/attendance', label: 'Attendance', icon: Calendar, color: 'text-green-400', bg: 'bg-green-500/10' },
  { href: '/hr/categories', label: 'Categories', icon: FileText, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { href: '/hr/notifications', label: 'Notifications', icon: Bell, color: 'text-purple-400', bg: 'bg-purple-500/10' },
];

export default function HrDashboardPage() {
  const { user } = useAuthStore();
  const today = new Date().toISOString().split('T')[0];

  const { data: employeesRaw } = useQuery({
    queryKey: ['employees', 'hr', 'dashboard'],
    queryFn: () => api.listEmployees({ limit: 500 }),
    staleTime: 60_000,
  });

  const { data: categoriesRaw } = useQuery({
    queryKey: ['categories', 'hr'],
    queryFn: () => api.listCategories(),
    staleTime: 60_000,
  });

  const { data: attStatsRaw } = useQuery({
    queryKey: ['attendance', 'stats', today],
    queryFn: () => api.getAttendanceStats({ date: today }),
    staleTime: 60_000,
  });

  const { data: notifCountRaw } = useQuery({
    queryKey: ['hr-notifications', 'unread'],
    queryFn: () => api.getHrNotifications(),
    staleTime: 60_000,
  });

  const employees = unwrapItems(employeesRaw);
  const categories = unwrapItems(categoriesRaw);
  const attStats = unwrapData(attStatsRaw) ?? {};
  const notifications = unwrapItems(notifCountRaw);
  const unreadNotifications = notifications.filter((n: any) => !n.readAt).length;

  const totalEmployees = employees.length;
  const presentToday = Number(attStats.Present ?? 0);
  const absentToday = Number(attStats.Absent ?? 0);
  const onLeaveToday = Number(attStats.Leave ?? 0);

  const fmt = (n: number) => String(n);

  return (
    <div className="page-padding max-w-[1600px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">HR Dashboard</h1>
        <p className="text-sm text-secondary-foreground mt-1">
          Welcome back, {user?.full_name ?? 'HR Admin'}. Manage your workforce from here.
        </p>
      </div>

      <DashboardMetrics
        embedded
        title=""
        metrics={[
          { label: 'Total Employees', value: fmt(totalEmployees), sub: 'Active HR records' },
          { label: 'Present Today', value: fmt(presentToday), tone: 'in_progress', sub: 'Marked present' },
          { label: 'Absent Today', value: fmt(absentToday), tone: 'pending', sub: 'Marked absent' },
          { label: 'On Leave', value: fmt(onLeaveToday), tone: 'escalated', sub: 'Leave today' },
          { label: 'Categories', value: fmt(categories.length), sub: 'Job categories' },
          { label: 'Unread Notifications', value: fmt(unreadNotifications), tone: 'pending', sub: 'In-app alerts' },
        ]}
      />

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
