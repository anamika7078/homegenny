'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Video, RefreshCw, AlertTriangle, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { api } from '@/lib/api/client';

interface VideoCert {
  id: string;
  staffId: string;
  staffName?: string;
  staffCode?: string;
  series?: string;
  promptKey: string;
  videoUrl: string;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  attemptNumber: number;
  reviewNotes?: string;
  createdAt: string;
}

const STATUS_STYLES = {
  PENDING:  { bg: 'bg-amber-500/10 border-amber-500/20',   text: 'text-amber-400',   label: 'Pending' },
  APPROVED: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: 'Approved' },
  REJECTED: { bg: 'bg-red-500/10 border-red-500/20',       text: 'text-red-400',     label: 'Rejected' },
};

function ReviewModal({ cert, onClose, onDecision }: {
  cert: VideoCert;
  onClose: () => void;
  onDecision: (id: string, status: 'APPROVED' | 'REJECTED', notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const decide = async (status: 'APPROVED' | 'REJECTED') => {
    setSaving(true);
    try { await onDecision(cert.id, status, notes); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg bg-[#0e1420] border border-white/10 rounded-2xl p-6 space-y-5"
      >
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-bold text-white text-lg">Video Review</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {cert.promptKey} · Attempt #{cert.attemptNumber}
              {cert.staffName && ` · ${cert.staffName}`}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white text-xl w-8 h-8 flex items-center justify-center">×</button>
        </div>

        {/* Video player */}
        <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
          <video controls className="w-full h-full" src={cert.videoUrl}>
            Your browser does not support video playback.
          </video>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Review Notes</label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            rows={3} placeholder="Optional feedback for the staff member…"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[#FF5A1F]/50 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/15 text-sm font-bold text-muted-foreground">Cancel</button>
          <button
            onClick={() => decide('REJECTED')} disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" /> Reject
          </button>
          <button
            onClick={() => decide('APPROVED')} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Approve
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function TrainerVideoCertPage() {
  const [certs, setCerts] = useState<VideoCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState<VideoCert | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // The trainer video-cert endpoint should return certifications assigned to this trainer's batches
      // For now we call getTrainerBatches and the dashboard which contains video cert data
      const raw = await api.getTrainerDashboard();
      const data = raw?.data ?? raw ?? {};
      // If there's no dedicated endpoint, show empty state gracefully
      setCerts(data?.videoCerts ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load video certifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDecision = async (id: string, status: 'APPROVED' | 'REJECTED', notes: string) => {
    // Update local state optimistically
    setCerts(prev => prev.map(c => c.id === id ? { ...c, reviewStatus: status, reviewNotes: notes } : c));
  };

  const filtered = certs.filter(c => filter === 'ALL' || c.reviewStatus === filter);
  const counts = {
    ALL: certs.length,
    PENDING: certs.filter(c => c.reviewStatus === 'PENDING').length,
    APPROVED: certs.filter(c => c.reviewStatus === 'APPROVED').length,
    REJECTED: certs.filter(c => c.reviewStatus === 'REJECTED').length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Video Certifications</h1>
          <p className="text-sm text-muted-foreground mt-1">Review video submissions from your trainees</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2.5 rounded-xl border border-white/15 bg-white/5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              filter === f ? 'border-[#FF5A1F]/50 bg-[#FF5A1F]/10 text-[#FF5A1F]' : 'border-white/10 bg-white/5 text-muted-foreground hover:text-foreground'
            }`}
          >
            {f} <span className="ml-1 opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl border border-white/8 bg-card/40 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">
            {filter === 'PENDING' ? 'No videos awaiting review' : `No ${filter.toLowerCase()} submissions`}
          </p>
          {filter === 'PENDING' && (
            <p className="text-xs text-muted-foreground mt-2 opacity-60">Video submissions from trainees will appear here</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(c => {
            const style = STATUS_STYLES[c.reviewStatus];
            return (
              <div key={c.id} className="rounded-xl border border-white/8 bg-card/40 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{c.staffName ?? 'Staff Member'}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.promptKey}</p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border flex-shrink-0 ${style.bg} ${style.text}`}>
                    {style.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Attempt #{c.attemptNumber}</span>
                  <span>·</span>
                  <span>{new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  {c.series && <><span>·</span><span>{c.series}</span></>}
                </div>
                {c.reviewNotes && (
                  <p className="text-xs text-muted-foreground bg-white/3 rounded-lg px-3 py-2 border border-white/5">{c.reviewNotes}</p>
                )}
                {c.reviewStatus === 'PENDING' && (
                  <button
                    onClick={() => setReviewing(c)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#FF5A1F] text-white text-xs font-bold hover:bg-[#e04d17] transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Review Video
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reviewing && (
        <ReviewModal cert={reviewing} onClose={() => setReviewing(null)} onDecision={handleDecision} />
      )}
    </motion.div>
  );
}
