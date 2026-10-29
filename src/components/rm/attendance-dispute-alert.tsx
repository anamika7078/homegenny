'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api/client';

/**
 * Shown only when a client has disputed a staff-app day on one of the RM's
 * placements. The day is not paid or billed until the RM resolves it.
 */
export function AttendanceDisputeAlert() {
  const { data } = useQuery({ queryKey: ['rm-attendance-disputes'], queryFn: () => api.getRmAttendanceDisputes() });
  const days = ((data as any)?.items ?? (data as any)?.data?.items ?? []) as { staff_name: string; date: string }[];
  if (!days.length) return null;
  return (
    <Link
      href="/rm/attendance-approvals"
      className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 hover:bg-amber-500/15"
    >
      <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-400" />
      <div className="text-sm">
        <p className="font-semibold text-amber-300">
          {days.length} attendance day{days.length === 1 ? '' : 's'} disputed by clients
        </p>
        <p className="text-amber-200/80">Not paid or billed until you resolve {days.length === 1 ? 'it' : 'them'}. Open to decide.</p>
      </div>
    </Link>
  );
}
