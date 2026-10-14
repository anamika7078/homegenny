'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, Clock, Inbox } from 'lucide-react';
import { api } from '@/lib/api/client';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { REQUEST_STATUS, SOURCE_LABEL, type StaffRequestStatus } from '@/lib/staff-requests';

const TABS: { key: string; label: string; status?: string; open?: boolean }[] = [
  { key: 'open', label: 'Open', open: true },
  { key: 'NEW,ASSIGNED', label: 'To shortlist', status: 'NEW,ASSIGNED' },
  { key: 'SHORTLISTED', label: 'With client', status: 'SHORTLISTED' },
  { key: 'CLIENT_SELECTED', label: 'To place', status: 'CLIENT_SELECTED' },
  { key: 'FULFILLED', label: 'Fulfilled', status: 'FULFILLED' },
  { key: 'CANCELLED', label: 'Cancelled', status: 'CANCELLED' },
];

interface Row {
  id: string;
  request_no: string;
  status: StaffRequestStatus;
  source: string;
  series: string;
  placement_type: string;
  shift_hours: number;
  start_date: string | null;
  start_time: string | null;
  visit_type?: string;
  duration_min?: number | null;
  headcount: number;
  client_name: string | null;
  lead: { name: string; phone: string; city: string | null } | null;
  rm_name: string | null;
  branch_name: string | null;
  created_at: string;
  age_hours: number;
  sla_breached: boolean;
  candidate_counts: Record<string, number>;
}

function age(hours: number) {
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Staff requests — what clients (app) and RMs (here) have asked for. An RM sees
 * their own plus the unassigned ones in their branch; a BM the branch; Admin all.
 */
export default function StaffRequestsPage() {
  const [tab, setTab] = useState(TABS[0]);
  const { data, isLoading } = useQuery({
    queryKey: ['staff-requests', tab.key],
    queryFn: () => api.listStaffRequests(tab.open ? { open: 'true' } : { status: tab.status }),
    refetchInterval: 30_000,
  });
  const items: Row[] = data?.items ?? [];
  const breached = items.filter((i) => i.sla_breached).length;

  return (
    <div className="page-padding max-w-5xl mx-auto space-y-4">
      <RmPageHeader
        title="Staff Requests"
        description="Clients asking for staff — shortlist, let the client choose, then place"
        actions={
          <Link href="/rm/requests/new">
            <Button className="gap-2"><Plus className="h-4 w-4" />New request</Button>
          </Link>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              tab.key === t.key
                ? 'bg-[#FF6B00] text-white'
                : 'border border-white/10 bg-card/30 text-secondary-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {breached > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <Clock className="h-4 w-4 shrink-0" />
          {breached} request{breached === 1 ? '' : 's'} waiting over 24 hours with no shortlist
        </div>
      )}

      {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && items.length === 0 && (
        <div className="py-16 text-center">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No requests here</p>
        </div>
      )}

      <div className="space-y-2">
        {items.map((r) => {
          const st = REQUEST_STATUS[r.status];
          const proposed = (r.candidate_counts.PROPOSED ?? 0) + (r.candidate_counts.CLIENT_SELECTED ?? 0);
          return (
            <Link
              key={r.id}
              href={`/rm/requests/${r.id}`}
              className="glass-card block rounded-lg p-4 transition-colors hover:border-white/20"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{r.request_no}</span>
                    <span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] font-bold">{r.series}</span>
                    <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-bold', st.cls)}>{st.label}</span>
                    {r.sla_breached && (
                      <span className="rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                        Over 24h
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 truncate font-semibold">
                    {r.client_name ?? r.lead?.name ?? '—'}
                    {!r.client_name && r.lead && <span className="ml-2 text-xs font-normal text-amber-300">Lead · no account</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.headcount > 1 ? `${r.headcount} staff · ` : ''}
                    {r.visit_type === 'ONE_TIME'
                      ? `One-time visit · ${(r.duration_min ?? 0) / 60}h${r.start_date ? ` · ${r.start_date}${r.start_time ? ` ${r.start_time}` : ''}` : ''}`
                      : <>{r.placement_type === 'TEMPORARY' ? 'Hourly' : 'Permanent'} · {r.shift_hours}h
                        {r.start_date ? ` · from ${r.start_date}${r.start_time ? ` ${r.start_time}` : ''}` : ''}</>}
                    {' · '}{SOURCE_LABEL[r.source] ?? r.source}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{age(r.age_hours)}</p>
                  <p className="mt-0.5">{r.rm_name ?? 'No RM'}{r.branch_name ? ` · ${r.branch_name}` : ''}</p>
                  {proposed > 0 && <p className="mt-0.5 text-sky-300">{proposed} on shortlist</p>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
