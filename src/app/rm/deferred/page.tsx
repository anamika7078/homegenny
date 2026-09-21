'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api/client';
import { RmListPage } from '@/components/rm/rm-list-page';
import { fToNow } from '@/lib/utils/format';
import { DEFERRED_REASONS, STAGE_LABELS } from '@/lib/rm/constants';
import type { PipelineStage } from '@/lib/types';

// Earliest first. A resume may go back, never past where the staff was
// deferred from — the backend refuses that.
const RESUME_STAGES = [
  { value: 'S2_VERIFY', label: 'S2 Verification' },
  { value: 'S2_5_ASSESS', label: 'S2.5 Assessment' },
  { value: 'S3_TRAIN', label: 'S3 Training' },
];

function ResumeControl({ staffId, resumeStage }: { staffId: string; resumeStage?: string }) {
  const limit = RESUME_STAGES.findIndex((s) => s.value === resumeStage);
  const options = limit >= 0 ? RESUME_STAGES.slice(0, limit + 1) : RESUME_STAGES;
  const [toStage, setToStage] = useState(options[options.length - 1].value);
  const qc = useQueryClient();
  const resume = useMutation({
    mutationFn: () => api.resumeRmDeferred(staffId, toStage),
    onSuccess: () => {
      toast.success('Case resumed');
      qc.invalidateQueries({ queryKey: ['rm-deferred'] });
      qc.invalidateQueries({ queryKey: ['rm-kanban'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Resume failed'),
  });

  return (
    <div className="flex items-center gap-2">
      <select
        value={toStage}
        onChange={(e) => setToStage(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-[#FF5A1F]/50"
      >
        {options.map((s) => (
          <option key={s.value} value={s.value} className="bg-[#0E1420]">
            {s.label}
          </option>
        ))}
      </select>
      <button
        disabled={resume.isPending}
        onClick={() => resume.mutate()}
        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FF5A1F] text-white hover:bg-[#e04d17] transition-colors disabled:opacity-50"
      >
        {resume.isPending ? 'Resuming…' : 'Resume'}
      </button>
    </div>
  );
}

export default function RmDeferredPage() {
  return (
    <RmListPage
      title="Deferred Cases"
      description="Auto-terminal after 90 days — resume when blockers clear"
      queryKey={['rm-deferred']}
      queryFn={() => api.getRmDeferred()}
      emptyMessage="No deferred cases"
      renderItem={(r) => {
        const staff = r.staff as Record<string, string> | undefined;
        const deferredAt = r.deferredAt ?? r.deferred_at;
        const resumeStage = (r.resumeStage ?? r.resume_stage) as string | undefined;
        const reason = DEFERRED_REASONS.find((d) => d.value === r.reason)?.label ?? String(r.reason);
        return (
          <div key={String(r.id)} className="glass-card rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold">
                {staff?.fullName ?? staff?.full_name}{' '}
                <span className="font-mono text-xs text-muted-foreground">{staff?.staffCode ?? staff?.staff_code}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {reason}
                {resumeStage ? ` · deferred from ${STAGE_LABELS[resumeStage as PipelineStage] ?? resumeStage}` : ''}
              </p>
              {r.notes ? <p className="text-xs text-muted-foreground">{String(r.notes)}</p> : null}
              <span className="text-xs text-muted-foreground">{deferredAt ? fToNow(String(deferredAt)) : ''}</span>
            </div>
            {staff?.id && <ResumeControl staffId={staff.id} resumeStage={resumeStage} />}
          </div>
        );
      }}
    />
  );
}
