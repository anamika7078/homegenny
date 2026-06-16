'use client';

import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { getSocket } from '@/lib/api/socket';
import { useAuthStore } from '@/lib/store/auth.store';

export function useRealtimeAlerts() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;

    let socket: ReturnType<typeof getSocket>;
    try {
      socket = getSocket();
    } catch {
      return;
    }

    const onEscalation = (payload: { code?: string; staffId?: string }) => {
      toast.error(`Escalation: scenario ${payload.code ?? 'alert'}`, { duration: 6000 });
    };

    const onCron = (payload: { count?: number; event?: string }) => {
      if (payload.count && payload.count > 0) {
        toast(`Cron alert: ${payload.count} item(s) need attention`, { icon: '⏰' });
      }
    };

    socket.on('escalation.alert', onEscalation);
    socket.on('scenario.triggered', onEscalation);
    socket.on('cron.trial_expiry', onCron);
    socket.on('cron.missing_daily_logs', onCron);

    return () => {
      socket.off('escalation.alert', onEscalation);
      socket.off('scenario.triggered', onEscalation);
      socket.off('cron.trial_expiry', onCron);
      socket.off('cron.missing_daily_logs', onCron);
    };
  }, [isAuthenticated]);
}
