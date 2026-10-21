'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MapPin, HeartPulse, ChefHat, Clock, Phone, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api/client';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';
import { SERIES_LABELS } from '@/lib/rm/constants';
import { cn } from '@/lib/utils/cn';

type DayStatus = 'RED' | 'AMBER' | 'NOT_STARTED' | 'GREEN';
type StaffState = 'AVAILABLE' | 'PARTLY_AVAILABLE' | 'FREE_SOON' | 'DEPLOYED' | 'ON_LEAVE' | 'ON_HOLD';

interface StaffRow {
  staff_id: string;
  name: string | null;
  series: string | null;
  language_tier: string | null;
  gender: string | null;
  phone: string;
  branch: string | null;
  city: string | null;
  state: StaffState;
  placements: number;
  hourly_placements: number;
  ends_on: string | null;
  free_since: string | null;
  on_hold_at: string | null;
}

interface Deployment {
  placement_id: string;
  staff: { id: string; name: string | null; series: string | null; phone: string };
  client: { id: string; name: string; city: string | null } | null;
  type: 'PERMANENT' | 'TEMPORARY';
  visit: 'ONE_TIME' | 'REGULAR';
  status: 'TRIAL' | 'CONFIRMED';
  since: string | null;
  trial_end: string | null;
  shift_start: string | null;
  shift_hours: number;
  today: {
    attendance: string;
    check_in: string | null;
    check_out: string | null;
    late_by_min: number | null;
    far: boolean | null;
    distance_m: number | null;
    care: { total: number; done: number; missed: number; missed_meds: number; vital_alerts: number } | null;
    cook: { meals_planned: number; meals_due: number; meals_logged: number; rating_7d: number | null } | null;
    report_filled: boolean | null;
    instructions: { unread: number; refused_open: number };
  };
  status_today: DayStatus;
  flags: string[];
}

interface Snapshot {
  date: string;
  generated_at: string;
  rules: { late_after_min: number; no_show_after_min: number };
  summary: {
    availability: {
      available: number; partly_available: number; deployed: number; free_soon: number; on_leave: number; on_hold: number;
      in_pipeline: Record<string, number>;
    };
    deployment: { active: number; permanent: number; temporary: number; trial: number; trials_ending_7d: number };
    alignment: Record<DayStatus, number>;
  };
  staff: StaffRow[];
  deployments: Deployment[];
}

const STATUS: Record<DayStatus, { dot: string; label: string; text: string }> = {
  RED: { dot: 'bg-rose-500', label: 'Needs attention', text: 'text-rose-300' },
  AMBER: { dot: 'bg-amber-400', label: 'Keep an eye', text: 'text-amber-200' },
  NOT_STARTED: { dot: 'bg-slate-400', label: 'Not started', text: 'text-muted-foreground' },
  GREEN: { dot: 'bg-emerald-500', label: 'On track', text: 'text-emerald-300' },
};

const STATE: Record<StaffState, { label: string; cls: string }> = {
  AVAILABLE: { label: 'Available', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  PARTLY_AVAILABLE: { label: 'Partly available', cls: 'border-sky-500/30 bg-sky-500/10 text-sky-300' },
  FREE_SOON: { label: 'Free soon', cls: 'border-violet-500/30 bg-violet-500/10 text-violet-300' },
  DEPLOYED: { label: 'Deployed', cls: 'border-white/10 bg-white/5 text-muted-foreground' },
  ON_LEAVE: { label: 'Leave / absent', cls: 'border-rose-500/30 bg-rose-500/10 text-rose-300' },
  ON_HOLD: { label: 'Stage on hold', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
};

const ATTENDANCE: Record<string, string> = {
  ON_TIME: 'On time',
  LATE: 'Late',
  CHECKED_IN: 'Checked in',
  NOT_STARTED: 'Not started',
  NOT_IN_YET: 'Not in yet',
  NO_SHOW: 'Not checked in',
  ABSENT: 'Absent',
  ON_LEAVE: 'On leave',
};

const STAGE_SHORT: Record<string, string> = {
  S1_INTAKE: 'S1', S2_VERIFY: 'S2', S2_5_ASSESS: 'S2.5', S3_TRAIN: 'S3', S4_AGREEMENTS: 'S4', DEFERRED: 'Deferred',
};

const todayIst = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

/**
 * Staff snapshot — docs/STAFF_SNAPSHOT_PLAN.md. Who is free, who is placed
 * where, and how today's work is going, in one page. RM sees their own; BM
 * their branch; Admin everything. Counts at the top filter the lists below.
 */
export default function StaffSnapshotPage() {
  const [date, setDate] = useState(todayIst());
  const [series, setSeries] = useState('');
  const [dayFilter, setDayFilter] = useState<DayStatus | ''>('');
  const [stateFilter, setStateFilter] = useState<StaffState | ''>('');

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['rm-snapshot', date, series],
    queryFn: () => api.getRmSnapshot({ date, ...(series ? { series } : {}) }),
    refetchInterval: 60_000,
  });
  const snap = ((data as { data?: Snapshot })?.data ?? data) as Snapshot | undefined;

  const deployments = useMemo(
    () => (snap?.deployments ?? []).filter((d) => !dayFilter || d.status_today === dayFilter),
    [snap, dayFilter],
  );
  const staff = useMemo(
    () => (snap?.staff ?? []).filter((s) => (stateFilter ? s.state === stateFilter : s.state !== 'DEPLOYED')),
    [snap, stateFilter],
  );
  const a = snap?.summary.availability;
  const d = snap?.summary.deployment;
  const al = snap?.summary.alignment;
  const pipelineTotal = a ? Object.values(a.in_pipeline).reduce((x, y) => x + y, 0) : 0;
  const isToday = date === todayIst();

  return (
    <div className="page-padding mx-auto max-w-6xl space-y-5">
      <RmPageHeader
        title="Staff Snapshot"
        description="Who is free, who is placed where, and how today's work is going"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="snapshot-date"
              type="date"
              value={date}
              max={todayIst()}
              onChange={(e) => setDate(e.target.value || todayIst())}
              className="h-9 w-[150px]"
            />
            <SelectMenu
              value={series || 'ALL'}
              onValueChange={(v) => setSeries(v === 'ALL' ? '' : v)}
              className="h-9 w-[160px] border-white/10 bg-card text-sm"
            >
              <SelectMenuItem value="ALL">All series</SelectMenuItem>
              <SelectMenuItem value="UC">Caretaker (UC)</SelectMenuItem>
              <SelectMenuItem value="SC">Skilled Caretaker (SC)</SelectMenuItem>
              <SelectMenuItem value="CK">Cook (CK)</SelectMenuItem>
            </SelectMenu>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh">
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
          </div>
        }
      />

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          {(error as Error).message}
        </p>
      )}

      {/* Three blocks: each number is a filter for the lists below. */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Block title="Staff availability">
          <Count label="Available" value={a?.available} active={stateFilter === 'AVAILABLE'} onClick={() => setStateFilter(stateFilter === 'AVAILABLE' ? '' : 'AVAILABLE')} tone="text-emerald-300" />
          <Count label="Partly (hourly)" value={a?.partly_available} active={stateFilter === 'PARTLY_AVAILABLE'} onClick={() => setStateFilter(stateFilter === 'PARTLY_AVAILABLE' ? '' : 'PARTLY_AVAILABLE')} tone="text-sky-300" />
          <Count label="Free soon" value={a?.free_soon} active={stateFilter === 'FREE_SOON'} onClick={() => setStateFilter(stateFilter === 'FREE_SOON' ? '' : 'FREE_SOON')} tone="text-violet-300" />
          <Count label="Leave / absent" value={a?.on_leave} active={stateFilter === 'ON_LEAVE'} onClick={() => setStateFilter(stateFilter === 'ON_LEAVE' ? '' : 'ON_LEAVE')} tone="text-rose-300" />
          <Count label="Deployed" value={a?.deployed} active={stateFilter === 'DEPLOYED'} onClick={() => setStateFilter(stateFilter === 'DEPLOYED' ? '' : 'DEPLOYED')} />
          <Count
            label="In pipeline"
            value={pipelineTotal}
            hint={a ? Object.entries(a.in_pipeline).map(([k, v]) => `${STAGE_SHORT[k] ?? k} ${v}`).join(' · ') : undefined}
          />
        </Block>
        <Block title="Current deployment">
          <Count label="Active" value={d?.active} />
          <Count label="Permanent" value={d?.permanent} />
          <Count label="Hourly" value={d?.temporary} />
          <Count label="On trial" value={d?.trial} />
          <Count label="Trials ending ≤ 7 d" value={d?.trials_ending_7d} tone="text-violet-300" />
        </Block>
        <Block title={isToday ? "Today's work" : `Work on ${date}`}>
          {(['RED', 'AMBER', 'NOT_STARTED', 'GREEN'] as DayStatus[]).map((s) => (
            <Count
              key={s}
              label={STATUS[s].label}
              value={al?.[s]}
              dot={STATUS[s].dot}
              active={dayFilter === s}
              onClick={() => setDayFilter(dayFilter === s ? '' : s)}
            />
          ))}
        </Block>
      </div>

      {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}

      {/* Today's alignment, worst first. */}
      {snap && (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              {isToday ? 'Today' : date} · {deployments.length} placement{deployments.length === 1 ? '' : 's'}
              {dayFilter ? ` · ${STATUS[dayFilter].label}` : ''}
            </h2>
            {dayFilter && (
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setDayFilter('')}>
                Clear filter
              </button>
            )}
          </div>
          {deployments.length === 0 && (
            <p className="glass-card rounded-lg p-6 text-center text-sm text-muted-foreground">No active placements here.</p>
          )}
          <div className="glass-card overflow-x-auto rounded-lg">
            {deployments.length > 0 && (
              <table className="w-full min-w-[860px] text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-2 font-medium">Staff · Client</th>
                    <th className="px-3 py-2 font-medium">Placement</th>
                    <th className="px-3 py-2 font-medium">Attendance</th>
                    <th className="px-3 py-2 font-medium">Work</th>
                    <th className="px-3 py-2 font-medium">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.map((r) => (
                    <DeploymentRow key={r.placement_id} r={r} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Late = checked in more than {snap.rules.late_after_min} min after the shift start; red when not in{' '}
            {snap.rules.no_show_after_min} min after. Placements without a shift start are never marked late. Set it
            under Active Placements.
          </p>
        </section>
      )}

      {/* Staff availability. */}
      {snap && (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">
              {stateFilter ? STATE[stateFilter].label : 'Staff who can take work'} · {staff.length}
            </h2>
            <Link href="/rm/requests" className="text-xs text-primary hover:underline">
              Open staff requests →
            </Link>
          </div>
          {staff.length === 0 && (
            <p className="glass-card rounded-lg p-6 text-center text-sm text-muted-foreground">Nobody in this state.</p>
          )}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {staff.map((s) => (
              <Link key={s.staff_id} href={`/rm/staff/${s.staff_id}`} className="glass-card block rounded-lg p-3 hover:border-white/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{s.name || s.phone}</p>
                    <p className="text-xs text-muted-foreground">
                      {SERIES_LABELS[s.series ?? ''] ?? s.series ?? '—'}
                      {s.language_tier ? ` · ${s.language_tier}` : ''}
                      {s.city ? ` · ${s.city}` : ''}
                    </p>
                  </div>
                  <span className={cn('shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase', STATE[s.state].cls)}>
                    {STATE[s.state].label}
                  </span>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {s.phone}
                  {s.state === 'PARTLY_AVAILABLE' && <span>· {s.hourly_placements} hourly job(s)</span>}
                  {s.state === 'FREE_SOON' && s.ends_on && <span>· free from {s.ends_on}</span>}
                  {s.state === 'AVAILABLE' && s.free_since && <span>· free since {s.free_since}</span>}
                  {s.state === 'ON_HOLD' && s.on_hold_at && <span>· hold at {STAGE_SHORT[s.on_hold_at] ?? s.on_hold_at}</span>}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-card/40 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{children}</div>
    </div>
  );
}

function Count({
  label, value, onClick, active, tone, dot, hint,
}: {
  label: string; value?: number; onClick?: () => void; active?: boolean; tone?: string; dot?: string; hint?: string;
}) {
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {dot && <span className={cn('h-2 w-2 rounded-full', dot)} />}
        {label}
      </span>
      <span className={cn('text-xl font-bold tabular-nums', tone)}>{value ?? '—'}</span>
      {hint && <span className="block truncate text-[10px] text-muted-foreground">{hint}</span>}
    </>
  );
  if (!onClick) return <div className="flex flex-col rounded-lg px-2 py-1.5">{body}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
        active && 'bg-white/10 ring-1 ring-white/20',
      )}
    >
      {body}
    </button>
  );
}

function DeploymentRow({ r }: { r: Deployment }) {
  const t = r.today;
  const href = t.care || t.cook ? `/rm/care/${r.placement_id}` : `/rm/placements`;
  return (
    <tr className="border-b border-white/5 align-top last:border-0 hover:bg-white/[0.03]">
      <td className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', STATUS[r.status_today].dot)} title={STATUS[r.status_today].label} />
          <div className="min-w-0">
            <Link href={`/rm/staff/${r.staff.id}`} className="font-semibold hover:text-primary">
              {r.staff.name || r.staff.phone}
            </Link>
            <span className="ml-1.5 text-xs text-muted-foreground">{r.staff.series}</span>
            <p className="text-xs text-muted-foreground">
              {r.client?.name ?? '—'}
              {r.client?.city ? ` · ${r.client.city}` : ''}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground">
        <p className="text-foreground">
          {r.type === 'TEMPORARY' ? (r.visit === 'ONE_TIME' ? 'One-time visit' : 'Hourly') : 'Permanent'}
          {r.status === 'TRIAL' ? ' · Trial' : ''}
        </p>
        <p>since {r.since ?? '—'}{r.trial_end ? ` · trial ends ${r.trial_end}` : ''}</p>
        <p className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {r.shift_start ? `${r.shift_start} · ${r.shift_hours} h` : `no start time · ${r.shift_hours} h`}
        </p>
      </td>
      <td className="px-3 py-2.5 text-xs">
        <p
          className={cn(
            'font-medium',
            ['NO_SHOW', 'ABSENT', 'ON_LEAVE'].includes(t.attendance) ? 'text-rose-300'
              : ['LATE', 'NOT_IN_YET'].includes(t.attendance) ? 'text-amber-200'
                : ['ON_TIME', 'CHECKED_IN'].includes(t.attendance) ? 'text-emerald-300' : 'text-muted-foreground',
          )}
        >
          {ATTENDANCE[t.attendance] ?? t.attendance}
          {t.late_by_min ? ` (${t.late_by_min} min)` : ''}
        </p>
        <p className="text-muted-foreground">
          {t.check_in ? `in ${t.check_in}` : ''}
          {t.check_out ? ` · out ${t.check_out}` : ''}
        </p>
        {t.distance_m !== null && (
          <p className={cn('flex items-center gap-1', t.far ? 'text-amber-200' : 'text-muted-foreground')}>
            <MapPin className="h-3 w-3" />
            {t.distance_m} m from home
          </p>
        )}
      </td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground">
        {t.care && (
          <Link href={href} className="flex items-center gap-1 hover:text-foreground">
            <HeartPulse className="h-3.5 w-3.5" />
            {t.care.done}/{t.care.total} tasks
            {t.care.missed ? <span className="text-amber-200"> · {t.care.missed} missed</span> : null}
          </Link>
        )}
        {t.care && t.report_filled !== null && <p>Report {t.report_filled ? 'filled' : 'not filled'}</p>}
        {t.cook && (
          <Link href={href} className="flex items-center gap-1 hover:text-foreground">
            <ChefHat className="h-3.5 w-3.5" />
            {t.cook.meals_logged}/{t.cook.meals_planned} meals
            {t.cook.rating_7d !== null ? ` · ${t.cook.rating_7d}/5` : ''}
          </Link>
        )}
        {!t.care && !t.cook && <span>—</span>}
      </td>
      <td className="px-3 py-2.5 text-xs">
        {r.flags.length ? (
          <ul className={cn('space-y-0.5', STATUS[r.status_today].text)}>
            {r.flags.map((f) => <li key={f}>{f}</li>)}
          </ul>
        ) : (
          <span className="text-muted-foreground">{r.status_today === 'NOT_STARTED' ? 'Shift not started' : 'Nothing to flag'}</span>
        )}
      </td>
    </tr>
  );
}
