'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, FileText, CheckCircle2, Send, Search,
  AlertTriangle, RefreshCw, Eye, Download, Plus,
  User, Calculator, X, ChevronRight, Receipt, Layers,
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
  { id: 'PARTIALLY_PAID', label: 'Part paid' },
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
      <div className="bg-[#0d1526] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
      {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Generate Invoice from Salary Slip</h2>
              <p className="text-slate-500 text-xs">Attendance-based payroll → client invoice</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-slate-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
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
                        <div className="px-4 py-2 flex items-center justify-between border-b border-white/5">
                          <span className="text-xs text-indigo-400/80">GST on Fee{calc.ratesUsed ? ` (${calc.ratesUsed.gstPct}%)` : ''}</span>
                          <span className="text-xs text-indigo-400">{fmtRs(calc.gstOnFee)}</span>
                        </div>
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
                  <span className="text-xs text-amber-300">
                    {preview.type === 'EMPLOYEE' ? (
                      <>Payroll record already exists for this period.</>
                    ) : (
                      <>Invoice <strong>{preview.invoice_number}</strong> already exists for this period.</>
                    )}
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
              <div className="text-center">
                <p className="text-white font-semibold">Invoice Generated!</p>
                {invoiceNo && <p className="text-slate-400 text-sm mt-0.5">Invoice # <strong className="text-white">{invoiceNo}</strong></p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/8 flex items-center justify-end gap-3">
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
              Generate Invoice
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
  const [creditReason, setCreditReason] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditPartial, setCreditPartial] = useState(false);
  const [crediting, setCrediting]     = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selected, setSelected]     = useState<any | null>(null);
  const [toast, setToast]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);

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

  useEffect(() => { load(); }, [status]);

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
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">{selected.invoice_number}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-xl">×</button>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Client</span>
                <span className="text-white font-medium">{selected.client_name ?? selected.client_id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Staff</span>
                <span className="text-white">{selected.staff_name ?? '—'}</span>
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

      {/* Generate Invoice Modal */}
      {showGenerate && (
        <GenerateInvoiceModal
          onClose={() => setShowGenerate(false)}
          onGenerated={() => { setShowGenerate(false); load(); showToast('success', 'Invoice generated successfully!'); }}
        />
      )}

      {/* Credit note dialog */}
      {creditFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4">
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
          <h1 className="text-2xl font-bold text-white">Invoice Generation</h1>
          <p className="text-sm text-slate-400 mt-0.5">GST-compliant client invoices · EOR billing</p>
        </div>
        <div className="flex items-center gap-2">
          {/* One invoice per customer per month, rather than one per
              placement — see F-15. */}
          <Link
            href="/finance/invoices/consolidated"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-semibold transition"
          >
            <Layers className="w-4 h-4" />
            Month-end Consolidated
          </Link>
          <button
            id="btn-generate-invoice-open"
            onClick={() => setShowGenerate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            Generate Invoice
          </button>
          <button
            id="btn-refresh-invoices"
            onClick={load}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

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
              <p className="text-slate-500 text-xs mt-1">Generate an invoice from a salary slip to get started</p>
            </div>
            <button
              onClick={() => setShowGenerate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-sm font-semibold border border-emerald-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              Generate First Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Invoice #</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Staff</th>
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
                      <td className="px-4 py-3">
                        <p className="text-white text-xs">{inv.staff_name ?? '—'}</p>
                        {inv.staff_code && <p className="text-[10px] text-slate-500">{inv.staff_code}</p>}
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
