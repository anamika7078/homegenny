'use client';

import { MyNotifications } from '@/components/notifications/my-notifications';

/** The morning attention note, and when an RM has answered a rejected invoice. */
export default function FinanceNotificationsPage() {
  return <MyNotifications subtitle="What needs attention each morning, and invoices ready to raise again" />;
}
