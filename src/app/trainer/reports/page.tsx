'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, TrendingUp, Users, GraduationCap, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api/client';

interface Stats {
  activeTrainees: number;
  sessionsToday: number;
  attendancePending: number;
  videoCertsPending: number;
  avgScore: number;
  retries: number;
}

interface Batch {
  id: string; batchCode: string; series: string;
  status: string; enrollments: { staffId: string; attendance: number[] }[];
}

const SERIES_CLR: Record<string, string> = {
  DR: 'text-amber-400', SC: 'text-emerald-400', UC: 'text-sky-400', M3X: 'text-violet-400',
};
const DAYS_PER: Record<string, number> = { DR: 5, SC: 7, UC: 5, M3X: 3 };

export default function TrainerReportsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.getTrainerDashboard().catch(() => null),
      api.getTrainerBatches().catch(() => null),
    ]).then(([dashRaw, batchRaw]) => {
      const dash = dashRaw?.data ?? dashRaw;
      setStats(dash ?? null);
      const bList = batchRaw?.data ?? batchRaw ?? [];
      setBatches(Array.isArray(bList) ? bList : []);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  // Compute per-series attendance averages
  const seriesBreakdown = Object.entries(
    batches.reduce((acc, b) => {
      const days = DAYS_PER[b.series] ?? 5;
      const avgAtt = b.enrollments.length > 0
        ? b.enrollments.reduce((s, e) => s + (e.attendance.length / days), 0) / b.enrollments.length
        : 0;
      if (!acc[b.series]) acc[b.series] = { count: 0, totalAtt: 0, trainees: 0 };
      acc[b.series].count += 1;
      acc[b.series].totalAtt += avgAtt;
      acc[b.series].trainees += b.enrollments.length;
      return acc;
    }, {} as Record<string, { count: number; totalAtt: number; trainees: number }>)
  ).map(([series, d]) => ({
    series,
    batches: d.count,
    trainees: d.trainees,
    avgAttendance: d.count > 0 ? Math.round((d.totalAtt / d.count) * 100) : 0,
  }));

  const completedBatches = batches.filter(b => b.status === 'COMPLETED');
  const activeBatches = batches.filter(b => b.status === 'ACTIVE');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Training Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Performance analytics for your training sessions</p>
        </div>
        <button onClick={() => window.location.reload()} className="p-2.5 rounded-xl border border-white/15 bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Batches', value: batches.length, icon: GraduationCap, color: 'text-[#FF5A1F]' },
          { label: 'Active Batches', value: activeBatches.length, icon: TrendingUp, color: 'text-sky-400' },
          { label: 'Completed', value: completedBatches.length, icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Total Trainees', value: batches.reduce((s, b) => s + b.enrollments.length, 0), icon: Users, color: 'text-violet-400' },
          { label: 'Avg Score', value: stats?.avgScore ? `${stats.avgScore}%` : '—', icon: BarChart2, color: 'text-amber-400' },
          { label: 'Retries', value: stats?.retries ?? '—', icon: AlertTriangle, color: 'text-red-400' },
        ].map(kpi => (
          <div key={kpi.label} className="p-4 rounded-xl border border-white/8 bg-card/40">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
            <p className={`text-2xl font-bold ${kpi.color}`}>{loading ? '—' : kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Series breakdown */}
      {seriesBreakdown.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-card/40 p-5">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#FF5A1F]" />
            Attendance by Series
          </h3>
          <div className="space-y-3">
            {seriesBreakdown.map(s => (
              <div key={s.series}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${SERIES_CLR[s.series] ?? 'text-foreground'}`}>{s.series}</span>
                    <span className="text-xs text-muted-foreground">{s.batches} batch{s.batches !== 1 ? 'es' : ''} · {s.trainees} trainees</span>
                  </div>
                  <span className={`text-sm font-bold ${s.avgAttendance >= 80 ? 'text-emerald-400' : s.avgAttendance >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                    {s.avgAttendance}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      s.avgAttendance >= 80 ? 'bg-emerald-500' : s.avgAttendance >= 60 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${s.avgAttendance}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batch summary table */}
      {batches.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-card/40 p-5">
          <h3 className="font-bold text-foreground mb-4">Batch Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="text-left pb-3 font-semibold">Batch</th>
                  <th className="text-left pb-3 font-semibold">Series</th>
                  <th className="text-center pb-3 font-semibold">Trainees</th>
                  <th className="text-center pb-3 font-semibold">Avg Att.</th>
                  <th className="text-left pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(b => {
                  const days = DAYS_PER[b.series] ?? 5;
                  const avg = b.enrollments.length > 0
                    ? Math.round(b.enrollments.reduce((s, e) => s + (e.attendance.length / days), 0) / b.enrollments.length * 100)
                    : 0;
                  return (
                    <tr key={b.id} className="border-t border-white/5">
                      <td className="py-3 font-semibold text-foreground">{b.batchCode}</td>
                      <td className="py-3">
                        <span className={`text-xs font-bold ${SERIES_CLR[b.series] ?? ''}`}>{b.series}</span>
                      </td>
                      <td className="py-3 text-center text-muted-foreground">{b.enrollments.length}</td>
                      <td className="py-3 text-center">
                        <span className={`font-bold ${avg >= 80 ? 'text-emerald-400' : avg >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{avg}%</span>
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          b.status === 'ACTIVE' ? 'bg-sky-500/15 text-sky-400' :
                          b.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-400' :
                          'bg-amber-500/15 text-amber-400'
                        }`}>{b.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && batches.length === 0 && (
        <div className="text-center py-16">
          <BarChart2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">No batch data available yet</p>
        </div>
      )}
    </motion.div>
  );
}
