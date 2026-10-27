'use client';

import { MyNotifications } from '@/components/notifications/my-notifications';

/** Invoices Finance rejected (check the rate), and reminders while one is waiting. */
export default function RmNotificationsPage() {
  return <MyNotifications subtitle="Rejected invoices to check, and reminders while a rate is waiting on you" />;
}
