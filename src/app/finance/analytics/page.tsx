'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, RefreshCw, IndianRupee, MapPin, Target, TrendingUp, Filter,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(n));
}
function fmtRs(n: number | string) { return `₹${fmt(n)}`; }

export default function AnalyticsPage() {
  const [branchPnl, setBranchPnl] = useState<any[]>([]);
  const [gstSummary, setGstSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [pnl, gst] = await Promise.all([
        api.getFinanceBranchPnl(),
        api.getFinanceGst(),
      ]);
      const items = pnl?.data ?? pnl;
      setBranchPnl(Array.isArray(items) ? items : []);
      setGstSummary(gst);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  // `revenue` is the management fee alone. GST is a liability and salary +
  // employer contributions are reimbursed by the client, so neither belongs in
  // revenue or in the margin — see F-10 in docs/FINANCE_MODULE_AUDIT.md.
  const totalBranchRevenue = branchPnl.reduce((s, b) => s + parseFloat(b.revenue || 0), 0);
  const totalBranchProfit = branchPnl.reduce((s, b) => s + parseFloat(b.contribution || 0), 0);
  const totalBranchStaff = branchPnl.reduce((s, b) => s + parseInt(b.staff_count || 0, 10), 0);

  const pnlChartData = branchPnl.slice(0, 10).map((b) => ({
    name: b.branch_name,
    Revenue: parseFloat(b.revenue || 0),
    Contribution: parseFloat(b.contribution || 0),
  }));

  const gstChartData = (gstSummary?.monthly || []).map((m: any) => ({
    name: m.period_label,
    Fee: parseFloat(m.management_fee || 0),
    GST: parseFloat(m.gst_amount || 0),
  })).reverse();

  return (
    <div className="page-padding space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">Branch P&amp;L · GST Summary · Margin Analysis</p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
        >
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/8 bg-[#131c2e] p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Total Branch Revenue</p>
          <p className="text-xl font-bold mt-1 text-emerald-400">{fmtRs(totalBranchRevenue)}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-[#131c2e] p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> Total Contribution</p>
          <p className="text-xl font-bold mt-1 text-indigo-400">{fmtRs(totalBranchProfit)}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-[#131c2e] p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Target className="w-3 h-3" /> Avg Margin</p>
          <p className="text-xl font-bold mt-1 text-amber-400">
            {totalBranchRevenue > 0 ? ((totalBranchProfit / totalBranchRevenue) * 100).toFixed(1) : 0}%
          </p>
        </div>
        <div className="rounded-xl border border-white/8 bg-[#131c2e] p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><IndianRupee className="w-3 h-3" /> Total GST (12m)</p>
          <p className="text-xl font-bold mt-1 text-rose-400">{fmtRs(gstSummary?.total_gst_liability || 0)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top 10 Branches Chart */}
        <div className="rounded-2xl border border-white/8 bg-[#131c2e] p-5">
          <h3 className="text-sm font-bold text-white mb-4">Top 10 Branches by Revenue</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pnlChartData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={false} />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 11 }} width={80} />
                <Tooltip
                  formatter={(v: number) => fmtRs(v)}
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                  cursor={{ fill: '#1e293b' }}
                />
                <Bar dataKey="Revenue" fill="#10b981" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="Contribution" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GST Output Summary */}
        <div className="rounded-2xl border border-white/8 bg-[#131c2e] p-5">
          <h3 className="text-sm font-bold text-white mb-4">GST Output Summary (12 months)</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gstChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => fmtRs(v)}
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                  cursor={{ fill: '#1e293b' }}
                />
                <Bar dataKey="Fee" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} barSize={24} />
                <Bar dataKey="GST" fill="#f43f5e" stackId="a" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Branch P&L Table */}
      <div className="rounded-2xl border border-white/8 bg-[#131c2e] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Branch Performance List</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Branch Name</th>
                <th className="px-4 py-3 text-center">Active Staff</th>
                <th className="px-4 py-3 text-right" title="Management fee — what HomeGenny earns">Fee Revenue</th>
                <th className="px-4 py-3 text-right" title="Salary + employer ESIC/PF: billed to the client and paid straight out">Pass-through</th>
                <th className="px-4 py-3 text-right" title="This branch's own employees">Internal Payroll</th>
                <th className="px-4 py-3 text-right" title="Fee revenue minus internal payroll">Contribution</th>
                <th className="px-4 py-3 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {branchPnl.map((b) => {
                const rev = parseFloat(b.revenue || 0);
                const passThrough = parseFloat(b.pass_through || 0);
                const internal = parseFloat(b.internal_payroll_cost || 0);
                const profit = parseFloat(b.contribution || 0);
                const margin = rev > 0 ? (profit / rev) * 100 : 0;
                return (
                  <tr key={b.branch_id} className="border-b border-white/5 hover:bg-white/2 transition">
                    <td className="px-5 py-3 font-medium text-white flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {b.branch_name}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">{b.staff_count}</td>
                    <td className="px-4 py-3 text-right text-white">{fmtRs(rev)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{fmtRs(passThrough)}</td>
                    <td className="px-4 py-3 text-right text-slate-400">{fmtRs(internal)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${profit < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmtRs(profit)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase
                        ${margin > 20 ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
                          margin > 10 ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' :
                          margin < 0  ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                          'text-amber-400 bg-amber-400/10 border-amber-400/20'}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
