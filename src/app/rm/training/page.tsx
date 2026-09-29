'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Users, Calendar, ChevronDown, Plus, RefreshCw, AlertTriangle, Check, X } from 'lucide-react';
import { api } from '@/lib/api/client';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';

type Series = 'DR' | 'SC' | 'UC' | 'M3X';
type BatchStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

interface Enrollment {
  id: string; staffId: string; staffCode: string; fullName: string;
  series: string;
}
interface Batch {
  id: string; batchCode: string; series: Series; trainerName: string;
  classroom: string; startDate: string; endDate: string; quizDate: string | null;
  status: BatchStatus; scenarioCode: string; createdAt?: string;
  enrollments: Enrollment[];
}

/** Hours left in the 24h window a batch accepts new trainees for (backend-enforced; this only previews it). */
function enrollmentHoursLeft(createdAt?: string): number | null {
  if (!createdAt) return null;
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (60 * 60 * 1000);
  return Math.max(0, Math.ceil(24 - ageHours));
}

const SERIES_CLR: Record<string, string> = {
  DR: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  SC: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  UC: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
  M3X: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
};
const STATUS_CLR: Record<BatchStatus, string> = {
  UPCOMING:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  ACTIVE:    'bg-sky-500/15 text-sky-400 border-sky-500/30',
  COMPLETED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

function TraineeList({ batch }: { batch: Batch }) {
  if (batch.enrollments.length === 0) {
    return <p className="py-4 text-center text-xs text-muted-foreground">No trainees enrolled yet</p>;
  }
  return (
    <div className="space-y-1.5">
      {batch.enrollments.map(t => (
        <div key={t.staffId} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/3 text-xs">
          <div>
            <p className="font-semibold text-foreground">{t.fullName}</p>
            <p className="text-muted-foreground font-mono">{t.staffCode}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function BatchCard({ batch, onStatusChange }: {
  batch: Batch;
  onStatusChange: (batchId: string, status: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(batch.status === 'ACTIVE');
  const [statusLoading, setStatusLoading] = useState(false);

  const advanceStatus = async () => {
    const next = batch.status === 'UPCOMING' ? 'ACTIVE' : 'COMPLETED';
    setStatusLoading(true);
    try { await onStatusChange(batch.id, next); } finally { setStatusLoading(false); }
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
            <span className="text-[10px] font-mono text-[#FF5A1F]">{batch.scenarioCode}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{batch.enrollments.length} trainees</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(batch.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              {' – '}
              {batch.endDate ? new Date(batch.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </span>
            {batch.quizDate && <span>Quiz: {new Date(batch.quizDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-0.5 ${STATUS_CLR[batch.status] ?? STATUS_CLR.UPCOMING}`}>
          {batch.status}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground ml-1 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden border-t border-white/6">
            <div className="px-5 py-4 space-y-4">
              <div className="flex gap-6 text-xs text-muted-foreground">
                {batch.trainerName && <span>Trainer: <strong className="text-foreground">{batch.trainerName}</strong></span>}
                {batch.classroom && <span>Room: <strong className="text-foreground">{batch.classroom}</strong></span>}
              </div>

              <TraineeList batch={batch} />

              <div className="flex gap-2 flex-wrap">
                {batch.status !== 'COMPLETED' && (
                  <button
                    onClick={advanceStatus}
                    disabled={statusLoading}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#FF5A1F] text-white hover:bg-[#e04d17] transition-colors disabled:opacity-50"
                  >
                    {statusLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {batch.status === 'UPCOMING' ? 'Start Batch' : 'Complete Batch'}
                  </button>
                )}
                <button className="px-4 py-2 text-xs font-bold rounded-lg border border-white/15 bg-white/5 text-foreground hover:bg-white/10 transition-colors">
                  Download Report
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NewBatchModal({ onClose, onCreate }: { onClose: () => void; onCreate: (body: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ series: 'DR', trainer_id: '', trainer_name: '', classroom: '', start_date: '', end_date: '', quiz_date: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await api.listEmployeesForDropdown();
        setEmployees(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error('Failed to load employees for trainer assignment', err);
      }
    }
    loadStaff();
  }, []);

  const submit = async () => {
    if (!form.start_date) { setError('Start date is required'); return; }
    if (!form.end_date) { setError('End date is required'); return; }
    if (form.end_date < form.start_date) { setError('End date can\'t be before start date'); return; }
    setLoading(true); setError('');
    try {
      await onCreate({ ...form, quiz_date: form.quiz_date || undefined });
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-[#0e1420] border border-white/10 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-bold text-white text-lg">Create Training Batch</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white text-xl">×</button>
        </div>
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Series *</label>
            <SelectMenu
              value={form.series}
              onValueChange={(v) => setForm((p) => ({ ...p, series: v }))}
              placeholder="Select series"
              className="bg-white/5 border-white/10"
            >
              {['DR', 'SC', 'UC', 'M3X'].map((s) => (
                <SelectMenuItem key={s} value={s}>
                  {s}
                </SelectMenuItem>
              ))}
            </SelectMenu>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Trainer *</label>
            <SelectMenu
              value={form.trainer_id}
              onValueChange={(v) => {
                const emp = employees.find(e => e.id === v);
                setForm(p => ({ ...p, trainer_id: v, trainer_name: emp?.fullName ?? '' }));
              }}
              placeholder="Select trainer"
              className="bg-white/5 border-white/10"
            >
              {employees.map(e => (
                <SelectMenuItem key={e.id} value={e.id}>
                  {e.fullName}
                </SelectMenuItem>
              ))}
            </SelectMenu>
          </div>
          {[
            { key: 'classroom', label: 'Classroom / Location', type: 'text' },
            { key: 'start_date', label: 'Start Date *', type: 'date' },
            { key: 'end_date', label: 'End Date *', type: 'date' },
            { key: 'quiz_date', label: 'Quiz Date (optional)', type: 'date' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[#FF5A1F]/50" />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/15 text-sm font-bold text-muted-foreground">Cancel</button>
          <button onClick={submit} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-[#FF5A1F] text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {loading ? 'Creating...' : 'Create Batch'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function TrainingPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stats, setStats] = useState({ active: 0, upcoming: 0, completed: 0, total: 0, totalTrainees: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [batchRes, statsRes] = await Promise.all([
        api.getTrainingBatches(),
        api.getTrainingStats(),
      ]);
      const bData = batchRes?.data ?? batchRes ?? [];
      const sData = statsRes?.data ?? statsRes ?? {};
      setBatches(Array.isArray(bData) ? bData : []);
      setStats(sData);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load training data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (body: Record<string, unknown>) => {
    await api.createTrainingBatch(body);
    await load();
  };

  const handleStatusChange = async (batchId: string, status: string) => {
    await api.updateBatchStatus(batchId, status);
    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, status: status as BatchStatus } : b));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page-padding max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Training Module</h1>
          <p className="text-sm text-muted-foreground mt-1">S3 · Batch management</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="p-2.5 rounded-xl border border-white/15 bg-white/5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5A1F] text-white text-sm font-bold hover:bg-[#e04d17] transition-colors">
            <Plus className="w-4 h-4" /> New Batch
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={load} className="ml-auto text-xs text-red-400 underline">Retry</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Active',    val: stats.active,        cls: 'text-sky-400' },
          { label: 'Upcoming',  val: stats.upcoming,      cls: 'text-amber-400' },
          { label: 'Completed', val: stats.completed,     cls: 'text-emerald-400' },
          { label: 'Total',     val: stats.total,         cls: 'text-foreground' },
          { label: 'Trainees',  val: stats.totalTrainees, cls: 'text-[#FF5A1F]' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl border border-white/8 bg-card/40">
            <p className={`text-2xl font-bold ${s.cls}`}>{loading ? '—' : s.val}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Batch cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-white/8 bg-card/40 h-20 animate-pulse" />
          ))}
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-16">
          <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">No training batches yet</p>
          <button onClick={() => setShowNew(true)} className="mt-4 text-sm text-[#FF5A1F] hover:underline">Create your first batch →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map(b => (
            <BatchCard key={b.id} batch={b} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}

      {showNew && <NewBatchModal onClose={() => setShowNew(false)} onCreate={handleCreate} />}
    </motion.div>
  );
}
