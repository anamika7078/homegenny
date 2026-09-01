'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { Button } from '@/components/ui/button';

export default function AgreementsPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page-padding max-w-2xl mx-auto">
      <RmPageHeader title="Agreements" description="S4 · EOR · Scope of Work · Client Indemnity · eSign" />
      <div className="rounded-2xl border border-white/10 bg-background/40 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[#FF5A1F]/10 p-2.5 shrink-0">
            <Search className="h-5 w-5 text-[#FF5A1F]" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Agreements are per-staff and per-placement</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Open a staff member and use the &quot;Agreements&quot; action to sign their EOR (A1). Once they reach S5 and
              a placement exists, Scope of Work and Client Indemnity are handled from the Deployments &amp; Placements
              page.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/rm/staff">
            <Button variant="outline">Go to Staff List</Button>
          </Link>
          <Link href="/rm/placements">
            <Button variant="outline">Go to Placements</Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
