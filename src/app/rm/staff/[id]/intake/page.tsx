'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { IntakeForm, type IntakeExistingStaff } from '@/components/rm/intake-form';
import { TableSkeleton } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';

/**
 * "Complete S1" for a staff member who signed up from the app with a mobile
 * number only. The RM calls them, fills in the rest, and the staff moves to
 * S2 Verification. Completing an unclaimed one claims it.
 */
export default function CompleteIntakePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['staff', id],
    queryFn: () => api.getStaff(id),
    enabled: !!id,
  });
  const staff = ((data as { data?: IntakeExistingStaff })?.data ?? data) as
    | (IntakeExistingStaff & { pipeline_stage?: string; staff_code?: string })
    | undefined;

  if (isLoading) {
    return (
      <div className="page-padding">
        <TableSkeleton rows={6} />
      </div>
    );
  }
  if (!staff?.id) {
    return <p className="page-padding text-sm text-muted-foreground">Staff member not found.</p>;
  }

  return (
    <div className="page-padding space-y-4">
      <RmPageHeader
        title="Complete S1"
        description={`${staff.full_name || 'App sign-up'} · ${staff.mobile} — signed up with a mobile number only. Call them and fill in the rest.`}
        actions={
          <Link href={`/rm/staff/${staff.id}`}>
            <Button variant="outline">Back</Button>
          </Link>
        }
      />
      {staff.pipeline_stage && staff.pipeline_stage !== 'S1_INTAKE' ? (
        <p className="glass-card mx-auto max-w-3xl rounded-xl p-6 text-sm text-muted-foreground">
          S1 is already done — this staff member is at {staff.pipeline_stage}.
        </p>
      ) : (
        <IntakeForm existingStaff={staff} />
      )}
    </div>
  );
}
