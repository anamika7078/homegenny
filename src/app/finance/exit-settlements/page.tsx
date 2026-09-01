'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, LogOut, RefreshCw, CheckCircle2, ArrowRight, Wallet, AlertTriangle,
} from 'lucide-react';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';

function fmtRs(n: number | string) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n ?? 0))}`;
}

const REASONS = [
  { value: 'CLIENT_REQUESTED', label: 'Client requested the exit' },
  { value: 'STAFF_RESIGNED', label: 'Staff resigned' },
  { value: 'MUTUAL', label: 'Mutual agreement' },
  { value: 'TRIAL_NOT_CONFIRMED', label: 'Trial not confirmed' },
  { value: 'TERMINATED_FOR_CAUSE', label: 'Terminated for cause' },
];

const BAND_LABELS: Record<string, string> = {
  DURING_TRIAL: 'During trial',
  MUTUAL_TRIAL_EXIT: 'Mutual trial exit',
  TRIAL_EXTENDED_THEN_EXIT: 'Extended trial, then exit',
  POST_CONFIRM_UNDER_30D: 'Under 30 days after confirmation',
  POST_CONFIRM_30_TO_90D: '30–90 days after confirmation',
  POST_CONFIRM_OVER_90D: 'Over 90 days after confirmation',
  TERMINATED_FOR_CAUSE: 'Terminated for cause',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'text-slate-300 bg-white/5 border-white/15',
  APPROVED:  'text-blue-400 bg-blue-400/10 border-blue-400/20',
  SETTLED:   'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  CANCELLED: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
};

/**
 * Full & final settlements for exits.
 *
 * The spec's fee matrix used to be worked out by hand for every exit — nothing
 * computed it. This applies it, and keeps the two sides separate: what the
 * client owes as a cancellation fee, and what the staff member is owed in
 * final pay, goodwill and deposit. See F-17.
 */
export default function ExitSettlementsPage() {
  const [pending, setPending] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [modal, setModal] = useState<any | null>(null);
  const [reason, setReason] = useState('CLIENT_REQUESTED');
  const [exitDate, setExitDate] = useState(new Date().toISOString().slice(0, 10));
  const [trialExtended, setTrialExtended] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [creating, setCreating] = useState(false);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([api.getPendingExits(), api.listExitSettlements()]);
      setPending(Array.isArray(p?.data ?? p) ? (p?.data ?? p) : []);
      setSettlements(Array.isArray(s?.data ?? s) ? (s?.data ?? s) : []);
    } catch (e: any) {
      showToast('error', e.message ?? 'Could not load settlements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openModal = (row: any) => {
    setModal(row);
    setPreview(null);
    setReason('CLIENT_REQUESTED');
    setTrialExtended(false);
    setExitDate(row.exit_date ? String(row.exit_date).slice(0, 10) : new Date().toISOString().slice(0, 10));
  };

  const runPreview = async () => {
    if (!modal) return;
    setPreviewing(true);
    try {
      const res = await api.previewExitSettlement({
        placement_id: modal.placement_id, exit_date: exitDate, reason, trial_extended: trialExtended,
      });
      setPreview(res?.data ?? res);
    } catch (e: any) {
      showToast('error', e.message ?? 'Could not compute the settlement');
    } finally {
      setPreviewing(false);
    }
  };

  const create = async () => {
    if (!modal) return;
    setCreating(true);
    try {
      await api.createExitSettlement({
        placement_id: modal.placement_id, exit_date: exitDate, reason, trial_extended: trialExtended,
      });
      showToast('success', 'Settlement drafted');
      setModal(null); setPreview(null);
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Could not draft the settlement');
    } finally {
      setCreating(false);
    }
  };

  const act = async (id: string, action: 'approve' | 'settle') => {
    if (action === 'settle' && !window.confirm(
      'Settling records the deposit as refunded or forfeited and closes the settlement. Continue?',
    )) return;
    setActing(id + action);
    try {
      if (action === 'approve') await api.approveExitSettlement(id);
      else await api.settleExitSettlement(id);
      showToast('success', action === 'approve' ? 'Settlement approved' : 'Settlement settled');
      load();
    } catch (e: any) {
      showToast('error', e.message ?? `Could not ${action}`);
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="page-padding space-y-6">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium border max-w-md
          ${toast.type === 'success'
            ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300'
            : 'bg-red-950 border-red-500/30 text-red-300'}`}>
          {toast.msg}
        </div>
      )}

      {/* Draft modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div>
              <h3 className="font-bold text-white text-lg">{modal.staff_name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {modal.staff_code} · {modal.customer_name ?? 'no client on file'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Exit date</label>
                <input
                  id="input-exit-date"
                  type="date"
                  value={exitDate}
                  onChange={(e) => { setExitDate(e.target.value); setPreview(null); }}
                  className="w-full bg-[#131c2e] border border-white/10 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Reason</label>
                <SelectMenu
                  value={reason}
                  onValueChange={(v) => { setReason(v); setPreview(null); }}
                  className="bg-[#131c2e] border-white/10 rounded-xl"
                >
                  {REASONS.map((r) => (
                    <SelectMenuItem key={r.value} value={r.value}>{r.label}</SelectMenuItem>
                  ))}
                </SelectMenu>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={trialExtended}
                onChange={(e) => { setTrialExtended(e.target.checked); setPreview(null); }}
                className="rounded"
              />
              The trial was extended before this exit
            </label>

            <button
              id="btn-preview-settlement"
              onClick={runPreview}
              disabled={previewing}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold transition disabled:opacity-50"
            >
              {previewing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Compute settlement'}
            </button>

            {preview && (
              <div className="space-y-3">
                <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 px-4 py-3">
                  <p className="text-xs font-semibold text-indigo-300">
                    {BAND_LABELS[preview.fee_band] ?? preview.fee_band}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{preview.band_rationale}</p>
                </div>

                {/* Two sides of the same event — never netted into one number. */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400">Owed to staff</p>
                    <p className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">
                      {fmtRs(preview.net_payable_to_staff)}
                    </p>
                    <div className="mt-2 space-y-1">
                      {(preview.breakdown?.staff_side ?? []).map((l: any) => (
                        <div key={l.label} className="flex justify-between text-xs">
                          <span className="text-slate-400">{l.label}</span>
                          <span className="text-slate-200 tabular-nums">{fmtRs(l.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400">Owed by client</p>
                    <p className="text-xl font-bold text-amber-400 mt-1 tabular-nums">
                      {fmtRs(preview.net_receivable_from_client)}
                    </p>
                    <div className="mt-2 space-y-1">
                      {(preview.breakdown?.client_side ?? []).map((l: any) => (
                        <div key={l.label} className="flex justify-between text-xs">
                          <span className="text-slate-400">{l.label}</span>
                          <span className="text-slate-200 tabular-nums">{fmtRs(l.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {preview.final_month_already_paid && (
                  <p className="text-xs text-amber-400/90 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    The exit month's payroll has already run, so no final-month amount is included here.
                  </p>
                )}
                {preview.deposit_action === 'FORFEIT' && (
                  <p className="text-xs text-red-400/90 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    The deposit of {fmtRs(preview.deposit_amount)} will be forfeited, not refunded.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setModal(null); setPreview(null); }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition"
              >
                Cancel
              </button>
              <button
                id="btn-create-settlement"
                onClick={create}
                disabled={creating || !preview}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 transition"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Draft settlement'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Exit Settlements</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Late-exit fee, final month, goodwill and deposit — in one statement
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Exits awaiting a settlement */}
      <div className="rounded-2xl border border-white/8 bg-[#131c2e] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
          <LogOut className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Exits awaiting settlement</span>
          {pending.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/25 text-amber-400">
              {pending.length}
            </span>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-2">
            <CheckCircle2 className="w-8 h-8 text-slate-600" />
            <p className="text-sm text-slate-400">Every exit has been settled</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Staff</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Exit date</th>
                  <th className="px-4 py-3 text-right">Salary</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r: any) => (
                  <tr key={r.placement_id} className="border-b border-white/5 hover:bg-white/2 transition">
                    <td className="px-5 py-3">
                      <p className="font-medium text-white">{r.staff_name}</p>
                      <p className="text-[11px] text-slate-500">{r.staff_code}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{r.customer_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {r.exit_date ? String(r.exit_date).slice(0, 10) : 'not recorded'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 tabular-nums">{fmtRs(r.staff_salary)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        id={`btn-settle-${r.placement_id}`}
                        onClick={() => openModal(r)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition inline-flex items-center gap-1.5"
                      >
                        Settle <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Existing settlements */}
      <div className="rounded-2xl border border-white/8 bg-[#131c2e] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-white">Settlements</span>
        </div>
        {settlements.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No settlements yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Staff</th>
                  <th className="px-4 py-3 text-left">Band</th>
                  <th className="px-4 py-3 text-right">Client owes</th>
                  <th className="px-4 py-3 text-right">Staff owed</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s: any) => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/2 transition">
                    <td className="px-5 py-3">
                      <p className="font-medium text-white">{s.staff_name}</p>
                      <p className="text-[11px] text-slate-500">{s.staff_code}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {BAND_LABELS[s.fee_band] ?? s.fee_band}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-400 tabular-nums">
                      {fmtRs(s.cancellation_fee_amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400 tabular-nums">
                      {fmtRs(s.net_payable_to_staff)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                        STATUS_COLORS[s.status] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/20'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.status === 'DRAFT' && (
                        <button
                          onClick={() => act(s.id, 'approve')}
                          disabled={acting === s.id + 'approve'}
                          className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-semibold border border-blue-600/30 transition disabled:opacity-50"
                        >
                          {acting === s.id + 'approve' ? '…' : 'Approve'}
                        </button>
                      )}
                      {s.status === 'APPROVED' && (
                        <button
                          onClick={() => act(s.id, 'settle')}
                          disabled={acting === s.id + 'settle'}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-xs font-semibold border border-emerald-600/30 transition disabled:opacity-50"
                        >
                          {acting === s.id + 'settle' ? '…' : 'Mark settled'}
                        </button>
                      )}
                      {(s.status === 'SETTLED' || s.status === 'CANCELLED') && (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
