'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/lib/store/auth.store';
import {
  LayoutDashboard,
  Bell,
  GitBranch,
  UserPlus,
  UserCheck,
  Video,
  FileText,
  DollarSign,
  Activity,
  ShieldCheck,
  Users,
  ClipboardCheck,
  GraduationCap,
  Clock,
  MapPin,
  PauseCircle,
  AlertTriangle,
  Calendar,
  BarChart2,
  TrendingUp,
  Layers,
  LogOut,
  Scale,
  Calculator,
  X,
  type LucideIcon,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────
function initials(name?: string | null): string {
  if (!name?.trim()) return 'HG';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function roleLabel(role?: string | null): string {
  const map: Record<string, string> = {
    BM: 'Branch Manager',
    RM: 'Relationship Manager',
    ADMIN: 'Super Admin',
    FINANCE: 'Finance',
    TRAINER: 'Trainer',
    ASSESSOR: 'Assessor',
    SUPPORT: 'Support',
    HR: 'HR Admin',
  };
  return map[role ?? ''] ?? role ?? 'User';
}

// ─── nav config ─────────────────────────────────────────────────────────────
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  subItems?: Array<{ href: string; label: string }>;
}
interface NavSection {
  section: string;
  items: NavItem[];
}

const RM_NAV: NavSection[] = [
  {
    section: 'Overview',
    items: [
      { href: '/rm/dashboard', label: 'RM Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Staff Management',
    items: [
      { href: '/rm/staff', label: 'Staff List', icon: Users },
      { href: '/rm/pipeline', label: 'Pipeline Board', icon: GitBranch },
      { href: '/rm/verification', label: 'Verification Queue', icon: ClipboardCheck },
      { href: '/rm/video', label: 'Video Reviews', icon: Video },
      { href: '/rm/intake', label: 'S1 Intake', icon: UserPlus },
    ],
  },
  {
    section: 'Placements',
    items: [
      { href: '/rm/trials', label: 'Trial Placements', icon: Clock },
      { href: '/rm/placements', label: 'Active Placements', icon: MapPin },
      { href: '/rm/deferred', label: 'Deferred Cases', icon: PauseCircle },
      { href: '/rm/upgrades', label: 'Upgrade Tracker', icon: TrendingUp },
    ],
  },
  {
    section: 'Operations',
    items: [
      { href: '/rm/incidents', label: 'Incidents', icon: AlertTriangle },
      { href: '/rm/shifts', label: 'Shift Logs', icon: Calendar },
    ],
  },
  {
    section: 'Analytics',
    items: [
      { href: '/rm/reports', label: 'Reports', icon: BarChart2 },
      { href: '/rm/notifications', label: 'Notifications', icon: Bell },
    ],
  },
];

const BM_NAV: NavSection[] = [
  {
    section: 'Overview',
    items: [
      { href: '/bm/dashboard', label: 'BM Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Operations',
    items: [
      { href: '/alarms', label: 'Issues & Alarms', icon: Bell },
      { href: '/staff/pipeline', label: 'Pipeline Kanban', icon: GitBranch },
      { href: '/staff/intake', label: 'S1 Intake', icon: UserPlus },
      { href: '/video-cert', label: 'Video Cert', icon: Video },
      { href: '/agreements', label: 'Agreements', icon: FileText },
      { href: '/payroll', label: 'Payroll', icon: DollarSign },
    ],
  },
  {
    section: 'System',
    items: [
      { href: '/monitoring', label: 'Monitoring', icon: Activity },
      { href: '/system-status', label: 'System Status', icon: ShieldCheck },
    ],
  },
];

const TRAINER_NAV: NavSection[] = [
  {
    section: 'Overview',
    items: [
      { href: '/trainer/dashboard', label: 'Trainer Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Training Operations',
    items: [
      { href: '/trainer/batches', label: 'Batch Management', icon: Users },
      { href: '/trainer/attendance', label: 'Attendance Tracker', icon: ClipboardCheck },
      { href: '/trainer/assessment', label: 'Assessments', icon: FileText },
      { href: '/trainer/video-cert', label: 'Video Certs', icon: Video },
    ],
  },
  {
    section: 'Schedule',
    items: [
      { href: '/trainer/schedule', label: 'Calendar', icon: Calendar },
      { href: '/trainer/deferred', label: 'Retraining Queue', icon: PauseCircle },
    ],
  },
  {
    section: 'Analytics',
    items: [
      { href: '/trainer/reports', label: 'Reports', icon: BarChart2 },
    ],
  },
];


const ASSESSOR_NAV: NavSection[] = [
  {
    section: 'Overview',
    items: [
      { href: '/assessor/dashboard', label: 'Assessor Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Assessments',
    items: [
      { href: '/assessor/assessments', label: 'My Assessments', icon: ClipboardCheck },
      { href: '/assessor/schedule', label: 'Schedule', icon: Calendar },
    ],
  },
  {
    section: 'Analytics',
    items: [
      { href: '/assessor/reports', label: 'Reports', icon: BarChart2 },
    ],
  },
];

const HR_NAV: NavSection[] = [
  {
    section: 'Overview',
    items: [
      { href: '/hr/dashboard', label: 'HR Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Employee Management',
    items: [
      { href: '/hr/employees', label: 'Employees', icon: Users },
      { href: '/hr/payroll', label: 'Salary Slips', icon: DollarSign },
    ],
  },
  {
    section: 'RM Pipeline',
    items: [
      { href: '/hr/candidates', label: 'Candidates', icon: UserPlus },
      { href: '/hr/onboarding', label: 'Pending Onboarding', icon: UserCheck },
    ],
  },
  {
    section: 'Attendance',
    items: [
      { href: '/hr/attendance', label: 'Attendance', icon: Calendar },
    ],
  },
  {
    section: 'Communications',
    items: [
      { href: '/hr/notifications', label: 'Notifications', icon: Bell },
    ],
  },
];

const SUPPORT_NAV: NavSection[] = [
  {
    section: 'Overview',
    items: [
      { href: '/support/dashboard', label: 'Support Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Operations',
    items: [
      { href: '/alarms', label: 'Issues & Alarms', icon: Bell },
      { href: '/staff/pipeline', label: 'Pipeline Kanban', icon: GitBranch },
      { href: '/staff/intake', label: 'S1 Intake', icon: UserPlus },
      { href: '/video-cert', label: 'Video Cert', icon: Video },
      { href: '/agreements', label: 'Agreements', icon: FileText },
      { href: '/payroll', label: 'Payroll', icon: DollarSign },
    ],
  },
  {
    section: 'System',
    items: [
      { href: '/monitoring', label: 'Monitoring', icon: Activity },
    ],
  },
];

const ADMIN_NAV: NavSection[] = [
  {
    section: 'Overview',
    items: [
      { href: '/admin/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Management',
    items: [
      { href: '/admin/users', label: 'Users & Roles', icon: Users },
      { href: '/admin/branches', label: 'Branches', icon: GitBranch },
      { href: '/admin/pipeline', label: 'Pipeline Overview', icon: Activity },
      { href: '/admin/queues', label: 'Queues', icon: ClipboardCheck },
      { href: '/admin/video-certifications', label: 'Video Certifications', icon: Video },
    ],
  },
  {
    section: 'Analytics & Compliance',
    items: [
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
      { href: '/admin/privacy', label: 'Privacy (DPDP)', icon: ShieldCheck },
      { href: '/admin/system-health', label: 'System Health', icon: Activity },
    ],
  },
];

const FINANCE_NAV: NavSection[] = [
  {
    section: 'Overview',
    items: [
      { href: '/finance/dashboard', label: 'Finance Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Finance',
    items: [
      { href: '/finance/customers', label: 'Customers', icon: Users },
      {
        href: '/finance/commercial',
        label: 'Commercial',
        icon: Calculator,
        subItems: [
          { href: '/finance/commercial/calculator', label: 'Commercial Calculator' },
          { href: '/finance/commercial/quotations', label: 'Quotations' },
          { href: '/finance/commercial/rate-cards', label: 'Rate Cards' },
          { href: '/finance/commercial/reports', label: 'Reports' },
          { href: '/finance/commercial/approvals', label: 'Approval' },
        ]
      },
      { href: '/finance/payroll', label: 'Payroll', icon: DollarSign },
      { href: '/finance/payroll/attendance', label: 'Attendance Payroll', icon: Calculator },
      { href: '/finance/invoices', label: 'Invoices', icon: FileText },
      { href: '/finance/invoices/consolidated', label: 'Month-end Invoicing', icon: Layers },
      { href: '/finance/deposits', label: 'Deposits', icon: TrendingUp },
      { href: '/finance/settlements', label: 'Settlements', icon: DollarSign },
      { href: '/finance/exit-settlements', label: 'Exit Settlements', icon: LogOut },
      { href: '/finance/esic-pf', label: 'ESIC & PF', icon: ShieldCheck },
      { href: '/finance/tax-rules', label: 'Tax Rules', icon: Scale },

    ],
  },
  {
    section: 'Analytics',
    items: [
      { href: '/finance/analytics', label: 'Analytics', icon: BarChart2 },
      { href: '/finance/audit', label: 'Audit Trail', icon: FileText },
    ],
  },
];

// ─── reusable nav-link ───────────────────────────────────────────────────────
function NavLink({
  href,
  label,
  icon: Icon,
  badge,
  pathname,
  onNavigate,
}: NavItem & { pathname: string; onNavigate?: () => void }) {
  const active = pathname === href || (href !== '/' && pathname.startsWith(href + '/')) ||
    (href.includes('#') && pathname === href.split('#')[0]);
  return (
    <Link
      href={href.split('#')[0]}
      onClick={onNavigate}
      className={cn(
        'relative flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
        active
          ? 'text-[#FF5A1F] bg-[#FF5A1F]/10'
          : 'text-secondary-foreground hover:text-foreground hover:bg-white/5',
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span>{label}</span>
      </div>
      {badge && (
        <span
          className={cn(
            'min-w-[22px] h-[22px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold border',
            active
              ? 'bg-[#FF5A1F]/20 border-[#FF5A1F]/40 text-[#FF5A1F]'
              : 'bg-danger/20 border-danger/30 text-danger',
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

// ─── main component ──────────────────────────────────────────────────────────
interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({
    'Commercial': true,
  });

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const role = user?.role;
  const isRm = role === 'RM';
  const isTrainer = role === 'TRAINER';
  const isAssessor = role === 'ASSESSOR';
  const isAdmin = role === 'ADMIN';
  const isFinance = role === 'FINANCE';
  const isSupport = role === 'SUPPORT';
  const isHr = role === 'HR';

  const navSections =
    isRm ? RM_NAV
      : isTrainer ? TRAINER_NAV
        : isAssessor ? ASSESSOR_NAV
          : isAdmin ? ADMIN_NAV
            : isFinance ? FINANCE_NAV
              : isSupport ? SUPPORT_NAV
                : isHr ? HR_NAV
                  : BM_NAV;

  return (
    <aside
      className={cn(
        'z-50 flex h-full w-[min(280px,85vw)] shrink-0 flex-col border-r border-[#1e293b] bg-[#0f1523] transition-transform duration-300 ease-in-out',
        'fixed inset-y-0 left-0 lg:relative lg:z-40 lg:w-[280px] lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}
    >
      {/* Logo */}
      <div className="flex items-start justify-between px-4 pb-6 pt-5 sm:px-6 sm:pt-6">
        <Link href="/" className="flex flex-col" onClick={onClose}>
          <span className="font-syne text-xl font-bold tracking-tight sm:text-2xl">
            <span className="text-white">Home</span><span className="text-[#FF5A1F]">Genny</span>
          </span>
          <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-secondary-foreground opacity-70">
            DOMESTIC STAFFING · GCP ·<br />DELHI NCR
          </span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation menu"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-secondary-foreground transition-colors hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Role badge */}
      {isRm && (
        <div className="mx-4 mb-4 flex items-center gap-2 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 px-3 py-2">
          <Users className="w-3.5 h-3.5 text-[#FF5A1F]" />
          <span className="text-[11px] font-semibold text-[#FF5A1F] uppercase tracking-wider">RM Portal</span>
        </div>
      )}
      {isTrainer && (
        <div className="mx-4 mb-4 flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2">
          <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider">Trainer Portal</span>
        </div>
      )}
      {isAssessor && (
        <div className="mx-4 mb-4 flex items-center gap-2 rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-2">
          <ClipboardCheck className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider">Assessor Portal</span>
        </div>
      )}
      {isAdmin && (
        <div className="mx-4 mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
          <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
          <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">Admin Portal</span>
        </div>
      )}
      {isFinance && (
        <div className="mx-4 mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Finance Portal</span>
        </div>
      )}
      {isSupport && (
        <div className="mx-4 mb-4 flex items-center gap-2 rounded-lg bg-sky-500/10 border border-sky-500/20 px-3 py-2">
          <Bell className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">Support Portal</span>
        </div>
      )}
      {isHr && (
        <div className="mx-4 mb-4 flex items-center gap-2 rounded-lg bg-pink-500/10 border border-pink-500/20 px-3 py-2">
          <Users className="w-3.5 h-3.5 text-pink-400" />
          <span className="text-[11px] font-semibold text-pink-400 uppercase tracking-wider">HR Portal</span>
        </div>
      )}
      {!isRm && !isTrainer && !isAssessor && !isAdmin && !isFinance && !isSupport && !isHr && (
        <div className="mx-4 mb-4 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
          <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">BM Portal</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 overflow-y-auto scrollbar-hide space-y-6 pb-6">
        {navSections.map((section) => (
          <div key={section.section}>
            <h4 className="text-[10px] font-bold text-secondary-foreground uppercase tracking-widest mb-3 px-3">
              {section.section}
            </h4>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                if (item.subItems) {
                  const isOpen = openSubMenus[item.label];
                  const active = pathname.startsWith(item.href);
                  return (
                    <div key={item.label} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setOpenSubMenus(prev => ({ ...prev, [item.label]: !prev[item.label] }))}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-secondary-foreground hover:text-[#FF5A1F] hover:bg-[#FF5A1F]/5',
                          active && 'text-[#FF5A1F] bg-[#FF5A1F]/10'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        <span className="text-[10px] font-bold">{isOpen ? '▼' : '▶'}</span>
                      </button>
                      {isOpen && (
                        <div className="pl-6 space-y-0.5 border-l border-[#1e293b] ml-5 mt-1">
                          {item.subItems.map((sub) => {
                            const subActive = pathname === sub.href;
                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                onClick={onClose}
                                className={cn(
                                  'block py-2 px-3 text-xs font-semibold rounded-md transition-colors',
                                  subActive
                                    ? 'text-[#FF5A1F] bg-[#FF5A1F]/5'
                                    : 'text-secondary-foreground hover:text-foreground hover:bg-white/5'
                                )}
                              >
                                {sub.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
                return <NavLink key={item.href} {...item} pathname={pathname} onNavigate={onClose} />;
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User block */}
      <div className="p-4 mt-auto">
        <div className="bg-[#151c2c] border border-border/50 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FF5A1F]/20 flex items-center justify-center text-sm font-bold text-[#FF5A1F]">
            {initials(user?.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.full_name ?? 'HomeGenny User'}</p>
            <p className="text-[10px] text-secondary-foreground truncate">
              {roleLabel(user?.role)} · Delhi NCR
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
