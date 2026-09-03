'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import {
  Loader2, Search, MapPin, Clock, CalendarDays, FileText,
  ArrowRight, AlertCircle, CheckCircle2,
} from 'lucide-react';

/**
 * Find a client by the code Finance knows them by, then bill them.
 *
 * Issuing an invoice used to mean picking a customer out of a dropdown and
 * hoping it was the right one. Finance identifies a client by their unit code,
 * so that is the way in: type the code, see who it is, see who is working there
 * this period — permanent and hourly shown apart, because they are billed on
 * different things — and issue from the same screen.
 *
 * See docs/HOURLY_MULTI_CLIENT_PLAN.md §F1.
 */

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n));
}
const fmtRs = (n: number | string) => `₹${fmt(n)}`;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface PlacementRow {
  id: string;
  placement_type: 'PERMANENT' | 'TEMPORARY';
  status: string;
  staff_name: string;
  staff_code: string;
  staff_salary: string | null;
  management_fee: string | null;
  hourly_rate: string | null;
  hourly_fee: string | null;
  shift_hours: number | null;
  days_this_period: number;
  hours_this_period: number;
  payroll_run: boolean;
  invoiced: boolean;
}

interface Lookup {
  customer: {
    id: string; customer_name: string; unit_code: string; gstn: string | null;
    address: string | null; city: string | null; state: string | null;
  };
  period: { month: number; year: number };
  placements: PlacementRow[];
  existing_invoice: { id: string; invoice_number: string; status: string; total_amount: string } | null;
  un_invoiced: { staff_count: number; salary_total: number };
}

/** One line per person working here — what they did, and what it is worth. */
function PlacementLine({ p }: { p: PlacementRow }) {
  const hourly = p.placement_type === 'TEMPORARY';
  const rate = parseFloat(p.hourly_rate ?? '0');
  const worked = hourly ? p.hours_this_period : p.days_this_period;
  const earned = hourly ? worked * rate : null;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-white/5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm text-white truncate">{p.staff_name}</p>
        <p className="text-[10px] text-slate-500 font-mono">{p.staff_code}</p>
      </div>

      <div className="flex items-center gap-5 shrink-0">
        {/* The arithmetic, in the open. A client should never have to take a
            total on trust. */}
        <div className="text-right tabular-nums">
          {hourly ? (
            <>
              <p className="text-sm text-white">
                {fmt(worked)} <span className="text-slate-500">hrs</span>
                <span className="text-slate-600 mx-1.5">×</span>
                <span className="text-slate-400">{fmtRs(rate)}</span>
              </p>
              <p className="text-[10px] text-amber-400/80">= {fmtRs(earned ?? 0)}</p>
            </>
          ) : (
            <>
              <p className="text-sm text-white">
                {worked} <span className="text-slate-500">days worked</span>
              </p>
              <p className="text-[10px] text-slate-500">
                {fmtRs(p.staff_salary ?? 0)}/month · {p.shift_hours ?? 8}h shift
              </p>
            </>
          )}
        </div>

        <div className="w-24 text-right">
          {p.invoiced ? (
            <span className="text-[10px] font-semibold text-emerald-400">On invoice</span>
          ) : p.payroll_run ? (
            <span className="text-[10px] font-semibold text-amber-400">Payroll run</span>
          ) : (
            <span className="text-[10px] text-slate-500">Not run yet</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClientLookup({
  onIssued,
  onViewInvoice,
}: {
  /** Fires after an invoice is created, so the list behind can refresh. */
  onIssued: (msg: string) => void;
  /** Opens the invoice in the page's own detail view. */
  onViewInvoice: (id: string) => void;
}) {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [code, setCode]     = useState('');
  const [month, setMonth]   = useState(lastMonth.getMonth() + 1);
  const [year, setYear]     = useState(lastMonth.getFullYear());
  const [data, setData]     = useState<Lookup | null>(null);
  const [busy, setBusy]     = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const lookup = async (m = month, y = year) => {
    if (!code.trim()) { setError('Enter a unit code'); return; }
    setBusy(true); setError(null);
    try {
      const res: any = await api.getClientByUnitCode(code.trim(), m, y);
      setData(res?.data ?? res);
    } catch (e: any) {
      setData(null);
      setError(e?.response?.data?.message ?? e.message ?? 'Lookup failed');
    } finally {
      setBusy(false);
    }
  };

  // Changing the period re-asks rather than showing last month's numbers under
  // this month's heading.
  const changePeriod = (m: number, y: number) => {
    setMonth(m); setYear(y);
    if (data) lookup(m, y);
  };

  const issue = async () => {
    if (!data) return;
    setIssuing(true); setError(null);
    try {
      const res: any = await api.generateConsolidatedInvoice(data.customer.id, month, year);
      const out = res?.data ?? res;
      const inv = out?.invoice ?? out;
      onIssued(
        out?.amended
          ? `${inv?.invoice_number} updated — new work folded into the open draft`
          : `${inv?.invoice_number} created for ${data.customer.customer_name}`,
      );
      await lookup();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message ?? 'Could not issue the invoice');
    } finally {
      setIssuing(false);
    }
  };

  const permanent = (data?.placements ?? []).filter((p) => p.placement_type === 'PERMANENT');
  const temporary = (data?.placements ?? []).filter((p) => p.placement_type === 'TEMPORARY');
  const canIssue  = (data?.un_invoiced.staff_count ?? 0) > 0;

  return (
    <div className="rounded-2xl border border-white/8 bg-[#131c2e] overflow-hidden">
      {/* The way in */}
      <div className="flex items-center gap-3 flex-wrap px-5 py-4 border-b border-white/5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            id="input-unit-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') lookup(); }}
            placeholder="Client unit code — e.g. JOURNEY-UNIT-01"
            className="w-full bg-[#0f172a] border border-white/10 text-white text-sm rounded-xl pl-9 pr-4 py-2.5 font-mono tracking-wide
                       placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <select
          id="select-lookup-month"
          value={month}
          onChange={(e) => changePeriod(parseInt(e.target.value, 10), year)}
          className="bg-[#0f172a] border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select
          id="select-lookup-year"
          value={year}
          onChange={(e) => changePeriod(month, parseInt(e.target.value, 10))}
          className="bg-[#0f172a] border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {[now.getFullYear(), now.getFullYear() - 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <button
          id="btn-lookup-client"
          onClick={() => lookup()}
          disabled={busy}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold
                     disabled:opacity-50 transition flex items-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Find client
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-5 py-3 text-sm text-red-300 bg-red-500/5 border-b border-red-500/15">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {!data && !error && (
        <p className="px-5 py-6 text-sm text-slate-500">
          Type a client&apos;s unit code to see who is placed with them this period and issue their invoice.
        </p>
      )}

      {data && (
        <div>
          {/* Who they are */}
          <div className="flex items-start justify-between gap-6 flex-wrap px-5 py-4 bg-white/2">
            <div>
              <h3 className="text-lg font-bold text-white">{data.customer.customer_name}</h3>
              <p className="text-xs font-mono text-emerald-400/80 mt-0.5">{data.customer.unit_code}</p>
              {(data.customer.address || data.customer.city) && (
                <p className="flex items-start gap-1.5 text-xs text-slate-400 mt-2 max-w-md">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-px" />
                  {[data.customer.address, data.customer.city, data.customer.state]
                    .filter(Boolean).join(', ')}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                GSTIN {data.customer.gstn ?? <span className="text-slate-600">not on record</span>}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Billing period</p>
              <p className="text-white font-semibold">{MONTHS[month - 1]} {year}</p>
              <p className="text-xs text-slate-400 mt-2">
                {permanent.length} permanent · {temporary.length} hourly
              </p>
            </div>
          </div>

          {/* Who works here */}
          {data.placements.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              Nobody is placed with this client right now.
            </p>
          ) : (
            <div className="px-5 py-4 space-y-4">
              {permanent.length > 0 && (
                <div className="rounded-xl border border-white/8 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/3 border-b border-white/5">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      Permanent — the full shift, billed monthly
                    </span>
                  </div>
                  {permanent.map((p) => <PlacementLine key={p.id} p={p} />)}
                </div>
              )}

              {temporary.length > 0 && (
                <div className="rounded-xl border border-amber-500/15 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 border-b border-amber-500/15">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] uppercase tracking-wider text-amber-400/90 font-semibold">
                      Hourly — billed on hours worked here
                    </span>
                  </div>
                  {temporary.map((p) => <PlacementLine key={p.id} p={p} />)}
                </div>
              )}
            </div>
          )}

          {/* What happens next */}
          <div className="flex items-center justify-between gap-4 flex-wrap px-5 py-4 border-t border-white/5 bg-[#0f172a]">
            <div className="text-sm">
              {data.existing_invoice ? (
                <p className="flex items-center gap-2 text-slate-300">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="font-mono text-xs">{data.existing_invoice.invoice_number}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-xs uppercase font-semibold text-slate-400">
                    {data.existing_invoice.status}
                  </span>
                  <span className="text-white font-bold">{fmtRs(data.existing_invoice.total_amount)}</span>
                </p>
              ) : (
                <p className="text-slate-500">No invoice for this period yet.</p>
              )}

              {canIssue && (
                <p className="text-xs text-amber-400/90 mt-1">
                  {data.un_invoiced.staff_count} staff · {fmtRs(data.un_invoiced.salary_total)} salary
                  {data.existing_invoice ? ' not yet on this invoice' : ' ready to bill'}
                </p>
              )}
              {!canIssue && !data.existing_invoice && (
                <p className="text-xs text-slate-500 mt-1">
                  Run payroll for this period first — an invoice bills what payroll has computed.
                </p>
              )}
            </div>

            {/* When there is nothing to bill, the useful button is the one that
                gets there: payroll, for someone actually placed here. */}
            {!canIssue && !data.existing_invoice && data.placements.length > 0 ? (
              <Link
                href="/finance/payroll"
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10
                           text-slate-200 text-sm font-semibold transition flex items-center gap-2"
              >
                Go to Payroll
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : !canIssue && data.existing_invoice ? (
              /* Fully billed. The only thing left to do here is look at it —
                 a greyed-out "Add to this invoice" is not an action. */
              <button
                id="btn-view-invoice-from-lookup"
                onClick={() => onViewInvoice(data.existing_invoice!.id)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10
                           text-slate-200 text-sm font-semibold transition flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                View invoice
              </button>
            ) : (
              <button
                id="btn-issue-from-lookup"
                onClick={issue}
                disabled={issuing || !canIssue}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold
                           disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                {issuing
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : data.existing_invoice ? <CheckCircle2 className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                {data.existing_invoice ? 'Add to this invoice' : 'Create invoice'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
