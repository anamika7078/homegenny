'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, ImageIcon, Mic } from 'lucide-react';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

const TASK_STATUS: Record<string, string> = {
  DONE: 'text-emerald-300',
  PENDING: 'text-muted-foreground',
  MISSED: 'text-rose-300',
  SKIPPED: 'text-amber-300',
};
const INS_STATUS: Record<string, string> = {
  SENT: 'text-sky-300',
  ACKNOWLEDGED: 'text-violet-300',
  DONE: 'text-emerald-300',
  REFUSED: 'text-rose-300',
  CANCELLED: 'text-muted-foreground',
};
const tc = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const istToday = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-xl p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

/** Files are private — fetched with the RM's token, shown from a local object URL. */
function FileThumb({ id, kind }: { id: string; kind: 'PHOTO' | 'VOICE' }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    api.getCareFile(id).then((b) => { u = URL.createObjectURL(b); setUrl(u); }).catch(() => setUrl(null));
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [id]);
  if (!url) {
    return (
      <span className="inline-flex h-12 w-12 items-center justify-center rounded border border-white/10">
        {kind === 'VOICE' ? <Mic className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
      </span>
    );
  }
  if (kind === 'VOICE') return <audio controls src={url} className="h-8 max-w-[220px]" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className="h-12 w-12 rounded border border-white/10 object-cover" /></a>;
}

export default function PlacementCarePage() {
  const { pid } = useParams<{ pid: string }>();
  const [date, setDate] = useState(istToday());
  const [month, setMonth] = useState(istToday().slice(0, 7));

  // A placement is either a caretaker's (care plan) or a cook's (menu) — ask both, one answers.
  const plan = useQuery({ queryKey: ['care-plan', pid], queryFn: () => api.getCarePlan(pid), retry: false });
  const profile = useQuery({ queryKey: ['care-food', pid], queryFn: () => api.getPlacementFoodProfile(pid), retry: false });
  const isCare = plan.isSuccess;
  const isCook = profile.isSuccess;

  const day = useQuery({ queryKey: ['care-day', pid, date], queryFn: () => api.getCareDay(pid, date), enabled: isCare });
  const history = useQuery({ queryKey: ['care-history', pid], queryFn: () => api.getCareHistory(pid), enabled: isCare });
  const menu = useQuery({ queryKey: ['care-menu', pid], queryFn: () => api.getPlacementMenu(pid), enabled: isCook });
  const meals = useQuery({
    queryKey: ['care-meals', pid],
    queryFn: () => api.getPlacementMeals(pid, { from: new Date(Date.now() + 330 * 60_000 - 6 * 86_400_000).toISOString().slice(0, 10) }),
    enabled: isCook,
  });
  const instructions = useQuery({ queryKey: ['care-ins', pid], queryFn: () => api.getPlacementInstructions(pid), enabled: isCare || isCook });

  const download = async () => {
    try {
      const blob = await api.downloadCareReport(pid, month);
      const u = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = u;
      a.download = `care-report-${month}.pdf`;
      a.click();
      URL.revokeObjectURL(u);
    } catch (e) {
      toast.error((e as Error).message || 'Could not download the report');
    }
  };

  if (plan.isLoading || profile.isLoading) return <p className="page-padding py-8 text-center text-sm text-muted-foreground">Loading…</p>;
  if (!isCare && !isCook) {
    return (
      <div className="page-padding max-w-4xl mx-auto space-y-3">
        <Link href="/rm/care" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Daily Care</Link>
        <p className="text-sm text-muted-foreground">No daily care for this placement — only caretaker (UC/SC) and cook placements have it.</p>
      </div>
    );
  }

  const p = plan.data?.plan;
  const head = isCare
    ? { client: plan.data?.client?.name, staff: plan.data?.staff?.name }
    : { client: profile.data?.client?.name, staff: null };

  return (
    <div className="page-padding max-w-5xl mx-auto space-y-5">
      <Link href="/rm/care" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Daily Care
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{head.client}</h1>
          <p className="text-sm text-muted-foreground">{isCare ? `Caretaker · ${head.staff}` : 'Cook'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 w-40" />
          <Button variant="outline" className="gap-2" onClick={download}><Download className="h-4 w-4" />Monthly PDF</Button>
        </div>
      </div>

      {isCare && (
        <>
          <Section
            title={p ? `Care plan · v${p.version}` : 'Care plan'}
            right={p && (
              <span className={cn('text-xs', plan.data?.staff_acknowledged_at ? 'text-emerald-300' : 'text-amber-300')}>
                {plan.data?.staff_acknowledged_at ? 'Read by the caretaker' : 'Not yet read by the caretaker'}
              </span>
            )}
          >
            {!p ? (
              <p className="text-sm text-muted-foreground">The family has not written a care plan yet.</p>
            ) : (
              <div className="grid gap-4 text-sm md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Patient</p>
                  <p>{[p.patient?.name, p.patient?.age ? `${p.patient.age} yrs` : null, p.patient?.mobility ? tc(p.patient.mobility) : null].filter(Boolean).join(' · ') || '—'}</p>
                  {p.patient?.conditions?.length > 0 && <p className="text-muted-foreground">Conditions: {p.patient.conditions.join(', ')}</p>}
                  {p.patient?.allergies?.length > 0 && <p className="text-rose-300">Allergies: {p.patient.allergies.join(', ')}</p>}
                  {p.diet_notes && <p>Diet: {p.diet_notes}</p>}
                  {p.dos && <p>Do: {p.dos}</p>}
                  {p.donts && <p>Don&apos;t: {p.donts}</p>}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Medicines</p>
                  {(p.medications ?? []).length === 0 && <p className="text-muted-foreground">None</p>}
                  {(p.medications ?? []).map((m: any) => (
                    <p key={m.id}>{m.name} {m.dose}{m.unit ? ` ${m.unit}` : ''} · {m.times.join(', ')}{m.food_relation !== 'ANY' ? ` · ${m.food_relation.toLowerCase()} food` : ''}</p>
                  ))}
                  <p className="pt-2 text-xs font-semibold text-muted-foreground">Checks & activities</p>
                  {[...(p.vitals ?? []).map((v: any) => `${v.label} · ${v.times.join(', ')}`), ...(p.activities ?? []).map((a: any) => `${a.title} · ${a.times.join(', ')}`)].map((t: string) => <p key={t}>{t}</p>)}
                </div>
                {p.changes?.length > 0 && p.version > 1 && (
                  <div className="md:col-span-2 rounded-lg border border-white/10 bg-white/5 p-3 text-xs">
                    <p className="mb-1 font-semibold">Changed in v{p.version}</p>
                    {p.changes.map((c: any, i: number) => <p key={i}>• {c.text}</p>)}
                  </div>
                )}
              </div>
            )}
          </Section>

          <Section
            title="Checklist"
            right={<Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-40" />}
          >
            {day.data && (
              <p className="mb-3 text-xs text-muted-foreground">
                {day.data.summary.done}/{day.data.summary.total} done · {day.data.summary.missed} missed · {day.data.summary.skipped} skipped
                {day.data.summary.out_of_range ? ` · ${day.data.summary.out_of_range} reading(s) out of range` : ''}
              </p>
            )}
            <div className="divide-y divide-white/5">
              {(day.data?.tasks ?? []).map((t: any) => (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">{t.time}</span>
                    {t.title}
                    {t.value && (t.value.systolic || t.value.value !== undefined) && (
                      <span className={cn('ml-2 font-semibold', t.out_of_range ? 'text-rose-300' : 'text-emerald-300')}>
                        {t.value.systolic ? `${t.value.systolic}/${t.value.diastolic}` : t.value.value} {t.value.unit ?? ''}
                      </span>
                    )}
                    {t.skip_reason && <span className="ml-2 text-xs text-amber-300">“{t.skip_reason}”</span>}
                    {t.notes && <span className="ml-2 text-xs text-muted-foreground">{t.notes}</span>}
                  </div>
                  <span className={cn('text-xs font-semibold', TASK_STATUS[t.status])}>{tc(t.status)}{t.value?.late ? ' (late)' : ''}</span>
                </div>
              ))}
              {day.data && day.data.tasks.length === 0 && <p className="py-2 text-sm text-muted-foreground">Nothing scheduled.</p>}
            </div>
            {day.data?.report && (
              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Caretaker&apos;s report</p>
                {day.data.report.meals?.map((m: any, i: number) => <p key={i}>{tc(m.meal || 'meal')}: {m.description} {m.quantity ? `(${m.quantity})` : ''}</p>)}
                <p className="text-muted-foreground">
                  {[day.data.report.fluid_intake_ml ? `Water ${day.data.report.fluid_intake_ml} ml` : null, day.data.report.sleep ? `Sleep: ${day.data.report.sleep}` : null, day.data.report.mood ? `Mood: ${day.data.report.mood}` : null].filter(Boolean).join(' · ')}
                </p>
                {day.data.report.notes && <p className="mt-1">{day.data.report.notes}</p>}
                <div className="mt-2 flex gap-2">{(day.data.report.photo_file_ids ?? []).map((f: string) => <FileThumb key={f} id={f} kind="PHOTO" />)}</div>
              </div>
            )}
          </Section>

          <Section title={`Last 7 days · medicines ${history.data?.medication_adherence_pct ?? '—'}% on time`}>
            <div className="flex flex-wrap gap-2">
              {(history.data?.days ?? []).map((d: any) => (
                <div key={d.date} className="rounded-lg border border-white/10 px-3 py-2 text-center text-xs">
                  <p className="text-muted-foreground">{d.date.slice(5)}</p>
                  <p className={cn('font-bold', d.missed ? 'text-rose-300' : 'text-emerald-300')}>{d.adherence_pct ?? '—'}%</p>
                </div>
              ))}
            </div>
            {(history.data?.vitals ?? []).filter((v: any) => v.out_of_range).length > 0 && (
              <div className="mt-3 text-xs">
                <p className="mb-1 font-semibold text-rose-300">Readings out of range</p>
                {history.data.vitals.filter((v: any) => v.out_of_range).map((v: any, i: number) => (
                  <p key={i}>{v.date} {v.time} · {v.title.replace(/^Check /, '')}: {v.value?.systolic ? `${v.value.systolic}/${v.value.diastolic}` : v.value?.value} {v.value?.unit ?? ''}</p>
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      {isCook && (
        <>
          <Section title={`Food profile${profile.data?.profile ? ` · v${profile.data.profile.version}` : ''}`}>
            {!profile.data?.profile ? (
              <p className="text-sm text-muted-foreground">The family has not filled the food profile yet.</p>
            ) : (
              <div className="grid gap-1 text-sm sm:grid-cols-2">
                <p>Diet: {tc(profile.data.profile.diet_type ?? '—')}</p>
                <p>Spice: {profile.data.profile.spice_level ?? '—'}/5 · Salt: {profile.data.profile.salt ?? '—'} · Oil: {profile.data.profile.oil ?? '—'}</p>
                <p>Health: {(profile.data.profile.health_conditions ?? []).map(tc).join(', ') || '—'}</p>
                <p className="text-rose-300">Allergies: {(profile.data.profile.allergies ?? []).join(', ') || '—'}</p>
                <p>Cuisines: {(profile.data.profile.cuisines ?? []).join(', ') || '—'}</p>
                <p>People: {profile.data.profile.family_size ?? '—'}</p>
              </div>
            )}
          </Section>

          <Section title={`Menu · ${menu.data?.week_start ?? ''} to ${menu.data?.week_end ?? ''}`}>
            {(menu.data?.items ?? []).length === 0 && <p className="text-sm text-muted-foreground">No menu set for this week.</p>}
            <div className="divide-y divide-white/5">
              {(menu.data?.items ?? []).map((m: any) => (
                <div key={m.id} className="flex flex-wrap items-start justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                      {m.date} {m.meal.toLowerCase()}{m.meal_time ? ` · ${m.meal_time}` : ''}
                    </span>
                    {m.dishes.map((d: any) => d.name).join(', ')}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {m.source === 'TEMPLATE' ? 'weekly template' : m.suggested_by_cook ? `cook's suggestion · ${tc(m.status)}` : ''}
                    </span>
                    {m.special_instruction && <span className="ml-2 text-xs">“{m.special_instruction}”</span>}
                    {m.health_warnings?.length > 0 && <p className="text-xs text-amber-300">Warning: {m.health_warnings.join('; ')}</p>}
                  </div>
                  {(m.photo_file_ids ?? []).length > 0 && (
                    <div className="flex gap-1">{m.photo_file_ids.map((f: string) => <FileThumb key={f} id={f} kind="PHOTO" />)}</div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          <Section title={`Meals · last 7 days · rating ${meals.data?.rating?.avg_7d ?? '—'}/5`}>
            {(meals.data?.items ?? []).length === 0 && <p className="text-sm text-muted-foreground">No meals logged.</p>}
            <div className="divide-y divide-white/5">
              {(meals.data?.items ?? []).map((m: any) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">{m.date} {m.meal.toLowerCase()}</span>
                    {m.dishes.map((d: any) => d.name).join(', ')}
                    {m.feedback && (
                      <span className={cn('ml-2 text-xs', m.feedback.rating < 3 ? 'text-rose-300' : 'text-emerald-300')}>
                        {m.feedback.rating}/5 {(m.feedback.tags ?? []).map(tc).join(', ')} {m.feedback.comment ? `— ${m.feedback.comment}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {m.dishes.filter((d: any) => d.photo_file_id).map((d: any) => <FileThumb key={d.photo_file_id} id={d.photo_file_id} kind="PHOTO" />)}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      <Section title="Instructions from the family">
        {(instructions.data?.items ?? []).length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
        <div className="divide-y divide-white/5">
          {(instructions.data?.items ?? []).map((i: any) => (
            <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                {i.text ?? <span className="text-muted-foreground">Voice note</span>}
                {i.kind === 'RECURRING' && <span className="ml-2 text-xs text-muted-foreground">standing order</span>}
                {i.staff_note && <p className="text-xs text-muted-foreground">Staff: {i.staff_note}</p>}
                {i.rm_decision && <p className="text-xs">RM: {i.rm_decision === 'UPHELD' ? 'outside the job' : 'part of the job'} — {i.rm_note}</p>}
              </div>
              <div className="flex items-center gap-2">
                {i.voice_file_id && <FileThumb id={i.voice_file_id} kind="VOICE" />}
                <span className={cn('text-xs font-semibold', INS_STATUS[i.status])}>{tc(i.status)}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
