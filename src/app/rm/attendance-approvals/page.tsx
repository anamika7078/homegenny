'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api/client';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/loading';

interface Day {
  id: string;
  date: string;
  staff_name: string;
  staff_code: string;
  client_name: string | null;
  status: string;
  check_in_ist: string | null;
  check_out_ist: string | null;
  client_status: string;
  client_note: string | null;
  deemed_at: string | null;
}

const items = (r: any): Day[] => (r?.data?.items ?? r?.items ?? []) as Day[];
const field = 'rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-foreground';
const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const times = (d: Day) => (d.check_in_ist ? `${d.check_in_ist}${d.check_out_ist ? `–${d.check_out_ist}` : ' (still in)'}` : 'no check-in time');

/** One disputed day: what the client said, and the RM's decision. */
function DisputeRow({ d }: { d: Day }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState('PRESENT');
  const [note, setNote] = useState('');
  const resolve = useMutation({
    mutationFn: () => api.resolveAttendanceDispute(d.id, { status, note: note.trim() }),
    onSuccess: () => {
      toast.success(`${d.staff_name} on ${fmtDay(d.date)}: resolved — client and staff told.`);
      qc.invalidateQueries({ queryKey: ['rm-attendance-disputes'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">
          {d.staff_name} <span className="text-xs font-mono text-muted-foreground">{d.staff_code}</span>
          <span className="text-muted-foreground"> · {d.client_name ?? 'Client'} · {fmtDay(d.date)} · {times(d)}</span>
        </p>
      </div>
      <p className="text-sm text-rose-200">Client says: “{d.client_note ?? '—'}”</p>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor={`res-status-${d.id}`} className="mb-1 block text-xs text-muted-foreground">The day really was</label>
          <select id={`res-status-${d.id}`} value={status} onChange={(e) => setStatus(e.target.value)} className={field}>
            <option value="PRESENT">Present</option>
            <option value="HALF_DAY">Half day</option>
            <option value="ABSENT">Absent</option>
          </select>
        </div>
        <div className="flex-1 min-w-[220px]">
          <label htmlFor={`res-note-${d.id}`} className="mb-1 block text-xs text-muted-foreground">How you resolved it</label>
          <input id={`res-note-${d.id}`} value={note} onChange={(e) => setNote(e.target.value)} className={`${field} w-full`}
            placeholder="e.g. Called the client and the staff — she came at 2 pm" />
        </div>
        <Button disabled={note.trim().length < 5 || resolve.isPending} onClick={() => resolve.mutate()}>
          {resolve.isPending ? 'Saving…' : 'Resolve'}
        </Button>
      </div>
    </div>
  );
}

/**
 * Staff-app attendance the client has to confirm. Disputes come here for the
 * RM to settle (the day is not paid or billed until then); for a client who
 * does not use the app, the RM records their confirmation with how it was given.
 */
export default function AttendanceApprovalsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'disputes' | 'waiting'>('disputes');
  const disputes = useQuery({ queryKey: ['rm-attendance-disputes'], queryFn: () => api.getRmAttendanceDisputes() });
  const waiting = useQuery({ queryKey: ['rm-attendance-waiting'], queryFn: () => api.getRmAwaitingClient() });
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');

  const waitingDays = items(waiting.data);
  const byClient = useMemo(() => {
    const m = new Map<string, Day[]>();
    for (const d of waitingDays) m.set(d.client_name ?? 'Client', [...(m.get(d.client_name ?? 'Client') ?? []), d]);
    return [...m.entries()];
  }, [waitingDays]);

  const onBehalf = useMutation({
    mutationFn: () => api.approveAttendanceOnBehalf({ ids: [...picked], note: note.trim() }),
    onSuccess: (r: any) => {
      toast.success(`${r?.approved ?? r?.data?.approved ?? picked.size} day(s) confirmed for the client.`);
      setPicked(new Set());
      setNote('');
      qc.invalidateQueries({ queryKey: ['rm-attendance-waiting'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) => setPicked((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const disputeDays = items(disputes.data);

  return (
    <div className="page-padding max-w-4xl mx-auto space-y-6">
      <RmPageHeader
        title="Attendance approvals"
        description="Staff-app days the client confirms. A disputed day is not paid or billed until you resolve it."
      />
      <div className="flex gap-2">
        {([
          ['disputes', `Disputes (${disputeDays.length})`],
          ['waiting', `Waiting on client (${waitingDays.length})`],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full border px-3 py-1 text-sm font-semibold ${tab === k ? 'border-[#FF5A1F] bg-[#FF5A1F]/15 text-foreground' : 'border-white/10 text-muted-foreground hover:bg-white/5'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'disputes' && (
        disputes.isLoading ? <TableSkeleton rows={3} /> : disputeDays.length === 0 ? (
          <p className="text-sm text-muted-foreground">No disputed days.</p>
        ) : (
          <div className="space-y-3">{disputeDays.map((d) => <DisputeRow key={d.id} d={d} />)}</div>
        )
      )}

      {tab === 'waiting' && (
        waiting.isLoading ? <TableSkeleton rows={4} /> : waitingDays.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting on a client.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              For clients who do not use the app. Unanswered days count as confirmed after 48 hours anyway; use this when
              the client has confirmed by phone or in person.
            </p>
            {byClient.map(([client, days]) => (
              <div key={client} className="rounded-xl border border-white/10 p-4 space-y-2">
                <p className="font-semibold">{client}</p>
                {days.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={picked.has(d.id)} onChange={() => toggle(d.id)} className="accent-[#FF5A1F]" />
                    {fmtDay(d.date)} · {d.staff_name} · {times(d)}
                  </label>
                ))}
              </div>
            ))}
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[240px]">
                <label htmlFor="on-behalf-note" className="mb-1 block text-xs text-muted-foreground">How the client confirmed</label>
                <input id="on-behalf-note" value={note} onChange={(e) => setNote(e.target.value)} className={`${field} w-full`}
                  placeholder="e.g. Confirmed on the phone with Mrs. Sharma" />
              </div>
              <Button disabled={!picked.size || note.trim().length < 5 || onBehalf.isPending} onClick={() => onBehalf.mutate()}>
                {onBehalf.isPending ? 'Saving…' : `Confirm ${picked.size || ''} for the client`}
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
