'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { HeartPulse, ChefHat, Ban } from 'lucide-react';
import { api } from '@/lib/api/client';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface Row {
  placement_id: string;
  staff: { id: string; name: string; series: string };
  client: { id: string; name: string };
  health: 'RED' | 'AMBER' | 'GREEN';
  flags: string[];
  care?: {
    plan_version: number | null;
    plan_read: boolean | null;
    today: { total: number; done: number; missed: number };
    missed_doses_7d: number;
    vital_alerts_7d: number;
    report_today: boolean;
  };
  cook?: { rating: { avg_7d: number | null; count_7d: number }; meals_logged_today: number };
  instructions: { unread: number; refused_open: number };
}

const HEALTH: Record<Row['health'], { dot: string; label: string }> = {
  RED: { dot: 'bg-rose-500', label: 'Needs attention' },
  AMBER: { dot: 'bg-amber-400', label: 'Keep an eye' },
  GREEN: { dot: 'bg-emerald-500', label: 'All good' },
};

/**
 * Daily care at a glance — one row per active caretaker or cook placement:
 * today's checklist, missed doses, readings out of range, the cook's rating,
 * instructions waiting. Worst first.
 */
export default function CareCompliancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['care-compliance'],
    queryFn: () => api.getCareCompliance(),
    refetchInterval: 60_000,
  });
  const items: Row[] = data?.items ?? [];
  const counts = data?.counts ?? { RED: 0, AMBER: 0, GREEN: 0 };

  return (
    <div className="page-padding max-w-5xl mx-auto space-y-4">
      <RmPageHeader
        title="Daily Care"
        description="Medicines, readings, meals and instructions across your households"
        actions={
          <Link href="/rm/care/refused">
            <Button variant="outline" className="gap-2"><Ban className="h-4 w-4" />Refused instructions</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        {(['RED', 'AMBER', 'GREEN'] as const).map((h) => (
          <div key={h} className="rounded-xl border border-white/10 bg-card/40 p-4">
            <div className="flex items-center gap-2">
              <span className={cn('h-2.5 w-2.5 rounded-full', HEALTH[h].dot)} />
              <span className="text-xs text-muted-foreground">{HEALTH[h].label}</span>
            </div>
            <p className="mt-1 text-2xl font-bold">{counts[h]}</p>
          </div>
        ))}
      </div>

      {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && items.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">No active caretaker or cook placements.</p>
      )}

      <div className="space-y-2">
        {items.map((r) => {
          const isCook = !!r.cook;
          return (
            <Link key={r.placement_id} href={`/rm/care/${r.placement_id}`} className="glass-card block rounded-lg p-4 hover:border-white/20">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', HEALTH[r.health].dot)} />
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {r.client.name}
                      <span className="ml-2 text-sm font-normal text-muted-foreground">· {r.staff.name}</span>
                    </p>
                    {r.flags.length > 0 ? (
                      <p className="mt-0.5 text-xs text-amber-200/90">{r.flags.join(' · ')}</p>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted-foreground">Nothing to flag</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {isCook ? (
                    <span className="flex items-center gap-1">
                      <ChefHat className="h-3.5 w-3.5" />
                      {r.cook!.rating.avg_7d !== null ? `${r.cook!.rating.avg_7d}/5` : 'no ratings'} · {r.cook!.meals_logged_today} meals today
                    </span>
                  ) : r.care ? (
                    <span className="flex items-center gap-1">
                      <HeartPulse className="h-3.5 w-3.5" />
                      {r.care.today.done}/{r.care.today.total} today
                      {r.care.plan_version === null ? ' · no plan' : ''}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
