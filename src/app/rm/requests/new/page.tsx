'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, X } from 'lucide-react';
import { api } from '@/lib/api/client';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';
import { useSeriesCatalog } from '@/lib/series';
import { useAuthStore } from '@/lib/store/auth.store';
import { cn } from '@/lib/utils/cn';
import { DIET_TYPES, MEALS, MEDICAL_NEEDS, MOBILITY, titleCase } from '@/lib/staff-requests';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-secondary-foreground">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Chips({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={cn(
              'rounded-full border px-3 py-1 text-xs',
              on ? 'border-[#FF6B00] bg-[#FF6B00]/15 text-[#FF8A3D]' : 'border-white/10 text-secondary-foreground',
            )}
          >
            {titleCase(o)}
          </button>
        );
      })}
    </div>
  );
}

const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

/** An RM raising a request for a client already on the books, or for a lead with no account yet. */
export default function NewStaffRequestPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { active: activeSeries } = useSeriesCatalog();

  const [forLead, setForLead] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [client, setClient] = useState<{ id: string; customer_name: string; city?: string; address?: string } | null>(null);
  const [lead, setLead] = useState({ name: '', phone: '', city: '' });

  const [series, setSeries] = useState('UNSKILLED_CARE');
  const [placementType, setPlacementType] = useState<'PERMANENT' | 'TEMPORARY'>('PERMANENT');
  const [shiftHours, setShiftHours] = useState('8');
  const [startDate, setStartDate] = useState('');
  const [language, setLanguage] = useState('');
  const [genderPref, setGenderPref] = useState('ANY');
  const [startTime, setStartTime] = useState('');
  const [headcount, setHeadcount] = useState('1');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Care (UC/SC)
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [mobility, setMobility] = useState('');
  const [conditions, setConditions] = useState('');
  const [medicalNeeds, setMedicalNeeds] = useState<string[]>([]);
  const [nightCare, setNightCare] = useState(false);
  // Cook
  const [dietType, setDietType] = useState('');
  const [familySize, setFamilySize] = useState('');
  const [meals, setMeals] = useState<string[]>([]);
  const [cuisines, setCuisines] = useState('');
  const [healthConditions, setHealthConditions] = useState('');

  const isCook = series === 'COOK';
  const isUc = series === 'UNSKILLED_CARE';

  const { data: clients, isFetching: clientsLoading } = useQuery({
    queryKey: ['finance-customers-picker', clientSearch],
    queryFn: () => api.listFinanceCustomers(clientSearch || undefined),
    enabled: !forLead && !client,
  });

  const submit = useMutation({
    mutationFn: () => {
      const requirements = isCook
        ? {
            diet_type: dietType,
            family_size: Number(familySize) || undefined,
            meals_per_day: meals,
            cuisines: splitList(cuisines),
            health_conditions: splitList(healthConditions),
          }
        : {
            patient_age: Number(patientAge) || undefined,
            ...(patientGender ? { patient_gender: patientGender } : {}),
            mobility,
            conditions: splitList(conditions),
            medical_needs: isUc ? [] : medicalNeeds,
            night_care: nightCare,
          };
      return api.createStaffRequest({
        ...(forLead
          ? { lead_name: lead.name, lead_phone: lead.phone, lead_city: lead.city || undefined }
          : { client_id: client?.id }),
        series,
        placement_type: placementType,
        shift_hours: Number(shiftHours) || 8,
        start_date: startDate || undefined,
        start_time: startDate && startTime ? startTime : undefined,
        language: language || undefined,
        gender_pref: genderPref,
        headcount: Number(headcount) || 1,
        address: address.trim(),
        notes: notes || undefined,
        requirements,
      });
    },
    onSuccess: (res: { id: string; request_no: string }) => {
      toast.success(`${res.request_no} created`);
      router.push(`/rm/requests/${res.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const whoReady = (forLead ? lead.name.trim() && lead.phone.trim() : !!client) && address.trim().length >= 5;
  const needsReady = isCook ? dietType && Number(familySize) > 0 && meals.length : Number(patientAge) > 0 && mobility;

  return (
    <div className="page-padding max-w-3xl mx-auto space-y-6">
      <RmPageHeader
        title="New Staff Request"
        description={
          user?.role === 'RM'
            ? 'You will own this request.'
            : 'It goes to the branch RM with the fewest open requests.'
        }
      />

      {/* Who */}
      <section className="glass-card space-y-4 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold">For whom</h2>
          <div className="flex rounded-lg border border-white/10 p-0.5 text-xs">
            {[
              { k: false, l: 'Existing client' },
              { k: true, l: 'New lead (no account)' },
            ].map((o) => (
              <button
                key={String(o.k)}
                type="button"
                onClick={() => setForLead(o.k)}
                className={cn('rounded-md px-3 py-1.5', forLead === o.k ? 'bg-white/10 text-foreground' : 'text-muted-foreground')}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
        {forLead ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Name *"><Input value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} /></Field>
            <Field label="Phone *"><Input value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} placeholder="10 digits" /></Field>
            <Field label="City"><Input value={lead.city} onChange={(e) => setLead({ ...lead, city: e.target.value })} /></Field>
            <p className="text-[11px] text-amber-300 sm:col-span-3">
              A placement needs a client account — attach one on the request once Finance has made it.
            </p>
          </div>
        ) : client ? (
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            <span>{client.customer_name}{client.city ? ` · ${client.city}` : ''}</span>
            <button type="button" onClick={() => setClient(null)}><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Search client name…" />
            </div>
            <div className="max-h-40 divide-y divide-white/5 overflow-y-auto rounded-lg border border-white/10">
              {clientsLoading && <p className="px-3 py-3 text-xs text-muted-foreground">Loading…</p>}
              {!clientsLoading && (clients ?? []).length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground">No clients found.</p>}
              {(clients ?? []).map((c: { id: string; customer_name: string; city?: string; address?: string }) => (
                <button key={c.id} type="button" onClick={() => { setClient(c); if (!address.trim() && c.address) setAddress(c.address); }} className="w-full px-3 py-2 text-left text-xs hover:bg-white/5">
                  {c.customer_name} <span className="text-muted-foreground">· {c.city ?? '—'}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* What */}
      <section className="glass-card space-y-4 rounded-xl p-5">
        <h2 className="text-sm font-bold">What they need</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Series *">
            <SelectMenu value={series} onValueChange={setSeries} className="h-10 border-white/10 bg-card text-sm">
              {activeSeries.map((s) => (
                <SelectMenuItem key={s.value} value={s.value}>{s.short} — {s.label}</SelectMenuItem>
              ))}
            </SelectMenu>
          </Field>
          <Field label="Type">
            <SelectMenu value={placementType} onValueChange={(v) => setPlacementType(v as 'PERMANENT' | 'TEMPORARY')} className="h-10 border-white/10 bg-card text-sm">
              <SelectMenuItem value="PERMANENT">Permanent (monthly)</SelectMenuItem>
              <SelectMenuItem value="TEMPORARY">Hourly</SelectMenuItem>
            </SelectMenu>
          </Field>
          <Field label="Hours per day"><Input type="number" value={shiftHours} onChange={(e) => setShiftHours(e.target.value)} /></Field>
          <Field label="Start date"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          <Field label="Start time" hint={startDate ? undefined : 'Pick a date first'}>
            <Input type="time" value={startTime} disabled={!startDate} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label="How many staff"><Input type="number" min={1} max={20} value={headcount} onChange={(e) => setHeadcount(e.target.value)} /></Field>
          <Field label="Staff gender">
            <SelectMenu value={genderPref} onValueChange={setGenderPref} className="h-10 border-white/10 bg-card text-sm">
              <SelectMenuItem value="ANY">Any</SelectMenuItem>
              <SelectMenuItem value="FEMALE">Female</SelectMenuItem>
              <SelectMenuItem value="MALE">Male</SelectMenuItem>
            </SelectMenu>
          </Field>
          <Field label="Language"><Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g. Hindi" /></Field>
        </div>
        <Field label="Address *" hint="Where the staff will work">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
      </section>

      {/* Series-specific */}
      <section className="glass-card space-y-4 rounded-xl p-5">
        {isCook ? (
          <>
            <h2 className="text-sm font-bold">Kitchen</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Diet *">
                <SelectMenu value={dietType} onValueChange={setDietType} placeholder="Select" className="h-10 border-white/10 bg-card text-sm">
                  {DIET_TYPES.map((d) => <SelectMenuItem key={d.value} value={d.value}>{d.label}</SelectMenuItem>)}
                </SelectMenu>
              </Field>
              <Field label="People to cook for *"><Input type="number" value={familySize} onChange={(e) => setFamilySize(e.target.value)} /></Field>
            </div>
            <Field label="Meals *"><Chips options={MEALS} value={meals} onChange={setMeals} /></Field>
            <Field label="Cuisines" hint="Comma separated, e.g. North Indian, South Indian"><Input value={cuisines} onChange={(e) => setCuisines(e.target.value)} /></Field>
            <Field label="Health needs" hint="Comma separated, e.g. Diabetic, Low salt"><Input value={healthConditions} onChange={(e) => setHealthConditions(e.target.value)} /></Field>
          </>
        ) : (
          <>
            <h2 className="text-sm font-bold">The person being cared for</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Age *"><Input type="number" value={patientAge} onChange={(e) => setPatientAge(e.target.value)} /></Field>
              <Field label="Gender">
                <SelectMenu value={patientGender} onValueChange={setPatientGender} placeholder="—" className="h-10 border-white/10 bg-card text-sm">
                  <SelectMenuItem value="FEMALE">Female</SelectMenuItem>
                  <SelectMenuItem value="MALE">Male</SelectMenuItem>
                </SelectMenu>
              </Field>
              <Field label="Mobility *">
                <SelectMenu value={mobility} onValueChange={setMobility} placeholder="Select" className="h-10 border-white/10 bg-card text-sm">
                  {MOBILITY.map((m) => <SelectMenuItem key={m.value} value={m.value}>{m.label}</SelectMenuItem>)}
                </SelectMenu>
              </Field>
            </div>
            <Field label="Conditions" hint="Comma separated, e.g. Diabetes, Dementia"><Input value={conditions} onChange={(e) => setConditions(e.target.value)} /></Field>
            {isUc ? (
              <p className="text-[11px] text-muted-foreground">
                An Unskilled Caretaker can&apos;t give medicines, injections or wound care — choose SC if that is needed.
              </p>
            ) : (
              <Field label="Medical duties"><Chips options={MEDICAL_NEEDS} value={medicalNeeds} onChange={setMedicalNeeds} /></Field>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={nightCare} onChange={(e) => setNightCare(e.target.checked)} className="rounded" />
              Night care needed
            </label>
          </>
        )}
        <Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </section>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button disabled={!whoReady || !needsReady || submit.isPending} onClick={() => submit.mutate()}>
          {submit.isPending ? 'Creating…' : 'Create request'}
        </Button>
      </div>
    </div>
  );
}
