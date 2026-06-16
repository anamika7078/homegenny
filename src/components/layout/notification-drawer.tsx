'use client';

import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { AnimatePresence, motion } from 'framer-motion';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  unread?: boolean;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  { id: '1', title: 'Trial expiring', body: 'Ramkishan Yadav — trial ends in 3 days', time: '2m ago', unread: true },
  { id: '2', title: 'Scenario SC-06', body: 'First high-acuity deployment flagged for BM review', time: '1h ago', unread: true },
  { id: '3', title: 'PV renewal', body: '2 staff require police verification renewal', time: '3h ago' },
];

export function NotificationDrawer() {
  const [open, setOpen] = useState(false);
  const unread = MOCK_NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative rounded-lg p-2 text-secondary-foreground hover:bg-white/5 hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border/50 bg-card shadow-2xl"
            >
              <motion.div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
                <h3 className="font-bold text-foreground">Notifications</h3>
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-white/5">
                  <X className="h-5 w-5" />
                </button>
              </motion.div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {MOCK_NOTIFICATIONS.map((n) => (
                  <motion.div
                    key={n.id}
                    className={cn(
                      'rounded-xl border p-4 transition-colors',
                      n.unread ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-background/40',
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    <p className="mt-1 text-xs text-secondary-foreground">{n.body}</p>
                    <p className="mt-2 text-[10px] text-muted-foreground">{n.time}</p>
                  </motion.div>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
