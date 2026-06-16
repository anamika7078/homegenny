import type { UserRole } from '@/lib/types';

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string | number;
  permission?: string;
  roles?: UserRole[];
}

export const ROLE_HOME: Record<UserRole, string> = {
  ADMIN: '/admin/dashboard',
  BM: '/bm/dashboard',
  RM: '/rm/dashboard',
  FINANCE: '/finance/dashboard',
  TRAINER: '/trainer/dashboard',
  ASSESSOR: '/assessor/dashboard',
  SUPPORT: '/support/dashboard',
  STAFF: '/',
  CLIENT: '/',
};

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { href: '/admin/dashboard', label: 'Super Admin', icon: 'LayoutDashboard', roles: ['ADMIN'] },
      { href: '/bm/dashboard', label: 'BM Dashboard', icon: 'LayoutDashboard', roles: ['BM', 'ADMIN'] },
      { href: '/rm/dashboard', label: 'RM Dashboard', icon: 'LayoutDashboard', roles: ['RM', 'BM', 'ADMIN'] },
      { href: '/finance/dashboard', label: 'Finance', icon: 'DollarSign', roles: ['FINANCE', 'ADMIN'] },
      { href: '/trainer/dashboard', label: 'Training Center', icon: 'GraduationCap', roles: ['TRAINER', 'ADMIN'] },
      { href: '/assessor/dashboard', label: 'Assessments', icon: 'ClipboardCheck', roles: ['ASSESSOR', 'ADMIN'] },
      { href: '/support/dashboard', label: 'Operations', icon: 'Headphones', roles: ['SUPPORT', 'ADMIN'] },
    ],
  },
  {
    title: 'RM Operations',
    items: [
      { href: '/rm/dashboard', label: 'RM Home', icon: 'LayoutDashboard', roles: ['RM'] },
      { href: '/rm/pipeline', label: 'Pipeline Board', icon: 'GitBranch', permission: 'rm.intake', roles: ['RM', 'BM', 'ADMIN'] },
      { href: '/rm/staff', label: 'My Staff', icon: 'Users', permission: 'rm.intake', roles: ['RM'] },
      { href: '/staff/intake', label: 'New Intake (S1)', icon: 'UserPlus', permission: 'rm.intake', roles: ['RM', 'BM', 'ADMIN'] },
      { href: '/rm/verification', label: 'Verification', icon: 'ShieldCheck', permission: 'rm.verification', roles: ['RM'] },
      { href: '/rm/assessment', label: 'Driver Assessment', icon: 'ClipboardCheck', permission: 'rm.verification', roles: ['RM', 'ASSESSOR'] },
      { href: '/rm/training', label: 'Training', icon: 'GraduationCap', roles: ['RM', 'TRAINER'] },
      { href: '/rm/video', label: 'Video Queue', icon: 'Video', roles: ['RM', 'TRAINER'] },
      { href: '/rm/agreements', label: 'Agreements', icon: 'FileText', permission: 'rm.agreements', roles: ['RM'] },
      { href: '/rm/placements', label: 'Placements', icon: 'MapPin', permission: 'rm.deployments', roles: ['RM'] },
      { href: '/rm/trials', label: 'Trial Monitor', icon: 'Clock', permission: 'rm.trials', roles: ['RM'] },
      { href: '/rm/shifts', label: 'Shift Logs', icon: 'Clock', roles: ['RM'] },
      { href: '/rm/incidents', label: 'Incidents', icon: 'AlertTriangle', roles: ['RM'] },
      { href: '/rm/deferred', label: 'Deferred', icon: 'PauseCircle', roles: ['RM'] },
      { href: '/rm/terminal', label: 'Terminal', icon: 'FileText', roles: ['RM'] },
      { href: '/rm/upgrades', label: 'Upgrades', icon: 'TrendingUp', roles: ['RM'] },
      { href: '/rm/reports', label: 'Reports', icon: 'BarChart3', roles: ['RM', 'BM'] },
      { href: '/rm/notifications', label: 'Notifications', icon: 'Bell', roles: ['RM'] },
      { href: '/rm/settings', label: 'Profile', icon: 'Settings', roles: ['RM'] },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/alarms', label: 'Issues & Alarms', icon: 'Bell', roles: ['BM', 'ADMIN', 'SUPPORT', 'RM'] },
      { href: '/staff/pipeline', label: 'Legacy Pipeline', icon: 'GitBranch', roles: ['BM', 'ADMIN'] },
      { href: '/verification', label: 'Verification Center', icon: 'ShieldCheck', permission: 'rm.verification', roles: ['BM', 'ADMIN', 'ASSESSOR'] },
      { href: '/agreements', label: 'Agreement Hub', icon: 'FileText', permission: 'rm.agreements', roles: ['BM', 'ADMIN'] },
      { href: '/deployments', label: 'Deployments', icon: 'MapPin', permission: 'rm.deployments', roles: ['BM', 'ADMIN'] },
    ],
  },
  {
    title: 'Compliance',
    items: [
      { href: '/video-cert', label: 'Video Certification', icon: 'Video', permission: 'trainer.video_cert', roles: ['TRAINER', 'RM', 'BM', 'ADMIN'] },
      { href: '/restricted-list', label: 'Restricted List', icon: 'ShieldCheck', permission: 'system.restricted_list', roles: ['BM', 'ADMIN'] },
      { href: '/audit', label: 'Audit Logs', icon: 'ScrollText', roles: ['ADMIN', 'BM'] },
    ],
  },
  {
    title: 'Administration',
    items: [
      { href: '/clients', label: 'Clients', icon: 'Users', permission: 'rm.clients', roles: ['RM', 'BM', 'ADMIN'] },
      { href: '/users', label: 'User Management', icon: 'UserCog', permission: 'system.users.manage', roles: ['ADMIN'] },
      { href: '/branches', label: 'Branches', icon: 'Building2', permission: 'system.branches.manage', roles: ['ADMIN'] },
      { href: '/payroll', label: 'Payroll', icon: 'DollarSign', permission: 'finance.payroll', roles: ['FINANCE', 'ADMIN'] },
      { href: '/invoices', label: 'Invoices', icon: 'Receipt', permission: 'finance.invoices', roles: ['FINANCE', 'ADMIN'] },
      { href: '/monitoring', label: 'System Status', icon: 'Activity', permission: 'system.cron.monitor', roles: ['ADMIN'] },
    ],
  },
];

export function canAccessNav(
  item: NavItem,
  role: UserRole,
  permissions: string[] = [],
): boolean {
  if (role === 'ADMIN') return true;
  // Finance role specific restrictions
  if (role === 'FINANCE') {
    // Disallow access to prohibited permission codes
    const prohibited = [
      'rm.intake',
      'rm.verification',
      'rm.agreements',
      'rm.deployments',
      'finance.unconfirmed_payroll',
      'client.personal_data',
      'system.restricted_list',
      'rm.management',
    ];
    if (item.permission && prohibited.includes(item.permission)) {
      return false;
    }
  }
  if (item.roles && !item.roles.includes(role)) return false;
  if (item.permission && !permissions.includes(item.permission)) return false;
  return true;
}

export function getDashboardPath(role: UserRole): string {
  return ROLE_HOME[role] ?? '/auth/login';
}
