import { cn } from '@/lib/utils/cn';

export type StatusTone = 'approved' | 'pending' | 'denied' | 'in_progress' | 'escalated';

const TONE: Record<StatusTone, string> = {
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  denied: 'bg-red-500/15 text-red-400 border-red-500/30',
  in_progress: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  escalated: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
};

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
