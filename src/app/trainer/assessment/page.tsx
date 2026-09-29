'use client';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertTriangle, CalendarClock, ClipboardCheck, RefreshCw, Search, X } from 'lucide-react';
import { api } from '@/lib/api/client';
import { QuizReviewModal } from '@/components/training/quiz-review-modal';
import { QuizRescheduleModal } from '@/components/training/quiz-reschedule-modal';
import {
  SubmissionBadge, SubmissionState, SUBMISSION_LABEL, errorMessage, formatDateTime,
} from '@/components/training/quiz-ui';

interface SubmissionRow {
  quizId: string;
  quizTitle: string;
  batchId: string;
  batchCode: string;
  staffId: string;
  staffName: string;
  staffCode: string;
  series: string;
  state: SubmissionState;
  latestAttemptId: string | null;
  score: number | null;
  maxScore: number;
  passMarks: number;
  submittedAt: string | null;
  availableAt: string | null;
  attempts: { attemptId: string; attemptNumber: number; status: string }[];
}

const FILTERS: (SubmissionState | 'ALL')[] = ['PENDING_REVIEW', 'FAILED', 'NOT_ATTEMPTED', 'SCHEDULED', 'IN_PROGRESS', 'PASSED', 'ALL'];

function AssessmentInner() {
  const params = useSearchParams();
  const quizFilter = params.get('quiz_id');

  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stateFilter, setStateFilter] = useState<SubmissionState | 'ALL'>('PENDING_REVIEW');
  const [batchFilter, setBatchFilter] = useState('');
  const [search, setSearch] = useState('');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<SubmissionRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res: any = await api.listQuizSubmissions(quizFilter ? { quiz_id: quizFilter } : {});
      setRows(res.rows ?? []);
    } catch (e: any) {
      setError(errorMessage(e, 'Failed to load submissions'));
    } finally {
      setLoading(false);
    }
  }, [quizFilter]);

  useEffect(() => { load(); }, [load]);

  // Opening from a quiz link: show everyone for that quiz, not just pending.
  useEffect(() => { if (quizFilter) setStateFilter('ALL'); }, [quizFilter]);

  const batches = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.batchId, r.batchCode));
    return [...m.entries()];
  }, [rows]);

  const scoped = rows.filter((r) => !batchFilter || r.batchId === batchFilter);
  const scopedCounts = useMemo(() => {
    const c: Record<string, number> = {};
    scoped.forEach((r) => { c[r.state] = (c[r.state] ?? 0) + 1; });
    return c;
  }, [scoped]);
  const q = search.trim().toLowerCase();
  const visible = scoped.filter((r) =>
    (stateFilter === 'ALL' || r.state === stateFilter) &&
    (!q || r.staffName?.toLowerCase().includes(q) || r.staffCode?.toLowerCase().includes(q) || r.quizTitle.toLowerCase().includes(q)),
  );

  const canReschedule = (s: SubmissionState) => s === 'FAILED' || s === 'NOT_ATTEMPTED' || s === 'SCHEDULED';
  const canOpen = (r: SubmissionRow) => r.latestAttemptId && (r.state === 'PENDING_REVIEW' || r.state === 'PASSED' || r.state === 'FAILED');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page-padding max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Assessments</h1>
          <p className="text-sm text-muted-foreground mt-1">Staff ke quiz answers check karein, marks dekhein, aur fail hone par quiz reschedule karein</p>
        </div>
        <button onClick={load} disabled={loading} aria-label="Refresh" className="p-2.5 rounded-xl border border-white/15 bg-white/5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {quizFilter && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Showing one quiz{rows[0] ? `: ${rows[0].quizTitle}` : ''}</span>
          <a href="/trainer/assessment" className="flex items-center gap-1 text-[#FF5A1F] hover:underline"><X className="w-3 h-3" /> Clear</a>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['PENDING_REVIEW', 'FAILED', 'NOT_ATTEMPTED', 'PASSED'] as SubmissionState[]).map((s) => (
          <button
            key={s}
            onClick={() => setStateFilter(s)}
            className={`text-left p-4 rounded-xl border transition-colors ${stateFilter === s ? 'border-[#FF5A1F]/40 bg-[#FF5A1F]/5' : 'border-white/8 bg-card/40 hover:border-white/20'}`}
          >
            <p className={`text-2xl font-bold ${s === 'PENDING_REVIEW' ? 'text-violet-300' : s === 'FAILED' ? 'text-red-400' : s === 'PASSED' ? 'text-emerald-400' : 'text-foreground'}`}>
              {loading ? '—' : scopedCounts[s] ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{SUBMISSION_LABEL[s]}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStateFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                stateFilter === f ? 'bg-[#FF5A1F] text-white border-[#FF5A1F]' : 'border-white/10 text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'ALL' ? `All (${scoped.length})` : `${SUBMISSION_LABEL[f]} (${scopedCounts[f] ?? 0})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {batches.length > 1 && (
            <select
              value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}
              className="bg-white/5 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-foreground"
            >
              <option value="">All batches</option>
              {batches.map(([id, code]) => <option key={id} value={id}>{code}</option>)}
            </select>
          )}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff / quiz"
              className="pl-8 pr-3 py-1.5 w-48 text-xs rounded-lg bg-white/5 border border-white/15 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF5A1F]/50"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl border border-white/8 bg-card/40 animate-pulse" />)}</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">
            {rows.length === 0 ? 'Abhi tak kisi batch me quiz nahi bani' : 'Is filter me koi staff nahi'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/8 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left font-semibold px-4 py-2.5">Staff</th>
                <th className="text-left font-semibold px-4 py-2.5">Quiz</th>
                <th className="text-left font-semibold px-4 py-2.5">Status</th>
                <th className="text-left font-semibold px-4 py-2.5">Marks</th>
                <th className="text-left font-semibold px-4 py-2.5">Attempts</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visible.map((r) => {
                const tries = r.attempts.filter((a) => a.status !== 'SCHEDULED').length;
                return (
                  <tr key={`${r.quizId}:${r.staffId}`} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{r.staffName}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{r.staffCode} · {r.series}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{r.quizTitle}</p>
                      <p className="text-[11px] text-muted-foreground">{r.batchCode}</p>
                    </td>
                    <td className="px-4 py-3">
                      <SubmissionBadge state={r.state} />
                      {r.state === 'SCHEDULED' && <p className="text-[11px] text-muted-foreground mt-1">Opens {formatDateTime(r.availableAt)}</p>}
                      {r.state === 'PENDING_REVIEW' && <p className="text-[11px] text-muted-foreground mt-1">Submitted {formatDateTime(r.submittedAt)}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {r.score != null ? (
                        <span className={`font-bold ${r.score >= r.passMarks ? 'text-emerald-400' : 'text-red-400'}`}>{r.score}/{r.maxScore}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      <p className="text-[11px] text-muted-foreground">Pass {r.passMarks}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{tries}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {canOpen(r) && (
                          <button
                            onClick={() => setReviewing(r.latestAttemptId)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              r.state === 'PENDING_REVIEW' ? 'bg-[#FF5A1F] text-white hover:bg-[#e04d17]' : 'border border-white/15 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {r.state === 'PENDING_REVIEW' ? 'Check' : 'View'}
                          </button>
                        )}
                        {canReschedule(r.state) && (
                          <button
                            onClick={() => setRescheduling(r)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                          >
                            <CalendarClock className="w-3.5 h-3.5" /> {r.state === 'SCHEDULED' ? 'Change' : 'Reschedule'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {reviewing && <QuizReviewModal attemptId={reviewing} onClose={() => setReviewing(null)} onDone={load} />}
      {rescheduling && (
        <QuizRescheduleModal
          quizId={rescheduling.quizId}
          staffId={rescheduling.staffId}
          staffName={rescheduling.staffName}
          quizTitle={rescheduling.quizTitle}
          onClose={() => setRescheduling(null)}
          onDone={load}
        />
      )}
    </motion.div>
  );
}

export default function TrainerAssessmentPage() {
  return (
    <Suspense fallback={null}>
      <AssessmentInner />
    </Suspense>
  );
}
