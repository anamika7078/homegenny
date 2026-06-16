'use client';

import { RmPageHeader } from '@/components/rm/rm-page-header';
import { IntakeForm } from '@/components/rm/intake-form';

export default function RmIntakePage() {
  return (
    <div className="p-6">
      <RmPageHeader
        title="S1 Intake"
        description="Restricted-list check runs first. Valid intakes advance to S2 Verification."
      />
      <IntakeForm />
    </div>
  );
}
