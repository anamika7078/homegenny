'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  IndianRupee, TrendingUp, AlertTriangle, FileText,
  Users, ShieldCheck, Loader2, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}
function fmtRs(n: number) { return `₹${fmt(n)}`; }

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  trend?: number;
  color?: string;
}
function StatCard({ label, value, sub, icon, trend, color = '#10b981' }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#131c2e] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}22` }}>
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}% from last month
        </div>
      )}
    </div>
  );
}

export default function FinanceDashboard() {
  const [data, setData] = useState<any>(null);
  const [aging, setAging] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getFinanceDashboard(),
      api.getFinanceInvoiceAging(),
    ])
      .then(([dash, age]) => {
        setData(dash);
        const items = age?.data ?? age;
        setAging(Array.isArray(items) ? items : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  const trend = data?.revenue_trend ?? [];
  const esicPf = data?.esic_pf_trend ?? [];
  const totalRevenue = trend.reduce((s: number, r: any) => s + parseFloat(r.management_fee_income ?? 0), 0);
  const totalGst     = data?.total_gst_liability ?? 0;
  const growthPct    = data?.revenue_growth_pct  ?? 0;
  const overdueAmt   = aging.reduce((s: number, b: any) => s + parseFloat(b.total_amount ?? 0), 0);
  const overdueCount = aging.reduce((s: number, b: any) => s + parseInt(b.count ?? 0, 10), 0);

  const revenueChartData = trend.map((r: any) => ({
    name:    r.period_label,
    Revenue: parseFloat(r.management_fee_income ?? 0),
    GST:     parseFloat(r.gst_collected ?? 0),
  }));

  const esicPfChartData = esicPf.map((r: any) => ({
    name:   r.period_label,
    ESIC:   parseFloat(r.total_esic ?? 0),
    PF:     parseFloat(r.total_pf   ?? 0),
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Finance Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">EOR Payroll · Invoice · ESIC/PF · Razorpay</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Finance Console</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Management Fee Revenue"
          value={fmtRs(totalRevenue)}
          sub="Last 6 months"
          icon={<IndianRupee className="w-4 h-4" />}
          trend={growthPct}
          color="#10b981"
        />
        <StatCard
          label="GST Output Liability"
          value={fmtRs(totalGst)}
          sub="18% on fee component"
          icon={<FileText className="w-4 h-4" />}
          color="#6366f1"
        />
        <StatCard
          label="Overdue Invoices"
          value={fmtRs(overdueAmt)}
          sub={`${overdueCount} invoices overdue`}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="#ef4444"
        />
        <StatCard
          label="Active Placements"
          value={String(trend[0]?.staff_count ?? '—')}
          sub="Current period"
          icon={<Users className="w-4 h-4" />}
          color="#f59e0b"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue Trend */}
        <div className="rounded-2xl border border-white/8 bg-[#131c2e] p-5">
          <h3 className="text-sm font-bold text-white mb-4">Revenue Trend — Management Fee + GST</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => fmtRs(v)}
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                />
                <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="GST"     fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ESIC + PF Outflow */}
        <div className="rounded-2xl border border-white/8 bg-[#131c2e] p-5">
          <h3 className="text-sm font-bold text-white mb-4">ESIC + PF Outflow (Statutory)</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={esicPfChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => fmtRs(v)}
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                />
                <Line type="monotone" dataKey="ESIC" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="PF"   stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Invoice Aging */}
      {aging.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-[#131c2e] p-5">
            <h3 className="text-sm font-bold text-white mb-4">Invoice Aging Report</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={aging}
                    dataKey="total_amount"
                    nameKey="bucket"
                    cx="50%" cy="50%"
                    outerRadius={80}
                    label={({ bucket, percent }) => `${bucket} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {aging.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtRs(v)} contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-[#131c2e] p-5">
            <h3 className="text-sm font-bold text-white mb-4">Aging Buckets Detail</h3>
            <div className="space-y-3">
              {aging.map((b: any, i: number) => (
                <div key={b.bucket} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-slate-300">{b.bucket}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{fmtRs(parseFloat(b.total_amount))}</p>
                    <p className="text-xs text-slate-500">{b.count} invoices</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {aging.length === 0 && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <p className="text-sm text-emerald-400 font-medium">No overdue invoices — all payments are current ✓</p>
        </div>
      )}
    </div>
  );
}
