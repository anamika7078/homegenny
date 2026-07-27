'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, CheckSquare, MessageSquare, Shield, Clock, CheckCircle2, XCircle, ChevronRight, Eye,
} from 'lucide-react';

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n));
}
function fmtRs(n: number | string) { return `₹${fmt(n)}`; }

export default function ApprovalsPage() {
  const [calculations, setCalculations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [actionItem, setActionItem] = useState<any | null>(null);
  const [comments, setComments] = useState('');
  const [detailItem, setDetailItem] = useState<any | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.listCalculations();
      // Load all calculations so we can see draft sheets to submit, as well as pending approvals.
      const resData = (res as any)?.data ?? res;
      setCalculations(Array.isArray(resData) ? resData : []);
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to load calculations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmitForApproval = async (id: string) => {
    setLoading(true);
    try {
      await api.submitForApproval(id);
      showToast('success', 'Submitted for Executive review!');
      load();
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to submit calculation');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!actionItem) return;
    setLoading(true);
    try {
      await api.approveCalculation(actionItem.id, comments || 'Approved');
      showToast('success', `Calculation approved to next stage!`);
      setActionItem(null);
      setComments('');
      load();
    } catch (err: any) {
      showToast('error', err.message ?? 'Approval failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!actionItem) return;
    setLoading(true);
    try {
      await api.rejectCalculation(actionItem.id, comments || 'Rejected');
      showToast('success', 'Calculation rejected successfully');
      setActionItem(null);
      setComments('');
      load();
    } catch (err: any) {
      showToast('error', err.message ?? 'Rejection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (id: string) => {
    setLoading(true);
    try {
      const details = await api.getCalculation(id);
      setDetailItem((details as any)?.data ?? details);
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
    PENDING_EXECUTIVE: 'text-blue-400 bg-blue-400/10 border-blue-400/20 animate-pulse',
    PENDING_MANAGER: 'text-amber-400 bg-amber-400/10 border-amber-400/20 animate-pulse',
    PENDING_SUPER_ADMIN: 'text-rose-400 bg-rose-400/10 border-rose-400/20 animate-pulse',
    APPROVED: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    REJECTED: 'text-red-400 bg-red-400/10 border-red-400/20',
  };

  return (
    <div className="page-padding space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium border
          ${toast.type === 'success' ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300' : 'bg-red-950 border-red-500/30 text-red-300'}`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <CheckSquare className="text-orange-500 w-7 h-7" />
          Calculation Approvals
        </h1>
        <p className="text-sm text-slate-400">Review commercial drafts and manage the three-stage approval process.</p>
      </div>

      {/* Table */}
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-900/50 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                <th className="py-4 px-6">Customer / Unit</th>
                <th className="py-4 px-6">Branch</th>
                <th className="py-4 px-6">State / Zone</th>
                <th className="py-4 px-6 text-right">Grand Total</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {loading && calculations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                    Loading calculations...
                  </td>
                </tr>
              ) : calculations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No calculations found.
                  </td>
                </tr>
              ) : (
                calculations.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-white font-semibold">{c.customer_name}</span>
                        <span className="text-[10px] text-slate-400">Unit: {c.unit_code} · Rev {c.revision_number}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">{c.branch_name || 'N/A'}</td>
                    <td className="py-4 px-6 text-xs text-slate-400">{c.state} · {c.zone}</td>
                    <td className="py-4 px-6 text-right font-bold text-orange-400">{fmtRs(c.total_grand_total)}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[c.status] || ''}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleViewDetails(c.id)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {c.status === 'DRAFT' || c.status === 'REJECTED' ? (
                          <button
                            onClick={() => handleSubmitForApproval(c.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition"
                          >
                            Submit
                          </button>
                        ) : c.status.startsWith('PENDING') ? (
                          <button
                            onClick={() => setActionItem(c)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
                          >
                            Review
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Review Modal */}
      {actionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Shield className="text-orange-500 w-5 h-5" />
              Review Calculation
            </h3>
            <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 space-y-1 text-xs text-slate-400">
              <p>Customer: <span className="text-white font-bold">{actionItem.customer_name}</span></p>
              <p>Grand Total: <span className="text-orange-400 font-bold">{fmtRs(actionItem.total_grand_total)}</span></p>
              <p>Current Stage: <span className="text-white font-bold">{actionItem.status}</span></p>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Review Comments</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Write approval/rejection feedback..."
                rows={3}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setActionItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-xs transition"
              >
                Close
              </button>
              <button
                onClick={handleReject}
                className="flex-1 py-2.5 rounded-xl bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-semibold text-xs transition"
              >
                Reject
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details View Drawer */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl max-h-[90vh] bg-[#0f172a] border border-white/10 rounded-2xl p-6 sm:p-8 overflow-y-auto space-y-6 shadow-2xl flex flex-col my-auto">
            <div className="flex justify-between items-start border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{detailItem.customer_name}</h3>
                <p className="text-xs text-slate-400">Unit: {detailItem.unit_code} · Revision {detailItem.revision_number}</p>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Calculations items */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-orange-500">Resource breakups</h4>
              {detailItem.items?.map((item: any, i: number) => (
                <div key={i} className="bg-slate-900/50 p-4 rounded-xl border border-white/5 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Category:</span>
                    <p className="font-semibold text-white mt-0.5">{item.category}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Resources:</span>
                    <p className="font-semibold text-white mt-0.5">{item.no_of_resources}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Monthly billing / Resource:</span>
                    <p className="font-semibold text-emerald-400 mt-0.5">{fmtRs(item.monthly_cost / item.no_of_resources)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Employee Net Take-Home:</span>
                    <p className="font-semibold text-white mt-0.5">{fmtRs(item.net_salary)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Approval History Logs */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-orange-500">Approval history</h4>
              {detailItem.approvals?.length === 0 ? (
                <p className="text-xs text-slate-500">No approval history logs yet.</p>
              ) : (
                <div className="space-y-3">
                  {detailItem.approvals.map((app: any, idx: number) => (
                    <div key={idx} className="flex gap-3 bg-slate-900/30 p-3 rounded-lg border border-white/5 text-xs">
                      {app.status === 'APPROVED' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : app.status === 'REJECTED' ? (
                        <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      ) : (
                        <Clock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{app.stage} Stage</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold
                            ${app.status === 'APPROVED' ? 'text-emerald-400 bg-emerald-400/10' : app.status === 'REJECTED' ? 'text-red-400 bg-red-400/10' : 'text-blue-400 bg-blue-400/10'}`}
                          >
                            {app.status}
                          </span>
                        </div>
                        <p className="text-slate-300 mt-1">"{app.comments}"</p>
                        <p className="text-[10px] text-slate-500 mt-1">By {app.user_name} on {new Date(app.approval_date).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
