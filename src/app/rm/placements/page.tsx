'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, Clock, CheckCircle2, XCircle, Plus, AlertTriangle, Search, X, FileText, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api/client';
import {
  useRmKanban,
  usePlacementSow,
  useCreateSow,
  useSendSow,
  usePlacementIndemnity,
  useCreateIndemnity,
} from '@/lib/rm/hooks';
import { WageConfigForm } from '@/components/rm/wage-config-form';

// Kept in lockstep with the backend's PlacementStatus enum (TRIAL | CONFIRMED | EXITED |
// TERMINATED) — earlier drafts of this screen modeled a richer trial_7/trial_14/extended/
// reject/mutual_exit flow that has no backend support (no extend-trial endpoint, no separate
// reject-vs-mutual-exit tracking). Decision was to keep the UI matched to what the API can
// actually do rather than build against a state machine that doesn't exist server-side.
type PlacementStatus = 'TRIAL' | 'CONFIRMED' | 'EXITED' | 'TERMINATED';
type Series = string;

const STATUS_STYLE: Record<PlacementStatus, { cls: string; label: string }> = {
  TRIAL: { cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30', label: 'Trial' },
  CONFIRMED: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Confirmed' },
  EXITED: { cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30', label: 'Exited' },
  TERMINATED: { cls: 'bg-red-500/15 text-red-400 border-red-500/30', label: 'Terminated' },
};

const SERIES_CLR: Record<string, string> = {
  DR: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  DRIVER: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  SC: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  SKILLED_CARE: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  UC: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
  UNSKILLED_CARE: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
  MAID: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
};

const EXIT_REASONS = [
  { value: 'CLIENT_INITIATED', label: 'Client rejected' },
  { value: 'STAFF_INITIATED', label: 'Staff declined' },
  { value: 'MUTUAL', label: 'Mutual exit' },
  { value: 'PERFORMANCE_ISSUE', label: 'Performance issue' },
];

interface Placement {
  id: string;
  staff_id: string;
  client_id: string;
  status: PlacementStatus;
  staff_code?: string;
  series?: Series;
  staff_name?: string;
  client_name?: string;
  staff_salary: number | string | null;
  management_fee: number | string | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  created_at: string;
}

function daysLeft(trialEndDate: string | null): number | null {
  if (!trialEndDate) return null;
  return Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / 86_400_000);
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function DaysLeftBadge({ days }: { days: number | null }) {
  if (days === null) return null;
  const urgent = days <= 2;
  return (
    <span
      className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${
        urgent ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-sky-500/10 border-sky-500/20 text-sky-400'
      }`}
    >
      <Clock className="w-3 h-3" />
      {days <= 0 ? 'Trial ended' : `${days}d left`}
    </span>
  );
}

const sowInputCls =
  'w-full px-3 py-2 text-xs rounded-lg bg-white/5 border border-white/15 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF5A1F]/50';

interface SowRow {
  id: string;
  content: string;
  status: 'DRAFT' | 'SENT' | 'ACKNOWLEDGED' | 'SUPERSEDED';
  version: number;
}

function SowSection({ placementId }: { placementId: string }) {
  const [content, setContent] = useState('');
  const { data, isLoading } = usePlacementSow(placementId);
  const rows = (Array.isArray(data) ? data : []) as SowRow[];
  const current = rows.find((r) => r.status !== 'SUPERSEDED');
  const createSow = useCreateSow(placementId);
  const sendSow = useSendSow(placementId);

  return (
    <div className="p-3 rounded-lg bg-white/3 border border-white/8 space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-[#FF5A1F]" />
        <p className="text-xs font-semibold text-foreground">Scope of Work (A2)</p>
        {current && (
          <span className="ml-auto text-[9px] font-bold uppercase text-muted-foreground border border-white/15 rounded-full px-1.5 py-0.5">
            {current.status} · v{current.version}
          </span>
        )}
      </div>
      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {!isLoading && !current && (
        <div className="space-y-2">
          <textarea
            className={sowInputCls}
            rows={3}
            placeholder="Duties, shift timing, residential/non-residential, excluded tasks…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {createSow.isError && <p className="text-xs text-red-400">{createSow.error.message}</p>}
          <button
            disabled={!content || createSow.isPending}
            onClick={() => createSow.mutate({ content })}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FF5A1F] text-white hover:bg-[#e04d17] transition-colors disabled:opacity-50"
          >
            {createSow.isPending ? 'Creating…' : 'Create Draft'}
          </button>
        </div>
      )}
      {current && current.status === 'DRAFT' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{current.content}</p>
          {sendSow.isError && <p className="text-xs text-red-400">{sendSow.error.message}</p>}
          <button
            disabled={sendSow.isPending}
            onClick={() => sendSow.mutate(current.id)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FF5A1F] text-white hover:bg-[#e04d17] transition-colors disabled:opacity-50"
          >
            {sendSow.isPending ? 'Sending…' : 'Send to Client'}
          </button>
        </div>
      )}
      {current && (current.status === 'SENT' || current.status === 'ACKNOWLEDGED') && (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{current.content}</p>
      )}
    </div>
  );
}

interface IndemnityRow {
  id: string;
  clause_version: string;
  clause_text: string;
  acknowledged_at: string | null;
  contested: boolean;
}

function IndemnitySection({ placementId }: { placementId: string }) {
  const [version, setVersion] = useState('v1.0');
  const [text, setText] = useState('');
  const { data, isLoading } = usePlacementIndemnity(placementId);
  const rows = (Array.isArray(data) ? data : []) as IndemnityRow[];
  const latest = rows[0];
  const createIndemnity = useCreateIndemnity(placementId);

  return (
    <div className="p-3 rounded-lg bg-white/3 border border-white/8 space-y-2">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-[#FF5A1F]" />
        <p className="text-xs font-semibold text-foreground">Client Indemnity (A3)</p>
        {latest && (
          <span className="ml-auto text-[9px] font-bold uppercase text-muted-foreground border border-white/15 rounded-full px-1.5 py-0.5">
            {latest.acknowledged_at ? 'Acknowledged' : latest.contested ? 'Contested' : 'Sent'}
          </span>
        )}
      </div>
      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {!isLoading && !latest && (
        <div className="space-y-2">
          <input className={sowInputCls} placeholder="Clause version (e.g. v1.0)" value={version} onChange={(e) => setVersion(e.target.value)} />
          <textarea
            className={sowInputCls}
            rows={3}
            placeholder="Client liability waiver, dispute resolution, insurance clauses…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {createIndemnity.isError && <p className="text-xs text-red-400">{createIndemnity.error.message}</p>}
          <button
            disabled={!version || !text || createIndemnity.isPending}
            onClick={() => createIndemnity.mutate({ clause_version: version, clause_text: text })}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FF5A1F] text-white hover:bg-[#e04d17] transition-colors disabled:opacity-50"
          >
            {createIndemnity.isPending ? 'Sending…' : 'Send to Client'}
          </button>
        </div>
      )}
      {latest && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{latest.clause_text}</p>}
    </div>
  );
}

function PlacementCard({
  p,
  onConfirm,
  onExit,
  confirmingId,
}: {
  p: Placement;
  onConfirm: (id: string) => void;
  onExit: (p: Placement) => void;
  confirmingId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const st = STATUS_STYLE[p.status] ?? STATUS_STYLE.TRIAL;
  const dl = p.status === 'TRIAL' ? daysLeft(p.trial_end_date) : null;
  const isConfirming = confirmingId === p.id;

  return (
    <div className={`rounded-xl border overflow-hidden ${dl !== null && dl <= 2 ? 'border-amber-500/30' : 'border-white/8'} bg-card/60`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/3 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-[#FF5A1F]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{p.staff_name || '—'}</span>
            <span className="text-[10px] font-mono text-muted-foreground">{p.staff_code}</span>
            {p.series && (
              <span className={`text-[9px] font-bold uppercase border rounded-full px-2 py-0.5 ${SERIES_CLR[p.series] ?? 'bg-white/5 border-white/10 text-muted-foreground'}`}>
                {p.series}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
            <span>📍 {p.client_name || 'Unknown client'}</span>
            <span>· Since {fmtDate(p.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <DaysLeftBadge days={dl} />
          <span className={`text-[10px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
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
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white/3 border border-white/8">
                  <p className="text-muted-foreground">Staff Salary</p>
                  <p className="font-bold text-foreground mt-0.5">₹{p.staff_salary ?? '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/3 border border-white/8">
                  <p className="text-muted-foreground">Management Fee</p>
                  <p className="font-bold text-foreground mt-0.5">₹{p.management_fee ?? '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/3 border border-white/8">
                  <p className="text-muted-foreground">Trial Start</p>
                  <p className="font-bold text-foreground mt-0.5">{fmtDate(p.trial_start_date)}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/3 border border-white/8">
                  <p className="text-muted-foreground">Trial End</p>
                  <p className="font-bold text-foreground mt-0.5">{fmtDate(p.trial_end_date)}</p>
                </div>
              </div>

              {p.status === 'TRIAL' && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Trial Outcome</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onConfirm(p.id)}
                      disabled={isConfirming}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isConfirming ? 'Confirming…' : 'Confirm Placement'}
                    </button>
                    <button
                      onClick={() => onExit(p)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject / Exit Trial
                    </button>
                  </div>
                </div>
              )}

              {p.status === 'CONFIRMED' && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Actions</p>
                  <button
                    onClick={() => onExit(p)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    End Placement
                  </button>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Agreements</p>
                <div className="space-y-2">
                  <SowSection placementId={p.id} />
                  <IndemnitySection placementId={p.id} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NewPlacementModal({
  onClose,
  onCreate,
  creating,
  initialStaffId,
}: {
  onClose: () => void;
  onCreate: (body: Record<string, unknown>) => Promise<void>;
  creating: boolean;
  initialStaffId?: string | null;
}) {
  const { data: kanban } = useRmKanban();
  const [staffSearch, setStaffSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [salary, setSalary] = useState('');
  const [fee, setFee] = useState('');
  const [mode, setMode] = useState<'simple' | 'detailed'>('simple');
  const [wageResult, setWageResult] = useState<{ staffSalary: number; managementFee: number } | null>(null);

  // Only staff at S5-Deploy are eligible — the backend itself doesn't gate this (any staff at
  // any stage would be silently accepted by POST /placements), so this filter is the only place
  // that rule is enforced. See docs/MOBILE_API_REFERENCE.md for the reasoning.
  const s5Staff: any[] = kanban?.columns?.S5_DEPLOY ?? [];
  const filteredStaff = useMemo(() => {
    if (!staffSearch) return s5Staff;
    const q = staffSearch.toLowerCase();
    return s5Staff.filter((s) => s.full_name?.toLowerCase().includes(q) || s.staff_code?.toLowerCase().includes(q));
  }, [s5Staff, staffSearch]);

  // Arrived here from a specific staff's Deployment CTA (mirrors the mobile app's S5
  // Deploy hub, which jumps straight to client selection for that staff instead of
  // making the RM search for them again in a generic staff picker).
  useEffect(() => {
    if (!initialStaffId || selectedStaff) return;
    const match = s5Staff.find((s) => s.id === initialStaffId);
    if (match) setSelectedStaff(match);
  }, [initialStaffId, s5Staff, selectedStaff]);

  const { data: clients, isFetching: clientsLoading } = useQuery({
    queryKey: ['finance-customers-picker', clientSearch],
    queryFn: () => api.listFinanceCustomers(clientSearch || undefined),
  });

  const effectiveSalary = mode === 'detailed' ? wageResult?.staffSalary : Number(salary) || undefined;
  const effectiveFee = mode === 'detailed' ? wageResult?.managementFee : Number(fee) || undefined;
  const canSubmit = Boolean(selectedStaff && selectedClient && effectiveSalary && effectiveFee);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onCreate({
      staff_id: selectedStaff.id,
      client_id: selectedClient.id,
      staff_salary: effectiveSalary,
      management_fee: effectiveFee,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#0E1420] border border-white/15 rounded-2xl p-6 space-y-5 my-8">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#FF5A1F]" /> New Placement
            </h2>
            <p className="text-xs text-[#8D9AB5] mt-0.5">Starts as a Trial — confirm it once the trial goes well.</p>
          </div>
          <button onClick={onClose} className="text-[#8D9AB5] hover:text-white text-xl w-8 h-8 flex items-center justify-center">×</button>
        </div>

        {/* Staff picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#8D9AB5]">Staff (S5-Deploy ready only)</label>
          {selectedStaff ? (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-sm text-emerald-300">
              <span>{selectedStaff.full_name} · {selectedStaff.staff_code}</span>
              <button onClick={() => setSelectedStaff(null)} className="text-emerald-400 hover:text-emerald-200"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8D9AB5]" />
                <input
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Search by name or staff code…"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-[#E8EDF8] focus:outline-none focus:border-[#FF5A1F]/50"
                />
              </div>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-white/8 divide-y divide-white/6">
                {filteredStaff.length === 0 && (
                  <p className="text-xs text-[#8D9AB5] px-3 py-3">No staff at S5-Deploy stage right now.</p>
                )}
                {filteredStaff.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStaff(s)}
                    className="w-full text-left px-3 py-2 text-xs text-[#E8EDF8] hover:bg-white/5 flex items-center justify-between"
                  >
                    <span>{s.full_name} <span className="text-[#8D9AB5] font-mono">· {s.staff_code}</span></span>
                    <span className="text-[9px] font-bold uppercase text-[#8D9AB5]">{s.series}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Client picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#8D9AB5]">Client</label>
          {selectedClient ? (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-sm text-emerald-300">
              <span>{selectedClient.customer_name}</span>
              <button onClick={() => setSelectedClient(null)} className="text-emerald-400 hover:text-emerald-200"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8D9AB5]" />
                <input
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Search client name…"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-[#E8EDF8] focus:outline-none focus:border-[#FF5A1F]/50"
                />
              </div>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-white/8 divide-y divide-white/6">
                {clientsLoading && <p className="text-xs text-[#8D9AB5] px-3 py-3">Loading…</p>}
                {!clientsLoading && (clients ?? []).length === 0 && (
                  <p className="text-xs text-[#8D9AB5] px-3 py-3">No clients found.</p>
                )}
                {(clients ?? []).map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClient(c)}
                    className="w-full text-left px-3 py-2 text-xs text-[#E8EDF8] hover:bg-white/5"
                  >
                    {c.customer_name} <span className="text-[#8D9AB5]">· {c.city ?? '—'}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/8 w-fit">
          {(['simple', 'detailed'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${
                mode === m ? 'bg-[#FF5A1F] text-white shadow' : 'text-[#8D9AB5] hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {mode === 'simple' ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8D9AB5]">Staff Salary (₹/mo)</label>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="18000"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-[#E8EDF8] focus:outline-none focus:border-[#FF5A1F]/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8D9AB5]">Management Fee (₹/mo)</label>
              <input
                type="number"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="4500"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-[#E8EDF8] focus:outline-none focus:border-[#FF5A1F]/50"
              />
            </div>
          </div>
        ) : (
          <WageConfigForm onResult={(r) => setWageResult(r ? { staffSalary: r.staffSalary, managementFee: r.managementFee } : null)} />
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/15 text-[#8D9AB5] hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || creating}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#FF5A1F] text-white text-sm font-bold hover:bg-[#e04d17] transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create Placement (Trial)'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExitPlacementModal({
  placement,
  onClose,
  onExit,
  exiting,
}: {
  placement: Placement;
  onClose: () => void;
  onExit: (id: string, body: Record<string, unknown>) => Promise<void>;
  exiting: boolean;
}) {
  const [exitDate, setExitDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState(EXIT_REASONS[0].value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-sm bg-[#0E1420] border border-white/15 rounded-2xl p-6 space-y-5 my-8">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-400" /> End Placement
            </h2>
            <p className="text-xs text-[#8D9AB5] mt-0.5">
              {placement.staff_name} · {placement.client_name}
            </p>
          </div>
          <button onClick={onClose} className="text-[#8D9AB5] hover:text-white text-xl w-8 h-8 flex items-center justify-center">×</button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#8D9AB5]">Exit Date</label>
          <input
            type="date"
            value={exitDate}
            onChange={(e) => setExitDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-[#E8EDF8] focus:outline-none focus:border-red-500/50"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#8D9AB5]">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-[#E8EDF8] focus:outline-none focus:border-red-500/50"
          >
            {EXIT_REASONS.map((r) => (
              <option key={r.value} value={r.value} className="bg-[#0E1420]">
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-white/15 text-[#8D9AB5] hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onExit(placement.id, { exit_date: exitDate, exit_scenario_code: reason })}
            disabled={exiting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/90 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {exiting ? 'Ending…' : 'Confirm Exit'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlacementsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const staffIdParam = searchParams.get('staffId');
  const [showNewModal, setShowNewModal] = useState(false);
  const [exitingPlacement, setExitingPlacement] = useState<Placement | null>(null);

  // Deep-linked from a staff's Deployment CTA (see candidate-detail.tsx) — jump
  // straight into placement creation instead of making the RM re-open the modal.
  useEffect(() => {
    if (staffIdParam) setShowNewModal(true);
  }, [staffIdParam]);

  const { data, isLoading } = useQuery({
    queryKey: ['placements'],
    queryFn: () => api.getPlacements({ limit: 100 }),
    refetchInterval: 30_000,
  });
  const placements: Placement[] = data?.items ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['placements'] });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.createPlacement(body),
    onSuccess: () => {
      toast.success('Placement created — trial started.');
      setShowNewModal(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to create placement'),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => api.confirmPlacement(id),
    onSuccess: () => {
      toast.success('Placement confirmed — staff can now check in.');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'Confirm failed'),
  });

  const exitMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api.exitPlacement(id, body),
    onSuccess: () => {
      toast.success('Placement exited.');
      setExitingPlacement(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || 'Exit failed'),
  });

  const stats = {
    confirmed: placements.filter((p) => p.status === 'CONFIRMED').length,
    trial: placements.filter((p) => p.status === 'TRIAL').length,
    expiring: placements.filter((p) => p.status === 'TRIAL' && (daysLeft(p.trial_end_date) ?? 99) <= 2).length,
    total: placements.length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page-padding max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Deployments & Placements</h1>
          <p className="text-sm text-muted-foreground mt-1">S5 · Trial management · Confirmation tracking</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5A1F] text-white text-sm font-bold hover:bg-[#e04d17] transition-colors"
        >
          <Plus className="w-4 h-4" />New Placement
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Confirmed', val: stats.confirmed, cls: 'text-emerald-400' },
          { label: 'On Trial', val: stats.trial, cls: 'text-sky-400' },
          { label: 'Expiring Soon', val: stats.expiring, cls: 'text-red-400' },
          { label: 'Total', val: stats.total, cls: 'text-foreground' },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-xl border border-white/8 bg-card/40">
            <p className={`text-2xl font-bold ${s.cls}`}>{s.val}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {stats.expiring > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400 font-semibold">{stats.expiring} trial(s) expiring within 2 days — action required</p>
        </div>
      )}

      <div className="p-4 rounded-xl border border-white/8 bg-white/3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Placement Flow</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>🔵 Staff reaches S5-Deploy → eligible for placement</span>
          <span>🟡 New Placement → Trial started</span>
          <span>🟢 Confirm Placement → Confirmed (check-in/attendance/invoicing unlock)</span>
          <span>🔴 Reject / End Placement → Exited</span>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Loading placements…</p>}
        {!isLoading && placements.length === 0 && (
          <div className="text-center py-16">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No placements yet — click New Placement to start a trial.</p>
          </div>
        )}
        {placements.map((p) => (
          <PlacementCard
            key={p.id}
            p={p}
            confirmingId={confirmMutation.isPending ? (confirmMutation.variables as string) : null}
            onConfirm={(id) => confirmMutation.mutate(id)}
            onExit={(pl) => setExitingPlacement(pl)}
          />
        ))}
      </div>

      {showNewModal && (
        <NewPlacementModal
          onClose={() => setShowNewModal(false)}
          onCreate={(body) => createMutation.mutateAsync(body)}
          creating={createMutation.isPending}
          initialStaffId={staffIdParam}
        />
      )}

      {exitingPlacement && (
        <ExitPlacementModal
          placement={exitingPlacement}
          onClose={() => setExitingPlacement(null)}
          onExit={(id, body) => exitMutation.mutateAsync({ id, body })}
          exiting={exitMutation.isPending}
        />
      )}
    </motion.div>
  );
}
