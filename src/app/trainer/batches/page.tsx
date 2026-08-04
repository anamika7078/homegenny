'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Users, Calendar, ChevronDown,
  RefreshCw, AlertTriangle, Check, X, Search,
  Plus, User, Building2, Phone, MapPin, ChevronRight,
  Loader2, Briefcase, BadgeCheck, ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────────────────────
type Series = 'DR' | 'SC' | 'UC' | 'M3X' | 'MAID';
type BatchStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

interface Enrollment {
  id: string; staffId: string; staffCode: string; fullName: string;
  mobile?: string; department?: string; designation?: string;
  attendance: number[];
}
interface Batch {
  id: string; batchCode: string; series: Series; trainerName: string;
  classroom: string; startDate: string; status: BatchStatus;
  enrollments: Enrollment[];
}

interface DropdownEmployee {
  id: string;
  employeeId: string;
  fullName: string;
  mobile?: string;
  department?: string;
  designation?: string;
  branchId?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────
const DAYS: Record<string, number> = { DR: 5, SC: 7, UC: 5, M3X: 3, MAID: 3 };
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

// ── Attendance Cell ────────────────────────────────────────────────────────
function AttendanceCell({ present, loading, onClick }: {
  present: boolean | null; loading: boolean; onClick: () => void;
}) {
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

// ── Enroll Trainee Modal ──────────────────────────────────────────────────
function EnrollTraineeModal({ batch, onClose, onEnrolled }: {
  batch: Batch;
  onClose: () => void;
  onEnrolled: (batchId: string, emp: DropdownEmployee) => void;
}) {
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState<DropdownEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<DropdownEmployee | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    api.listEmployees({ limit: 200 })
      .then((res: any) => {
        const items = res?.data?.items ?? res?.items ?? res?.data ?? res ?? [];
        setEmployees(Array.isArray(items) ? items : []);
      })
      .catch((e: any) => setError(e.message ?? 'Failed to load employees'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = employees.filter(e => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (e.fullName ?? '').toLowerCase().includes(s) ||
           (e.employeeId ?? '').toLowerCase().includes(s) ||
           (e.department ?? '').toLowerCase().includes(s);
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
              placeholder="Search by name, employee ID or department…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/40"
              autoFocus
            />
          </div>
        </div>

        {/* Employee list */}
        <div className="px-5 py-3 max-h-72 overflow-y-auto space-y-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-xs">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading HR employees…
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-400 text-xs">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No employees found</p>
          ) : (
            filtered.slice(0, 50).map(emp => (
              <button
                key={emp.id}
                onClick={() => setSelected(selected?.id === emp.id ? null : emp)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  selected?.id === emp.id
                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                    : 'bg-white/3 border border-transparent hover:bg-white/6 hover:border-white/10'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-white/8 flex items-center justify-center text-[11px] font-bold text-foreground flex-shrink-0">
                  {getInitials(emp.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{emp.fullName}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {emp.employeeId}{emp.department ? ` · ${emp.department}` : ''}
                  </p>
                </div>
                {selected?.id === emp.id && (
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
              <p className="text-[11px] text-muted-foreground font-mono">{selected.employeeId}</p>
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
function BatchCard({ batch, onAttendanceChange, onStatusChange, onDelete, onTraineeAdded }: {
  batch: Batch;
  onAttendanceChange: (batchId: string, staffId: string, day: number, attended: boolean) => Promise<void>;
  onStatusChange: (batchId: string, status: string) => Promise<void>;
  onDelete: (batchId: string) => Promise<void>;
  onTraineeAdded: (batchId: string, emp: DropdownEmployee) => void;
}) {
  const [open, setOpen] = useState(batch.status === 'ACTIVE');
  const [statusLoading, setStatusLoading] = useState(false);
  const [loadingCell, setLoadingCell] = useState<string | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
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
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Trainee
                    </button>
                  </>
                )}
                
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

// ── Employee Detail Card (inside modal) ─────────────────────────────────────
function EmployeeDetailCard({ emp }: { emp: DropdownEmployee }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
    >
      {/* Avatar + Name */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#FF5A1F]/15 border border-[#FF5A1F]/25 flex items-center justify-center text-[#FF5A1F] font-bold text-sm flex-shrink-0">
          {getInitials(emp.fullName)}
        </div>
        <div>
          <p className="font-bold text-foreground text-sm">{emp.fullName}</p>
          <p className="text-[11px] text-muted-foreground font-mono">Emp ID: {emp.employeeId}</p>
        </div>
        <span className="ml-auto text-[9px] font-bold uppercase border border-sky-500/30 bg-sky-500/10 text-sky-400 rounded-full px-2 py-0.5">
          {emp.department || 'Staff'}
        </span>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {emp.mobile && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{emp.mobile}</span>
          </div>
        )}
        {emp.designation && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Briefcase className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{emp.designation}</span>
          </div>
        )}
      </div>
    </motion.div>
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
  const [classroom, setClassroom]   = useState('');

  // Employee lookup for Trainer
  const [empSearch, setEmpSearch]     = useState('');
  const [unitIdSearch, setUnitIdSearch] = useState('');
  const [employees, setEmployees]     = useState<DropdownEmployee[]>([]);
  const [empLoading, setEmpLoading]   = useState(false);
  const [empError, setEmpError]       = useState('');
  const [selectedEmp, setSelectedEmp] = useState<DropdownEmployee | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // ── Load employees from HR module ──────────────────────────────────────
  useEffect(() => {
    setEmpLoading(true);
    setEmpError('');
    api.listEmployeesForDropdown()
      .then((res: any[]) => {
        setEmployees(res ?? []);
      })
      .catch((err: Error) => setEmpError(err.message ?? 'Failed to load employees'))
      .finally(() => setEmpLoading(false));
  }, []);

  // ── Close dropdown on outside click ───────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Filtered employees for dropdown ───────────────────────────────────
  const filtered = employees.filter(emp => {
    const nameMatch = !empSearch || (emp.fullName ?? '').toLowerCase().includes(empSearch.toLowerCase());
    const codeMatch = !unitIdSearch || 
      (emp.employeeId ?? '').toLowerCase().includes(unitIdSearch.toLowerCase()) ||
      (emp.branchId ?? '').toLowerCase().includes(unitIdSearch.toLowerCase());
    return nameMatch && codeMatch;
  });

  // ── Submit create batch ────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const result: any = await api.createTrainingBatch({
        series,
        start_date: startDate || new Date().toISOString().split('T')[0],
        classroom: classroom || null,
        ...(selectedEmp ? { trainer_id: selectedEmp.id, trainer_name: selectedEmp.fullName } : {}),
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

  const canProceed = series && startDate;

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
                  {step === 'form' ? 'Fill batch details & assign trainer' : 'Review before confirming'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-0 px-6 pt-4">
            {['Batch Details', 'Assign Trainer', 'Confirm'].map((label, i) => (
              <div key={label} className="flex items-center flex-1">
                <div className={`flex items-center gap-1.5 ${
                  (step === 'form' && i <= 1) || (step === 'confirm' && i <= 2)
                    ? 'text-[#FF5A1F]' : 'text-muted-foreground'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                    (step === 'form' && i <= 1) || (step === 'confirm' && i <= 2)
                      ? 'bg-[#FF5A1F]/15 border-[#FF5A1F]/30 text-[#FF5A1F]'
                      : 'border-white/15 text-muted-foreground'
                  }`}>{i + 1}</div>
                  <span className="text-[10px] font-semibold hidden sm:block">{label}</span>
                </div>
                {i < 2 && <ChevronRight className="w-3 h-3 text-white/20 mx-1 flex-shrink-0" />}
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">

            {step === 'form' && (
              <>
                {/* ── Employee Picker (Trainer) ───────────────────────── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#FF5A1F]">Assign Trainer (HR Employees)</p>
                    {selectedEmp && (
                      <button onClick={() => setSelectedEmp(null)} className="text-[10px] text-muted-foreground hover:text-foreground underline">
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Dual search: Emp ID + Name */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={unitIdSearch}
                        onChange={e => { setUnitIdSearch(e.target.value); setDropdownOpen(true); }}
                        onFocus={() => setDropdownOpen(true)}
                        placeholder="Emp ID"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF5A1F]/50"
                      />
                    </div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={empSearch}
                        onChange={e => { setEmpSearch(e.target.value); setDropdownOpen(true); }}
                        onFocus={() => setDropdownOpen(true)}
                        placeholder="Employee Name"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF5A1F]/50"
                      />
                    </div>
                  </div>

                  {/* Dropdown results */}
                  {dropdownOpen && (
                    <div ref={dropdownRef} className="relative">
                      <div className="absolute top-0 left-0 right-0 z-10 bg-[#0f1117] border border-white/12 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                        {empLoading ? (
                          <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-xs">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading employees…
                          </div>
                        ) : empError ? (
                          <div className="flex items-center gap-2 p-4 text-red-400 text-xs">
                            <AlertTriangle className="w-4 h-4" /> {empError}
                          </div>
                        ) : filtered.length === 0 ? (
                          <div className="py-6 text-center text-muted-foreground text-xs">No employees found</div>
                        ) : (
                          filtered.slice(0, 50).map(emp => (
                            <button
                              key={emp.id}
                              onClick={() => {
                                setSelectedEmp(emp);
                                setEmpSearch(emp.fullName);
                                setUnitIdSearch(emp.employeeId);
                                setDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/6 transition-colors border-b border-white/5 last:border-0 ${
                                selectedEmp?.id === emp.id ? 'bg-[#FF5A1F]/8' : ''
                              }`}
                            >
                              <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                {getInitials(emp.fullName)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{emp.fullName}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">ID: {emp.employeeId}</p>
                              </div>
                              <span className={`text-[8px] font-bold uppercase border border-white/10 text-muted-foreground rounded-full px-1.5 py-0.5 flex-shrink-0`}>
                                {emp.department || 'HR'}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                      {/* Spacer so the absolute dropdown doesn't overlap content below */}
                      <div className="h-48" />
                    </div>
                  )}

                  {/* Selected Employee Detail Card */}
                  {selectedEmp && !dropdownOpen && (
                    <EmployeeDetailCard emp={selectedEmp} />
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-white/8" />

                {/* ── Batch Details ─────────────────────────── */}
                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#FF5A1F]">Batch Details</p>

                  {/* Start Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Start Date *</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
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
                    { label: 'Start Date', value: startDate ? new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                    { label: 'Classroom', value: classroom || 'Not specified' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-muted-foreground">{row.label}</span>
                      <span className="text-xs font-semibold text-foreground">{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Trainer */}
                {selectedEmp ? (
                  <>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Trainer</p>
                    <EmployeeDetailCard emp={selectedEmp} />
                  </>
                ) : (
                  <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-xs text-muted-foreground">
                    No trainer assigned — you can assign one later.
                  </div>
                )}

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

  const handleTraineeAdded = (batchId: string, emp: DropdownEmployee) => {
    setBatches(prev => prev.map(b => {
      if (b.id !== batchId) return b;
      const newEnrollment: Enrollment = {
        id: crypto.randomUUID(),
        staffId: emp.id,
        staffCode: emp.employeeId,
        fullName: emp.fullName,
        mobile: emp.mobile,
        department: emp.department,
        designation: emp.designation,
        attendance: [],
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
            <p className="text-sm text-muted-foreground mt-1">Your assigned training batches · Live attendance</p>
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
              <BatchCard key={b.id} batch={b} onAttendanceChange={handleAttendance} onStatusChange={handleStatusChange} onDelete={handleDelete} onTraineeAdded={handleTraineeAdded} />
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
