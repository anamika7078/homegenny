'use client';

/**
 * This page drove the HR payroll engine, which is retired: `employee_payrolls`
 * is no longer written to, and everyone is paid through their placement from
 * the one attendance ledger. Left as it was, it offered a button that could
 * only fail.
 *
 * See ONE_STAFF_MODEL_PLAN.md §B6.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DollarSign } from 'lucide-react';

export default function FinanceEmployeePayrollRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/finance/payroll'); }, [router]);

  return (
    <div className="page-padding flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <DollarSign className="h-10 w-10 text-secondary-foreground/40" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Taking you to Payroll</p>
        <p className="max-w-md text-xs text-secondary-foreground">
          Everyone is paid through their placement now, from the attendance
          their client's staff actually worked.
        </p>
      </div>
      <Link
        href="/finance/payroll"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Go to Payroll
      </Link>
    </div>
  );
}
