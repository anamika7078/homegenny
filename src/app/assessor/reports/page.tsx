'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { BarChart3, Download, Loader2, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, LineChart, Line, Legend,
} from 'recharts';

const RESULT_COLORS: Record<string, string> = {
  PASS:        '#00C9A7',
  FAIL:        '#FF5A1F',
  DEFERRED:    '#F59E0B',
  CONDITIONAL: '#6366F1',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#090D1A]/95 px-3 py-2 shadow-2xl backdrop-blur-xl">
        <p className="text-xs font-bold text-white mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} className="text-xs" style={{ color: p.color ?? p.fill }}>
            {p.name ?? p.dataKey}: <span className="font-mono font-bold text-white">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AssessmentReports() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['assessor-reports'],
    queryFn: () => api.getAssessorReports(),
    refetchInterval: 120_000,
  });

  const body = (data as any)?.data ?? data ?? {};
  const passFail: any[] = body?.passFail ?? [];
  const weeklyTrend: any[] = body?.weeklyTrend ?? [];

  // Build pass/fail bar data grouped by assessment_type
  const pfDriver = passFail.filter((r) => r.assessment_type === 'DRIVER');
  const pfSc = passFail.filter((r) => r.assessment_type === 'SC');

  const pfChartData = ['PASS', 'FAIL', 'DEFERRED', 'CONDITIONAL'].map((result) => ({
    result,
    Driver: pfDriver.find((r) => r.result === result)?.count ?? 0,
    SC:     pfSc.find((r) => r.result === result)?.count ?? 0,
  }));

  const trendData = weeklyTrend.map((row) => ({
    week: new Date(row.week).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    Total:  row.total,
    Passed: row.passed,
    'Pass Rate': row.total > 0 ? Math.round((row.passed / row.total) * 100) : 0,
  }));

  // Summary totals
  const totalAssessments = passFail.reduce((s, r) => s + Number(r.count), 0);
  const totalPassed = passFail.filter((r) => r.result === 'PASS').reduce((s, r) => s + Number(r.count), 0);
  const passRate = totalAssessments > 0 ? Math.round((totalPassed / totalAssessments) * 100) : 0;

  if (isLoading) {
    return (
      <div className="page-padding flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-padding">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white sm:text-2xl">Reports & Analytics</h1>
          <p className="text-sm text-secondary-foreground mt-1">
            Assessment pass/fail ratios and weekly completion trends
          </p>
        </div>
        <button
          onClick={() => {
            const csv = [
              ['Type', 'Result', 'Count'],
              ...passFail.map((r) => [r.assessment_type, r.result, r.count]),
            ].map((row) => row.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `assessment-report-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/[0.08] transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {isError && (
        <div className="rounded-2xl border border-danger/25 bg-danger/5 p-6 text-center text-sm text-danger mb-6">
          Could not load reports. Ensure the API is running.
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Assessments', value: totalAssessments, color: 'text-white' },
          { label: 'Total Passed',      value: totalPassed,      color: 'text-success' },
          { label: 'Pass Rate',         value: `${passRate}%`,   color: passRate >= 70 ? 'text-success' : 'text-warning' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-white/[0.06] bg-[#0E1320] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-secondary-foreground">{kpi.label}</p>
            <p className={`text-3xl font-bold font-mono mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pass / Fail Bar Chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0E1320] p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-white">Pass / Fail Ratio by Type</h3>
          </div>
          {pfChartData.every((d) => d.Driver === 0 && d.SC === 0) ? (
            <div className="h-56 flex items-center justify-center text-sm text-secondary-foreground">
              No assessment results yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pfChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="result" tick={{ fill: '#8D9AB5', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8D9AB5', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Legend wrapperStyle={{ fontSize: 10, color: '#8D9AB5' }} />
                <Bar dataKey="Driver" fill="#FF5A1F" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="SC"     fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Weekly Trend Line Chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#0E1320] p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-4 w-4 text-success" />
            <h3 className="text-sm font-bold text-white">Weekly Trend (Last 8 weeks)</h3>
          </div>
          {trendData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-secondary-foreground">
              Not enough data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="week" tick={{ fill: '#8D9AB5', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8D9AB5', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)' }} />
                <Legend wrapperStyle={{ fontSize: 10, color: '#8D9AB5' }} />
                <Line type="monotone" dataKey="Total"     stroke="#8D9AB5" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="Passed"    stroke="#00C9A7" strokeWidth={2}   dot={false} />
                <Line type="monotone" dataKey="Pass Rate" stroke="#FF5A1F" strokeWidth={2}   dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
