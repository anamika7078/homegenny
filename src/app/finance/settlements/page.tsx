'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, CreditCard, CheckCircle2, XCircle,
  RefreshCw, AlertTriangle, ArrowRight,
} from 'lucide-react';

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n));
}
function fmtRs(n: number | string) { return `₹${fmt(n)}`; }

const STATUS_TABS = [
  { id: '',        label: 'All'     },
  { id: 'PENDING', label: 'Pending' },
  { id: 'SENT',    label: 'Sent'    },
  { id: 'PAID',    label: 'Paid'    },
];

export default function SettlementsPage() {
  const [status, setStatus]       = useState('');
  const [payments, setPayments]   = useState<any[]>([]);
  const [stats, setStats]         = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [modal, setModal]         = useState<'settle' | 'credit' | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payRef, setPayRef]       = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [actioning, setActioning] = useState(false);
  const [toast, setToast]         = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [pmts, st] = await Promise.all([
        api.getFinanceSettlements(status || undefined),
        api.getFinanceSettlementStats(),
      ]);
      const items = pmts?.data ?? pmts;
      setPayments(Array.isArray(items) ? items : []);
      setStats(st);
    } catch (e: any) {
      showToast('error', e.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status]);

  const handleMarkSettled = async () => {
    if (!selectedId || !payRef.trim()) return;
    setActioning(true);
    try {
      await api.markSettled(selectedId, payRef);
      showToast('success', 'Invoice marked as settled');
      setModal(null); setPayRef(''); setSelectedId(null);
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Failed to mark settled');
    } finally {
      setActioning(false);
    }
  };

  const handleCreditNote = async () => {
    if (!selectedId || !creditReason.trim()) return;
    setActioning(true);
    try {
      await api.issueCreditNote(selectedId, creditReason);
      showToast('success', 'Credit note issued');
      setModal(null); setCreditReason(''); setSelectedId(null);
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Failed to issue credit note');
    } finally {
      setActioning(false);
    }
  };

  const isOverdue = (p: any) => p.status !== 'PAID' && new Date(p.due_date) < new Date();

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

      {/* Mark Settled Modal */}
      {modal === 'settle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-white text-lg">Mark Invoice as Settled</h3>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Payment Reference / UTR</label>
              <input
                id="input-pay-ref"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="e.g. UTR123456789 or RZP order ID"
                className="w-full bg-[#131c2e] border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setModal(null); setPayRef(''); }} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition">Cancel</button>
              <button
                id="btn-confirm-settle"
                onClick={handleMarkSettled}
                disabled={actioning || !payRef.trim()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-60 transition"
              >
                {actioning ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Settled'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Note Modal */}
      {modal === 'credit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-white text-lg">Issue Credit Note</h3>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Reason for Credit Note</label>
              <textarea
                id="input-credit-reason"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="Describe the reason for the credit note…"
                rows={3}
                className="w-full bg-[#131c2e] border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setModal(null); setCreditReason(''); }} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition">Cancel</button>
              <button
                id="btn-confirm-credit"
                onClick={handleCreditNote}
                disabled={actioning || !creditReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold disabled:opacity-60 transition"
              >
                {actioning ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Issue Credit Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment Settlements</h1>
          <p className="text-sm text-slate-400 mt-0.5">Razorpay matching · Manual settlement · Credit notes</p>
        </div>
        <button id="btn-refresh-settlements" onClick={load} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Collected', value: fmtRs(stats.total_paid), color: '#10b981' },
            { label: 'Pending Payments', value: fmtRs(stats.total_pending), color: '#f59e0b' },
            { label: 'Invoices Paid', value: String(stats.count_paid), color: '#6366f1' },
            { label: 'Overdue Count', value: String(stats.count_overdue), color: '#ef4444' },
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
            id={`tab-settle-${tab.id || 'all'}`}
            onClick={() => setStatus(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition
              ${status === tab.id ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/8'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/8 bg-[#131c2e] overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <CreditCard className="w-10 h-10 text-slate-600" />
            <p className="text-slate-400 text-sm">No payments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Invoice #</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Due</th>
                  <th className="px-4 py-3 text-center">Paid At</th>
                  <th className="px-4 py-3 text-left">Ref / Razorpay</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => {
                  const overdue = isOverdue(p);
                  return (
                    <tr key={p.id} className={`border-b border-white/5 hover:bg-white/2 transition ${overdue ? 'bg-red-500/3' : ''}`}>
                      <td className="px-5 py-3 font-mono text-xs text-slate-300">{p.invoice_number}</td>
                      <td className="px-4 py-3 text-white">{p.client_name ?? p.client_id?.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-right text-white font-bold">{fmtRs(p.total_amount)}</td>
                      <td className="px-4 py-3 text-center text-xs">
                        <span className={overdue ? 'text-red-400 font-semibold' : 'text-slate-400'}>
                          {overdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                          {new Date(p.due_date).toLocaleDateString('en-IN')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-400">
                        {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">
                        {p.payment_ref ?? p.razorpay_order_id ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.status === 'PAID'
                          ? <span className="text-emerald-400 flex items-center justify-center gap-1 text-xs"><CheckCircle2 className="w-3.5 h-3.5" />Paid</span>
                          : <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase
                              ${overdue ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-amber-400 bg-amber-400/10 border-amber-400/20'}`}>
                              {overdue ? 'Overdue' : p.status}
                            </span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {p.status !== 'PAID' && (
                            <>
                              <button
                                id={`btn-settle-${p.id}`}
                                onClick={() => { setSelectedId(p.id); setModal('settle'); }}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/20 transition flex items-center gap-1"
                              >
                                <ArrowRight className="w-3 h-3" /> Settle
                              </button>
                              <button
                                id={`btn-credit-${p.id}`}
                                onClick={() => { setSelectedId(p.id); setModal('credit'); }}
                                className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" /> Credit
                              </button>
                            </>
                          )}
                        </div>
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
