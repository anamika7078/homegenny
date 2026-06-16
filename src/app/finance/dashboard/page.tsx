'use client';

import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics';

export default function FinanceDashboardPage() {
  return (
    <>
      <DashboardMetrics
        title="Finance Admin Dashboard"
        metrics={[
          { label: 'Payroll Queue', value: 12, sub: 'Pending disbursement', tone: 'pending' },
          { label: 'Invoices Due', value: 8, sub: 'Next 7 days', tone: 'in_progress' },
          { label: 'Deposits Held', value: '₹4.2L', sub: 'Staff onboarding' },
          { label: 'GST This Month', value: '₹38,400', sub: 'Management fees' },
          { label: 'ESIC/PF Filings', value: 2, sub: 'Due this week', tone: 'escalated' },
        ]}
      />
    </>
  );
}
