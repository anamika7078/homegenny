'use client';

/**
 * HR's salary slips for a month.
 *
 * This page used to run payroll itself, through the HR engine that is now
 * retired — which meant two places could pay the same person from two
 * different attendance ledgers. Payroll is a Finance action and happens once,
 * on the Finance → Payroll screen. What HR needs is the result, and that is
 * what this shows.
 *
 * The rows come from `payroll_records`, the single payroll engine, so this
 * list and the client's invoice are built from the same numbers and cannot
 * disagree. See ONE_STAFF_MODEL_PLAN.md §B6.
 */

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { Loader2, FileText, RefreshCw, AlertCircle, Download, Receipt, Eye } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function fmtRs(n: number | string) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n ?? 0))}`;
}

interface Slip {
  ref: string;
  employeeId: string | null;
  employeeCode: string | null;
  staffName: string | null;
  department: string | null;
  presentDays: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  status: string;
  invoiced: boolean;
  /**
   * The houses this month's pay came from, when it came from several. A maid
   * working three clients is paid once, so she is one row here — this is what
   * the one figure is made of.
   */
  clients?: {
    clientName: string;
    placementType: 'PERMANENT' | 'TEMPORARY';
    worked: string;
    grossSalary: number;
    invoiced: boolean;
  }[];
}

export default function HrSalarySlipsPage() {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [month, setMonth] = useState(prev.getMonth() + 1);
  const [year, setYear] = useState(prev.getFullYear());
  const [rows, setRows] = useState<Slip[]>([]);
  const [preview, setPreview] = useState<{ slip: Slip; url: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.listPayslipsForPeriod(month, year);
      const items = res?.data?.items ?? res?.items ?? [];
      setRows(Array.isArray(items) ? items : []);
    } catch (e) {
      setError((e as Error)?.message || 'Could not load salary slips.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const totals = rows.reduce(
    (a, r) => ({
      gross: a.gross + Number(r.grossSalary || 0),
      deductions: a.deductions + Number(r.totalDeductions || 0),
      net: a.net + Number(r.netSalary || 0),
    }),
    { gross: 0, deductions: 0, net: 0 },
  );

  /**
   * The blob came back and was thrown away — nothing was ever handed to the
   * browser, so the button looked broken while the server was doing its job
   * perfectly. Both actions go through here now.
   */
  const fetchSlip = async (r: Slip) => {
    const blob = await api.downloadEmployeePayslip(r.employeeId as string, r.ref);
    return URL.createObjectURL(blob);
  };

  const download = async (r: Slip) => {
    if (!r.employeeId) return;
    setBusy(r.ref);
    try {
      const url = await fetchSlip(r);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${r.employeeCode ?? r.employeeId}-${month}-${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error)?.message || 'Could not download that payslip.');
    } finally {
      setBusy(null);
    }
  };

  /** Read it before saving it — the same PDF, shown in place. */
  const openPreview = async (r: Slip) => {
    if (!r.employeeId) return;
    setBusy(r.ref);
    try {
      setPreview({ slip: r, url: await fetchSlip(r) });
    } catch (e) {
      setError((e as Error)?.message || 'Could not open that payslip.');
    } finally {
      setBusy(null);
    }
  };

  const closePreview = () => {
    // The blob stays in memory until it is let go.
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="page-padding space-y-6">
      {/* The payslip itself, read before it is saved. Same PDF the download
          gives, so what is on screen and what reaches the staff member cannot
          drift apart. */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closePreview}
        >
          <div
            className="flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-3">
              <div>
                <p className="font-semibold text-foreground">{preview.slip.staffName ?? 'Payslip'}</p>
                <p className="text-xs text-secondary-foreground">
                  {preview.slip.employeeCode} · {MONTHS[month - 1]} {year} ·{' '}
                  {preview.slip.presentDays} days · net {fmtRs(preview.slip.netSalary)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => download(preview.slip)}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-muted"
                >
                  <Download className="h-3.5 w-3.5" />
                  Save PDF
                </button>
                <button
                  onClick={closePreview}
                  className="rounded-lg px-2 py-1 text-xl leading-none text-secondary-foreground hover:text-foreground"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>
            <iframe
              src={preview.url}
              title={`Payslip for ${preview.slip.staffName ?? preview.slip.employeeCode}`}
              className="grow bg-white"
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Salary Slips</h1>
          <p className="mt-0.5 text-sm text-secondary-foreground">
            What each staff member is paid for the month. Payroll is run once, by Finance.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
            >
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            onClick={load}
            className="rounded-lg border border-border bg-card p-2 hover:bg-muted"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4 text-secondary-foreground" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <p className="text-xs text-rose-300">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-secondary-foreground">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm">Loading salary slips…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-20 px-6 text-center">
          <FileText className="h-9 w-9 text-secondary-foreground/40" />
          <p className="text-sm font-semibold text-foreground">
            No salary slips for {MONTHS[month - 1]} {year}
          </p>
          <p className="max-w-md text-xs text-secondary-foreground">
            Slips appear here once Finance runs payroll for the month. Nothing has been
            run for this period yet.
          </p>
          <Link
            href="/finance/payroll"
            className="mt-1 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
          >
            Go to Payroll
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            {[
              ['Staff paid', String(rows.length)],
              ['Total gross', fmtRs(totals.gross)],
              ['Deductions', fmtRs(totals.deductions)],
              ['Net paid out', fmtRs(totals.net)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">{label}</p>
                <p className="mt-1 text-lg font-bold text-foreground tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-secondary-foreground">
                  <th className="px-5 py-3 text-left">Staff</th>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-center">Days</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Deductions</th>
                  <th className="px-4 py-3 text-right">Net</th>
                  <th className="px-4 py-3 text-center">Billed</th>
                  <th className="px-4 py-3 text-center">Slip</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.ref} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{r.staffName ?? '—'}</p>
                      {/* One net figure, several houses behind it. Naming them
                          stops the total reading as unexplained. */}
                      {r.clients?.length ? (
                        <p className="text-[11px] text-secondary-foreground mt-0.5">
                          {r.clients.map((c) => `${c.clientName} (${c.worked})`).join(' · ')}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-secondary-foreground">{r.employeeCode ?? '—'}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-secondary-foreground">{r.presentDays}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">{fmtRs(r.grossSalary)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-500">− {fmtRs(r.totalDeductions)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-500">{fmtRs(r.netSalary)}</td>
                    <td className="px-4 py-3 text-center">
                      {/*
                        Whether this person's pay reached the client's invoice.
                        Unbilled means payroll ran but the invoice could not be
                        touched — usually because it had already been sent.
                      */}
                      {r.invoiced ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-500">
                          <Receipt className="h-3 w-3" /> on invoice
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-amber-500">not billed</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openPreview(r)}
                          disabled={!r.employeeId || busy === r.ref}
                          className="rounded-lg border border-border p-1.5 text-secondary-foreground hover:bg-muted disabled:opacity-40"
                          title="Read the payslip"
                        >
                          {busy === r.ref
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => download(r)}
                          disabled={!r.employeeId || busy === r.ref}
                          className="rounded-lg border border-border p-1.5 text-secondary-foreground hover:bg-muted disabled:opacity-40"
                          title="Save the payslip PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
