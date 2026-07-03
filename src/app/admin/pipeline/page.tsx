"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from '@/lib/api/client';
import { PipelineKanban } from '@/components/rm/pipeline-kanban';
import { STAGE_LABELS } from '@/lib/rm/constants';
import type { PipelineStage } from '@/lib/types';
import {
  Activity,
  Users,
  ShieldCheck,
  GraduationCap,
  PauseCircle,
  Video,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminPipelinePage() {
  const { data: overviewData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'pipeline-overview'],
    queryFn: () => api.getAdminPipelineOverview(),
    refetchInterval: 60_000,
  });

  const overview = overviewData?.data ?? overviewData ?? {};
  const kpis = overview.kpis ?? {};
  const funnel = overview.funnel ?? [];
  const recentEvents = overview.recentEvents ?? [];
  const seriesDistribution = overview.seriesDistribution ?? [];

  const kpiCards = [
    { label: 'Total Staff', value: kpis.total_staff ?? 0, icon: Users, color: 'text-blue-400' },
    { label: 'Active Pipeline', value: kpis.active_pipeline ?? 0, icon: Activity, color: 'text-primary' },
    { label: 'Pending Verification', value: kpis.pending_verification ?? 0, icon: ShieldCheck, color: 'text-amber-400' },
    { label: 'Training Queue', value: kpis.training_queue ?? 0, icon: GraduationCap, color: 'text-violet-400' },
    { label: 'Deferred Cases', value: kpis.deferred_cases ?? 0, icon: PauseCircle, color: 'text-orange-400' },
    { label: 'Pending Video Certs', value: kpis.pending_video ?? 0, icon: Video, color: 'text-rose-400' },
  ];

  return (
    <div className="page-padding space-y-6 sm:space-y-8 min-h-screen text-[#E8EDF8]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#E8EDF8]">Pipeline FSM Monitoring</h1>
          <p className="text-[#8D9AB5] mt-1 text-sm">Global pipeline stages, funnel metrics, and live kanban board.</p>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="border-border/60 hover:bg-[#1C2740] hover:text-white transition-all text-[#8D9AB5] bg-transparent"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {kpiCards.map((kpi) => (
              <Card key={kpi.label} className="border border-border/80 bg-card/40 backdrop-blur-md">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <div className="text-2xl font-bold text-[#E8EDF8]">{kpi.value}</div>
                  <p className="text-xs text-[#8D9AB5] mt-1">{kpi.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl lg:col-span-2">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-lg font-bold text-[#E8EDF8]">Stage Funnel</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="space-y-3">
                  {funnel.map((item: { stage: string; count: number }) => {
                    const maxCount = Math.max(...funnel.map((f: { count: number }) => f.count), 1);
                    const pct = Math.round((item.count / maxCount) * 100);
                    return (
                      <div key={item.stage} className="flex items-center gap-3">
                        <span className="text-xs text-[#8D9AB5] w-36 shrink-0">
                          {STAGE_LABELS[item.stage as PipelineStage] ?? item.stage}
                        </span>
                        <div className="flex-1 h-2 bg-[#1C2740] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-[#E8EDF8] w-8 text-right">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-lg font-bold text-[#E8EDF8]">Series Distribution</CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-3">
                {seriesDistribution.length === 0 ? (
                  <p className="text-sm text-[#8D9AB5]">No active staff in pipeline.</p>
                ) : (
                  seriesDistribution.map((s: { series: string; count: number }) => (
                    <div key={s.series} className="flex items-center justify-between">
                      <Badge variant="outline" className="border-border/60 text-[#8D9AB5]">{s.series}</Badge>
                      <span className="text-sm font-semibold text-[#E8EDF8]">{s.count}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-xl font-bold text-[#E8EDF8]">Global Pipeline Kanban</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <PipelineKanban />
            </CardContent>
          </Card>

          <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-lg font-bold text-[#E8EDF8]">Recent Pipeline Events</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              {recentEvents.length === 0 ? (
                <p className="text-sm text-[#8D9AB5]">No pipeline events recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#8D9AB5] border-b border-border/40">
                        <th className="pb-3 pr-4 font-medium">Staff</th>
                        <th className="pb-3 pr-4 font-medium">Event</th>
                        <th className="pb-3 pr-4 font-medium">Transition</th>
                        <th className="pb-3 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentEvents.map((evt: {
                        id: string;
                        staffCode: string;
                        staffName: string;
                        eventType: string;
                        fromStage?: string;
                        toStage?: string;
                        occurredAt: string;
                      }) => (
                        <tr key={evt.id} className="border-b border-border/20 hover:bg-[#1C2740]/40">
                          <td className="py-3 pr-4">
                            <div className="font-medium text-[#E8EDF8]">{evt.staffCode}</div>
                            <div className="text-xs text-[#8D9AB5]">{evt.staffName}</div>
                          </td>
                          <td className="py-3 pr-4 text-[#8D9AB5]">{evt.eventType}</td>
                          <td className="py-3 pr-4">
                            {evt.fromStage && evt.toStage ? (
                              <span className="text-xs">
                                <span className="text-[#8D9AB5]">{STAGE_LABELS[evt.fromStage as PipelineStage] ?? evt.fromStage}</span>
                                <span className="mx-1 text-primary">→</span>
                                <span className="text-[#E8EDF8]">{STAGE_LABELS[evt.toStage as PipelineStage] ?? evt.toStage}</span>
                              </span>
                            ) : (
                              <span className="text-[#8D9AB5]">—</span>
                            )}
                          </td>
                          <td className="py-3 text-xs text-[#8D9AB5]">
                            {new Date(evt.occurredAt).toLocaleString('en-IN', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
