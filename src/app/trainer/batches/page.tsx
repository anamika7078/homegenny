'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Users, Calendar, ChevronDown,
  RefreshCw, AlertTriangle, Check, X, Search
} from 'lucide-react';
import { api } from '@/lib/api/client';

type Series = 'DR' | 'SC' | 'UC' | 'M3X';
type BatchStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

interface Enrollment {
  id: string; staffId: string; staffCode: string; fullName: string;
  series: string; attendance: number[];
}
interface Batch {
  id: string; batchCode: string; series: Series; trainerName: string;
  classroom: string; startDate: string; status: BatchStatus;
  enrollments: Enrollment[];
}

const DAYS: Record<Series, number> = { DR: 5, SC: 7, UC: 5, M3X: 3 };
const SERIES_CLR: Record<string, string> = {
  DR: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  SC: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  UC: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
  M3X: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
};
const STATUS_CLR: Record<BatchStatus, string> = {
  UPCOMING: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  ACTIVE: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  COMPLETED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

function AttendanceCell({ present, loading, onClick }: { present: boolean | null; loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center font-bold text-xs transition-all disabled:opacity-50 ${
        present === true  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' :
        present === false ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' :
        'bg-white/5 text-muted-foreground hover:bg-white/10'
      }`}
    >
      {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : present === true ? '✓' : present === false ? '✗' : '·'}
    </button>
  );
}

function BatchCard({ batch, onAttendanceChange, onStatusChange }: {
  batch: Batch;
  onAttendanceChange: (batchId: string, staffId: string, day: number, attended: boolean) => Promise<void>;
  onStatusChange: (batchId: string, status: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(batch.status === 'ACTIVE');
  const [statusLoading, setStatusLoading] = useState(false);
  const [loadingCell, setLoadingCell] = useState<string | null>(null);
  const days = DAYS[batch.series] ?? 5;

  const advanceStatus = async () => {
    const next = batch.status === 'UPCOMING' ? 'ACTIVE' : 'COMPLETED';
    setStatusLoading(true);
    try { await onStatusChange(batch.id, next); } finally { setStatusLoading(false); }
  };

  const toggle = async (staffId: string, day: number, present: boolean | null) => {
    const key = `${staffId}-${day}`;
    setLoadingCell(key);
    try { await onAttendanceChange(batch.id, staffId, day, present !== true); }
    finally { setLoadingCell(null); }
  };

  return (
    <div className="rounded-xl border border-white/8 bg-card/60 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/3 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-[#FF5A1F]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{batch.batchCode}</span>
            <span className={`text-[9px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 ${SERIES_CLR[batch.series] ?? SERIES_CLR.DR}`}>{batch.series}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{batch.enrollments.length} trainees</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(batch.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            {batch.trainerName && <span>Trainer: {batch.trainerName}</span>}
            {batch.classroom && <span>Room: {batch.classroom}</span>}
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-0.5 ${STATUS_CLR[batch.status] ?? STATUS_CLR.UPCOMING}`}>
          {batch.status}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground ml-1 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-white/6"
          >
            <div className="px-5 py-4 space-y-4">
              {/* Attendance grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left py-2 pr-4 text-muted-foreground font-semibold">Trainee</th>
                      {Array.from({ length: days }, (_, i) => (
                        <th key={i} className="text-center py-2 px-1 text-muted-foreground font-semibold w-9">D{i + 1}</th>
                      ))}
                      <th className="text-center py-2 px-2 text-muted-foreground font-semibold">Att%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.enrollments.map(t => {
                      const att: number[] = t.attendance ?? [];
                      const pct = days > 0 ? Math.round((att.length / days) * 100) : 0;
                      return (
                        <tr key={t.staffId} className="border-t border-white/5">
                          <td className="py-2 pr-4">
                            <p className="font-semibold text-foreground">{t.fullName}</p>
                            <p className="text-muted-foreground font-mono">{t.staffCode}</p>
                          </td>
                          {Array.from({ length: days }, (_, i) => {
                            const day = i + 1;
                            const present = att.includes(day) ? true : (batch.status === 'COMPLETED' ? false : null);
                            const key = `${t.staffId}-${day}`;
                            return (
                              <td key={day} className="py-2 px-1">
                                <AttendanceCell
                                  present={present}
                                  loading={loadingCell === key}
                                  onClick={() => toggle(t.staffId, day, present)}
                                />
                              </td>
                            );
                          })}
                          <td className="text-center py-2 px-2">
                            <span className={`font-bold ${pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{pct}%</span>
                          </td>
                        </tr>
                      );
                    })}
                    {batch.enrollments.length === 0 && (
                      <tr><td colSpan={days + 2} className="py-4 text-center text-muted-foreground">No trainees enrolled yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {batch.status !== 'COMPLETED' && (
                  <button
                    onClick={advanceStatus} disabled={statusLoading}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#FF5A1F] text-white hover:bg-[#e04d17] transition-colors disabled:opacity-50"
                  >
                    {statusLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {batch.status === 'UPCOMING' ? 'Start Batch' : 'Mark Complete'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TrainerBatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const raw = await api.getTrainerBatches();
      const data = raw?.data ?? raw ?? [];
      setBatches(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAttendance = async (batchId: string, staffId: string, day: number, attended: boolean) => {
    await api.markBatchAttendance(batchId, { staff_id: staffId, day_number: day, attended });
    setBatches(prev => prev.map(b => {
      if (b.id !== batchId) return b;
      return {
        ...b,
        enrollments: b.enrollments.map(e => {
          if (e.staffId !== staffId) return e;
          const att = attended
            ? [...new Set([...e.attendance, day])].sort((a, b) => a - b)
            : e.attendance.filter(d => d !== day);
          return { ...e, attendance: att };
        }),
      };
    }));
  };

  const handleStatusChange = async (batchId: string, status: string) => {
    await api.updateBatchStatus(batchId, status);
    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, status: status as BatchStatus } : b));
  };

  const filtered = batches.filter(b =>
    !search || b.batchCode.toLowerCase().includes(search.toLowerCase()) || b.series.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    active: batches.filter(b => b.status === 'ACTIVE').length,
    upcoming: batches.filter(b => b.status === 'UPCOMING').length,
    completed: batches.filter(b => b.status === 'COMPLETED').length,
    trainees: batches.reduce((sum, b) => sum + b.enrollments.length, 0),
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page-padding max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Batch Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Your assigned training batches · Live attendance</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2.5 rounded-xl border border-white/15 bg-white/5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active', val: stats.active, cls: 'text-sky-400' },
          { label: 'Upcoming', val: stats.upcoming, cls: 'text-amber-400' },
          { label: 'Completed', val: stats.completed, cls: 'text-emerald-400' },
          { label: 'Trainees', val: stats.trainees, cls: 'text-[#FF5A1F]' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl border border-white/8 bg-card/40">
            <p className={`text-2xl font-bold ${s.cls}`}>{loading ? '—' : s.val}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by batch code or series…"
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF5A1F]/50"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={load} className="ml-auto text-xs text-red-400 underline">Retry</button>
        </div>
      )}

      {/* Batch list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="rounded-xl border border-white/8 bg-card/40 h-20 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">{search ? 'No batches match your search' : 'No batches assigned yet'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => (
            <BatchCard key={b.id} batch={b} onAttendanceChange={handleAttendance} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
