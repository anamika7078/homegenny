'use client';

/**
 * A second, read-only copy of the invoice list. One list, one place — Finance →
 * Invoices. See ONE_STAFF_MODEL_PLAN.md §F6.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText } from 'lucide-react';

export default function LegacyInvoicesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/finance/invoices'); }, [router]);

  return (
    <div className="page-padding flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <FileText className="h-10 w-10 text-secondary-foreground/40" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Taking you to Invoices</p>
        <p className="max-w-md text-xs text-secondary-foreground">
          Each client gets one invoice a month, and they all live in one place.
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
