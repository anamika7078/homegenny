'use client';

import { RmPageHeader } from '@/components/rm/rm-page-header';
import { IntakeForm } from '@/components/rm/intake-form';

export default function AddStaffPage() {
  return (
    <div className="page-padding">
      <RmPageHeader title="Add Staff" description="Create a new staff applicant via S1 intake workflow" />
      <IntakeForm />
    </div>
  );
}
