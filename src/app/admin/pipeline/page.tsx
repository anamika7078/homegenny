"use client";

import React, { useState } from 'react';
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
  GitMerge,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminPipelinePage() {
  const [showFsmRules, setShowFsmRules] = useState(true);

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

  const fsmStages = [
    { code: 'S1_INTAKE', label: '1. Intake & Profiling', desc: 'Candidate registration, basic details & document upload' },
    { code: 'S2_VERIFY', label: '2. Background Verification', desc: 'Aadhaar, PAN, police check & address verification' },
    { code: 'S2_5_ASSESS', label: '3. Skill Assessment', desc: 'Practical test, video certification & domain interview' },
    { code: 'S3_TRAIN', label: '4. Academy Training', desc: 'Mandatory training batches, attendance & practical module' },
    { code: 'S4_AGREEMENTS', label: '5. Legal Agreement', desc: 'Placement contract, salary structure & branch terms' },
    { code: 'S5_DEPLOY', label: '6. Active Deployment', desc: 'Customer site deployment & active billing start' },
  ];

  return (
    <div className="page-padding space-y-6 sm:space-y-8 min-h-screen text-[#E8EDF8]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#E8EDF8]">Pipeline FSM & Decision Tree</h1>
          <p className="text-[#8D9AB5] mt-1 text-sm">Read-only view of FSM stage transition rules, scenario routing decision tree, and live kanban monitoring.</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowFsmRules(!showFsmRules)}
            variant="outline"
            className="border-border/60 text-[#8D9AB5] hover:text-white bg-transparent"
          >
            <GitMerge className="mr-2 h-4 w-4 text-sky-400" /> {showFsmRules ? 'Hide FSM Rules' : 'View FSM Rules'}
          </Button>
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="border-border/60 hover:bg-[#1C2740] hover:text-white transition-all text-[#8D9AB5] bg-transparent"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Read-Only FSM Rules & Decision Tree Visualizer */}
      {showFsmRules && (
        <Card className="border border-indigo-900/60 bg-gradient-to-br from-indigo-950/30 via-slate-900/50 to-slate-950/80 shadow-2xl backdrop-blur-md">
          <CardHeader className="pb-4 border-b border-indigo-800/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <GitMerge className="h-5 w-5 text-indigo-400" />
                <CardTitle className="text-xl font-bold text-[#E8EDF8]">FSM Stage Transition Rules & Scenario Decision Tree</CardTitle>
              </div>
              <p className="text-xs text-[#8D9AB5] mt-1">Read-only view of application pipeline rules. Transitions are strictly enforced in application logic.</p>
            </div>
            <Badge className="bg-amber-950/60 text-amber-300 border border-amber-800/40 flex items-center gap-1.5 px-3 py-1 text-xs">
              <Lock className="h-3.5 w-3.5" /> Enforced by Server Logic (Read-Only)
            </Badge>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Sequential Stage Workflow Pipeline */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8D9AB5] mb-3">1. Sequential Stage Transition Flow</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {fsmStages.map((st, idx) => (
                  <div key={st.code} className="bg-[#0F172A]/70 border border-border/40 p-3 rounded-xl flex flex-col justify-between relative group hover:border-indigo-500/50 transition-all">
                    <div>
                      <span className="text-[10px] font-mono text-indigo-400 font-bold">{st.code}</span>
                      <h5 className="text-xs font-semibold text-[#E8EDF8] mt-0.5">{st.label}</h5>
                      <p className="text-[11px] text-[#8D9AB5] mt-1 leading-snug">{st.desc}</p>
                    </div>
                    {idx < fsmStages.length - 1 && (
                      <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                        <ArrowRight className="h-4 w-4 text-indigo-400/60" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Scenario Routing Decision Tree */}
            <div className="pt-4 border-t border-border/30">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8D9AB5] mb-3">2. Scenario Routing Decision Tree (Branching Logic)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Scenario 1: Standard Success Route */}
                <div className="bg-emerald-950/20 border border-emerald-800/30 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                    <CheckCircle2 className="h-4 w-4" /> Scenario A: Verification & Skill Pass
                  </div>
                  <p className="text-xs text-[#8D9AB5]">
                    Candidate passes BG verification, clears skill assessment & completes training batch successfully.
                  </p>
                  <div className="text-[11px] font-mono text-emerald-300 bg-emerald-950/60 p-2 rounded border border-emerald-800/40">
                    Route: S1 ➔ S2 ➔ S2_5 ➔ S3 ➔ S4 ➔ S5_DEPLOY
                  </div>
                </div>

                {/* Scenario 2: Deferred / Pause Route */}
                <div className="bg-amber-950/20 border border-amber-800/30 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                    <AlertTriangle className="h-4 w-4" /> Scenario B: Missing Docs / Temporary Gap
                  </div>
                  <p className="text-xs text-[#8D9AB5]">
                    Missing address proof, medical leave, or personal gap. Candidate status set to <span className="font-semibold text-amber-300">DEFERRED</span>.
                  </p>
                  <div className="text-[11px] font-mono text-amber-300 bg-amber-950/60 p-2 rounded border border-amber-800/40">
                    Route: Stage ➔ DEFERRED (set Resume Date) ➔ Resume back to Stage
                  </div>
                </div>

                {/* Scenario 3: Terminal / Rejection Route */}
                <div className="bg-rose-950/20 border border-rose-800/30 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                    <XCircle className="h-4 w-4" /> Scenario C: Failed Checks / Disqualification
                  </div>
                  <p className="text-xs text-[#8D9AB5]">
                    Failed criminal background check, fake documents, or disciplinary exit. Candidate status set to <span className="font-semibold text-rose-300">TERMINAL</span>.
                  </p>
                  <div className="text-[11px] font-mono text-rose-300 bg-rose-950/60 p-2 rounded border border-rose-800/40">
                    Route: Any Stage ➔ TERMINAL (Record Reason Code & Invalidate Access)
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
