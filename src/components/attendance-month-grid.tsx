'use client';

/**
 * One month of attendance as a calendar, with arrows to walk back and forward.
 *
 * A list of dates tells you what happened; a grid tells you the shape of the
 * month — the week somebody stopped coming, the Sundays they always work. The
 * cells sit under real weekday columns, so a gap is in the place your eye
 * expects it rather than wherever the list happened to break.
 *
 * Used by both detail dialogs — the customer's staff and HR's employee — so
 * the same month reads the same way on both screens.
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
/** Monday-first, as the week is read here. */
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export interface DayMark {
  status: string;
  hours?: number | null;
}

/** Day-of-month (1-31) → what happened. Days with no record are absent. */
export type MonthDays = Record<number, DayMark>;

/**
 * Present and overtime read as worked, half day as partial, leave and absent
 * as not — and they must look different from a day with no record at all,
 * which is the commonest state and should stay quiet.
 */
const TONE: Record<string, { cell: string; dot: string; label: string }> = {
  PRESENT:  { cell: 'bg-emerald-500/85 text-emerald-950', dot: 'bg-emerald-500/85', label: 'Present' },
  OVERTIME: { cell: 'bg-emerald-400 text-emerald-950',    dot: 'bg-emerald-400',    label: 'Overtime' },
  HALF_DAY: { cell: 'bg-amber-500/80 text-amber-950',     dot: 'bg-amber-500/80',   label: 'Half day' },
  LEAVE:    { cell: 'bg-sky-500/40 text-sky-100',         dot: 'bg-sky-500/40',     label: 'Leave' },
  ABSENT:   { cell: 'bg-red-500/35 text-red-100',         dot: 'bg-red-500/35',     label: 'Absent' },
};
const EMPTY = 'bg-white/[0.04] text-slate-600';

function toneFor(status?: string) {
  if (!status) return null;
  return TONE[status.toUpperCase().replace(/\s+/g, '_')] ?? null;
}

export function AttendanceMonthGrid({
  month,
  year,
  days,
  daysInMonth,
  onChangeMonth,
  loading = false,
  compact = false,
}: {
  month: number;
  year: number;
  days: MonthDays;
  daysInMonth?: number;
  /** Omit to render without arrows — several grids under one shared picker. */
  onChangeMonth?: (month: number, year: number) => void;
  loading?: boolean;
  compact?: boolean;
}) {
  const total = daysInMonth ?? new Date(Date.UTC(year, month, 0)).getUTCDate();

  // Which column the 1st falls in. getUTCDay is Sunday-based; this week starts
  // on Monday, so Sunday moves to the end.
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;

  const step = (by: number) => {
    if (!onChangeMonth) return;
    const d = new Date(Date.UTC(year, month - 1 + by, 1));
    onChangeMonth(d.getUTCMonth() + 1, d.getUTCFullYear());
  };

  const worked = Object.values(days).filter((d) =>
    ['PRESENT', 'OVERTIME', 'HALF_DAY'].includes(d.status?.toUpperCase?.() ?? ''),
  ).length;

  const cell = compact ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-[11px]';

  return (
    <div className="flex flex-col gap-2">
      {onChangeMonth && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => step(-1)}
            className="rounded-lg border border-border p-1.5 text-secondary-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">{MONTHS[month - 1]} {year}</p>
            <p className="text-[10px] text-secondary-foreground">
              {loading ? 'loading…' : `${worked} day${worked === 1 ? '' : 's'} worked`}
            </p>
          </div>
          <button
            onClick={() => step(1)}
            className="rounded-lg border border-border p-1.5 text-secondary-foreground hover:bg-muted hover:text-foreground transition"
            aria-label="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className={`grid grid-cols-7 gap-1 ${loading ? 'opacity-40' : ''}`}>
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-[9px] font-semibold uppercase text-secondary-foreground">
            {d}
          </div>
        ))}

        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`pad-${i}`} className={cell} />
        ))}

        {Array.from({ length: total }, (_, i) => i + 1).map((day) => {
          const mark = days[day];
          const tone = toneFor(mark?.status);
          const title = mark
            ? `${day} ${MONTHS[month - 1]} — ${tone?.label ?? mark.status}` +
              (mark.hours != null ? `, ${mark.hours} hrs` : '')
            : `${day} ${MONTHS[month - 1]} — nothing marked`;
          return (
            <div
              key={day}
              title={title}
              className={`${cell} flex items-center justify-center rounded font-medium tabular-nums
                          ${tone ? tone.cell : EMPTY}`}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Only the states actually present this month — a legend of things that
          did not happen is noise. */}
      {(() => {
        const seen = [...new Set(Object.values(days).map((d) => d.status?.toUpperCase?.()))]
          .map((s) => TONE[s ?? ''])
          .filter(Boolean);
        if (!seen.length) return null;
        return (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
            {seen.map((t) => (
              <span key={t.label} className="flex items-center gap-1 text-[9px] text-secondary-foreground">
                <span className={`h-2 w-2 rounded-sm ${t.dot}`} />
                {t.label}
              </span>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
