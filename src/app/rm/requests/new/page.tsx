'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Search, Trash2, X } from 'lucide-react';
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

/** One-time visit lengths (minutes) and how many dishes each covers — same as the server. */
const DURATIONS = [
  { min: 60, label: '1 hour' },
  { min: 90, label: '1.5 hours' },
  { min: 120, label: '2 hours' },
  { min: 180, label: '3 hours' },
];
const dishCap = (min: number) => (min <= 60 ? 3 : min <= 90 ? 4 : min <= 120 ? 5 : 7);
const mealForTime = (t: string) => {
  const h = Number(t.slice(0, 2));
  return h < 11 ? 'BREAKFAST' : h < 16 ? 'LUNCH' : h < 19 ? 'SNACKS' : 'DINNER';
};

type PickedDish = { id?: string; name: string; diet?: string };
type MedRow = { name: string; dose: string; time: string };

/** Search the dish list; a name that isn't on it can be added as typed. */
function DishPicker({ value, onChange, max }: { value: PickedDish[]; onChange: (v: PickedDish[]) => void; max: number }) {
  const [q, setQ] = useState('');
  const { data, isFetching } = useQuery({
    queryKey: ['dish-search', q],
    queryFn: () => api.searchDishes({ q: q || undefined, limit: 12 }),
    enabled: q.trim().length >= 2,
  });
  const items: { id: string; name: string; diet: string }[] = data?.items ?? [];
  const full = value.length >= max;
  const add = (d: PickedDish) => {
    if (full || value.some((v) => v.name.toLowerCase() === d.name.toLowerCase())) return;
    onChange([...value, d]);
    setQ('');
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((d) => (
          <span key={d.name} className="inline-flex items-center gap-1 rounded-full border border-[#FF6B00]/40 bg-[#FF6B00]/10 px-3 py-1 text-xs text-[#FF8A3D]">
            {d.name}
            <button type="button" onClick={() => onChange(value.filter((v) => v.name !== d.name))}><X className="h-3 w-3" /></button>
          </span>
        ))}
        {!value.length && <span className="text-xs text-muted-foreground">No dishes yet.</span>}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" value={q} disabled={full} onChange={(e) => setQ(e.target.value)} placeholder={full ? `Up to ${max} dishes for this visit` : 'Search dishes, e.g. dal, paneer…'} />
      </div>
      {q.trim().length >= 2 && !full && (
        <div className="max-h-44 divide-y divide-white/5 overflow-y-auto rounded-lg border border-white/10">
          {isFetching && <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>}
          {items.map((d) => (
            <button key={d.id} type="button" onClick={() => add({ id: d.id, name: d.name, diet: d.diet })} className="flex w-full justify-between px-3 py-2 text-left text-xs hover:bg-white/5">
              {d.name} <span className="text-muted-foreground">{titleCase(d.diet)}</span>
            </button>
          ))}
          {!isFetching && !items.some((d) => d.name.toLowerCase() === q.trim().toLowerCase()) && (
            <button type="button" onClick={() => add({ name: q.trim() })} className="flex w-full items-center gap-1 px-3 py-2 text-left text-xs text-[#FF8A3D] hover:bg-white/5">
              <Plus className="h-3 w-3" /> Add &quot;{q.trim()}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [visitType, setVisitType] = useState<'REGULAR' | 'ONE_TIME'>('REGULAR');
  const [durationMin, setDurationMin] = useState(120);
  // What goes to the staff app once someone is placed
  const [dishes, setDishes] = useState<PickedDish[]>([]);
  const [menuNote, setMenuNote] = useState('');
  const [meds, setMeds] = useState<MedRow[]>([]);
  const [dos, setDos] = useState('');
  const [donts, setDonts] = useState('');
  const [dietNotes, setDietNotes] = useState('');
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
  const oneTime = visitType === 'ONE_TIME';
  const cap = dishCap(durationMin);

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
      const menu = isCook && dishes.length
        ? oneTime
          ? {
              dish_ids: dishes.filter((d) => d.id).map((d) => d.id),
              dishes: dishes.filter((d) => !d.id).map((d) => ({ name: d.name })),
              meal_time: startTime,
              special_instruction: menuNote.trim() || undefined,
            }
          : undefined
        : undefined;
      const validMeds = meds.filter((m) => m.name.trim() && m.dose.trim());
      const careNeeds = !isCook && (validMeds.length || dos.trim() || donts.trim() || dietNotes.trim())
        ? {
            patient: { age: Number(patientAge) || undefined },
            medications: isUc ? [] : validMeds.map((m) => ({ name: m.name.trim(), dose: m.dose.trim(), times: [m.time || '09:00'] })),
            dos: dos.trim() || undefined,
            donts: donts.trim() || undefined,
            diet_notes: dietNotes.trim() || undefined,
          }
        : undefined;
      return api.createStaffRequest({
        ...(forLead
          ? { lead_name: lead.name, lead_phone: lead.phone, lead_city: lead.city || undefined }
          : { client_id: client?.id }),
        series,
        visit_type: visitType,
        ...(oneTime
          ? { duration_min: durationMin }
          : { placement_type: placementType, shift_hours: Number(shiftHours) || 8 }),
        start_date: startDate,
        start_time: startTime,
        ...(menu ? { menu } : {}),
        ...(careNeeds ? { care_needs: careNeeds } : {}),
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
  const whenReady = !!startDate && !!startTime;
  const needsReady =
    (isCook ? dietType && Number(familySize) > 0 && meals.length : Number(patientAge) > 0 && mobility) &&
    // A one-time cook visit is booked for its dishes.
    (!isCook || !oneTime || (dishes.length > 0 && dishes.length <= cap));

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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold">What they need</h2>
          <div className="flex rounded-lg border border-white/10 p-0.5 text-xs">
            {[
              { k: 'REGULAR' as const, l: 'Regular staff' },
              { k: 'ONE_TIME' as const, l: 'One-time visit' },
            ].map((o) => (
              <button
                key={o.k}
                type="button"
                onClick={() => setVisitType(o.k)}
                className={cn('rounded-md px-3 py-1.5', visitType === o.k ? 'bg-white/10 text-foreground' : 'text-muted-foreground')}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Series *">
            <SelectMenu value={series} onValueChange={setSeries} className="h-10 border-white/10 bg-card text-sm">
              {activeSeries.map((s) => (
                <SelectMenuItem key={s.value} value={s.value}>{s.short} — {s.label}</SelectMenuItem>
              ))}
            </SelectMenu>
          </Field>
          {oneTime ? (
            <Field label="Duration *" hint="Billed by the hour">
              <SelectMenu value={String(durationMin)} onValueChange={(v) => setDurationMin(Number(v))} className="h-10 border-white/10 bg-card text-sm">
                {DURATIONS.map((d) => <SelectMenuItem key={d.min} value={String(d.min)}>{d.label}</SelectMenuItem>)}
              </SelectMenu>
            </Field>
          ) : (
            <>
              <Field label="Type">
                <SelectMenu value={placementType} onValueChange={(v) => setPlacementType(v as 'PERMANENT' | 'TEMPORARY')} className="h-10 border-white/10 bg-card text-sm">
                  <SelectMenuItem value="PERMANENT">Permanent (monthly)</SelectMenuItem>
                  <SelectMenuItem value="TEMPORARY">Hourly</SelectMenuItem>
                </SelectMenu>
              </Field>
              <Field label="Hours per day"><Input type="number" value={shiftHours} onChange={(e) => setShiftHours(e.target.value)} /></Field>
            </>
          )}
          <Field label={oneTime ? 'Visit date *' : 'Start date *'}><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          <Field label={oneTime ? 'Visit time *' : 'Start time *'}>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
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
            {oneTime ? (
              <div className="space-y-3 border-t border-white/10 pt-4">
                <h3 className="text-sm font-bold">
                  Menu for the visit{startTime ? ` · ${titleCase(mealForTime(startTime))}` : ''}
                </h3>
                <Field label={`Dishes * (up to ${cap} in ${DURATIONS.find((d) => d.min === durationMin)?.label})`} hint="The cook sees these in the app once placed.">
                  <DishPicker value={dishes} onChange={setDishes} max={cap} />
                </Field>
                <Field label="Instruction for the cook"><Input value={menuNote} onChange={(e) => setMenuNote(e.target.value)} placeholder="e.g. Less oil, no onion" /></Field>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">The weekly menu is set by the client in the app.</p>
            )}
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
            <div className="space-y-3 border-t border-white/10 pt-4">
              <h3 className="text-sm font-bold">Care needs <span className="font-normal text-muted-foreground">— becomes the care plan once staff is placed</span></h3>
              {!isUc && (
                <Field label="Medicines">
                  <div className="space-y-2">
                    {meds.map((m, i) => (
                      <div key={i} className="grid grid-cols-[1fr_7rem_6rem_auto] gap-2">
                        <Input value={m.name} placeholder="Name" onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                        <Input value={m.dose} placeholder="Dose" onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, dose: e.target.value } : x)))} />
                        <Input type="time" value={m.time} onChange={(e) => setMeds(meds.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)))} />
                        <button type="button" onClick={() => setMeds(meds.filter((_, j) => j !== i))} className="px-1 text-muted-foreground hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setMeds([...meds, { name: '', dose: '', time: '09:00' }])}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add medicine
                    </Button>
                  </div>
                </Field>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Do's"><Input value={dos} onChange={(e) => setDos(e.target.value)} placeholder="e.g. Help him walk every evening" /></Field>
                <Field label="Don'ts"><Input value={donts} onChange={(e) => setDonts(e.target.value)} placeholder="e.g. No sugar in tea" /></Field>
              </div>
              <Field label="Diet notes"><Input value={dietNotes} onChange={(e) => setDietNotes(e.target.value)} /></Field>
            </div>
          </>
        )}
        <Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </section>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button disabled={!whoReady || !whenReady || !needsReady || submit.isPending} onClick={() => submit.mutate()}>
          {submit.isPending ? 'Creating…' : 'Create request'}
        </Button>
      </div>
    </div>
  );
}
