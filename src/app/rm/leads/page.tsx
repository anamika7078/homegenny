'use client';

import Link from 'next/link';
import toast from 'react-hot-toast';
import { UserCheck, Phone } from 'lucide-react';
import { useUnassignedStaff, useClaimStaff } from '@/lib/rm/hooks';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { Button } from '@/components/ui/button';
import { SERIES_BADGE, SERIES_LABELS, STAGE_LABELS } from '@/lib/rm/constants';
import { cn } from '@/lib/utils/cn';
import { fToNow } from '@/lib/utils/format';
import type { StaffApplicant } from '@/lib/types';

/**
 * Staff who signed themselves up from the app. Registration already did
 * S1_INTAKE's job — full name, phone, DOB, address, category — so these all
 * sit at S2_VERIFY, ready to work. There's just no RM yet: self-registration
 * has none to assign, unlike an RM-run intake. First to Claim here owns the
 * candidate from here on — the same as if they'd run the intake themselves.
 */
export default function RmLeadsPage() {
  const { data, isLoading } = useUnassignedStaff();
  const leads: StaffApplicant[] = Array.isArray(data) ? data : [];
  const claim = useClaimStaff();

  return (
    <div className="page-padding max-w-4xl mx-auto space-y-4">
      <RmPageHeader
        title="New Leads"
        description="Self-registered from the app — S1 is already done, claim one to take it from S2 onward"
      />
      {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>}
      {!isLoading && leads.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No unclaimed self-registrations right now</p>
      )}
      <div className="space-y-2">
        {leads.map((s) => {
          const seriesKey = s.series as string;
          return (
            <div key={s.id} className="glass-card rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/rm/staff/${s.id}`} className="font-semibold hover:text-primary truncate">
                    {s.full_name || s.staff_code}
                  </Link>
                  <span
                    className={cn(
                      'shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase',
                      SERIES_BADGE[seriesKey] ?? 'bg-muted text-muted-foreground',
                    )}
                  >
                    {SERIES_LABELS[seriesKey] ?? seriesKey}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {s.mobile} <span className="font-mono text-xs">· {s.staff_code}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  registered {fToNow(s.created_at)} · now at {STAGE_LABELS[s.pipeline_stage] ?? s.pipeline_stage}
                </p>
              </div>
              <Button
                size="sm"
                disabled={claim.isPending}
                onClick={() =>
                  claim.mutate(s.id, {
                    onSuccess: () => toast.success(`${s.full_name || s.staff_code} is now yours`),
                    onError: (e: Error) => toast.error(e.message, { duration: 8000 }),
                  })
                }
              >
                <UserCheck className="mr-1 h-3.5 w-3.5" />
                Claim
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
