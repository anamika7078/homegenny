'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '@/lib/api/client';
import { useRmScope } from '@/lib/rm/hooks';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { Button } from '@/components/ui/button';

const COLORS = ['#FF5A1F', '#00C9A7', '#6366f1', '#f59e0b'];

export default function RmReportsPage() {
  const { rmId } = useRmScope();

  const { data: conversion, isLoading } = useQuery({
    queryKey: ['reports-conversion'],
    queryFn: () => api.getReportsConversion(),
  });

  const { data: productivity } = useQuery({
    queryKey: ['reports-productivity', rmId],
    queryFn: () => api.getReportsRmProductivity(rmId),
  });

  const body = (conversion as { data?: { funnel?: { pipeline_stage: string; count: string }[]; trials?: { status: string; count: number }[] } })?.data ?? conversion;
  const funnel = (body as { funnel?: { pipeline_stage: string; count: string }[] })?.funnel ?? [];
  const trials = (body as { trials?: { status: string; count: number }[] })?.trials ?? [];
  const prodRows = (productivity as { data?: unknown[] })?.data ?? productivity ?? [];

  const exportCsv = () => {
    const lines = ['stage,count', ...funnel.map((f) => `${f.pipeline_stage},${f.count}`)];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pipeline-funnel.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      <RmPageHeader
        title="Reports & Analytics"
        description="Intake, verification, placement funnel, and RM productivity"
        actions={<Button onClick={exportCsv}>Export CSV</Button>}
      />

      {isLoading ? (
        <p className="text-muted-foreground">Loading reports...</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-card rounded-xl p-4">
            <h3 className="mb-4 font-semibold">Pipeline Funnel</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={funnel.map((f) => ({ name: f.pipeline_stage, value: Number(f.count) }))}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#FF5A1F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-xl p-4">
            <h3 className="mb-4 font-semibold">Trial vs Confirmed</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={trials.map((t) => ({ name: t.status, value: t.count }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {trials.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="glass-card rounded-xl p-4">
        <h3 className="mb-4 font-semibold">RM Productivity (monthly)</h3>
        <pre className="max-h-48 overflow-auto rounded-lg bg-black/30 p-3 text-xs">
          {JSON.stringify(prodRows, null, 2)}
        </pre>
      </div>
    </div>
  );
}
