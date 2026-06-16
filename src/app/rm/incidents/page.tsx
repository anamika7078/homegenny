'use client';

import { api } from '@/lib/api/client';
import { RmListPage } from '@/components/rm/rm-list-page';

export default function RmIncidentsPage() {
  return (
    <RmListPage
      title="Incidents"
      description="Complaints, misconduct, safety, attendance fraud"
      queryKey={['rm-incidents']}
      queryFn={() => api.getRmIncidents()}
      emptyMessage="No open incidents"
      renderItem={(i) => (
        <div key={String(i.id)} className="glass-card rounded-lg p-4">
          <div className="flex justify-between gap-2">
            <p className="font-semibold">{String(i.title)}</p>
            <span className="text-xs uppercase text-destructive">{String(i.status)}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{String(i.type)}</p>
        </div>
      )}
    />
  );
}
