'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api/client';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { PlacementCard, ExitPlacementModal, daysLeft, type Placement } from '@/components/rm/placement-card';

/**
 * Placements still on trial, soonest-ending first. Reads the same placement list
 * as the Placements page (it used to read /rm/trials, whose raw camelCase rows
 * this page couldn't render — no names, and every end date showed as "—").
 */
export default function RmTrialsPage() {
  const qc = useQueryClient();
  const [exiting, setExiting] = useState<Placement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['rm-trials'],
    queryFn: () => api.getPlacements({ status: 'TRIAL', limit: 100 }),
    refetchInterval: 30_000,
  });
  const trials: Placement[] = [...(data?.items ?? [])].sort(
    (a: Placement, b: Placement) => (daysLeft(a.trial_end_date) ?? 999) - (daysLeft(b.trial_end_date) ?? 999),
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['rm-trials'] });
    qc.invalidateQueries({ queryKey: ['placements'] });
  };

  const confirm = useMutation({
    mutationFn: (id: string) => api.confirmPlacement(id),
    onSuccess: () => {
      toast.success('Placement confirmed — staff can now check in.');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'Confirm failed'),
  });

  const exit = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api.exitPlacement(id, body),
    onSuccess: () => {
      toast.success('Trial exited.');
      setExiting(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'Exit failed'),
  });

  return (
    <div className="page-padding max-w-4xl mx-auto space-y-4">
      <RmPageHeader title="Trial Monitor" description="Placements on trial — confirm once A2 and A3 are sent, or exit" />
      {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Loading trials…</p>}
      {!isLoading && trials.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No active trials</p>
      )}
      <div className="space-y-3">
        {trials.map((p) => (
          <PlacementCard
            key={p.id}
            p={p}
            confirmingId={confirm.isPending ? (confirm.variables as string) : null}
            onConfirm={(id) => confirm.mutate(id)}
            onExit={setExiting}
          />
        ))}
      </div>
      {exiting && (
        <ExitPlacementModal
          placement={exiting}
          onClose={() => setExiting(null)}
          onExit={(id, body) => exit.mutateAsync({ id, body })}
          exiting={exit.isPending}
        />
      )}
    </div>
  );
}
