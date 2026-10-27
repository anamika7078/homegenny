'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api/client';
import type { Placement } from '@/components/rm/placement-card';

/**
 * Shown only when Finance has rejected an invoice on one of the RM's
 * placements. Until the RM corrects or confirms the rate, that client cannot
 * be invoiced — and nothing else on the dashboard would say so.
 */
export function RateReviewAlert() {
  const { data } = useQuery({
    queryKey: ['placements'],
    queryFn: () => api.getPlacements({ limit: 100 }),
  });
  const waiting = ((data?.items ?? []) as Placement[]).filter((p) => p.rate_review);
  if (!waiting.length) return null;
  const names = waiting.slice(0, 3).map((p) => `${p.staff_name ?? 'Staff'} (${p.client_name ?? 'client'})`).join(', ');
  return (
    <Link
      href="/rm/placements?review=1"
      className="mb-4 flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 hover:bg-rose-500/15"
    >
      <AlertTriangle className="h-5 w-5 flex-shrink-0 text-rose-400" />
      <div className="text-sm">
        <p className="font-semibold text-rose-300">
          Finance rejected {waiting.length} invoice{waiting.length === 1 ? '' : 's'} — check the rate
        </p>
        <p className="text-rose-200/80">
          {names}{waiting.length > 3 ? ` and ${waiting.length - 3} more` : ''}. Open to correct or confirm.
        </p>
      </div>
    </Link>
  );
}
