'use client';

import { api } from '@/lib/api/client';
import { RmListPage } from '@/components/rm/rm-list-page';

export default function RmUpgradesPage() {
  return (
    <RmListPage
      title="Upgrade Tracker"
      description="Maid → UC and UC → SC eligibility workflows"
      queryKey={['rm-upgrades']}
      queryFn={() => api.getRmUpgrades()}
      emptyMessage="No upgrade requests"
      renderItem={(u) => {
        const staff = u.staff as Record<string, string> | undefined;
        return (
          <div key={String(u.id)} className="glass-card rounded-lg p-4">
            <p className="font-semibold">{staff?.staff_code}</p>
            <p className="text-sm text-muted-foreground">
              {String(u.from_series)} → {String(u.to_series)} · {String(u.status)}
            </p>
          </div>
        );
      }}
    />
  );
}
