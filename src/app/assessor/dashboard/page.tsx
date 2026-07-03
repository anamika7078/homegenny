'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth.store';
import {
  Clock, CheckCircle, AlertTriangle, Users,
  Video, Car, Loader2
} from 'lucide-react';

function StatCard({
  label, value, icon: Icon, accent = 'text-primary', loading = false
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0E1320] p-5 flex items-start gap-4 hover:border-white/[0.12] transition-all duration-200">
      <div className={`rounded-xl p-2.5 bg-white/[0.04] ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-secondary-foreground">{label}</p>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-white/40 mt-1" />
        ) : (
          <p className="text-3xl font-bold text-white font-mono mt-0.5">{value}</p>
        )}
      </div>
    </div>
  );
}

function QueueCard({
  title, icon: Icon, items, loading
}: {
  title: string;
  icon: React.ElementType;
  items: any[];
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0E1320] p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {!loading && items.length > 0 && (
          <span className="ml-auto text-[10px] font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center">
          <CheckCircle className="h-8 w-8 text-success/50 mx-auto mb-2" />
          <p className="text-xs text-secondary-foreground">Queue is clear</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {items.map((item: any) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-[#090D1A] px-3 py-2.5 text-xs"
            >
              <div>
                <p className="font-semibold text-white">{item.full_name ?? item.candidate_id?.slice(0, 8)}</p>
                <p className="text-secondary-foreground mt-0.5">{item.series} · Attempt #{item.attempt_number}</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AssessorDashboard() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['assessor-dashboard'],
    queryFn: () => api.getAssessorDashboard(),
    refetchInterval: 60_000,
  });

  const body = (data as any)?.data ?? data ?? {};
  const kpis = body?.kpis ?? {};
  const driverQueue: any[] = body?.driverQueue ?? [];
  const scQueue: any[] = body?.scQueue ?? [];

  return (
    <div className="page-padding">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Assessor Dashboard</h1>
        <p className="text-sm text-secondary-foreground mt-1">
          Welcome, {user?.full_name ?? 'Assessor'}. Live assessment overview below.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 sm:mb-8 lg:grid-cols-4">
        <StatCard
          label="Pending Assessments"
          value={kpis.pending_assessments ?? 0}
          icon={Clock}
          accent="text-warning"
          loading={isLoading}
        />
        <StatCard
          label="Completed Today"
          value={kpis.completed_today ?? 0}
          icon={CheckCircle}
          accent="text-success"
          loading={isLoading}
        />
        <StatCard
          label="Deferred Candidates"
          value={kpis.deferred_candidates ?? 0}
          icon={AlertTriangle}
          accent="text-danger"
          loading={isLoading}
        />
        <StatCard
          label="Re-assessment Queue"
          value={kpis.reassessment_queue ?? 0}
          icon={Users}
          accent="text-violet"
          loading={isLoading}
        />
      </div>

      {/* Driver & SC Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QueueCard
          title="Driver Test Queue"
          icon={Car}
          items={driverQueue}
          loading={isLoading}
        />
        <QueueCard
          title="SC Competency Queue"
          icon={Video}
          items={scQueue}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
