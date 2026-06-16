'use client';

import { RmPageHeader } from '@/components/rm/rm-page-header';

export default function RmNotificationsPage() {
  return (
    <div className="p-6">
      <RmPageHeader title="Notifications" description="WhatsApp, SMS, email, and in-app alerts" />
      <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
        In-app notifications are delivered via the header drawer. Stage and verification events are
        queued through BullMQ + Redis on the backend.
      </div>
    </div>
  );
}
