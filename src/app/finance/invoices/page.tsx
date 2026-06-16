'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, FileText, CheckCircle2, Send, Search,
  AlertTriangle, RefreshCw, Eye,
} from 'lucide-react';

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n));
}
function fmtRs(n: number | string) { return `₹${fmt(n)}`; }

const STATUS_TABS = [
  { id: '',         label: 'All' },
  { id: 'PENDING',  label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'SENT',     label: 'Sent' },
  { id: 'PAID',     label: 'Paid' },
  { id: 'CREDIT_NOTE', label: 'Credit Note' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING:     'text-amber-400 bg-amber-400/10 border-amber-400/20',
  APPROVED:    'text-blue-400 bg-blue-400/10 border-blue-400/20',
  SENT:        'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  PAID:        'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  OVERDUE:     'text-red-400 bg-red-400/10 border-red-400/20',
  CREDIT_NOTE: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${cls}`}>
      {status}
    </span>
  );
}

interface LineItem { description: string; amount: number; gst_applicable: boolean; }

export default function InvoicesPage() {
  const [status, setStatus]         = useState('');
  const [invoices, setInvoices]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState('');
  const [actioning, setActioning]   = useState<string | null>(null);
  const [selected, setSelected]     = useState<any | null>(null);
  const [toast, setToast]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getFinanceInvoices({ status: status || undefined });
      const items = res?.data ?? res;
      setInvoices(Array.isArray(items) ? items : []);
    } catch (e: any) {
      showToast('error', e.message ?? 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status]);

  const handleApprove = async (id: string) => {
    setActioning(id + '_approve');
    try {
      await api.approveFinanceInvoice(id);
      showToast('success', 'Invoice approved');
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Approval failed');
    } finally {
      setActioning(null);
    }
  };

  const handleSend = async (id: string) => {
    setActioning(id + '_send');
    try {
      await api.sendFinanceInvoice(id);
      showToast('success', 'Invoice sent to client');
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Send failed');
    } finally {
      setActioning(null);
    }
  };

  const handleDetail = async (id: string) => {
    try {
      const res = await api.getFinanceInvoice(id);
      setSelected(res);
    } catch (e: any) {
      showToast('error', e.message ?? 'Failed to load detail');
    }
  };

  const filtered = invoices.filter((inv: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.client_name?.toLowerCase().includes(q)
    );
  });

  const isOverdue = (inv: any) =>
    inv.status !== 'PAID' && new Date(inv.due_date) < new Date();

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

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">{selected.invoice_number}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-xl">×</button>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Client</span>
                <span className="text-white font-medium">{selected.client_name ?? selected.client_id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Period</span>
                <span className="text-white">{selected.period_month}/{selected.period_year}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Due Date</span>
                <span className="text-white">{new Date(selected.due_date).toLocaleDateString('en-IN')}</span>
              </div>
              {selected.line_items?.map((li: LineItem) => (
                <div key={li.description} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <span className="text-slate-300">{li.description}</span>
                    {li.gst_applicable && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded">GST</span>
                    )}
                  </div>
                  <span className="text-white font-medium">{fmtRs(li.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              {selected.status === 'PENDING' && (
                <button
                  id={`btn-modal-approve-${selected.id}`}
                  onClick={() => { handleApprove(selected.id); setSelected(null); }}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition"
                >
                  Approve
                </button>
              )}
              {selected.status === 'APPROVED' && (
                <button
                  id={`btn-modal-send-${selected.id}`}
                  onClick={() => { handleSend(selected.id); setSelected(null); }}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
                >
                  Send to Client
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoice Generation</h1>
          <p className="text-sm text-slate-400 mt-0.5">GST-compliant client invoices · EOR billing</p>
        </div>
        <button
          id="btn-refresh-invoices"
          onClick={load}
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
        >
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              id={`tab-inv-${tab.id || 'all'}`}
              onClick={() => setStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition
                ${status === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/8'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            id="search-invoices"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice or client…"
            className="bg-[#131c2e] border border-white/10 text-white text-sm rounded-xl pl-9 pr-4 py-2 w-56 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/8 bg-[#131c2e] overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText className="w-10 h-10 text-slate-600" />
            <p className="text-slate-400 text-sm">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Invoice #</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-center">Period</th>
                  <th className="px-4 py-3 text-right">Salary</th>
                  <th className="px-4 py-3 text-right">Fee + GST</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Due Date</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv: any) => {
                  const overdue = isOverdue(inv);
                  const feeGst = parseFloat(inv.management_fee ?? 0) + parseFloat(inv.gst_amount ?? 0);
                  return (
                    <tr key={inv.id} className={`border-b border-white/5 hover:bg-white/2 transition ${overdue ? 'bg-red-500/3' : ''}`}>
                      <td className="px-5 py-3 font-mono text-xs text-slate-300">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-white">{inv.client_name ?? inv.client_id?.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-center text-slate-400">{inv.period_month}/{inv.period_year}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{fmtRs(inv.staff_salary_component)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-indigo-400">{fmtRs(feeGst)}</span>
                        <span className="text-[10px] text-slate-500 block">18% GST on fee</span>
                      </td>
                      <td className="px-4 py-3 text-right text-white font-bold">{fmtRs(inv.total_amount)}</td>
                      <td className="px-4 py-3 text-center text-xs">
                        <span className={overdue ? 'text-red-400 font-semibold' : 'text-slate-400'}>
                          {overdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                          {new Date(inv.due_date).toLocaleDateString('en-IN')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            id={`btn-view-inv-${inv.id}`}
                            onClick={() => handleDetail(inv.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                            title="View line items"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {inv.status === 'PENDING' && (
                            <button
                              id={`btn-approve-inv-${inv.id}`}
                              onClick={() => handleApprove(inv.id)}
                              disabled={actioning === inv.id + '_approve'}
                              className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition border border-blue-500/20 disabled:opacity-50"
                              title="Approve"
                            >
                              {actioning === inv.id + '_approve'
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <CheckCircle2 className="w-3.5 h-3.5" />
                              }
                            </button>
                          )}
                          {inv.status === 'APPROVED' && (
                            <button
                              id={`btn-send-inv-${inv.id}`}
                              onClick={() => handleSend(inv.id)}
                              disabled={actioning === inv.id + '_send'}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition border border-emerald-500/20 disabled:opacity-50"
                              title="Send to client"
                            >
                              {actioning === inv.id + '_send'
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Send className="w-3.5 h-3.5" />
                              }
                            </button>
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
