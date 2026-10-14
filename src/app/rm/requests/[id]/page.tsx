'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Check, MapPin, Search, UserPlus, X } from 'lucide-react';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';
import { useAuthStore } from '@/lib/store/auth.store';
import { STAGE_LABELS } from '@/lib/rm/constants';
import type { PipelineStage } from '@/lib/types';
import { cn } from '@/lib/utils/cn';
import {
  CANDIDATE_STATUS,
  OPEN_STATUSES,
  REQUEST_STATUS,
  SOURCE_LABEL,
  titleCase,
  type CandidateStatus,
  type StaffRequestStatus,
} from '@/lib/staff-requests';

interface Candidate {
  id: string;
  status: CandidateStatus;
  rm_note: string | null;
  client_note: string | null;
  placement_id: string | null;
  staff: { id: string; staff_code: string; full_name: string; series: string; pipeline_stage: string; mobile: string };
}
interface Detail {
  id: string;
  request_no: string;
  status: StaffRequestStatus;
  source: string;
  series: string;
  placement_type: 'PERMANENT' | 'TEMPORARY';
  shift_hours: number;
  start_date: string | null;
  start_time: string | null;
  address: string | null;
  language: string | null;
  gender_pref: string;
  headcount: number;
  requirements: Record<string, unknown>;
  notes: string | null;
  cancel_reason: string | null;
  sla_breached: boolean;
  created_at: string;
  client: { id: string; name: string; city: string | null; has_login: boolean } | null;
  lead: { name: string; phone: string; city: string | null } | null;
  rm: { id: string; name: string; phone: string } | null;
  branch: { id: string; name: string } | null;
  candidates: Candidate[];
}
interface Match {
  staff: { id: string; staff_code: string; full_name: string; pipeline_stage: string; branch_name: string | null; gender: string | null };
  ready: boolean;
  score: number;
  reasons: string[];
  on_this_request: string | null;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{Array.isArray(value) ? value.map((v) => titleCase(String(v))).join(', ') : value}</span>
    </div>
  );
}

export default function StaffRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canAssign = user?.role === 'BM' || user?.role === 'ADMIN';

  const [picked, setPicked] = useState<string[]>([]);
  const [rmNote, setRmNote] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [assignRm, setAssignRm] = useState('');

  const { data: req, isLoading } = useQuery<Detail>({
    queryKey: ['staff-requests', 'detail', id],
    queryFn: () => api.getStaffRequest(id),
  });
  const open = !!req && OPEN_STATUSES.includes(req.status);
  const { data: matches } = useQuery<{ items: Match[] }>({
    queryKey: ['staff-requests', 'candidates', id],
    queryFn: () => api.getStaffRequestCandidates(id),
    enabled: open,
  });
  const { data: rmUsersRaw } = useQuery({ queryKey: ['rm-users'], queryFn: () => api.listRmUsers(), enabled: canAssign && open });
  const rmUsers: { id: string; full_name: string }[] =
    (rmUsersRaw as { data?: { id: string; full_name: string }[] })?.data ?? (rmUsersRaw as { id: string; full_name: string }[]) ?? [];
  const { data: clients } = useQuery({
    queryKey: ['finance-customers-picker', clientSearch],
    queryFn: () => api.listFinanceCustomers(clientSearch || undefined),
    enabled: attachOpen,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['staff-requests'] });
  const useAct = <T = void,>(fn: (v: T) => Promise<unknown>, ok: string) =>
    useMutation({
      mutationFn: fn,
      onSuccess: () => { toast.success(ok); refresh(); },
      onError: (e: Error) => toast.error(e.message),
    });

  const shortlist = useAct(() => api.shortlistStaffRequest(id, { staff_ids: picked, rm_note: rmNote || undefined }), 'Shortlist sent to the client');
  const withdraw = useAct((staffId: string) => api.withdrawStaffRequestCandidate(id, staffId), 'Taken off the shortlist');
  const select = useAct((staffId: string) => api.selectStaffRequestCandidate(id, { staff_id: staffId }), 'Chosen for the client');
  const assign = useAct((rmId: string) => api.assignStaffRequest(id, rmId), 'RM assigned');
  const attach = useAct((clientId: string) => api.attachStaffRequestClient(id, clientId), 'Client attached');
  const cancel = useAct(() => api.cancelStaffRequest(id, cancelReason), 'Request cancelled');

  if (isLoading || !req) return <p className="page-padding py-8 text-center text-sm text-muted-foreground">Loading…</p>;

  const st = REQUEST_STATUS[req.status];
  const r = req.requirements ?? {};
  const onList = new Set(req.candidates.filter((c) => ['PROPOSED', 'CLIENT_SELECTED', 'PLACED'].includes(c.status)).map((c) => c.staff.id));
  const placeHref = (staffId: string) =>
    `/rm/placements?${new URLSearchParams({
      staffId,
      requestId: req.id,
      requestNo: req.request_no,
      clientId: req.client?.id ?? '',
      clientName: req.client?.name ?? '',
      type: req.placement_type,
    })}`;

  return (
    <div className="page-padding max-w-5xl mx-auto space-y-5">
      <Link href="/rm/requests" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All requests
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold">{req.request_no}</h1>
            <span className={cn('rounded border px-2 py-0.5 text-xs font-bold', st.cls)}>{st.label}</span>
            {req.sla_breached && <span className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-300">Over 24h</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{st.hint}</p>
        </div>
        {open && (
          <Button variant="outline" onClick={() => setCancelOpen(true)} className="border-rose-500/30 text-rose-300">
            Cancel request
          </Button>
        )}
      </div>

      {req.status === 'CANCELLED' && req.cancel_reason && (
        <p className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm">Cancelled: {req.cancel_reason}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Who + what */}
        <div className="glass-card space-y-1 rounded-xl p-5 lg:col-span-1">
          <h2 className="mb-2 text-sm font-bold">Client</h2>
          {req.client ? (
            <>
              <Row label="Name" value={req.client.name} />
              <Row label="City" value={req.client.city} />
              <Row label="Uses the app" value={req.client.has_login ? 'Yes' : 'No — choose for them'} />
            </>
          ) : (
            <>
              <Row label="Lead" value={req.lead?.name} />
              <Row label="Phone" value={req.lead?.phone} />
              <Row label="City" value={req.lead?.city} />
              <p className="pt-2 text-xs text-amber-300">No client account yet — attach one before placing.</p>
              {open && <Button className="mt-2 w-full" variant="outline" onClick={() => setAttachOpen(true)}>Attach client account</Button>}
            </>
          )}
          <div className="my-3 border-t border-white/10" />
          <Row label="Raised by" value={SOURCE_LABEL[req.source] ?? req.source} />
          <Row label="RM" value={req.rm?.name ?? 'Not assigned'} />
          <Row label="Branch" value={req.branch?.name} />
          {canAssign && open && (
            <div className="flex gap-2 pt-2">
              <SelectMenu value={assignRm} onValueChange={setAssignRm} placeholder="Assign RM…" className="h-9 flex-1 border-white/10 bg-card text-xs">
                {rmUsers.map((u) => <SelectMenuItem key={u.id} value={u.id}>{u.full_name}</SelectMenuItem>)}
              </SelectMenu>
              <Button size="sm" disabled={!assignRm || assign.isPending} onClick={() => assign.mutate(assignRm)}>Assign</Button>
            </div>
          )}
        </div>

        <div className="glass-card space-y-1 rounded-xl p-5 lg:col-span-2">
          <h2 className="mb-2 text-sm font-bold">Asked for</h2>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <div>
              <Row label="Series" value={req.series} />
              <Row label="Type" value={req.placement_type === 'TEMPORARY' ? 'Hourly' : 'Permanent'} />
              <Row label="Hours / day" value={req.shift_hours} />
              <Row label="Start" value={req.start_date ? `${req.start_date}${req.start_time ? ` · ${req.start_time}` : ''}` : null} />
              <Row label="How many" value={req.headcount} />
              <Row label="Staff gender" value={req.gender_pref === 'ANY' ? null : titleCase(req.gender_pref)} />
              <Row label="Language" value={req.language} />
            </div>
            <div>
              {req.series === 'CK' ? (
                <>
                  <Row label="Diet" value={titleCase(String(r.diet_type ?? ''))} />
                  <Row label="People" value={r.family_size as number} />
                  <Row label="Meals" value={r.meals_per_day as string[]} />
                  <Row label="Cuisines" value={r.cuisines as string[]} />
                  <Row label="Health" value={r.health_conditions as string[]} />
                </>
              ) : (
                <>
                  <Row label="Patient age" value={r.patient_age as number} />
                  <Row label="Mobility" value={titleCase(String(r.mobility ?? ''))} />
                  <Row label="Conditions" value={r.conditions as string[]} />
                  <Row label="Medical duties" value={r.medical_needs as string[]} />
                  <Row label="Night care" value={r.night_care ? 'Yes' : null} />
                </>
              )}
            </div>
          </div>
          <Row label="Address" value={req.address} />
          <Row label="Notes" value={req.notes} />
        </div>
      </div>

      {/* Shortlist so far */}
      <section className="glass-card rounded-xl p-5">
        <h2 className="mb-3 text-sm font-bold">Shortlist</h2>
        {req.candidates.length === 0 && <p className="text-sm text-muted-foreground">Nobody put forward yet — pick from the matches below.</p>}
        <div className="divide-y divide-white/5">
          {req.candidates.map((c) => {
            const cs = CANDIDATE_STATUS[c.status];
            return (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href={`/rm/staff/${c.staff.id}`} className="font-semibold hover:text-primary">{c.staff.full_name}</Link>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{c.staff.staff_code}</span>
                  <p className="text-xs text-muted-foreground">
                    <span className={cs.cls}>{cs.label}</span>
                    {' · '}{STAGE_LABELS[c.staff.pipeline_stage as PipelineStage] ?? c.staff.pipeline_stage}
                    {c.client_note ? ` · Client: “${c.client_note}”` : ''}
                  </p>
                </div>
                {open && (
                  <div className="flex gap-2">
                    {c.status === 'PROPOSED' && (
                      <Button size="sm" variant="outline" onClick={() => select.mutate(c.staff.id)} disabled={select.isPending}>
                        <Check className="mr-1 h-3.5 w-3.5" />Choose for client
                      </Button>
                    )}
                    {c.status === 'CLIENT_SELECTED' && (
                      req.client ? (
                        <Link href={placeHref(c.staff.id)}>
                          <Button size="sm"><MapPin className="mr-1 h-3.5 w-3.5" />Create trial placement</Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-amber-300">Attach a client account to place</span>
                      )
                    )}
                    {['PROPOSED', 'CLIENT_SELECTED'].includes(c.status) && (
                      <Button size="sm" variant="outline" onClick={() => withdraw.mutate(c.staff.id)} disabled={withdraw.isPending}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
                {c.placement_id && <span className="text-xs text-emerald-300">Placement made</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Matches */}
      {open && (
        <section className="glass-card rounded-xl p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold">Matching staff</h2>
            <p className="text-xs text-muted-foreground">Same series, not on hold, free under the placement rules</p>
          </div>
          {(matches?.items ?? []).length === 0 && <p className="text-sm text-muted-foreground">No free {req.series} staff at S4/S5 right now.</p>}
          <div className="divide-y divide-white/5">
            {(matches?.items ?? []).filter((m) => !onList.has(m.staff.id)).map((m) => {
              const on = picked.includes(m.staff.id);
              return (
                <label key={m.staff.id} className="flex cursor-pointer items-start gap-3 py-3">
                  <input
                    type="checkbox"
                    className="mt-1 rounded"
                    checked={on}
                    onChange={() => setPicked(on ? picked.filter((x) => x !== m.staff.id) : [...picked, m.staff.id])}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {m.staff.full_name}
                      <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{m.staff.staff_code}</span>
                      {!m.ready && <span className="ml-2 text-xs font-normal text-amber-300">not yet at S5</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.reasons.join(' · ')}{m.staff.branch_name ? ` · ${m.staff.branch_name}` : ''}
                      {m.on_this_request ? ` · earlier: ${CANDIDATE_STATUS[m.on_this_request as CandidateStatus]?.label ?? m.on_this_request}` : ''}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
            <Input className="min-w-[200px] flex-1" value={rmNote} onChange={(e) => setRmNote(e.target.value)} placeholder="Note for the client (optional)" />
            <Button disabled={!picked.length || shortlist.isPending} onClick={() => shortlist.mutate(undefined, { onSuccess: () => { setPicked([]); setRmNote(''); } })}>
              <UserPlus className="mr-1 h-4 w-4" />Shortlist {picked.length || ''}
            </Button>
          </div>
        </section>
      )}

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this request">
        <div className="space-y-3">
          <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Why? The client sees this." />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Back</Button>
            <Button
              disabled={!cancelReason.trim() || cancel.isPending}
              onClick={() => cancel.mutate(undefined, { onSuccess: () => setCancelOpen(false) })}
            >
              Cancel request
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={attachOpen} onClose={() => setAttachOpen(false)} title="Attach the client account">
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Search client name…" />
          </div>
          <div className="max-h-60 divide-y divide-white/5 overflow-y-auto rounded-lg border border-white/10">
            {(clients ?? []).map((c: { id: string; customer_name: string; city?: string }) => (
              <button
                key={c.id}
                type="button"
                onClick={() => attach.mutate(c.id, { onSuccess: () => setAttachOpen(false) })}
                className="w-full px-3 py-2 text-left text-xs hover:bg-white/5"
              >
                {c.customer_name} <span className="text-muted-foreground">· {c.city ?? '—'}</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
