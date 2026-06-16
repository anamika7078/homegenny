'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileText, RefreshCw, AlertTriangle, Check, X, Star } from 'lucide-react';
import { api } from '@/lib/api/client';

interface Trainee {
  staffId: string;
  staffCode: string;
  fullName: string;
  series: string;
  batchCode: string;
  batchId: string;
  attendance: number[];
  assessment?: {
    score: number;
    result: 'PASS' | 'FAIL' | 'PARTIAL';
    remarks: string;
  };
}

const RESULT_CLR = {
  PASS: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  FAIL: 'bg-red-500/15 text-red-400 border border-red-500/30',
  PARTIAL: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
};

function ScoreSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Score</span>
        <span className={`font-bold ${value >= 70 ? 'text-emerald-400' : value >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{value}%</span>
      </div>
      <input
        type="range" min={0} max={100} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#FF5A1F] cursor-pointer"
      />
    </div>
  );
}

function AssessmentModal({ trainee, onClose, onSave }: {
  trainee: Trainee;
  onClose: () => void;
  onSave: (traineeId: string, data: { score: number; result: string; remarks: string }) => Promise<void>;
}) {
  const [score, setScore] = useState(trainee.assessment?.score ?? 75);
  const [result, setResult] = useState<'PASS' | 'FAIL' | 'PARTIAL'>(trainee.assessment?.result ?? 'PASS');
  const [remarks, setRemarks] = useState(trainee.assessment?.remarks ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Auto-set result from score
  useEffect(() => {
    if (score >= 70) setResult('PASS');
    else if (score >= 50) setResult('PARTIAL');
    else setResult('FAIL');
  }, [score]);

  const save = async () => {
    setSaving(true); setError('');
    try {
      await onSave(trainee.staffId, { score, result, remarks });
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-[#0e1420] border border-white/10 rounded-2xl p-6"
      >
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="font-bold text-white text-lg">Assessment</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{trainee.fullName} · {trainee.staffCode}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white text-xl w-8 h-8 flex items-center justify-center">×</button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-5">
          <ScoreSlider value={score} onChange={setScore} />

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Result</p>
            <div className="flex gap-2">
              {(['PASS', 'PARTIAL', 'FAIL'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setResult(r)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                    result === r ? RESULT_CLR[r] : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Remarks</label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              rows={3}
              placeholder="Optional feedback for the trainee…"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[#FF5A1F]/50 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/15 text-sm font-bold text-muted-foreground">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[#FF5A1F] text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save Assessment'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function TrainerAssessmentPage() {
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const raw = await api.getTrainerBatches();
      const batches = Array.isArray(raw?.data ?? raw) ? (raw?.data ?? raw) : [];
      // Flatten enrollments from all active/completed batches
      const list: Trainee[] = [];
      for (const b of batches) {
        for (const e of (b.enrollments ?? [])) {
          list.push({
            staffId: e.staffId,
            staffCode: e.staffCode,
            fullName: e.fullName,
            series: b.series,
            batchCode: b.batchCode,
            batchId: b.id,
            attendance: e.attendance ?? [],
          });
        }
      }
      setTrainees(list);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load trainees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveAssessment = async (traineeId: string, data: { score: number; result: string; remarks: string }) => {
    await api.updateTrainerAssessment(traineeId, data);
    setTrainees(prev => prev.map(t => t.staffId === traineeId
      ? { ...t, assessment: { score: data.score, result: data.result as any, remarks: data.remarks } }
      : t
    ));
  };

  const assessed = trainees.filter(t => t.assessment);
  const pending = trainees.filter(t => !t.assessment);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Assessments</h1>
          <p className="text-sm text-muted-foreground mt-1">Record skill scores and results for your trainees</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2.5 rounded-xl border border-white/15 bg-white/5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-white/8 bg-card/40">
          <p className="text-2xl font-bold text-foreground">{loading ? '—' : trainees.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Trainees</p>
        </div>
        <div className="p-4 rounded-xl border border-white/8 bg-card/40">
          <p className="text-2xl font-bold text-amber-400">{loading ? '—' : pending.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending Assessment</p>
        </div>
        <div className="p-4 rounded-xl border border-white/8 bg-card/40">
          <p className="text-2xl font-bold text-emerald-400">{loading ? '—' : assessed.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Assessed</p>
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
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl border border-white/8 bg-card/40 animate-pulse" />)}
        </div>
      ) : trainees.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">No trainees assigned yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {trainees.map(t => (
            <div key={t.staffId} className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-card/40 hover:border-white/20 transition-colors">
              <div className="w-10 h-10 rounded-full bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center text-sm font-bold text-[#FF5A1F] flex-shrink-0">
                {t.fullName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">{t.fullName}</p>
                <p className="text-xs text-muted-foreground">{t.staffCode} · {t.series} · {t.batchCode}</p>
              </div>
              {t.assessment ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{t.assessment.score}%</p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${RESULT_CLR[t.assessment.result]}`}>
                    {t.assessment.result}
                  </span>
                  <button
                    onClick={() => setSelectedTrainee(t)}
                    className="text-xs text-[#FF5A1F] hover:underline font-semibold"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedTrainee(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5A1F] text-white text-xs font-bold hover:bg-[#e04d17] transition-colors"
                >
                  <Star className="w-3 h-3" />
                  Assess
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedTrainee && (
        <AssessmentModal
          trainee={selectedTrainee}
          onClose={() => setSelectedTrainee(null)}
          onSave={handleSaveAssessment}
        />
      )}
    </motion.div>
  );
}
