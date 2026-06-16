'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import type { StaffApplicant } from '@/lib/types';
import { SERIES_BADGE, SERIES_LABELS, STAGE_LABELS } from '@/lib/rm/constants';
import { cn } from '@/lib/utils/cn';

interface StaffCardProps {
  staff: StaffApplicant;
  compact?: boolean;
  onAdvance?: (staff: StaffApplicant) => void;
}

export function StaffCard({ staff, compact, onAdvance }: StaffCardProps) {
  const seriesKey = staff.series as string;
  const alerts: string[] = [];
  if (staff.restricted_list_flag) alerts.push('Restricted');
  if (staff.pv_status === 'IN_PROGRESS' || staff.pv_status === 'NOT_INITIATED') alerts.push('PV');
  if (!staff.verified_docs?.aadhaar) alerts.push('Aadhaar');
  if (staff.series === 'DR' && !staff.verified_docs?.dl) alerts.push('DL');

  return (
    <div
      className={cn(
        'glass-card rounded-lg p-3 transition-all hover:border-primary/30',
        compact && 'p-2',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link href={`/rm/staff/${staff.id}`} className="block">
            <p className="truncate text-sm font-semibold text-foreground">
              {staff.full_name || staff.staff_code}
            </p>
            <p className="text-xs text-muted-foreground">{staff.staff_code}</p>
          </Link>
        </div>
        <span
          className={cn(
            'shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase',
            SERIES_BADGE[seriesKey] ?? 'bg-muted text-muted-foreground',
          )}
        >
          {SERIES_LABELS[seriesKey] ?? seriesKey}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {staff.language_tier && (
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {staff.language_tier}
          </span>
        )}
        {staff.current_scenario_code && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
            {staff.current_scenario_code}
          </span>
        )}
        {alerts.map((a) => (
          <span
            key={a}
            className="inline-flex items-center gap-0.5 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive"
          >
            <AlertTriangle className="h-2.5 w-2.5" />
            {a}
          </span>
        ))}
      </div>

      {!compact && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          {STAGE_LABELS[staff.pipeline_stage]}
        </p>
      )}

      {onAdvance && (
        <button
          type="button"
          onClick={() => onAdvance(staff)}
          className="mt-2 w-full rounded-md bg-primary/10 py-1 text-xs font-medium text-primary hover:bg-primary/20"
        >
          Advance stage
        </button>
      )}
    </div>
  );
}
