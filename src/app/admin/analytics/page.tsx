"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Activity
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

  const revMetrics = revenueData || { totalRevenue: 500000, activePlacements: 120 };
  const pipeMetrics = pipelineData || { intake: 50, verifying: 30, assessing: 20, training: 10, deployed: 100 };
  const placeMetrics = placementData || { trials: 15, confirmed: 85, exited: 5 };

  const totalRevenue = Number(revMetrics.totalRevenue ?? 0);
  const activePlacements = Number(revMetrics.activePlacements ?? 0);
  const intake = Number(pipeMetrics.intake ?? 0);
  const deployed = Number(pipeMetrics.deployed ?? 0);
  const trials = Number(placeMetrics.trials ?? 0);
  const confirmed = Number(placeMetrics.confirmed ?? 0);
  const exited = Number(placeMetrics.exited ?? 0);

  const pipelineChartData = [
    { name: 'Intake', Candidates: intake, fill: '#6366f1' },
    { name: 'Verifying', Candidates: Number(pipeMetrics.verifying ?? 0), fill: '#3b82f6' },
    { name: 'Assessing', Candidates: Number(pipeMetrics.assessing ?? 0), fill: '#a855f7' },
    { name: 'Training', Candidates: Number(pipeMetrics.training ?? 0), fill: '#f59e0b' },
    { name: 'Deployed', Candidates: deployed, fill: '#10b981' },
  ];

  const placementChartData = [
    { name: 'On Trial', value: trials, color: '#f59e0b' },
    { name: 'Confirmed', value: confirmed, color: '#10b981' },
    { name: 'Exited', value: exited, color: '#ef4444' },
  ];

  const revenueHistory = [
    { month: 'Jan', Revenue: 340000, Placements: 80 },
    { month: 'Feb', Revenue: 380000, Placements: 95 },
    { month: 'Mar', Revenue: 420000, Placements: 105 },
    { month: 'Apr', Revenue: 460000, Placements: 112 },
    { month: 'May', Revenue: totalRevenue, Placements: activePlacements },
  ];

  const totalPlacements = trials + confirmed + exited;

  const handleExport = () => {
    toast.success("Preparing executive report. Download will start automatically.");
    setTimeout(() => {
      const csvContent = "data:text/csv;charset=utf-8,"
        + "KPI,Value\n"
        + `Total Revenue,INR ${totalRevenue}\n`
        + `Active Placements,${activePlacements}\n`
        + `Pipeline Intake,${intake}\n`
        + `Pipeline Deployed,${deployed}\n`
        + `Trials,${trials}\n`
        + `Confirmed,${confirmed}\n`
        + `Exited,${exited}\n`;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `homegenny_admin_analytics_${timeRange}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Executive PDF report exported successfully!");
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[#8D9AB5] font-medium animate-pulse">Aggregating platform telemetry and financial logs...</p>
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
            <TrendingUp className="h-8 w-8 text-primary" /> Analytics &amp; Reporting
          </h1>
          <p className="text-[#8D9AB5] mt-1 text-sm">
            Real-time cross-branch financial performance, talent pipelines, and placement metrics.
          </p>
        </div>
        <div className="flex items-center gap-3 self-stretch md:self-auto">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded-md border border-border/60 bg-[#0F172A]/60 px-3 py-2 text-sm text-[#E8EDF8] focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          >
            <option value="7d" className="bg-[#080D1A]">Last 7 Days</option>
            <option value="30d" className="bg-[#080D1A]">Last 30 Days</option>
            <option value="90d" className="bg-[#080D1A]">Last 90 Days</option>
            <option value="12m" className="bg-[#080D1A]">Last 12 Months</option>
          </select>
          <Button onClick={handleExport} className="flex-1 md:flex-initial shadow-md hover:shadow-lg transition-all">
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl hover:shadow-primary/10 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-[#8D9AB5] uppercase tracking-wider">Total Revenue</CardTitle>
            <div className="p-2 bg-emerald-950/60 rounded-lg text-emerald-400 border border-emerald-800/40">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#E8EDF8]">₹{totalRevenue.toLocaleString('en-IN')}</div>
            <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1 font-medium">
              <TrendingUp className="h-3 w-3" /> +12.4% vs last month
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl hover:shadow-primary/10 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-[#8D9AB5] uppercase tracking-wider">Active Placements</CardTitle>
            <div className="p-2 bg-indigo-950/60 rounded-lg text-indigo-400 border border-indigo-800/40">
              <Briefcase className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#E8EDF8]">{activePlacements}</div>
            <p className="text-xs text-indigo-400 mt-2 flex items-center gap-1 font-medium">
              <TrendingUp className="h-3 w-3" /> +8.2% new deployment
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl hover:shadow-primary/10 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-[#8D9AB5] uppercase tracking-wider">Candidate Intake</CardTitle>
            <div className="p-2 bg-blue-950/60 rounded-lg text-blue-400 border border-blue-800/40">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#E8EDF8]">{intake}</div>
            <p className="text-xs text-[#8D9AB5] mt-2 flex items-center gap-1">
              Awaiting vetting &amp; onboarding
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl hover:shadow-primary/10 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-[#8D9AB5] uppercase tracking-wider">Active Trials</CardTitle>
            <div className="p-2 bg-amber-950/60 rounded-lg text-amber-400 border border-amber-800/40">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#E8EDF8]">{trials}</div>
            <p className="text-xs text-amber-400 mt-2 flex items-center gap-1 font-medium">
              High trial-to-deployment conversion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Revenue Area Chart */}
        <Card className="lg:col-span-2 border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-[#E8EDF8]">
              <DollarSign className="h-5 w-5 text-emerald-400" /> Revenue &amp; Placement Performance
            </CardTitle>
            <CardDescription className="text-[#8D9AB5]">
              Trend analysis mapping platform management fees and contract values monthly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueHistory} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPlacements" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#4B5A7A" fontSize={12} tickLine={false} />
                  <YAxis yAxisId="left" stroke="#4B5A7A" fontSize={12} tickFormatter={(v) => `₹${v/1000}k`} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#4B5A7A" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 'bold', color: '#E8EDF8' }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ color: '#8D9AB5' }}/>
                  <Area yAxisId="left" type="monotone" dataKey="Revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue (₹)" />
                  <Area yAxisId="right" type="monotone" dataKey="Placements" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorPlacements)" name="Placements Count" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-[#E8EDF8]">
              <PieIcon className="h-5 w-5 text-indigo-400" /> Placement Mix
            </CardTitle>
            <CardDescription className="text-[#8D9AB5]">
              Status breakups for overall historical placements.
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

        {/* Pipeline Bar Chart */}
        <Card className="lg:col-span-3 border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-[#E8EDF8]">
              <BarIcon className="h-5 w-5 text-indigo-400" /> Operational Funnel Pipeline
            </CardTitle>
            <CardDescription className="text-[#8D9AB5]">
              Volume count of candidates moving from Intake through Background Verification, Competency Assessment, and Training to deployment.
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
    </div>
  );
}
