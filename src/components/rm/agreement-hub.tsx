'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, CheckCircle2, Download, PauseCircle } from 'lucide-react';
import { api } from '@/lib/api/client';
import { HoldModal, canHold } from './hold-modal';
import { STAGE_LABELS } from '@/lib/rm/constants';
import type { StaffApplicant } from '@/lib/types';
import {
  useStaffAgreements,
  useCreateAgreement,
  useSendEsignOtp,
  useVerifyEsignOtp,
  useSignAgreement,
  useGenerateAgreementPdf,
  useRmAdvanceStage,
} from '@/lib/rm/hooks';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/loading';

interface AgreementRecord {
  id: string;
  staff_id: string | null;
  client_id: string | null;
  type: string;
  status: 'PENDING' | 'SIGNED';
  otp_verified: boolean;
  pdf_url: string | null;
}

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/15 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF5A1F]/50';

export function AgreementHub() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: staff } = useQuery({
    queryKey: ['staff', id],
    queryFn: () => api.getStaff(id),
    enabled: !!id,
  });
  const s = (staff as { data?: Record<string, string> })?.data ?? (staff as Record<string, string> | undefined);
  // Same DTO shape the kanban board uses (toStaffDto), just loosely typed
  // above for this file's own convenience — safe to hand to HoldModal as-is.
  const staffForHold = s as unknown as StaffApplicant | undefined;
  const openHolds = staffForHold?.open_holds ?? [];
  const currentStageHold = openHolds.find((h) => h.stage === staffForHold?.pipeline_stage);
  const [holdOpen, setHoldOpen] = useState(false);

  const { data, isLoading } = useStaffAgreements(id);
  const rows = (Array.isArray(data) ? data : (data as { data?: unknown[] })?.data ?? []) as AgreementRecord[];
  const a1 = useMemo(() => rows.find((r) => r.type === 'A1' || r.type === 'A1_EOR'), [rows]);

  const [otp, setOtp] = useState('');
  const createAgreement = useCreateAgreement(id);
  const sendOtp = useSendEsignOtp(id);
  const verifyOtp = useVerifyEsignOtp(id);
  const signAgreement = useSignAgreement(id);
  const generatePdf = useGenerateAgreementPdf(id);
  const advance = useRmAdvanceStage();

  const [otpSent, setOtpSent] = useState(false);

  if (isLoading) {
    return (
      <div className="page-padding">
        <TableSkeleton rows={4} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page-padding max-w-2xl mx-auto space-y-6">
      <RmPageHeader
        title={s?.full_name ? `Agreements — ${s.full_name}` : 'Agreements'}
        description={s?.staff_code ? `${s.staff_code} · S4 · EOR e-sign` : 'S4 · EOR e-sign'}
        actions={
          <div className="flex items-center gap-2">
            {staffForHold && canHold(staffForHold.pipeline_stage) && (
              <Button
                variant="outline"
                onClick={() => setHoldOpen(true)}
                className={
                  currentStageHold
                    ? currentStageHold.kind === 'COMPLETE'
                      ? 'border-sky-500/40 text-sky-400'
                      : 'border-amber-500/40 text-amber-400'
                    : undefined
                }
              >
                <PauseCircle className="mr-1.5 h-3.5 w-3.5" />
                {currentStageHold ? (currentStageHold.kind === 'COMPLETE' ? 'Complete' : 'On Hold') : 'Hold / Complete'}
              </Button>
            )}
            <Link href={`/rm/staff/${id}`}>
              <Button variant="outline">Back to Staff</Button>
            </Link>
          </div>
        }
      />

      <div className="rounded-xl border border-white/8 bg-card/60 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center shrink-0">
            <FileText className="w-4.5 h-4.5 text-[#FF5A1F]" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">Employment on Record (A1)</p>
            <p className="text-xs text-muted-foreground">Staff-level agreement — no client needed</p>
          </div>
          {a1 && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-0.5 ${
                a1.status === 'SIGNED'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
            >
              {a1.status === 'SIGNED' ? 'Signed' : 'Pending'}
            </span>
          )}
        </div>

        {!a1 && (
          <div className="space-y-2">
            {createAgreement.isError && <p className="text-xs text-red-400">{createAgreement.error.message}</p>}
            <Button size="sm" disabled={createAgreement.isPending} onClick={() => createAgreement.mutate({ type: 'A1' })}>
              {createAgreement.isPending ? 'Creating…' : 'Create Agreement'}
            </Button>
          </div>
        )}

        {a1 && a1.status === 'PENDING' && !a1.otp_verified && !otpSent && (
          <div className="space-y-2">
            {sendOtp.isError && <p className="text-xs text-red-400">{sendOtp.error.message}</p>}
            <Button
              size="sm"
              disabled={sendOtp.isPending}
              onClick={() =>
                sendOtp.mutate(
                  { agreement_type: a1.type, staff_name: s?.full_name ?? '' },
                  { onSuccess: () => setOtpSent(true) },
                )
              }
            >
              {sendOtp.isPending ? 'Sending OTP…' : 'Send eSign OTP'}
            </Button>
          </div>
        )}

        {a1 && a1.status === 'PENDING' && (a1.otp_verified || otpSent) && (
          <div className="space-y-2">
            <input className={inputCls} placeholder="6-digit OTP" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
            {(verifyOtp.isError || signAgreement.isError) && (
              <p className="text-xs text-red-400">{(verifyOtp.error ?? signAgreement.error)?.message}</p>
            )}
            <Button
              size="sm"
              disabled={otp.length < 4 || signAgreement.isPending}
              onClick={() => signAgreement.mutate({ id: a1.id, otp })}
            >
              {signAgreement.isPending ? 'Signing…' : 'Verify OTP & Sign'}
            </Button>
          </div>
        )}

        {a1 && a1.status === 'SIGNED' && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Signed
            </p>
            {a1.pdf_url ? (
              <a href={a1.pdf_url} download className="inline-flex">
                <Button size="sm" variant="outline">
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </Button>
              </a>
            ) : (
              <Button size="sm" variant="outline" disabled={generatePdf.isPending} onClick={() => generatePdf.mutate(a1.id)}>
                {generatePdf.isPending ? 'Generating…' : 'Generate PDF'}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/8 bg-white/3 p-4 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground">Advance once the EOR agreement is signed.</p>
        <Button
          disabled={!a1 || a1.status !== 'SIGNED' || advance.isPending}
          onClick={() => advance.mutate({ staffId: id, to_stage: 'S5_DEPLOY' })}
        >
          {advance.isPending ? 'Advancing…' : 'Advance to Deployment'}
        </Button>
      </div>
      {advance.isError && (
        <div className="space-y-1.5">
          <p className="text-xs text-red-400">{advance.error.message}</p>
          {staffForHold && canHold(staffForHold.pipeline_stage) && !currentStageHold && (
            <p className="text-xs text-muted-foreground">
              Not resolved yet? Put {STAGE_LABELS[staffForHold.pipeline_stage]} on hold to let the staff move to
              Deployment anyway — held work still has to be finished and the stage released before this staff can
              be placed with a client. If the work actually already happened outside the system, mark it complete
              instead — that doesn&apos;t block placement.
            </p>
          )}
        </div>
      )}

      {holdOpen && staffForHold && (
        <HoldModal
          staff={staffForHold}
          onClose={() => {
            setHoldOpen(false);
            qc.invalidateQueries({ queryKey: ['staff', id] });
          }}
        />
      )}

      <p className="text-xs text-muted-foreground/70">
        Scope of Work and Client Indemnity are set up per-placement once a client is assigned — see the Deployments
        &amp; Placements page after this staff member reaches S5.
      </p>
    </motion.div>
  );
}
