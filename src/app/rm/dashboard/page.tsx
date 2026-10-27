'use client';

import { RmPageHeader } from '@/components/rm/rm-page-header';
import { RmDashboardWidgets } from '@/components/rm/dashboard-widgets';
import { RateReviewAlert } from '@/components/rm/rate-review-alert';

export default function RmDashboardPage() {
  return (
    <div className="page-padding">
      <RmPageHeader
        title="RM Dashboard"
        description="Pipeline oversight, verification queues, and placement performance"
      />
      <RateReviewAlert />
      <RmDashboardWidgets />
    </div>
  );
}
