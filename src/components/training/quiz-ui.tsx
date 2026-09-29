export type SubmissionState = 'NOT_ATTEMPTED' | 'SCHEDULED' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'PASSED' | 'FAILED';

export const SUBMISSION_LABEL: Record<SubmissionState, string> = {
  PENDING_REVIEW: 'Review pending',
  FAILED: 'Failed — reschedule',
  NOT_ATTEMPTED: 'Not attempted',
  SCHEDULED: 'Rescheduled',
  IN_PROGRESS: 'In progress',
  PASSED: 'Passed',
};

const SUBMISSION_CLR: Record<SubmissionState, string> = {
  PENDING_REVIEW: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  FAILED: 'bg-red-500/15 text-red-400 border-red-500/30',
  NOT_ATTEMPTED: 'bg-white/5 text-muted-foreground border-white/15',
  SCHEDULED: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  IN_PROGRESS: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  PASSED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

export function SubmissionBadge({ state }: { state: SubmissionState }) {
  return (
    <span className={`inline-block text-[10px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5 whitespace-nowrap ${SUBMISSION_CLR[state]}`}>
      {SUBMISSION_LABEL[state]}
    </span>
  );
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function errorMessage(e: any, fallback: string): string {
  const m = e?.response?.data?.message;
  if (typeof m === 'string') return m;
  if (m?.message) return Array.isArray(m.message) ? m.message.join(', ') : m.message;
  return e?.message ?? fallback;
}

export const fieldCls =
  'w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/15 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF5A1F]/50';
