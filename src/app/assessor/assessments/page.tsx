'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useRouter } from 'next/navigation';
import { Car, Video, Clock, RotateCcw, ChevronRight, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  DRIVER: { label: 'Driver Test',     color: 'text-info',    icon: Car   },
  SC:     { label: 'SC Competency',   color: 'text-violet',  icon: Video },
};

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  PENDING:   { label: 'Pending',   badge: 'bg-warning/15 text-warning'  },
  COMPLETED: { label: 'Completed', badge: 'bg-success/15 text-success'  },
  DEFERRED:  { label: 'Deferred',  badge: 'bg-danger/15 text-danger'    },
};

export default function AssessmentsQueue() {
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['assessor-assessments'],
    queryFn: () => api.getAssessorAssessments(),
    refetchInterval: 30_000,
  });

  const rows: any[] = Array.isArray(data)
    ? data
    : (data as any)?.data ?? [];

  const drivers = rows.filter((r) => r.assessment_type === 'DRIVER');
  const sc = rows.filter((r) => r.assessment_type === 'SC');

  return (
    <>
      <div className="flex items-center justify-between mb-8 pt-2 pb-2">
        <div className="px-1">
          <h1 className="text-2xl font-bold text-white">Assessment Queue</h1>
          <p className="text-sm text-secondary-foreground mt-2">
            {isLoading ? 'Loading…' : `${rows.length} pending assessment${rows.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/assessor/assessments/driver')}
            className="flex items-center gap-2 rounded-xl bg-info/10 border border-info/25 px-4 py-2 text-xs font-bold text-info hover:bg-info/20 transition-colors"
          >
            <Car className="h-3.5 w-3.5" /> Driver Test
          </button>
          <button
            onClick={() => router.push('/assessor/assessments/sc')}
            className="flex items-center gap-2 rounded-xl bg-violet/10 border border-violet/25 px-4 py-2 text-xs font-bold text-violet hover:bg-violet/20 transition-colors"
          >
            <Video className="h-3.5 w-3.5" /> SC Competency
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {isError && !isLoading && (
        <div className="rounded-2xl border border-danger/25 bg-danger/5 p-6 text-center text-sm text-danger">
          Could not load assessments. Ensure the API is running.
        </div>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <CheckCircle className="h-10 w-10 text-success/50" />
          <p className="text-sm font-semibold text-white">Queue is clear</p>
          <p className="text-xs text-secondary-foreground">No pending assessments at this time.</p>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="space-y-6">
          {/* Driver Test section */}
          {drivers.length > 0 && (
            <Section title="Driver Tests" icon={Car} color="text-info" rows={drivers} router={router} />
          )}
          {/* SC Competency section */}
          {sc.length > 0 && (
            <Section title="SC Competency" icon={Video} color="text-violet" rows={sc} router={router} />
          )}
        </div>
      )}
    </>
  );
}

function Section({
  title, icon: Icon, color, rows, router
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  rows: any[];
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0E1320] overflow-hidden">
      <div className={cn('flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]', color)}>
        <Icon className="h-4 w-4" />
        <h2 className="text-sm font-bold">{title}</h2>
        <span className="ml-auto text-[10px] font-bold bg-white/[0.04] px-2 py-0.5 rounded-full text-secondary-foreground">
          {rows.length}
        </span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {rows.map((row) => {
          const statusCfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.PENDING;
          return (
            <div key={row.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group cursor-pointer"
              onClick={() => router.push(`/assessor/assessments/${row.id}`)}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{row.full_name ?? 'Unknown Candidate'}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-secondary-foreground">
                  <span>{row.staff_code ?? row.candidate_id?.slice(0, 8)}</span>
                  <span>·</span>
                  <span>{row.series}</span>
                  {row.attempt_number > 1 && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5 text-warning">
                        <RotateCcw className="h-2.5 w-2.5" /> Attempt #{row.attempt_number}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[10px] text-secondary-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </span>
                <span className={cn('text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full', statusCfg.badge)}>
                  {statusCfg.label}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-white/20 group-hover:text-white/60 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
