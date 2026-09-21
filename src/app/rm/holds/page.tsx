'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { PauseCircle, PlayCircle, CheckCircle2, Undo2, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useReleaseHold } from '@/lib/rm/hooks';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { Button } from '@/components/ui/button';
import { STAGE_LABELS, overrideReasonLabel } from '@/lib/rm/constants';
import type { PipelineStage } from '@/lib/types';
import { fToNow } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

interface HoldRow {
  id: string;
  staff_id: string;
  stage: PipelineStage;
  kind: 'HOLD' | 'COMPLETE';
  reason: string;
  notes: string | null;
  held_at: string;
  overdue: boolean;
  staff_code: string;
  staff_name: string;
  series: string;
  current_stage: PipelineStage;
}

/**
 * Every open hold and complete, oldest first. A HOLD blocks placement until
 * released, and past 7 days is flagged overdue (a nudge — nothing auto-happens
 * to it or the staff). A COMPLETE never blocks placement and never expires.
 */
export default function RmHoldsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['rm-holds'],
    queryFn: () => api.getRmHolds(),
    refetchInterval: 30_000,
  });
  const rows: HoldRow[] = Array.isArray(data) ? data : [];
  const release = useReleaseHold();

  return (
    <div className="page-padding max-w-4xl mx-auto space-y-4">
      <RmPageHeader
        title="Holds &amp; Completes"
        description="Holds block placement until released; completes are permanent and don't"
      />
      {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>}
      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nothing active</p>
      )}
      <div className="space-y-2">
        {rows.map((h) => {
          const isComplete = h.kind === 'COMPLETE';
          const movedOn = h.current_stage !== h.stage;
          return (
            <div
              key={h.id}
              className={cn(
                'glass-card rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap',
                h.overdue && 'border-red-500/40',
              )}
            >
              <div className="min-w-0">
                <Link href={`/rm/staff/${h.staff_id}`} className="font-semibold hover:text-primary">
                  {h.staff_name}{' '}
                  <span className="font-mono text-xs text-muted-foreground">
                    {h.staff_code} · {h.series}
                  </span>
                </Link>
                <p className={cn('mt-1 flex items-center gap-1.5 text-sm', isComplete ? 'text-sky-400' : 'text-amber-400')}>
                  {isComplete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
                  {STAGE_LABELS[h.stage]} · {isComplete ? 'Complete' : 'Hold'} · {overrideReasonLabel(h.kind, h.reason)}
                  {h.overdue && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-400">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Overdue
                    </span>
                  )}
                </p>
                {h.notes && <p className="text-xs text-muted-foreground">{h.notes}</p>}
                <p className="text-xs text-muted-foreground">
                  {isComplete ? 'marked' : 'held'} {fToNow(h.held_at)} · now at {STAGE_LABELS[h.current_stage] ?? h.current_stage}
                  {movedOn && !isComplete ? ` — ${STAGE_LABELS[h.stage]} checks run on release` : ''}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={release.isPending}
                onClick={() =>
                  release.mutate(
                    { holdId: h.id },
                    {
                      onSuccess: () => toast.success(`${STAGE_LABELS[h.stage]} ${isComplete ? 'complete reverted' : 'hold released'}`),
                      onError: (e: Error) => toast.error(e.message, { duration: 8000 }),
                    },
                  )
                }
              >
                {isComplete ? <Undo2 className="mr-1 h-3.5 w-3.5" /> : <PlayCircle className="mr-1 h-3.5 w-3.5" />}
                {isComplete ? 'Revert' : 'Release'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
