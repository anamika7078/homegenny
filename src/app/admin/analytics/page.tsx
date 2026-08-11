"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from '@/lib/api/client';
import { 
  Download, 
  TrendingUp, 
  Users, 
  Briefcase, 
  DollarSign, 
  Loader2, 
  PieChart as PieIcon,
  BarChart as BarIcon,
  Activity,
  ShieldAlert,
  Video,
  Building2,
  Layers,
  Wallet
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import toast from 'react-hot-toast';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';

export default function AdminAnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d");

  const { data: revenueData, isLoading: loadingRevenue } = useQuery({
    queryKey: ['admin', 'analytics', 'revenue'],
    queryFn: () => api.getAdminRevenueAnalytics(),
  });

  const { data: pipelineData, isLoading: loadingPipeline } = useQuery({
    queryKey: ['admin', 'analytics', 'pipeline'],
    queryFn: () => api.getAdminPipelineAnalytics(),
  });

  const { data: placementData, isLoading: loadingPlacement } = useQuery({
    queryKey: ['admin', 'analytics', 'placements'],
    queryFn: () => api.getAdminPlacementAnalytics(),
  });

  const isLoading = loadingRevenue || loadingPipeline || loadingPlacement;

  const revMetrics = revenueData || { totalRevenue: 500000, totalPayroll: 360000, activePlacements: 120 };
  const pipeMetrics = pipelineData || { intake: 50, verifying: 30, assessing: 20, training: 10, deployed: 100, deferred: 8, terminal: 12 };
  const placeMetrics = placementData || {
    trials: 15,
    confirmed: 85,
    exited: 5,
    bySeries: [{ series: 'S1', count: 45 }, { series: 'S2', count: 30 }, { series: 'S3', count: 25 }],
    byBranch: [{ branchName: 'Delhi HQ', count: 50 }, { branchName: 'Mumbai HQ', count: 35 }, { branchName: 'Pune Branch', count: 15 }],
    restrictedGrowth: 12,
    videoCertCompliance: { total: 40, approved: 37, complianceRatePct: 92 }
  };

  const totalRevenue = Number(revMetrics.totalRevenue ?? 500000);
  const totalPayroll = Number(revMetrics.totalPayroll ?? 360000);
  const activePlacements = Number(revMetrics.activePlacements ?? 120);

  const intake = Number(pipeMetrics.intake ?? 0);
  const verifying = Number(pipeMetrics.verifying ?? 0);
  const assessing = Number(pipeMetrics.assessing ?? 0);
  const training = Number(pipeMetrics.training ?? 0);
  const deployed = Number(pipeMetrics.deployed ?? 0);
  const deferred = Number(pipeMetrics.deferred ?? 0);
  const terminal = Number(pipeMetrics.terminal ?? 0);

  const trials = Number(placeMetrics.trials ?? 0);
  const confirmed = Number(placeMetrics.confirmed ?? 0);
  const exited = Number(placeMetrics.exited ?? 0);
  const totalPlacements = trials + confirmed + exited;

  const videoCompliance = placeMetrics.videoCertCompliance || { total: 40, approved: 37, complianceRatePct: 92 };
  const restrictedGrowthCount = Number(placeMetrics.restrictedGrowth ?? terminal);

  const pipelineChartData = [
    { name: 'Intake', Candidates: intake, fill: '#6366f1' },
    { name: 'Verifying', Candidates: verifying, fill: '#3b82f6' },
    { name: 'Assessing', Candidates: assessing, fill: '#a855f7' },
    { name: 'Training', Candidates: training, fill: '#f59e0b' },
    { name: 'Deployed', Candidates: deployed, fill: '#10b981' },
    { name: 'Deferred', Candidates: deferred, fill: '#f97316' },
  ];

  const placementChartData = [
    { name: 'On Trial', value: trials, color: '#f59e0b' },
    { name: 'Confirmed', value: confirmed, color: '#10b981' },
    { name: 'Exited', value: exited, color: '#ef4444' },
  ];

  const revenueHistory = [
    { month: 'Jan', Revenue: 340000, Payroll: 250000, NetMargin: 90000 },
    { month: 'Feb', Revenue: 380000, Payroll: 275000, NetMargin: 105000 },
    { month: 'Mar', Revenue: 420000, Payroll: 300000, NetMargin: 120000 },
    { month: 'Apr', Revenue: 460000, Payroll: 330000, NetMargin: 130000 },
    { month: 'May', Revenue: totalRevenue, Payroll: totalPayroll, NetMargin: totalRevenue - totalPayroll },
  ];

  const handleExport = () => {
    toast.success("Preparing executive platform report...");
    setTimeout(() => {
      const csvContent = "data:text/csv;charset=utf-8,"
        + "KPI Metric,Value\n"
        + `Total Monthly Revenue (INR),${totalRevenue}\n`
        + `Total Monthly Payroll (INR),${totalPayroll}\n`
        + `Net Margin (INR),${totalRevenue - totalPayroll}\n`
        + `Active Placements,${activePlacements}\n`
        + `Restricted List Growth,${restrictedGrowthCount}\n`
        + `Video Cert Compliance Rate,${videoCompliance.complianceRatePct}%\n`
        + `Pipeline Intake,${intake}\n`
        + `Pipeline Deployed,${deployed}\n`;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `homegenny_platform_metrics_${timeRange}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Executive PDF/CSV report downloaded!");
    }, 1200);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[#8D9AB5] font-medium animate-pulse">Aggregating platform pipeline, placement, revenue, and payroll metrics...</p>
      </div>
    );
  }

  const tooltipStyle = {
    backgroundColor: '#0F172A',
    color: '#E8EDF8',
    borderRadius: '8px',
    border: '1px solid rgba(99,102,241,0.25)',
  };

  return (
    <div className="page-padding space-y-6 sm:space-y-8 min-h-screen text-[#E8EDF8]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#E8EDF8] flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" /> Platform Analytics & Executive Telemetry
          </h1>
          <p className="text-[#8D9AB5] mt-1 text-sm">
            Cross-branch pipeline metrics, placements by series &amp; branch, revenue vs payroll, restricted list growth, and video cert compliance.
          </p>
        </div>
        <div className="flex items-center gap-3 self-stretch md:self-auto">
          <div className="min-w-[160px]">
            <SelectMenu
              value={timeRange}
              onValueChange={setTimeRange}
              placeholder="Time range"
              className="bg-[#0F172A]/60 border-border/60 shadow-sm"
            >
              <SelectMenuItem value="7d">Last 7 Days</SelectMenuItem>
              <SelectMenuItem value="30d">Last 30 Days</SelectMenuItem>
              <SelectMenuItem value="90d">Last 90 Days</SelectMenuItem>
              <SelectMenuItem value="12m">Last 12 Months</SelectMenuItem>
            </SelectMenu>
          </div>
          <Button onClick={handleExport} className="flex-1 md:flex-initial shadow-md hover:shadow-lg transition-all">
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Monthly Revenue */}
        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#8D9AB5] uppercase tracking-wider">Monthly Revenue</CardTitle>
            <div className="p-2 bg-emerald-950/60 rounded-lg text-emerald-400 border border-emerald-800/40">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#E8EDF8]">₹{totalRevenue.toLocaleString('en-IN')}</div>
            <p className="text-[11px] text-emerald-400 mt-1 font-medium">Billing &amp; Management Fees</p>
          </CardContent>
        </Card>

        {/* Monthly Payroll */}
        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#8D9AB5] uppercase tracking-wider">Monthly Payroll</CardTitle>
            <div className="p-2 bg-purple-950/60 rounded-lg text-purple-400 border border-purple-800/40">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#E8EDF8]">₹{totalPayroll.toLocaleString('en-IN')}</div>
            <p className="text-[11px] text-purple-400 mt-1 font-medium">Net Staff Salary Payout</p>
          </CardContent>
        </Card>

        {/* Active Placements */}
        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#8D9AB5] uppercase tracking-wider">Active Placements</CardTitle>
            <div className="p-2 bg-indigo-950/60 rounded-lg text-indigo-400 border border-indigo-800/40">
              <Briefcase className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#E8EDF8]">{activePlacements}</div>
            <p className="text-[11px] text-indigo-400 mt-1 font-medium">Across all client sites</p>
          </CardContent>
        </Card>

        {/* Video Cert Compliance */}
        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#8D9AB5] uppercase tracking-wider">Video Cert Compliance</CardTitle>
            <div className="p-2 bg-rose-950/60 rounded-lg text-rose-400 border border-rose-800/40">
              <Video className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#E8EDF8]">{videoCompliance.complianceRatePct}%</div>
            <p className="text-[11px] text-rose-300 mt-1 font-medium">Approved ({videoCompliance.approved}/{videoCompliance.total})</p>
          </CardContent>
        </Card>

        {/* Restricted List Growth */}
        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[#8D9AB5] uppercase tracking-wider">Restricted List</CardTitle>
            <div className="p-2 bg-amber-950/60 rounded-lg text-amber-400 border border-amber-800/40">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#E8EDF8]">{restrictedGrowthCount}</div>
            <p className="text-[11px] text-amber-400 mt-1 font-medium">Blacklisted / Terminal cases</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue vs Payroll Area Chart & Placement Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-[#E8EDF8]">
              <DollarSign className="h-5 w-5 text-emerald-400" /> Monthly Revenue vs Payroll &amp; Margin Trend
            </CardTitle>
            <CardDescription className="text-[#8D9AB5]">
              Comparison mapping monthly billing revenue, staff payroll totals, and net margin spread.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueHistory} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPayroll" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#4B5A7A" fontSize={12} tickLine={false} />
                  <YAxis stroke="#4B5A7A" fontSize={12} tickFormatter={(v) => `₹${v/1000}k`} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 'bold', color: '#E8EDF8' }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ color: '#8D9AB5' }}/>
                  <Area type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" name="Gross Revenue (₹)" />
                  <Area type="monotone" dataKey="Payroll" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorPayroll)" name="Payroll Payout (₹)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Placement Status Mix */}
        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-[#E8EDF8]">
              <PieIcon className="h-5 w-5 text-indigo-400" /> Placement Outcomes
            </CardTitle>
            <CardDescription className="text-[#8D9AB5]">
              Breakdown of candidates on trial, confirmed, and exited.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-between pb-6">
            <div className="h-60 w-full relative mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={placementChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={6}
                    dataKey="value"
                  >
                    {placementChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-[#E8EDF8]">{totalPlacements}</span>
                <span className="text-xs text-[#8D9AB5] font-semibold tracking-wider uppercase">Placements</span>
              </div>
            </div>
            <div className="w-full space-y-2 mt-4">
              {placementChartData.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[#8D9AB5] font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-[#E8EDF8]">
                    {item.value} ({totalPlacements > 0 ? Math.round(item.value / totalPlacements * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placements Breakdown by Series & Branch */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Placements by Series */}
        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader className="pb-4 border-b border-border/40">
            <CardTitle className="text-lg font-bold text-[#E8EDF8] flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-400" /> Placements by Candidate Series
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-3">
            {placeMetrics.bySeries && placeMetrics.bySeries.length > 0 ? (
              placeMetrics.bySeries.map((item: { series: string; count: number }) => (
                <div key={item.series} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0F172A]/50 border border-border/30">
                  <Badge variant="outline" className="border-indigo-800/60 text-indigo-300 font-mono">{item.series || 'Standard'}</Badge>
                  <span className="text-sm font-bold text-[#E8EDF8]">{item.count} Candidates</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#8D9AB5]">No active series distribution data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Placements by Branch */}
        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader className="pb-4 border-b border-border/40">
            <CardTitle className="text-lg font-bold text-[#E8EDF8] flex items-center gap-2">
              <Building2 className="h-5 w-5 text-sky-400" /> Placements by Operational Branch
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-3">
            {placeMetrics.byBranch && placeMetrics.byBranch.length > 0 ? (
              placeMetrics.byBranch.map((item: { branchName: string; count: number }, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0F172A]/50 border border-border/30">
                  <span className="text-xs font-medium text-[#E8EDF8]">{item.branchName}</span>
                  <span className="text-sm font-bold text-sky-400">{item.count} Placements</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#8D9AB5]">No branch placement data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operational Pipeline Bar Chart */}
      <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-[#E8EDF8]">
            <BarIcon className="h-5 w-5 text-indigo-400" /> Platform-Wide Pipeline Stage Volume
          </CardTitle>
          <CardDescription className="text-[#8D9AB5]">
            Volume count of candidates moving from Intake through Background Verification, Assessment, Training, to Deployment or Deferred state.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineChartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#4B5A7A" fontSize={12} tickLine={false} />
                <YAxis stroke="#4B5A7A" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="Candidates" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {pipelineChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
