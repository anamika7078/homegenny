"use client";

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from '@/lib/api/client';
import { Activity, RefreshCw, RotateCcw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface FailedJob {
  id: string | number;
  name: string;
  failedReason?: string;
  attemptsMade?: number;
  timestamp?: number;
  data?: Record<string, unknown>;
}

export default function AdminQueuesPage() {
  const queryClient = useQueryClient();

  const { data: queueData, isLoading: queueLoading, refetch: refetchQueue, isFetching } = useQuery({
    queryKey: ['admin', 'queues'],
    queryFn: () => api.getAdminQueueStatus(),
    refetchInterval: 30_000,
  });

  const { data: failedData, isLoading: failedLoading, refetch: refetchFailed } = useQuery({
    queryKey: ['admin', 'queues-failed'],
    queryFn: () => api.getAdminFailedQueueJobs(25),
    refetchInterval: 30_000,
  });

  const retryMutation = useMutation({
    mutationFn: () => api.retryAdminFailedQueueJobs(),
    onSuccess: (result: { retried?: number; total?: number; data?: { retried?: number } }) => {
      const payload = result?.data ?? result;
      const count = payload?.retried ?? 0;
      toast.success(count > 0 ? `Retried ${count} failed job(s)` : 'No failed jobs to retry');
      queryClient.invalidateQueries({ queryKey: ['admin', 'queues'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'queues-failed'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to retry jobs'),
  });

  const queue = queueData?.data ?? queueData ?? {};
  const failedJobs: FailedJob[] = Array.isArray(failedData) ? failedData : (failedData?.data ?? []);

  const handleRefresh = () => {
    refetchQueue();
    refetchFailed();
  };

  return (
    <div className="page-padding space-y-6 sm:space-y-8 min-h-screen text-[#E8EDF8]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#E8EDF8]">Queue Monitoring (BullMQ)</h1>
          <p className="text-[#8D9AB5] mt-1 text-sm">Real-time Redis job queue status and failed job recovery.</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="border-border/60 hover:bg-[#1C2740] hover:text-white transition-all text-[#8D9AB5] bg-transparent"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            onClick={() => retryMutation.mutate()}
            disabled={retryMutation.isPending || (queue.failed ?? 0) === 0}
            variant="outline"
            className="border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 transition-all text-rose-400 bg-transparent"
          >
            <RotateCcw className={`mr-2 h-4 w-4 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
            Retry Failed Jobs
          </Button>
        </div>
      </div>

      <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
        <CardHeader className="pb-6 border-b border-border/40">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-[#E8EDF8]">
            <Activity className="h-5 w-5 text-primary" />
            {queue.name ? `${queue.name} Queue` : 'Job Queues'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {queueLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-blue-955/40 rounded-xl p-6 border border-blue-900/30">
                <div className="text-sm font-medium text-blue-300 mb-2">Pending</div>
                <div className="text-4xl font-extrabold text-blue-400">{queue.pending ?? 0}</div>
              </div>
              <div className="bg-amber-955/40 rounded-xl p-6 border border-amber-900/30">
                <div className="text-sm font-medium text-amber-300 mb-2">Active</div>
                <div className="text-4xl font-extrabold text-amber-400">{queue.active ?? 0}</div>
              </div>
              <div className="bg-emerald-955/40 rounded-xl p-6 border border-emerald-900/30">
                <div className="text-sm font-medium text-emerald-300 mb-2">Completed</div>
                <div className="text-4xl font-extrabold text-emerald-400">{queue.completed ?? 0}</div>
              </div>
              <div className="bg-rose-955/40 rounded-xl p-6 border border-rose-900/30">
                <div className="text-sm font-medium text-rose-300 mb-2">Failed</div>
                <div className="text-4xl font-extrabold text-rose-400">{queue.failed ?? 0}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
        <CardHeader className="pb-6 border-b border-border/40">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-[#E8EDF8]">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            Failed Jobs
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {failedLoading ? (
            <div className="flex justify-center items-center h-24">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : failedJobs.length === 0 ? (
            <p className="text-sm text-[#8D9AB5] text-center py-8">No failed jobs — queue is healthy.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#8D9AB5] border-b border-border/40">
                    <th className="pb-3 pr-4 font-medium">Job ID</th>
                    <th className="pb-3 pr-4 font-medium">Name</th>
                    <th className="pb-3 pr-4 font-medium">Attempts</th>
                    <th className="pb-3 pr-4 font-medium">Failed At</th>
                    <th className="pb-3 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {failedJobs.map((job) => (
                    <tr key={job.id} className="border-b border-border/20 hover:bg-[#1C2740]/40">
                      <td className="py-3 pr-4 font-mono text-xs text-[#8D9AB5]">{job.id}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="border-border/60 text-[#E8EDF8]">{job.name}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-[#8D9AB5]">{job.attemptsMade ?? '—'}</td>
                      <td className="py-3 pr-4 text-xs text-[#8D9AB5]">
                        {job.timestamp
                          ? new Date(job.timestamp).toLocaleString('en-IN', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="py-3 text-xs text-rose-400 max-w-xs truncate" title={job.failedReason}>
                        {job.failedReason ?? 'Unknown error'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
