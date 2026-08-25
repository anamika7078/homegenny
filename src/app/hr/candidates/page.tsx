'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { TableSkeleton } from '@/components/ui/loading';
import { SERIES_LABELS, STAGE_LABELS } from '@/lib/rm/constants';
import { Button } from '@/components/ui/button';
import type { PipelineStage } from '@/lib/types';

export default function HrCandidatesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['staff', 'hr', { limit: 200 }],
    queryFn: () => api.listStaff({ limit: 200 }),
  });
  const items =
    (data as { data?: { items?: unknown[] } })?.data?.items ??
    (data as { items?: unknown[] })?.items ??
    [];

  return (
    <div className="page-padding">
      <RmPageHeader
        title="Candidates"
        description="S1 intake — candidates added for the RM pipeline (verification onward is RM-owned)"
        actions={
          <Link href="/hr/candidates/new">
            <Button>Add Candidate</Button>
          </Link>
        }
      />
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-card/80 text-left text-muted-foreground">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Name</th>
                <th className="p-3">Series</th>
                <th className="p-3">Stage</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((s: any) => (
                <tr key={s.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-3 font-mono">{s.staff_code}</td>
                  <td className="p-3">{s.full_name}</td>
                  <td className="p-3">{SERIES_LABELS[s.series] ?? s.series}</td>
                  <td className="p-3">{STAGE_LABELS[s.pipeline_stage as PipelineStage] ?? s.pipeline_stage}</td>
                  <td className="p-3 text-right">
                    <Link href={`/hr/candidates/${s.id}`} className="text-primary hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No candidates yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
