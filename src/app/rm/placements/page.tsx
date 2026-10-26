'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MapPin, Plus, AlertTriangle, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api/client';
import { useRmKanban } from '@/lib/rm/hooks';
import { WageConfigForm, type WageConfigPayload } from '@/components/rm/wage-config-form';
import { PlacementCard, ExitPlacementModal, daysLeft, type Placement } from '@/components/rm/placement-card';

interface ActivePlacement {
  client: string;
  type: 'PERMANENT' | 'TEMPORARY';
}

function NewPlacementModal({
  onClose,
  onCreate,
  creating,
  initialStaffId,
  fromRequest,
  activePairs,
  activeByStaff,
  livePlacements,
}: {
  onClose: () => void;
  onCreate: (body: Record<string, unknown>) => Promise<void>;
  creating: boolean;
  initialStaffId?: string | null;
  /** Opened from a staff request (/rm/requests/[id]): the client and terms come from it. */
  fromRequest?: { id: string; requestNo: string; clientId: string; clientName: string; placementType: 'PERMANENT' | 'TEMPORARY'; liveIn?: boolean } | null;
  /** "staffId::clientId" for every TRIAL/CONFIRMED placement — one staff member
   *  may work at many clients, but not twice at the same one. */
  activePairs: Set<string>;
  /** staffId → their active (TRIAL/CONFIRMED) placements. */
  activeByStaff: Map<string, ActivePlacement[]>;
  /** Every TRIAL/CONFIRMED placement — a relief placement picks the post it covers from these. */
  livePlacements: Placement[];
}) {
  const { data: kanban } = useRmKanban();
  const [staffSearch, setStaffSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(
    fromRequest ? { id: fromRequest.clientId, customer_name: fromRequest.clientName } : null,
  );
  // Trial (default) or Confirm Now — the latter skips the trial, and with it the
  // A2/A3-before-confirm check. See docs/MOBILE_BRIEF_PLACEMENT_S5_ONLY.md §2–3.
  const [confirmNow, setConfirmNow] = useState(false);
  // A permanent placement is priced only through the full wage breakup; the backend
  // derives salary and fee from `wage_config`, so nothing computed is sent.
  const [wageConfig, setWageConfig] = useState<WageConfigPayload | null>(null);
  // How this placement is paid. PERMANENT holds the client's whole shift and is
  // billed monthly; TEMPORARY is billed on the hours actually worked there, and
  // the same staff member can carry a different rate at each client.
  //
  // Four ways a placement is priced:
  //   MONTHLY  — permanent, monthly salary through the wage breakup
  //   HOURLY   — temporary, paid for the hours worked
  //   LIVE_IN  — permanent 24×7, a fixed rate per duty (one duty = one day)
  //   RELIEF   — temporary 24×7 cover for a live-in's off days, per duty
  type Mode = 'MONTHLY' | 'HOURLY' | 'LIVE_IN' | 'RELIEF';
  const [mode, setMode] = useState<Mode>(
    fromRequest?.liveIn ? 'LIVE_IN' : fromRequest?.placementType === 'TEMPORARY' ? 'HOURLY' : 'MONTHLY',
  );
  const placementType: 'PERMANENT' | 'TEMPORARY' = mode === 'HOURLY' || mode === 'RELIEF' ? 'TEMPORARY' : 'PERMANENT';
  const isPerDuty = mode === 'LIVE_IN' || mode === 'RELIEF';
  const [hourlyRate, setHourlyRate] = useState('');
  const [hourlyFee, setHourlyFee] = useState('');
  const [dutyRate, setDutyRate] = useState('');
  const [dutyBillingRate, setDutyBillingRate] = useState('');
  const [coversPlacementId, setCoversPlacementId] = useState('');
  // ESIC and PF can each be off for a placement. Live-in duty sheets carry
  // neither, so per-duty starts with both off; the others keep the old default.
  const [esicOn, setEsicOn] = useState(true);
  const [pfOn, setPfOn] = useState(true);
  useEffect(() => {
    setEsicOn(!isPerDuty);
    setPfOn(!isPerDuty);
  }, [isPerDuty]);
  // HH:MM the shift starts. Left empty for a request, the backend takes the booking's time.
  const [shiftStart, setShiftStart] = useState('');

  // Why this staff member can't take the placement being made, if they can't: a
  // permanent placement is always their only one, so an active one rules out anything
  // else, and a new one rules out anyone already placed hourly.
  const blockedAt = (staffId: string): string | undefined => {
    const live = activeByStaff.get(staffId) ?? [];
    const permanent = live.find((p) => p.type === 'PERMANENT');
    if (permanent) return `Permanently placed at ${permanent.client} — exit that placement first.`;
    if (placementType === 'PERMANENT' && live.length) {
      return `Placed hourly at ${live.map((p) => p.client).join(', ')} — a permanent placement must be their only one.`;
    }
    return undefined;
  };

  // Only staff at S5-Deploy are eligible (the backend refuses any other stage too). A staff
  // member stays in the S5_DEPLOY column after being placed, so the list hides anyone already
  // working at the chosen client and greys out anyone blockedAt() rules out — POST /placements
  // refuses both.
  const s5Staff: any[] = (kanban?.columns?.S5_DEPLOY ?? []).filter(
    (s: any) => !selectedClient || !activePairs.has(`${s.id}::${selectedClient.id}`),
  );
  const filteredStaff = useMemo(() => {
    if (!staffSearch) return s5Staff;
    const q = staffSearch.toLowerCase();
    return s5Staff.filter((s) => s.full_name?.toLowerCase().includes(q) || s.staff_code?.toLowerCase().includes(q));
  }, [s5Staff, staffSearch]);

  const initialStaffAlreadyPlaced = Boolean(
    initialStaffId &&
      (!!blockedAt(initialStaffId) ||
        (selectedClient && activePairs.has(`${initialStaffId}::${selectedClient.id}`))),
  );
  const selectedStaffBlocked = selectedStaff ? blockedAt(selectedStaff.id) : undefined;

  // Arrived here from a specific staff's Deployment CTA (mirrors the mobile app's S5
  // Deploy hub, which jumps straight to client selection for that staff instead of
  // making the RM search for them again in a generic staff picker).
  useEffect(() => {
    if (!initialStaffId || selectedStaff || initialStaffAlreadyPlaced) return;
    const match = s5Staff.find((s) => s.id === initialStaffId);
    if (match) setSelectedStaff(match);
  }, [initialStaffId, s5Staff, selectedStaff, initialStaffAlreadyPlaced]);

  const { data: clients, isFetching: clientsLoading } = useQuery({
    queryKey: ['finance-customers-picker', clientSearch],
    queryFn: () => api.listFinanceCustomers(clientSearch || undefined),
  });

  const isHourly = mode === 'HOURLY';
  const rateNum = Number(hourlyRate) || undefined;
  const feePerHourNum = Number(hourlyFee) || undefined;
  const dutyRateNum = Number(dutyRate) || undefined;
  const dutyBillNum = Number(dutyBillingRate) || undefined;
  const dutyReady = Boolean(dutyRateNum && dutyBillNum && dutyBillNum >= dutyRateNum);
  // Same bar the mobile form sets before it lets a wage breakup through.
  const wageReady = Boolean(wageConfig && wageConfig.basic_wage > 0 && wageConfig.management_pct > 0);

  // A relief placement covers a live-in post at the same client.
  const coverablePosts = useMemo(
    () => livePlacements.filter((p) => selectedClient && p.client_id === selectedClient.id && p.placement_type !== 'TEMPORARY'),
    [livePlacements, selectedClient],
  );

  const canSubmit = Boolean(
    selectedStaff && selectedClient && !selectedStaffBlocked &&
    (isPerDuty ? dutyReady : isHourly ? rateNum && feePerHourNum : wageReady),
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onCreate({
      staff_id: selectedStaff.id,
      client_id: selectedClient.id,
      placement_type: placementType,
      ...(fromRequest ? { staff_request_id: fromRequest.id } : {}),
      ...(confirmNow ? { status: 'CONFIRMED' } : {}),
      ...(shiftStart ? { shift_start: shiftStart } : {}),
      esic_applicable: esicOn,
      pf_applicable: pfOn,
      ...(isPerDuty
        ? {
            rate_basis: 'PER_DUTY',
            duty_rate: dutyRateNum,
            duty_billing_rate: dutyBillNum,
            shift_hours: 24,
            ...(mode === 'RELIEF' && coversPlacementId ? { covers_placement_id: coversPlacementId } : {}),
          }
        : isHourly
          ? { hourly_rate: rateNum, hourly_fee: feePerHourNum }
          : { wage_config: wageConfig, shift_hours: wageConfig?.working_hours }),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 py-8 overflow-y-auto">
      <div className="w-full max-w-lg bg-[#0E1420] border border-white/15 rounded-2xl p-6 space-y-5">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#FF5A1F]" /> New Placement
            </h2>
            <p className="text-xs text-[#8D9AB5] mt-0.5">Start on a trial and confirm once it goes well, or confirm straight away.</p>
            {fromRequest && (
              <p className="text-xs text-emerald-400 mt-1">Fills staff request {fromRequest.requestNo}</p>
            )}
          </div>
          <button onClick={onClose} className="text-[#8D9AB5] hover:text-white text-xl w-8 h-8 flex items-center justify-center">×</button>
        </div>

        {initialStaffAlreadyPlaced && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              {(initialStaffId && blockedAt(initialStaffId)) ||
                'This staff member is already placed with this client. Exit that placement before creating another here.'}
            </span>
          </div>
        )}

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
                {filteredStaff.map((s) => {
                  const placedAt = blockedAt(s.id);
                  return (
                    <button
                      key={s.id}
                      disabled={!!placedAt}
                      onClick={() => setSelectedStaff(s)}
                      className="w-full text-left px-3 py-2 text-xs text-[#E8EDF8] hover:bg-white/5 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      <span>
                        {s.full_name} <span className="text-[#8D9AB5] font-mono">· {s.staff_code}</span>
                        {placedAt && <span className="block text-[10px] text-amber-400">{placedAt}</span>}
                      </span>
                      <span className="text-[9px] font-bold uppercase text-[#8D9AB5]">{s.series}</span>
                    </button>
                  );
                })}
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

        {/* How this placement is paid — everything below follows from it. */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#8D9AB5]">How is this placement paid?</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'MONTHLY', title: 'Permanent', blurb: 'Holds this client’s full shift. Paid a monthly salary.' },
              { id: 'HOURLY', title: 'Hourly', blurb: 'Works a few hours here. Paid for the hours worked.' },
              { id: 'LIVE_IN', title: '24×7 Live-in', blurb: 'Stays at the client round the clock. Paid per duty (one day = one duty).' },
              { id: 'RELIEF', title: 'Relief (per duty)', blurb: 'Covers a live-in’s off days. Paid per duty worked.' },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                id={`btn-placement-mode-${opt.id.toLowerCase()}`}
                onClick={() => setMode(opt.id)}
                className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  mode === opt.id
                    ? 'bg-[#FF5A1F]/10 border-[#FF5A1F]/50'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <p className={`text-xs font-bold ${mode === opt.id ? 'text-[#FF5A1F]' : 'text-[#E8EDF8]'}`}>
                  {opt.title}
                </p>
                <p className="text-[10px] text-[#8D9AB5] mt-0.5 leading-snug">{opt.blurb}</p>
              </button>
            ))}
          </div>
          {(isHourly || isPerDuty) && (
            <p className="text-[10px] text-[#8D9AB5]">
              The rate is per client — the same staff member can be worth a different rate at the next house.
            </p>
          )}
        </div>

        {isPerDuty && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="input-duty-rate" className="text-xs font-semibold text-[#8D9AB5]">Staff pay (₹/duty)</label>
              <input
                id="input-duty-rate" type="number" min="0" value={dutyRate}
                onChange={(e) => setDutyRate(e.target.value)} placeholder="517"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-[#E8EDF8] focus:outline-none focus:border-[#FF5A1F]/50"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="input-duty-billing-rate" className="text-xs font-semibold text-[#8D9AB5]">Client billing (₹/duty)</label>
              <input
                id="input-duty-billing-rate" type="number" min="0" value={dutyBillingRate}
                onChange={(e) => setDutyBillingRate(e.target.value)} placeholder="585"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-[#E8EDF8] focus:outline-none focus:border-[#FF5A1F]/50"
              />
            </div>
            {dutyRateNum && dutyBillNum ? (
              dutyBillNum < dutyRateNum ? (
                <p className="col-span-2 text-[11px] text-amber-400">Billing is below the staff pay — the client would be billed less than the staff is paid.</p>
              ) : (
                <p className="col-span-2 text-[11px] text-[#8D9AB5]">
                  A 30-duty month bills{' '}
                  <span className="text-[#E8EDF8] font-semibold">₹{(30 * dutyBillNum).toLocaleString('en-IN')}</span>{' '}
                  + GST and pays ₹{(30 * dutyRateNum).toLocaleString('en-IN')} — a margin of ₹
                  {(30 * (dutyBillNum - dutyRateNum)).toLocaleString('en-IN')}. Employer ESIC/PF, if on, come out of that margin.
                </p>
              )
            ) : null}
            {mode === 'RELIEF' && (
              <div className="col-span-2 space-y-1.5">
                <label htmlFor="select-covers" className="text-xs font-semibold text-[#8D9AB5]">Covers whose off days? (optional)</label>
                <select
                  id="select-covers" value={coversPlacementId}
                  onChange={(e) => setCoversPlacementId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-[#E8EDF8] focus:outline-none focus:border-[#FF5A1F]/50"
                >
                  <option value="">— Not tied to one person —</option>
                  {coverablePosts.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.staff_name ?? p.staff_code ?? p.id.slice(0, 8)}</option>
                  ))}
                </select>
                {selectedClient && coverablePosts.length === 0 && (
                  <p className="text-[10px] text-[#8D9AB5]">No live-in staff at this client yet.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Statutory — each can be off for a placement. */}
        <div className="flex flex-wrap gap-4">
          {([
            ['ESIC', esicOn, setEsicOn, 'toggle-esic'],
            ['PF', pfOn, setPfOn, 'toggle-pf'],
          ] as const).map(([label, on, set, id]) => (
            <label key={label} htmlFor={id} className="flex items-center gap-2 text-xs text-[#E8EDF8] cursor-pointer">
              <input id={id} type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="accent-[#FF5A1F]" />
              {label} applies
            </label>
          ))}
        </div>

        {isPerDuty ? null : isHourly ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8D9AB5]">Staff rate (₹/hour)</label>
              <input
                id="input-hourly-rate"
                type="number"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="150"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-[#E8EDF8] focus:outline-none focus:border-[#FF5A1F]/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#8D9AB5]">Our fee (₹/hour)</label>
              <input
                id="input-hourly-fee"
                type="number"
                min="0"
                value={hourlyFee}
                onChange={(e) => setHourlyFee(e.target.value)}
                placeholder="30"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-[#E8EDF8] focus:outline-none focus:border-[#FF5A1F]/50"
              />
            </div>
            {rateNum && feePerHourNum ? (
              <p className="col-span-2 text-[11px] text-[#8D9AB5]">
                A 4-hour day bills this client{' '}
                <span className="text-[#E8EDF8] font-semibold">
                  ₹{(4 * (rateNum + feePerHourNum)).toLocaleString('en-IN')}
                </span>{' '}
                before statutory and GST. The invoice is raised on attendance.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#8D9AB5]">Wage breakup</label>
            <WageConfigForm onResult={(r) => setWageConfig(r ? r.config : null)} />
            {!wageReady && (
              <p className="text-[11px] text-[#8D9AB5]">Enter the basic wage and management % to continue.</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="input-shift-start" className="text-xs font-semibold text-[#8D9AB5]">Shift starts at</label>
          <input
            id="input-shift-start"
            type="time"
            value={shiftStart}
            onChange={(e) => setShiftStart(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-[#E8EDF8] focus:outline-none focus:border-[#FF5A1F]/50"
          />
          <p className="text-[10px] text-[#8D9AB5]">
            {fromRequest ? 'Leave empty to use the time from the request. ' : ''}Used to show late check-ins on the Staff Snapshot.
          </p>
        </div>

        {/* Trial or Confirm Now */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#8D9AB5]">Start as</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { now: false, title: 'Trial', blurb: 'Confirm later, after sending A2 and A3.' },
              { now: true, title: 'Confirm Now', blurb: 'No trial — confirmed straight away.' },
            ] as const).map((opt) => (
              <button
                key={opt.title}
                onClick={() => setConfirmNow(opt.now)}
                className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  confirmNow === opt.now
                    ? 'bg-[#FF5A1F]/10 border-[#FF5A1F]/50'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <p className={`text-xs font-bold ${confirmNow === opt.now ? 'text-[#FF5A1F]' : 'text-[#E8EDF8]'}`}>
                  {opt.title}
                </p>
                <p className="text-[10px] text-[#8D9AB5] mt-0.5 leading-snug">{opt.blurb}</p>
              </button>
            ))}
          </div>
        </div>

        {selectedStaffBlocked && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              {selectedStaff.full_name}: {selectedStaffBlocked}
            </span>
          </div>
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
            {creating ? 'Creating…' : confirmNow ? 'Create Placement (Confirmed)' : 'Create Placement (Trial)'}
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
  // From a staff request: ?requestId=&requestNo=&clientId=&clientName=&type=
  const requestIdParam = searchParams.get('requestId');
  const fromRequest =
    requestIdParam && searchParams.get('clientId')
      ? {
          id: requestIdParam,
          requestNo: searchParams.get('requestNo') ?? '',
          clientId: searchParams.get('clientId') as string,
          clientName: searchParams.get('clientName') ?? 'Client',
          placementType: (searchParams.get('type') === 'TEMPORARY' ? 'TEMPORARY' : 'PERMANENT') as 'PERMANENT' | 'TEMPORARY',
          liveIn: searchParams.get('liveIn') === '1',
        }
      : null;
  const [showNewModal, setShowNewModal] = useState(false);
  const [exitingPlacement, setExitingPlacement] = useState<Placement | null>(null);

  // Deep-linked from a staff's Deployment CTA (see candidate-detail.tsx) — jump
  // straight into placement creation instead of making the RM re-open the modal.
  useEffect(() => {
    if (staffIdParam || requestIdParam) setShowNewModal(true);
  }, [staffIdParam, requestIdParam]);

  const { data, isLoading } = useQuery({
    queryKey: ['placements'],
    queryFn: () => api.getPlacements({ limit: 100 }),
    refetchInterval: 30_000,
  });
  const placements: Placement[] = data?.items ?? [];
  // Who is already working where. A maid can work several houses by the hour,
  // but never twice at the same client, and a permanent placement is always her
  // only one. The backend enforces all of it (placement.service); this mirrors it.
  const livePlacements = useMemo(
    () => placements.filter((p) => p.status === 'TRIAL' || p.status === 'CONFIRMED'),
    [placements],
  );
  const activePairs = useMemo(
    () => new Set(livePlacements.map((p) => `${p.staff_id}::${p.client_id}`)),
    [livePlacements],
  );
  const activeByStaff = useMemo(() => {
    const m = new Map<string, ActivePlacement[]>();
    for (const p of livePlacements) {
      const list = m.get(p.staff_id) ?? [];
      list.push({ client: p.client_name || 'another client', type: p.placement_type ?? 'PERMANENT' });
      m.set(p.staff_id, list);
    }
    return m;
  }, [livePlacements]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['placements'] });
    queryClient.invalidateQueries({ queryKey: ['rm-trials'] });
  };

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.createPlacement(body),
    onSuccess: (_res, body) => {
      toast.success(body.status === 'CONFIRMED' ? 'Placement created — confirmed.' : 'Placement created — trial started.');
      setShowNewModal(false);
      invalidate();
      if (body.staff_request_id) queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
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
          fromRequest={fromRequest}
          activePairs={activePairs}
          activeByStaff={activeByStaff}
          livePlacements={livePlacements}
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
