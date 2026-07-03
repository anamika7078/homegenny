'use client';

import { useQuery } from '@tanstack/react-query';
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics';
import { api } from '@/lib/api/client';

function fmtRs(n: number) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;
}

export default function FinanceDashboardPage() {
  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ['finance', 'dashboard-analytics'],
    queryFn: () => api.getFinanceDashboard(),
  });

  const { data: payrollData, isLoading: loadingPayroll } = useQuery({
    queryKey: ['finance', 'payroll-pending'],
    queryFn: () => api.getFinancePayroll(),
  });

  const { data: invoiceSummary, isLoading: loadingInvoices } = useQuery({
    queryKey: ['finance', 'invoice-summary'],
    queryFn: () => api.getFinanceInvoiceSummary(),
  });

  const { data: depositStats, isLoading: loadingDeposits } = useQuery({
    queryKey: ['finance', 'deposit-stats'],
    queryFn: () => api.getFinanceDepositStats(),
  });

  const loading = loadingAnalytics || loadingPayroll || loadingInvoices || loadingDeposits;

  const dash = analytics?.data ?? analytics ?? {};
  const payroll = Array.isArray(payrollData) ? payrollData : (payrollData?.data ?? []);
  const pendingPayroll = payroll.filter((p: { disbursed_at?: string | null }) => !p.disbursed_at).length;

  const invSum = invoiceSummary?.data ?? invoiceSummary ?? {};
  const dueSoon = Number(invSum.due_soon ?? invSum.dueSoon ?? 0);
  const deposits = depositStats?.data ?? depositStats ?? {};
  const totalHeld = Number(deposits.total_collected ?? deposits.totalCollected ?? 0);

  return (
    <DashboardMetrics
      title="Finance Admin Dashboard"
      loading={loading}
      metrics={[
        {
          label: 'Payroll Queue',
          value: pendingPayroll,
          sub: 'Pending disbursement',
          tone: pendingPayroll > 0 ? 'pending' : undefined,
        },
        {
          label: 'Invoices Due',
          value: dueSoon,
          sub: 'Outstanding / overdue',
          tone: dueSoon > 0 ? 'in_progress' : undefined,
        },
        {
          label: 'Deposits Held',
          value: fmtRs(totalHeld),
          sub: 'Staff onboarding deposits collected',
        },
        {
          label: 'GST This Month',
          value: fmtRs(Number(dash.total_gst_liability ?? 0)),
          sub: 'Management fee GST liability',
        },
        {
          label: 'Monthly Revenue',
          value: fmtRs(Number(dash.current_month_revenue ?? 0)),
          sub: dash.revenue_growth_pct != null
            ? `${dash.revenue_growth_pct >= 0 ? '+' : ''}${dash.revenue_growth_pct}% vs last month`
            : 'Management fee income',
          tone: 'escalated',
        },
      ]}
    />
  );
}
