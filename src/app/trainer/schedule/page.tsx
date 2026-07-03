'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, GraduationCap } from 'lucide-react';
import { api } from '@/lib/api/client';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface Batch {
  id: string; batchCode: string; series: string;
  startDate: string; status: string;
  enrollments: { staffId: string }[];
}

const SERIES_CLR: Record<string, string> = {
  DR: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
  SC: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  UC: 'bg-sky-500/20 border-sky-500/30 text-sky-400',
  M3X: 'bg-violet-500/20 border-violet-500/30 text-violet-400',
};
const DAYS_PER_SERIES: Record<string, number> = { DR: 5, SC: 7, UC: 5, M3X: 3 };

function getDatesInMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

function getBatchDates(batch: Batch): Date[] {
  const start = new Date(batch.startDate);
  const days = DAYS_PER_SERIES[batch.series] ?? 5;
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export default function TrainerSchedulePage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    api.getTrainerBatches()
      .then(raw => {
        const data = raw?.data ?? raw ?? [];
        setBatches(Array.isArray(data) ? data : []);
      })
      .catch(() => setBatches([]))
      .finally(() => setLoading(false));
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const { firstDay, daysInMonth } = getDatesInMonth(viewYear, viewMonth);

  // Build a map: dateStr → batches active on that day
  const dayBatchMap: Record<string, Batch[]> = {};
  for (const b of batches) {
    for (const d of getBatchDates(b)) {
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!dayBatchMap[key]) dayBatchMap[key] = [];
      dayBatchMap[key].push(b);
    }
  }

  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const selectedKey = selectedDay !== null ? `${viewYear}-${viewMonth}-${selectedDay}` : null;
  const selectedBatches = selectedKey ? (dayBatchMap[selectedKey] ?? []) : [];

  // Upcoming batches in next 30 days
  const upcoming = batches
    .filter(b => {
      const s = new Date(b.startDate);
      const diff = (s.getTime() - today.getTime()) / 86400000;
      return diff >= 0 && diff <= 30 && b.status !== 'COMPLETED';
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page-padding max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Training Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">Schedule overview for your assigned batches</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 rounded-2xl border border-white/8 bg-card/40 p-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-bold text-foreground">{MONTHS[viewMonth]} {viewYear}</h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_SHORT.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-muted-foreground uppercase py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const key = `${viewYear}-${viewMonth}-${day}`;
              const batchesOnDay = dayBatchMap[key] ?? [];
              const isToday = key === todayKey;
              const isSelected = day === selectedDay;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  className={`relative min-h-[44px] rounded-lg flex flex-col items-center pt-1 pb-1 text-sm font-semibold transition-all
                    ${isSelected ? 'bg-[#FF5A1F]/20 border border-[#FF5A1F]/40' : isToday ? 'bg-white/8 border border-white/20' : 'hover:bg-white/5 border border-transparent'}
                    ${batchesOnDay.length > 0 ? 'text-foreground' : 'text-muted-foreground'}
                  `}
                >
                  <span className={isToday ? 'text-[#FF5A1F] font-bold' : ''}>{day}</span>
                  {batchesOnDay.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {batchesOnDay.slice(0, 3).map((b, bi) => (
                        <span key={bi} className={`w-1.5 h-1.5 rounded-full ${
                          b.series === 'DR' ? 'bg-amber-400' :
                          b.series === 'SC' ? 'bg-emerald-400' :
                          b.series === 'UC' ? 'bg-sky-400' : 'bg-violet-400'
                        }`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected day batches */}
          {selectedDay !== null && (
            <div className="mt-4 pt-4 border-t border-white/8">
              <p className="text-xs font-bold text-muted-foreground mb-3">
                {selectedDay} {MONTHS[viewMonth]}
              </p>
              {selectedBatches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions scheduled</p>
              ) : (
                <div className="space-y-2">
                  {selectedBatches.map(b => (
                    <div key={b.id} className={`flex items-center gap-3 p-3 rounded-lg border ${SERIES_CLR[b.series] ?? SERIES_CLR.DR}`}>
                      <GraduationCap className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{b.batchCode}</p>
                        <p className="text-xs opacity-70">{b.series} · {b.enrollments?.length ?? 0} trainees</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upcoming sidebar */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-foreground">Upcoming (Next 30 Days)</h3>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl border border-white/8 bg-card/40 animate-pulse" />)}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="py-8 text-center">
              <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">No upcoming batches</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map(b => {
                const start = new Date(b.startDate);
                const daysUntil = Math.ceil((start.getTime() - today.getTime()) / 86400000);
                return (
                  <div key={b.id} className="rounded-xl border border-white/8 bg-card/40 p-3 hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-foreground">{b.batchCode}</span>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${SERIES_CLR[b.series] ?? SERIES_CLR.DR}`}>{b.series}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}</span>
                      <span>·</span>
                      <Users className="w-3 h-3" />
                      <span>{b.enrollments?.length ?? 0} trainees</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
