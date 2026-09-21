'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { getRealtimeSocket } from '@/lib/realtime/socket';
import { Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRmKanban, useRmAdvanceStage, useVerificationStatus } from '@/lib/rm/hooks';
import {
  PIPELINE_STAGES,
  STAGE_COLORS,
  STAGE_LABELS,
  FSM_NEXT,
  TERMINAL_OUTCOMES,
  DEFERRED_REASONS,
} from '@/lib/rm/constants';
import { StaffCard } from './staff-card';
import { HoldModal, canHold } from './hold-modal';
import type { StaffApplicant, PipelineStage } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';
import { cn } from '@/lib/utils/cn';

export function PipelineKanban() {
  const [search, setSearch] = useState('');
  const [series, setSeries] = useState('');
  const [activeStage, setActiveStage] = useState<PipelineStage>(PIPELINE_STAGES[0] as PipelineStage);
  const [advanceTarget, setAdvanceTarget] = useState<StaffApplicant | null>(null);
  const [toStage, setToStage] = useState<PipelineStage | ''>('');
  // TERMINAL needs an outcome and DEFERRED a reason — the backend rejects either without one.
  const [terminalOutcome, setTerminalOutcome] = useState('');
  const [deferredReason, setDeferredReason] = useState('');
  const [notes, setNotes] = useState('');
  const [dragStaff, setDragStaff] = useState<StaffApplicant | null>(null);
  // Tracked by id so the dialog shows fresh holds after the kanban refetches.
  const [holdTargetId, setHoldTargetId] = useState<string | null>(null);

  const openAdvance = (s: StaffApplicant, stage: PipelineStage | '' = '') => {
    setAdvanceTarget(s);
    setToStage(stage);
    setTerminalOutcome('');
    setDeferredReason('');
    setNotes('');
  };
  const closeAdvance = () => setAdvanceTarget(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const qc = useQueryClient();
  const { data, isLoading } = useRmKanban({ search: search || undefined, series: series || undefined });
  const advance = useRmAdvanceStage();

  useEffect(() => {
    const sock = getRealtimeSocket();
    if (!sock) return;
    const onStage = () => {
      qc.invalidateQueries({ queryKey: ['rm-kanban'] });
    };
    sock.on('pipeline.stage_changed', onStage);
    return () => {
      sock.off('pipeline.stage_changed', onStage);
    };
  }, [qc]);

  const payload = (data as { data?: { columns?: Record<string, StaffApplicant[]> } })?.data ?? data;
  const columns = (payload as { columns?: Record<string, StaffApplicant[]> })?.columns ?? {};
  const allStaff = PIPELINE_STAGES.flatMap((st) => columns[st] ?? []);
  const holdTarget = holdTargetId ? allStaff.find((s) => s.id === holdTargetId) ?? null : null;

  useEffect(() => {
    // Keep activeStage valid if backend changes stage list order (defensive)
    if (!PIPELINE_STAGES.includes(activeStage)) {
      setActiveStage(PIPELINE_STAGES[0] as PipelineStage);
    }
  }, [activeStage]);

  const onDragEnd = (event: DragEndEvent) => {
    setDragStaff(null);
    const { active, over } = event;
    if (!over) return;
    const staff = allStaff.find((s) => s.id === active.id);
    const targetStage = over.id as PipelineStage;
    if (!staff || staff.pipeline_stage === targetStage) return;
    const allowed = FSM_NEXT[staff.pipeline_stage as PipelineStage] ?? [];
    if (!allowed.includes(targetStage)) {
      toast.error(`Cannot move ${staff.staff_code} to ${STAGE_LABELS[targetStage]}`);
      return;
    }
    // These two need more than a drop can say — ask in the modal.
    if (targetStage === 'TERMINAL' || targetStage === 'DEFERRED') {
      openAdvance(staff, targetStage);
      return;
    }
    advance.mutate(
      { staffId: staff.id, to_stage: targetStage },
      {
        onSuccess: () => toast.success(`Moved to ${STAGE_LABELS[targetStage]}`),
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  const needsOutcome = toStage === 'TERMINAL';
  const needsReason = toStage === 'DEFERRED';
  const canAdvance =
    !!toStage && (!needsOutcome || !!terminalOutcome) && (!needsReason || !!deferredReason);

  const handleAdvance = () => {
    if (!advanceTarget || !toStage || !canAdvance) return;
    advance.mutate(
      {
        staffId: advanceTarget.id,
        to_stage: toStage,
        ...(needsOutcome ? { terminal_outcome: terminalOutcome } : {}),
        ...(needsReason
          ? { payload: { deferred_reason: deferredReason, ...(notes.trim() ? { notes: notes.trim() } : {}) } }
          : {}),
      },
      {
        onSuccess: () => {
          toast.success(`Moved to ${STAGE_LABELS[toStage]}`);
          closeAdvance();
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="space-y-4">
      <KanbanFilters search={search} setSearch={setSearch} series={series} setSeries={setSeries} />

      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">Loading pipeline...</div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={(e: DragStartEvent) => {
            const s = allStaff.find((x) => x.id === e.active.id);
            if (s) setDragStaff(s);
          }}
          onDragEnd={onDragEnd}
        >
          {/* Mobile: show one stage at a time */}
          <div className="lg:hidden space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {PIPELINE_STAGES.map((stage) => {
                const isActive = activeStage === stage;
                const count = (columns[stage] ?? []).length;
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setActiveStage(stage as PipelineStage)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors',
                      isActive
                        ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
                        : 'border border-white/10 bg-card/30 text-secondary-foreground hover:border-white/20 hover:text-foreground',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="whitespace-nowrap">{STAGE_LABELS[stage as PipelineStage]}</span>
                    <span className={cn('tabular-nums', isActive ? 'text-white/90' : 'text-muted-foreground')}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-full border-white/15 bg-transparent px-3 text-xs text-foreground hover:bg-white/5"
                onClick={() => {
                  const idx = PIPELINE_STAGES.indexOf(activeStage);
                  const prev = PIPELINE_STAGES[Math.max(0, idx - 1)] as PipelineStage;
                  setActiveStage(prev);
                }}
                disabled={PIPELINE_STAGES.indexOf(activeStage) <= 0}
              >
                Prev
              </Button>
              <div className="min-w-0 text-center">
                <div className="truncate text-xs font-bold text-foreground">
                  {STAGE_LABELS[activeStage]}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {(columns[activeStage] ?? []).length} cards
                </div>
              </div>
              <Button
                variant="outline"
                className="h-9 rounded-full border-white/15 bg-transparent px-3 text-xs text-foreground hover:bg-white/5"
                onClick={() => {
                  const idx = PIPELINE_STAGES.indexOf(activeStage);
                  const next = PIPELINE_STAGES[Math.min(PIPELINE_STAGES.length - 1, idx + 1)] as PipelineStage;
                  setActiveStage(next);
                }}
                disabled={PIPELINE_STAGES.indexOf(activeStage) >= PIPELINE_STAGES.length - 1}
              >
                Next
              </Button>
            </div>

            <KanbanColumn
              stage={activeStage}
              items={columns[activeStage] ?? []}
              onAdvance={(s) => openAdvance(s)}
              onHold={(s) => setHoldTargetId(s.id)}
            />
          </div>

          {/* Desktop/tablet: keep horizontal multi-column */}
          <div className="hidden lg:flex gap-3 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage as PipelineStage}
                items={columns[stage] ?? []}
                onAdvance={(s) => openAdvance(s)}
                onHold={(s) => setHoldTargetId(s.id)}
              />
            ))}
          </div>
          <DragOverlay>
            {dragStaff ? <StaffCard staff={dragStaff} compact /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <Modal
        open={!!advanceTarget}
        onClose={closeAdvance}
        title={`Advance ${advanceTarget?.staff_code}`}
      >
        <p className="mb-3 text-sm text-muted-foreground">
          Current: {advanceTarget && STAGE_LABELS[advanceTarget.pipeline_stage]}
        </p>
        {advanceTarget && (
          <AdvanceWarnings staff={advanceTarget} toStage={toStage} terminalOutcome={terminalOutcome} />
        )}
        <div className="mb-4 space-y-3">
          <SelectMenu
            value={toStage}
            onValueChange={(v) => setToStage(v as PipelineStage)}
            placeholder="Select target stage"
            className="bg-background border-white/10"
          >
            {(FSM_NEXT[advanceTarget?.pipeline_stage as PipelineStage] ?? []).map((s) => (
              <SelectMenuItem key={s} value={s}>
                {STAGE_LABELS[s]}
              </SelectMenuItem>
            ))}
          </SelectMenu>

          {needsOutcome && (
            <SelectMenu
              value={terminalOutcome}
              onValueChange={setTerminalOutcome}
              placeholder="Select outcome (required)"
              className="bg-background border-white/10"
            >
              {TERMINAL_OUTCOMES.map((o) => (
                <SelectMenuItem key={o.value} value={o.value}>
                  {o.label}
                </SelectMenuItem>
              ))}
            </SelectMenu>
          )}

          {needsReason && (
            <>
              <SelectMenu
                value={deferredReason}
                onValueChange={setDeferredReason}
                placeholder="Select reason (required)"
                className="bg-background border-white/10"
              >
                {DEFERRED_REASONS.map((r) => (
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
              <p className="text-xs text-muted-foreground">
                Turns terminal automatically after 90 days unless resumed. Resume returns the staff to{' '}
                {advanceTarget && STAGE_LABELS[advanceTarget.pipeline_stage]} at most.
              </p>
            </>
          )}
        </div>
        <Button onClick={handleAdvance} disabled={!canAdvance || advance.isPending}>
          Confirm transition
        </Button>
      </Modal>

      {holdTarget && <HoldModal staff={holdTarget} onClose={() => setHoldTargetId(null)} />}
    </div>
  );
}

/**
 * What the backend will check for this move, read from the same place it
 * checks it. The S2 exit gate reads verification tracks — not the staff's
 * `verified_docs`, which this used to read and which can disagree.
 */
/** Outcomes that close the pipeline on a success — the staff's placements carry on. Mirrors the backend. */
const OUTCOMES_KEEPING_PLACEMENTS = new Set(['ENROLLED', 'CONDITIONAL']);

function AdvanceWarnings({
  staff,
  toStage,
  terminalOutcome,
}: {
  staff: StaffApplicant;
  toStage: PipelineStage | '';
  terminalOutcome: string;
}) {
  // A staff leaving can't leave active placements behind — the backend refuses it.
  const toTerminal = toStage === 'TERMINAL';
  const { data: placementData } = useQuery({
    queryKey: ['placements', 'staff', staff.id],
    queryFn: () => api.getPlacements({ staff_id: staff.id, limit: 50 }),
    enabled: toTerminal,
  });
  const live: { id: string; client_name?: string; status: string }[] = (placementData?.items ?? []).filter(
    (p: { status: string }) => p.status === 'TRIAL' || p.status === 'CONFIRMED',
  );
  if (toTerminal && live.length) {
    const keeps = OUTCOMES_KEEPING_PLACEMENTS.has(terminalOutcome);
    return (
      <div
        className={cn(
          'mb-3 flex items-start gap-2 rounded-lg border p-2.5 text-xs',
          keeps ? 'border-sky-500/20 bg-sky-500/10 text-sky-400' : 'border-amber-500/20 bg-amber-500/10 text-amber-400',
        )}
      >
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div>
          <p className="font-medium">
            {keeps
              ? 'These placements carry on after the move:'
              : 'Exit these placements first — a staff leaving can\'t leave them running:'}
          </p>
          <ul className="mt-0.5 list-inside list-disc">
            {live.map((p) => (
              <li key={p.id}>
                {p.client_name ?? 'Unknown client'} ({p.status.toLowerCase()})
              </li>
            ))}
          </ul>
          {!keeps && (
            <Link href="/rm/placements" className="mt-1 inline-block font-semibold underline">
              Go to placements
            </Link>
          )}
        </div>
      </div>
    );
  }

  return <StageWarnings staff={staff} toStage={toStage} />;
}

function StageWarnings({ staff, toStage }: { staff: StaffApplicant; toStage: PipelineStage | '' }) {
  // A held stage's exit gate is skipped now and checked when the hold is released.
  const currentHeld = (staff.open_holds ?? []).some((h) => h.stage === staff.pipeline_stage);
  const leavingVerify =
    !currentHeld && staff.pipeline_stage === 'S2_VERIFY' && (toStage === 'S2_5_ASSESS' || toStage === 'S3_TRAIN');
  const { data: verification } = useVerificationStatus(leavingVerify ? staff.id : '');

  if (currentHeld && toStage && toStage !== 'TERMINAL' && toStage !== 'DEFERRED') {
    return (
      <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-400">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          {STAGE_LABELS[staff.pipeline_stage]} is on hold, so its checks are skipped now. They must pass before the
          hold can be released, and every hold must be released before placement.
        </p>
      </div>
    );
  }

  const missing: string[] = [];
  if (staff.restricted_list_flag && toStage && toStage !== 'TERMINAL') {
    missing.push('Restricted-list flag is set — only a move to Terminal is allowed');
  }
  if (leavingVerify && verification) {
    const isMaid = verification.series === 'MAID';
    for (const t of verification.tracks ?? []) {
      if (!t.required || t.status === 'CLEAR') continue;
      // A maid may move on with police verification still pending; only a failed one blocks.
      if (isMaid && t.track === 'pv' && t.status !== 'FAILED') continue;
      missing.push(`${String(t.track).toUpperCase()} is ${String(t.status).replace('_', ' ').toLowerCase()}`);
    }
  }

  if (missing.length === 0) return null;

  return (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs text-amber-400">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>
        <p className="font-medium">Advancing may be blocked:</p>
        <ul className="mt-0.5 list-inside list-disc">
          {missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function KanbanFilters({
  search,
  setSearch,
  series,
  setSeries,
}: {
  search: string;
  setSearch: (v: string) => void;
  series: string;
  setSeries: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search staff code or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <SelectMenu
        value={series}
        onValueChange={setSeries}
        placeholder="All series"
        className="h-10 bg-card border-white/10 text-sm"
      >
        <SelectMenuItem value="MAID">M3X</SelectMenuItem>
        <SelectMenuItem value="SKILLED_CARE">SC</SelectMenuItem>
        <SelectMenuItem value="UNSKILLED_CARE">UC</SelectMenuItem>
        <SelectMenuItem value="DRIVER">DR</SelectMenuItem>
      </SelectMenu>
    </div>
  );
}

function KanbanColumn({
  stage,
  items,
  onAdvance,
  onHold,
}: {
  stage: PipelineStage;
  items: StaffApplicant[];
  onAdvance: (s: StaffApplicant) => void;
  onHold: (s: StaffApplicant) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="w-full max-w-[22rem] lg:w-72 shrink-0">
      <div className={cn('rounded-t-lg bg-gradient-to-r px-3 py-2', STAGE_COLORS[stage])}>
        <span className="text-sm font-semibold text-white">{STAGE_LABELS[stage]}</span>
        <span className="ml-2 text-xs text-white/70">({items.length})</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[200px] space-y-2 rounded-b-lg border border-white/10 bg-card/30 p-2',
          isOver && 'ring-2 ring-primary/50',
        )}
      >
        {items.map((s) => (
          <DraggableStaffCard
            key={s.id}
            staff={s}
            onAdvance={() => onAdvance(s)}
            onHold={canHold(s.pipeline_stage) ? () => onHold(s) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function DraggableStaffCard({
  staff,
  onAdvance,
  onHold,
}: {
  staff: StaffApplicant;
  onAdvance: () => void;
  onHold?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: staff.id,
    data: { staff },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('cursor-grab touch-none', isDragging && 'opacity-40')}
      {...listeners}
      {...attributes}
    >
      <StaffCard staff={staff} compact onAdvance={onAdvance} onHold={onHold ? () => onHold() : undefined} />
    </div>
  );
}
