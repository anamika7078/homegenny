'use client';

import { useQuery } from '@tanstack/react-query';
import { Bell, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api/client';
import { Spinner } from '@/components/ui/loading';
import { unwrapItems } from '@/lib/hr/utils';
import toast from 'react-hot-toast';

function iconFor(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes('expir') || lower.includes('urgent') || lower.includes('alert')) {
    return { icon: AlertTriangle, color: 'text-orange-400' };
  }
  if (lower.includes('document') || lower.includes('missing')) {
    return { icon: FileText, color: 'text-yellow-400' };
  }
  return { icon: CheckCircle, color: 'text-green-400' };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default function HrNotificationsPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['hr-notifications'],
    queryFn: () => api.getHrNotifications(),
  });

  const notifications = unwrapItems(data);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markHrNotificationRead(id);
      refetch();
    } catch {
      toast.error('Could not mark notification as read');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="page-padding max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-orange-500/10 p-2.5">
          <Bell className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Notifications & Alerts</h1>
          <p className="text-sm text-secondary-foreground">Document expirations, attendance, and HR alerts</p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-background/40 p-12 text-center text-secondary-foreground">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif: any) => {
            const { icon: Icon, color } = iconFor(notif.title ?? notif.body ?? '');
            const unread = !notif.readAt;
            return (
              <button
                key={notif.id}
                type="button"
                onClick={() => unread && handleMarkRead(notif.id)}
                className={`w-full flex items-start gap-4 rounded-xl border p-4 text-left transition-colors ${
                  unread
                    ? 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className={`mt-1 rounded-full p-2 bg-white/5 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{notif.title ?? 'Notification'}</p>
                  <p className="text-sm text-secondary-foreground mt-1">{notif.body ?? '—'}</p>
                  <span className="text-xs text-secondary-foreground mt-2 block">
                    {notif.createdAt ? timeAgo(notif.createdAt) : ''}
                    {unread ? ' • Unread' : ''}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
