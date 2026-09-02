'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, FileText, CheckCircle2, Send, Search,
  AlertTriangle, RefreshCw, Eye, Download, DollarSign, IndianRupee,
  User, Calculator, X, ChevronRight, Receipt,
} from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import { BASE_URL, tokenStore } from '@/lib/api/client';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n));
}
function fmtRs(n: number | string) { return `₹${fmt(n)}`; }

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Mirrors the server's state machine (common/finance/invoice-status.ts).
// 'PENDING' is gone — a freshly generated invoice is a DRAFT nobody has
// approved yet. See F-12.
const STATUS_TABS = [
  { id: '',               label: 'All' },
  { id: 'DRAFT',          label: 'Draft' },
  { id: 'APPROVED',       label: 'Approved' },
  { id: 'SENT',           label: 'Sent' },
  // "Part paid" is deliberately absent: PARTIALLY_PAID exists in the status
  // machine but nothing ever sets it, so the tab was always empty and read as
  // a broken filter. Recording a payment marks an invoice PAID.
  { id: 'PAID',           label: 'Paid' },
  { id: 'OVERDUE',        label: 'Overdue' },
  { id: 'CREDIT_NOTE',    label: 'Credit Note' },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT:          'text-slate-300 bg-white/5 border-white/15',
  APPROVED:       'text-blue-400 bg-blue-400/10 border-blue-400/20',
  SENT:           'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  PARTIALLY_PAID: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  PAID:           'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  OVERDUE:        'text-red-400 bg-red-400/10 border-red-400/20',
  CREDIT_NOTE:    'text-slate-400 bg-slate-400/10 border-slate-400/20',
  CANCELLED:      'text-slate-500 bg-slate-500/10 border-slate-500/20',
};

/**
 * What each status can become, matching the server. Buttons the API would
 * reject are not shown at all — clicking into a 400 is not a UI.
 */
const ALLOWED_NEXT: Record<string, string[]> = {
  DRAFT:          ['APPROVED'],
  APPROVED:       ['SENT'],
  SENT:           ['PAID', 'CREDIT_NOTE'],
  PARTIALLY_PAID: ['PAID', 'CREDIT_NOTE'],
  OVERDUE:        ['PAID', 'CREDIT_NOTE'],
  PAID:           [],
  CREDIT_NOTE:    [],
  CANCELLED:      [],
};
const canGo = (from: string, to: string) => (ALLOWED_NEXT[from] ?? []).includes(to);

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${cls}`}>
      {status}
    </span>
  );
}

interface LineItem { description: string; amount: number; gst_applicable: boolean; }
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

// ── Generate Invoice Modal ────────────────────────────────────────────────────
function GenerateInvoiceModal({
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
      setInvoiceId(data.invoice_id ?? null);
      setInvoiceNo(data.invoice_number ?? null);
      setStep('done');
      onGenerated();
    } catch (e: any) {
      setError(e.message ?? 'Invoice generation failed');
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
                Attendance → payroll → added to their client&apos;s invoice for the month
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
                The invoice number shown is the *client's* invoice for the
                month, which this staff member has just been added to — it is
                not an invoice for this person alone. See §F3.
              */}
              <div className="text-center">
                <p className="text-white font-semibold">Payroll recorded</p>
                {invoiceNo ? (
                  <p className="text-slate-400 text-sm mt-1">
                    Added to the client&apos;s invoice{' '}
                    <strong className="text-white">{invoiceNo}</strong> for this month.
                  </p>
                ) : (
                  <p className="text-slate-400 text-sm mt-1 max-w-xs">
                    The client&apos;s invoice was not updated — it may already have been
                    sent. Check Month-end Invoicing.
                  </p>
                )}
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const [status, setStatus]         = useState('');
  const [invoices, setInvoices]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState('');
  const [actioning, setActioning]   = useState<string | null>(null);
  // Credit notes are real documents now, so issuing one needs a reason and
  // optionally an amount — a dispute is usually about part of an invoice. (F-18)
  const [creditFor, setCreditFor]     = useState<any | null>(null);
  const [settleFor, setSettleFor]     = useState<any | null>(null);
  const [settleRef, setSettleRef]     = useState('');
  const [pending, setPending]         = useState<any[]>([]);
  const [pendingPeriod, setPendingPeriod] = useState({ month: 1, year: 2026 });
  const [issuing, setIssuing]         = useState<string | null>(null);
  const [creditReason, setCreditReason] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditPartial, setCreditPartial] = useState(false);
  const [crediting, setCrediting]     = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selected, setSelected]     = useState<any | null>(null);
  const [toast, setToast]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getFinanceInvoices({ status: status || undefined });
      const items = res?.data ?? res;
      setInvoices(Array.isArray(items) ? items : []);
    } catch (e: any) {
      showToast('error', e.message ?? 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clients whose staff were paid but whose invoice never got made.
   *
   * Payroll issues the invoice itself, so this is normally empty — it fills
   * only when the invoice could not be touched, usually because it had already
   * been sent. That used to be a whole separate "Month-end Invoicing" page,
   * which meant the one thing you could not see from the invoice list was the
   * invoice that does not exist yet. It belongs here, in the way.
   */
  const loadPending = useCallback(async () => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    try {
      const res: any = await api.getConsolidatedPending(prev.getMonth() + 1, prev.getFullYear());
      const items = res?.data ?? res;
      setPending(Array.isArray(items) ? items : []);
      setPendingPeriod({ month: prev.getMonth() + 1, year: prev.getFullYear() });
    } catch {
      setPending([]);
    }
  }, []);

  const handleIssuePending = async (customerId: string, name: string) => {
    setIssuing(customerId);
    try {
      await api.generateConsolidatedInvoice(customerId, pendingPeriod.month, pendingPeriod.year);
      showToast('success', `Invoice issued for ${name}`);
      await Promise.all([load(), loadPending()]);
    } catch (e: any) {
      showToast('error', e.message ?? `Could not issue an invoice for ${name}`);
    } finally {
      setIssuing(null);
    }
  };

  useEffect(() => { load(); }, [status]);
  useEffect(() => { loadPending(); }, [loadPending]);

  const handleApprove = async (id: string) => {
    setActioning(id + '_approve');
    try {
      await api.approveFinanceInvoice(id);
      showToast('success', 'Invoice approved');
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Approval failed');
    } finally {
      setActioning(null);
    }
  };

  const handleSend = async (id: string) => {
    setActioning(id + '_send');
    try {
      await api.sendFinanceInvoice(id);
      showToast('success', 'Invoice sent to client');
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Send failed');
    } finally {
      setActioning(null);
    }
  };

  const handleMarkSettled = async () => {
    if (!settleFor) return;
    if (!settleRef.trim()) { showToast('error', 'A payment reference is required'); return; }
    setActioning(settleFor.id + '_settle');
    try {
      await api.markSettled(settleFor.id, settleRef.trim());
      showToast('success', `${settleFor.invoice_number} marked paid`);
      setSettleFor(null);
      setSettleRef('');
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Could not record the payment');
    } finally {
      setActioning(null);
    }
  };

  const handleIssueCreditNote = async () => {
    if (!creditFor) return;
    if (!creditReason.trim()) { showToast('error', 'A reason is required'); return; }
    if (creditPartial && !(Number(creditAmount) > 0)) {
      showToast('error', 'Enter the amount to credit back'); return;
    }
    setCrediting(true);
    try {
      const res: any = await api.issueCreditNote(
        creditFor.id,
        creditReason.trim(),
        creditPartial ? Number(creditAmount) : undefined,
      );
      const out = res?.data ?? res;
      showToast('success', `Issued ${out?.credit_note_number ?? 'credit note'} for ${fmtRs(out?.credit_amount ?? 0)}`);
      setCreditFor(null); setCreditReason(''); setCreditAmount(''); setCreditPartial(false);
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Could not issue the credit note');
    } finally {
      setCrediting(false);
    }
  };

  const handleGeneratePaymentLink = async (id: string, totalAmount: number | string) => {
    setActioning(id + '_payment_link');
    try {
      const res: any = await api.createInvoicePaymentOrder(id, Number(totalAmount));
      const order = res?.data ?? res;
      // No real Razorpay account is set up yet — this is a simulated order
      // until real credentials exist (order.status === 'simulated' either way
      // tells you which one you got).
      showToast(
        'success',
        order?.status === 'simulated'
          ? `Simulated payment order created (${order.id}) — Razorpay isn't configured yet, this is a placeholder.`
          : `Payment order created: ${order.id}`,
      );
    } catch (e: any) {
      showToast('error', e.message ?? 'Failed to generate payment link');
    } finally {
      setActioning(null);
    }
  };

  const handleDetail = async (id: string) => {
    try {
      const res = await api.getFinanceInvoice(id);
      setSelected(res);
    } catch (e: any) {
      showToast('error', e.message ?? 'Failed to load detail');
    }
  };

  const handleDownload = async (id: string, invoiceNumber: string) => {
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
      a.download = `invoice-${invoiceNumber || id}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      showToast('error', e.message ?? 'Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const filtered = invoices.filter((inv: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.client_name?.toLowerCase().includes(q)
    );
  });

  const isOverdue = (inv: any) =>
    inv.status !== 'PAID' && new Date(inv.due_date) < new Date();

  return (
    <div className="page-padding space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium border
          ${toast.type === 'success' ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300' : 'bg-red-950 border-red-500/30 text-red-300'}`}
        >
          {toast.msg}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">{selected.invoice_number}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-xl">×</button>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Client</span>
                <span className="text-white font-medium">{selected.client_name ?? selected.client_id}</span>
              </div>
              {/* The line items below name every staff member on the invoice. */}
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Staff billed</span>
                <span className="text-white">
                  {selected.staff_name ?? `${selected.staff_count ?? 0} staff`}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Period</span>
                <span className="text-white">{MONTHS_SHORT[selected.period_month - 1]} {selected.period_year}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Due Date</span>
                <span className="text-white">{new Date(selected.due_date).toLocaleDateString('en-IN')}</span>
              </div>
              {selected.line_items?.map((li: LineItem) => (
                <div key={li.description} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <span className="text-slate-300">{li.description}</span>
                    {li.gst_applicable && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded">GST</span>
                    )}
                  </div>
                  <span className="text-white font-medium">{fmtRs(li.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              {canGo(selected.status, 'APPROVED') && (
                <button
                  id={`btn-modal-approve-${selected.id}`}
                  onClick={() => { handleApprove(selected.id); setSelected(null); }}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition"
                >
                  Approve
                </button>
              )}
              {canGo(selected.status, 'SENT') && (
                <button
                  id={`btn-modal-send-${selected.id}`}
                  onClick={() => { handleSend(selected.id); setSelected(null); }}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
                >
                  Send to Client
                </button>
              )}
              {/* A payment link only makes sense once the client has the
                  invoice, and never after it is settled or credit-noted. */}
              {canGo(selected.status, 'CREDIT_NOTE') && (
                <button
                  id={`btn-modal-credit-note-${selected.id}`}
                  onClick={() => { setCreditFor(selected); setSelected(null); }}
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-semibold transition"
                >
                  Credit Note
                </button>
              )}
              {canGo(selected.status, 'PAID') && (
                <button
                  id={`btn-modal-payment-link-${selected.id}`}
                  onClick={() => handleGeneratePaymentLink(selected.id, selected.total_amount)}
                  disabled={actioning === selected.id + '_payment_link'}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition disabled:opacity-50"
                >
                  {actioning === selected.id + '_payment_link' ? 'Generating…' : 'Generate Payment Link'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record payment */}
      {settleFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-white font-bold">Record payment</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  {settleFor.invoice_number} · {fmtRs(settleFor.total_amount)}
                </p>
              </div>
              <button onClick={() => { setSettleFor(null); setSettleRef(''); }} className="text-slate-400 hover:text-white text-xl">×</button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Payment reference
              </label>
              <input
                value={settleRef}
                onChange={(e) => setSettleRef(e.target.value)}
                placeholder="UTR, cheque number, or bank reference"
                className="mt-1.5 w-full rounded-xl bg-[#131c2e] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500/40"
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                Marks the invoice paid in full. There is no partial state — record the
                payment once the whole amount has arrived.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={() => { setSettleFor(null); setSettleRef(''); }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium border border-white/8"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkSettled}
                disabled={actioning === settleFor.id + '_settle'}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold disabled:opacity-50 transition flex items-center gap-2"
              >
                {actioning === settleFor.id + '_settle'
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <IndianRupee className="w-3.5 h-3.5" />}
                Mark paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit note dialog */}
      {creditFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="font-bold text-white text-lg">Issue a credit note</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Against {creditFor.invoice_number} · {fmtRs(creditFor.total_amount)}
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Reason</label>
              <textarea
                id="input-credit-reason"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                rows={2}
                placeholder="Why is this being credited back?"
                className="w-full bg-[#131c2e] border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={creditPartial}
                onChange={(e) => setCreditPartial(e.target.checked)}
                className="rounded"
              />
              Credit only part of this invoice
            </label>

            {creditPartial && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Amount to credit (of {fmtRs(creditFor.total_amount)})
                </label>
                <input
                  id="input-credit-amount"
                  type="number"
                  min="0"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)
                  }
                  className="w-full bg-[#131c2e] border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  GST is reversed in the same proportion. The invoice stays payable for the balance.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setCreditFor(null); setCreditPartial(false); }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-credit-note"
                onClick={handleIssueCreditNote}
                disabled={crediting}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold disabled:opacity-60 transition"
              >
                {crediting ? 'Issuing…' : 'Issue credit note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Client Invoices</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            One invoice per client per month · every staff member placed with them appears as a line item
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/*
            No "Month-end Invoicing" button any more. Payroll issues the
            invoice itself, so that page only ever listed the leftovers — and
            those now appear on this page, in the strip below, where they
            cannot be missed. See ONE_STAFF_MODEL_PLAN.md §F6.
          */}
          <Link
            href="/finance/payroll"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-semibold transition"
          >
            <DollarSign className="w-4 h-4" />
            Payroll
          </Link>
          <button
            id="btn-refresh-invoices"
            onClick={load}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/*
        The invoices that do not exist yet. Shown here because a list of what
        was billed cannot, by itself, tell you what was missed — and a client
        who never receives a bill is the expensive kind of mistake.
      */}
      {pending.length > 0 && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-200">
                {pending.length} client{pending.length === 1 ? '' : 's'} still un-invoiced for{' '}
                {MONTHS_SHORT[pendingPeriod.month - 1]} {pendingPeriod.year}
              </p>
              <p className="text-xs text-amber-300/70 mt-0.5">
                Their staff have been paid, but no invoice was issued — usually because
                that client&apos;s invoice had already been sent.
              </p>
              <div className="mt-3 space-y-2">
                {pending.map((p: any) => (
                  <div
                    key={p.customer_id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">{p.customer_name}</p>
                      <p className="text-[10px] text-slate-400">
                        {p.staff_count} staff · {fmtRs(p.salary_total)} in salaries
                      </p>
                    </div>
                    <button
                      onClick={() => handleIssuePending(p.customer_id, p.customer_name)}
                      disabled={issuing === p.customer_id}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold border border-amber-500/25 disabled:opacity-50 transition"
                    >
                      {issuing === p.customer_id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Receipt className="w-3 h-3" />}
                      Issue invoice
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              id={`tab-inv-${tab.id || 'all'}`}
              onClick={() => setStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition
                ${status === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/8'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            id="search-invoices"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice or client…"
            className="bg-[#131c2e] border border-white/10 text-white text-sm rounded-xl pl-9 pr-4 py-2 w-56 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/8 bg-[#131c2e] overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/8 border border-emerald-500/15 flex items-center justify-center">
              <FileText className="w-6 h-6 text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-slate-300 text-sm font-medium">No invoices found</p>
              <p className="text-slate-500 text-xs mt-1">
                Invoices are issued when payroll runs. Run payroll for the month and each
                client&apos;s invoice appears here.
              </p>
            </div>
            <Link
              href="/finance/payroll"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm font-semibold border border-emerald-500/20 transition"
            >
              <DollarSign className="w-4 h-4" />
              Go to Payroll
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Invoice #</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Staff billed</th>
                  <th className="px-4 py-3 text-center">Period</th>
                  <th className="px-4 py-3 text-right">Salary</th>
                  <th className="px-4 py-3 text-right">Fee + GST</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Due Date</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv: any) => {
                  const overdue = isOverdue(inv);
                  const managementFeeAmt = parseFloat(inv.management_fee ?? 0);
                  const gstAmt = parseFloat(inv.gst_amount ?? 0);
                  const feeGst = managementFeeAmt + gstAmt;
                  // gst_amount/management_fee reverse-derives the rate actually
                  // applied — client_invoices doesn't store gst_pct directly,
                  // and this can differ per placement (RM's wage_config).
                  const gstPct = managementFeeAmt > 0 ? Math.round((gstAmt / managementFeeAmt) * 10000) / 100 : null;
                  return (
                    <tr key={inv.id} className={`border-b border-white/5 hover:bg-white/2 transition ${overdue ? 'bg-red-500/3' : ''}`}>
                      <td className="px-5 py-3 font-mono text-xs text-slate-300">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-white">{inv.client_name ?? inv.client_id?.slice(0, 8)}</td>
                      {/*
                        A consolidated invoice bills a whole client, so it says
                        how many people are on it. Only a legacy per-placement
                        invoice names one person. See §F3.
                      */}
                      <td className="px-4 py-3">
                        {inv.staff_name ? (
                          <>
                            <p className="text-white text-xs">{inv.staff_name}</p>
                            {inv.staff_code && <p className="text-[10px] text-slate-500">{inv.staff_code}</p>}
                          </>
                        ) : (
                          <>
                            <p className="text-white text-xs">
                              {inv.staff_count ?? 0} staff
                            </p>
                            <p className="text-[10px] text-slate-500">on this invoice</p>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-400">{MONTHS_SHORT[inv.period_month - 1]} {inv.period_year}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{fmtRs(inv.staff_salary_component)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-indigo-400">{fmtRs(feeGst)}</span>
                        <span className="text-[10px] text-slate-500 block">{gstPct != null ? `${gstPct}% GST on fee` : 'GST on fee'}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-white font-bold">{fmtRs(inv.total_amount)}</td>
                      <td className="px-4 py-3 text-center text-xs">
                        <span className={overdue ? 'text-red-400 font-semibold' : 'text-slate-400'}>
                          {overdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                          {new Date(inv.due_date).toLocaleDateString('en-IN')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            id={`btn-view-inv-${inv.id}`}
                            onClick={() => handleDetail(inv.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                            title="View line items"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-download-inv-${inv.id}`}
                            onClick={() => handleDownload(inv.id, inv.invoice_number)}
                            disabled={downloading === inv.id}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition disabled:opacity-50"
                            title="Download invoice"
                          >
                            {downloading === inv.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Download className="w-3.5 h-3.5" />
                            }
                          </button>
                          {canGo(inv.status, 'APPROVED') && (
                            <button
                              id={`btn-approve-inv-${inv.id}`}
                              onClick={() => handleApprove(inv.id)}
                              disabled={actioning === inv.id + '_approve'}
                              className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition border border-blue-500/20 disabled:opacity-50"
                              title="Approve"
                            >
                              {actioning === inv.id + '_approve'
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <CheckCircle2 className="w-3.5 h-3.5" />
                              }
                            </button>
                          )}
                          {canGo(inv.status, 'SENT') && (
                            <button
                              id={`btn-send-inv-${inv.id}`}
                              onClick={() => handleSend(inv.id)}
                              disabled={actioning === inv.id + '_send'}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition border border-emerald-500/20 disabled:opacity-50"
                              title="Send to client"
                            >
                              {actioning === inv.id + '_send'
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Send className="w-3.5 h-3.5" />
                              }
                            </button>
                          )}
                          {/*
                            Recording payment lived only on a separate
                            Settlements page, so the invoice's own row could
                            take it from Draft to Sent and then stop. The whole
                            life of an invoice belongs in one place.
                          */}
                          {canGo(inv.status, 'PAID') && (
                            <button
                              id={`btn-settle-inv-${inv.id}`}
                              onClick={() => setSettleFor(inv)}
                              className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 transition border border-teal-500/20"
                              title="Record payment"
                            >
                              <IndianRupee className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
