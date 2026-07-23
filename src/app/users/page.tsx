'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Users,
  Shield,
  Lock,
  Search,
  MoreVertical,
  UserPlus,
  Settings,
  Eye,
  Trash2,
  CheckCircle2,
  History,
  Briefcase,
  ShieldCheck,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { api } from '@/lib/api/client';

// ── Types ─────────────────────────────────────────────────────────────────
interface AdminUser {
  id: string;
  name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
}

interface AuditLog {
  id: string;
  action?: string;
  entity?: string;
  entityType?: string;
  entity_type?: string;
  scope?: string;
  userId?: string;
  user_id?: string;
  userName?: string;
  user_name?: string;
  createdAt?: string;
  created_at?: string;
  timestamp?: string;
  details?: string | Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ── Role display config ────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { name: string; color: string }> = {
  SYS_ADMIN:    { name: 'System Admin',    color: 'text-primary bg-primary/10 border-primary/20' },
  ADMIN:        { name: 'System Admin',    color: 'text-primary bg-primary/10 border-primary/20' },
  BM:           { name: 'Branch Manager',  color: 'text-violet bg-violet/10 border-violet/20' },
  RM:           { name: 'Regional Manager',color: 'text-info bg-info/10 border-info/20' },
  FINANCE:      { name: 'Finance Admin',   color: 'text-success bg-success/10 border-success/20' },
  TRAINER:      { name: 'Trainer',         color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  ASSESSOR:     { name: 'Assessor',        color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
};

// Capability matrix — static definition; checkmarks driven by real role data
const CAPABILITIES = [
  { label: 'Manage Branches', roles: ['SYS_ADMIN', 'ADMIN', 'BM'] },
  { label: 'View Financials',  roles: ['SYS_ADMIN', 'ADMIN', 'FINANCE'] },
  { label: 'Issue Agreements', roles: ['SYS_ADMIN', 'ADMIN', 'BM', 'RM'] },
  { label: 'Staff Intake',     roles: ['SYS_ADMIN', 'ADMIN', 'BM', 'RM'] },
  { label: 'System Config',    roles: ['SYS_ADMIN', 'ADMIN'] },
];

// Columns shown in the permission matrix
const MATRIX_ROLES = [
  { key: 'SYS_ADMIN', label: 'SYS' },
  { key: 'BM',        label: 'BM' },
  { key: 'RM',        label: 'RM' },
  { key: 'FINANCE',   label: 'FIN' },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function getInitials(name?: string): string {
  if (!name) return '??';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function formatLogTime(log: AuditLog): string {
  const raw = log.createdAt ?? log.created_at ?? log.timestamp;
  if (!raw) return '—';
  try {
    return new Date(raw).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return raw;
  }
}

function formatLogAction(log: AuditLog): string {
  const actor = log.userName ?? log.user_name ?? log.userId ?? log.user_id ?? 'System';
  const action = log.action ?? 'performed action';
  const entity = log.entityType ?? log.entity_type ?? log.entity ?? '';
  return `${actor} — ${action}${entity ? ` on ${entity}` : ''}`;
}

function formatLogScope(log: AuditLog): string {
  const parts: string[] = [];
  if (log.scope) parts.push(`Scope: ${log.scope}`);
  if (log.entity ?? log.entityType ?? log.entity_type)
    parts.push(`Object: ${log.entity ?? log.entityType ?? log.entity_type}`);
  if (log.action) parts.push(`Action: ${log.action}`);
  return parts.join(' | ') || 'System event';
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [activeTab, setActiveTab] = useState('USERS');

  // ── Data state ────────────────────────────────────────────────────────
  const [users, setUsers]         = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [usersLoading, setUsersLoading]     = useState(false);
  const [auditLoading, setAuditLoading]     = useState(false);
  const [usersError, setUsersError]         = useState<string | null>(null);
  const [auditError, setAuditError]         = useState<string | null>(null);

  const [search, setSearch] = useState('');

  // ── Fetch users ───────────────────────────────────────────────────────
  useEffect(() => {
    setUsersLoading(true);
    setUsersError(null);
    api.getAdminUsers()
      .then((res: any) => {
        const list: AdminUser[] = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.users)
          ? res.users
          : [];
        setUsers(list);
      })
      .catch((err: Error) => setUsersError(err.message ?? 'Failed to load users'))
      .finally(() => setUsersLoading(false));
  }, []);

  // ── Fetch audit logs (load lazily when tab opens) ─────────────────────
  useEffect(() => {
    if (activeTab !== 'AUDIT') return;
    setAuditLoading(true);
    setAuditError(null);
    api.getAdminAuditLogs()
      .then((res: any) => {
        const list: AuditLog[] = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.logs)
          ? res.logs
          : [];
        setAuditLogs(list);
      })
      .catch((err: Error) => setAuditError(err.message ?? 'Failed to load audit logs'))
      .finally(() => setAuditLoading(false));
  }, [activeTab]);

  // ── Derived: role summary cards ───────────────────────────────────────
  const roleSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => {
      const key = u.role ?? 'UNKNOWN';
      counts[key] = (counts[key] ?? 0) + 1;
    });
    // Include known roles even with 0 count so the cards are always visible
    const knownRoles = Object.keys(ROLE_CONFIG);
    knownRoles.forEach((r) => {
      if (counts[r] === undefined) counts[r] = 0;
    });
    return Object.entries(counts).map(([id, count]) => ({
      id,
      name: ROLE_CONFIG[id]?.name ?? id,
      count,
      color: ROLE_CONFIG[id]?.color ?? 'text-muted-foreground bg-secondary/50 border-border',
    }));
  }, [users]);

  // ── Derived: filtered users ───────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u) => {
      const name  = (u.name ?? u.full_name ?? '').toLowerCase();
      const email = (u.email ?? '').toLowerCase();
      const role  = (u.role ?? '').toLowerCase();
      const phone = (u.phone ?? '').toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q) || phone.includes(q);
    });
  }, [users, search]);

  return (
    <AppShell>
      <div className="page-padding mx-auto max-w-[1600px] space-y-6 sm:space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-syne font-bold text-gradient tracking-tight">Identity &amp; Access</h1>
            <p className="text-secondary-foreground text-sm mt-1">
              Manage enterprise roles, permissions, and administrative security.
            </p>
          </div>

          <div className="min-w-0">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="inline-flex items-center gap-2 whitespace-nowrap bg-secondary/50 p-1 rounded-xl border border-border">
                {['USERS', 'ROLES', 'AUDIT'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'px-3 sm:px-6 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all',
                      activeTab === tab ? 'bg-primary text-white shadow-lg' : 'text-secondary-foreground hover:text-foreground',
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Summary Stats */}
          <div className="xl:col-span-1 space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {usersLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="p-4 animate-pulse">
                      <div className="h-10 rounded-lg bg-secondary/50" />
                    </Card>
                  ))
                : roleSummary.map((role) => (
                    <Card key={role.id} className="p-4 hover:border-primary/30 transition-all cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', role.color)}>
                            <Shield className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold">{role.name}</h3>
                            <p className="text-[10px] text-secondary-foreground">{role.count} Active Account{role.count !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Card>
                  ))}
            </div>

            <Card className="bg-primary text-white shadow-2xl shadow-primary/20 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <ShieldCheck className="w-32 h-32" />
              </div>
              <CardHeader>
                <CardTitle className="text-white">Security Protocol</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-white/70 leading-relaxed">
                  Identity management is enforced via JWT (RS256) and RBAC middleware. Audit logs are immutable.
                </p>
                <button className="mt-4 w-full py-2.5 bg-white text-primary rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition-colors">
                  View Compliance Report
                </button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-3 space-y-6">
            <AnimatePresence mode="wait">
              {/* ── USERS TAB ─────────────────────────────────────────────── */}
              {activeTab === 'USERS' && (
                <motion.div
                  key="users"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Administrative Personnel</CardTitle>
                          <CardDescription>Accounts with access to the HomeGenny control panel.</CardDescription>
                        </div>
                        <button className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-xl shadow-primary/20 hover:bg-accent transition-all">
                          <UserPlus className="w-4 h-4" />
                          Provision Account
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground" />
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search by name, email or role..."
                          className="w-full bg-secondary/30 border border-border rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none"
                        />
                      </div>

                      {usersLoading ? (
                        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm">Loading users…</span>
                        </div>
                      ) : usersError ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-danger">
                          <AlertCircle className="w-6 h-6" />
                          <p className="text-sm">{usersError}</p>
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                          <Users className="w-8 h-8 opacity-30" />
                          <p className="text-sm">{search ? 'No users match your search.' : 'No users found.'}</p>
                        </div>
                      ) : (
                        <div className="table-scroll">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left border-b border-border">
                                <th className="pb-4 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">User</th>
                                <th className="pb-4 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">Access Role</th>
                                <th className="pb-4 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">Status</th>
                                <th className="pb-4 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {filteredUsers.map((user) => {
                                const displayName = user.name ?? user.full_name ?? 'Unknown';
                                const roleKey     = user.role ?? '';
                                const roleLabel   = ROLE_CONFIG[roleKey]?.name ?? roleKey;
                                const isActive    = user.is_active !== false && user.status !== 'INACTIVE' && user.status !== 'DEACTIVATED';
                                return (
                                  <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                                    <td className="py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                                          {getInitials(displayName)}
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold">{displayName}</p>
                                          <p className="text-[10px] text-secondary-foreground">
                                            {user.email ?? user.phone ?? '—'}
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-4">
                                      <Badge className="bg-secondary/50 border-border text-foreground text-[9px] uppercase tracking-tighter">
                                        {roleLabel || '—'}
                                      </Badge>
                                    </td>
                                    <td className="py-4">
                                      <div className="flex items-center gap-1.5">
                                        <div className={cn('w-1.5 h-1.5 rounded-full', isActive ? 'bg-success' : 'bg-danger')} />
                                        <span className="text-[10px] font-bold uppercase text-secondary-foreground">
                                          {isActive ? 'Active' : 'Inactive'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-4 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <button className="p-2 rounded-lg hover:bg-secondary text-secondary-foreground transition-colors">
                                          <Settings className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 rounded-lg hover:bg-danger/10 text-danger transition-colors">
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ── ROLES TAB ─────────────────────────────────────────────── */}
              {activeTab === 'ROLES' && (
                <motion.div
                  key="roles"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Permission Matrix</CardTitle>
                      <CardDescription>Configure granular access control for each role.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="table-scroll">
                        <div className={`min-w-[720px] grid border border-border rounded-2xl overflow-hidden`}
                             style={{ gridTemplateColumns: `1fr repeat(${MATRIX_ROLES.length}, 1fr)` }}>
                          {/* Header row */}
                          <div className="p-4 bg-secondary/50 border-r border-b border-border text-[10px] font-bold uppercase">
                            Capability
                          </div>
                          {MATRIX_ROLES.map((r) => (
                            <div key={r.key} className="p-4 bg-secondary/30 border-r border-b border-border text-[10px] font-bold uppercase text-center">
                              {r.label}
                            </div>
                          ))}

                          {/* Capability rows */}
                          {CAPABILITIES.map((cap) => (
                            <React.Fragment key={cap.label}>
                              <div className="p-4 border-r border-b border-border text-xs font-medium">{cap.label}</div>
                              {MATRIX_ROLES.map((r) => {
                                const hasAccess = cap.roles.includes(r.key);
                                return (
                                  <div key={r.key} className="p-4 border-r border-b border-border flex items-center justify-center">
                                    <div
                                      className={cn(
                                        'w-5 h-5 rounded-md flex items-center justify-center border-2',
                                        hasAccess ? 'bg-primary border-primary text-white' : 'border-border',
                                      )}
                                    >
                                      {hasAccess && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    </div>
                                  </div>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ── AUDIT TAB ─────────────────────────────────────────────── */}
              {activeTab === 'AUDIT' && (
                <motion.div
                  key="audit"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Enterprise Audit Trail</CardTitle>
                      <CardDescription>Detailed logs of all administrative actions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {auditLoading ? (
                        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm">Loading audit logs…</span>
                        </div>
                      ) : auditError ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-danger">
                          <AlertCircle className="w-6 h-6" />
                          <p className="text-sm">{auditError}</p>
                        </div>
                      ) : auditLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                          <History className="w-8 h-8 opacity-30" />
                          <p className="text-sm">No audit logs found.</p>
                        </div>
                      ) : (
                        auditLogs.map((log) => (
                          <div
                            key={log.id}
                            className="flex gap-4 p-4 rounded-2xl border border-border hover:bg-white/5 transition-all"
                          >
                            <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
                              <History className="w-5 h-5 text-secondary-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-bold truncate max-w-[70%]">
                                  {formatLogAction(log)}
                                </p>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                  {formatLogTime(log)}
                                </span>
                              </div>
                              <p className="text-[10px] text-secondary-foreground">{formatLogScope(log)}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AppShell>
  );
}