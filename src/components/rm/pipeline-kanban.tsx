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
import { cn } from '@/lib/utils/cn';

export function PipelineKanban() {
  const [search, setSearch] = useState('');
  const [series, setSeries] = useState('');
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
          <div className="flex gap-3 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
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
        <select
          className="mb-4 w-full rounded-lg border border-white/10 bg-background px-3 py-2"
          value={toStage}
          onChange={(e) => setToStage(e.target.value as PipelineStage)}
        >
          <option value="">Select target stage</option>
          {(FSM_NEXT[advanceTarget?.pipeline_stage as PipelineStage] ?? []).map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
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
      <select
        className="rounded-lg border border-white/10 bg-card px-3 py-2 text-sm"
        value={series}
        onChange={(e) => setSeries(e.target.value)}
      >
        <option value="">All series</option>
        <option value="MAID">M3X</option>
        <option value="SKILLED_CARE">SC</option>
        <option value="UNSKILLED_CARE">UC</option>
        <option value="DRIVER">DR</option>
      </select>
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
    <div className="w-72 shrink-0">
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
