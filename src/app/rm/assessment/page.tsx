'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, CheckCircle2, XCircle, Clock, AlertTriangle, ChevronDown, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api/client';

// ── Types ────────────────────────────────────────────────────────────────────
type AttemptResult = 'pass' | 'fail' | null;
type VehicleClass = 'LMV' | 'HMV' | 'MCWG' | 'TRANS';

interface Driver {
  id: string;
  code: string;
  name: string;
  phone: string;
  dl: string;
  vehicleClasses: VehicleClass[];
  attempts: AttemptResult[];
  scenario: string;
  status: 'pending' | 'in_progress' | 'passed' | 'deferred' | 'terminal';
  nextRetry?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
}

// ── Static Data & Rules ───────────────────────────────────────────────────────
const CHECKLIST: ChecklistItem[] = [
  { id: 'parking',   label: 'Parking',           description: 'Parallel, reverse & bay parking within markings' },
  { id: 'lane',      label: 'Lane Discipline',   description: 'Proper lane usage, no unnecessary lane changes' },
  { id: 'gps',       label: 'GPS Usage',         description: 'Able to follow GPS navigation without assistance' },
  { id: 'estop',     label: 'Emergency Stop',    description: 'Smooth, controlled emergency braking' },
  { id: 'traffic',   label: 'Traffic Handling',  description: 'Roundabouts, signals, and pedestrian crossings' },
  { id: 'behaviour', label: 'Client Behaviour',  description: 'Courtesy, composure, no phone use while driving' },
];

const VEHICLE_MATRIX: Record<VehicleClass, { label: string; icon: string; color: string }> = {
  LMV:   { label: 'Light Motor Vehicle',  icon: '🚗', color: 'bg-sky-500/10 border-sky-500/20 text-sky-400' },
  HMV:   { label: 'Heavy Motor Vehicle',  icon: '🚛', color: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
  MCWG:  { label: 'Motorcycle w/ Gear',   icon: '🏍️', color: 'bg-violet-500/10 border-violet-500/20 text-violet-400' },
  TRANS: { label: 'Transport Vehicle',    icon: '🚐', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
};

const STATUS_STYLE: Record<Driver['status'], { label: string; cls: string; icon: string }> = {
  pending:     { label: 'Pending',     cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',   icon: '⏳' },
  in_progress: { label: 'In Progress', cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30',         icon: '🔵' },
  passed:      { label: 'Passed',      cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: '✅' },
  deferred:    { label: 'Deferred',    cls: 'bg-violet-500/15 text-violet-400 border-violet-500/30', icon: '⏸️' },
  terminal:    { label: 'Terminal',    cls: 'bg-red-500/15 text-red-400 border-red-500/30',          icon: '🚫' },
};

function mapItemToDriver(item: any): Driver {
  const meta = item.metadata ?? {};
  const stageRaw = String(item.pipeline_stage || item.status || 'pending').toLowerCase();

  let status: Driver['status'] = 'pending';
  if (['passed', 's3_training', 'confirmed', 'active'].includes(stageRaw)) {
    status = 'passed';
  } else if (['deferred', 'dr-07', 'dr-08'].includes(stageRaw)) {
    status = 'deferred';
  } else if (['terminal', 'dr-09', 'failed', 'denied'].includes(stageRaw)) {
    status = 'terminal';
  } else if (['in_progress', 's2.5', 's2_assessment'].includes(stageRaw)) {
    status = 'in_progress';
  } else {
    status = 'pending';
  }

  const rawAttempts = Array.isArray(meta.attempts) ? meta.attempts : [];
  const attempts: AttemptResult[] = [
    rawAttempts[0] ?? null,
    rawAttempts[1] ?? null,
    rawAttempts[2] ?? null,
  ];

  const vehicleClasses: VehicleClass[] = Array.isArray(meta.vehicleClasses) && meta.vehicleClasses.length
    ? meta.vehicleClasses
    : ['LMV'];

  return {
    id: item.id,
    code: item.staff_code || item.employeeId || item.employee_id || item.id?.slice(0, 8),
    name: item.full_name || item.fullName || 'Driver Staff',
    phone: item.mobile || 'N/A',
    dl: item.dl_number || meta.dl_number || 'DL Verified',
    vehicleClasses,
    attempts,
    scenario: item.current_scenario_code || meta.scenario || (status === 'passed' ? 'DR-14' : status === 'deferred' ? 'DR-07' : 'DR-06'),
    status,
    nextRetry: meta.nextRetry,
  };
}

// ── Subcomponents ─────────────────────────────────────────────────────────────
function AttemptDots({ attempts }: { attempts: AttemptResult[] }) {
  return (
    <div className="flex items-center gap-1">
      {attempts.map((a, i) => (
        <div
          key={i}
          className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold ${
            a === 'pass' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
            a === 'fail' ? 'bg-red-500/20 border-red-500/40 text-red-400' :
            'bg-white/5 border-white/15 text-muted-foreground'
          }`}
        >
          {a === 'pass' ? '✓' : a === 'fail' ? '✗' : i + 1}
        </div>
      ))}
    </div>
  );
}

function AssessmentModal({ driver, onClose, onRefresh }: { driver: Driver; onClose: () => void; onRefresh: () => void }) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultPass, setResultPass] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const passed = CHECKLIST.every((c) => checks[c.id]);
  const toggle = (id: string) => setChecks((p) => ({ ...p, [id]: !p[id] }));

  const handleSubmitResult = async (isPass: boolean) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // POST /assessments/create only opens a PENDING attempt — it ignores
      // result/score entirely. Recording an actual result (and triggering the
      // backend's 3-attempt DR-09 auto-termination check) requires the
      // separate POST /assessments/submit call below.
      const createRes = await api.createAssessment({
        staff_id: driver.id,
        assessment_type: 'DRIVER_PRACTICAL',
        remarks: isPass ? 'Practical driving test passed' : 'Practical driving test failed',
      });
      const created = (createRes as { data?: { id?: string } })?.data ?? (createRes as { id?: string });
      const assessmentId = created?.id;
      if (!assessmentId) throw new Error('Could not create assessment attempt');

      await api.submitDriverAssessment({
        id: assessmentId,
        score: isPass ? 100 : 40,
        result: isPass ? 'PASS' : 'FAIL',
        remarks: isPass ? 'Practical driving test passed' : 'Practical driving test failed',
      });

      setResultPass(isPass);
      setSubmitted(true);
      onRefresh();
    } catch (e) {
      setSubmitError(
        e instanceof Error && e.message
          ? e.message
          : 'Failed to submit assessment result. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg bg-[#0e1420] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div>
            <h2 className="font-bold text-white">Practical Assessment</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{driver.name} · {driver.code} · Attempt {driver.attempts.filter(Boolean).length + 1}/3</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors text-xl">×</button>
        </div>

        {!submitted ? (
          <>
            {/* Checklist */}
            <div className="px-6 py-4 space-y-2 max-h-80 overflow-y-auto">
              {CHECKLIST.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    checks[item.id]
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-white/3 border-white/8 hover:border-white/15'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    checks[item.id] ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'
                  }`}>
                    {checks[item.id] && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Result preview */}
            <div className={`mx-6 mb-4 p-3 rounded-xl border text-sm font-semibold text-center ${
              passed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/3 border-white/10 text-muted-foreground'
            }`}>
              {CHECKLIST.filter(c => checks[c.id]).length}/{CHECKLIST.length} criteria met
              {passed && ' — Ready to PASS ✓'}
            </div>

            {submitError && (
              <div className="mx-6 mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-sm font-semibold text-red-400 text-center">
                {submitError}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                disabled={submitting}
                onClick={() => handleSubmitResult(false)}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Record FAIL
              </button>
              <button
                disabled={!passed || submitting}
                onClick={() => handleSubmitResult(true)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-bold hover:bg-emerald-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Record PASS
              </button>
            </div>
          </>
        ) : (
          <div className="px-6 py-10 text-center">
            <div className="text-4xl mb-3">{resultPass ? '🎉' : '❌'}</div>
            <p className="font-bold text-white text-lg">{resultPass ? 'Assessment Passed!' : 'Assessment Failed'}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {resultPass
                ? 'Driver cleared for S3 Training. Scenario updated to DR-14.'
                : driver.attempts.filter(Boolean).length >= 2
                  ? 'Max attempts reached. Moving to Terminal (DR-09).'
                  : 'Deferred for 7-day retry window.'}
            </p>
            <button
              onClick={onClose}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF5A1F] text-white font-bold text-sm hover:bg-[#e04d17] transition-colors"
            >
              Done <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function DriverRow({ driver, onAssess }: { driver: Driver; onAssess: (d: Driver) => void }) {
  const [open, setOpen] = useState(false);
  const st = STATUS_STYLE[driver.status] ?? STATUS_STYLE.pending;

  return (
    <div className="rounded-xl border border-white/8 bg-card/60 overflow-hidden">
      {/* Main row */}
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/3 transition-colors">
        <div className="w-9 h-9 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center text-[#FF5A1F] flex-shrink-0">
          <Car className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">{driver.name}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{driver.code}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">DL: {driver.dl}</p>
        </div>
        <AttemptDots attempts={driver.attempts} />
        <span className={`ml-3 text-[10px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-0.5 ${st.cls}`}>
          {st.icon} {st.label}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-white/6"
          >
            <div className="px-5 py-4 space-y-4">
              {/* Vehicle classes */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">DL Vehicle Classes</p>
                <div className="flex flex-wrap gap-2">
                  {driver.vehicleClasses.map((vc) => {
                    const vm = VEHICLE_MATRIX[vc] ?? VEHICLE_MATRIX.LMV;
                    return (
                      <span key={vc} className={`text-xs font-bold border rounded-lg px-3 py-1 ${vm.color}`}>
                        {vm.icon} {vc} — {vm.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Scenario + FSM */}
              <div className="flex items-center gap-4">
                <div className="flex-1 p-3 rounded-lg bg-white/3 border border-white/8">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Scenario Code</p>
                  <p className="font-bold text-[#FF5A1F] font-mono mt-0.5">{driver.scenario}</p>
                </div>
                {driver.nextRetry && (
                  <div className="flex-1 p-3 rounded-lg bg-violet-500/5 border border-violet-500/15">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Next Retry</p>
                    <p className="font-bold text-violet-400 mt-0.5">{driver.nextRetry}</p>
                  </div>
                )}
              </div>

              {/* Deferred/terminal warnings */}
              {driver.status === 'terminal' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-400">Failed all 3 attempts. Scenario DR-09 — Terminal stage. No further assessment allowed.</p>
                </div>
              )}
              {driver.status === 'deferred' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <Clock className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  <p className="text-xs text-violet-400">On retry hold. 14-day deferred window. BM approval required to retry early.</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                {(driver.status === 'pending' || driver.status === 'in_progress') && (
                  <button
                    onClick={() => onAssess(driver)}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-[#FF5A1F] text-white hover:bg-[#e04d17] transition-colors"
                  >
                    Start Assessment
                  </button>
                )}
                <Link
                  href="/verification"
                  className="px-4 py-2 text-xs font-bold rounded-lg border border-white/15 bg-white/5 text-foreground hover:bg-white/10 transition-colors flex items-center gap-1"
                >
                  View Verification <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DriverAssessmentPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeDriver, setActiveDriver] = useState<Driver | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch staff from staff endpoint (which includes both intake candidates and HR module employees)
      const res = await api.listStaff({ limit: 200 });
      const items: any[] = res?.items ?? res?.data?.items ?? (Array.isArray(res) ? res : []);
      
      // Filter candidates/employees that belong to Driver category
      const driverItems = items.filter((s: any) => {
        const series = String(s.series || s.department || s.series_db || '').toUpperCase();
        const roleTypes = (s.role_types || []).map((r: any) => String(r).toUpperCase());
        return (
          series.includes('DRIV') ||
          series === 'DR' ||
          roleTypes.some((r: string) => r.includes('DRIV')) ||
          String(s.department ?? '').toLowerCase().includes('driver')
        );
      });

      setDrivers(driverItems.map(mapItemToDriver));
    } catch {
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  const counts = {
    pending:     drivers.filter(d => d.status === 'pending').length,
    in_progress: drivers.filter(d => d.status === 'in_progress').length,
    passed:      drivers.filter(d => d.status === 'passed').length,
    deferred:    drivers.filter(d => d.status === 'deferred').length,
    terminal:    drivers.filter(d => d.status === 'terminal').length,
  };

  const filtered = filter === 'all' ? drivers : drivers.filter(d => d.status === filter);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-padding max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Driver Assessment</h1>
          <p className="text-sm text-muted-foreground mt-1">S2.5 · Practical driving test · RM queue</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadDrivers}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-slate-400 hover:text-white"
            title="Refresh Drivers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-card/40">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-400 font-semibold">{counts.deferred} Deferred · {counts.terminal} Terminal</span>
          </div>
        </div>
      </div>

      {/* Stat pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all',         label: 'All',         val: drivers.length, cls: 'bg-white/5 border-white/10 text-foreground' },
          { key: 'pending',     label: 'Pending',     val: counts.pending,     cls: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
          { key: 'in_progress', label: 'In Progress', val: counts.in_progress, cls: 'bg-sky-500/10 border-sky-500/20 text-sky-400' },
          { key: 'passed',      label: 'Passed',      val: counts.passed,      cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
          { key: 'deferred',    label: 'Deferred',    val: counts.deferred,    cls: 'bg-violet-500/10 border-violet-500/20 text-violet-400' },
          { key: 'terminal',    label: 'Terminal',    val: counts.terminal,    cls: 'bg-red-500/10 border-red-500/20 text-red-400' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-bold transition-all ${s.cls} ${filter === s.key ? 'ring-1 ring-white/30' : 'opacity-70 hover:opacity-100'}`}
          >
            <span className="text-lg font-bold">{s.val}</span> {s.label}
          </button>
        ))}
      </div>

      {/* FSM Rule Box */}
      <div className="p-4 rounded-xl border border-white/8 bg-white/3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">FSM Assessment Rules</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span>🟢 Pass → <strong className="text-emerald-400">S3 Training (DR-14)</strong></span>
          <span>🔴 Fail Attempt 1 → <strong className="text-amber-400">Deferred 7 days (DR-07)</strong></span>
          <span>🔴 Fail Attempt 2 → <strong className="text-violet-400">Deferred 14 days (DR-08)</strong></span>
          <span>🚫 Fail Attempt 3 → <strong className="text-red-400">Terminal (DR-09)</strong></span>
          <span>↳ All transitions logged with actor_id, timestamp, reason_code</span>
        </div>
      </div>

      {/* Driver cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-[#FF5A1F]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No driver records found in this category. Add drivers via S1 Intake or HR Module.
          </div>
        ) : (
          filtered.map(d => (
            <DriverRow key={d.id} driver={d} onAssess={setActiveDriver} />
          ))
        )}
      </div>

      {/* Assessment Modal */}
      {activeDriver && (
        <AssessmentModal driver={activeDriver} onClose={() => setActiveDriver(null)} onRefresh={loadDrivers} />
      )}
    </motion.div>
  );
}
