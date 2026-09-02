'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Play, ShieldCheck, Lock, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useStaffVideoCerts, useVideoCertViewUrl, useVideoCertPrompts } from '@/lib/rm/hooks';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/loading';
import { SERIES_LABELS } from '@/lib/rm/constants';

interface VideoCertRecord {
  id: string;
  staffId: string;
  promptKey: string;
  videoUrl: string;
  sha256Hash: string;
  attemptNumber: number;
  reviewStatus: string;
  reviewedBy: string | null;
  reviewNotes: string | null;
  neverDelete: boolean;
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  APPROVED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  REJECTED: 'bg-red-500/15 text-red-400 border-red-500/30',
};

function CertCard({ cert }: { cert: VideoCertRecord }) {
  const [open, setOpen] = useState(false);
  const viewUrl = useVideoCertViewUrl();

  return (
    <div className="rounded-xl border border-white/8 bg-card/60 overflow-hidden">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && !viewUrl.data) viewUrl.mutate(cert.videoUrl);
        }}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/3 transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center shrink-0">
          <Video className="w-5 h-5 text-[#FF5A1F]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{cert.promptKey}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span>Attempt {cert.attemptNumber}</span>
            <span>{new Date(cert.createdAt).toLocaleString()}</span>
            {cert.neverDelete && (
              <span className="flex items-center gap-1 text-sky-400">
                <Lock className="w-3 h-3" /> Locked evidence
              </span>
            )}
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-0.5 ${STATUS_STYLE[cert.reviewStatus] ?? STATUS_STYLE.PENDING}`}>
          {cert.reviewStatus}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground ml-1 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-white/6"
          >
            <div className="px-5 py-4 space-y-3">
              {viewUrl.isPending && <p className="text-xs text-muted-foreground">Generating playback URL…</p>}
              {viewUrl.isError && <p className="text-xs text-red-400">{viewUrl.error.message}</p>}
              {viewUrl.data && (
                <video
                  controls
                  className="w-full rounded-lg bg-black aspect-video"
                  src={(viewUrl.data as { url?: string }).url}
                >
                  <Play className="w-6 h-6" />
                </video>
              )}
              <div className="p-3 rounded-lg bg-white/3 border border-white/8 font-mono text-xs text-muted-foreground break-all">
                SHA-256: {cert.sha256Hash}
              </div>
              {cert.reviewNotes && (
                <p className="text-xs text-muted-foreground">
                  Review notes: <span className="text-foreground">{cert.reviewNotes}</span>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function VideoCertViewer() {
  const { id } = useParams<{ id: string }>();

  const { data: staff } = useQuery({
    queryKey: ['staff', id],
    queryFn: () => api.getStaff(id),
    enabled: !!id,
  });
  const s = (staff as { data?: Record<string, string> })?.data ?? (staff as Record<string, string> | undefined);
  const series = s?.series;

  const { data, isLoading } = useStaffVideoCerts(id);
  const certs = (Array.isArray(data) ? data : (data as { data?: unknown[] })?.data ?? []) as VideoCertRecord[];

  const { data: promptsData } = useVideoCertPrompts(series ?? '');
  const prompts = (promptsData as { prompts?: string[] } | undefined)?.prompts ?? [];

  const sorted = useMemo(() => [...certs].sort((a, b) => b.attemptNumber - a.attemptNumber), [certs]);

  if (isLoading) {
    return (
      <div className="page-padding">
        <TableSkeleton rows={4} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page-padding max-w-3xl mx-auto space-y-6">
      <RmPageHeader
        title={s?.full_name ? `Video Certification — ${s.full_name}` : 'Video Certification'}
        description={s?.staff_code ? `${s.staff_code} · ${SERIES_LABELS[series ?? ''] ?? series ?? ''}` : undefined}
        actions={
          <Link href={`/rm/staff/${id}`}>
            <Button variant="outline">Back to Staff</Button>
          </Link>
        }
      />

      <div className="flex items-start gap-3 p-4 rounded-xl border border-sky-500/20 bg-sky-500/5">
        <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <p className="text-xs text-sky-300">
          Read-only for RM. Approve/reject is handled by Trainer/Admin — this page is for reviewing evidence, not
          signing off on it.
        </p>
      </div>

      {prompts.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Required Prompts</p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            {prompts.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-white/8 py-16 text-center text-muted-foreground text-sm">
          No certification videos submitted yet.
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((cert) => (
            <CertCard key={cert.id} cert={cert} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
