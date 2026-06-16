'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, Wallet, CheckCircle2, XCircle,
  RefreshCw, AlertTriangle, Filter,
} from 'lucide-react';

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n));
}
function fmtRs(n: number | string) { return `₹${fmt(n)}`; }

const STATUS_TABS = [
  { id: '',          label: 'All'       },
  { id: 'PAID',      label: 'Paid'      },
  { id: 'UNPAID',    label: 'Unpaid'    },
  { id: 'FORFEITED', label: 'Forfeited' },
];

const EVENT_OPTIONS = [
  { value: 'REFUND',         label: 'Refund to Staff' },
  { value: 'FORFEITURE',     label: 'Forfeiture (DR-07 etc.)' },
  { value: 'PARTIAL_REFUND', label: 'Partial Refund' },
];

export default function DepositsPage() {
  const [status, setStatus]         = useState('');
  const [deposits, setDeposits]     = useState<any[]>([]);
  const [stats, setStats]           = useState<any>(null);
  const [loading, setLoading]       = useState(false);
  const [modal, setModal]           = useState<any | null>(null);
  const [event, setEvent]           = useState('REFUND');
  const [notes, setNotes]           = useState('');
  const [scenarioCode, setScenarioCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [deps, st] = await Promise.all([
        api.getFinanceDeposits(status || undefined),
        api.getFinanceDepositStats(),
      ]);
      const items = deps?.data ?? deps;
      setDeposits(Array.isArray(items) ? items : []);
      setStats(st);
    } catch (e: any) {
      showToast('error', e.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status]);

  const handleRecord = async () => {
    if (!modal) return;
    setSubmitting(true);
    try {
      await api.recordDepositEvent(modal.id, event, notes || undefined, scenarioCode || undefined);
      showToast('success', `Deposit event recorded: ${event}`);
      setModal(null); setNotes(''); setScenarioCode('');
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Failed to record event');
    } finally {
      setSubmitting(false);
    }
  };

  const depositStatusStyle: Record<string, string> = {
    PAID:           'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    UNPAID:         'text-amber-400 bg-amber-400/10 border-amber-400/20',
    FORFEITED:      'text-red-400 bg-red-400/10 border-red-400/20',
    REFUNDED:       'text-blue-400 bg-blue-400/10 border-blue-400/20',
    PARTIAL_REFUND: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium border
          ${toast.type === 'success' ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300' : 'bg-red-950 border-red-500/30 text-red-300'}`}
        >
          {toast.msg}
        </div>
      )}

      {/* Record Event Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-white text-lg">Record Deposit Event</h3>
            <p className="text-sm text-slate-400">Staff: <span className="text-white font-medium">{modal.full_name}</span> · ₹{fmt(modal.deposit_amount)}</p>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Event Type</label>
              <select
                id="select-event-type"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                className="w-full appearance-none bg-[#131c2e] border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {EVENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Scenario Code (optional, e.g. DR-07)</label>
              <input
                id="input-scenario-code"
                value={scenarioCode}
                onChange={(e) => setScenarioCode(e.target.value)}
                placeholder="DR-07"
                className="w-full bg-[#131c2e] border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Notes</label>
              <textarea
                id="input-deposit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Additional context…"
                className="w-full bg-[#131c2e] border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition">Cancel</button>
              <button
                id="btn-confirm-deposit-event"
                onClick={handleRecord}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-60 transition"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Record Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Deposit Tracking</h1>
          <p className="text-sm text-slate-400 mt-0.5">Security deposit status · Refund / Forfeiture events</p>
        </div>
        <button id="btn-refresh-deposits" onClick={load} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Staff w/ Deposit', value: String(stats.total_staff),        color: '#64748b' },
            { label: 'Deposits Collected',      value: fmtRs(stats.total_collected),     color: '#10b981' },
            { label: 'Outstanding',             value: fmtRs(stats.total_outstanding),   color: '#f59e0b' },
            { label: 'Unpaid Count',            value: String(stats.unpaid_count),        color: '#ef4444' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-white/8 bg-[#131c2e] p-4">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">{label}</p>
              <p className="text-xl font-bold mt-1" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            id={`tab-deposit-${tab.id || 'all'}`}
            onClick={() => setStatus(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5
              ${status === tab.id ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/8'}`}
          >
            <Filter className="w-3 h-3" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/8 bg-[#131c2e] overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
          </div>
        ) : deposits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Wallet className="w-10 h-10 text-slate-600" />
            <p className="text-slate-400 text-sm">No deposit records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Staff</th>
                  <th className="px-4 py-3 text-left">Series</th>
                  <th className="px-4 py-3 text-right">Deposit</th>
                  <th className="px-4 py-3 text-center">Placement</th>
                  <th className="px-4 py-3 text-center">Scenario</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((d: any) => {
                  const depositStatus = d.deposit_status ?? (d.deposit_paid ? 'PAID' : 'UNPAID');
                  const badgeCls = depositStatusStyle[depositStatus] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/20';
                  return (
                    <tr key={d.id} className="border-b border-white/5 hover:bg-white/2 transition">
                      <td className="px-5 py-3">
                        <p className="font-medium text-white">{d.full_name}</p>
                        <p className="text-[11px] text-slate-500">{d.staff_code}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">{d.series}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-white font-bold">{fmtRs(d.deposit_amount)}</td>
                      <td className="px-4 py-3 text-center text-xs">
                        {d.placement_status
                          ? <span className="px-2 py-0.5 rounded-full border border-white/10 text-slate-400">{d.placement_status}</span>
                          : <span className="text-slate-600">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-mono text-amber-400">
                        {d.exit_scenario_code ?? d.deposit_scenario_code ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${badgeCls}`}>
                          {depositStatus === 'PAID' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {depositStatus === 'FORFEITED' && <XCircle className="w-3 h-3 mr-1" />}
                          {depositStatus === 'UNPAID' && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {depositStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          id={`btn-record-deposit-${d.id}`}
                          onClick={() => setModal(d)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold border border-white/10 transition"
                        >
                          Record Event
                        </button>
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
