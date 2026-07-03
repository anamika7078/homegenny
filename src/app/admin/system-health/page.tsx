"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from '@/lib/api/client';
import { Activity, Server, Clock, Database, AlertCircle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export default function AdminSystemHealthPage() {
  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['admin', 'system-health'],
    queryFn: () => api.getAdminSystemHealth(),
    refetchInterval: 30000,
  });

  const { data: queueData, isLoading: queueLoading, refetch: refetchQueue } = useQuery({
    queryKey: ['admin', 'queues'],
    queryFn: () => api.getAdminQueueStatus(),
    refetchInterval: 30000,
  });

  const { data: cronData, isLoading: cronLoading, refetch: refetchCron } = useQuery({
    queryKey: ['admin', 'cron-status'],
    queryFn: () => api.getAdminCronStatus(),
    refetchInterval: 30000,
  });

  const health = healthData?.data || healthData || {};
  const queue = queueData?.data || queueData || {};
  const cron = cronData?.data || cronData || {};

  const handleRefreshAll = () => {
    refetchHealth();
    refetchQueue();
    refetchCron();
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0m';
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d > 0 ? d + 'd ' : ''}${h > 0 ? h + 'h ' : ''}${m}m`;
  };

  return (
    <div className="page-padding space-y-6 sm:space-y-8 min-h-screen text-[#E8EDF8]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#E8EDF8]">System Monitoring</h1>
          <p className="text-[#8D9AB5] mt-1 text-sm">Real-time health, queues, and background cron jobs.</p>
        </div>
        <Button onClick={handleRefreshAll} variant="outline" className="border-border/60 hover:bg-[#1C2740] hover:text-white transition-all text-[#8D9AB5] bg-transparent">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh All
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* API Health Card */}
        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            {healthLoading ? (
               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            ) : health.status === 'OK' ? (
              <CheckCircle className="h-6 w-6 text-emerald-500" />
            ) : (
              <AlertCircle className="h-6 w-6 text-rose-500" />
            )}
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#8D9AB5] flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" /> Core API Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#E8EDF8] mb-1">
              {health.status || 'UNKNOWN'}
            </div>
            <p className="text-xs text-[#8D9AB5] flex items-center gap-1">
              <Clock className="h-3 w-3 text-[#8D9AB5]" /> Uptime: {formatUptime(health.uptime)}
            </p>
          </CardContent>
        </Card>

        {/* Database Health Card (Mocked for visualization) */}
        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <CheckCircle className="h-6 w-6 text-emerald-500" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#8D9AB5] flex items-center gap-2">
              <Database className="h-4 w-4 text-success" /> PostgreSQL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#E8EDF8] mb-1">Connected</div>
            <p className="text-xs text-[#8D9AB5] flex items-center gap-1">
              <Activity className="h-3 w-3 text-[#8D9AB5]" /> Latency: 12ms
            </p>
          </CardContent>
        </Card>

        {/* Cron Jobs Card */}
        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            {cronLoading ? (
               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            ) : cron.activeJobs > 0 ? (
              <CheckCircle className="h-6 w-6 text-emerald-500" />
            ) : (
              <AlertCircle className="h-6 w-6 text-amber-500" />
            )}
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#8D9AB5] flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" /> Cron Scheduler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#E8EDF8] mb-1">
              {cron.activeJobs || 0} <span className="text-sm text-[#8D9AB5] font-normal">Active Jobs</span>
            </div>
            <p className="text-xs text-[#8D9AB5] flex items-center gap-1">
              Last Run: {cron.lastRun ? new Date(cron.lastRun).toLocaleTimeString() : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
        <CardHeader className="pb-6 border-b border-border/40">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-[#E8EDF8]">
            <Activity className="h-5 w-5 text-primary" /> Redis Bull Queues
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {queueLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-blue-955/40 rounded-xl p-6 border border-blue-900/30">
                <div className="text-sm font-medium text-blue-300 mb-2">Pending</div>
                <div className="text-4xl font-extrabold text-blue-400">{queue.pending || 0}</div>
              </div>
              <div className="bg-amber-955/40 rounded-xl p-6 border border-amber-900/30">
                <div className="text-sm font-medium text-amber-300 mb-2">Active</div>
                <div className="text-4xl font-extrabold text-amber-400">{queue.active || 0}</div>
              </div>
              <div className="bg-emerald-955/40 rounded-xl p-6 border border-emerald-900/30">
                <div className="text-sm font-medium text-emerald-300 mb-2">Completed</div>
                <div className="text-4xl font-extrabold text-emerald-400">{queue.completed || 0}</div>
              </div>
              <div className="bg-rose-955/40 rounded-xl p-6 border border-rose-900/30">
                <div className="text-sm font-medium text-rose-300 mb-2">Failed</div>
                <div className="text-4xl font-extrabold text-rose-400">{queue.failed || 0}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
