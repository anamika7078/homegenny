'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, RefreshCw, AlertTriangle, Search, Calendar, Users } from 'lucide-react';
import { api } from '@/lib/api/client';

type BatchStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

interface Enrollment {
  id: string; staffId: string; staffCode: string; fullName: string;
  attendance: number[];
}
interface Batch {
  id: string; batchCode: string; series: string;
  trainerName: string; classroom: string; startDate: string;
  status: BatchStatus; enrollments: Enrollment[];
}

const DAYS: Record<string, number> = { DR: 5, SC: 7, UC: 5, M3X: 3 };
const STATUS_CLR: Record<BatchStatus, string> = {
  UPCOMING: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  ACTIVE: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
  COMPLETED: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
};

export default function AttendanceTrackerPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [cellLoading, setCellLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const raw = await api.getTrainerBatches();
      const data = raw?.data ?? raw ?? [];
      const list = Array.isArray(data) ? data : [];
      setBatches(list);
      // Auto-select the first active batch
      const active = list.find((b: Batch) => b.status === 'ACTIVE');
      if (active && !selectedBatch) setSelectedBatch(active);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const toggle = async (batchId: string, staffId: string, day: number, currentlyPresent: boolean) => {
    const key = `${batchId}-${staffId}-${day}`;
    setCellLoading(key);
    try {
      await api.markBatchAttendance(batchId, { staff_id: staffId, day_number: day, attended: !currentlyPresent });
      setBatches(prev => prev.map(b => {
        if (b.id !== batchId) return b;
        const updated = {
          ...b,
          enrollments: b.enrollments.map(e => {
            if (e.staffId !== staffId) return e;
            const att = !currentlyPresent
              ? [...new Set([...e.attendance, day])].sort((a, c) => a - c)
              : e.attendance.filter(d => d !== day);
            return { ...e, attendance: att };
          }),
        };
        if (selectedBatch?.id === batchId) setSelectedBatch(updated);
        return updated;
      }));
    } finally {
      setCellLoading(null);
    }
  };

  const filtered = batches.filter(b =>
    !search || b.batchCode.toLowerCase().includes(search.toLowerCase()) || b.series.toLowerCase().includes(search.toLowerCase())
  );

  const batch = selectedBatch;
  const days = batch ? (DAYS[batch.series] ?? 5) : 0;

  // Overall stats for selected batch
  const avgAttendance = batch && batch.enrollments.length > 0
    ? Math.round(
        batch.enrollments.reduce((sum, e) => sum + (days > 0 ? (e.attendance.length / days) * 100 : 0), 0) /
        batch.enrollments.length
      )
    : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page-padding max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Attendance Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">Mark and review trainee attendance per batch day</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2.5 rounded-xl border border-white/15 bg-white/5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={load} className="ml-auto text-xs text-red-400 underline">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Batch selector */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search batches…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF5A1F]/50"
            />
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-card/40 animate-pulse border border-white/8" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No batches found</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBatch(b)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedBatch?.id === b.id
                      ? 'border-[#FF5A1F]/50 bg-[#FF5A1F]/10'
                      : 'border-white/8 bg-card/40 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">{b.batchCode}</span>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_CLR[b.status]}`}>{b.status}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{b.series}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{b.enrollments.length}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(b.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Attendance grid */}
        <div className="lg:col-span-2">
          {!batch ? (
            <div className="h-64 flex items-center justify-center rounded-xl border border-white/8 bg-card/40">
              <div className="text-center">
                <ClipboardCheck className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-muted-foreground text-sm">Select a batch to view attendance</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/8 bg-card/40 p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-foreground">{batch.batchCode}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {batch.series} · {days}-day curriculum · {batch.enrollments.length} trainees
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#FF5A1F]">{avgAttendance}%</p>
                  <p className="text-xs text-muted-foreground">Avg attendance</p>
                </div>
              </div>

              {/* Grid */}
              {batch.enrollments.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No trainees enrolled</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="text-left py-2 pr-4 text-muted-foreground font-semibold">Trainee</th>
                        {Array.from({ length: days }, (_, i) => (
                          <th key={i} className="text-center py-2 px-1 text-muted-foreground font-semibold w-10">D{i + 1}</th>
                        ))}
                        <th className="text-right py-2 px-2 text-muted-foreground font-semibold">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batch.enrollments.map(t => {
                        const att = t.attendance ?? [];
                        const pct = days > 0 ? Math.round((att.length / days) * 100) : 0;
                        return (
                          <tr key={t.staffId} className="border-t border-white/5">
                            <td className="py-2 pr-4">
                              <p className="font-semibold text-foreground leading-tight">{t.fullName}</p>
                              <p className="text-muted-foreground font-mono">{t.staffCode}</p>
                            </td>
                            {Array.from({ length: days }, (_, i) => {
                              const day = i + 1;
                              const present = att.includes(day);
                              const key = `${batch.id}-${t.staffId}-${day}`;
                              return (
                                <td key={day} className="py-2 px-1 text-center">
                                  <button
                                    onClick={() => toggle(batch.id, t.staffId, day, present)}
                                    disabled={cellLoading === key || batch.status === 'COMPLETED'}
                                    className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center font-bold transition-all disabled:opacity-50 ${
                                      present
                                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                        : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                                    }`}
                                  >
                                    {cellLoading === key ? <RefreshCw className="w-3 h-3 animate-spin" /> : present ? '✓' : '·'}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="py-2 px-2 text-right">
                              <span className={`font-bold ${pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{pct}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
