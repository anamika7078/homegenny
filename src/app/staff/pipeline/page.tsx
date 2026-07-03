'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/loading';
import { fDate, fToNow } from '@/lib/utils/format';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  User, 
  Plus,
  ShieldCheck, 
  AlertCircle,
  Clock,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import type { StaffApplicant } from '@/lib/types';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

const STAGES = [
  { id: 'S1_INTAKE', label: 'S1 INTAKE', next: 'S2_VERIFY' },
  { id: 'S2_VERIFY', label: 'S2 VERIFY', next: 'S3_TRAIN' },
  { id: 'S3_TRAIN', label: 'S3 TRAIN', next: 'S4_AGREEMENTS' },
  { id: 'S4_AGREEMENTS', label: 'S4 AGREEMENTS', next: 'S5_DEPLOY' },
  { id: 'S5_DEPLOY', label: 'S5 DEPLOYED', next: null },
];

const SERIES_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRIVER: { label: 'DR', color: 'text-[#38BDF8]', bg: 'bg-[#38BDF8]/10' },
  SKILLED_CARE: { label: 'SC', color: 'text-[#00C9A7]', bg: 'bg-[#00C9A7]/10' },
  UNSKILLED_CARE: { label: 'UC', color: 'text-[#8B5CF6]', bg: 'bg-[#8B5CF6]/10' },
  MAID: { label: 'MAID', color: 'text-[#FF5A1F]', bg: 'bg-[#FF5A1F]/10' },
};

export default function StaffPipelinePage() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ['all-staff'],
    queryFn: () => api.listStaff({ limit: 500 }),
    refetchInterval: 30000,
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string, stage: string }) =>
      api.advanceRmPipeline(id, { to_stage: stage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-staff'] });
      toast.success('Stage updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update stage');
    }
  });

  const staff: StaffApplicant[] = (data as any)?.data?.items || [];

  const filteredStaff = staff.filter(s => {
    const q = search.toLowerCase();
    return !q || s.staff_code.toLowerCase().includes(q) || s.full_name?.toLowerCase().includes(q);
  });

  const getStaffInStage = (stageId: string) => {
    return filteredStaff.filter(s => {
      if (stageId === 'S2_VERIFY') return s.pipeline_stage === 'S2_VERIFY' || s.pipeline_stage === 'S2_5_ASSESS';
      return s.pipeline_stage === stageId;
    });
  };

  const handleMoveStage = (id: string, currentStage: string) => {
    // If it's S2_5_ASSESS, the "column" is S2_VERIFY, so we treat it as S2_VERIFY for finding the next stage
    const effectiveStage = currentStage === 'S2_5_ASSESS' ? 'S2_VERIFY' : currentStage;
    const stage = STAGES.find(s => s.id === effectiveStage);
    if (stage?.next) {
      updateStageMutation.mutate({ id, stage: stage.next });
    }
  };

  const getStatusBadge = (s: StaffApplicant) => {
    if (s.pipeline_stage === 'S1_INTAKE') {
      if (s.verified_docs?.aadhaar) return { label: 'CLEAR', color: 'text-success bg-success/10' };
      return { label: 'Form complete', color: 'text-[#38BDF8] bg-[#38BDF8]/10' };
    }
    
    if (s.pipeline_stage === 'S2_VERIFY' || s.pipeline_stage === 'S2_5_ASSESS') {
      if (s.pipeline_stage === 'S2_5_ASSESS') return { label: 'S2.5 assess', color: 'text-[#38BDF8] bg-[#38BDF8]/10' };
      if (s.metadata?.dl_expiry && new Date(s.metadata.dl_expiry) < new Date()) return { label: 'DL expiring', color: 'text-destructive bg-destructive/10' };
      if (s.metadata?.violation_count && s.metadata.violation_count > 3) return { label: `${s.metadata.violation_count} challans`, color: 'text-destructive bg-destructive/10' };
      if (s.pv_status === 'CLEAR') return { label: 'PV clear', color: 'text-success bg-success/10' };
      if (s.pv_status === 'EXPIRED') return { label: 'PV overdue', color: 'text-destructive bg-destructive/10' };
      return { label: 'In verification', color: 'text-[#38BDF8] bg-[#38BDF8]/10' };
    }

    if (s.pipeline_stage === 'S3_TRAIN') {
      if (s.metadata?.rm_signed_off) return { label: 'Training done', color: 'text-success bg-success/10' };
      if (s.video_cert_id) return { label: 'Video pending', color: 'text-warning bg-warning/10' };
      return { label: 'In training', color: 'text-[#38BDF8] bg-[#38BDF8]/10' };
    }

    if (s.pipeline_stage === 'S4_AGREEMENTS') {
       if (s.metadata?.sow_client_signed) return { label: 'All signed', color: 'text-success bg-success/10' };
       return { label: 'A1 pending', color: 'text-warning bg-warning/10' };
    }

    if (s.pipeline_stage === 'S5_DEPLOY') {
       if (s.metadata?.re_apply_eligible_date) return { label: 'Upgrade ready', color: 'text-violet bg-violet/10' };
       return { label: 'Confirmed', color: 'text-success bg-success/10' };
    }

    return { label: 'Pending', color: 'text-secondary-foreground bg-secondary/10' };
  };

  return (
    <AppShell>
      <div className="flex h-full min-h-0 flex-col bg-[#0B0F17]">
        {/* Header */}
        <div className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Pipeline Kanban <span className="text-white/40">—</span> <span className="text-white/80">RM Pooja Mishra</span>
            </h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-medium text-white/60">{filteredStaff.length} active applicants</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-primary transition-colors" />
              <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Find applicant..."
                className="bg-[#151921] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all w-72"
              />
            </div>
            <Link href="/staff/intake">
              <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4" />
                New Intake
              </button>
            </Link>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto p-8 pt-6 min-h-0 scrollbar-hide">
          <div className="flex gap-6 h-full min-w-max pb-4">
            {STAGES.map((stage) => {
              const stageStaff = getStaffInStage(stage.id);
              return (
                <div key={stage.id} className="w-[320px] flex flex-col gap-5">
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-[13px] font-black tracking-wider text-white/50 uppercase">
                        {stage.label}
                      </h3>
                      <div className="w-6 h-6 rounded-full bg-[#1A1F2B] border border-white/10 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white/40">
                          {stageStaff.length}
                        </span>
                      </div>
                    </div>
                    <button className="text-white/20 hover:text-white/60 transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Cards Container */}
                  <div className={cn(
                    "flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide rounded-3xl p-3 border border-white/5 bg-[#121620]/50 transition-colors",
                    stageStaff.length === 0 && "border-dashed border-white/10 bg-transparent"
                  )}>
                    <AnimatePresence mode="popLayout">
                      {isLoading ? (
                        <div className="space-y-4">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-white/5 animate-pulse rounded-2xl" />
                          ))}
                        </div>
                      ) : (
                        stageStaff.map((applicant) => {
                          const status = getStatusBadge(applicant);
                          const series = SERIES_CONFIG[applicant.series] || SERIES_CONFIG.DRIVER;
                          const isUpdating = updateStageMutation.isPending && updateStageMutation.variables?.id === applicant.id;
                          
                          return (
                            <motion.div
                              key={applicant.id}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="bg-[#1A1F2B] border border-white/[0.06] p-5 rounded-[24px] hover:border-white/20 hover:bg-[#1E2433] transition-all cursor-pointer shadow-xl group relative overflow-hidden"
                            >
                              <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                  <h4 className="text-[15px] font-bold text-white group-hover:text-primary transition-colors flex-1">
                                    {applicant.full_name}
                                  </h4>
                                  {stage.next && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveStage(applicant.id, applicant.pipeline_stage);
                                      }}
                                      disabled={isUpdating}
                                      className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-white/20 hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                                      title={`Move to ${STAGES.find(s => s.id === stage.next)?.label}`}
                                    >
                                      {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className={cn("px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-widest", series.bg, series.color)}>
                                    {series.label}
                                  </div>
                                  <div className={cn("px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-tight", status.color)}>
                                    {status.label}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-[11px] font-medium text-white/20 font-mono tracking-tight">
                                    {applicant.staff_code}
                                  </span>
                                  <span className="text-[10px] font-medium text-white/20">
                                    {fToNow(applicant.created_at)}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </AnimatePresence>
                    
                    {!isLoading && stageStaff.length === 0 && (
                      <div className="h-32 flex flex-col items-center justify-center gap-3">
                         <div className="p-3 rounded-full bg-white/5">
                           <Clock className="w-5 h-5 text-white/10" />
                         </div>
                         <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/10">No Applicants</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}