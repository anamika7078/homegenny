'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { AppShell } from '@/components/layout/app-shell';
import { api } from '@/lib/api/client';
import toast from 'react-hot-toast';
import { ChevronDown } from 'lucide-react';

const PERIOD = { month: 4 as const, year: 2026 };

const SERIES_OPTIONS = [
  { value: 'DR', label: 'DR — Driver' },
  { value: 'SC', label: 'SC — Skilled Caretaker' },
  { value: 'UC', label: 'UC — Unskilled Caretaker' },
  { value: 'MAID', label: 'MAID — Maid' },
] as const;

type SeriesValue = (typeof SERIES_OPTIONS)[number]['value'];

interface PayrollCalc {
  grossSalary: number;
  esicEmployee: number;
  esicEmployer: number;
  pfEmployee: number;
  pfEmployer: number;
  netSalary: number;
  managementFee: number;
  gstOnFee: number;
  clientTotalCharge: number;
}

function unwrap<T>(body: unknown): T {
  const b = body as { data?: T };
  return (b?.data !== undefined ? b.data : body) as T;
}

function fmtInr(n: number) {
  return `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function toastPayrollQueued(message: string) {
  toast.custom(
    () => (
      <div className="pointer-events-auto flex w-full max-w-[min(440px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-white/10 bg-[#121418] text-white shadow-2xl">
        <div className="w-1.5 shrink-0 rounded-l-[14px] bg-[#FF6B00]" aria-hidden />
        <p className="flex-1 py-4 pl-3 pr-4 text-sm font-medium leading-snug">{message}</p>
      </div>
    ),
    { position: 'bottom-right', duration: 5500 }
  );
}

export default function PayrollPage() {
  const [gross, setGross] = useState(27500);
  const [feePct, setFeePct] = useState(12);
  const [series, setSeries] = useState<SeriesValue>('DR');
  const [calc, setCalc] = useState<PayrollCalc | null>(null);
  const [queueing, setQueueing] = useState(false);

  const periodLabel = format(new Date(PERIOD.year, PERIOD.month - 1, 1), 'MMMM yyyy');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const raw = await api.calculatePayroll(gross, feePct);
        if (!cancelled) setCalc(unwrap<PayrollCalc>(raw));
      } catch {
        if (!cancelled) toast.error('Could not load payroll preview', { position: 'bottom-right' });
      }
    };
    const t = window.setTimeout(run, 320);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [gross, feePct]);

  const onGenerate = useCallback(async () => {
    setQueueing(true);
    try {
      const raw = await api.queuePayrollBatch({
        month: PERIOD.month,
        year: PERIOD.year,
        series,
      });
      const data = unwrap<{ message: string }>(raw);
      toastPayrollQueued(data.message);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to queue payroll';
      toast.error(msg, { position: 'bottom-right' });
    } finally {
      setQueueing(false);
    }
  }, [series]);

  const esicNa = calc != null && calc.grossSalary > 21_000 && calc.esicEmployee === 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-8">
          <h1 className="font-syne text-3xl font-bold tracking-tight text-white lg:text-4xl">Payroll Calculator</h1>
          <p className="mt-2 text-sm text-secondary-foreground">
            ESIC · PF · GST on management fee only · Razorpay disbursement
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Input parameters */}
          <div className="rounded-xl border border-white/[0.08] bg-[#121926]/90 p-5 shadow-xl sm:p-6">
            <h2 className="font-syne text-lg font-bold text-white">Input parameters</h2>

            <div className="mt-8 space-y-8">
              <div>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-secondary-foreground">
                    Gross salary
                  </label>
                  <span className="text-sm font-semibold tabular-nums text-white">{fmtInr(gross)}</span>
                </div>
                <input
                  type="range"
                  min={10000}
                  max={100000}
                  step={500}
                  value={gross}
                  onChange={(e) => setGross(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#1a2332] accent-[#FF6B00]"
                  style={{ accentColor: '#FF6B00' }}
                />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-secondary-foreground">
                    Management fee %
                  </label>
                  <span className="text-sm font-semibold tabular-nums text-white">{feePct}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={25}
                  step={1}
                  value={feePct}
                  onChange={(e) => setFeePct(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#1a2332]"
                  style={{ accentColor: '#FF6B00' }}
                />
              </div>

              <div>
                <label
                  htmlFor="payroll-series"
                  className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-secondary-foreground"
                >
                  Staff series
                </label>
                <div className="relative">
                  <select
                    id="payroll-series"
                    value={series}
                    onChange={(e) => setSeries(e.target.value as SeriesValue)}
                    className="w-full appearance-none rounded-lg border border-white/15 bg-[#0B111B]/90 py-3 pl-3 pr-10 text-sm font-medium text-white outline-none focus:border-[#FF6B00]/50 focus:ring-2 focus:ring-[#FF6B00]/35"
                  >
                    {SERIES_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-lg border border-white/[0.06] bg-[#0B111B]/60 p-4 text-xs leading-relaxed text-secondary-foreground">
              <p>ESIC: 0.75% employee + 3.25% employer (wages &lt; ₹21,000 only)</p>
              <p className="mt-2">PF: 12% each on first ₹15,000 wage ceiling</p>
              <p className="mt-2">GST: 18% on management fee only — NEVER on staff salary</p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="flex flex-col rounded-xl border border-white/[0.08] bg-[#121926]/90 shadow-xl">
            <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
              <h2 className="font-syne text-lg font-bold text-white">{periodLabel} breakdown</h2>
            </div>

            <div className="flex flex-1 flex-col px-5 py-5 sm:px-6">
              {!calc ? (
                <div className="flex flex-1 flex-col justify-center gap-3 py-12">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
                </div>
              ) : calc ? (
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-secondary-foreground">Gross salary</dt>
                    <dd className="font-medium tabular-nums text-white">{fmtInr(calc.grossSalary)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-secondary-foreground">— ESIC employee (0.75%)</dt>
                    <dd className="font-medium tabular-nums text-red-400">
                      {esicNa ? 'N/A (>₹21,000)' : `— ${fmtInr(calc.esicEmployee)}`}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-secondary-foreground">— PF employee (12%)</dt>
                    <dd className="font-medium tabular-nums text-red-400">— {fmtInr(calc.pfEmployee)}</dd>
                  </div>

                  <div className="rounded-lg bg-sky-500/10 px-3 py-3 ring-1 ring-sky-500/25">
                    <div className="flex justify-between gap-4">
                      <dt className="font-semibold text-sky-100/95">Net salary to staff</dt>
                      <dd className="text-lg font-bold tabular-nums text-sky-300">{fmtInr(calc.netSalary)}</dd>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.06] pt-3" />

                  <div className="flex justify-between gap-4">
                    <dt className="text-secondary-foreground">ESIC employer (3.25%)</dt>
                    <dd className="font-medium tabular-nums text-white">{fmtInr(calc.esicEmployer)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-secondary-foreground">PF employer (12%)</dt>
                    <dd className="font-medium tabular-nums text-white">{fmtInr(calc.pfEmployer)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-secondary-foreground">Management fee ({feePct}%)</dt>
                    <dd className="font-medium tabular-nums text-white">{fmtInr(calc.managementFee)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-secondary-foreground">GST on fee (18%)</dt>
                    <dd className="font-medium tabular-nums text-white">{fmtInr(calc.gstOnFee)}</dd>
                  </div>

                  <div className="rounded-lg bg-sky-500/10 px-3 py-3 ring-1 ring-sky-500/25">
                    <div className="flex justify-between gap-4">
                      <dt className="font-semibold text-sky-100/95">Client total charge</dt>
                      <dd className="text-lg font-bold tabular-nums text-sky-300">{fmtInr(calc.clientTotalCharge)}</dd>
                    </div>
                  </div>
                </dl>
              ) : null}

              <div className="mt-auto shrink-0 pt-8">
                <button
                  type="button"
                  disabled={queueing}
                  onClick={onGenerate}
                  className="w-full rounded-xl bg-[#FF6B00] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#FF6B00]/25 transition-colors hover:bg-[#e65f00] disabled:opacity-60"
                >
                  {queueing ? 'Queuing…' : `Generate ${periodLabel} payroll + invoice`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
