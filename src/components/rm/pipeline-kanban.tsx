'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRmKanban, useRmAdvanceStage } from '@/lib/rm/hooks';
import { PIPELINE_STAGES, STAGE_COLORS, STAGE_LABELS, FSM_NEXT } from '@/lib/rm/constants';
import { StaffCard } from './staff-card';
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
  const [dragStaff, setDragStaff] = useState<StaffApplicant | null>(null);

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
    advance.mutate(
      { staffId: staff.id, to_stage: targetStage },
      {
        onSuccess: () => toast.success(`Moved to ${STAGE_LABELS[targetStage]}`),
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  const handleAdvance = () => {
    if (!advanceTarget || !toStage) return;
    advance.mutate(
      { staffId: advanceTarget.id, to_stage: toStage },
      {
        onSuccess: () => {
          toast.success(`Moved to ${STAGE_LABELS[toStage]}`);
          setAdvanceTarget(null);
          setToStage('');
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
              onAdvance={(s) => {
                setAdvanceTarget(s);
                setToStage('');
              }}
            />
          </div>

          {/* Desktop/tablet: keep horizontal multi-column */}
          <div className="hidden lg:flex gap-3 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage as PipelineStage}
                items={columns[stage] ?? []}
                onAdvance={(s) => {
                  setAdvanceTarget(s);
                  setToStage('');
                }}
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
        onClose={() => setAdvanceTarget(null)}
        title={`Advance ${advanceTarget?.staff_code}`}
      >
        <p className="mb-3 text-sm text-muted-foreground">
          Current: {advanceTarget && STAGE_LABELS[advanceTarget.pipeline_stage]}
        </p>
        <div className="mb-4">
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
        </div>
        <Button onClick={handleAdvance} disabled={!toStage || advance.isPending}>
          Confirm transition
        </Button>
      </Modal>
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
}: {
  stage: PipelineStage;
  items: StaffApplicant[];
  onAdvance: (s: StaffApplicant) => void;
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
          <DraggableStaffCard key={s.id} staff={s} onAdvance={() => onAdvance(s)} />
        ))}
      </div>
    </div>
  );
}

function DraggableStaffCard({
  staff,
  onAdvance,
}: {
  staff: StaffApplicant;
  onAdvance: () => void;
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
      <StaffCard staff={staff} compact onAdvance={onAdvance} />
    </div>
  );
}
