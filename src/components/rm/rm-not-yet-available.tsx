'use client';

import { motion } from 'framer-motion';
import { Construction } from 'lucide-react';
import { RmPageHeader } from './rm-page-header';

interface RmNotYetAvailableProps {
  title: string;
  description?: string;
  /** Plain-language reason this isn't wired up yet — no fake data, no dead buttons. */
  reason: string;
  /** What real functionality is coming, so the RM knows what to expect. */
  planned?: string[];
}

/**
 * Honest placeholder for RM pages whose real backend integration isn't built yet.
 * Compliance actions (verify / sign / approve) must never appear clickable when
 * nothing actually leaves the browser — see RM_WEB_IMPLEMENTATION_PLAN.md §2.3.
 */
export function RmNotYetAvailable({ title, description, reason, planned }: RmNotYetAvailableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-padding max-w-2xl mx-auto"
    >
      <RmPageHeader title={title} description={description} />

      <div className="rounded-2xl border border-white/10 bg-background/40 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-500/10 p-2.5 shrink-0">
            <Construction className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Not yet available</p>
            <p className="mt-1 text-sm text-muted-foreground">{reason}</p>
          </div>
        </div>

        {planned && planned.length > 0 && (
          <div className="pt-2 border-t border-white/8">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Coming soon
            </p>
            <ul className="space-y-1.5">
              {planned.map((item) => (
                <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-muted-foreground/50 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground/70 pt-2 border-t border-white/8">
          No approve, sign, or verify action on this page records anything yet — nothing here should be
          treated as a completed compliance step.
        </p>
      </div>
    </motion.div>
  );
}
