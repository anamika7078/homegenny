'use client';

import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/loading';
import { api } from '@/lib/api/client';
import { format } from 'date-fns';

export default function AuditLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit', 'logs'],
    queryFn: () => api.getAuditLogs({ limit: 30 }),
  });

  const payload = (data as { data?: { items?: Array<Record<string, unknown>> } })?.data ?? data;
  const items = (payload as { items?: Array<Record<string, unknown>> })?.items ?? [];

  return (
    <AppShell>
      <div className="page-padding max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-sm text-secondary-foreground mt-1">
            Login · stage transitions · agreements · scenarios
          </p>
        </div>
        {isLoading ? (
          <Spinner />
        ) : (
          <div className="space-y-2">
            {items.length === 0 ? (
              <p className="text-sm text-secondary-foreground">No audit entries yet. Run enterprise migration.</p>
            ) : (
              items.map((log) => (
                <Card key={String(log.id)} className="bg-card border-border/50">
                  <CardContent className="p-4 flex justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{String(log.action)}</p>
                      <p className="text-xs text-secondary-foreground">
                        {String(log.entityType ?? '')} {String(log.entityId ?? '').slice(0, 8)}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground shrink-0">
                      {log.createdAt
                        ? format(new Date(String(log.createdAt)), 'dd MMM HH:mm')
                        : '—'}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
