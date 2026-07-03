'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, CheckCircle2, XCircle, Clock, AlertTriangle, ChevronDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';

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

// ── Static Data ───────────────────────────────────────────────────────────────
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

const MOCK_DRIVERS: Driver[] = [
  { id: '1', code: 'DR-2024-001', name: 'Ramesh Kumar',   phone: '9810XXXXXX', dl: 'DL-04 20110012345', vehicleClasses: ['LMV', 'MCWG'],       attempts: ['fail', null, null], scenario: 'DR-07', status: 'in_progress', nextRetry: '25 May 2026' },
  { id: '2', code: 'DR-2024-002', name: 'Suresh Yadav',   phone: '9811XXXXXX', dl: 'UP-14 20150098765', vehicleClasses: ['LMV'],                attempts: [null, null, null],   scenario: 'DR-06', status: 'pending' },
  { id: '3', code: 'DR-2024-003', name: 'Mohan Singh',    phone: '9812XXXXXX', dl: 'HR-26 20120056789', vehicleClasses: ['LMV', 'HMV', 'TRANS'], attempts: ['pass', null, null], scenario: 'DR-14', status: 'passed' },
  { id: '4', code: 'DR-2024-004', name: 'Deepak Chauhan', phone: '9813XXXXXX', dl: 'DL-07 20190034567', vehicleClasses: ['LMV'],                attempts: ['fail', 'fail', null], scenario: 'DR-08', status: 'deferred', nextRetry: '30 May 2026' },
  { id: '5', code: 'DR-2024-005', name: 'Vijay Prasad',   phone: '9814XXXXXX', dl: 'MH-12 20170078901', vehicleClasses: ['LMV', 'MCWG'],       attempts: ['fail', 'fail', 'fail'], scenario: 'DR-09', status: 'terminal' },
];

const STATUS_STYLE: Record<Driver['status'], { label: string; cls: string; icon: string }> = {
  pending:     { label: 'Pending',     cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',   icon: '⏳' },
  in_progress: { label: 'In Progress', cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30',         icon: '🔵' },
  passed:      { label: 'Passed',      cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: '✅' },
  deferred:    { label: 'Deferred',    cls: 'bg-violet-500/15 text-violet-400 border-violet-500/30', icon: '⏸️' },
  terminal:    { label: 'Terminal',    cls: 'bg-red-500/15 text-red-400 border-red-500/30',          icon: '🚫' },
};

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

function AssessmentModal({ driver, onClose }: { driver: Driver; onClose: () => void }) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const passed = CHECKLIST.every((c) => checks[c.id]);

  const toggle = (id: string) => setChecks((p) => ({ ...p, [id]: !p[id] }));

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

            {/* Actions */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setSubmitted(true)}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/30 transition-colors"
              >
                Record FAIL
              </button>
              <button
                disabled={!passed}
                onClick={() => setSubmitted(true)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-bold hover:bg-emerald-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Record PASS
              </button>
            </div>
          </>
        ) : (
          <div className="px-6 py-10 text-center">
            <div className="text-4xl mb-3">{passed ? '🎉' : '❌'}</div>
            <p className="font-bold text-white text-lg">{passed ? 'Assessment Passed!' : 'Assessment Failed'}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {passed
                ? 'Driver cleared for S3 Training. Scenario updated to DR-14.'
                : driver.attempts.filter(Boolean).length >= 2
                  ? 'Max attempts reached. Moving to Terminal (DR-09).'
                  : 'Deferred for 7-day retry window.'}
            </p>
            <Link
              href="/verification"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF5A1F] text-white font-bold text-sm hover:bg-[#e04d17] transition-colors"
            >
              Go to Verification <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function DriverRow({ driver, onAssess }: { driver: Driver; onAssess: (d: Driver) => void }) {
  const [open, setOpen] = useState(false);
  const st = STATUS_STYLE[driver.status];

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
                    const vm = VEHICLE_MATRIX[vc];
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
                <button className="px-4 py-2 text-xs font-bold rounded-lg border border-white/15 bg-white/5 text-foreground hover:bg-white/10 transition-colors">
                  View DL Data
                </button>
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
  const [activeDriver, setActiveDriver] = useState<Driver | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const counts = {
    pending:     MOCK_DRIVERS.filter(d => d.status === 'pending').length,
    in_progress: MOCK_DRIVERS.filter(d => d.status === 'in_progress').length,
    passed:      MOCK_DRIVERS.filter(d => d.status === 'passed').length,
    deferred:    MOCK_DRIVERS.filter(d => d.status === 'deferred').length,
    terminal:    MOCK_DRIVERS.filter(d => d.status === 'terminal').length,
  };

  const filtered = filter === 'all' ? MOCK_DRIVERS : MOCK_DRIVERS.filter(d => d.status === filter);

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
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-card/40">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-amber-400 font-semibold">{counts.deferred} Deferred · {counts.terminal} Terminal</span>
        </div>
      </div>

      {/* Stat pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all',         label: 'All',         val: MOCK_DRIVERS.length, cls: 'bg-white/5 border-white/10 text-foreground' },
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
        {filtered.map(d => (
          <DriverRow key={d.id} driver={d} onAssess={setActiveDriver} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No drivers in this category.</div>
        )}
      </div>

      {/* Assessment Modal */}
      {activeDriver && (
        <AssessmentModal driver={activeDriver} onClose={() => setActiveDriver(null)} />
      )}
    </motion.div>
  );
}
