'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  GitBranch,
  Users,
  UserPlus,
  ClipboardCheck,
  Car,
  GraduationCap,
  Video,
  FileText,
  MapPin,
  Clock,
  Calendar,
  AlertTriangle,
  PauseCircle,
  XCircle,
  TrendingUp,
  Bell,
  BarChart3,
  Settings,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/lib/store/auth.store';

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV: { section: string; items: NavItem[] }[] = [
  { section: 'Overview', items: [{ href: '/rm/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    section: 'Pipeline',
    items: [
      { href: '/rm/pipeline', label: 'Kanban Board', icon: GitBranch },
      { href: '/rm/intake', label: 'S1 Intake', icon: UserPlus },
      { href: '/rm/staff', label: 'Staff List', icon: Users },
      { href: '/rm/deferred', label: 'Deferred', icon: PauseCircle },
      { href: '/rm/terminal', label: 'Terminal', icon: XCircle },
    ],
  },
  {
    section: 'Workflows',
    items: [
      { href: '/rm/verification', label: 'Verification', icon: ClipboardCheck },
      { href: '/rm/assessment', label: 'Driver Assessment', icon: Car },
      { href: '/rm/training', label: 'Training', icon: GraduationCap },
      { href: '/rm/video', label: 'Video Queue', icon: Video },
      { href: '/rm/agreements', label: 'Agreements', icon: FileText },
    ],
  },
  {
    section: 'Deployment',
    items: [
      { href: '/rm/placements', label: 'Placements', icon: MapPin },
      { href: '/rm/trials', label: 'Trial Monitor', icon: Clock },
      { href: '/rm/shifts', label: 'Shift Logs', icon: Calendar },
      { href: '/rm/upgrades', label: 'Upgrade Tracker', icon: TrendingUp },
    ],
  },
  {
    section: 'Operations',
    items: [
      { href: '/rm/incidents', label: 'Incidents', icon: AlertTriangle },
      { href: '/rm/notifications', label: 'Notifications', icon: Bell },
      { href: '/rm/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    section: 'System',
    items: [
      { href: '/rm/settings', label: 'Profile Settings', icon: Settings },
      { href: '/rm/audit', label: 'Audit Logs', icon: Shield },
      { href: '/rm/help', label: 'Help Center', icon: HelpCircle },
    ],
  },
];

function userInitials(name?: string | null): string {
  if (!name?.trim()) return 'RM';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export function RmSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  return (
    <aside className="z-40 flex h-full w-[260px] shrink-0 flex-col border-r border-white/10 bg-[#0c1018]">
      <MotionHeader />
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((group) => (
          <div key={group.section}>
            <h4 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">
              {group.section}
            </h4>
            <NavGroup items={group.items} pathname={pathname} />
          </div>
        ))}
      </nav>
      <div className="border-t border-white/5 p-3">
        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF5A1F]/20 text-xs font-bold text-[#FF5A1F]">
            {userInitials(user?.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.full_name ?? 'RM User'}</p>
            <p className="truncate text-[10px] text-slate-500">{user?.role ?? 'RM'} · Branch scoped</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MotionHeader() {
  return (
    <div className="border-b border-white/5 px-5 py-5">
      <Link href="/rm/dashboard" className="block">
        <span className="font-syne text-xl font-bold tracking-tight text-white">
          Home<span className="text-[#FF5A1F]">Genny</span>
        </span>
        <span className="mt-1 block text-[9px] font-bold uppercase tracking-widest text-slate-500">
          RM Operations Portal
        </span>
      </Link>
    </div>
  );
}

function NavGroup({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <div className="space-y-0.5">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-[#FF5A1F]/15 text-[#FF8A50]'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
