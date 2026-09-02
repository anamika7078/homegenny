'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, PlayCircle, CheckCircle2, AlertTriangle,
  RefreshCw, IndianRupee, Calendar,
} from 'lucide-react';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n));
}
function fmtRs(n: number | string) { return `₹${fmt(n)}`; }

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const currentDate = new Date();

/**
 * Payroll is run for a month that has finished — a month still in progress has
 * partial attendance, and paying from it would short every staff member. This
 * screen used to open on the current month, which is always empty, so it looked
 * broken on the one day someone new tried it.
 */
const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

function Badge({ s }: { s: string }) {
  // Mirrors payroll_records.status / disbursement_status. SIMULATED and
  // PROCESSING are deliberately distinct from PAID: neither means the staff
  // member has the money. See F-09 / F-12.
  const map: Record<string, { label: string; color: string }> = {
    PAID:       { label: 'Paid',       color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    PROCESSING: { label: 'Processing', color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' },
    SIMULATED:  { label: 'Simulated',  color: 'text-fuchsia-400 bg-fuchsia-400/10 border-fuchsia-400/25' },
    APPROVED:   { label: 'Approved',   color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
    PENDING:    { label: 'Needs approval', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
    FAILED:     { label: 'Failed',     color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  };
  const { label, color } = map[s] ?? { label: s, color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${color}`}>
      {label}
    </span>
  );
}

export function LegacyDisbursementTab() {
  const [month, setMonth]           = useState(lastMonth.getMonth() + 1);
  const [year, setYear]             = useState(lastMonth.getFullYear());
  const [records, setRecords]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [disbursing, setDisbursing] = useState<string | null>(null);
  const [approving, setApproving]   = useState<string | null>(null);
  // Whether real payouts are possible at all — worth knowing before clicking,
  // not after (F-09).
  const [payoutReady, setPayoutReady] = useState<{ configured: boolean; hint: string | null } | null>(null);
  const [toast, setToast]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getFinancePayroll({ month, year });
      const items = res?.data ?? res;
      setRecords(Array.isArray(items) ? items : []);
    } catch (e: any) {
      showToast('error', e.message ?? 'Failed to load payroll');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month, year]);

  useEffect(() => {
    api.getPayoutReadiness?.()
      .then((r: any) => setPayoutReady(r?.data ?? r))
      .catch(() => setPayoutReady(null));
  }, []);

  const handleConfirmBatch = async () => {
    if (!confirm(`Run payroll for ${MONTHS[month - 1]} ${year}? Anyone already paid is skipped.`)) return;
    setConfirming(true);
    try {
      const res = await api.confirmPayrollBatch(month, year);
      // "0 processed" is a real answer, not a failure — it means everyone
      // eligible has been paid and the rest have no attendance to bill. Saying
      // "batch confirmed" over it would hide that.
      const done = Number(res?.processed ?? 0);
      const skipped = Number(res?.skipped ?? 0);
      if (done === 0) {
        showToast(
          'success',
          skipped > 0
            ? `Nothing to run — ${skipped} placement(s) have no attendance for this month.`
            : 'Nothing to run — everyone has already been paid for this month.',
        );
      } else {
        showToast(
          'success',
          `Payroll run for ${done} staff member${done === 1 ? '' : 's'}` +
            (skipped > 0 ? ` · ${skipped} skipped, no attendance` : ''),
        );
      }
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Batch confirmation failed');
    } finally {
      setConfirming(false);
    }
  };

  const handleApprove = async (id: string) => {
    setApproving(id);
    try {
      await api.approvePayrollRecord(id);
      showToast('success', 'Payroll approved — it can now be paid');
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Approval failed');
    } finally {
      setApproving(null);
    }
  };

  const handleDisburse = async (r: any) => {
    const amount = fmtRs(r.net_salary);
    const warning = payoutReady?.configured
      ? `Pay ${amount} to ${r.staff_name}? This sends real money and cannot be undone.`
      : `Payouts are not configured, so no money will move — this records a SIMULATED result for ${r.staff_name}. Continue?`;
    if (!confirm(warning)) return;

    setDisbursing(r.id);
    try {
      const res = await api.disbursePayroll(r.id);
      const out = res?.data ?? res;
      // Say what actually happened rather than "triggered" for every outcome.
      if (out?.disbursement_status === 'PAID') showToast('success', `Paid ${amount} to ${r.staff_name}`);
      else if (out?.disbursement_status === 'PROCESSING') showToast('success', `Payout submitted for ${r.staff_name} — awaiting settlement`);
      else showToast('error', out?.note ?? 'Recorded as SIMULATED — no money moved');
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Disbursement failed');
    } finally {
      setDisbursing(null);
    }
  };

  const totalGross  = records.reduce((s, r) => s + parseFloat(r.gross_salary ?? 0), 0);
  const totalNet    = records.reduce((s, r) => s + parseFloat(r.net_salary ?? 0), 0);
  const totalEsic   = records.reduce((s, r) => s + parseFloat(r.esic_employer ?? 0) + parseFloat(r.esic_employee ?? 0), 0);
  const totalPf     = records.reduce((s, r) => s + parseFloat(r.pf_employer ?? 0) + parseFloat(r.pf_employee ?? 0), 0);

  const years = Array.from({ length: 4 }, (_, i) => currentDate.getFullYear() - i);

  return (
    <div className="space-y-6">
      {/* Nobody should discover that payouts are switched off by reading a
          toast after clicking Pay. */}
      {payoutReady && !payoutReady.configured && (
        <div className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/5 px-5 py-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-fuchsia-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-fuchsia-300">Payouts are not live</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {payoutReady.hint} Disbursement still runs and records a SIMULATED result, but no money moves.
            </p>
          </div>
        </div>
      )}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium border
          ${toast.type === 'success'
            ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300'
            : 'bg-red-950 border-red-500/30 text-red-300'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          {/* Not "legacy" — this is the payroll this business runs. */}
          <h2 className="text-lg font-bold text-white">This month&apos;s payroll</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pick a month, then run payroll for a staff member. Approve it, and pay it out.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="min-w-[110px]">
            <SelectMenu
              value={String(month)}
              onValueChange={(v) => setMonth(Number(v))}
              placeholder="Month"
              className="bg-[#131c2e] border-white/10 text-sm rounded-xl"
            >
              {MONTHS.map((m, i) => (
                <SelectMenuItem key={m} value={String(i + 1)}>
                  {m}
                </SelectMenuItem>
              ))}
            </SelectMenu>
          </div>

          <div className="min-w-[110px]">
            <SelectMenu
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
              placeholder="Year"
              className="bg-[#131c2e] border-white/10 text-sm rounded-xl"
            >
              {years.map((y) => (
                <SelectMenuItem key={y} value={String(y)}>
                  {y}
                </SelectMenuItem>
              ))}
            </SelectMenu>
          </div>

          <button
            onClick={load}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>

          {/*
            Always available. This used to appear only when the month was
            completely empty, so the moment one person was paid the button
            vanished — and a staff member placed mid-month could never be run.
            The backend works on whoever is left and refuses per placement, so
            pressing it again is safe.
          */}
          <button
            onClick={handleConfirmBatch}
            disabled={confirming || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-60 transition"
          >
            {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            Run Payroll
          </button>
        </div>
      </div>

      {records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Gross', value: fmtRs(totalGross), color: '#10b981' },
            { label: 'Net Disbursable', value: fmtRs(totalNet), color: '#6366f1' },
            { label: 'Total ESIC', value: fmtRs(totalEsic), color: '#f59e0b' },
            { label: 'Total PF', value: fmtRs(totalPf), color: '#a78bfa' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-white/8 bg-[#131c2e] p-4">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">{label}</p>
              <p className="text-xl font-bold mt-1" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-white/8 bg-[#131c2e] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">
              {MONTHS[month - 1]} {year} — {records.length} Records
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <IndianRupee className="w-10 h-10 text-slate-600" />
            <p className="text-slate-400 text-sm">No placement records for {MONTHS[month - 1]} {year}</p>
            <p className="text-slate-500 text-xs">Click "Confirm Batch" to run payroll for all confirmed placements</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Staff</th>
                  <th className="px-4 py-3 text-right">Shift Days</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">ESIC (Emp)</th>
                  <th className="px-4 py-3 text-right">PF (Emp)</th>
                  <th className="px-4 py-3 text-right">Net Salary</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: any) => {
                  // Prefer the real disbursement state. `disbursed_at` alone
                  // used to be the whole story, which is how a simulated run
                  // read as "Paid" (F-09).
                  const status =
                    r.disbursement_status && r.disbursement_status !== 'NOT_STARTED'
                      ? r.disbursement_status
                      : (r.status ?? 'PENDING');
                  const needsApproval = r.type !== 'EMPLOYEE' && (r.status ?? 'PENDING') === 'PENDING';
                  const payable = r.type === 'EMPLOYEE' || r.status === 'APPROVED';
                  const settled = r.disbursement_status === 'PAID' || (r.type === 'EMPLOYEE' && r.disbursed_at);
                  return (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/2 transition">
                      <td className="px-5 py-3">
                        <p className="font-medium text-white">{r.staff_name ?? '—'}</p>
                        <p className="text-[11px] text-slate-500">{r.staff_code ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">{r.shift_days}</td>
                      <td className="px-4 py-3 text-right text-white font-medium">{fmtRs(r.gross_salary)}</td>
                      <td className="px-4 py-3 text-right text-amber-400">{fmtRs(r.esic_employee)}</td>
                      <td className="px-4 py-3 text-right text-purple-400">{fmtRs(r.pf_employee)}</td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-bold">{fmtRs(r.net_salary)}</td>
                      <td className="px-4 py-3 text-center"><Badge s={status} /></td>
                      <td className="px-4 py-3 text-center">
                        {settled ? (
                          <div className="flex items-center justify-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-xs">Paid</span>
                          </div>
                        ) : needsApproval ? (
                          // Approval comes first now — disbursing an unapproved
                          // record is refused by the API, so don't offer it.
                          <button
                            onClick={() => handleApprove(r.id)}
                            disabled={approving === r.id}
                            className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-semibold border border-blue-600/30 transition disabled:opacity-50 flex items-center gap-1.5 mx-auto"
                          >
                            {approving === r.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <CheckCircle2 className="w-3 h-3" />
                            }
                            Approve
                          </button>
                        ) : payable ? (
                          <button
                            onClick={() => handleDisburse(r)}
                            disabled={disbursing === r.id}
                            title={payoutReady && !payoutReady.configured ? payoutReady.hint ?? undefined : undefined}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-xs font-semibold border border-emerald-600/30 transition disabled:opacity-50 flex items-center gap-1.5 mx-auto"
                          >
                            {disbursing === r.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <IndianRupee className="w-3 h-3" />
                            }
                            {payoutReady && !payoutReady.configured ? 'Simulate' : 'Pay'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                        {r.disbursement_failure_reason && (
                          <p className="text-[10px] text-red-400 mt-1 max-w-[180px] mx-auto">
                            {r.disbursement_failure_reason}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
