'use client';

import { api } from '@/lib/api/client';
import { RmListPage } from '@/components/rm/rm-list-page';
import { fToNow } from '@/lib/utils/format';

export default function RmDeferredPage() {
  return (
    <RmListPage
      title="Deferred Cases"
      description="Auto-terminal after 90 days — resume when blockers clear"
      queryKey={['rm-deferred']}
      queryFn={() => api.getRmDeferred()}
      emptyMessage="No deferred cases"
      renderItem={(r) => {
        const staff = r.staff as Record<string, string> | undefined;
        return (
          <div key={String(r.id)} className="glass-card rounded-lg p-4">
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">{staff?.staff_code}</p>
                <p className="text-sm text-muted-foreground">{String(r.reason)}</p>
              </div>
              <span className="text-xs text-muted-foreground">
                {r.deferred_at ? fToNow(String(r.deferred_at)) : ''}
              </span>
            </div>
          </div>
        );
      }}
    />
  );
}
