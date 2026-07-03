'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/layout/app-shell';
import { StatusBadge, StatusTone } from '@/components/ui/status-badge';

// ─── Types ────────────────────────────────────────────────────────────────────
type StageStatus = 'done' | 'active' | 'pending' | 'failed';

interface Stage {
  id: string;
  label: string;
  status: StageStatus;
  timestamp?: string;
  note?: string;
}

interface VerificationModule {
  id: string;
  icon: string;
  name: string;
  description: string;
  category: string;
  status: StatusTone;
  completedStages: number;
  totalStages: number;
  stages: Stage[];
  actions: string[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const MODULES: VerificationModule[] = [
  {
    id: 'aadhaar',
    icon: '🪪',
    name: 'Aadhaar eKYC',
    description: 'UIDAI-based identity verification via OTP/biometric authentication',
    category: 'Identity',
    status: 'approved',
    completedStages: 5,
    totalStages: 5,
    stages: [
      { id: 'a1', label: 'Aadhaar Number Collected', status: 'done', timestamp: '12 May, 10:30 AM', note: 'XXXX-XXXX-4821' },
      { id: 'a2', label: 'OTP Sent to Registered Mobile', status: 'done', timestamp: '12 May, 10:31 AM' },
      { id: 'a3', label: 'OTP Verified', status: 'done', timestamp: '12 May, 10:32 AM' },
      { id: 'a4', label: 'UIDAI Data Fetched', status: 'done', timestamp: '12 May, 10:33 AM', note: 'Name, DOB, Address matched' },
      { id: 'a5', label: 'eKYC Record Locked', status: 'done', timestamp: '12 May, 10:34 AM' },
    ],
    actions: ['View Report', 'Re-verify'],
  },
  {
    id: 'police',
    icon: '🚔',
    name: 'Police Verification',
    description: 'Local police station background and criminal record check',
    category: 'Background',
    status: 'pending',
    completedStages: 2,
    totalStages: 5,
    stages: [
      { id: 'p1', label: 'Form Submitted to Police Station', status: 'done', timestamp: '14 May, 9:00 AM' },
      { id: 'p2', label: 'Acknowledgment Received', status: 'done', timestamp: '14 May, 3:00 PM', note: 'Ref# DL/2026/PV/00381' },
      { id: 'p3', label: 'Field Officer Assigned', status: 'active', timestamp: 'Expected: 20 May' },
      { id: 'p4', label: 'Physical Verification Visit', status: 'pending' },
      { id: 'p5', label: 'Certificate Issued', status: 'pending' },
    ],
    actions: ['Upload Form', 'Chase Status', 'Escalate'],
  },
  {
    id: 'health',
    icon: '🏥',
    name: 'Health Screening',
    description: 'Medical fitness test including physical exam and communicable disease screening',
    category: 'Medical',
    status: 'in_progress',
    completedStages: 3,
    totalStages: 6,
    stages: [
      { id: 'h1', label: 'Appointment Booked', status: 'done', timestamp: '16 May, 11:00 AM', note: 'Apollo Clinic, Lajpat Nagar' },
      { id: 'h2', label: 'Physical Examination Done', status: 'done', timestamp: '18 May, 10:00 AM' },
      { id: 'h3', label: 'Lab Tests Submitted', status: 'done', timestamp: '18 May, 11:30 AM', note: 'CBC, HIV, Hepatitis B/C' },
      { id: 'h4', label: 'Lab Results Awaited', status: 'active', timestamp: 'Expected: 22 May' },
      { id: 'h5', label: 'Doctor Sign-off', status: 'pending' },
      { id: 'h6', label: 'Health Certificate Issued', status: 'pending' },
    ],
    actions: ['Upload Reports', 'View Appointment'],
  },
  {
    id: 'credential',
    icon: '🎓',
    name: 'Credential Verification',
    description: 'Employment history, education certificates, and skill credential cross-check',
    category: 'Background',
    status: 'pending',
    completedStages: 1,
    totalStages: 5,
    stages: [
      { id: 'c1', label: 'Documents Collected from Candidate', status: 'done', timestamp: '15 May, 2:00 PM', note: '10th, 12th, Skill Cert' },
      { id: 'c2', label: 'Sent to 3rd-Party Verification Agency', status: 'active', timestamp: 'Sent: 17 May' },
      { id: 'c3', label: 'Agency Acknowledgment', status: 'pending' },
      { id: 'c4', label: 'Institution Confirmation', status: 'pending' },
      { id: 'c5', label: 'Verification Report Received', status: 'pending' },
    ],
    actions: ['Upload Documents', 'Track Agency', 'Escalate'],
  },
  {
    id: 'reference',
    icon: '📞',
    name: 'Reference Verification',
    description: 'Cross-check with personal and professional references provided by candidate',
    category: 'Background',
    status: 'approved',
    completedStages: 4,
    totalStages: 4,
    stages: [
      { id: 'r1', label: 'References Collected (2 Professional, 1 Personal)', status: 'done', timestamp: '13 May, 4:00 PM' },
      { id: 'r2', label: 'Professional Ref 1 Called & Verified', status: 'done', timestamp: '15 May, 3:00 PM', note: 'Prev employer – positive' },
      { id: 'r3', label: 'Professional Ref 2 Called & Verified', status: 'done', timestamp: '15 May, 4:30 PM', note: 'Prev employer – positive' },
      { id: 'r4', label: 'Personal Ref Called & Verified', status: 'done', timestamp: '16 May, 10:00 AM', note: 'No concerns raised' },
    ],
    actions: ['View Notes', 'Add Reference'],
  },
  {
    id: 'sarathi',
    icon: '🚗',
    name: 'Sarathi API (Drivers)',
    description: 'MoRTH Sarathi portal DL validity, category, and endorsement verification',
    category: 'Driver',
    status: 'in_progress',
    completedStages: 2,
    totalStages: 4,
    stages: [
      { id: 's1', label: 'DL Number Captured', status: 'done', timestamp: '17 May, 9:00 AM', note: 'DL-0420110012345' },
      { id: 's2', label: 'API Call to Sarathi Portal', status: 'done', timestamp: '17 May, 9:01 AM' },
      { id: 's3', label: 'DL Category & Validity Cross-check', status: 'active', timestamp: 'Under review' },
      { id: 's4', label: 'Driver Cleared / Flagged', status: 'pending' },
    ],
    actions: ['Re-query API', 'View DL Data'],
  },
  {
    id: 'echallan',
    icon: '🚦',
    name: 'eChallan API',
    description: 'Ministry of Road Transport eChallan lookup for traffic violations and dues',
    category: 'Driver',
    status: 'pending',
    completedStages: 0,
    totalStages: 3,
    stages: [
      { id: 'e1', label: 'Vehicle / DL Number Submitted', status: 'pending' },
      { id: 'e2', label: 'eChallan Portal Query', status: 'pending' },
      { id: 'e3', label: 'Clearance / Pending Challans Report', status: 'pending' },
    ],
    actions: ['Initiate Check'],
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<StageStatus, string> = {
  done:    'bg-emerald-500 border-emerald-500 shadow-emerald-500/40',
  active:  'bg-sky-400 border-sky-400 shadow-sky-400/40',
  pending: 'bg-white/10 border-white/20',
  failed:  'bg-red-500 border-red-500 shadow-red-500/40',
};

const STAGE_LINE: Record<StageStatus, string> = {
  done:    'bg-emerald-500/60',
  active:  'bg-sky-400/40',
  pending: 'bg-white/10',
  failed:  'bg-red-500/40',
};

const STAGE_LABEL: Record<StageStatus, string> = {
  done:    'text-foreground',
  active:  'text-sky-300',
  pending: 'text-muted-foreground',
  failed:  'text-red-400',
};

function StageTimeline({ stages }: { stages: Stage[] }) {
  return (
    <div className="mt-4 space-y-0">
      {stages.map((stage, idx) => (
        <div key={stage.id} className="flex gap-3">
          {/* Dot + connector */}
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full border-2 shadow-sm flex-shrink-0 mt-1 ${STAGE_COLORS[stage.status]}`} />
            {idx < stages.length - 1 && (
              <div className={`w-0.5 flex-1 min-h-[24px] mt-1 ${STAGE_LINE[stage.status]}`} />
            )}
          </div>
          {/* Content */}
          <div className="pb-5 flex-1">
            <p className={`text-sm font-medium leading-tight ${STAGE_LABEL[stage.status]}`}>
              {stage.label}
              {stage.status === 'active' && (
                <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-sky-400 bg-sky-400/10 border border-sky-400/20 rounded-full px-2 py-0.5 font-bold uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  Live
                </span>
              )}
            </p>
            {stage.timestamp && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{stage.timestamp}</p>
            )}
            {stage.note && (
              <p className="text-[11px] text-amber-400/80 mt-0.5 italic">↳ {stage.note}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  Identity:   'text-violet-400 bg-violet-500/10 border-violet-500/20',
  Background: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  Medical:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Driver:     'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const color = pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-sky-400' : 'bg-amber-400';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground shrink-0">{completed}/{total}</span>
    </div>
  );
}

function ModuleCard({ mod, isOpen, onToggle }: { mod: VerificationModule; isOpen: boolean; onToggle: () => void }) {
  return (
    <motion.div
      layout
      className="rounded-xl border border-white/8 bg-card/60 backdrop-blur-sm overflow-hidden hover:border-white/15 transition-colors"
    >
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xl flex-shrink-0">
          {mod.icon}
        </div>

        {/* Title block */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{mod.name}</span>
            <span className={`text-[9px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 ${CATEGORY_COLORS[mod.category]}`}>
              {mod.category}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{mod.description}</p>
          <ProgressBar completed={mod.completedStages} total={mod.totalStages} />
        </div>

        {/* Status + chevron */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusBadge tone={mod.status}>
            {mod.status.replace('_', ' ')}
          </StatusBadge>
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/6">
              <StageTimeline stages={mod.stages} />

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mt-2">
                {mod.actions.map((action) => (
                  <button
                    key={action}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-foreground transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Stat Cards ───────────────────────────────────────────────────────────────
function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${color}`}>
      <span className="text-xl font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function VerificationCenterPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const approved   = MODULES.filter((m) => m.status === 'approved').length;
  const inProgress = MODULES.filter((m) => m.status === 'in_progress').length;
  const pending    = MODULES.filter((m) => m.status === 'pending').length;
  const totalDone  = MODULES.reduce((s, m) => s + m.completedStages, 0);
  const totalAll   = MODULES.reduce((s, m) => s + m.totalStages, 0);
  const overallPct = Math.round((totalDone / totalAll) * 100);

  const filtered = filterStatus === 'all'
    ? MODULES
    : MODULES.filter((m) => m.status === filterStatus);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="page-padding max-w-4xl mx-auto space-y-6"
      >
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Verification Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              S2 multi-track verification · RM queue
            </p>
          </div>

          {/* Overall progress ring */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-white/10 bg-card/40 backdrop-blur-sm">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
              <circle
                cx="18" cy="18" r="14" fill="none"
                stroke={overallPct === 100 ? '#10b981' : '#38bdf8'}
                strokeWidth="4"
                strokeDasharray={`${(overallPct / 100) * 87.96} 87.96`}
                strokeLinecap="round"
              />
            </svg>
            <div>
              <p className="text-lg font-bold text-foreground">{overallPct}%</p>
              <p className="text-[11px] text-muted-foreground">Overall Progress</p>
            </div>
          </div>
        </div>

        {/* ── Stat pills ── */}
        <div className="flex flex-wrap gap-2">
          <StatPill label="Approved"    value={approved}   color="bg-emerald-500/10 border-emerald-500/20 text-emerald-400" />
          <StatPill label="In Progress" value={inProgress} color="bg-sky-500/10 border-sky-500/20 text-sky-400" />
          <StatPill label="Pending"     value={pending}    color="bg-amber-500/10 border-amber-500/20 text-amber-400" />
          <StatPill label="Total Modules" value={MODULES.length} color="bg-white/5 border-white/10 text-foreground" />
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/8 w-fit">
          {(['all', 'approved', 'in_progress', 'pending'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filterStatus === f
                  ? 'bg-primary text-white shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Module Cards ── */}
        <div className="space-y-3">
          {filtered.map((mod) => (
            <ModuleCard
              key={mod.id}
              mod={mod}
              isOpen={openId === mod.id}
              onToggle={() => toggle(mod.id)}
            />
          ))}
        </div>

        {/* ── Footer note ── */}
        <p className="text-[11px] text-muted-foreground text-center pb-4">
          All verification checks are governed by HomeGenny S2 compliance policy · Last synced: just now
        </p>
      </motion.div>
    </AppShell>
  );
}
