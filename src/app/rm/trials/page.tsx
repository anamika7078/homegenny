'use client';

import { api } from '@/lib/api/client';
import { RmListPage } from '@/components/rm/rm-list-page';
import { fDate } from '@/lib/utils/format';

export default function RmTrialsPage() {
  return (
    <RmListPage
      title="Trial Monitor"
      description="Active trial placements — confirm, extend, or exit"
      queryKey={['rm-trials']}
      queryFn={() => api.getRmTrials()}
      emptyMessage="No active trials"
      renderItem={(p) => (
        <div key={String(p.id)} className="glass-card flex items-center justify-between rounded-lg p-4">
          <div>
            <p className="font-semibold">Placement {String(p.id).slice(0, 8)}</p>
            <p className="text-sm text-muted-foreground">
              Trial ends {p.trial_end_date ? fDate(String(p.trial_end_date)) : '—'}
            </p>
          </div>
          <span className="rounded bg-amber-500/15 px-2 py-1 text-xs text-amber-400">TRIAL</span>
        </div>
      )}
    />
  );
}
