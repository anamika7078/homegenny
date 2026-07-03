'use client';

import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

export default function DeploymentsPage() {
  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="page-padding max-w-6xl mx-auto space-y-6"
      >
        <motion.div>
          <h1 className="text-2xl font-bold text-foreground">Deployment Management</h1>
          <p className="text-sm text-secondary-foreground mt-1">
            S5 · Trial tracking · GPS · Medication logs · Buddy-in protocol
          </p>
        </motion.div>
        <Card className="bg-card border-border/50">
          <CardContent className="page-padding space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <p className="font-semibold text-foreground">HG-SC-20250512-0041</p>
                <p className="text-xs text-secondary-foreground">EC care · Vasant Kunj · 14-day trial</p>
              </div>
              <StatusBadge tone="in_progress">Trial Day 9</StatusBadge>
            </div>
            <p className="text-sm text-secondary-foreground">
              Daily care logs, GPS attendance, and medication records are mandatory before shift closure.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </AppShell>
  );
}
