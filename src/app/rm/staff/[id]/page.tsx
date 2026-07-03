'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { TableSkeleton } from '@/components/ui/loading';
import { SERIES_LABELS, STAGE_LABELS } from '@/lib/rm/constants';
import { Button } from '@/components/ui/button';
import type { PipelineStage } from '@/lib/types';

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff', id],
    queryFn: () => api.getStaff(id),
    enabled: !!id,
  });

  const { data: timeline } = useQuery({
    queryKey: ['staff-timeline', id],
    queryFn: () => api.getStaffTimeline(id),
    enabled: !!id,
  });

  const s = (staff as { data?: Record<string, string> })?.data ?? (staff as Record<string, string>);
  const events =
    (timeline as { data?: { events?: { title: string; at: string; meta?: string }[] } })?.data?.events ??
    (timeline as { events?: { title: string; at: string; meta?: string }[] })?.events ??
    [];

  if (isLoading) {
    return (
      <MotionLoading />
    );
  }

  return (
    <div className="space-y-6 p-6">
      <RmPageHeader
        title={s?.full_name ?? 'Staff'}
        description={s?.staff_code}
        actions={
          <Link href="/rm/pipeline">
            <Button variant="outline">Pipeline</Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard label="Series" value={SERIES_LABELS[s?.series ?? ''] ?? s?.series} />
        <InfoCard
          label="Stage"
          value={STAGE_LABELS[s?.pipeline_stage as PipelineStage] ?? s?.pipeline_stage}
        />
        <InfoCard label="PV Status" value={s?.pv_status} />
        <InfoCard label="Mobile" value={s?.mobile} />
        <InfoCard label="Scenario" value={s?.current_scenario_code ?? '—'} />
        <InfoCard label="RM" value={s?.assigned_rm_id ?? 'Unassigned'} />
      </div>

      <div className="glass-card rounded-xl p-4">
        <h3 className="mb-4 font-semibold">Timeline</h3>
        <ul className="space-y-3">
          {events.length === 0 && (
            <li className="text-sm text-muted-foreground">No events yet</li>
          )}
          {events.map((e) => (
            <li
              key={`${e.at}-${e.title}`}
              className="flex justify-between border-b border-white/5 pb-2 text-sm"
            >
              <span>{e.title}</span>
              <span className="text-muted-foreground">
                {new Date(e.at).toLocaleString()}
                {e.meta ? ` · ${e.meta}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MotionLoading() {
  return (
    <div className="page-padding">
      <TableSkeleton rows={6} />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value?: string }) {
  return (
    <div className="glass-card rounded-lg p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value ?? '—'}</p>
    </div>
  );
}
