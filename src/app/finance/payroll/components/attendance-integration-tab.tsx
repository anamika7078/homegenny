'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, Clock, Gift, Receipt, CreditCard,
  CheckCircle2, XCircle, Plus, Calendar, Check, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

function fmtRs(n: number | string) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(n || 0))}`;
}

export function AttendanceIntegrationTab() {
  const [subTab, setSubTab] = useState<'OVERTIME' | 'BONUS' | 'REIMBURSEMENT' | 'LOANS'>('OVERTIME');
  const [loading, setLoading] = useState(true);

  // Lists
  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [reimbursements, setReimbursements] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [otRes, bonRes, reimbRes, loanRes] = await Promise.all([
        api.listOvertimeRecords().catch(() => []),
        api.listBonusRecords().catch(() => []),
        api.listReimbursements().catch(() => []),
        api.listLoans().catch(() => []),
      ]);

      setOvertimes(Array.isArray(otRes?.data ?? otRes) ? (otRes?.data ?? otRes) : []);
      setBonuses(Array.isArray(bonRes?.data ?? bonRes) ? (bonRes?.data ?? bonRes) : []);
      setReimbursements(Array.isArray(reimbRes?.data ?? reimbRes) ? (reimbRes?.data ?? reimbRes) : []);
      setLoans(Array.isArray(loanRes?.data ?? loanRes) ? (loanRes?.data ?? loanRes) : []);
    } catch {
      toast.error('Failed to sync integration data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleOvertimeAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await api.approveOvertimeRecord(id, 'finance');
        toast.success('Overtime approved for payroll inclusion.');
      } else {
        await api.rejectOvertimeRecord(id);
        toast.error('Overtime rejected.');
      }
      loadAll();
    } catch (e: any) {
      toast.error(e.message ?? 'Action failed.');
    }
  };

  const handleReimbursementAction = async (id: string, status: string) => {
    try {
      await api.updateReimbursementStatus(id, { status, approvalRole: 'finance' });
      toast.success(`Reimbursement status updated to ${status}.`);
      loadAll();
    } catch (e: any) {
      toast.error(e.message ?? 'Action failed.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Subnav */}
      <div className="flex items-center justify-between flex-wrap gap-4 rounded-2xl border border-white/10 bg-[#131c2e] p-5 shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Attendance & Statutory Pay Additions
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Sync HR attendance logs, verify overtime hours, grant performance bonuses, approve reimbursements, and monitor loan EMIs.
          </p>
        </div>

        <div className="flex bg-[#1a253a] p-1 rounded-xl border border-white/10 text-xs font-bold">
          <button
            onClick={() => setSubTab('OVERTIME')}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${subTab === 'OVERTIME' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <Clock className="w-3.5 h-3.5" />
            Overtime ({overtimes.length})
          </button>
          <button
            onClick={() => setSubTab('BONUS')}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${subTab === 'BONUS' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <Gift className="w-3.5 h-3.5" />
            Bonuses ({bonuses.length})
          </button>
          <button
            onClick={() => setSubTab('REIMBURSEMENT')}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${subTab === 'REIMBURSEMENT' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Reimbursements ({reimbursements.length})
          </button>
          <button
            onClick={() => setSubTab('LOANS')}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${subTab === 'LOANS' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Loans & Advances ({loans.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        </div>
      ) : subTab === 'OVERTIME' ? (
        <div className="rounded-2xl border border-white/10 bg-[#131c2e] overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-bold text-white">Overtime Logs Synced from HR Attendance</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider bg-black/20">
                  <th className="px-5 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Hours</th>
                  <th className="px-4 py-3 text-right">Multiplier</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {overtimes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                      No overtime records reported for the current period.
                    </td>
                  </tr>
                ) : (
                  overtimes.map((ot: any) => (
                    <tr key={ot.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="px-5 py-3 font-bold text-white">{ot.employee?.fullName || 'Staff Member'}</td>
                      <td className="px-4 py-3 text-slate-300">{new Date(ot.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right font-bold text-amber-400">{ot.hours} hrs</td>
                      <td className="px-4 py-3 text-right text-slate-400">{ot.rateMultiplier || '1.0'}x</td>
                      <td className="px-4 py-3 text-right font-extrabold text-white">{fmtRs(ot.totalAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase
                          ${ot.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                            ot.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                            'bg-amber-500/20 text-amber-400'}`}
                        >
                          {ot.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center space-x-2">
                        {ot.status !== 'APPROVED' && (
                          <button
                            onClick={() => handleOvertimeAction(ot.id, 'approve')}
                            className="p-1.5 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 transition"
                            title="Approve for Payroll"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        {ot.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleOvertimeAction(ot.id, 'reject')}
                            className="p-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/40 transition"
                            title="Reject Overtime"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : subTab === 'BONUS' ? (
        <div className="rounded-2xl border border-white/10 bg-[#131c2e] overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-bold text-white">Performance & Festival Bonus Grants</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider bg-black/20">
                  <th className="px-5 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-left">Category / Reason</th>
                  <th className="px-4 py-3 text-center">Period</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {bonuses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 text-sm">
                      No bonus awards listed for this period.
                    </td>
                  </tr>
                ) : (
                  bonuses.map((b: any) => (
                    <tr key={b.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="px-5 py-3 font-bold text-white">{b.employee?.fullName || 'Staff Member'}</td>
                      <td className="px-4 py-3 text-slate-300">
                        <p className="font-semibold">{b.category || 'Performance Bonus'}</p>
                        {b.reason && <p className="text-[11px] text-slate-500 italic">{b.reason}</p>}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300">{b.month}/{b.year}</td>
                      <td className="px-4 py-3 text-right font-extrabold text-purple-400 font-mono">{fmtRs(b.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400">
                          {b.status || 'APPROVED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : subTab === 'REIMBURSEMENT' ? (
        <div className="rounded-2xl border border-white/10 bg-[#131c2e] overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-bold text-white">Expense Reimbursement Claims (3-Tier Verified)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider bg-black/20">
                  <th className="px-5 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-left">Category / Description</th>
                  <th className="px-4 py-3 text-left">Expense Date</th>
                  <th className="px-4 py-3 text-right">Claim Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Finance Action</th>
                </tr>
              </thead>
              <tbody>
                {reimbursements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                      No expense reimbursement claims submitted.
                    </td>
                  </tr>
                ) : (
                  reimbursements.map((r: any) => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="px-5 py-3 font-bold text-white">{r.employee?.fullName || 'Staff Member'}</td>
                      <td className="px-4 py-3 text-slate-300">
                        <p className="font-semibold">{r.category || 'Travel / Client Expense'}</p>
                        {r.description && <p className="text-[11px] text-slate-500">{r.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{new Date(r.expenseDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right font-extrabold text-emerald-400 font-mono">{fmtRs(r.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase
                          ${r.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                            r.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                            'bg-amber-500/20 text-amber-400'}`}
                        >
                          {r.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center space-x-2">
                        {r.status !== 'APPROVED' && (
                          <button
                            onClick={() => handleReimbursementAction(r.id, 'APPROVED')}
                            className="p-1.5 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 transition"
                            title="Approve Reimbursement"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        {r.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleReimbursementAction(r.id, 'REJECTED')}
                            className="p-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/40 transition"
                            title="Reject Claim"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#131c2e] overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-bold text-white">Active Employee Loans & Monthly EMI Deductions</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider bg-black/20">
                  <th className="px-5 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-right">Total Loan Amount</th>
                  <th className="px-4 py-3 text-right">Monthly EMI</th>
                  <th className="px-4 py-3 text-right">Remaining Balance</th>
                  <th className="px-4 py-3 text-center">Auto-Deduct</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                      No active employee loans or salary advances.
                    </td>
                  </tr>
                ) : (
                  loans.map((l: any) => (
                    <tr key={l.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="px-5 py-3 font-bold text-white">{l.employee?.fullName || 'Staff Member'}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-300">{fmtRs(l.loanAmount)}</td>
                      <td className="px-4 py-3 text-right font-bold text-purple-400 font-mono">{fmtRs(l.monthlyEmi)} / mo</td>
                      <td className="px-4 py-3 text-right font-extrabold text-amber-400 font-mono">{fmtRs(l.remainingAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase
                          ${l.autoDeduction ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}
                        >
                          {l.autoDeduction ? 'Yes (Active)' : 'Manual'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-400">
                          {l.status || 'ACTIVE'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
