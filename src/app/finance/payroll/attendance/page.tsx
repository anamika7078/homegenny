'use client';

import React, { useCallback, useState } from 'react';
import {
  Calculator, Download, Eye, FileText, Loader2, Search, User,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { InvoiceViewModal } from '@/components/rm/invoice-view-modal';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';
import type { AttendanceInvoicePreview } from '@/lib/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function fmtRs(n: number | string) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n))}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface StaffLookup {
  type: 'PLACEMENT' | 'EMPLOYEE';
  staff_code?: string;
  employee_code?: string;
  staff_name: string;
  monthly_salary: number | null;
  client_name?: string | null;
  department?: string | null;
  placement_status?: string | null;
}

export default function FinanceAttendancePayrollPage() {
  const now = new Date();
  const [empCode, setEmpCode] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [lookup, setLookup] = useState<StaffLookup | null>(null);
  const [preview, setPreview] = useState<AttendanceInvoicePreview | null>(null);
  const [generatedInvoiceId, setGeneratedInvoiceId] = useState<string | null>(null);
  const [generatedInvoiceNo, setGeneratedInvoiceNo] = useState<string | null>(null);

  const [lookupLoading, setLookupLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i);
  const code = empCode.trim();

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLookup = useCallback(async () => {
    if (!code) {
      showToast('error', 'Enter an employee / staff code');
      return;
    }
    setLookupLoading(true);
    setLookup(null);
    setPreview(null);
    setGeneratedInvoiceId(null);
    setGeneratedInvoiceNo(null);
    try {
      const res = await api.lookupFinanceStaffByCode(code);
      const data = (res as { data?: StaffLookup })?.data ?? res;
      setLookup(data as StaffLookup);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Staff not found';
      showToast('error', msg);
    } finally {
      setLookupLoading(false);
    }
  }, [code]);

  const loadPreview = useCallback(async () => {
    if (!code) return;
    setPreviewLoading(true);
    try {
      const res = await api.previewFinanceAttendancePayroll(code, month, year);
      const data = (res as { data?: AttendanceInvoicePreview })?.data ?? res;
      setPreview(data as AttendanceInvoicePreview);
      if ((data as AttendanceInvoicePreview).invoice_id) {
        setGeneratedInvoiceId((data as AttendanceInvoicePreview).invoice_id);
        setGeneratedInvoiceNo((data as { invoice_number?: string }).invoice_number ?? null);
      }
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  }, [code, month, year]);

  const handlePreview = async () => {
    if (!lookup) {
      await handleLookup();
    }
    await loadPreview();
  };

  const handleGenerate = async () => {
    if (!code) return;
    if (!confirm(`Generate payroll invoice for ${code} — ${MONTHS[month - 1]} ${year}?`)) return;
    setGenerateLoading(true);
    try {
      const res = await api.generateFinanceAttendancePayroll(code, month, year);
      const data = (res as { data?: Record<string, unknown> })?.data ?? res;
      if (data.type === 'PLACEMENT') {
        setGeneratedInvoiceId(String(data.invoice_id));
        setGeneratedInvoiceNo(String(data.invoice_number ?? ''));
        showToast('success', `Invoice ${data.invoice_number} generated`);
      } else {
        showToast('success', 'Employee payroll generated');
      }
      if (data.preview) {
        setPreview(data.preview as AttendanceInvoicePreview);
      } else {
        await loadPreview();
      }
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleDownloadPreview = async () => {
    if (!code) return;
    setDownloadLoading(true);
    try {
      const blob = await api.downloadFinanceAttendancePreview(code, month, year);
      downloadBlob(blob, `payroll-${code}-${month}-${year}.html`);
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!generatedInvoiceId) return;
    setDownloadLoading(true);
    try {
      const blob = await api.downloadFinanceInvoice(generatedInvoiceId);
      downloadBlob(blob, `invoice-${generatedInvoiceNo ?? generatedInvoiceId}.html`);
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloadLoading(false);
    }
  };

  const proratedEstimate =
    lookup?.monthly_salary != null
      ? Math.round(lookup.monthly_salary * 100) / 100
      : null;

  return (
    <div className="page-padding space-y-6 max-w-4xl">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium border
            ${toast.type === 'success'
              ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950 border-red-500/30 text-red-300'
            }`}
        >
          {toast.msg}
        </div>
      )}

      {preview && (
        <InvoiceViewModal
          data={preview}
          onClose={() => setPreview(null)}
          title={`Payroll Preview — ${preview.staff_name ?? code}`}
        />
      )}

      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-emerald-500/10 p-2.5">
          <Calculator className="h-6 w-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Attendance Payroll</h1>
          <p className="text-sm text-slate-400">
            Select employee code · auto-calculate salary from attendance · preview, generate &amp; download
          </p>
        </div>
      </div>

      {/* Employee code lookup */}
      <div className="rounded-2xl border border-white/8 bg-[#131c2e] p-5 space-y-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Employee / Staff Code
        </label>
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              id="emp-code-input"
              value={empCode}
              onChange={(e) => {
                setEmpCode(e.target.value);
                setLookup(null);
                setPreview(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              placeholder="e.g. SC-010 or john001"
              className="w-full bg-[#0f172a] border border-white/10 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            id="btn-lookup-staff"
            onClick={handleLookup}
            disabled={lookupLoading || !code}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 transition"
          >
            {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
            Load Staff
          </button>
        </div>

        {lookup && (
          <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
            <InfoCard label="Name" value={lookup.staff_name} />
            <InfoCard label="Code" value={lookup.staff_code ?? lookup.employee_code ?? code} />
            <InfoCard
              label="Type"
              value={lookup.type === 'PLACEMENT' ? 'EOR Deployed Staff' : 'Internal HR Employee'}
            />
            <InfoCard
              label="Monthly Salary"
              value={lookup.monthly_salary != null ? fmtRs(lookup.monthly_salary) : '—'}
            />
            {lookup.type === 'PLACEMENT' && (
              <InfoCard label="Client" value={lookup.client_name ?? '—'} />
            )}
            {lookup.type === 'EMPLOYEE' && (
              <InfoCard label="Department" value={lookup.department ?? '—'} />
            )}
            {lookup.type === 'PLACEMENT' && lookup.placement_status && (
              <InfoCard label="Placement" value={lookup.placement_status} />
            )}
          </div>
        )}
      </div>

      {/* Period + actions */}
      <div className="rounded-2xl border border-white/8 bg-[#131c2e] p-5 space-y-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Payroll Period
        </label>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="min-w-[140px]">
            <SelectMenu
              value={String(month)}
              onValueChange={(v) => setMonth(Number(v))}
              placeholder="Month"
              className="bg-[#0f172a] border-white/10 text-sm rounded-xl"
            >
              {MONTHS.map((m, i) => (
                <SelectMenuItem key={m} value={String(i + 1)}>
                  {m}
                </SelectMenuItem>
              ))}
            </SelectMenu>
          </div>
          <div className="min-w-[100px]">
            <SelectMenu
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
              placeholder="Year"
              className="bg-[#0f172a] border-white/10 text-sm rounded-xl"
            >
              {years.map((y) => (
                <SelectMenuItem key={y} value={String(y)}>
                  {y}
                </SelectMenuItem>
              ))}
            </SelectMenu>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Salary is pro-rated: monthly salary × (billable attendance days ÷ days in month).
          {proratedEstimate != null && (
            <span className="text-slate-400">
              {' '}Example: {fmtRs(proratedEstimate)} full month → 22/30 days ≈ {fmtRs(proratedEstimate * 22 / 30)}.
            </span>
          )}
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            id="btn-preview-payroll"
            onClick={handlePreview}
            disabled={previewLoading || !code}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-semibold disabled:opacity-50 transition"
          >
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Preview
          </button>
          <button
            id="btn-generate-payroll"
            onClick={handleGenerate}
            disabled={generateLoading || !code || !lookup}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 transition"
          >
            {generateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Generate
          </button>
          <button
            id="btn-download-preview"
            onClick={handleDownloadPreview}
            disabled={downloadLoading || !code}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-300 text-sm font-semibold disabled:opacity-50 transition"
          >
            {downloadLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download Preview
          </button>
          {generatedInvoiceId && (
            <button
              id="btn-download-invoice"
              onClick={handleDownloadInvoice}
              disabled={downloadLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-300 text-sm font-semibold disabled:opacity-50 transition"
            >
              <Download className="w-4 h-4" />
              Download Invoice{generatedInvoiceNo ? ` (${generatedInvoiceNo})` : ''}
            </button>
          )}
        </div>
      </div>

      {/* Inline summary when preview loaded but modal closed */}
      {preview && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-2 text-sm">
          <p className="font-semibold text-emerald-300">Last preview — {preview.staff_name}</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <InfoCard label="Billable days" value={`${preview.billable_days} / ${preview.days_in_month}`} />
            <InfoCard label="Pro-rated gross" value={fmtRs(preview.prorated_gross)} />
            {preview.calculation && (
              <InfoCard label="Net salary" value={fmtRs(preview.calculation.netSalary)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className="text-white font-medium text-sm">{value}</p>
    </div>
  );
}
