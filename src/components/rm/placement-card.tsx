'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
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
  /** MONTHLY | HOURLY | PER_DUTY. PER_DUTY is 24×7 live-in or relief. */
  rate_basis?: 'MONTHLY' | 'HOURLY' | 'PER_DUTY';
  duty_rate?: number | null;
  duty_billing_rate?: number | null;
  esic_applicable?: boolean;
  pf_applicable?: boolean;
  covers_placement_id?: string | null;
  /** Set when Finance rejected an invoice built on this placement. The client is not invoiced until it is cleared. */
  rate_review?: { status: 'REVIEW_NEEDED'; reason: string | null; at: string | null; invoice_id: string | null } | null;
  shift_hours?: number | null;
  /** HH:MM (IST) the shift starts — what "late" on the Staff Snapshot is measured from. */
  shift_start?: string | null;
  /** 0 = Sunday … 6 = Saturday; the muster roll marks it WO. */
  weekly_off_day?: number | null;
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
  CK: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
  COOK: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
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
  const statutory = `${p.esic_applicable === false ? 'No ESIC' : 'ESIC'} · ${p.pf_applicable === false ? 'No PF' : 'PF'}`;
  if (p.rate_basis === 'PER_DUTY') {
    return (
      <>
        <Figure label="Staff pay" value={`${inr(p.duty_rate)}/duty`} />
        <Figure label="Client billing" value={`${inr(p.duty_billing_rate)}/duty + GST`} />
        <Figure label="Statutory" value={statutory} />
      </>
    );
  }
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

/**
 * When the shift starts. The Staff Snapshot measures "late" from it; a
 * placement without one is never marked late. Filled from the booking when
 * the placement came from a staff request.
 */
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** The weekly off, so the muster roll shows WO on that day instead of absent. */
function WeeklyOffEditor({ p }: { p: Placement }) {
  const qc = useQueryClient();
  const current = p.weekly_off_day == null ? '' : String(p.weekly_off_day);
  const [value, setValue] = useState(current);
  const save = useMutation({
    mutationFn: (v: string) => api.updatePlacementTerms(p.id, { weekly_off_day: v }),
    onSuccess: (_r, v) => {
      toast.success(v === '' ? 'Weekly off cleared' : `Weekly off: ${WEEKDAY_NAMES[Number(v)]}`);
      qc.invalidateQueries({ queryKey: ['placements'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="flex flex-wrap items-end gap-2 text-xs">
      <div>
        <label htmlFor={`weekly-off-${p.id}`} className="mb-1 block text-muted-foreground">Weekly off</label>
        <select
          id={`weekly-off-${p.id}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-foreground focus:border-[#FF5A1F]/50 focus:outline-none"
        >
          <option value="">None fixed</option>
          {WEEKDAY_NAMES.map((d, i) => <option key={d} value={String(i)}>{d}</option>)}
        </select>
      </div>
      <button
        type="button"
        disabled={value === current || save.isPending}
        onClick={() => save.mutate(value)}
        className="rounded-lg border border-white/15 px-3 py-1.5 font-semibold text-foreground hover:bg-white/5 disabled:opacity-40"
      >
        {save.isPending ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

function ShiftStartEditor({ p }: { p: Placement }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(p.shift_start ?? '');
  const save = useMutation({
    mutationFn: (shift_start: string) => api.updatePlacementTerms(p.id, { shift_start }),
    onSuccess: (_r, v) => {
      toast.success(v ? `Shift start set to ${v}` : 'Shift start cleared');
      qc.invalidateQueries({ queryKey: ['placements'] });
      qc.invalidateQueries({ queryKey: ['rm-snapshot'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const changed = value !== (p.shift_start ?? '');
  return (
    <div className="flex flex-wrap items-end gap-2 text-xs">
      <div>
        <label htmlFor={`shift-start-${p.id}`} className="mb-1 flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" /> Shift starts at
        </label>
        <input
          id={`shift-start-${p.id}`}
          type="time"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-foreground focus:border-[#FF5A1F]/50 focus:outline-none"
        />
      </div>
      <button
        type="button"
        disabled={!changed || save.isPending}
        onClick={() => save.mutate(value)}
        className="rounded-lg border border-white/15 px-3 py-1.5 font-semibold text-foreground hover:bg-white/5 disabled:opacity-40"
      >
        {save.isPending ? 'Saving…' : 'Save'}
      </button>
      {!p.shift_start && !changed && (
        <span className="text-muted-foreground">Not set — the Staff Snapshot can't tell if they are late.</span>
      )}
    </div>
  );
}

/**
 * Change how a running placement is priced — move it onto per-duty (24×7
 * live-in or relief), change its duty rates, or switch ESIC/PF off or on.
 *
 * New placements could already be created per-duty, but one already running
 * on a monthly wage had no way across. The change applies to payroll run from
 * now on; payroll already run keeps the figures it was run with.
 */
/**
 * Finance rejected an invoice built on this placement. The RM either corrects
 * the rate (Pricing below — saving it clears this) or says the rate stands.
 * Until one of those, the client cannot be invoiced.
 */
function RateReviewBanner({ p }: { p: Placement }) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);
  const confirm = useMutation({
    mutationFn: () => api.confirmPlacementRateReview(p.id, note.trim()),
    onSuccess: () => {
      toast.success('Rate confirmed — Finance can invoice this client again.');
      qc.invalidateQueries({ queryKey: ['placements'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!p.rate_review) return null;
  return (
    <div className="space-y-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs">
      <p className="font-semibold text-rose-200">Finance rejected an invoice for this placement</p>
      {p.rate_review.reason && <p className="text-rose-100">“{p.rate_review.reason}”</p>}
      <p className="text-muted-foreground">
        Correct the rate in Pricing below, or confirm it is right. Until then this client cannot be invoiced.
      </p>
      {open ? (
        <div className="space-y-2">
          <textarea
            id={`rate-review-note-${p.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Why the rate is right, e.g. ₹450/duty is the agreed relief rate"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-foreground"
          />
          <button
            type="button"
            disabled={note.trim().length < 10 || confirm.isPending}
            onClick={() => confirm.mutate()}
            className="rounded-lg border border-white/15 px-3 py-1.5 font-semibold text-foreground hover:bg-white/5 disabled:opacity-40"
          >
            {confirm.isPending ? 'Saving…' : 'Confirm the rate is right'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-white/15 px-3 py-1.5 font-semibold text-foreground hover:bg-white/5"
        >
          The rate is right
        </button>
      )}
    </div>
  );
}

const numOrEmpty = (v: unknown) => (v != null && v !== '' ? String(Number(v)) : '');

/**
 * Pricing, for every way a placement is paid: per duty, a monthly salary, or
 * by the hour. A change is dated — it applies from "Applies from" (default:
 * the first day no payroll covers yet). Going further back re-runs payroll
 * still in draft; the server refuses it over anything Finance has approved.
 */
function RatesEditor({ p }: { p: Placement }) {
  const qc = useQueryClient();
  const temp = p.placement_type === 'TEMPORARY';
  const [perDuty, setPerDuty] = useState(p.rate_basis === 'PER_DUTY');
  const [rate, setRate] = useState(numOrEmpty(p.duty_rate));
  const [bill, setBill] = useState(numOrEmpty(p.duty_billing_rate));
  const [salary, setSalary] = useState(numOrEmpty(p.staff_salary));
  const [fee, setFee] = useState(numOrEmpty(p.management_fee));
  const [hourly, setHourly] = useState(numOrEmpty(p.hourly_rate));
  const [hourlyFee, setHourlyFee] = useState(numOrEmpty(p.hourly_fee));
  const [esic, setEsic] = useState(p.esic_applicable !== false);
  const [pf, setPf] = useState(p.pf_applicable !== false);
  const [from, setFrom] = useState('');
  const [reason, setReason] = useState('');
  // A salary built from a wage breakup drives PF from that breakup; editing
  // the flat figure here would leave the breakup behind.
  const fromBreakup = !!p.wage_breakup && !perDuty && !temp;

  const history = useQuery({
    queryKey: ['placement-rate-history', p.id],
    queryFn: () => api.getPlacementRateHistory(p.id),
  });
  const defaultFrom: string | undefined = history.data?.next_unbilled_day ?? history.data?.data?.next_unbilled_day;

  const body = () => {
    const b: Record<string, unknown> = {};
    const changed = (now: string, was: unknown) => now !== numOrEmpty(was);
    if (perDuty !== (p.rate_basis === 'PER_DUTY')) b.rate_basis = perDuty ? 'PER_DUTY' : temp ? 'HOURLY' : 'MONTHLY';
    if (perDuty) {
      if (changed(rate, p.duty_rate) || b.rate_basis) b.duty_rate = Number(rate);
      if (changed(bill, p.duty_billing_rate) || b.rate_basis) b.duty_billing_rate = Number(bill);
      if (b.rate_basis) b.shift_hours = 24;
    } else if (temp) {
      if (changed(hourly, p.hourly_rate)) b.hourly_rate = Number(hourly);
      if (changed(hourlyFee, p.hourly_fee)) b.hourly_fee = Number(hourlyFee);
    } else if (!fromBreakup) {
      if (changed(salary, p.staff_salary)) b.staff_salary = Number(salary);
      if (changed(fee, p.management_fee)) b.management_fee = Number(fee);
    }
    if (esic !== (p.esic_applicable !== false)) b.esic_applicable = esic;
    if (pf !== (p.pf_applicable !== false)) b.pf_applicable = pf;
    if (Object.keys(b).length) {
      if (from) b.effective_from = from;
      if (reason.trim()) b.reason = reason.trim();
    }
    return b;
  };

  const save = useMutation({
    mutationFn: () => api.updatePlacementTerms(p.id, body()),
    onSuccess: (res: any) => {
      const out = res?.data ?? res;
      const rebuilt = (out?.rate_change?.rebuilt ?? []) as { invoice_number: string | null; period: string }[];
      toast.success(
        p.rate_review
          ? 'Rates corrected — Finance can invoice this client again.'
          : out?.rate_change
            ? `Rates saved — they apply from ${out.rate_change.effective_from}.` +
              (rebuilt.length ? ` Re-run: ${rebuilt.map((x) => x.invoice_number ?? x.period).join(', ')}.` : '')
            : 'Saved.',
      );
      for (const w of (out?.warnings ?? []) as string[]) toast(w, { icon: '⚠️', duration: 9000 });
      // Days already on an invoice the client has stay as billed; Finance
      // settles the difference by correcting that invoice.
      const toCorrect = (out?.rate_change?.invoices_to_correct ?? []) as string[];
      if (toCorrect.length) {
        toast(`Already sent to the client: ${toCorrect.join(', ')}. Ask Finance to correct ${toCorrect.length > 1 ? 'them' : 'it'}.`, {
          icon: '📄', duration: 12000,
        });
      }
      setReason('');
      qc.invalidateQueries({ queryKey: ['placements'] });
      qc.invalidateQueries({ queryKey: ['placement-rate-history', p.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rateN = Number(rate), billN = Number(bill);
  const invalid =
    (perDuty && (!(rateN > 0) || !(billN > 0) || billN < rateN)) ||
    (!perDuty && temp && !(Number(hourly) > 0)) ||
    (!perDuty && !temp && !fromBreakup && !(Number(salary) > 0));
  const nothing = Object.keys(body()).length === 0;
  const input = 'w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-foreground focus:border-[#FF5A1F]/50 focus:outline-none';
  const changes: any[] = history.data?.changes ?? history.data?.data?.changes ?? [];

  return (
    <div className="space-y-2 text-xs rounded-lg border border-white/8 p-3">
      <p className="font-semibold text-foreground">Pricing</p>
      <label className="flex items-center gap-2 cursor-pointer" htmlFor={`perduty-${p.id}`}>
        <input id={`perduty-${p.id}`} type="checkbox" checked={perDuty} onChange={(e) => setPerDuty(e.target.checked)} className="accent-[#FF5A1F]" />
        {temp ? 'Relief — paid per duty' : '24×7 Live-in — paid per duty'}
        <span className="text-muted-foreground">(otherwise {temp ? 'hourly' : 'monthly salary'})</span>
      </label>
      {perDuty ? (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={`dr-${p.id}`} className="mb-1 block text-muted-foreground">Staff pay ₹/duty</label>
            <input id={`dr-${p.id}`} type="number" min="0" value={rate} onChange={(e) => setRate(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`db-${p.id}`} className="mb-1 block text-muted-foreground">Client billing ₹/duty</label>
            <input id={`db-${p.id}`} type="number" min="0" value={bill} onChange={(e) => setBill(e.target.value)} className={input} />
          </div>
          {rateN > 0 && billN > 0 && billN < rateN && (
            <span className="text-amber-400">Billing is below the staff pay.</span>
          )}
        </div>
      ) : temp ? (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={`hr-${p.id}`} className="mb-1 block text-muted-foreground">Staff pay ₹/hour</label>
            <input id={`hr-${p.id}`} type="number" min="0" value={hourly} onChange={(e) => setHourly(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`hf-${p.id}`} className="mb-1 block text-muted-foreground">Fee ₹/hour</label>
            <input id={`hf-${p.id}`} type="number" min="0" value={hourlyFee} onChange={(e) => setHourlyFee(e.target.value)} className={input} />
          </div>
        </div>
      ) : fromBreakup ? (
        <p className="text-muted-foreground">
          The monthly salary comes from a wage breakup ({inr(Number(p.staff_salary))} + fee {inr(Number(p.management_fee))}).
          Change it from the breakup so PF stays right.
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={`ss-${p.id}`} className="mb-1 block text-muted-foreground">Staff salary ₹/month</label>
            <input id={`ss-${p.id}`} type="number" min="0" value={salary} onChange={(e) => setSalary(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor={`mf-${p.id}`} className="mb-1 block text-muted-foreground">Fee ₹/month</label>
            <input id={`mf-${p.id}`} type="number" min="0" value={fee} onChange={(e) => setFee(e.target.value)} className={input} />
          </div>
        </div>
      )}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer" htmlFor={`esic-${p.id}`}>
          <input id={`esic-${p.id}`} type="checkbox" checked={esic} onChange={(e) => setEsic(e.target.checked)} className="accent-[#FF5A1F]" />
          ESIC applies
        </label>
        <label className="flex items-center gap-2 cursor-pointer" htmlFor={`pf-${p.id}`}>
          <input id={`pf-${p.id}`} type="checkbox" checked={pf} onChange={(e) => setPf(e.target.checked)} className="accent-[#FF5A1F]" />
          PF applies
        </label>
      </div>
      {!nothing && (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={`ef-${p.id}`} className="mb-1 block text-muted-foreground">Applies from</label>
            <input
              id={`ef-${p.id}`}
              type="date"
              value={from || defaultFrom || ''}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-foreground"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label htmlFor={`rr-${p.id}`} className="mb-1 block text-muted-foreground">Why (kept on the history)</label>
            <input
              id={`rr-${p.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Increment agreed with the client"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-foreground"
            />
          </div>
          {defaultFrom && from && from < defaultFrom && (
            <p className="w-full text-amber-400">
              Payroll from {from} is already run — it will be re-run at the new rate if its invoice is still a draft.
            </p>
          )}
        </div>
      )}
      <button
        type="button"
        disabled={invalid || nothing || save.isPending}
        onClick={() => save.mutate()}
        className="rounded-lg border border-white/15 px-3 py-1.5 font-semibold text-foreground hover:bg-white/5 disabled:opacity-40"
      >
        {save.isPending ? 'Saving…' : 'Save pricing'}
      </button>
      {changes.length > 0 && (
        <details className="pt-1">
          <summary className="cursor-pointer text-muted-foreground">Rate history ({changes.length})</summary>
          <ul className="mt-2 space-y-1.5">
            {changes.map((c) => (
              <li key={c.id} className={c.superseded_at ? 'text-muted-foreground line-through' : 'text-foreground'}>
                From {c.effective_from}: {describeRateChange(c.before, c.after)}
                <span className="text-muted-foreground">
                  {' '}— {c.changed_by_name ?? 'someone'}, {new Date(c.changed_at).toLocaleDateString('en-IN')}
                  {c.reason ? ` · “${c.reason}”` : ''}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

const RATE_LABELS: Record<string, string> = {
  duty_rate: 'pay/duty', duty_billing_rate: 'billing/duty', staff_salary: 'salary', management_fee: 'fee',
  hourly_rate: 'pay/hour', hourly_fee: 'fee/hour', rate_basis: 'basis', esic_applicable: 'ESIC', pf_applicable: 'PF',
};
function describeRateChange(before: Record<string, unknown> = {}, after: Record<string, unknown> = {}) {
  const parts = Object.keys(RATE_LABELS)
    .filter((k) => JSON.stringify(before?.[k] ?? null) !== JSON.stringify(after?.[k] ?? null))
    .map((k) => {
      const show = (v: unknown) => (typeof v === 'number' ? inr(v) : typeof v === 'boolean' ? (v ? 'on' : 'off') : String(v ?? '—'));
      return `${RATE_LABELS[k]} ${show(before?.[k])} → ${show(after?.[k])}`;
    });
  return parts.length ? parts.join(', ') : 'no change';
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
              {p.rate_basis === 'PER_DUTY'
                ? (hourly ? 'Relief · per duty' : '24×7 Live-in')
                : hourly ? 'Hourly' : 'Permanent'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
            <span>📍 {p.client_name || 'Unknown client'}</span>
            <span>· Since {fmtDate(p.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {p.rate_review && (
            <span className="text-[10px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-0.5 bg-rose-500/15 border-rose-500/30 text-rose-300">
              Rate review
            </span>
          )}
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

              <RateReviewBanner p={p} />
              {(p.status === 'TRIAL' || p.status === 'CONFIRMED') && <ShiftStartEditor p={p} />}
              {(p.status === 'TRIAL' || p.status === 'CONFIRMED') && <WeeklyOffEditor p={p} />}
              {(p.status === 'TRIAL' || p.status === 'CONFIRMED') && <RatesEditor p={p} />}

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
