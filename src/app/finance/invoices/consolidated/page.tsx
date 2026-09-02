'use client';

/**
 * "Month-end Invoicing" used to be a page of its own: pick a month, see which
 * clients had un-invoiced payroll, issue each one.
 *
 * It stopped earning that place when payroll started issuing the invoice
 * itself. All it could list afterwards were the leftovers — clients whose
 * invoice could not be touched, almost always because it had already been
 * sent. That is a handful of rows a few times a year, and putting them behind
 * a second destination meant the one thing you could not see from the invoice
 * list was the invoice that does not exist yet.
 *
 * They now appear as a strip at the top of Finance → Invoices, with the same
 * "Issue invoice" action, where nobody has to remember to go looking.
 *
 * See ONE_STAFF_MODEL_PLAN.md §F6.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText } from 'lucide-react';

export default function ConsolidatedInvoicesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/finance/invoices'); }, [router]);

  return (
    <div className="page-padding flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <FileText className="h-10 w-10 text-secondary-foreground/40" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Taking you to Invoices</p>
        <p className="max-w-md text-xs text-secondary-foreground">
          Payroll issues each client&apos;s invoice. Anything it could not issue now shows
          at the top of the invoice list.
        </p>
      </div>
      <Link
        href="/finance/invoices"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Go to Invoices
      </Link>
    </div>
  );
}
