'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api/client';
import { RmListPage } from '@/components/rm/rm-list-page';
import { Button } from '@/components/ui/button';

export default function RmShiftsPage() {
  const qc = useQueryClient();
  const review = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.reviewRmShift(id, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rm-shifts'] });
      toast.success('Shift reviewed');
    },
  });

  return (
    <RmListPage
      title="Shift Logs"
      description="GPS check-in/out approval and fraud flags"
      queryKey={['rm-shifts']}
      queryFn={() => api.getRmShifts('PENDING')}
      emptyMessage="No pending shifts"
      renderItem={(log) => {
        const staff = log.staff as Record<string, string> | undefined;
        return (
          <div key={String(log.id)} className="glass-card flex items-center justify-between rounded-lg p-4">
            <div>
              <p className="font-semibold">{staff?.staff_code}</p>
              <p className="text-sm text-muted-foreground">{String(log.shift_date)}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => review.mutate({ id: String(log.id), action: 'APPROVED' })}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => review.mutate({ id: String(log.id), action: 'FLAGGED' })}
              >
                Flag
              </Button>
            </div>
          </div>
        );
      }}
    />
  );
}
