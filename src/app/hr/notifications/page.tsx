'use client';

import { Bell, AlertTriangle, FileText, CheckCircle } from 'lucide-react';

const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'ALERT', message: 'Driving License for Rajesh (Driver) expires in 5 days.', time: '2 hours ago', icon: AlertTriangle, color: 'text-orange-400' },
  { id: 2, type: 'WARNING', message: 'Police Verification missing for newly added Cook (Aarti).', time: '5 hours ago', icon: FileText, color: 'text-yellow-400' },
  { id: 3, type: 'INFO', message: 'Attendance report for July generated successfully.', time: '1 day ago', icon: CheckCircle, color: 'text-green-400' },
];

export default function HrNotificationsPage() {
  return (
    <div className="page-padding max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-orange-500/10 p-2.5">
          <Bell className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Notifications & Alerts</h1>
          <p className="text-sm text-secondary-foreground">Recent alerts for document expirations and attendance</p>
        </div>
      </div>

      <div className="space-y-4">
        {MOCK_NOTIFICATIONS.map(notif => (
          <div key={notif.id} className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10">
            <div className={`mt-1 rounded-full p-2 bg-white/5 ${notif.color}`}>
              <notif.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{notif.message}</p>
              <span className="text-xs text-secondary-foreground mt-1 block">{notif.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
