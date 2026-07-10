'use client';

import React from 'react';
import type { DailyAttendanceRecord, StaffAttendanceStatus } from '@/lib/types';

const STATUS_CYCLE: (StaffAttendanceStatus | null)[] = [
  'PRESENT', 'ABSENT', 'LEAVE', 'OVERTIME', null,
];

const STATUS_STYLE: Record<StaffAttendanceStatus, string> = {
  PRESENT: 'bg-emerald-500/25 border-emerald-500/40 text-emerald-300',
  ABSENT: 'bg-red-500/20 border-red-500/40 text-red-300',
  LEAVE: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  OVERTIME: 'bg-sky-500/25 border-sky-500/40 text-sky-300',
};

const STATUS_LABEL: Record<StaffAttendanceStatus, string> = {
  PRESENT: 'P',
  ABSENT: 'A',
  LEAVE: 'L',
  OVERTIME: 'OT',
};

function nextStatus(current: StaffAttendanceStatus | undefined): StaffAttendanceStatus | null {
  const idx = current ? STATUS_CYCLE.indexOf(current) : -1;
  const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
  return next ?? null;
}

interface AttendanceDayGridProps {
  year: number;
  month: number;
  records: DailyAttendanceRecord[];
  loadingKey?: string | null;
  onMark: (date: string, status: StaffAttendanceStatus | null) => void;
}

export function AttendanceDayGrid({
  year,
  month,
  records,
  loadingKey,
  onMark,
}: AttendanceDayGridProps) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const recordMap = new Map(records.map((r) => [r.date, r.status]));

  return (
    <div className="flex flex-wrap gap-1.5 pt-3">
      {Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const status = recordMap.get(date);
        const key = date;
        const isLoading = loadingKey === key;

        return (
          <button
            key={date}
            type="button"
            disabled={isLoading}
            onClick={() => onMark(date, nextStatus(status))}
            title={`${date}: ${status ?? 'unset'} — click to cycle`}
            className={`flex h-8 w-8 flex-col items-center justify-center rounded-lg border text-[10px] font-bold transition
              ${status ? STATUS_STYLE[status] : 'border-white/10 bg-white/5 text-slate-500 hover:bg-white/10'}
              ${isLoading ? 'opacity-50' : ''}`}
          >
            <span className="text-[8px] leading-none opacity-70">{day}</span>
            <span className="leading-none">{status ? STATUS_LABEL[status] : '·'}</span>
          </button>
        );
      })}
    </div>
  );
}
