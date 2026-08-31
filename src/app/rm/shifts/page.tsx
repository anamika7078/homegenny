'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api/client';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/loading';

const STATUS_FILTERS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'FLAGGED', label: 'Flagged' },
  { value: '', label: 'All' },
];

function ShiftRow({ log }: { log: Record<string, unknown> }) {
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState<'APPROVED' | 'REJECTED' | 'FLAGGED' | null>(null);
  const qc = useQueryClient();

  const review = useMutation({
    mutationFn: (action: 'APPROVED' | 'REJECTED' | 'FLAGGED') =>
      api.reviewRmShift(String(log.id), { action, notes: notes || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rm-shifts'] });
      toast.success('Shift reviewed');
      setShowNotes(null);
      setNotes('');
    },
    onError: (e: Error) => toast.error(e.message || 'Review failed'),
  });

  const staff = log.staff as Record<string, string> | undefined;

  return (
    <div className="glass-card rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">{staff?.staffCode ?? staff?.staff_code}</p>
          <p className="text-sm text-muted-foreground">{String(log.shift_date ?? log.shiftDate ?? '')}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowNotes(showNotes === 'APPROVED' ? null : 'APPROVED')}>
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowNotes(showNotes === 'REJECTED' ? null : 'REJECTED')}>
            Reject
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowNotes(showNotes === 'FLAGGED' ? null : 'FLAGGED')}>
            Flag
          </Button>
        </div>
      </div>
      {showNotes && (
        <div className="flex gap-2">
          <input
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF5A1F]/50"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button size="sm" disabled={review.isPending} onClick={() => review.mutate(showNotes)}>
            {review.isPending ? 'Saving…' : `Confirm ${showNotes.charAt(0) + showNotes.slice(1).toLowerCase()}`}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function RmShiftsPage() {
  const [status, setStatus] = useState('PENDING');
  const { data, isLoading } = useQuery({
    queryKey: ['rm-shifts', status],
    queryFn: () => api.getRmShifts(status || undefined),
  });
  const items = Array.isArray(data) ? data : ((data as { data?: unknown[] })?.data ?? []);

  return (
    <div className="page-padding">
      <RmPageHeader title="Shift Logs" description="GPS check-in/out approval and fraud flags" />
      <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/8 w-fit mb-4">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              status === f.value ? 'bg-[#FF5A1F] text-white shadow' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : items.length === 0 ? (
        <div className="glass-card rounded-xl py-16 text-center text-muted-foreground">No shifts found</div>
      ) : (
        <div className="space-y-3">
          {(items as Record<string, unknown>[]).map((log) => (
            <ShiftRow key={String(log.id)} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}
