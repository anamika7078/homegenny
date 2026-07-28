'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, PlayCircle, CheckCircle2,
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

type StatusBadge = 'disbursed' | 'confirmed' | 'pending';
function Badge({ s }: { s: string }) {
  const map: Record<string, { label: string; color: string }> = {
    disbursed: { label: 'Disbursed', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    confirmed: { label: 'Confirmed', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
    pending:   { label: 'Pending',   color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  };
  const { label, color } = map[s] ?? { label: s, color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${color}`}>
      {label}
    </span>
  );
}

export function LegacyDisbursementTab() {
  const [month, setMonth]           = useState(currentDate.getMonth() + 1);
  const [year, setYear]             = useState(currentDate.getFullYear());
  const [records, setRecords]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [disbursing, setDisbursing] = useState<string | null>(null);
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

  const handleConfirmBatch = async () => {
    if (!confirm(`Confirm & post payroll batch for ${MONTHS[month - 1]} ${year}? This cannot be undone.`)) return;
    setConfirming(true);
    try {
      const res = await api.confirmPayrollBatch(month, year);
      showToast('success', `Batch confirmed — ${res.processed} records processed`);
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Batch confirmation failed');
    } finally {
      setConfirming(false);
    }
  };

  const handleDisburse = async (id: string) => {
    if (!confirm('Trigger Razorpay disbursement for this record?')) return;
    setDisbursing(id);
    try {
      await api.disbursePayroll(id);
      showToast('success', 'Disbursement triggered via Razorpay');
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
          <h2 className="text-lg font-bold text-white">Legacy Placement Disbursements</h2>
          <p className="text-xs text-slate-400 mt-0.5">EOR monthly placement payroll · Razorpay bank payout</p>
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

          {records.length === 0 && !loading && (
            <button
              onClick={handleConfirmBatch}
              disabled={confirming}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-60 transition"
            >
              {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              Confirm Batch
            </button>
          )}
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
                  const status: StatusBadge = r.disbursed_at ? 'disbursed' : 'confirmed';
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
                        {!r.disbursed_at ? (
                          <button
                            onClick={() => handleDisburse(r.id)}
                            disabled={disbursing === r.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-xs font-semibold border border-emerald-600/30 transition disabled:opacity-50 flex items-center gap-1.5 mx-auto"
                          >
                            {disbursing === r.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <IndianRupee className="w-3 h-3" />
                            }
                            Disburse
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-xs">Paid</span>
                          </div>
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
