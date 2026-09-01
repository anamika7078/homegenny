'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Fingerprint,
  CreditCard,
  AlertTriangle,
  ShieldCheck,
  Stethoscope,
  CheckCircle2,
  Clock,
  XCircle,
  Circle,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import {
  useVerificationStatus,
  useGenerateAadhaarOtp,
  useVerifyAadhaarOtp,
  useVerifyDL,
  useCheckEchallan,
  useSubmitPoliceVerification,
  useClosePoliceVerification,
  useSubmitMedicalVerification,
  useRmAdvanceStage,
} from '@/lib/rm/hooks';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/loading';

type TrackStatus = 'NOT_STARTED' | 'CLEAR' | 'FAILED' | 'PENDING' | 'EXPIRED';

interface VerificationTrack {
  track: string;
  track_type: string;
  required: boolean;
  status: TrackStatus;
  verified_at: string | null;
  notes: string | null;
  result: Record<string, unknown> | null;
}

interface VerificationStatusResponse {
  staff_id: string;
  series: string;
  tracks: VerificationTrack[];
  all_required_clear: boolean;
}

const STATUS_STYLE: Record<TrackStatus, { cls: string; label: string; icon: typeof CheckCircle2 }> = {
  CLEAR: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Clear', icon: CheckCircle2 },
  PENDING: { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'Pending', icon: Clock },
  FAILED: { cls: 'bg-red-500/15 text-red-400 border-red-500/30', label: 'Failed', icon: XCircle },
  EXPIRED: { cls: 'bg-red-500/15 text-red-400 border-red-500/30', label: 'Expired', icon: XCircle },
  NOT_STARTED: { cls: 'bg-white/8 text-muted-foreground border-white/15', label: 'Not started', icon: Circle },
};

function StatusBadge({ status }: { status: TrackStatus }) {
  const st = STATUS_STYLE[status] ?? STATUS_STYLE.NOT_STARTED;
  const Icon = st.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-0.5 ${st.cls}`}>
      <Icon className="w-3 h-3" />
      {st.label}
    </span>
  );
}

function TrackCard({
  icon: Icon,
  title,
  required,
  status,
  children,
}: {
  icon: typeof Fingerprint;
  title: string;
  required: boolean;
  status: TrackStatus;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-card/60 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center shrink-0">
          <Icon className="w-4.5 h-4.5 text-[#FF5A1F]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{title}</span>
            {required && (
              <span className="text-[9px] font-bold uppercase text-muted-foreground border border-white/15 rounded-full px-1.5 py-0.5">
                Required
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
      {children}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/15 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF5A1F]/50';

function AadhaarTrack({ staffId, track, staffName, staffAadhaar }: { staffId: string; track: VerificationTrack; staffName?: string; staffAadhaar?: string }) {
  const [aadhaar, setAadhaar] = useState(staffAadhaar ?? '');
  const [otp, setOtp] = useState('');
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [reverify, setReverify] = useState(false);

  const generateOtp = useGenerateAadhaarOtp();
  const verifyOtp = useVerifyAadhaarOtp(staffId);

  const alreadyClear = track.status === 'CLEAR' && !reverify;
  const resultName = (track.result?.['name'] as string | undefined) ?? undefined;
  const nameMismatch = alreadyClear && staffName && resultName && !staffName.toLowerCase().includes(resultName.toLowerCase().split(' ')[0] ?? '');

  if (alreadyClear) {
    return (
      <TrackCard icon={Fingerprint} title="Aadhaar eKYC" required={track.required} status={track.status}>
        <div className="text-sm text-muted-foreground space-y-1">
          {resultName && <p>Verified name: <span className="text-foreground">{resultName}</span></p>}
          {Boolean(track.result?.['aadhaar_number_last4']) && (
            <p>Aadhaar: <span className="text-foreground font-mono">XXXX-XXXX-{String(track.result?.['aadhaar_number_last4'])}</span></p>
          )}
          {track.verified_at && <p>Verified {new Date(track.verified_at).toLocaleString()}</p>}
        </div>
        {nameMismatch && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Verified name doesn&apos;t clearly match the staff record — double-check before relying on this.
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => setReverify(true)}>
          Re-verify
        </Button>
      </TrackCard>
    );
  }

  return (
    <TrackCard icon={Fingerprint} title="Aadhaar eKYC" required={track.required} status={track.status}>
      {!referenceId ? (
        <div className="space-y-2">
          <input
            className={inputCls}
            placeholder="12-digit Aadhaar number"
            maxLength={12}
            value={aadhaar}
            onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ''))}
          />
          {generateOtp.isError && <p className="text-xs text-red-400">{generateOtp.error.message}</p>}
          <Button
            size="sm"
            disabled={aadhaar.length !== 12 || generateOtp.isPending}
            onClick={() =>
              generateOtp.mutate(
                { aadhaar_number: aadhaar },
                { onSuccess: (res) => setReferenceId((res as { reference_id: string }).reference_id) },
              )
            }
          >
            {generateOtp.isPending ? 'Sending OTP…' : 'Send OTP'}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            className={inputCls}
            placeholder="6-digit OTP"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          />
          {verifyOtp.isError && <p className="text-xs text-red-400">{verifyOtp.error.message}</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={otp.length < 4 || verifyOtp.isPending}
              onClick={() =>
                verifyOtp.mutate(
                  { reference_id: referenceId, otp, aadhaar_number: aadhaar },
                  { onSuccess: () => { setReverify(false); setReferenceId(null); setOtp(''); } },
                )
              }
            >
              {verifyOtp.isPending ? 'Verifying…' : 'Verify OTP'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setReferenceId(null)}>
              Back
            </Button>
          </div>
        </div>
      )}
    </TrackCard>
  );
}

function DLTrack({ staffId, track }: { staffId: string; track: VerificationTrack }) {
  const [dlNumber, setDlNumber] = useState((track.result?.['dl_number'] as string) ?? '');
  const [dob, setDob] = useState('');
  const verifyDL = useVerifyDL(staffId);

  return (
    <TrackCard icon={CreditCard} title="Driving Licence" required={track.required} status={track.status}>
      <div className="space-y-2">
        <input className={inputCls} placeholder="DL number" value={dlNumber} onChange={(e) => setDlNumber(e.target.value)} />
        <input className={inputCls} type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
        {verifyDL.isError && <p className="text-xs text-red-400">{verifyDL.error.message}</p>}
        <Button
          size="sm"
          disabled={!dlNumber || !dob || verifyDL.isPending}
          onClick={() => verifyDL.mutate({ dl_number: dlNumber, dob })}
        >
          {verifyDL.isPending ? 'Verifying…' : track.status === 'CLEAR' ? 'Re-verify' : 'Verify Licence'}
        </Button>
      </div>
    </TrackCard>
  );
}

function EchallanTrack({ staffId, track, dlNumber }: { staffId: string; track: VerificationTrack; dlNumber?: string }) {
  const [dl, setDl] = useState(dlNumber ?? '');
  const checkEchallan = useCheckEchallan(staffId);

  return (
    <TrackCard icon={AlertTriangle} title="eChallan Check" required={track.required} status={track.status}>
      <div className="space-y-2">
        <input className={inputCls} placeholder="DL number" value={dl} onChange={(e) => setDl(e.target.value)} />
        {checkEchallan.isError && <p className="text-xs text-red-400">{checkEchallan.error.message}</p>}
        <Button size="sm" disabled={!dl || checkEchallan.isPending} onClick={() => checkEchallan.mutate(dl)}>
          {checkEchallan.isPending ? 'Checking…' : 'Check eChallans'}
        </Button>
      </div>
    </TrackCard>
  );
}

function PVTrack({ staffId, track }: { staffId: string; track: VerificationTrack }) {
  const [notes, setNotes] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const submitPV = useSubmitPoliceVerification(staffId);
  const closePV = useClosePoliceVerification(staffId);

  if (track.status === 'NOT_STARTED') {
    return (
      <TrackCard icon={ShieldCheck} title="Police Verification" required={track.required} status={track.status}>
        <div className="space-y-2">
          <input className={inputCls} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {submitPV.isError && <p className="text-xs text-red-400">{submitPV.error.message}</p>}
          <Button size="sm" disabled={submitPV.isPending} onClick={() => submitPV.mutate({ notes: notes || undefined })}>
            {submitPV.isPending ? 'Submitting…' : 'Submit PV Request'}
          </Button>
        </div>
      </TrackCard>
    );
  }

  if (track.status === 'PENDING') {
    return (
      <TrackCard icon={ShieldCheck} title="Police Verification" required={track.required} status={track.status}>
        <p className="text-xs text-muted-foreground">Submitted{track.verified_at ? ` ${new Date(track.verified_at).toLocaleString()}` : ''}. Record the final outcome once it arrives.</p>
        <div className="space-y-2">
          <input className={inputCls} placeholder="Notes (optional)" value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} />
          {closePV.isError && <p className="text-xs text-red-400">{closePV.error.message}</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
              disabled={closePV.isPending}
              onClick={() => closePV.mutate({ result: 'CLEAR', notes: closeNotes || undefined })}
            >
              Record Clear
            </Button>
            <Button
              size="sm"
              className="bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
              disabled={closePV.isPending}
              onClick={() => closePV.mutate({ result: 'ADVERSE', notes: closeNotes || undefined })}
            >
              Record Adverse
            </Button>
          </div>
        </div>
      </TrackCard>
    );
  }

  return (
    <TrackCard icon={ShieldCheck} title="Police Verification" required={track.required} status={track.status}>
      <p className="text-xs text-muted-foreground">
        Closed as {track.status === 'CLEAR' ? 'Clear' : 'Failed'}{track.verified_at ? ` on ${new Date(track.verified_at).toLocaleString()}` : ''}.
      </p>
    </TrackCard>
  );
}

function MedicalTrack({ staffId, track }: { staffId: string; track: VerificationTrack }) {
  const [notes, setNotes] = useState('');
  const submitMedical = useSubmitMedicalVerification(staffId);

  if (track.status !== 'NOT_STARTED') {
    return (
      <TrackCard icon={Stethoscope} title="Medical Clearance" required={track.required} status={track.status}>
        <p className="text-xs text-muted-foreground">
          Recorded as {track.status === 'CLEAR' ? 'passed' : 'failed'}{track.verified_at ? ` on ${new Date(track.verified_at).toLocaleString()}` : ''}.
        </p>
      </TrackCard>
    );
  }

  return (
    <TrackCard icon={Stethoscope} title="Medical Clearance" required={track.required} status={track.status}>
      <div className="space-y-2">
        <input className={inputCls} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {submitMedical.isError && <p className="text-xs text-red-400">{submitMedical.error.message}</p>}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
            disabled={submitMedical.isPending}
            onClick={() => submitMedical.mutate({ passed: true, notes: notes || undefined })}
          >
            Record Passed
          </Button>
          <Button
            size="sm"
            className="bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
            disabled={submitMedical.isPending}
            onClick={() => submitMedical.mutate({ passed: false, notes: notes || undefined })}
          >
            Record Failed
          </Button>
        </div>
      </div>
    </TrackCard>
  );
}

export function VerificationHub() {
  const { id } = useParams<{ id: string }>();

  const { data: staff } = useQuery({
    queryKey: ['staff', id],
    queryFn: () => api.getStaff(id),
    enabled: !!id,
  });
  const s = (staff as { data?: Record<string, string> })?.data ?? (staff as Record<string, string> | undefined);

  const { data, isLoading, isError, error } = useVerificationStatus(id);
  const status = data as VerificationStatusResponse | undefined;
  const advance = useRmAdvanceStage();

  const byTrack = useMemo(() => {
    const map = new Map<string, VerificationTrack>();
    status?.tracks.forEach((t) => map.set(t.track, t));
    return map;
  }, [status]);

  const isDriver = status?.series === 'DRIVER';

  if (isLoading) {
    return (
      <div className="page-padding">
        <TableSkeleton rows={6} />
      </div>
    );
  }

  if (isError || !status) {
    return (
      <div className="page-padding max-w-2xl mx-auto">
        <RmPageHeader title="Verification" />
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-400">
          Couldn&apos;t load verification status{error instanceof Error ? `: ${error.message}` : '.'}
        </div>
      </div>
    );
  }

  const aadhaar = byTrack.get('aadhaar');
  const dl = byTrack.get('dl');
  const echallan = byTrack.get('echallan');
  const pv = byTrack.get('pv');
  const medical = byTrack.get('medical');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page-padding max-w-3xl mx-auto space-y-6">
      <RmPageHeader
        title={s?.full_name ? `Verification — ${s.full_name}` : 'Verification'}
        description={s?.staff_code}
        actions={
          <Link href={`/rm/staff/${id}`}>
            <Button variant="outline">Back to Staff</Button>
          </Link>
        }
      />

      <div className="rounded-xl border border-white/8 bg-white/3 p-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {status.all_required_clear ? 'All required tracks clear' : 'Verification incomplete'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {status.tracks.filter((t) => t.required && t.status === 'CLEAR').length}/{status.tracks.filter((t) => t.required).length} required tracks clear
          </p>
        </div>
        <Button
          disabled={!status.all_required_clear || advance.isPending}
          onClick={() => advance.mutate({ staffId: id, to_stage: 'S2_5_ASSESS' })}
        >
          {advance.isPending ? 'Advancing…' : 'Advance to Assessment'}
        </Button>
      </div>
      {advance.isError && <p className="text-xs text-red-400">{advance.error.message}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {aadhaar && <AadhaarTrack staffId={id} track={aadhaar} staffName={s?.full_name} staffAadhaar={s?.aadhaar_number} />}
        {medical && <MedicalTrack staffId={id} track={medical} />}
        {pv && <PVTrack staffId={id} track={pv} />}
        {isDriver && dl && <DLTrack staffId={id} track={dl} />}
        {isDriver && echallan && (
          <EchallanTrack staffId={id} track={echallan} dlNumber={dl?.result?.['dl_number'] as string | undefined} />
        )}
      </div>
    </motion.div>
  );
}
