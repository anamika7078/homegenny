'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ShieldCheck, ClipboardCheck, GraduationCap, FileText, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api/client';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { TableSkeleton } from '@/components/ui/loading';
import { SERIES_LABELS, STAGE_LABELS, PIPELINE_STAGES } from '@/lib/rm/constants';
import { Button } from '@/components/ui/button';
import type { PipelineStage } from '@/lib/types';

interface CandidateDetailProps {
  backHref: string;
  backLabel: string;
}

interface SectionDef {
  key: PipelineStage;
  label: string;
  icon: typeof ShieldCheck;
  href: (id: string) => string;
  cta: string;
}

const SECTIONS: SectionDef[] = [
  { key: 'S2_VERIFY', label: 'Verification', icon: ShieldCheck, href: (id) => `/rm/staff/${id}/verification`, cta: 'Open Verification' },
  { key: 'S2_5_ASSESS', label: 'Assessment', icon: ClipboardCheck, href: () => `/rm/assessment`, cta: 'Open Assessment' },
  { key: 'S3_TRAIN', label: 'Training', icon: GraduationCap, href: () => `/rm/training`, cta: 'Open Training' },
  { key: 'S4_AGREEMENTS', label: 'Agreements', icon: FileText, href: (id) => `/rm/staff/${id}/agreements`, cta: 'Open Agreements' },
];

function stageIndex(stage?: string): number {
  const idx = PIPELINE_STAGES.indexOf((stage ?? '') as PipelineStage);
  return idx === -1 ? 0 : idx;
}

export function CandidateDetail({ backHref, backLabel }: CandidateDetailProps) {
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
      <div className="page-padding">
        <TableSkeleton rows={6} />
      </div>
    );
  }

  const currentStageIdx = stageIndex(s?.pipeline_stage);

  return (
    <div className="space-y-6 p-6">
      <RmPageHeader
        title={s?.full_name ?? 'Staff'}
        description={s?.staff_code}
        actions={
          <>
            <Link href={`/rm/staff/${id}/video`}>
              <Button variant="outline">Video</Button>
            </Link>
            <Link href={backHref}>
              <Button variant="outline">{backLabel}</Button>
            </Link>
          </>
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

      <div>
        <h3 className="mb-3 font-semibold">Onboarding Progress</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((section) => {
            const sectionIdx = PIPELINE_STAGES.indexOf(section.key);
            const state: 'locked' | 'current' | 'done' =
              currentStageIdx < sectionIdx ? 'locked' : currentStageIdx === sectionIdx ? 'current' : 'done';
            const Icon = section.icon;
            return (
              <div
                key={section.key}
                className={`rounded-xl border p-4 flex items-center gap-3 ${
                  state === 'current'
                    ? 'border-[#FF5A1F]/40 bg-[#FF5A1F]/5'
                    : state === 'done'
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : 'border-white/8 bg-white/3 opacity-60'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                    state === 'current'
                      ? 'bg-[#FF5A1F]/10 border-[#FF5A1F]/20 text-[#FF5A1F]'
                      : state === 'done'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-muted-foreground'
                  }`}
                >
                  {state === 'locked' ? <Lock className="w-4 h-4" /> : state === 'done' ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{section.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {state === 'locked' ? 'Not reached yet' : state === 'done' ? 'Completed' : STAGE_LABELS[section.key]}
                  </p>
                </div>
                {state !== 'locked' && (
                  <Link href={section.href(id)}>
                    <Button size="sm" variant={state === 'current' ? 'default' : 'outline'}>
                      {state === 'current' ? (
                        <>
                          {section.cta} <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        'View'
                      )}
                    </Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
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

function InfoCard({ label, value }: { label: string; value?: string }) {
  return (
    <div className="glass-card rounded-lg p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value ?? '—'}</p>
    </div>
  );
}
