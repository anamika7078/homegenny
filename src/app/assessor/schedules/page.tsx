'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Calendar, Car, Video, Clock, Loader2, CheckCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const TYPE_STYLE: Record<string, string> = {
  DRIVER: 'bg-info/10 text-info border-info/25',
  SC:     'bg-violet/10 text-violet border-violet/25',
};

const TYPE_ICON: Record<string, React.ElementType> = {
  DRIVER: Car,
  SC:     Video,
};

export default function AssessmentSchedules() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['assessor-schedules'],
    queryFn: () => api.getAssessorSchedules(),
    refetchInterval: 60_000,
  });

  const rows: any[] = Array.isArray(data) ? data : (data as any)?.data ?? [];

  // Group by date
  const grouped = rows.reduce<Record<string, any[]>>((acc, row) => {
    const dateKey = new Date(row.created_at).toLocaleDateString('en-IN', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(row);
    return acc;
  }, {});

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Assessment Schedules</h1>
          <p className="text-sm text-secondary-foreground mt-1">
            {isLoading ? 'Loading…' : `${rows.length} upcoming slot${rows.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/25 px-3 py-2 rounded-xl">
          <Calendar className="h-3.5 w-3.5" /> Live Schedule
        </div>
      </div>

      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {isError && !isLoading && (
        <div className="rounded-2xl border border-danger/25 bg-danger/5 p-6 text-center text-sm text-danger">
          Could not load schedules. Ensure the API is running.
        </div>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <CheckCircle className="h-10 w-10 text-success/50" />
          <p className="text-sm font-semibold text-white">No upcoming schedules</p>
          <p className="text-xs text-secondary-foreground">All slots are clear for now.</p>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel} className="rounded-2xl border border-white/[0.06] bg-[#0E1320] overflow-hidden">
              {/* Date header */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold text-white">{dateLabel}</span>
                <span className="ml-auto text-[10px] font-bold text-secondary-foreground bg-white/[0.04] px-2 py-0.5 rounded-full">
                  {items.length} slot{items.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Slots */}
              <div className="divide-y divide-white/[0.04]">
                {items.map((row: any) => {
                  const IconComp = TYPE_ICON[row.assessment_type] ?? Car;
                  const typeCls = TYPE_STYLE[row.assessment_type] ?? TYPE_STYLE.DRIVER;
                  return (
                    <div key={row.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                      {/* Type badge */}
                      <div className={cn('rounded-xl border px-2.5 py-1.5 flex items-center gap-1.5', typeCls)}>
                        <IconComp className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">
                          {row.assessment_type === 'DRIVER' ? 'Driver' : 'SC'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {row.full_name ?? 'Unknown Candidate'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-secondary-foreground">
                          <span>{row.staff_code ?? row.candidate_id?.slice(0, 8)}</span>
                          <span>·</span>
                          <span>{row.series}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1 text-secondary-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(row.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {row.attempt_number > 1 && (
                          <span className="flex items-center gap-1 text-warning font-semibold">
                            <RotateCcw className="h-3 w-3" /> #{row.attempt_number}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
