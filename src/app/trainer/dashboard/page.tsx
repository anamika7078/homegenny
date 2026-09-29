'use client';

import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth.store';

export default function TrainerDashboardPage() {
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getTrainerDashboard();
        setMetrics(data);
      } catch (err) {
        console.error('Failed to load trainer stats:', err);
      }
    }
    load();
  }, []);

  return (
    <div className="page-padding">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-bold text-white sm:text-2xl mb-2">Trainer Dashboard</h1>
        <p className="text-sm text-secondary-foreground">
          Welcome back, {user?.full_name ?? 'Trainer'}. Here is your training overview.
        </p>
      </div>

      <DashboardMetrics
        embedded
        title="Training Center Metrics"
        metrics={[
          { label: 'Active Trainees', value: metrics?.activeTrainees ?? '-' },
          { label: 'Sessions Today', value: metrics?.sessionsToday ?? '-', tone: 'in_progress' },
          { label: 'Quiz Review Pending', value: metrics?.quizPendingReview ?? '-', tone: 'pending', sub: 'Assessments tab' },
          { label: 'Video Certs Review', value: metrics?.videoCertsPending ?? '-', sub: 'Awaiting approval' },
          { label: 'Avg Quiz Score', value: metrics?.avgScore ? `${metrics.avgScore}%` : '-', sub: 'Graded attempts' },
          { label: 'Quiz Reschedules', value: metrics?.retries ?? '-', tone: 'escalated', sub: 'This week' },
        ]}
      />
    </div>
  );
}
