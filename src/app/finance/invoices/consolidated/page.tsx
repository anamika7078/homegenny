'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, FileText, RefreshCw, AlertTriangle, CheckCircle2, Users, Receipt,
} from 'lucide-react';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const currentDate = new Date();

function fmtRs(n: number | string) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n ?? 0))}`;
}

/**
 * Month-end consolidated invoicing.
 *
 * A client with three staff used to receive three unrelated invoices every
 * month (F-15). This issues one per customer, with each staff member as a
 * line-item group, and shows up front whether it can be a Tax Invoice or has
 * to go out as a Bill of Supply (F-14).
 */
export default function ConsolidatedInvoicesPage() {
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear]   = useState(currentDate.getFullYear());
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getConsolidatedPending(month, year);
      const items = res?.data ?? res;
      setPending(Array.isArray(items) ? items : []);
    } catch (e: any) {
      showToast('error', e.message ?? 'Could not load pending invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month, year]);

  const openPreview = async (customerId: string) => {
    setPreviewing(customerId);
    try {
      const res = await api.getConsolidatedPreview(customerId, month, year);
      setPreview(res?.data ?? res);
    } catch (e: any) {
      showToast('error', e.message ?? 'Could not build the preview');
    } finally {
      setPreviewing(null);
    }
  };

  const issue = async () => {
    if (!preview) return;
    setIssuing(true);
    try {
      const res = await api.generateConsolidatedInvoice(preview.customer_id, month, year);
      const out = res?.data ?? res;
      showToast('success', `Issued ${out?.invoice?.invoice_number ?? 'invoice'} for ${preview.customer_name}`);
      setPreview(null);
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Could not issue the invoice');
    } finally {
      setIssuing(false);
    }
  };

  const years = Array.from({ length: 4 }, (_, i) => currentDate.getFullYear() - i);

  return (
    <div className="page-padding space-y-6">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium border max-w-md
          ${toast.type === 'success'
            ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300'
            : 'bg-red-950 border-red-500/30 text-red-300'}`}>
          {toast.msg}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-lg">{preview.customer_name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {MONTHS[month - 1]} {year} · {preview.staff_count} staff · {preview.next_invoice_number}
                </p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase shrink-0 ${
                preview.document_type === 'TAX_INVOICE'
                  ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25'
                  : 'text-amber-400 bg-amber-400/10 border-amber-400/25'}`}>
                {preview.document_type === 'TAX_INVOICE' ? 'Tax Invoice' : 'Bill of Supply'}
              </span>
            </div>

            {/* Says exactly what is missing rather than silently issuing the
                lesser document. */}
            {preview.missing_for_tax_invoice?.length > 0 && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="text-amber-300 font-semibold">Issued as a Bill of Supply</p>
                  <p className="text-slate-400 mt-0.5">
                    Still needed for a Tax Invoice: {preview.missing_for_tax_invoice.join(', ')}.
                    No GST is charged until these are set.
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-white/10 divide-y divide-white/5">
              {(preview.line_items ?? []).map((li: any, i: number) => (
                <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                  <span className="text-slate-300">
                    {li.description}
                    {li.is_taxable && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded">
                        taxable
                      </span>
                    )}
                  </span>
                  <span className="text-white font-medium tabular-nums">{fmtRs(li.amount)}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-1.5 text-sm">
              {([
                ['Staff salary', preview.totals?.staff_salary],
                ['Employer ESIC', preview.totals?.employer_esic],
                ['Employer PF', preview.totals?.employer_pf],
                ['Management fee (taxable)', preview.totals?.management_fee],
                preview.totals?.cgst > 0 ? ['CGST', preview.totals.cgst] : null,
                preview.totals?.sgst > 0 ? ['SGST', preview.totals.sgst] : null,
                preview.totals?.igst > 0 ? ['IGST', preview.totals.igst] : null,
              ].filter(Boolean) as [string, number][]).map(([label, v]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-slate-200 tabular-nums">{fmtRs(v)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-white/10 pt-2 mt-2 font-bold">
                <span className="text-white">Total</span>
                <span className="text-white tabular-nums">{fmtRs(preview.totals?.total)}</span>
              </div>
              {!preview.reconciles && (
                <p className="text-xs text-red-400 pt-1">
                  Line items do not add up to the total — this will be refused.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPreview(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-sm transition"
              >
                Close
              </button>
              <button
                id="btn-issue-consolidated"
                onClick={issue}
                disabled={issuing || !preview.reconciles || preview.staff_count === 0}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 transition"
              >
                {issuing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Issue ${preview.next_invoice_number}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Consolidated Invoicing</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            One invoice per customer per month, covering every staff member placed with them
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SelectMenu value={String(month)} onValueChange={(v) => setMonth(Number(v))} className="bg-[#131c2e] border-white/10 rounded-xl w-32">
            {MONTHS.map((m, i) => <SelectMenuItem key={m} value={String(i + 1)}>{m}</SelectMenuItem>)}
          </SelectMenu>
          <SelectMenu value={String(year)} onValueChange={(v) => setYear(Number(v))} className="bg-[#131c2e] border-white/10 rounded-xl w-28">
            {years.map((y) => <SelectMenuItem key={y} value={String(y)}>{String(y)}</SelectMenuItem>)}
          </SelectMenu>
          <button onClick={load} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/8 bg-[#131c2e] overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
          </div>
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <CheckCircle2 className="w-10 h-10 text-slate-600" />
            <p className="text-slate-400 text-sm">
              Nothing left to invoice for {MONTHS[month - 1]} {year}
            </p>
            <p className="text-xs text-slate-500">
              Every payroll for this period is already on an invoice.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">GSTIN</th>
                  <th className="px-4 py-3 text-center">Staff</th>
                  <th className="px-4 py-3 text-right">Salary total</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((c: any) => (
                  <tr key={c.customer_id} className="border-b border-white/5 hover:bg-white/2 transition">
                    <td className="px-5 py-3">
                      <p className="font-medium text-white">{c.customer_name}</p>
                      <p className="text-[11px] text-slate-500">{c.state ?? 'no state on file'}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {c.gstn
                        ? <span className="text-slate-300">{c.gstn}</span>
                        : <span className="text-amber-400/80">not registered</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <Users className="w-3.5 h-3.5 text-slate-500" /> {c.staff_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white tabular-nums">{fmtRs(c.salary_total)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        id={`btn-preview-consolidated-${c.customer_id}`}
                        onClick={() => openPreview(c.customer_id)}
                        disabled={previewing === c.customer_id}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        {previewing === c.customer_id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Receipt className="w-3 h-3" />}
                        Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5" />
        Preview computes the document without consuming an invoice number — only Issue does that.
      </p>
    </div>
  );
}
