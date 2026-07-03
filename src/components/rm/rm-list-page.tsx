'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { RmPageHeader } from './rm-page-header';
import { TableSkeleton } from '@/components/ui/loading';

interface RmListPageProps {
  title: string;
  description?: string;
  queryKey: string[];
  queryFn: () => Promise<unknown>;
  renderItem: (item: Record<string, unknown>) => React.ReactNode;
  emptyMessage?: string;
}

export function RmListPage({
  title,
  description,
  queryKey,
  queryFn,
  renderItem,
  emptyMessage = 'No records found',
}: RmListPageProps) {
  const { data, isLoading } = useQuery({ queryKey, queryFn });
  const items = Array.isArray(data)
    ? data
    : ((data as { data?: unknown[] })?.data ?? (data as { items?: unknown[] })?.items ?? []);

  return (
    <div className="page-padding">
      <RmPageHeader title={title} description={description} />
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : items.length === 0 ? (
        <div className="glass-card rounded-xl py-16 text-center text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">{items.map((item) => renderItem(item as Record<string, unknown>))}</div>
      )}
    </div>
  );
}
