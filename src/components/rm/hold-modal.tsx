'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { PauseCircle, PlayCircle, CheckCircle2, Undo2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';
import { usePlaceHold, useMarkComplete, useReleaseHold } from '@/lib/rm/hooks';
import { HOLD_REASONS, COMPLETE_REASONS, PIPELINE_STAGES, STAGE_LABELS, overrideReasonLabel } from '@/lib/rm/constants';
import type { PipelineStage, StaffApplicant } from '@/lib/types';
import { fToNow } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

/** S1–S5, the stages an override can sit on. */
const WORKING_STAGES = PIPELINE_STAGES.slice(0, 6) as PipelineStage[];

export function canHold(stage: PipelineStage) {
  return WORKING_STAGES.includes(stage);
}

/**
 * Puts a stage on HOLD or marks it COMPLETE, and releases/reverts existing
 * overrides. HOLD: work still pending, staff may advance past it anyway,
 * temporary — must be released, and blocks placement until it is. COMPLETE:
 * the work already happened outside the system (a migrated or
 * previously-vetted staff member) — permanent, doesn't block placement.
 */
export function HoldModal({ staff, onClose }: { staff: StaffApplicant; onClose: () => void }) {
  const reached = WORKING_STAGES.slice(0, WORKING_STAGES.indexOf(staff.pipeline_stage) + 1);
  const openOverrides = staff.open_holds ?? [];
  const overriddenStages = new Set(openOverrides.map((h) => h.stage));
  const available = reached.filter((s) => !overriddenStages.has(s));

  const [kind, setKind] = useState<'HOLD' | 'COMPLETE'>('HOLD');
  const [stage, setStage] = useState<PipelineStage | ''>(
    available.includes(staff.pipeline_stage) ? staff.pipeline_stage : available[available.length - 1] ?? '',
  );
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [releaseNotes, setReleaseNotes] = useState<Record<string, string>>({});

  const place = usePlaceHold();
  const complete = useMarkComplete();
  const release = useReleaseHold();
  const reasons = kind === 'COMPLETE' ? COMPLETE_REASONS : HOLD_REASONS;

  const submit = () => {
    if (!stage || !reason) return;
    const mutation = kind === 'COMPLETE' ? complete : place;
    mutation.mutate(
      { staffId: staff.id, stage, reason, notes: notes.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`${STAGE_LABELS[stage]} ${kind === 'COMPLETE' ? 'marked complete' : 'put on hold'}`);
          setReason('');
          setNotes('');
          onClose();
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  return (
    <Modal open onClose={onClose} title={`Hold / Complete · ${staff.full_name || staff.staff_code}`}>
      <p className="mb-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Hold</strong> — work still pending, staff can move on anyway, must be
        released before placement. <strong className="text-foreground">Complete</strong> — work already happened
        outside the system (a migrated or previously-vetted staff), permanent, doesn&apos;t block placement.
      </p>

      {openOverrides.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active</p>
          {openOverrides.map((h) => {
            const isComplete = h.kind === 'COMPLETE';
            return (
              <div
                key={h.id}
                className={cn(
                  'rounded-lg border p-2.5 space-y-2',
                  isComplete ? 'border-sky-500/25 bg-sky-500/10' : 'border-amber-500/25 bg-amber-500/10',
                )}
              >
                <div className="flex items-start justify-between gap-2 text-xs">
                  <div>
                    <p className={cn('font-semibold flex items-center gap-1', isComplete ? 'text-sky-400' : 'text-amber-400')}>
                      {isComplete ? <CheckCircle2 className="h-3 w-3" /> : <PauseCircle className="h-3 w-3" />}
                      {STAGE_LABELS[h.stage]} · {isComplete ? 'Complete' : 'Hold'} · {overrideReasonLabel(h.kind, h.reason)}
                    </p>
                    {h.notes && <p className="text-muted-foreground">{h.notes}</p>}
                    <p className="text-[10px] text-muted-foreground">
                      {isComplete ? 'marked' : 'held'} {fToNow(h.held_at)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={release.isPending}
                    onClick={() =>
                      release.mutate(
                        { holdId: h.id, notes: releaseNotes[h.id]?.trim() || undefined },
                        {
                          onSuccess: () => {
                            toast.success(`${STAGE_LABELS[h.stage]} ${isComplete ? 'complete reverted' : 'hold released'}`);
                            onClose();
                          },
                          onError: (e: Error) => toast.error(e.message, { duration: 8000 }),
                        },
                      )
                    }
                  >
                    {isComplete ? <Undo2 className="mr-1 h-3.5 w-3.5" /> : <PlayCircle className="mr-1 h-3.5 w-3.5" />}
                    {isComplete ? 'Revert' : 'Release'}
                  </Button>
                </div>
                <input
                  value={releaseNotes[h.id] ?? ''}
                  onChange={(e) => setReleaseNotes((n) => ({ ...n, [h.id]: e.target.value }))}
                  placeholder={`${isComplete ? 'Revert' : 'Release'} note (optional)`}
                  className="w-full rounded-md border border-white/10 bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
            );
          })}
        </div>
      )}

      {available.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New override</p>
          <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1 w-fit">
            {(['HOLD', 'COMPLETE'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  setReason('');
                }}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                  kind === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {k === 'HOLD' ? 'Hold' : 'Complete'}
              </button>
            ))}
          </div>
          <SelectMenu
            value={stage}
            onValueChange={(v) => setStage(v as PipelineStage)}
            placeholder="Stage"
            className="bg-background border-white/10"
          >
            {available.map((s) => (
              <SelectMenuItem key={s} value={s}>
                {STAGE_LABELS[s]}
              </SelectMenuItem>
            ))}
          </SelectMenu>
          <SelectMenu
            value={reason}
            onValueChange={setReason}
            placeholder="Reason (required)"
            className="bg-background border-white/10"
          >
            {reasons.map((r) => (
              <SelectMenuItem key={r.value} value={r.value}>
                {r.label}
              </SelectMenuItem>
            ))}
          </SelectMenu>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Notes (optional)"
            className="w-full rounded-md border border-white/10 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          <Button onClick={submit} disabled={!stage || !reason || place.isPending || complete.isPending}>
            {kind === 'COMPLETE' ? <CheckCircle2 className="mr-1.5 h-4 w-4" /> : <PauseCircle className="mr-1.5 h-4 w-4" />}
            {kind === 'COMPLETE' ? 'Mark complete' : 'Put on hold'}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Every stage this staff has reached already has an override.</p>
      )}
    </Modal>
  );
}
