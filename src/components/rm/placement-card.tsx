'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, Clock, CheckCircle2, XCircle, FileText, ShieldAlert } from 'lucide-react';
import {
  usePlacementSow,
  useCreateSow,
  useSendSow,
  usePlacementIndemnity,
  useCreateIndemnity,
} from '@/lib/rm/hooks';
import type { WageBreakup } from '@/components/rm/wage-config-form';

// Kept in lockstep with the backend's PlacementStatus enum (TRIAL | CONFIRMED | EXITED |
// TERMINATED) — earlier drafts of this screen modeled a richer trial_7/trial_14/extended/
// reject/mutual_exit flow that has no backend support (no extend-trial endpoint, no separate
// reject-vs-mutual-exit tracking). Decision was to keep the UI matched to what the API can
// actually do rather than build against a state machine that doesn't exist server-side.
export type PlacementStatus = 'TRIAL' | 'CONFIRMED' | 'EXITED' | 'TERMINATED';

export interface Placement {
  id: string;
  staff_id: string;
  client_id: string;
  status: PlacementStatus;
  placement_type?: 'PERMANENT' | 'TEMPORARY';
  staff_code?: string;
  series?: string;
  staff_name?: string;
  client_name?: string;
  staff_salary: number | string | null;
  management_fee: number | string | null;
  hourly_rate?: number | null;
  hourly_fee?: number | null;
  shift_hours?: number | null;
  wage_breakup?: Partial<WageBreakup> | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  created_at: string;
}

const STATUS_STYLE: Record<PlacementStatus, { cls: string; label: string }> = {
  TRIAL: { cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30', label: 'Trial' },
  CONFIRMED: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Confirmed' },
  EXITED: { cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30', label: 'Exited' },
  TERMINATED: { cls: 'bg-red-500/15 text-red-400 border-red-500/30', label: 'Terminated' },
};

const SERIES_CLR: Record<string, string> = {
  DR: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  DRIVER: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  SC: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  SKILLED_CARE: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  UC: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
  UNSKILLED_CARE: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
  MAID: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
};

// These codes feed the exit settlement (finance/settlement/exit-settlement.service.ts
// prices MUTUAL differently) — keep them in step with it, not with any UI's labels.
const EXIT_REASONS = [
  { value: 'CLIENT_INITIATED', label: 'Client rejected' },
  { value: 'STAFF_INITIATED', label: 'Staff declined' },
  { value: 'MUTUAL', label: 'Mutual exit' },
  { value: 'PERFORMANCE_ISSUE', label: 'Performance issue' },
];

export function daysLeft(trialEndDate: string | null): number | null {
  if (!trialEndDate) return null;
  return Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / 86_400_000);
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function inr(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? `₹${Math.round(n).toLocaleString('en-IN')}` : '—';
}

function DaysLeftBadge({ days }: { days: number | null }) {
  if (days === null) return null;
  const urgent = days <= 2;
  return (
    <span
      className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${
        urgent ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-sky-500/10 border-sky-500/20 text-sky-400'
      }`}
    >
      <Clock className="w-3 h-3" />
      {days <= 0 ? 'Trial ended' : `${days}d left`}
    </span>
  );
}

const sowInputCls =
  'w-full px-3 py-2 text-xs rounded-lg bg-white/5 border border-white/15 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF5A1F]/50';

interface SowRow {
  id: string;
  content: string;
  status: 'DRAFT' | 'SENT' | 'ACKNOWLEDGED' | 'SUPERSEDED';
  version: number;
}

function SowSection({ placementId }: { placementId: string }) {
  const [content, setContent] = useState('');
  const { data, isLoading } = usePlacementSow(placementId);
  const rows = (Array.isArray(data) ? data : []) as SowRow[];
  const current = rows.find((r) => r.status !== 'SUPERSEDED');
  const createSow = useCreateSow(placementId);
  const sendSow = useSendSow(placementId);

  return (
    <div className="p-3 rounded-lg bg-white/3 border border-white/8 space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-[#FF5A1F]" />
        <p className="text-xs font-semibold text-foreground">Scope of Work (A2)</p>
        {current && (
          <span className="ml-auto text-[9px] font-bold uppercase text-muted-foreground border border-white/15 rounded-full px-1.5 py-0.5">
            {current.status} · v{current.version}
          </span>
        )}
      </div>
      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {!isLoading && !current && (
        <div className="space-y-2">
          <textarea
            className={sowInputCls}
            rows={3}
            placeholder="Duties, shift timing, residential/non-residential, excluded tasks…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {createSow.isError && <p className="text-xs text-red-400">{createSow.error.message}</p>}
          <button
            disabled={!content || createSow.isPending}
            onClick={() => createSow.mutate({ content })}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FF5A1F] text-white hover:bg-[#e04d17] transition-colors disabled:opacity-50"
          >
            {createSow.isPending ? 'Creating…' : 'Create Draft'}
          </button>
        </div>
      )}
      {current && current.status === 'DRAFT' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{current.content}</p>
          {sendSow.isError && <p className="text-xs text-red-400">{sendSow.error.message}</p>}
          <button
            disabled={sendSow.isPending}
            onClick={() => sendSow.mutate(current.id)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FF5A1F] text-white hover:bg-[#e04d17] transition-colors disabled:opacity-50"
          >
            {sendSow.isPending ? 'Sending…' : 'Send to Client'}
          </button>
        </div>
      )}
      {current && (current.status === 'SENT' || current.status === 'ACKNOWLEDGED') && (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{current.content}</p>
      )}
    </div>
  );
}

interface IndemnityRow {
  id: string;
  clause_version: string;
  clause_text: string;
  acknowledged_at: string | null;
  contested: boolean;
}

function IndemnitySection({ placementId }: { placementId: string }) {
  const [version, setVersion] = useState('v1.0');
  const [text, setText] = useState('');
  const { data, isLoading } = usePlacementIndemnity(placementId);
  const rows = (Array.isArray(data) ? data : []) as IndemnityRow[];
  const latest = rows[0];
  const createIndemnity = useCreateIndemnity(placementId);

  return (
    <div className="p-3 rounded-lg bg-white/3 border border-white/8 space-y-2">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-[#FF5A1F]" />
        <p className="text-xs font-semibold text-foreground">Client Indemnity (A3)</p>
        {latest && (
          <span className="ml-auto text-[9px] font-bold uppercase text-muted-foreground border border-white/15 rounded-full px-1.5 py-0.5">
            {latest.acknowledged_at ? 'Acknowledged' : latest.contested ? 'Contested' : 'Sent'}
          </span>
        )}
      </div>
      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {!isLoading && !latest && (
        <div className="space-y-2">
          <input className={sowInputCls} placeholder="Clause version (e.g. v1.0)" value={version} onChange={(e) => setVersion(e.target.value)} />
          <textarea
            className={sowInputCls}
            rows={3}
            placeholder="Client liability waiver, dispute resolution, insurance clauses…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {createIndemnity.isError && <p className="text-xs text-red-400">{createIndemnity.error.message}</p>}
          <button
            disabled={!version || !text || createIndemnity.isPending}
            onClick={() => createIndemnity.mutate({ clause_version: version, clause_text: text })}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FF5A1F] text-white hover:bg-[#e04d17] transition-colors disabled:opacity-50"
          >
            {createIndemnity.isPending ? 'Sending…' : 'Send to Client'}
          </button>
        </div>
      )}
      {latest && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{latest.clause_text}</p>}
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-white/3 border border-white/8">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-bold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

/** What the placement pays and bills — the full breakup for a permanent one, the hourly pair for an hourly one. */
function PayFigures({ p }: { p: Placement }) {
  if (p.placement_type === 'TEMPORARY') {
    return (
      <>
        <Figure label="Staff rate" value={`${inr(p.hourly_rate)}/hr`} />
        <Figure label="Our fee" value={`${inr(p.hourly_fee)}/hr`} />
      </>
    );
  }
  const b = p.wage_breakup;
  return (
    <>
      <Figure label="Staff take-home" value={`${inr(b?.netSalary ?? p.staff_salary)}/mo`} />
      <Figure label="Management fee" value={`${inr(b?.managementFee ?? p.management_fee)}/mo`} />
      {b && (
        <>
          <Figure label="Gross earnings" value={inr(b.grossEarnings)} />
          <Figure label="PF (employer + staff)" value={inr((b.epfoEmployer ?? 0) + (b.epfoEmployee ?? 0))} />
          <Figure label="ESIC (employer + staff)" value={inr((b.esicEmployer ?? 0) + (b.esicEmployee ?? 0))} />
          <Figure label="Bonus" value={`${inr(b.bonusMonthly)}/mo`} />
          <Figure label="GST" value={inr(b.totalGstAmount)} />
          <Figure label="Client pays (CTC)" value={`${inr(b.totalCTC)}/mo`} />
        </>
      )}
    </>
  );
}

export function PlacementCard({
  p,
  onConfirm,
  onExit,
  confirmingId,
  defaultOpen = false,
}: {
  p: Placement;
  onConfirm: (id: string) => void;
  onExit: (p: Placement) => void;
  confirmingId: string | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const st = STATUS_STYLE[p.status] ?? STATUS_STYLE.TRIAL;
  const dl = p.status === 'TRIAL' ? daysLeft(p.trial_end_date) : null;
  const isConfirming = confirmingId === p.id;
  const hourly = p.placement_type === 'TEMPORARY';

  return (
    <div className={`rounded-xl border overflow-hidden ${dl !== null && dl <= 2 ? 'border-amber-500/30' : 'border-white/8'} bg-card/60`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/3 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-[#FF5A1F]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{p.staff_name || '—'}</span>
            <span className="text-[10px] font-mono text-muted-foreground">{p.staff_code}</span>
            {p.series && (
              <span className={`text-[9px] font-bold uppercase border rounded-full px-2 py-0.5 ${SERIES_CLR[p.series] ?? 'bg-white/5 border-white/10 text-muted-foreground'}`}>
                {p.series}
              </span>
            )}
            <span className="text-[9px] font-bold uppercase border rounded-full px-2 py-0.5 bg-white/5 border-white/10 text-muted-foreground">
              {hourly ? 'Hourly' : 'Permanent'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
            <span>📍 {p.client_name || 'Unknown client'}</span>
            <span>· Since {fmtDate(p.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <DaysLeftBadge days={dl} />
          <span className={`text-[10px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <PayFigures p={p} />
                <Figure label="Trial start" value={fmtDate(p.trial_start_date)} />
                <Figure label="Trial end" value={fmtDate(p.trial_end_date)} />
              </div>

              {p.status === 'TRIAL' && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Trial Outcome</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Send the Scope of Work (A2) and Client Indemnity (A3) below before confirming.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onConfirm(p.id)}
                      disabled={isConfirming}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isConfirming ? 'Confirming…' : 'Confirm Placement'}
                    </button>
                    <button
                      onClick={() => onExit(p)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject / Exit Trial
                    </button>
                  </div>
                </div>
              )}

              {p.status === 'CONFIRMED' && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Actions</p>
                  <button
                    onClick={() => onExit(p)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    End Placement
                  </button>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Agreements</p>
                <div className="space-y-2">
                  <SowSection placementId={p.id} />
                  <IndemnitySection placementId={p.id} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ExitPlacementModal({
  placement,
  onClose,
  onExit,
  exiting,
}: {
  placement: Placement;
  onClose: () => void;
  onExit: (id: string, body: Record<string, unknown>) => Promise<void>;
  exiting: boolean;
}) {
  const [exitDate, setExitDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState(EXIT_REASONS[0].value);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 py-8 overflow-y-auto">
      <div className="w-full max-w-sm bg-[#0E1420] border border-white/15 rounded-2xl p-6 space-y-5">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-400" /> End Placement
            </h2>
            <p className="text-xs text-[#8D9AB5] mt-0.5">
              {placement.staff_name} · {placement.client_name}
            </p>
          </div>
          <button onClick={onClose} className="text-[#8D9AB5] hover:text-white text-xl w-8 h-8 flex items-center justify-center">×</button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#8D9AB5]">Exit Date</label>
          <input
            type="date"
            value={exitDate}
            onChange={(e) => setExitDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-[#E8EDF8] focus:outline-none focus:border-red-500/50"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#8D9AB5]">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-[#E8EDF8] focus:outline-none focus:border-red-500/50"
          >
            {EXIT_REASONS.map((r) => (
              <option key={r.value} value={r.value} className="bg-[#0E1420]">
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/15 text-[#8D9AB5] hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onExit(placement.id, { exit_date: exitDate, exit_scenario_code: reason })}
            disabled={exiting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/90 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {exiting ? 'Ending…' : 'Confirm Exit'}
          </button>
        </div>
      </div>
    </div>
  );
}
