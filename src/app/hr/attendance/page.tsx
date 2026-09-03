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
import { unwrapData } from '@/lib/hr/utils';

const STATUS_OPTIONS = [
  { value: 'Present', label: 'Present', icon: CheckCircle, tone: 'text-green-400' },
  { value: 'Half Day', label: 'Half Day', icon: AlertTriangle, tone: 'text-orange-400' },
  { value: 'Leave', label: 'Leave', icon: Clock, tone: 'text-yellow-400' },
  { value: 'Absent', label: 'Absent', icon: XCircle, tone: 'text-red-400' },
  { value: 'Late', label: 'Late', icon: Clock, tone: 'text-blue-400' },
] as const;

type StatusValue = (typeof STATUS_OPTIONS)[number]['value'] | '';

/** staff_daily_attendance stores its own short form; HR's select uses these. */
const SAVED_TO_OPTION: Record<string, StatusValue> = {
  PRESENT: 'Present',
  HALF_DAY: 'Half Day',
  LEAVE: 'Leave',
  ABSENT: 'Absent',
  OVERTIME: 'Present',
};

interface RosterRow {
  placement_id: string;
  placement_type: 'PERMANENT' | 'TEMPORARY';
  shift_hours: number | null;
  hourly_rate: number | null;
  staff_name: string | null;
  staff_code: string | null;
  series: string | null;
  client_name: string | null;
  unit_code: string | null;
  employee_id: string | null;
  marked_status: string | null;
  marked_hours: number | null;
}

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
  // Keyed by placement, not by person — the same maid holds a separate day at
  // each house she works.
  const [drafts, setDrafts] = useState<Record<string, StatusValue>>({});
  const [hourDrafts, setHourDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDrafts({});
    setHourDrafts({});
  }, [date]);

  // The day's marking list. A staff member placed at three houses appears
  // three times, because the day belongs to a client — it decides whose
  // invoice carries it, and for an hourly placement the hours decide the price.
  const {
    data: rosterRaw,
    isLoading: empLoading,
    error: empError,
    refetch: refetchRoster,
  } = useQuery({
    queryKey: ['attendance', 'roster', date],
    queryFn: () => api.getAttendanceRoster(date),
  });

  // The HR ledger listing used to be fetched here to show what was already
  // marked. The roster carries that per placement now — which is the only form
  // that can distinguish a maid's day at one house from her day at the next —
  // so fetching it again would only be a second answer to the same question.

  const {
    data: statsRaw,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ['attendance', 'hr', 'stats', date],
    queryFn: () => api.getAttendanceStats({ date }),
  });

  const roster: RosterRow[] = (unwrapData(rosterRaw) as any)?.rows ?? [];
  const stats = unwrapData(statsRaw) as
    | { Present?: number; Absent?: number; Leave?: number; HalfDay?: number; Late?: number }
    | undefined;

  // The roster's own status is the DB's short form (PRESENT); HR's select
  // speaks the long form. Map between them rather than showing two vocabularies.
  const rows = useMemo(() => {
    return roster.map((r) => {
      const savedStatus = (SAVED_TO_OPTION[r.marked_status ?? ''] ?? '') as StatusValue;
      const draft = drafts[r.placement_id];
      const status: StatusValue = draft !== undefined ? draft : savedStatus;
      const hoursDraft = hourDrafts[r.placement_id];
      const hours = hoursDraft !== undefined
        ? hoursDraft
        : (r.marked_hours != null ? String(r.marked_hours) : '');
      return {
        row: r,
        savedStatus: savedStatus || undefined,
        status,
        hours,
        isDirty:
          (draft !== undefined && draft !== savedStatus) ||
          (hoursDraft !== undefined && hoursDraft !== (r.marked_hours != null ? String(r.marked_hours) : '')),
        unmarked: !r.marked_status && (draft === undefined || draft === ''),
      };
    });
  }, [roster, drafts, hourDrafts]);

  const markedCount = rows.filter((r) => r.savedStatus || (r.status && r.isDirty)).length;
  const dirtyCount = rows.filter((r) => r.isDirty && r.status).length;

  const handleStatusChange = (placementId: string, status: StatusValue) => {
    setDrafts((prev) => ({ ...prev, [placementId]: status }));
  };

  const handleHoursChange = (placementId: string, hours: string) => {
    setHourDrafts((prev) => ({ ...prev, [placementId]: hours }));
  };

  const markAllPresent = () => {
    const next: Record<string, StatusValue> = {};
    const nextHours: Record<string, string> = {};
    for (const r of roster) {
      next[r.placement_id] = 'Present';
      // A permanent placement works its whole shift; an hourly one has to be
      // told, so leave it for the person marking rather than inventing hours.
      if (r.placement_type === 'PERMANENT' && r.shift_hours) {
        nextHours[r.placement_id] = String(r.shift_hours);
      }
    }
    setDrafts(next);
    setHourDrafts((prev) => ({ ...prev, ...nextHours }));
  };

  const handleSave = async () => {
    const changes = rows.filter((r) => r.status && r.isDirty);

    if (changes.length === 0) {
      toast('No attendance changes to save', { icon: 'ℹ️' });
      return;
    }

    // An hourly day with no hours cannot be priced — refuse before writing
    // half the rows rather than leaving an invoice short.
    const missingHours = changes.filter(
      (r) => r.row.placement_type === 'TEMPORARY' && r.status === 'Present' && !(Number(r.hours) > 0),
    );
    if (missingHours.length) {
      toast.error(
        `Enter hours for ${missingHours.map((r) => r.row.staff_name).join(', ')} — ` +
        'an hourly day is billed on its hours.',
      );
      return;
    }

    const notOnboarded = changes.filter((r) => !r.row.employee_id);
    if (notOnboarded.length) {
      toast.error(
        `${notOnboarded.map((r) => r.row.staff_name).join(', ')} has no HR record yet. ` +
        'Onboard them first, then mark the day.',
      );
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        changes.map((r) =>
          api.markAttendance({
            employeeId: r.row.employee_id as string,
            date,
            status: r.status as string,
            placementId: r.row.placement_id,
            ...(Number(r.hours) > 0 ? { hoursWorked: Number(r.hours) } : {}),
          }),
        ),
      );
      toast.success(`Attendance saved for ${changes.length} placement(s) on ${formatDisplayDate(date)}`);
      setDrafts({});
      setHourDrafts({});
      await Promise.all([
        refetchRoster(),
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
        <p className="text-red-400 text-sm">Could not load the day&apos;s roster. Please try again.</p>
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
          {rows.length} placements to mark · {markedCount} marked for this date
          {dirtyCount > 0 ? ` · ${dirtyCount} unsaved` : ''}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markAllPresent}
            disabled={rows.length === 0}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Mark all Present
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || rows.length === 0 || dirtyCount === 0}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : `Save attendance${dirtyCount ? ` (${dirtyCount})` : ''}`}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-background/40 p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-secondary-foreground/40 mb-3" />
          <p className="text-secondary-foreground text-sm mb-4">
            Nobody is placed with a client right now, so there is no day to mark.
            Attendance is marked against a placement — it decides which client&apos;s invoice
            carries the day.
          </p>
          <Link
            href="/rm/placements"
            className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Go to Placements
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-background/40 backdrop-blur-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Staff
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Works at
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Paid
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Saved
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Mark for {formatDisplayDate(date)}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Hours
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ row, savedStatus, status, hours, isDirty, unmarked }) => (
                <tr key={row.placement_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{row.staff_name ?? '—'}</p>
                    <p className="text-[11px] text-secondary-foreground font-mono">{row.staff_code ?? ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white">{row.client_name ?? '—'}</p>
                    <p className="text-[11px] text-secondary-foreground font-mono">{row.unit_code ?? ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    {row.placement_type === 'TEMPORARY' ? (
                      <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-400">
                        ₹{row.hourly_rate ?? 0}/hr
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-secondary-foreground">
                        {row.shift_hours ?? 8}h shift
                      </span>
                    )}
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
                        onChange={(e) => handleStatusChange(row.placement_id, e.target.value as StatusValue)}
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
                  <td className="px-4 py-3">
                    {/* An hourly day is billed on its hours, so it has to be
                        asked for. A permanent day defaults to its shift. */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={hours}
                        onChange={(e) => handleHoursChange(row.placement_id, e.target.value)}
                        placeholder={row.placement_type === 'TEMPORARY' ? 'required' : String(row.shift_hours ?? 8)}
                        className={`w-20 rounded-lg border bg-background px-2 py-1.5 text-sm text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                          row.placement_type === 'TEMPORARY' && status === 'Present' && !(Number(hours) > 0)
                            ? 'border-amber-500/50'
                            : 'border-white/10'
                        }`}
                      />
                      {row.placement_type === 'TEMPORARY' && Number(hours) > 0 && row.hourly_rate ? (
                        <span className="text-[11px] text-amber-400 tabular-nums whitespace-nowrap">
                          = ₹{(Number(hours) * row.hourly_rate).toLocaleString('en-IN')}
                        </span>
                      ) : null}
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
