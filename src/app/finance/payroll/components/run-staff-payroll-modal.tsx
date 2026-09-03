'use client';

/**
 * Preview one staff member's salary before it is committed.
 *
 * This lived on the Invoices page, which is how payroll ended up runnable from
 * the invoice screen. Moving it left a gap for a while: the batch button paid
 * everyone at once and there was no way to see what a single person's month
 * came to first. This is that view, on the screen it belongs to.
 *
 * See ONE_STAFF_MODEL_PLAN.md §F6.
 */

import React, { useCallback, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, Search, User, Calculator, X, ChevronRight,
  Receipt, Eye, CheckCircle2, AlertTriangle, RefreshCw, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n));
}
function fmtRs(n: number | string) { return `₹${fmt(n)}`; }

interface Calc {
  grossSalary: number;
  esicEmployee: number;
  esicEmployer: number;
  pfEmployee: number;
  pfEmployer: number;
  netSalary: number;
  managementFee: number;
  gstOnFee: number;
  clientTotalCharge: number;
  /** BILL_OF_SUPPLY when the supplier has no GSTIN — then gstOnFee is 0. */
  documentType?: 'TAX_INVOICE' | 'BILL_OF_SUPPLY';
  gstNote?: string;
  ratesUsed?: {
    pfEmployeePct: number; pfEmployerPct: number; pfCeiling: number;
    esicEmployeePct: number; esicEmployerPct: number; gstPct: number;
  };
}

export function RunStaffPayrollModal({
  onClose,
  onGenerated,
}: {
  onClose: () => void;
  onGenerated: () => void;
}) {
  const now = new Date();
  const [step, setStep] = useState<'lookup' | 'preview' | 'done'>('lookup');
  const [empCode, setEmpCode] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [lookup, setLookup] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [invoiceNo, setInvoiceNo] = useState<string | null>(null);
  const [notInvoiced, setNotInvoiced] = useState<string | null>(null);
  /** Set only when the run covered more than one client. */
  const [runs, setRuns] = useState<any[] | null>(null);

  const [lookupLoading, setLookupLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);
  const code = empCode.trim();

  const handleLookup = useCallback(async () => {
    if (!code) { setError('Enter a staff code'); return; }
    setError(null);
    setLookupLoading(true);
    setLookup(null);
    setPreview(null);
    try {
      const res = await api.lookupFinanceStaffByCode(code);
      const data = (res as any)?.data ?? res;
      setLookup(data);
      // Auto-preview
      await doPreview(code, month, year, setPreview, setError);
      setStep('preview');
    } catch (e: any) {
      setError(e.message ?? 'Staff not found');
    } finally {
      setLookupLoading(false);
    }
  }, [code, month, year]);

  async function doPreview(
    c: string, m: number, y: number,
    setP: (v: any) => void, setE: (v: string | null) => void,
  ) {
    setPreviewLoading(true);
    try {
      const res = await api.previewFinanceAttendancePayroll(c, m, y);
      const data = (res as any)?.data ?? res;
      setP(data);
      if (data.invoice_id) {
        setInvoiceId(data.invoice_id);
        setInvoiceNo(data.invoice_number ?? null);
      } else {
        setInvoiceId(null);
        setInvoiceNo(null);
      }
    } catch (e: any) {
      setE(e.message ?? 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  }

  const handlePreview = useCallback(async () => {
    if (!code) return;
    setError(null);
    await doPreview(code, month, year, setPreview, setError);
  }, [code, month, year]);

  const handleGenerate = useCallback(async () => {
    if (!code) return;
    setError(null);
    setGenerateLoading(true);
    try {
      const res = await api.generateFinanceAttendancePayroll(code, month, year);
      const data = (res as any)?.data ?? res;
      // Payroll returns no invoice — billing is raised separately, from the
      // client's unit code on the Invoices screen.
      setRuns(Array.isArray(data.runs) && data.runs.length > 1 ? data.runs : null);
      setStep('done');
      onGenerated();
    } catch (e: any) {
      setError(e.message ?? 'Could not run payroll');
    } finally {
      setGenerateLoading(false);
    }
  }, [code, month, year]);

  const calc = preview?.calculation as Calc | undefined;
  const alreadyGenerated = !!preview?.invoice_id || !!preview?.payroll_id || !!invoiceId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      {/*
        max-h + flex column so the salary slip scrolls inside the modal instead
        of being clipped by `overflow-hidden`. On a laptop screen the preview
        runs past the fold, and the total — the number you actually came to
        read — was the part being cut off.
      */}
      <div className="bg-[#0d1526] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
      {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Run Payroll for One Staff Member</h2>
              <p className="text-slate-500 text-xs">
                Attendance → payroll. The client&apos;s invoice is raised separately, from their unit code.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-slate-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto grow">
          {/* Step 1: Lookup */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Staff / Employee Code
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  id="input-staff-code"
                  value={empCode}
                  onChange={(e) => { setEmpCode(e.target.value); setLookup(null); setPreview(null); setStep('lookup'); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  placeholder="e.g. HG-2025-001 or SC-001"
                  className="w-full bg-[#131c2e] border border-white/10 text-white text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-600"
                />
              </div>
              <button
                id="btn-lookup-staff"
                onClick={handleLookup}
                disabled={!code || lookupLoading}
                className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium disabled:opacity-50 transition flex items-center gap-2"
              >
                {lookupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Lookup
              </button>
            </div>
          </div>

          {/* Month / Year */}
          {step !== 'done' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Month</label>
                <SelectMenu
                  value={String(month)}
                  onValueChange={(v) => { setMonth(Number(v)); setPreview(null); }}
                  placeholder="Month"
                  className="bg-[#131c2e] border-white/10 text-sm rounded-xl w-full"
                >
                  {MONTHS.map((m, i) => (
                    <SelectMenuItem key={m} value={String(i + 1)}>{m}</SelectMenuItem>
                  ))}
                </SelectMenu>
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Year</label>
                <SelectMenu
                  value={String(year)}
                  onValueChange={(v) => { setYear(Number(v)); setPreview(null); }}
                  placeholder="Year"
                  className="bg-[#131c2e] border-white/10 text-sm rounded-xl w-full"
                >
                  {years.map((y) => (
                    <SelectMenuItem key={y} value={String(y)}>{y}</SelectMenuItem>
                  ))}
                </SelectMenu>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-950/60 border border-red-500/20 rounded-xl">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="text-xs text-red-300">{error}</span>
            </div>
          )}

          {/* Lookup Card */}
          {lookup && (
            <div className="bg-[#131c2e] border border-white/8 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{lookup.staff_name}</p>
                <p className="text-slate-500 text-xs">
                  {lookup.type === 'PLACEMENT' ? `EOR · ${lookup.client_name ?? 'No client'}` : `Internal · ${lookup.department ?? 'HR'}`}
                  {lookup.monthly_salary ? ` · ${fmtRs(lookup.monthly_salary)}/mo` : ''}
                </p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${lookup.type === 'PLACEMENT' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-blue-400 bg-blue-400/10 border-blue-400/20'}`}>
                {lookup.type}
              </span>
            </div>
          )}

          {/* Preview Loading */}
          {previewLoading && (
            <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading salary slip preview…</span>
            </div>
          )}

          {/* Salary Slip Preview */}
          {preview && !previewLoading && step !== 'done' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" />
                  Salary Slip — {MONTHS[preview.period_month - 1]} {preview.period_year}
                </span>
                <button
                  onClick={handlePreview}
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>

              {/*
                A staff member working several houses is run for all of them in
                one press, so the preview has to name them. Showing one house's
                figures and then billing three is worse than no preview at all.
              */}
              {Array.isArray(preview.placements) && preview.placements.length > 1 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
                  <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-amber-400 border-b border-amber-500/15">
                    Works at {preview.placements.length} clients — all are run together
                  </p>
                  {preview.placements.map((p: any) => (
                    <div key={p.placement_id} className="px-4 py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-white truncate">{p.client_name ?? 'Unknown client'}</p>
                        <p className="text-[10px] text-slate-500">
                          {p.placement_type === 'TEMPORARY'
                            ? `${p.preview?.hours_worked ?? 0} hours`
                            : `${p.preview?.billable_days ?? 0} days`}
                          {p.already_run ? ' · already run' : ''}
                        </p>
                      </div>
                      <span className="text-xs text-white font-semibold tabular-nums shrink-0">
                        {fmtRs(p.preview?.prorated_gross ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-[#131c2e] border border-white/8 rounded-xl overflow-hidden">
                {/* Attendance summary */}
                <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Attendance</span>
                  <span className="text-xs text-white font-medium">
                    {preview.billable_days ?? preview.present_days ?? 0} / {preview.days_in_month} days
                    <span className="text-slate-500 ml-1.5">(billable)</span>
                  </span>
                </div>

                {/* Earnings */}
                <div className="px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Monthly Salary</span>
                  <span className="text-xs text-slate-300">{fmtRs(preview.monthly_salary ?? 0)}</span>
                </div>
                <div className="px-4 py-2 flex items-center justify-between border-b border-white/5">
                  <span className="text-xs text-slate-400">Pro-rated Gross</span>
                  <span className="text-xs text-white font-semibold">{fmtRs(preview.prorated_gross ?? 0)}</span>
                </div>

                {/* Deductions */}
                {calc && (
                  <>
                    <div className="px-4 py-2 flex items-center justify-between">
                      <span className="text-xs text-amber-400/80">ESIC (Employee{calc.ratesUsed ? ` ${calc.ratesUsed.esicEmployeePct}%` : ''})</span>
                      <span className="text-xs text-amber-400">- {fmtRs(calc.esicEmployee)}</span>
                    </div>
                    <div className="px-4 py-2 flex items-center justify-between border-b border-white/5">
                      <span className="text-xs text-amber-400/80">PF (Employee{calc.ratesUsed ? ` ${calc.ratesUsed.pfEmployeePct}%` : ''})</span>
                      <span className="text-xs text-amber-400">- {fmtRs(calc.pfEmployee)}</span>
                    </div>

                    {/* Net Salary */}
                    <div className="px-4 py-2.5 flex items-center justify-between bg-emerald-500/5 border-b border-emerald-500/10">
                      <span className="text-xs text-emerald-400 font-semibold">Net Salary (Staff Receives)</span>
                      <span className="text-sm text-emerald-400 font-bold">{fmtRs(calc.netSalary)}</span>
                    </div>

                    {/* Client charges (EOR only) */}
                    {preview.type === 'PLACEMENT' && (
                      <>
                        <div className="px-4 py-2 flex items-center justify-between">
                          <span className="text-xs text-slate-400">ESIC (Employer{calc.ratesUsed ? ` ${calc.ratesUsed.esicEmployerPct}%` : ''})</span>
                          <span className="text-xs text-slate-300">{fmtRs(calc.esicEmployer)}</span>
                        </div>
                        <div className="px-4 py-2 flex items-center justify-between">
                          <span className="text-xs text-slate-400">PF (Employer{calc.ratesUsed ? ` ${calc.ratesUsed.pfEmployerPct}%` : ''})</span>
                          <span className="text-xs text-slate-300">{fmtRs(calc.pfEmployer)}</span>
                        </div>
                        <div className="px-4 py-2 flex items-center justify-between">
                          <span className="text-xs text-indigo-400/80">Management Fee</span>
                          <span className="text-xs text-indigo-400">{fmtRs(calc.managementFee)}</span>
                        </div>
                        {/*
                          A Bill of Supply carries no GST, so saying "GST on Fee
                          (18%) — ₹0" would read as a mistake. Name the reason
                          instead: the supplier is not registered, and the
                          invoice will not charge it.
                        */}
                        <div className="px-4 py-2 flex items-center justify-between border-b border-white/5">
                          <span className="text-xs text-indigo-400/80">
                            {calc.documentType === 'BILL_OF_SUPPLY'
                              ? 'GST — not charged'
                              : `GST on Fee${calc.ratesUsed ? ` (${calc.ratesUsed.gstPct}%)` : ''}`}
                          </span>
                          <span className="text-xs text-indigo-400">{fmtRs(calc.gstOnFee)}</span>
                        </div>
                        {calc.documentType === 'BILL_OF_SUPPLY' && (
                          <div className="px-4 py-2 border-b border-white/5">
                            <p className="text-[10px] leading-relaxed text-amber-300/80">
                              Issued as a <strong>Bill of Supply</strong> — <code>finance.supplier_gstin</code>{' '}
                              is not set, so no GST is charged. Fill it in and the next
                              invoice becomes a Tax Invoice with GST on the fee only.
                            </p>
                          </div>
                        )}
                        <div className="px-4 py-3 flex items-center justify-between bg-indigo-500/5 border-b border-indigo-500/10">
                          <span className="text-xs text-indigo-300 font-semibold">Total Client Charge</span>
                          <span className="text-sm text-indigo-300 font-bold">{fmtRs(calc.clientTotalCharge)}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Already generated note */}
              {alreadyGenerated && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-950/40 border border-amber-500/20 rounded-xl">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  {/*
                    Keyed off payroll, not the invoice: the duplicate guard the
                    backend enforces is one payroll run per placement per
                    period, since a consolidated invoice covers a whole client.
                  */}
                  <span className="text-xs text-amber-300">
                    Payroll has already been run for this person in this period.
                    {preview.invoice_number ? (
                      <> It is on the client&apos;s invoice <strong>{preview.invoice_number}</strong>.</>
                    ) : null}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Done state */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              {/*
                Payroll no longer issues an invoice. It works out what is owed;
                billing is a separate, deliberate act on the Invoices screen,
                so nothing goes out to a client as a side effect of this button.
              */}
              <div className="text-center">
                <p className="text-white font-semibold">Payroll recorded</p>

                {/* Several houses in one press — say which. */}
                {runs && (
                  <div className="mt-2 w-full max-w-sm rounded-xl border border-white/10 overflow-hidden text-left">
                    {runs.map((r: any) => (
                      <div key={r.placement_id} className="px-4 py-2 border-b border-white/5 last:border-b-0">
                        <p className="text-xs text-white">{r.client_name ?? 'Unknown client'}</p>
                        <p className="text-[10px] text-slate-500">
                          {r.placement_type === 'TEMPORARY' ? 'hourly' : 'permanent'} · ready to bill
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 max-w-sm rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-left">
                  <p className="text-slate-300 text-xs">
                    No invoice has been raised. Open <strong className="text-white">Invoices</strong>,
                    enter the client&apos;s unit code and press{' '}
                    <strong className="text-white">Create invoice</strong> — it arrives as a draft
                    for you to check before it goes anywhere.
                  </p>
                  <Link
                    href="/finance/invoices"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                  >
                    Go to Invoices
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/8 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition border border-white/8"
          >
            {step === 'done' ? 'Close' : 'Cancel'}
          </button>

          {step === 'preview' && preview && !alreadyGenerated && (
            <button
              id="btn-generate-invoice"
              onClick={handleGenerate}
              disabled={generateLoading || !preview || preview.billable_days === 0 || preview.present_days === 0}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 transition flex items-center gap-2"
            >
              {generateLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
              Run Payroll
            </button>
          )}

          {step === 'lookup' && lookup && (
            <button
              id="btn-preview-salary-slip"
              onClick={handlePreview}
              disabled={previewLoading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50 transition flex items-center gap-2"
            >
              {previewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
              Preview Salary Slip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}