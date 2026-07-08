'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { Spinner } from '@/components/ui/loading';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export interface MetricItem {
  label: string;
  value: string | number;
  sub?: string;
  tone?: StatusTone;
  icon?: ReactNode;
}

export function DashboardMetrics({
  title,
  metrics,
  loading,
  embedded,
  className,
}: {
  title: string;
  metrics: MetricItem[];
  loading?: boolean;
  /** When true, skip outer page padding (parent provides it). */
  embedded?: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <motion.div className="flex justify-center items-center h-[50vh]">
        <Spinner />
      </motion.div>
    );
  }

  return (
    <div className={cn(
      embedded ? 'space-y-6 sm:space-y-8' : 'page-padding max-w-[1600px] mx-auto space-y-6 sm:space-y-8',
      'relative',
      className,
    )}>
      {/* Subtle background glow for premium feel */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none rounded-t-3xl -z-10" />

      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70 tracking-tight sm:text-3xl lg:text-4xl">
          {title}
        </h1>
        <p className="text-sm font-medium text-secondary-foreground sm:text-base">
          Live operational KPIs · HomeGenny Platform
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
            whileHover={{ y: -5, scale: 1.02 }}
            className="group"
          >
            <Card className="relative overflow-hidden p-0 bg-background/40 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 group-hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] dark:group-hover:shadow-[0_20px_40px_rgba(255,255,255,0.05)]">
              {/* Card glowing accent line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-primary opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
              
              <CardContent className="relative z-10 p-5 sm:p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-xs font-bold text-secondary-foreground/80 uppercase tracking-widest">
                    {m.label}
                  </div>
                  {m.icon && (
                    <div className="text-primary/70 bg-primary/10 p-2 rounded-lg group-hover:text-primary group-hover:bg-primary/20 transition-colors duration-300">
                      {m.icon}
                    </div>
                  )}
                </div>
                
                <div className="flex items-baseline gap-2 mb-2">
                  <motion.div 
                    className="text-2xl font-black text-foreground tracking-tight sm:text-3xl lg:text-4xl"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 + 0.2 }}
                  >
                    {m.value}
                  </motion.div>
                  {m.tone && (
                    <StatusBadge tone={m.tone} className="ml-2 px-2 py-0.5 text-[10px] font-bold shadow-sm">
                      Live
                    </StatusBadge>
                  )}
                </div>

                {m.sub && (
                  <p className="text-sm text-secondary-foreground/70 font-medium">
                    {m.sub}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
