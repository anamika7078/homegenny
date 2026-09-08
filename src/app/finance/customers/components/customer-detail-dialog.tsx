'use client';

/**
 * Everything about one customer, opened from their row.
 *
 * Who works there, whether they turned up, and what was billed used to live on
 * three different screens, so answering "what is going on with this client"
 * meant three trips. One call fills this, and the month arrows move all the
 * staff grids together — the question is almost always about the month, not
 * about one person in it.
 */

import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { api, BASE_URL, tokenStore } from '@/lib/api/client';
import { AttendanceMonthGrid, type MonthDays } from '@/components/attendance-month-grid';
import {
  Loader2, X, MapPin, Users, FileText, Download, Eye,
  ChevronLeft, ChevronRight, Clock, CalendarDays, AlertCircle,
} from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmtRs = (n: number | string | null | undefined) =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n ?? 0))}`;

const STATUS_TONE: Record<string, string> = {
  DRAFT:          'text-slate-300 bg-white/5 border-white/15',
  APPROVED:       'text-blue-400 bg-blue-400/10 border-blue-400/20',
  SENT:           'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  PARTIALLY_PAID: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  PAID:           'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  OVERDUE:        'text-red-400 bg-red-400/10 border-red-400/20',
  CREDIT_NOTE:    'text-slate-400 bg-slate-400/10 border-slate-400/20',
  CANCELLED:      'text-slate-500 bg-slate-500/10 border-slate-500/20',
};

interface StaffRow {
  placement_id: string;
  staff_id: string;
  employee_id: string | null;
  staff_code: string;
  staff_name: string;
  mobile: string | null;
  series: string;
  placement_type: 'PERMANENT' | 'TEMPORARY';
  status: string;
  shift_hours: number | null;
  staff_salary: number | null;
  management_fee: number | null;
  hourly_rate: number | null;
  hourly_fee: number | null;
  trial_end_date: string | null;
  days: MonthDays;
  days_worked: number;
  hours_worked: number;
}

export function CustomerDetailDialog({
  customerId,
  onClose,
  onBillGenerated,
  onPanVerified,
}: {
  customerId: string;
  onClose: () => void;
  /** Both carried over from the drawer this replaced — the list still updates. */
  onBillGenerated?: (id: string, billNo: string) => void;
  onPanVerified?: (id: string, result: any) => void;
}) {
  const [busy, setBusy] = useState<'pan' | 'bill' | null>(null);
  const [lastBill, setLastBill] = useState<string | null>(null);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async (m: number, y: number) => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.getFinanceCustomerOverview(customerId, m, y);
      setData(res?.data ?? res);
    } catch (e: any) {
      setError(e?.response?.data?.message?.message ?? e.message ?? 'Could not load this customer.');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { load(month, year); }, [load, month, year]);

  // Esc closes, as it does everywhere else.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const step = (by: number) => {
    const d = new Date(Date.UTC(year, month - 1 + by, 1));
    setMonth(d.getUTCMonth() + 1);
    setYear(d.getUTCFullYear());
  };

  const downloadInvoice = async (id: string, number: string) => {
    setDownloading(id);
    try {
      const token = tokenStore.getAccess();
      const res = await axios.get(`${BASE_URL}/finance/invoices/${id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${number.replace(/\//g, '-')}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message ?? 'Could not download that invoice.');
    } finally {
      setDownloading(null);
    }
  };

  const verifyPan = async () => {
    setBusy('pan');
    setError(null);
    try {
      const res: any = await api.verifyFinanceCustomerPan(customerId);
      const result = res?.data ?? res;
      onPanVerified?.(customerId, { ...result, verified_at: new Date().toISOString() });
      await load(month, year);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'PAN verification failed.');
    } finally {
      setBusy(null);
    }
  };

  const generateBill = async () => {
    setBusy('bill');
    setError(null);
    try {
      const res: any = await api.generateFinanceCustomerBillNumber(customerId);
      const out = res?.data ?? res;
      setLastBill(out?.bill_number ?? null);
      if (out?.bill_number) onBillGenerated?.(customerId, out.bill_number);
      await load(month, year);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not generate a bill number.');
    } finally {
      setBusy(null);
    }
  };

  const c = data?.customer;
  const staff: StaffRow[] = data?.staff ?? [];
  const invoices: any[] = data?.invoices ?? [];
  const panVerified = c?.metadata?.pan_verification?.verified === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden
                      rounded-2xl border border-white/10 bg-[#0d1526] shadow-2xl">
        {/* Who they are */}
        <div className="flex shrink-0 items-start justify-between gap-6 border-b border-white/8 px-6 py-4">
          <div className="min-w-0">
            {loading && !data ? (
              <div className="h-6 w-48 animate-pulse rounded bg-white/10" />
            ) : (
              <>
                <h2 className="truncate text-lg font-bold text-white">{c?.customer_name ?? 'Customer'}</h2>
                <p className="mt-0.5 font-mono text-xs text-emerald-400/80">{c?.unit_code}</p>
                {(c?.address || c?.city) && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-400">
                    <MapPin className="mt-px h-3.5 w-3.5 shrink-0" />
                    <span className="line-clamp-2">
                      {[c?.address, c?.city, c?.state, c?.pincode].filter(Boolean).join(', ')}
                    </span>
                  </p>
                )}
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span>GSTIN {c?.gstn || <span className="text-slate-600">not on record</span>}</span>
                  <span className="text-slate-700">·</span>
                  <span>PAN {c?.pan_card || <span className="text-slate-600">—</span>}</span>
                  {panVerified && (
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                      PAN verified
                    </span>
                  )}
                  <span className="text-slate-700">·</span>
                  <span>
                    Bill series <span className="font-mono text-slate-400">{c?.bill_no_prefix}</span>
                    <span className="text-slate-600"> #{c?.bill_seq ?? 0}</span>
                  </span>
                </p>

                {/* Carried over from the drawer this replaced — losing them
                    would be a regression dressed as a redesign. */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {!panVerified && c?.pan_card && (
                    <button
                      onClick={verifyPan}
                      disabled={busy === 'pan'}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-[11px]
                                 font-semibold text-slate-300 transition hover:bg-white/8 disabled:opacity-50"
                    >
                      {busy === 'pan' && <Loader2 className="h-3 w-3 animate-spin" />}
                      Verify PAN
                    </button>
                  )}
                  <button
                    onClick={generateBill}
                    disabled={busy === 'bill'}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-[11px]
                               font-semibold text-slate-300 transition hover:bg-white/8 disabled:opacity-50"
                  >
                    {busy === 'bill' && <Loader2 className="h-3 w-3 animate-spin" />}
                    Generate next bill no.
                  </button>
                  {lastBill && (
                    <span className="font-mono text-[11px] text-emerald-400">{lastBill}</span>
                  )}
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/8 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* One picker for every grid below — the question is about the month. */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/8 bg-white/[0.02] px-6 py-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => step(-1)}
              className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/8 hover:text-white"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[140px] text-center text-sm font-semibold text-white">
              {MONTHS[month - 1]} {year}
            </span>
            <button
              onClick={() => step(1)}
              className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/8 hover:text-white"
              aria-label="Next month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
          </div>
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Users className="h-3.5 w-3.5" />
            {data?.staff_active ?? 0} placed
            {data && data.staff_total > data.staff_active && (
              <span className="text-slate-600">of {data.staff_total} ever</span>
            )}
          </span>
        </div>

        <div className="grow overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Who works here, and the shape of their month */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Staff placed here
            </h3>

            {!staff.length && !loading ? (
              <p className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-500">
                Nobody is placed with this client right now.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {staff.map((s) => (
                  <div key={s.placement_id} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{s.staff_name}</p>
                        <p className="font-mono text-[10px] text-slate-500">{s.staff_code}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                          s.placement_type === 'TEMPORARY'
                            ? 'border-amber-500/25 bg-amber-500/10 text-amber-400'
                            : 'border-white/12 bg-white/5 text-slate-300'
                        }`}
                      >
                        {s.placement_type === 'TEMPORARY' ? 'Hourly' : 'Permanent'}
                      </span>
                    </div>

                    <p className="mb-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                      {s.placement_type === 'TEMPORARY' ? (
                        <>
                          <Clock className="h-3 w-3" />
                          {fmtRs(s.hourly_rate)}/hr
                          <span className="text-slate-600">·</span>
                          {s.hours_worked} hrs this month
                        </>
                      ) : (
                        <>
                          <CalendarDays className="h-3 w-3" />
                          {fmtRs(s.staff_salary)}/mo
                          <span className="text-slate-600">·</span>
                          {s.shift_hours ?? 8}h shift
                        </>
                      )}
                      {s.status === 'TRIAL' && (
                        <span className="ml-auto rounded bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-sky-400">
                          On trial
                        </span>
                      )}
                    </p>

                    <AttendanceMonthGrid
                      month={month}
                      year={year}
                      days={s.days}
                      daysInMonth={data?.period?.days_in_month}
                      loading={loading}
                      compact
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Their bills — every month, not only the one on screen, because
              "what do we owe" is rarely about the month you happen to be in. */}
          <section className="mt-6 space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Invoices
            </h3>

            {!invoices.length && !loading ? (
              <p className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-500">
                No invoice has been raised for this client yet.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/8">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/[0.03] text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-2.5 text-left">Invoice</th>
                      <th className="px-4 py-2.5 text-left">Period</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                      <th className="px-4 py-2.5 text-center">Get</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className={`border-b border-white/5 last:border-0 ${
                          inv.period_month === month && inv.period_year === year ? 'bg-emerald-500/[0.04]' : ''
                        }`}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-300">{inv.invoice_number}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">
                          {MONTHS_SHORT[inv.period_month - 1]} {inv.period_year}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-white tabular-nums">
                          {fmtRs(inv.total_amount)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                              STATUS_TONE[inv.status] ?? 'border-slate-400/20 bg-slate-400/10 text-slate-400'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <a
                              href={`/finance/invoices?open=${encodeURIComponent(inv.invoice_number)}`}
                              className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/8 hover:text-white"
                              title="Open in Invoices"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </a>
                            <button
                              onClick={() => downloadInvoice(inv.id, inv.invoice_number)}
                              disabled={downloading === inv.id}
                              className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/8 hover:text-white disabled:opacity-40"
                              title="Download"
                            >
                              {downloading === inv.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Download className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
