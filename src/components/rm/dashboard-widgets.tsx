'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  ClipboardCheck,
  Video,
  Clock,
  TrendingUp,
  AlertTriangle,
  GraduationCap,
  MapPin,
  PauseCircle,
  FileWarning,
  Plus,
  ArrowRight,
  Sparkles,
  Zap,
  BookOpen,
  Briefcase,
  CheckCircle,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useRmDashboard } from '@/lib/rm/hooks';
import { STAGE_LABELS } from '@/lib/rm/constants';
import { StatCard } from '@/components/ui/stat-card';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

type StatCategory = 'all' | 'onboarding' | 'operations' | 'concerns';

export function RmDashboardWidgets() {
  const { data, isLoading } = useRmDashboard();
  const [activeTab, setActiveTab] = useState<StatCategory>('all');
  
  const body = (data as { data?: Record<string, unknown> })?.data ?? data;
  const kpis = (body as { kpis?: Record<string, number> })?.kpis ?? {};
  const funnel = (body as { funnel?: { stage: string; count: number }[] })?.funnel ?? [];
  const seriesDist =
    (body as { seriesDistribution?: { series: string; count: number }[] })?.seriesDistribution ?? [];

  // Grouped stats configurations with customized styles
  const stats = useMemo(() => [
    { 
      label: 'Total Staff', 
      value: kpis.total_staff ?? 0, 
      icon: Users, 
      href: '/rm/staff', 
      color: 'violet' as const,
      category: 'onboarding',
      desc: 'All registered personnel'
    },
    { 
      label: 'Active Pipeline', 
      value: kpis.active_pipeline ?? 0, 
      icon: TrendingUp, 
      href: '/rm/pipeline', 
      color: 'info' as const,
      category: 'onboarding',
      desc: 'In-progress recruits'
    },
    { 
      label: 'Pending Verification', 
      value: kpis.pending_verification ?? 0, 
      icon: ClipboardCheck, 
      href: '/rm/verification', 
      color: 'warning' as const,
      category: 'onboarding',
      desc: 'Aadhaar / PV checks'
    },
    { 
      label: 'Video Reviews', 
      value: kpis.pending_video ?? 0, 
      icon: Video, 
      href: '/rm/video', 
      color: 'primary' as const,
      category: 'onboarding',
      desc: 'Awaiting review'
    },
    { 
      label: 'Training Queue', 
      value: kpis.training_queue ?? 0, 
      icon: GraduationCap, 
      href: '/rm/training', 
      color: 'violet' as const,
      category: 'onboarding',
      desc: 'In classroom phase'
    },
    { 
      label: 'Deployment Queue', 
      value: kpis.deployment_queue ?? 0, 
      icon: MapPin, 
      href: '/rm/placements', 
      color: 'info' as const,
      category: 'operations',
      desc: 'Cleared to match'
    },
    { 
      label: 'Trial Placements', 
      value: kpis.trial_placements ?? 0, 
      icon: Clock, 
      href: '/rm/trials', 
      color: 'warning' as const,
      category: 'operations',
      desc: 'Active trial status'
    },
    { 
      label: 'Active Placements', 
      value: kpis.active_placements ?? 0, 
      icon: CheckCircle, 
      href: '/rm/placements', 
      color: 'success' as const,
      category: 'operations',
      desc: 'Confirmed employment'
    },
    { 
      label: 'Pending Shifts', 
      value: kpis.pending_shifts ?? 0, 
      icon: FileWarning, 
      href: '/rm/shifts', 
      color: 'warning' as const,
      category: 'operations',
      desc: 'Logs to approve'
    },
    { 
      label: 'Deferred Cases', 
      value: kpis.deferred_cases ?? 0, 
      icon: PauseCircle, 
      href: '/rm/deferred', 
      color: 'warning' as const,
      category: 'concerns',
      desc: 'On temporary pause'
    },
    { 
      label: 'Open Incidents', 
      value: kpis.open_incidents ?? 0, 
      icon: AlertTriangle, 
      href: '/rm/incidents', 
      color: 'danger' as const,
      category: 'concerns',
      desc: 'Requiring action'
    },
    { 
      label: 'Monthly Placements', 
      value: kpis.monthly_placements ?? 0, 
      icon: TrendingUp, 
      href: '/rm/reports', 
      color: 'success' as const,
      category: 'operations',
      desc: 'Target tracking'
    },
  ], [kpis]);

  const filteredStats = useMemo(() => {
    if (activeTab === 'all') return stats;
    return stats.filter(s => s.category === activeTab);
  }, [stats, activeTab]);

  const funnelData = funnel.map((f) => ({
    name: STAGE_LABELS[f.stage as keyof typeof STAGE_LABELS] ?? f.stage,
    value: f.count,
  }));

  // Recharts Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card border border-white/10 rounded-xl p-3 shadow-2xl bg-[#090D1A]/95 backdrop-blur-xl">
          <p className="font-syne font-bold text-xs text-white mb-1">{label}</p>
          <p className="font-figtree text-xs text-primary font-semibold">
            Count: <span className="text-white font-mono text-sm ml-1">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Checklist of items requiring attention
  const urgentChecklist = useMemo(() => {
    const items = [];
    if (kpis.open_incidents && kpis.open_incidents > 0) {
      items.push({
        id: 'incidents',
        type: 'danger',
        message: `Resolve ${kpis.open_incidents} active safety or behavior incident(s)`,
        href: '/rm/incidents',
        actionLabel: 'View Incidents'
      });
    }
    if (kpis.pending_video && kpis.pending_video > 0) {
      items.push({
        id: 'videos',
        type: 'primary',
        message: `Verify ${kpis.pending_video} candidate video certification(s)`,
        href: '/rm/video',
        actionLabel: 'Review Queue'
      });
    }
    if (kpis.pending_shifts && kpis.pending_shifts > 0) {
      items.push({
        id: 'shifts',
        type: 'warning',
        message: `Approve ${kpis.pending_shifts} pending check-in/out shift log(s)`,
        href: '/rm/shifts',
        actionLabel: 'Review Shifts'
      });
    }
    if (kpis.pending_verification && kpis.pending_verification > 0) {
      items.push({
        id: 'verification',
        type: 'warning',
        message: `${kpis.pending_verification} applicant(s) waiting in Verification stage`,
        href: '/rm/verification',
        actionLabel: 'Verify Docs'
      });
    }
    return items;
  }, [kpis]);

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-secondary-foreground animate-pulse">Loading command center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Category Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-1.5 rounded-xl bg-secondary/80 p-1 border border-white/[0.04]">
          {[
            { id: 'all', label: 'All Operations' },
            { id: 'onboarding', label: 'Onboarding & Training' },
            { id: 'operations', label: 'Field Placements' },
            { id: 'concerns', label: 'Risks & Oversight' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as StatCategory)}
              className={cn(
                'rounded-lg px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200',
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-secondary-foreground hover:bg-white/[0.04] hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-[#00C9A7] bg-[#00C9A7]/10 px-3 py-1.5 rounded-full border border-[#00C9A7]/25">
          <Sparkles className="h-3 w-3" /> Live Analytics Active
        </div>
      </div>

      {/* Stats Cards Display Grid */}
      <motion.div 
        layout 
        className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4"
      >
        <AnimatePresence mode="popLayout">
          {filteredStats.map((s) => (
            <motion.div
              layout
              key={s.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <Link href={s.href} className="block h-full">
                <StatCard 
                  label={s.label} 
                  value={s.value} 
                  icon={s.icon} 
                  color={s.color}
                  description={s.desc}
                />
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Main Charts & Action Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Side: Performance Analytics */}
        <div className="space-y-6 lg:col-span-8">
          <div className="glass-card gradient-border rounded-2xl p-5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-syne font-bold text-lg text-white">Stage Conversion Funnel</h3>
                <p className="text-xs text-secondary-foreground">Recruitment funnel status and pipeline conversions</p>
              </div>
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="funnelGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF5A1F" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#FF5A1F" stopOpacity={0.15} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#8D9AB5', fontSize: 10, fontWeight: 500 }} 
                  axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#8D9AB5', fontSize: 10, fontFamily: 'monospace' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="value" fill="url(#funnelGrad)" radius={[6, 6, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="glass-card gradient-border rounded-2xl p-5 shadow-xl">
              <h4 className="font-syne font-bold text-sm text-white mb-4">Staff Category Mix</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={seriesDist.map((s) => ({ name: s.series, count: s.count }))}>
                  <defs>
                    <linearGradient id="seriesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00C9A7" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#00C9A7" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" tick={{ fill: '#8D9AB5', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8D9AB5', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="url(#seriesGrad)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card gradient-border rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-violet mb-2">
                  <Zap className="h-4 w-4 fill-current" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">RM Productivity Tip</span>
                </div>
                <h4 className="text-sm font-bold text-white mb-2 leading-snug">Speed up deployments by resolving Video Review queues</h4>
                <p className="text-xs text-secondary-foreground leading-relaxed">
                  Candidate conversion increases by 34% when police verification and video certifications are checked within 48 hours of onboarding.
                </p>
              </div>
              <div className="border-t border-white/[0.06] pt-3 mt-4 flex items-center justify-between text-[11px] text-violet font-semibold">
                <span>View Guidelines</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Command checklist & Console Operations */}
        <div className="space-y-6 lg:col-span-4">
          {/* Action Priorities */}
          <div className="glass-card gradient-border rounded-2xl p-5 shadow-2xl">
            <h3 className="font-syne font-bold text-base text-white mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary fill-primary" /> Urgent Action Required
            </h3>
            
            {urgentChecklist.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-white">Console Clear</p>
                <p className="text-[10px] text-secondary-foreground">No urgent verification, shifts, or incidents pending.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {urgentChecklist.map((item) => (
                  <div 
                    key={item.id} 
                    className={cn(
                      "rounded-xl border p-3.5 space-y-2.5 transition-all duration-200 hover:scale-[1.01]",
                      item.type === 'danger' && "bg-danger/5 border-danger/25",
                      item.type === 'warning' && "bg-warning/5 border-warning/25",
                      item.type === 'primary' && "bg-primary/5 border-primary/25"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={cn(
                        "mt-0.5 inline-block h-2 w-2 rounded-full",
                        item.type === 'danger' && "bg-danger",
                        item.type === 'warning' && "bg-warning",
                        item.type === 'primary' && "bg-primary"
                      )} />
                      <p className="text-xs font-medium leading-relaxed text-foreground">{item.message}</p>
                    </div>
                    <Link 
                      href={item.href}
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors",
                        item.type === 'danger' && "text-danger hover:text-danger-foreground",
                        item.type === 'warning' && "text-warning hover:text-amber-400",
                        item.type === 'primary' && "text-primary hover:text-accent"
                      )}
                    >
                      {item.actionLabel} <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Redesigned Command Console Panel */}
          <div className="glass-card gradient-border rounded-2xl p-5 shadow-2xl">
            <h3 className="font-syne font-bold text-base text-white mb-4">Command Console</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Add Staff', desc: 'Onboard recruit', href: '/rm/intake', icon: Plus },
                { label: 'Pipeline Board', desc: 'Manage flow', href: '/rm/pipeline', icon: TrendingUp },
                { label: 'Schedule Training', desc: 'Classroom setup', href: '/rm/training', icon: GraduationCap },
                { label: 'Review Video', desc: 'Cert review', href: '/rm/video', icon: Video },
                { label: 'Active Match', desc: 'Deployments', href: '/rm/placements', icon: Briefcase },
                { label: 'Shifts Logs', desc: 'Approve hours', href: '/rm/shifts', icon: FileText },
                { label: 'Trial Monitor', desc: 'Assess trial', href: '/rm/trials', icon: Clock },
                { label: 'Raise Incident', desc: 'Safety log', href: '/rm/incidents', icon: AlertTriangle },
              ].map((act) => {
                const IconComp = act.icon;
                return (
                  <Link
                    key={act.label}
                    href={act.href}
                    className="flex flex-col justify-between rounded-xl border border-white/[0.04] bg-[#0E1320] p-3 text-left transition-all duration-200 hover:border-primary/45 hover:bg-primary/[0.03] group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="rounded-lg bg-white/[0.03] p-1.5 text-secondary-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <IconComp className="h-4 w-4" />
                      </div>
                      <ArrowRight className="h-3 w-3 text-white/20 opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all group-hover:translate-x-0.5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white leading-tight">{act.label}</p>
                      <p className="text-[9px] text-secondary-foreground mt-0.5 leading-snug truncate">{act.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
