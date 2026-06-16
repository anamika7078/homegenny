'use client';

import Link from 'next/link';
import { api } from '@/lib/api/client';
import { RmListPage } from '@/components/rm/rm-list-page';

export default function RmTerminalPage() {
  return (
    <RmListPage
      title="Terminal Cases"
      description="Final outcomes — placed, rejected, restricted, abandoned"
      queryKey={['rm-terminal']}
      queryFn={() => api.getRmTerminal()}
      emptyMessage="No terminal records"
      renderItem={(s) => (
        <Link
          key={String(s.id)}
          href={`/staff/${s.id}`}
          className="glass-card block rounded-lg p-4 hover:border-primary/30"
        >
          <p className="font-semibold">{String(s.staff_code)}</p>
          <p className="text-sm text-muted-foreground">
            {String(s.series)} · {String(s.terminal_outcome ?? s.current_scenario_code ?? 'TERMINAL')}
          </p>
        </Link>
      )}
    />
  );
}
