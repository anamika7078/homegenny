'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { Spinner } from '@/components/ui/loading';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { unwrapData, unwrapItems } from '@/lib/hr/utils';

const STATUS_OPTIONS = [
  { value: 'Present', label: 'Present', icon: CheckCircle, tone: 'text-green-400' },
  { value: 'Half Day', label: 'Half Day', icon: AlertTriangle, tone: 'text-orange-400' },
  { value: 'Leave', label: 'Leave', icon: Clock, tone: 'text-yellow-400' },
  { value: 'Absent', label: 'Absent', icon: XCircle, tone: 'text-red-400' },
  { value: 'Late', label: 'Late', icon: Clock, tone: 'text-blue-400' },
] as const;

type StatusValue = (typeof STATUS_OPTIONS)[number]['value'] | '';

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDate(iso: string, delta: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const next = new Date(y, m - 1, d + delta);
  const yy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  const dd = String(next.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function formatDisplayDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function StatusIcon({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status);
  if (!opt) return null;
  const Icon = opt.icon;
  return <Icon className={`h-4 w-4 ${opt.tone}`} />;
}

export default function HrAttendancePage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayIso);
  const [drafts, setDrafts] = useState<Record<string, StatusValue>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDrafts({});
  }, [date]);

  const {
    data: empRaw,
    isLoading: empLoading,
    error: empError,
  } = useQuery({
    queryKey: ['employees', 'hr', 'active'],
    queryFn: () => api.listEmployees({ limit: 200, status: 'Active' }),
  });

  const {
    data: attRaw,
    isLoading: attLoading,
    error: attError,
    refetch: refetchAttendance,
  } = useQuery({
    queryKey: ['attendance', 'hr', date],
    queryFn: () => api.listAttendance({ date, page: 1, limit: 200 }),
  });

  const {
    data: statsRaw,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ['attendance', 'hr', 'stats', date],
    queryFn: () => api.getAttendanceStats({ date }),
  });

  const employees = unwrapItems(empRaw);
  const attendanceLogs = unwrapItems(attRaw);
  const stats = unwrapData(statsRaw) as
    | { Present?: number; Absent?: number; Leave?: number; HalfDay?: number; Late?: number }
    | undefined;

  const attendanceByEmployee = useMemo(() => {
    const map: Record<string, { id: string; status: string; notes?: string | null }> = {};
    for (const log of attendanceLogs) {
      if (log?.employeeId) {
        map[log.employeeId] = {
          id: log.id,
          status: log.status,
          notes: log.notes,
        };
      }
    }
    return map;
  }, [attendanceLogs]);

  const rows = useMemo(() => {
    return employees.map((emp: any) => {
      const saved = attendanceByEmployee[emp.id];
      const draft = drafts[emp.id];
      const status: StatusValue =
        draft !== undefined ? draft : ((saved?.status as StatusValue) || '');
      return {
        emp,
        savedStatus: saved?.status as StatusValue | undefined,
        status,
        isDirty: draft !== undefined && draft !== (saved?.status || ''),
        unmarked: !saved && (draft === undefined || draft === ''),
      };
    });
  }, [employees, attendanceByEmployee, drafts]);

  const markedCount = rows.filter((r) => r.savedStatus || (r.status && r.isDirty)).length;
  const dirtyCount = rows.filter((r) => r.isDirty && r.status).length;

  const handleStatusChange = (empId: string, status: StatusValue) => {
    setDrafts((prev) => ({ ...prev, [empId]: status }));
  };

  const markAllPresent = () => {
    const next: Record<string, StatusValue> = {};
    for (const emp of employees) {
      next[emp.id] = 'Present';
    }
    setDrafts(next);
  };

  const handleSave = async () => {
    const changes = rows.filter((r) => {
      if (!r.status) return false;
      if (drafts[r.emp.id] === undefined) return false;
      return drafts[r.emp.id] !== (r.savedStatus || '');
    });

    if (changes.length === 0) {
      toast('No attendance changes to save', { icon: 'ℹ️' });
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        changes.map((row) =>
          api.markAttendance({
            employeeId: row.emp.id,
            date,
            status: row.status as string,
          }),
        ),
      );
      toast.success(`Attendance saved for ${changes.length} employee(s) on ${formatDisplayDate(date)}`);
      setDrafts({});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['attendance', 'hr', date] }),
        queryClient.invalidateQueries({ queryKey: ['attendance', 'hr', 'stats', date] }),
      ]);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to save attendance';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSaving(false);
    }
  };

  const isLoading = empLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (empError) {
    return (
      <div className="page-padding max-w-[1600px] mx-auto py-24 text-center">
        <p className="text-red-400 text-sm">Failed to load employees. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="page-padding max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-purple-500/10 p-2.5">
            <Calendar className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Daily Attendance</h1>
            <p className="text-sm text-secondary-foreground">
              Date-wise attendance · {formatDisplayDate(date)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDate((d) => shiftDate(d, -1))}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value || todayIso())}
            className="rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="button"
            onClick={() => setDate((d) => shiftDate(d, 1))}
            disabled={date >= todayIso()}
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 disabled:opacity-40"
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {date !== todayIso() && (
            <button
              type="button"
              onClick={() => setDate(todayIso())}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {attError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-red-300">
            Could not load saved attendance for this date. You can still mark attendance below.
          </p>
          <button
            type="button"
            onClick={() => refetchAttendance()}
            className="shrink-0 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {attLoading && (
        <p className="text-xs text-secondary-foreground">Loading attendance records…</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Present', value: stats?.Present ?? 0, tone: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Absent', value: stats?.Absent ?? 0, tone: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Leave', value: stats?.Leave ?? 0, tone: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'Half Day', value: stats?.HalfDay ?? 0, tone: 'text-orange-400', bg: 'bg-orange-500/10' },
          { label: 'Late', value: stats?.Late ?? 0, tone: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border border-white/10 ${card.bg} px-4 py-3`}
          >
            <p className="text-xs text-secondary-foreground">{card.label}</p>
            <p className={`text-2xl font-bold ${card.tone}`}>
              {statsLoading ? '—' : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-secondary-foreground">
          {employees.length} active employees · {markedCount} marked for this date
          {dirtyCount > 0 ? ` · ${dirtyCount} unsaved` : ''}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markAllPresent}
            disabled={employees.length === 0}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Mark all Present
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || employees.length === 0 || dirtyCount === 0}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : `Save attendance${dirtyCount ? ` (${dirtyCount})` : ''}`}
          </button>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-background/40 p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-secondary-foreground/40 mb-3" />
          <p className="text-secondary-foreground text-sm mb-4">
            No active employees found. Onboard a deployed candidate first, then mark attendance.
          </p>
          <Link
            href="/hr/onboarding"
            className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Onboard Employee
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-background/40 backdrop-blur-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Employee ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Saved
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Mark for {formatDisplayDate(date)}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ emp, savedStatus, status, isDirty, unmarked }) => (
                <tr key={emp.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-secondary-foreground">{emp.employeeId ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-white">{emp.fullName ?? '—'}</td>
                  <td className="px-4 py-3 text-secondary-foreground">
                    {emp.category?.name ?? emp.department ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {savedStatus ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white">
                        <StatusIcon status={savedStatus} />
                        {savedStatus}
                      </span>
                    ) : (
                      <span className="text-xs text-secondary-foreground">Not marked</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={status}
                        onChange={(e) => handleStatusChange(emp.id, e.target.value as StatusValue)}
                        className={`rounded-lg border bg-background px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                          isDirty
                            ? 'border-primary/50'
                            : unmarked
                              ? 'border-amber-500/30'
                              : 'border-white/10'
                        }`}
                      >
                        <option value="">Select status</option>
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {status ? <StatusIcon status={status} /> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
