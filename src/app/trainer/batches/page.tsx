'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Users, Calendar, ChevronDown,
  RefreshCw, AlertTriangle, Check, X, Search,
  Plus, ChevronRight,
  Loader2, BadgeCheck, ArrowRight, BookOpen,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth.store';

// ── Types ──────────────────────────────────────────────────────────────────
type Series = 'DR' | 'SC' | 'UC' | 'M3X' | 'MAID';
type BatchStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

interface Enrollment {
  id: string; staffId: string; staffCode: string; fullName: string;
  mobile?: string; department?: string; designation?: string;
}
interface Batch {
  id: string; batchCode: string; series: Series; trainerName: string;
  classroom: string; startDate: string; endDate: string; quizDate: string | null;
  status: BatchStatus; createdAt?: string;
  enrollments: Enrollment[];
}

/** Hours left in the 24h window a batch accepts new trainees for (backend-enforced; this only previews it). */
function enrollmentHoursLeft(createdAt?: string): number | null {
  if (!createdAt) return null;
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / (60 * 60 * 1000);
  return Math.max(0, Math.ceil(24 - ageHours));
}

// Was sourced from GET /employees (internal HR staff). That can never
// actually be enrolled — batch_enrollments.staff_id FKs to staff_applicants,
// not employees, so every enroll attempt against an HR employee id 500s.
// Trainees are real S1-S5 pipeline candidates, so this now sources from
// GET /staff?stage=S3_TRAIN instead (StaffApplicant, not Employee).
interface DropdownTrainee {
  id: string;
  staffCode: string;
  fullName: string;
  mobile?: string;
  series?: string;
  branchId?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────
const SERIES_CLR: Record<string, string> = {
  DR:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
  SC:   'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  UC:   'bg-sky-500/10 border-sky-500/20 text-sky-400',
  M3X:  'bg-violet-500/10 border-violet-500/20 text-violet-400',
  MAID: 'bg-pink-500/10 border-pink-500/20 text-pink-400',
};
const STATUS_CLR: Record<BatchStatus, string> = {
  UPCOMING:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  ACTIVE:    'bg-sky-500/15 text-sky-400 border-sky-500/30',
  COMPLETED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};
const SERIES_OPTIONS: { value: Series; label: string }[] = [
  { value: 'DR',   label: 'Driver (DR)' },
  { value: 'SC',   label: 'Skilled Care (SC)' },
  { value: 'UC',   label: 'Unskilled Care (UC)' },
  { value: 'M3X',  label: 'Maid M3X (M3X)' },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

// ── Enroll Trainee Modal ──────────────────────────────────────────────────
function EnrollTraineeModal({ batch, onClose, onEnrolled }: {
  batch: Batch;
  onClose: () => void;
  onEnrolled: (batchId: string, trainee: DropdownTrainee) => void;
}) {
  const [search, setSearch] = useState('');
  const [trainees, setTrainees] = useState<DropdownTrainee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<DropdownTrainee | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    api.listStaff({ stage: 'S3_TRAIN', limit: 200 })
      .then((res: any) => {
        const items = res?.data?.items ?? res?.items ?? res?.data ?? res ?? [];
        const list = (Array.isArray(items) ? items : [])
          // findAll() also merges in internal HR employees regardless of the
          // stage filter — only real S3_TRAIN pipeline candidates belong here.
          .filter((r: any) => r.pipeline_stage === 'S3_TRAIN' && r.source !== 'HR_EMPLOYEE')
          .map((r: any): DropdownTrainee => ({
            id: r.id,
            staffCode: r.staff_code,
            fullName: r.full_name,
            mobile: r.mobile,
            series: r.series,
            branchId: r.branch_id,
          }));
        setTrainees(list);
      })
      .catch((e: any) => setError(e.message ?? 'Failed to load trainees'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = trainees.filter(t => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (t.fullName ?? '').toLowerCase().includes(s) ||
           (t.staffCode ?? '').toLowerCase().includes(s) ||
           (t.series ?? '').toLowerCase().includes(s);
  });

  const handleEnroll = async () => {
    if (!selected) return;
    setSubmitting(true); setSubmitError('');
    try {
      await api.enrollInBatch(batch.id, selected.id);
      onEnrolled(batch.id, selected);
      onClose();
    } catch (e: any) {
      setSubmitError(e?.response?.data?.message ?? e.message ?? 'Failed to add trainee');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="w-full max-w-lg bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-foreground">Add Trainee</h2>
              <p className="text-[11px] text-muted-foreground">{batch.batchCode}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/8 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, staff code or series…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/40"
              autoFocus
            />
          </div>
        </div>

        {/* Trainee list */}
        <div className="px-5 py-3 max-h-72 overflow-y-auto space-y-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-xs">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading trainees…
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-400 text-xs">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No trainees at S3_TRAIN found</p>
          ) : (
            filtered.slice(0, 50).map(t => (
              <button
                key={t.id}
                onClick={() => setSelected(selected?.id === t.id ? null : t)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  selected?.id === t.id
                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                    : 'bg-white/3 border border-transparent hover:bg-white/6 hover:border-white/10'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-white/8 flex items-center justify-center text-[11px] font-bold text-foreground flex-shrink-0">
                  {getInitials(t.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{t.fullName}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {t.staffCode}{t.series ? ` · ${t.series}` : ''}
                  </p>
                </div>
                {selected?.id === t.id && (
                  <BadgeCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Selected preview + error */}
        {selected && (
          <div className="mx-5 mb-1 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-[11px] font-bold text-emerald-400 flex-shrink-0">
              {getInitials(selected.fullName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{selected.fullName}</p>
              <p className="text-[11px] text-muted-foreground font-mono">{selected.staffCode}</p>
            </div>
            <span className="text-[10px] font-bold text-emerald-400">Selected</span>
          </div>
        )}
        {submitError && (
          <div className="mx-5 mb-1 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {submitError}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/8">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-white/12 text-muted-foreground hover:text-foreground transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleEnroll}
            disabled={!selected || submitting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding…</> : <><Check className="w-3.5 h-3.5" /> Add to Batch</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Batch Card ─────────────────────────────────────────────────────────────
function BatchCard({ batch, onScheduleChange, onStatusChange, onDelete, onTraineeAdded }: {
  batch: Batch;
  onScheduleChange: (batchId: string, body: { end_date?: string; quiz_date?: string }) => Promise<void>;
  onStatusChange: (batchId: string, status: string) => Promise<void>;
  onDelete: (batchId: string) => Promise<void>;
  onTraineeAdded: (batchId: string, trainee: DropdownTrainee) => void;
}) {
  const [open, setOpen] = useState(batch.status === 'ACTIVE');
  const [statusLoading, setStatusLoading] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [endDateDraft, setEndDateDraft] = useState(batch.endDate?.slice(0, 10) ?? '');
  const [quizDateDraft, setQuizDateDraft] = useState(batch.quizDate?.slice(0, 10) ?? '');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const hoursLeft = enrollmentHoursLeft(batch.createdAt);
  const router = useRouter();

  const advanceStatus = async () => {
    const next = batch.status === 'UPCOMING' ? 'ACTIVE' : 'COMPLETED';
    setStatusLoading(true);
    try { await onStatusChange(batch.id, next); } finally { setStatusLoading(false); }
  };

  const saveSchedule = async () => {
    setScheduleSaving(true); setScheduleError('');
    try {
      await onScheduleChange(batch.id, { end_date: endDateDraft, quiz_date: quizDateDraft || undefined });
      setEditingSchedule(false);
    } catch (e: any) {
      setScheduleError(e?.response?.data?.message ?? e.message ?? 'Failed to update schedule');
    } finally {
      setScheduleSaving(false);
    }
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
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(batch.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              {' – '}
              {batch.endDate ? new Date(batch.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
            </span>
            {batch.trainerName && <span>Trainer: {batch.trainerName}</span>}
            {batch.classroom && <span>Room: {batch.classroom}</span>}
            {hoursLeft !== null && (
              <span className={hoursLeft > 0 ? 'text-emerald-400' : 'text-muted-foreground/60'}>
                {hoursLeft > 0 ? `Enrollment open · ${hoursLeft}h left` : 'Enrollment closed'}
              </span>
            )}
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
              {/* Schedule — start/end/quiz dates, editable */}
              <div className="rounded-lg border border-white/8 bg-white/3 p-3">
                {!editingSchedule ? (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-muted-foreground">Quiz date: <span className="font-semibold text-foreground">{batch.quizDate ? new Date(batch.quizDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}</span></span>
                    </div>
                    <button
                      onClick={() => setEditingSchedule(true)}
                      className="text-[11px] font-semibold text-[#FF5A1F] hover:underline"
                    >
                      Edit dates
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">End Date</label>
                        <input
                          type="date" value={endDateDraft} onChange={e => setEndDateDraft(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-[#FF5A1F]/50 [color-scheme:dark]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground">Quiz Date</label>
                        <input
                          type="date" value={quizDateDraft} onChange={e => setQuizDateDraft(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-[#FF5A1F]/50 [color-scheme:dark]"
                        />
                      </div>
                    </div>
                    {scheduleError && <p className="text-[11px] text-red-400">{scheduleError}</p>}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={saveSchedule} disabled={scheduleSaving || !endDateDraft}
                        className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-[#FF5A1F] text-white hover:bg-[#e04d17] disabled:opacity-50"
                      >
                        {scheduleSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                      </button>
                      <button
                        onClick={() => { setEditingSchedule(false); setScheduleError(''); }}
                        className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Enrolled trainees */}
              <div className="space-y-1.5">
                {batch.enrollments.map(t => (
                  <div key={t.staffId} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/3">
                    <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center text-[10px] font-bold text-foreground flex-shrink-0">
                      {getInitials(t.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{t.fullName}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{t.staffCode}</p>
                    </div>
                  </div>
                ))}
                {batch.enrollments.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">No trainees enrolled yet</p>
                )}
              </div>

              <div className="flex gap-2 flex-wrap items-center">
                {batch.status !== 'COMPLETED' && (
                  <>
                    <button
                      onClick={advanceStatus} disabled={statusLoading}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#FF5A1F] text-white hover:bg-[#e04d17] transition-colors disabled:opacity-50"
                    >
                      {statusLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      {batch.status === 'UPCOMING' ? 'Start Batch' : 'Mark Complete'}
                    </button>
                    <button
                      onClick={() => setShowEnrollModal(true)}
                      disabled={hoursLeft === 0}
                      title={hoursLeft === 0 ? 'Enrollment window closed — create a new batch instead' : undefined}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Trainee
                    </button>
                  </>
                )}
                <button
                  onClick={() => router.push(`/trainer/batches/${batch.id}`)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Manage Material &amp; Quiz
                </button>

                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete this batch?')) {
                      await onDelete(batch.id);
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors ml-auto"
                >
                  <X className="w-3 h-3" /> Delete Batch
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enroll Trainee Modal */}
      <AnimatePresence>
        {showEnrollModal && (
          <EnrollTraineeModal
            batch={batch}
            onClose={() => setShowEnrollModal(false)}
            onEnrolled={(batchId, emp) => { onTraineeAdded(batchId, emp); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Add Batch Modal ─────────────────────────────────────────────────────────
function AddBatchModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (batch: Batch) => void;
}) {
  // Step: 'form' → fill batch details + pick trainer, 'confirm' → review before submit
  const [step, setStep] = useState<'form' | 'confirm'>('form');

  // Batch form fields
  // Hardcoded series to 'DR' as it is required by backend but hidden from UI
  const series: Series = 'DR';
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');
  const [quizDate, setQuizDate]     = useState('');
  const [classroom, setClassroom]   = useState('');

  // The trainer creating this batch IS the trainer — there's no one else to
  // pick. This used to be a searchable "Assign Trainer" step against the HR
  // employee list, which meant the trainer had to find and select themselves
  // before they could create their own batch.
  const currentUser = useAuthStore((s) => s.user);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // ── Submit create batch ────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const result: any = await api.createTrainingBatch({
        series,
        start_date: startDate || new Date().toISOString().split('T')[0],
        end_date: endDate,
        quiz_date: quizDate || undefined,
        classroom: classroom || null,
        trainer_id: currentUser?.id,
        trainer_name: currentUser?.full_name,
      });

      const batchData = result?.batch ?? result?.data ?? result;
      batchData.enrollments = batchData.enrollments ?? [];

      onCreated(batchData as Batch);
      onClose();
    } catch (err: any) {
      setSubmitError(err.message ?? 'Failed to create batch');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = series && startDate && endDate && endDate >= startDate;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.22 }}
          className="w-full max-w-xl bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FF5A1F]/15 border border-[#FF5A1F]/25 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-[#FF5A1F]" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-foreground">Create New Batch</h2>
                <p className="text-[11px] text-muted-foreground">
                  {step === 'form' ? 'Fill in batch details' : 'Review before confirming'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-0 px-6 pt-4">
            {['Batch Details', 'Confirm'].map((label, i) => (
              <div key={label} className="flex items-center flex-1">
                <div className={`flex items-center gap-1.5 ${
                  (step === 'form' && i <= 0) || (step === 'confirm' && i <= 1)
                    ? 'text-[#FF5A1F]' : 'text-muted-foreground'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                    (step === 'form' && i <= 0) || (step === 'confirm' && i <= 1)
                      ? 'bg-[#FF5A1F]/15 border-[#FF5A1F]/30 text-[#FF5A1F]'
                      : 'border-white/15 text-muted-foreground'
                  }`}>{i + 1}</div>
                  <span className="text-[10px] font-semibold hidden sm:block">{label}</span>
                </div>
                {i < 1 && <ChevronRight className="w-3 h-3 text-white/20 mx-1 flex-shrink-0" />}
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">

            {step === 'form' && (
              <>
                {/* ── Batch Details ─────────────────────────── */}
                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#FF5A1F]">Batch Details</p>
                  <p className="text-xs text-muted-foreground">
                    Trainer: <span className="font-semibold text-foreground">{currentUser?.full_name ?? 'You'}</span>
                  </p>

                  {/* Start / End Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Start Date *</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#FF5A1F]/50 [color-scheme:dark]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">End Date *</label>
                      <input
                        type="date"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#FF5A1F]/50 [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* Quiz Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Quiz Date (optional)</label>
                    <input
                      type="date"
                      value={quizDate}
                      onChange={e => setQuizDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#FF5A1F]/50 [color-scheme:dark]"
                    />
                  </div>

                  {/* Classroom */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Classroom / Room (optional)</label>
                    <input
                      type="text"
                      value={classroom}
                      onChange={e => setClassroom(e.target.value)}
                      placeholder="e.g. Classroom A"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF5A1F]/50"
                    />
                  </div>
                </div>
              </>
            )}

            {step === 'confirm' && (
              <div className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Review Batch</p>

                {/* Summary */}
                <div className="rounded-xl border border-white/10 bg-white/3 divide-y divide-white/6">
                  {[
                    { label: 'Trainer', value: currentUser?.full_name ?? 'You' },
                    { label: 'Start Date', value: startDate ? new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                    { label: 'End Date', value: endDate ? new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                    { label: 'Quiz Date', value: quizDate ? new Date(quizDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set yet' },
                    { label: 'Classroom', value: classroom || 'Not specified' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-muted-foreground">{row.label}</span>
                      <span className="text-xs font-semibold text-foreground">{row.value}</span>
                    </div>
                  ))}
                </div>

                {submitError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {submitError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/8">
            <button
              onClick={() => step === 'confirm' ? setStep('form') : onClose()}
              className="px-5 py-2 rounded-xl text-xs font-bold border border-white/12 text-muted-foreground hover:text-foreground hover:border-white/20 transition-all"
            >
              {step === 'confirm' ? 'Back' : 'Cancel'}
            </button>

            {step === 'form' ? (
              <button
                onClick={() => setStep('confirm')}
                disabled={!canProceed}
                className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold bg-[#FF5A1F] text-white hover:bg-[#e04d17] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Review <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold bg-[#FF5A1F] text-white hover:bg-[#e04d17] transition-colors disabled:opacity-50"
              >
                {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : <><Check className="w-3.5 h-3.5" /> Create Batch</>}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function TrainerBatchesPage() {
  const [batches, setBatches]   = useState<Batch[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

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

  const handleScheduleChange = async (batchId: string, body: { end_date?: string; quiz_date?: string }) => {
    await api.updateBatchSchedule(batchId, body);
    setBatches(prev => prev.map(b => b.id === batchId
      ? { ...b, endDate: body.end_date ?? b.endDate, quizDate: body.quiz_date ?? b.quizDate }
      : b));
  };

  const handleStatusChange = async (batchId: string, status: string) => {
    await api.updateBatchStatus(batchId, status);
    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, status: status as BatchStatus } : b));
  };

  const handleBatchCreated = (batch: Batch) => {
    setBatches(prev => [batch, ...prev]);
  };

  const handleDelete = async (batchId: string) => {
    try {
      await api.deleteTrainingBatch(batchId);
      setBatches(prev => prev.filter(b => b.id !== batchId));
    } catch (e: any) {
      setError(e.message ?? 'Failed to delete batch');
    }
  };

  const handleTraineeAdded = (batchId: string, trainee: DropdownTrainee) => {
    setBatches(prev => prev.map(b => {
      if (b.id !== batchId) return b;
      const newEnrollment: Enrollment = {
        id: crypto.randomUUID(),
        staffId: trainee.id,
        staffCode: trainee.staffCode,
        fullName: trainee.fullName,
        mobile: trainee.mobile,
      };
      return { ...b, enrollments: [...b.enrollments, newEnrollment] };
    }));
  };

  const filtered = batches.filter(b =>
    !search || b.batchCode.toLowerCase().includes(search.toLowerCase()) || b.series.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    active:    batches.filter(b => b.status === 'ACTIVE').length,
    upcoming:  batches.filter(b => b.status === 'UPCOMING').length,
    completed: batches.filter(b => b.status === 'COMPLETED').length,
    trainees:  batches.reduce((sum, b) => sum + b.enrollments.length, 0),
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page-padding max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Batch Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Your assigned training batches</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Add Batch Button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5A1F] text-white text-xs font-bold shadow-lg shadow-[#FF5A1F]/20 hover:bg-[#e04d17] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Batch</span>
            </motion.button>
            <button
              onClick={load}
              disabled={loading}
              className="p-2.5 rounded-xl border border-white/15 bg-white/5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Active',    val: stats.active,    cls: 'text-sky-400' },
            { label: 'Upcoming',  val: stats.upcoming,  cls: 'text-amber-400' },
            { label: 'Completed', val: stats.completed, cls: 'text-emerald-400' },
            { label: 'Trainees',  val: stats.trainees,  cls: 'text-[#FF5A1F]' },
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
            {!search && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF5A1F]/15 border border-[#FF5A1F]/25 text-[#FF5A1F] text-xs font-bold mx-auto hover:bg-[#FF5A1F]/20 transition-colors"
              >
                <Plus className="w-4 h-4" /> Create your first batch
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(b => (
              <BatchCard key={b.id} batch={b} onScheduleChange={handleScheduleChange} onStatusChange={handleStatusChange} onDelete={handleDelete} onTraineeAdded={handleTraineeAdded} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Add Batch Modal */}
      {showAddModal && (
        <AddBatchModal
          onClose={() => setShowAddModal(false)}
          onCreated={handleBatchCreated}
        />
      )}
    </>
  );
}
