'use client';

import Link from 'next/link';
import { useRmStaffList } from '@/lib/rm/hooks';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { TableSkeleton } from '@/components/ui/loading';
import { SERIES_LABELS } from '@/lib/rm/constants';
import { Button } from '@/components/ui/button';

export default function RmStaffListPage() {
  const { data, isLoading } = useRmStaffList({ limit: 200 });
  const items =
    (data as { data?: { items?: unknown[] } })?.data?.items ??
    (data as { items?: unknown[] })?.items ??
    [];

  return (
    <div className="p-6">
      <RmPageHeader
        title="Staff Management"
        description="Assigned staff — branch isolated"
        actions={
          <Link href="/rm/staff/new">
            <Button>Add Staff</Button>
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
                  <td className="p-3">{s.pipeline_stage}</td>
                  <td className="p-3 text-right">
                    <Link href={`/rm/staff/${s.id}`} className="text-primary hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
