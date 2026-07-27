'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, BarChart2, TrendingUp, DollarSign, Users, Award, ShieldAlert, GitPullRequest, ArrowRight,
} from 'lucide-react';

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n));
}
function fmtRs(n: number | string) { return `₹${fmt(n)}`; }

export default function CommercialReportsPage() {
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Compare revisions state
  const [compareState, setCompareState] = useState('Delhi NCR');
  const [compareZone, setCompareZone] = useState('Zone A');
  const [compareCategory, setCompareCategory] = useState('Security Guard');
  const [categories, setCategories] = useState<string[]>([]);
  const [comparisonResults, setComparisonResults] = useState<any[]>([]);
  const [comparing, setComparing] = useState(false);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [rep, cats] = await Promise.all([
        api.getCommercialReports(),
        api.getWageCategories(),
      ]);
      const repData = (rep as any)?.data ?? rep;
      const catsData = (cats as any)?.data ?? cats;
      setReports(repData);
      setCategories(Array.isArray(catsData) ? catsData : []);
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCompare = async () => {
    setComparing(true);
    try {
      const res = await api.getWageRevisionComparison(compareState, compareZone, compareCategory);
      const resData = (res as any)?.data ?? res;
      const resArray = Array.isArray(resData) ? resData : [];
      setComparisonResults(resArray);
      showToast('success', `Found ${resArray.length} revisions for comparison`);
    } catch (err: any) {
      showToast('error', err.message ?? 'Comparison failed');
    } finally {
      setComparing(false);
    }
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
          <BarChart2 className="text-orange-500 w-7 h-7" />
          Commercial Analytics & Reports
        </h1>
        <p className="text-sm text-slate-400">Track monthly billing volumes, management margins, quotation activity, and compliance revisions.</p>
      </div>

      {loading && !reports ? (
        <div className="py-24 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-orange-500" />
          Analyzing reports dashboard...
        </div>
      ) : reports ? (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Billing (Revenue)</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-extrabold text-white">{fmtRs(reports.revenue)}</p>
              <p className="text-[10px] text-slate-500">From active approved calculations</p>
            </div>

            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Margin (Fees)</span>
                <TrendingUp className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-2xl font-extrabold text-white">{fmtRs(reports.margin)}</p>
              <p className="text-[10px] text-emerald-400 font-bold">Avg Margin: {fmt(reports.avg_margin_pct)}%</p>
            </div>

            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Managed Resources</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-extrabold text-white">{reports.resources}</p>
              <p className="text-[10px] text-slate-500">Active personnel deployed</p>
            </div>

            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-5 space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Grand Contract Value</span>
                <Award className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-extrabold text-white">{fmtRs(reports.grand_total)}</p>
              <p className="text-[10px] text-slate-500">Including GST components</p>
            </div>
          </div>

          {/* Revenue by Client and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Revenue */}
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Customer Revenue Contributions</h3>
              <div className="divide-y divide-white/5 max-h-80 overflow-y-auto pr-2 space-y-3">
                {reports.customer_revenue?.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">No revenue data available.</p>
                ) : (
                  reports.customer_revenue.map((c: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2 first:pt-0">
                      <div className="text-xs">
                        <span className="text-white font-bold block">{c.customer_name}</span>
                        <span className="text-[10px] text-slate-400">Unit Code: {c.unit_code}</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-400">{fmtRs(c.revenue)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Category Revenue */}
            <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Category Performance</h3>
              <div className="divide-y divide-white/5 max-h-80 overflow-y-auto pr-2 space-y-3">
                {reports.category_revenue?.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">No category data available.</p>
                ) : (
                  reports.category_revenue.map((cat: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2 first:pt-0">
                      <div className="text-xs">
                        <span className="text-white font-bold block">{cat.category}</span>
                        <span className="text-[10px] text-slate-400">{cat.resources} resources deployed</span>
                      </div>
                      <span className="text-sm font-bold text-white">{fmtRs(cat.revenue)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Wage Revision Comparer */}
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <GitPullRequest className="w-4 h-4 text-orange-500" />
                  Wage Revision Comparison
                </h3>
                <p className="text-xs text-slate-400">Compare revisions across state, zone, and manpower categories.</p>
              </div>
              <button
                onClick={handleCompare}
                disabled={comparing}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition"
              >
                {comparing ? 'Comparing...' : 'Run Comparison'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">State</label>
                <input
                  type="text"
                  value={compareState}
                  onChange={(e) => setCompareState(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Zone</label>
                <input
                  type="text"
                  value={compareZone}
                  onChange={(e) => setCompareZone(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Category</label>
                <select
                  value={compareCategory}
                  onChange={(e) => setCompareCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison results */}
            {comparisonResults.length > 0 && (
              <div className="overflow-x-auto border border-white/5 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50 border-b border-white/5 font-bold text-slate-400 uppercase tracking-widest">
                      <th className="py-3 px-4">Effective Date</th>
                      <th className="py-3 px-4 text-right">Basic Wage</th>
                      <th className="py-3 px-4 text-right">DA</th>
                      <th className="py-3 px-4 text-right">HRA</th>
                      <th className="py-3 px-4 text-right">Total (Basic + DA)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {comparisonResults.map((rc, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="py-3 px-4 font-semibold text-white">
                          {new Date(rc.effective_date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right">{fmtRs(rc.basic_wage)}</td>
                        <td className="py-3 px-4 text-right">{fmtRs(rc.da)}</td>
                        <td className="py-3 px-4 text-right">{fmtRs(rc.hra)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                          {fmtRs(Number(rc.basic_wage) + Number(rc.da))}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border
                            ${rc.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-slate-400 bg-slate-400/10 border-slate-400/20'}`}
                          >
                            {rc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
