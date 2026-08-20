'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, Activity, RefreshCw, Calendar, Search, Filter,
  FileText, Banknote, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';

function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Real AuditAction enum values (schema.prisma) — this page used to filter by
// invented labels (PAYROLL_CONFIRMED, INVOICE_SENT, ...) that never matched
// anything real, on top of always showing 5 hardcoded fake rows regardless.
const ACTION_ICONS: Record<string, React.ReactNode> = {
  PAYROLL_ACTION:     <Banknote className="w-4 h-4 text-emerald-400" />,
  AGREEMENT_SIGN:     <FileText className="w-4 h-4 text-blue-400" />,
  APPROVAL:           <ShieldCheck className="w-4 h-4 text-emerald-400" />,
  DENIAL:             <AlertTriangle className="w-4 h-4 text-rose-400" />,
  DEPLOYMENT_ACTION:  <Activity className="w-4 h-4 text-indigo-400" />,
  DEFAULT:            <Activity className="w-4 h-4 text-slate-400" />,
};

interface AuditLogRow {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  actor?: { id: string; fullName: string; role: string } | null;
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      // GET /audit/logs — the real, general audit log every deposit/invoice/
      // payroll/placement action writes to (AuditService.log()). Was calling
      // GET /admin/audit-logs (a different, admin-panel-only table FINANCE
      // has never had access to) and silently substituting fake rows on the
      // 403 — that fallback is gone; a real failure now shows as a real error.
      const res = await api.getAuditLogs({ limit: 100, action: filterAction || undefined });
      const items = res?.data?.items ?? res?.items ?? [];
      setLogs(Array.isArray(items) ? items : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message ?? 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterAction]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.action?.toLowerCase().includes(q) ||
      log.actor?.fullName?.toLowerCase().includes(q) ||
      log.entityType?.toLowerCase().includes(q) ||
      JSON.stringify(log.metadata ?? {}).toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-padding space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Finance Audit Trail</h1>
          <p className="text-sm text-slate-400 mt-0.5">Track all sensitive financial actions and modifications</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 border border-white/10">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium text-slate-300">Immutable Log</span>
          </div>
          <button
            onClick={load}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <div className="w-[220px]">
              <SelectMenu
                value={filterAction}
                onValueChange={setFilterAction}
                placeholder="All Actions"
                className="bg-[#131c2e] border-white/10 rounded-xl pl-8"
              >
                <SelectMenuItem value="PAYROLL_ACTION">Payroll Actions</SelectMenuItem>
                <SelectMenuItem value="AGREEMENT_SIGN">Agreement Actions</SelectMenuItem>
                <SelectMenuItem value="APPROVAL">Approvals</SelectMenuItem>
                <SelectMenuItem value="DENIAL">Denials</SelectMenuItem>
                <SelectMenuItem value="DEPLOYMENT_ACTION">Placement Actions</SelectMenuItem>
              </SelectMenu>
            </div>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="bg-[#131c2e] border border-white/10 text-white text-sm rounded-xl pl-9 pr-4 py-2 w-64 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Audit List */}
      <div className="rounded-2xl border border-white/8 bg-[#131c2e] overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertTriangle className="w-10 h-10 text-red-500/70" />
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={load} className="text-xs text-emerald-400 underline">Retry</button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Activity className="w-10 h-10 text-slate-600" />
            <p className="text-slate-400 text-sm">No audit logs found matching criteria</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredLogs.map((log) => {
              const icon = ACTION_ICONS[log.action] || ACTION_ICONS.DEFAULT;
              return (
                <div key={log.id} className="p-4 hover:bg-white/2 transition flex gap-4">
                  <div className="mt-1">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      {icon}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-white tracking-wide">
                        {log.action.replace(/_/g, ' ')}
                        {log.entityType && <span className="text-slate-500 font-normal"> · {log.entityType}</span>}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {fmtDate(log.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">Actor:</span>
                      <span className="px-2 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 font-medium">
                        {log.actor?.fullName ?? 'System'}
                      </span>
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 text-xs font-mono text-slate-400 bg-black/20 p-2 rounded-lg border border-white/5 overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
