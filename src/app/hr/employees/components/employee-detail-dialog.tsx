'use client';

/**
 * Everything about one employee, opened from their row.
 *
 * HR's list answers "who works here" and nothing else. Whether somebody turned
 * up, and what they were paid for it, lived on two other screens — so the
 * ordinary question, "what has this person been doing", took three trips. This
 * is those three answers in one place.
 *
 * The attendance grid and the payslips move together with the month arrows,
 * because the payslip is the month's attendance turned into money and reading
 * them side by side is the point.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { AttendanceMonthGrid, type MonthDays } from '@/components/attendance-month-grid';
import {
  Loader2, X, Phone, Mail, Building2, Download, Eye,
  AlertCircle, Receipt, BadgeCheck,
} from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmtRs = (n: number | string | null | undefined) =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n ?? 0))}`;

/**
 * The month endpoint speaks HR's vocabulary ('Present', 'Half Day'); the grid
 * speaks the pipeline's. One place to translate, so the two never drift.
 */
function toGridDays(items: any[]): MonthDays {
  const out: MonthDays = {};
  for (const it of items ?? []) {
    // 'YYYY-MM-DD' — read the day off the string. Parsing it into a Date and
    // asking for the day shifts it by one on an IST machine.
    const day = Number(String(it.date).slice(8, 10));
    if (!day) continue;
    const status = String(it.effectiveStatus ?? it.status ?? '')
      .toUpperCase()
      .replace(/\s+/g, '_');
    out[day] = { status, hours: it.workingHours ?? null };
  }
  return out;
}

export function EmployeeDetailDialog({
  employeeId,
  onClose,
}: {
  employeeId: string;
  onClose: () => void;
}) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [employee, setEmployee] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthLoading, setMonthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // The person and their payslips do not change with the month; only the
  // attendance does. Fetching all three on every arrow press would flicker the
  // header for no reason.
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [emp, slips] = await Promise.all([
          api.getEmployee(employeeId),
          api.listEmployeePayslips(employeeId).catch(() => null),
        ]);
        if (!alive) return;
        setEmployee((emp as any)?.data ?? emp);
        const s: any = (slips as any)?.data ?? slips;
        setPayslips(s?.items ?? (Array.isArray(s) ? s : []));
      } catch (e: any) {
        if (alive) setError(e?.response?.data?.message?.message ?? e.message ?? 'Could not load this employee.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [employeeId]);

  const loadMonth = useCallback(async (m: number, y: number) => {
    setMonthLoading(true);
    try {
      const res: any = await api.getEmployeeAttendanceMonth(employeeId, { month: m, year: y });
      setAttendance(res?.data ?? res);
    } catch {
      setAttendance(null);
    } finally {
      setMonthLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { loadMonth(month, year); }, [loadMonth, month, year]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const download = async (slip: any) => {
    setDownloading(slip.ref);
    try {
      const blob = await api.downloadEmployeePayslip(employeeId, slip.ref);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${employee?.employeeId ?? employeeId}-${slip.periodMonth}-${slip.periodYear}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message ?? 'Could not download that payslip.');
    } finally {
      setDownloading(null);
    }
  };

  const [preview, setPreview] = useState<{ url: string; slip: any } | null>(null);
  const openPreview = async (slip: any) => {
    setDownloading(slip.ref);
    try {
      const blob = await api.downloadEmployeePayslip(employeeId, slip.ref);
      setPreview({ url: URL.createObjectURL(blob), slip });
    } catch (e: any) {
      setError(e.message ?? 'Could not open that payslip.');
    } finally {
      setDownloading(null);
    }
  };
  const closePreview = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const days = toGridDays(attendance?.items ?? []);
  const thisMonthSlip = payslips.find((s) => s.periodMonth === month && s.periodYear === year);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* The payslip itself, read before it is saved — the same PDF that
          downloads, so screen and paper cannot disagree. */}
      {preview && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-6" onClick={closePreview}>
          <div
            className="flex h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d1526]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-5 py-3">
              <p className="text-sm font-semibold text-white">
                {MONTHS[preview.slip.periodMonth - 1]} {preview.slip.periodYear}
                <span className="ml-2 text-xs font-normal text-slate-400">
                  net {fmtRs(preview.slip.netSalary)}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => download(preview.slip)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/8"
                >
                  <Download className="h-3.5 w-3.5" /> Save PDF
                </button>
                <button onClick={closePreview} className="px-2 text-xl leading-none text-slate-400 hover:text-white">×</button>
              </div>
            </div>
            <iframe src={preview.url} title="Payslip" className="grow bg-white" />
          </div>
        </div>
      )}

      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden
                      rounded-2xl border border-white/10 bg-[#0d1526] shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-6 border-b border-white/8 px-6 py-4">
          <div className="min-w-0">
            {loading ? (
              <div className="h-6 w-44 animate-pulse rounded bg-white/10" />
            ) : (
              <>
                <h2 className="truncate text-lg font-bold text-white">
                  {employee?.fullName ?? employee?.full_name ?? 'Employee'}
                </h2>
                <p className="mt-0.5 font-mono text-xs text-emerald-400/80">
                  {employee?.employeeId ?? employee?.employee_id}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  {employee?.designation && (
                    <span>{employee.designation}{employee?.department ? ` · ${employee.department}` : ''}</span>
                  )}
                  {employee?.mobile && (
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{employee.mobile}</span>
                  )}
                  {employee?.email && (
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{employee.email}</span>
                  )}
                  {employee?.branch?.name && (
                    <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{employee.branch.name}</span>
                  )}
                </div>
                {attendance?.linkedToPipeline && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                    <BadgeCheck className="h-3 w-3" /> Placed through the pipeline
                  </span>
                )}
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/8 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grow overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-[minmax(0,300px)_1fr]">
            {/* The month */}
            <section className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <AttendanceMonthGrid
                month={month}
                year={year}
                days={days}
                loading={monthLoading}
                onChangeMonth={(m, y) => { setMonth(m); setYear(y); }}
              />
              {attendance && !monthLoading && (
                <div className="mt-3 space-y-1 border-t border-white/8 pt-3 text-[11px] text-slate-400">
                  {Object.entries(attendance.counts ?? {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span>{k}</span>
                      <span className="tabular-nums text-slate-300">{String(v)}</span>
                    </div>
                  ))}
                  {!Object.keys(attendance.counts ?? {}).length && (
                    <p className="text-slate-500">Nothing marked this month.</p>
                  )}
                  {/* A day HR corrected that the field record has not caught up
                      with is worth seeing, not silently reconciled. */}
                  {attendance.divergingDays > 0 && (
                    <p className="pt-1 text-amber-400">
                      {attendance.divergingDays} day{attendance.divergingDays === 1 ? '' : 's'} differ from the field record
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* What the months came to */}
            <section className="space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Salary slips
              </h3>

              {!payslips.length ? (
                <p className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-500">
                  No payroll has been run for this person yet.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-white/8">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/8 bg-white/[0.03] text-[10px] uppercase tracking-wider text-slate-400">
                        <th className="px-3 py-2.5 text-left">Month</th>
                        <th className="px-3 py-2.5 text-right">Days</th>
                        <th className="px-3 py-2.5 text-right">Net</th>
                        <th className="px-3 py-2.5 text-center">Slip</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payslips.map((s) => (
                        <tr
                          key={s.ref}
                          className={`border-b border-white/5 last:border-0 ${
                            thisMonthSlip?.ref === s.ref ? 'bg-emerald-500/[0.05]' : ''
                          }`}
                        >
                          <td className="px-3 py-2.5">
                            <button
                              onClick={() => { setMonth(s.periodMonth); setYear(s.periodYear); }}
                              className="text-xs text-slate-300 underline-offset-2 hover:text-white hover:underline"
                              title="Show this month on the calendar"
                            >
                              {MONTHS_SHORT[s.periodMonth - 1]} {s.periodYear}
                            </button>
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-slate-400 tabular-nums">
                            {s.presentDays ?? '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-emerald-400 tabular-nums">
                            {fmtRs(s.netSalary)}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openPreview(s)}
                                disabled={downloading === s.ref}
                                className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/8 hover:text-white disabled:opacity-40"
                                title="Read the payslip"
                              >
                                {downloading === s.ref
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Eye className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={() => download(s)}
                                disabled={downloading === s.ref}
                                className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/8 hover:text-white disabled:opacity-40"
                                title="Save the PDF"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {thisMonthSlip && (
                <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Receipt className="h-3 w-3" />
                  {MONTHS[month - 1]} is highlighted above — the grid on the left is what it was paid on.
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
