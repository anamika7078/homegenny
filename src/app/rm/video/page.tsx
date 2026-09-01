'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { Button } from '@/components/ui/button';

export default function VideoQueuePage() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page-padding max-w-2xl mx-auto">
      <RmPageHeader title="Video Certification" description="Review certification recordings for verified staff" />
      <div className="rounded-2xl border border-white/10 bg-background/40 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[#FF5A1F]/10 p-2.5 shrink-0">
            <Search className="h-5 w-5 text-[#FF5A1F]" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Video certification is per-staff</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Open a staff member from the Staff list, then use the &quot;Video&quot; action on their detail page to
              review their certification recordings. Approve/reject stays with Trainer/Admin — this view is read-only.
            </p>
          </div>
        </div>
        <Link href="/rm/staff">
          <Button variant="outline">Go to Staff List</Button>
        </Link>
      </div>
    </motion.div>
  );
}
