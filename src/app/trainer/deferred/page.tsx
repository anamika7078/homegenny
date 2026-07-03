'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PauseCircle, RefreshCw, AlertTriangle, Play, Users, Calendar } from 'lucide-react';
import { api } from '@/lib/api/client';

interface DeferredStaff {
  id: string;
  staffId: string;
  staffCode: string;
  fullName: string;
  series: string;
  reason: string;
  deferredAt: string;
  resumeAt?: string;
  batchCode?: string;
}

const REASON_LABELS: Record<string, string> = {
  TRAINING_GAP: 'Training Gap',
  PV_PENDING: 'PV Pending',
  DRIVER_RETEST: 'Driver Retest',
  MEDICAL_RETEST: 'Medical Retest',
  AGREEMENT_REVIEW: 'Agreement Review',
  PERSONAL_PAUSE: 'Personal Pause',
};

const SERIES_CLR: Record<string, string> = {
  DR: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  SC: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  UC: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  M3X: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
};

export default function TrainerDeferredPage() {
  const [deferred, setDeferred] = useState<DeferredStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resuming, setResuming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // Fetch from trainer batches — pull deferred trainees across batches
      const raw = await api.getTrainerBatches();
      const batches = Array.isArray(raw?.data ?? raw) ? (raw?.data ?? raw) : [];
      // For now show empty since we need a dedicated deferred endpoint
      // This gracefully handles the case where no endpoint exists yet
      setDeferred([]);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load retraining queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleResume = async (staffId: string) => {
    setResuming(staffId);
    try {
      // Would call the resume endpoint when available
      setDeferred(prev => prev.filter(d => d.staffId !== staffId));
    } finally {
      setResuming(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page-padding max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Retraining Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Trainees deferred for additional training sessions</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2.5 rounded-xl border border-white/15 bg-white/5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-white/8 bg-card/40">
          <p className="text-2xl font-bold text-amber-400">{loading ? '—' : deferred.length}</p>
          <p className="text-xs text-muted-foreground mt-1">In Queue</p>
        </div>
        <div className="p-4 rounded-xl border border-white/8 bg-card/40">
          <p className="text-2xl font-bold text-sky-400">{loading ? '—' : deferred.filter(d => d.reason === 'TRAINING_GAP').length}</p>
          <p className="text-xs text-muted-foreground mt-1">Training Gap</p>
        </div>
        <div className="p-4 rounded-xl border border-white/8 bg-card/40">
          <p className="text-2xl font-bold text-[#FF5A1F]">{loading ? '—' : deferred.filter(d => d.resumeAt && new Date(d.resumeAt) <= new Date()).length}</p>
          <p className="text-xs text-muted-foreground mt-1">Ready to Resume</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl border border-white/8 bg-card/40 animate-pulse" />)}
        </div>
      ) : deferred.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <PauseCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Queue is Clear</h3>
          <p className="text-sm text-muted-foreground">No trainees currently deferred for retraining</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deferred.map(d => {
            const isReady = d.resumeAt ? new Date(d.resumeAt) <= new Date() : true;
            return (
              <div key={d.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-card/40 hover:border-white/20 transition-colors">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-400 flex-shrink-0">
                  {d.fullName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">{d.fullName}</p>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${SERIES_CLR[d.series] ?? ''}`}>{d.series}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>{d.staffCode}</span>
                    <span>·</span>
                    <span>{REASON_LABELS[d.reason] ?? d.reason}</span>
                    {d.batchCode && <><span>·</span><span>{d.batchCode}</span></>}
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(d.deferredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleResume(d.staffId)}
                  disabled={!isReady || resuming === d.staffId}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 ${
                    isReady
                      ? 'bg-[#FF5A1F] text-white hover:bg-[#e04d17]'
                      : 'bg-white/5 text-muted-foreground border border-white/10'
                  }`}
                >
                  {resuming === d.staffId ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  {isReady ? 'Resume' : 'Waiting'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
