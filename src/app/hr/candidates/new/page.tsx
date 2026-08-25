'use client';

import { IntakeForm } from '@/components/rm/intake-form';
import { RmPageHeader } from '@/components/rm/rm-page-header';

export default function HrNewCandidatePage() {
  return (
    <div className="page-padding">
      <RmPageHeader
        title="Add Candidate"
        description="S1 intake — same fields RM uses. Pick the RM who owns verification onward."
      />
      <IntakeForm successBasePath="/hr/candidates" terminalRedirect="/hr/candidates" />
    </div>
  );
}
