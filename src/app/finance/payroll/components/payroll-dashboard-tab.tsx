'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, DollarSign, Users, ShieldAlert,
  Building2, Calendar, CheckCircle2, AlertCircle, Clock,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

function fmtRs(n: number | string) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(n || 0))}`;
}

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EC4899', '#8B5CF6'];

export function PayrollDashboardTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [statutory, setStatutory] = useState<any>(null);
  const [recentBatches, setRecentBatches] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // These used to be wrapped in `.catch(() => null)` with hardcoded
      // fallbacks below — ₹12,45,000 gross across 42 employees — so a failing
      // API produced a plausible, entirely fictional report. Finance reads
      // this screen; a wrong number here is worse than no number.
      const [sumRes, deptRes, statRes, batchesRes] = await Promise.all([
        api.getEnterprisePayrollSummary({ month, year }),
        api.getDepartmentPayrollBreakdown({ month, year }),
        api.getStatutoryComplianceReport({ month, year }),
        api.listEnterpriseBatches({ limit: 5 }),
      ]);

      setSummary(sumRes?.data ?? sumRes ?? null);

      const deptArr = deptRes?.data ?? deptRes;
      setDeptData(Array.isArray(deptArr) ? deptArr : []);

      setStatutory(statRes?.data ?? statRes ?? null);

      const batchesArr = batchesRes?.data ?? batchesRes;
      setRecentBatches(Array.isArray(batchesArr) ? batchesArr : []);
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Could not load payroll analytics.');
      setSummary(null);
      setDeptData([]);
      setStatutory(null);
      setRecentBatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm font-medium">Loading Enterprise Payroll Analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 py-20 px-6 text-center">
        <AlertCircle className="w-8 h-8 text-rose-400" />
        <p className="text-sm font-semibold text-rose-200">Could not load payroll analytics</p>
        <p className="max-w-md text-xs text-slate-400">{error}</p>
        <button
          onClick={loadData}
          className="mt-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/10"
        >
          Try again
        </button>
      </div>
    );
  }

  const kpis = summary?.kpis;

  // No batch has been processed for this period. Saying so is the honest
  // answer — this screen used to invent figures when it had none.
  if (!kpis) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] py-20 px-6 text-center">
        <Calendar className="w-8 h-8 text-slate-500" />
        <p className="text-sm font-semibold text-slate-200">No payroll data for this period</p>
        <p className="max-w-md text-xs text-slate-400">
          Nothing has been processed yet. Run a batch from the
          <span className="text-slate-300"> 10-Step Processing Pipeline </span>
          tab, and the figures will appear here.
        </p>
      </div>
    );
  }

  const statTotals = statutory?.complianceTotals ?? {
    providentFund: 0, esic: 0, professionalTax: 0, tds: 0,
    totalStatutoryDeduction: 0, providentFundEmployer: 0, esicEmployer: 0,
    totalEmployerContribution: 0, totalStatutoryLiability: 0,
  };

  // `|| 1` used to be padded in here so every slice drew even when the real
  // figure was zero — a zero deduction should read as zero, not as a sliver.
  const pieData = [
    { name: 'Provident Fund (PF)', value: Number(statTotals.providentFund) || 0 },
    { name: 'TDS (Income Tax)', value: Number(statTotals.tds) || 0 },
    { name: 'ESIC Contribution', value: Number(statTotals.esic) || 0 },
    { name: 'Professional Tax (PT)', value: Number(statTotals.professionalTax) || 0 },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#162032] to-[#111827] p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Gross Outflow</p>
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-white tracking-tight">{fmtRs(kpis.totalGross)}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Calendar className="w-3.5 h-3.5" />
            <span>{kpis.batchCount ?? 0} batch(es) this period</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#162032] to-[#111827] p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Disbursable</p>
            <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-indigo-400 tracking-tight">{fmtRs(kpis.totalNet)}</p>
          <p className="mt-2 text-xs text-slate-400">Direct employee bank transfers</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#162032] to-[#111827] p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Statutory Deductions</p>
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-amber-400 tracking-tight">{fmtRs(kpis.totalDeductions)}</p>
          <p className="mt-2 text-xs text-slate-400">PF · ESIC · PT · TDS withholdings</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#162032] to-[#111827] p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Employees</p>
            <div className="rounded-xl bg-purple-500/10 p-2 text-purple-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-white tracking-tight">{kpis.totalEmployees}</p>
          <p className="mt-2 text-xs text-slate-400">Processed across all branches</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#131c2e] p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                Department Expense Breakdown
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Gross vs Net Salary by Department</p>
            </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <XAxis dataKey="department" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', color: '#fff' }}
                  formatter={(val: any) => [fmtRs(val), '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="gross" name="Gross Salary" fill="#10B981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="net" name="Net Disbursed" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#131c2e] p-5 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Statutory Compliance
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Tax and social security withholdings</p>
          </div>
          <div className="h-[220px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', color: '#fff' }}
                  formatter={(val: any) => [fmtRs(val), 'Amount']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* The chart above is what comes out of salaries. The employer's own
              PF and ESIC is a separate bill the company pays on top, and it was
              missing entirely — so this panel used to read as the whole
              statutory cost when it was barely half of it (F-07). */}
          <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/10 pt-3 mt-2">
            <div>
              <p className="text-slate-400">Withheld from salaries</p>
              <p className="font-bold text-white mt-0.5">{fmtRs(statTotals.totalStatutoryDeduction ?? 0)}</p>
            </div>
            <div>
              <p className="text-slate-400">Employer contribution</p>
              <p className="font-bold text-amber-400 mt-0.5">{fmtRs(statTotals.totalEmployerContribution ?? 0)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                PF {fmtRs(statTotals.providentFundEmployer ?? 0)} · ESIC {fmtRs(statTotals.esicEmployer ?? 0)}
              </p>
            </div>
          </div>
          <div className="border-t border-white/10 pt-3 mt-3 flex items-baseline justify-between">
            <p className="text-xs text-slate-400">Total payable to authorities</p>
            <p className="text-base font-bold text-white">
              {fmtRs(
                statTotals.totalStatutoryLiability ??
                  ((statTotals.totalStatutoryDeduction ?? 0) + (statTotals.totalEmployerContribution ?? 0)),
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Processing Batches */}
      <div className="rounded-2xl border border-white/10 bg-[#131c2e] overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Recent Enterprise Payroll Batches</h3>
          </div>
          <span className="text-xs font-semibold text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/5">
            Auto-synced with HR Attendance
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider bg-black/20">
                <th className="px-5 py-3 text-left">Batch Number</th>
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-right">Employees</th>
                <th className="px-4 py-3 text-right">Total Gross</th>
                <th className="px-4 py-3 text-right">Total Net</th>
                <th className="px-4 py-3 text-center">Workflow Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                    No enterprise payroll batches processed yet. Switch to the Processing Pipeline tab to run a calculation.
                  </td>
                </tr>
              ) : (
                recentBatches.map((b: any) => (
                  <tr key={b.id} className="border-b border-white/5 hover:bg-white/2 transition">
                    <td className="px-5 py-3.5 font-mono font-medium text-emerald-400">{b.batchNumber}</td>
                    <td className="px-4 py-3.5 text-white">{b.month}/{b.year}</td>
                    <td className="px-4 py-3.5 text-right text-slate-300 font-semibold">{b.totalEmployees}</td>
                    <td className="px-4 py-3.5 text-right font-medium text-white">{fmtRs(b.totalGross)}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-400">{fmtRs(b.totalNet)}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase border
                        ${b.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          b.status === 'LOCKED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          b.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}
                      >
                        {b.status === 'APPROVED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {b.status === 'LOCKED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {b.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                        {b.status === 'REJECTED' && <AlertCircle className="w-3.5 h-3.5" />}
                        {b.status || 'DRAFT'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
