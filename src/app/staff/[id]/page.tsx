'use client';

import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { format } from 'date-fns';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/loading';
import { StatusBadge } from '@/components/ui/status-badge';
import { api } from '@/lib/api/client';
import { useRealtimeAlerts } from '@/hooks/use-realtime';
import toast from 'react-hot-toast';
import { ArrowLeft, GitBranch, FileText } from 'lucide-react';

function stageTone(stage: string): 'pending' | 'in_progress' | 'approved' | 'denied' | 'escalated' {
  if (stage?.includes('TERMINAL')) return 'denied';
  if (stage?.includes('S5')) return 'approved';
  if (stage?.includes('S2')) return 'in_progress';
  if (stage?.includes('S4')) return 'pending';
  return 'in_progress';
}

export default function StaffProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useRealtimeAlerts();

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff', id],
    queryFn: () => api.getStaff(id),
    enabled: !!id,
  });

  const { data: timeline } = useQuery({
    queryKey: ['staff', id, 'timeline'],
    queryFn: () => api.getStaffTimeline(id),
    enabled: !!id,
  });

  const s = (staff as { data?: Record<string, unknown> })?.data ?? staff;
  const events =
  (timeline as { data?: { events?: Array<Record<string, unknown>> } })?.data?.events ??
  (timeline as { events?: Array<Record<string, unknown>> })?.events ??
  [];

  const driverCheck = useMutation({
    mutationFn: (dl: string) => api.driverVerifyApis(id, dl),
    onSuccess: () => toast.success('Sarathi + eChallan checks completed'),
    onError: (e: Error) => toast.error(e.message),
  });

  const upgrade = useMutation({
    mutationFn: () => api.upgradeUcToSc(id, 'RM requested upgrade path'),
    onSuccess: () => toast.success('UC→SC upgrade initiated'),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !s) {
    return (
      <AppShell>
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      </AppShell>
    );
  }

  const series = String(s.series ?? '');
  const stage = String(s.pipeline_stage ?? '');

  return (
    <AppShell>
      <motion.div className="p-6 max-w-5xl mx-auto space-y-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-secondary-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{String(s.full_name)}</h1>
            <p className="text-sm text-secondary-foreground mt-1">
              {String(s.staff_code)} · {series} · RM assigned
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <StatusBadge tone={stageTone(stage)}>{stage.replace(/_/g, ' ')}</StatusBadge>
            {s.current_scenario_code && (
              <StatusBadge tone="escalated">{String(s.current_scenario_code)}</StatusBadge>
            )}
          </div>
        </div>

        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase text-secondary-foreground font-bold">PV Status</p>
              <p className="text-lg font-semibold mt-1">{String(s.pv_status ?? '—')}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase text-secondary-foreground font-bold">Deposit</p>
              <p className="text-lg font-semibold mt-1">
                ₹{s.deposit_amount ?? 0} {s.deposit_paid ? '✓ Paid' : 'Pending'}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 flex gap-2">
              <Link href="/staff/pipeline" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <GitBranch className="h-4 w-4" /> Pipeline
                </Button>
              </Link>
              <Link href={`/agreements?staffId=${id}`} className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <FileText className="h-4 w-4" /> Agreements
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {(series === 'DR' || series === 'DRIVER') && (
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-secondary-foreground">DL Number (Sarathi / eChallan)</label>
                <input
                  id="dl-input"
                  className="mt-1 w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm"
                  placeholder="DL1420110012345"
                  defaultValue={(s.metadata as Record<string, string>)?.dl_number ?? ''}
                />
              </div>
              <Button
                onClick={() => {
                  const el = document.getElementById('dl-input') as HTMLInputElement;
                  driverCheck.mutate(el?.value ?? '');
                }}
                disabled={driverCheck.isPending}
              >
                Run API checks
              </Button>
            </CardContent>
          </Card>
        )}

        {(series === 'UC' || series === 'UNSKILLED_CARE') && s.pv_status === 'CLEAR' && (
          <Button onClick={() => upgrade.mutate()} disabled={upgrade.isPending}>
            Initiate UC → SC upgrade
          </Button>
        )}

        <Card className="bg-card border-border/50">
          <CardTitle className="px-6 pt-6 text-base font-bold">Activity timeline</CardTitle>
          <CardContent className="p-6">
            {events.length === 0 ? (
              <p className="text-sm text-secondary-foreground">No events yet.</p>
            ) : (
              <ul className="space-y-4 border-l border-border/50 ml-2 pl-6">
                {events.map((ev) => (
                  <li key={String(ev.id)} className="relative">
                    <span className="absolute -left-[29px] top-1.5 h-3 w-3 rounded-full bg-primary" />
                    <p className="text-sm font-semibold text-foreground">{String(ev.title)}</p>
                    <p className="text-xs text-secondary-foreground">
                      {String(ev.type)} · {String(ev.meta)} ·{' '}
                      {ev.at ? format(new Date(String(ev.at)), 'dd MMM yyyy HH:mm') : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AppShell>
  );
}
