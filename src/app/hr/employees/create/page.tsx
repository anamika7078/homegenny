'use client';

/**
 * This page used to be a blank employee-creation form. It was the second door
 * into `employees` — the one that did not link the new record back to the
 * pipeline candidate it came from, which is how production ended up with two
 * orphaned employees whose designations ("Caretaker", "Office Boy") are
 * placed-staff roles.
 *
 * Every employee is a candidate the pipeline carried to S5_DEPLOY and placed
 * with a client; there is no separate population of internal hires. So the
 * first step is choosing that person, which is what /hr/onboarding does.
 * `POST /employees` now refuses a request with no `staffApplicantId`, so this
 * form could no longer succeed anyway.
 *
 * Kept as a redirect rather than deleted so existing links and bookmarks land
 * somewhere useful instead of on a 404. See ONE_STAFF_MODEL_PLAN.md §F4.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';

export default function CreateEmployeeRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/hr/onboarding');
  }, [router]);

  return (
    <div className="page-padding flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <UserPlus className="h-10 w-10 text-secondary-foreground/40" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Taking you to Onboarding</p>
        <p className="max-w-md text-xs text-secondary-foreground">
          Employees are onboarded from candidates who have reached the deployment
          stage, so their record stays linked to the pipeline.
        </p>
      </div>
      <Link
        href="/hr/onboarding"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Go to Onboarding
      </Link>
    </div>
  );
}
