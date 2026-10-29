'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, FileText, CheckCircle2, Send, Search,
  AlertTriangle, RefreshCw, Eye, Download, DollarSign, IndianRupee,
} from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import { BASE_URL, tokenStore } from '@/lib/api/client';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';
import ClientLookup from './components/client-lookup';

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n));
}
function fmtRs(n: number | string) { return `₹${fmt(n)}`; }
// A DATE column reaches us as IST midnight in UTC ("2026-09-30T18:30:00Z" for
// 1 Oct), so slicing the string shows the day before. Read it in IST.
function istDay(v: string | Date) {
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.split('-').reverse().join('/');
  return new Date(s).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
}

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
  // Cancelled with a rejection reason — the invoices waiting on an RM, or
  // ready to be raised again (see "Needs attention").
  { id: 'REJECTED',       label: 'Rejected' },
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

// GenerateInvoiceModal moved to finance/payroll/components/run-staff-payroll-modal.tsx —
// previewing a salary belongs on the Payroll screen, not the invoice list.

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
  const [creditReason, setCreditReason] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditPartial, setCreditPartial] = useState(false);
  const [crediting, setCrediting]     = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selected, setSelected]     = useState<any | null>(null);
  // Rejecting an unsent invoice: the reason box opens inside the detail modal.
  const [rejecting, setRejecting]   = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  // Correcting an invoice the client already has: preview first, then apply.
  const [correction, setCorrection] = useState<any | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [corrections, setCorrections] = useState<any[]>([]);
  useEffect(() => {
    setRejecting(false); setRejectReason('');
    setCorrection(null); setCorrectionReason(''); setCorrections([]);
    if (selected?.id && ['SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID'].includes(selected.status)) {
      api.getInvoiceCorrections(selected.id)
        .then((res: any) => setCorrections(res?.data ?? res ?? []))
        .catch(() => setCorrections([]));
    }
  }, [selected?.id]);

  const loadCorrection = async (id: string) => {
    setActioning(id + '_corr');
    try {
      const res: any = await api.getInvoiceCorrection(id);
      setCorrection(res?.data ?? res);
    } catch (e: any) {
      showToast('error', e.message ?? 'Could not work out the correction');
    } finally {
      setActioning(null);
    }
  };

  const applyCorrection = async (id: string) => {
    const reason = correctionReason.trim();
    if (reason.length < 10) { showToast('error', 'Write the reason (at least 10 characters)'); return; }
    setActioning(id + '_corr_apply');
    try {
      const res: any = await api.correctFinanceInvoice(id, reason);
      const out = res?.data ?? res;
      const parts = [
        out?.credit_note ? `credit note ${out.credit_note.credit_note_number} (${fmtRs(out.credit_note.credit_amount)})` : null,
        out?.supplementary_invoice ? `supplementary invoice ${out.supplementary_invoice.invoice_number} (draft)` : null,
        out?.arrears_pending ? `${fmtRs(out.arrears_pending)} arrears on the next salary` : null,
        out?.overpayment_recorded ? `${fmtRs(out.overpayment_recorded)} overpaid — recorded, not deducted` : null,
      ].filter(Boolean);
      showToast('success', `Corrected: ${parts.join('; ')}`);
      setSelected(null);
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Correction failed');
    } finally {
      setActioning(null);
    }
  };
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

  useEffect(() => { load(); }, [status]);

  // What is stuck — drafts holding salary, held slips, rate reviews, sent
  // invoices to correct, arrears. Refreshed with the list.
  const [attention, setAttention] = useState<any | null>(null);
  useEffect(() => {
    api.getFinanceAttention()
      .then((res: any) => setAttention(res?.data ?? res))
      .catch(() => setAttention(null));
  }, [invoices]);

  // Raises a rejected invoice again — same client, same days, at the rate the
  // RM has now corrected or confirmed. Lands as a DRAFT like any other.
  const handleReinvoice = async (x: any) => {
    setActioning(x.id + '_reinvoice');
    try {
      const res: any = await api.generateConsolidatedInvoice(x.client_id, x.period_month, x.period_year, x.period_to);
      const inv = res?.invoice ?? res?.data?.invoice;
      showToast('success', `${inv?.invoice_number ?? 'Invoice'} raised as a draft — check it and approve`);
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Could not raise the invoice');
    } finally {
      setActioning(null);
    }
  };

  // An invoice's story, loaded when the detail opens.
  const [history, setHistory] = useState<any[]>([]);
  useEffect(() => {
    setHistory([]);
    if (selected?.id && selected?.type !== 'EMPLOYEE') {
      api.getInvoiceHistory(selected.id)
        .then((res: any) => setHistory((res?.data ?? res)?.events ?? []))
        .catch(() => setHistory([]));
    }
  }, [selected?.id]);

  // The detail is a preview: the invoice document as the client gets it, and
  // the month's muster roll behind it, each downloadable as a PDF.
  const [previewTab, setPreviewTab] = useState<'invoice' | 'muster'>('invoice');
  const [previewHtml, setPreviewHtml] = useState<{ invoice?: string | null; muster?: string | null }>({});
  const proof = selected?.attendance_proof ?? null;
  const musterOpts = proof?.muster_roll ? { version: proof.muster_roll.version } : {};
  useEffect(() => {
    setPreviewTab('invoice');
    setPreviewHtml({});
    if (!selected?.id) return;
    const token = tokenStore.getAccess();
    axios.get(`${BASE_URL}/finance/invoices/${selected.id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      responseType: 'text',
    })
      .then((res) => setPreviewHtml((p) => ({ ...p, invoice: String(res.data) })))
      .catch(() => setPreviewHtml((p) => ({ ...p, invoice: null })));
    const ap = selected.attendance_proof;
    if (ap) {
      api.printMusterRoll(ap.client_id, ap.period_month, ap.period_year, ap.muster_roll ? { version: ap.muster_roll.version } : {})
        .then((blob: Blob) => blob.text())
        .then((html: string) => setPreviewHtml((p) => ({ ...p, muster: html })))
        .catch(() => setPreviewHtml((p) => ({ ...p, muster: null })));
    }
  }, [selected?.id]);

  /** Opens the browser's print dialog on the document, named for "Save as PDF". */
  const saveAsPdf = (html: string | null | undefined, name: string) => {
    if (!html) { showToast('error', 'The document is still loading'); return; }
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(frame);
    const before = document.title;
    frame.onload = () => {
      document.title = name;
      frame.contentDocument && (frame.contentDocument.title = name);
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => { document.title = before; frame.remove(); }, 1500);
    };
    frame.srcdoc = html;
  };
  const safeName = (s: string) => String(s ?? '').replace(/[\\/:*?"<>|]+/g, '-');
  // The reject reason and the correction open in the side panel; bring them into view.
  const revealInSide = (id: string) =>
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  const btnGhost = 'px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-semibold transition disabled:opacity-50';

  const handleApprove = async (id: string) => {
    setActioning(id + '_approve');
    try {
      const res: any = await api.approveFinanceInvoice(id);
      const released = res?.payslips_released ?? res?.data?.payslips_released;
      showToast(
        'success',
        released ? `Invoice approved — ${released} salary slip${released === 1 ? '' : 's'} released to staff` : 'Invoice approved',
      );
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

  // Finance sends an unsent invoice back: it is cancelled with the reason, its
  // payroll is voided (kept on record), and the RM must correct or confirm the
  // rate before this client can be invoiced again.
  const handleReject = async (id: string) => {
    const reason = rejectReason.trim();
    if (reason.length < 10) { showToast('error', 'Write the reason (at least 10 characters)'); return; }
    setActioning(id + '_reject');
    try {
      const res: any = await api.rejectFinanceInvoice(id, reason);
      const out = res?.data ?? res;
      const who = (out?.placements_for_review ?? []).map((p: any) => p.staff_name).join(', ');
      showToast(
        'success',
        `${out?.invoice_number ?? 'Invoice'} rejected — ${out?.payroll_voided ?? 0} payroll row(s) voided` +
          (who ? `; RM asked to check the rate for ${who}` : ''),
      );
      setRejecting(false);
      setRejectReason('');
      setSelected(null);
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Could not reject');
    } finally {
      setActioning(null);
    }
  };

  // Rebuilds an unsent invoice with the current Company & GST settings — how a
  // Bill of Supply raised before the GSTIN was entered becomes a Tax Invoice.
  const handleRecalculate = async (id: string) => {
    setActioning(id + '_recalc');
    try {
      const res: any = await api.recalculateFinanceInvoice(id);
      const out = res?.data ?? res;
      const p = out?.preview;
      showToast(
        'success',
        p?.document_type === 'TAX_INVOICE'
          ? `Recalculated as a Tax Invoice — GST ${fmtRs(p?.totals?.gst_total ?? 0)}, total ${fmtRs(p?.totals?.total ?? 0)}`
          : 'Recalculated — still a Bill of Supply. Fill in Finance → Company & GST first.',
      );
      setSelected(null);
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Could not recalculate');
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

  // One salary slip per staff member on the invoice, for the same days.
  const handleSalarySlips = async (id: string, invoiceNumber: string) => {
    setActioning(id + '_slips');
    try {
      const blob = await api.downloadInvoiceSalarySlips(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `salary-slips-${invoiceNumber || id}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      showToast('error', e.message ?? 'Could not download the salary slips');
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-[1400px] h-[96vh] flex flex-col overflow-hidden">
            {/* Header: what it is, and the documents to take away */}
            <div className="relative flex flex-wrap items-center gap-3 border-b border-white/10 py-3 pl-5 pr-14">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-lg">{selected.invoice_number}</h3>
                  <StatusBadge status={selected.status} />
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {selected.client_name ?? selected.client_id} · {fmtRs(selected.total_amount)}
                </p>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button
                  id={`btn-modal-invoice-pdf-${selected.id}`}
                  onClick={() => saveAsPdf(previewHtml.invoice, `Invoice ${safeName(selected.invoice_number)}`)}
                  disabled={!previewHtml.invoice}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white transition disabled:opacity-50"
                >
                  Invoice PDF
                </button>
                {proof && (
                  <button
                    id={`btn-modal-muster-pdf-${selected.id}`}
                    onClick={() => saveAsPdf(previewHtml.muster, `Muster roll ${safeName(selected.client_name ?? '')} ${proof.period_month}-${proof.period_year}`)}
                    disabled={!previewHtml.muster}
                    className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-3 py-1.5 text-sm font-semibold text-slate-100 transition disabled:opacity-50"
                  >
                    Muster roll PDF
                  </button>
                )}
                {selected.is_consolidated && (
                  <button
                    id={`btn-modal-salary-slips-${selected.id}`}
                    onClick={() => handleSalarySlips(selected.id, selected.invoice_number)}
                    disabled={actioning === selected.id + '_slips'}
                    className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 text-sm font-semibold text-slate-200 transition disabled:opacity-50"
                  >
                    {actioning === selected.id + '_slips' ? 'Preparing…' : 'Salary slips'}
                  </button>
                )}
                <button onClick={() => setSelected(null)} aria-label="Close" className="absolute right-4 top-3 rounded-lg px-2 text-2xl leading-none text-slate-400 hover:text-white">×</button>
              </div>
            </div>

            <div className="flex-1 min-h-0 grid lg:grid-cols-[minmax(0,1fr)_420px]">
              {/* Preview: the documents exactly as they print */}
              <div className="flex min-h-[50vh] flex-col bg-slate-800/40 lg:min-h-0">
                <div className="flex gap-1 px-4 pt-3">
                  {(['invoice', 'muster'] as const).filter((t) => t === 'invoice' || proof).map((t) => (
                    <button
                      key={t}
                      onClick={() => setPreviewTab(t)}
                      className={`rounded-t-lg px-4 py-1.5 text-sm font-semibold ${previewTab === t ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}
                    >
                      {t === 'invoice' ? 'Invoice' : `Muster roll${proof?.muster_roll ? ` · signed v${proof.muster_roll.version}` : ' · not signed'}`}
                    </button>
                  ))}
                </div>
                <div className="flex-1 min-h-0 px-4 pb-4">
                  {previewHtml[previewTab] === undefined ? (
                    <div className="flex h-full items-center justify-center rounded-b-lg rounded-tr-lg bg-white text-sm text-slate-500">Loading preview…</div>
                  ) : previewHtml[previewTab] === null ? (
                    <div className="flex h-full items-center justify-center rounded-b-lg rounded-tr-lg bg-white text-sm text-rose-600">Could not load this document</div>
                  ) : (
                    <iframe
                      title={previewTab === 'invoice' ? 'Invoice preview' : 'Muster roll preview'}
                      srcDoc={previewHtml[previewTab] as string}
                      sandbox=""
                      className="h-full w-full rounded-b-lg rounded-tr-lg bg-white"
                    />
                  )}
                </div>
              </div>

              {/* Side panel: checks and every action */}
              <div className="min-h-0 overflow-y-auto border-t border-white/10 p-5 space-y-4 lg:border-l lg:border-t-0">
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
                <span className="text-white">
                  {selected.period_from && selected.period_to
                    ? `${istDay(selected.period_from)} – ${istDay(selected.period_to)}`
                    : `${MONTHS_SHORT[selected.period_month - 1]} ${selected.period_year}`}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-400">Due Date</span>
                <span className="text-white">{new Date(selected.due_date).toLocaleDateString('en-IN')}</span>
              </div>
              {selected.document_type && (
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-slate-400">Document</span>
                  <span className={selected.document_type === 'TAX_INVOICE' ? 'text-emerald-400' : 'text-amber-400'}>
                    {selected.document_type === 'TAX_INVOICE' ? 'Tax Invoice' : 'Bill of Supply — no GST'}
                  </span>
                </div>
              )}
              <details className="border-b border-white/5 py-2">
                <summary className="flex cursor-pointer justify-between text-slate-400">
                  <span>Line items ({selected.line_items?.length ?? 0})</span>
                  <span className="text-white font-semibold">{fmtRs(selected.total_amount)}</span>
                </summary>
                {selected.line_items?.map((li: LineItem) => (
                  <div key={li.description} className="flex justify-between gap-3 py-1.5 text-xs border-b border-white/5 last:border-0">
                    <div>
                      <span className="text-slate-300">{li.description}</span>
                      {li.gst_applicable && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded">GST</span>
                      )}
                    </div>
                    <span className="text-white font-medium whitespace-nowrap">{fmtRs(li.amount)}</span>
                  </div>
                ))}
              </details>
              {selected.document_type === 'TAX_INVOICE' && (
                <div className="pt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Taxable value</span><span>{fmtRs(selected.taxable_value ?? 0)}</span>
                  </div>
                  {Number(selected.igst_amount) > 0 ? (
                    <div className="flex justify-between text-slate-400">
                      <span>IGST · place of supply {selected.place_of_supply ?? '—'}</span>
                      <span>{fmtRs(selected.igst_amount)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-slate-400"><span>CGST</span><span>{fmtRs(selected.cgst_amount ?? 0)}</span></div>
                      <div className="flex justify-between text-slate-400"><span>SGST</span><span>{fmtRs(selected.sgst_amount ?? 0)}</span></div>
                    </>
                  )}
                  <div className="flex justify-between text-white font-semibold pt-1">
                    <span>Total</span><span>{fmtRs(selected.total_amount)}</span>
                  </div>
                </div>
              )}
            </div>
            {selected.is_consolidated && ['DRAFT', 'APPROVED'].includes(selected.status) && selected.document_type === 'BILL_OF_SUPPLY' && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Raised without GST. Use <b>Recalculate with GST</b> below to make it a Tax Invoice with the current Company &amp; GST settings.
              </p>
            )}
            {/* The proof behind the billed days: client confirmation of the
                staff-app days and the signed muster roll. Warnings, not a gate. */}
            {selected.attendance_proof && (() => {
              const ap = selected.attendance_proof;
              const days = ap.staff_app_days ?? {};
              const roll = ap.muster_roll;
              const openRoll = async (opts: { version?: number } = {}) => {
                try {
                  const blob = await api.printMusterRoll(ap.client_id, ap.period_month, ap.period_year, { ...opts, audit: true });
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank', 'noopener');
                  setTimeout(() => URL.revokeObjectURL(url), 60_000);
                } catch (e: any) { setToast({ type: 'error', msg: e.message ?? 'Could not open the muster roll' }); }
              };
              const openScan = async () => {
                try {
                  const url = URL.createObjectURL(await api.downloadMusterRollScan(roll.scan_id));
                  window.open(url, '_blank', 'noopener');
                  setTimeout(() => URL.revokeObjectURL(url), 60_000);
                } catch (e: any) { setToast({ type: 'error', msg: e.message ?? 'Could not open the signed copy' }); }
              };
              return (
                <div className={`space-y-1.5 rounded-xl border px-3 py-2 text-xs ${ap.warnings?.length ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-100'}`}>
                  <p className="font-semibold">Attendance proof · {ap.period_from} to {ap.period_to}</p>
                  <p className="text-slate-300">
                    Staff app: {days.APPROVED ?? 0} confirmed by client · {days.DEEMED ?? 0} deemed (no reply in 48 h) ·{' '}
                    {days.APPROVED_PAPER ?? 0} on signed paper · {days.PENDING ?? 0} waiting · {days.DISPUTED ?? 0} disputed
                    {ap.days_by_source?.RM ? ` · ${ap.days_by_source.RM} marked by RM` : ''}
                    {ap.days_by_source?.HR ? ` · ${ap.days_by_source.HR} by HR` : ''}
                  </p>
                  <p className="text-slate-300">
                    Muster roll:{' '}
                    {roll
                      ? `v${roll.version}, ${roll.sign_method === 'CLIENT_APP' ? `signed in the app by ${roll.signed_name}` : 'signed on paper'} on ${new Date(roll.signed_at).toLocaleDateString('en-IN')}${roll.locked ? ' · locked with an approved invoice' : ''}`
                      : 'not signed'}
                  </p>
                  {(ap.warnings ?? []).map((w: string, i: number) => <p key={i} className="text-amber-300">⚠ {w}</p>)}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button onClick={() => setPreviewTab('muster')} className="rounded-lg border border-white/15 px-2 py-0.5 font-semibold hover:bg-white/5">
                      View muster roll
                    </button>
                    <button onClick={() => openRoll(roll ? { version: roll.version } : {})} className="rounded-lg border border-white/15 px-2 py-0.5 font-semibold hover:bg-white/5">
                      With proof page
                    </button>
                    {roll?.has_scan && (
                      <button onClick={openScan} className="rounded-lg border border-white/15 px-2 py-0.5 font-semibold hover:bg-white/5">Signed paper copy</button>
                    )}
                  </div>
                </div>
              );
            })()}
            {/* What is new since Finance last approved: a first invoice for a
                placement, or a rate changed after the last approval. Approving
                is the rate check, so this is what to look at. */}
            {['DRAFT', 'APPROVED'].includes(selected.status) && (selected.rate_notes ?? []).length > 0 && (
              <div className="space-y-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                <p className="font-semibold">Check these rates before approving</p>
                {(selected.rate_notes as any[]).map((n) => (
                  <div key={n.placement_id}>
                    <span className="font-medium">{n.staff_name}</span>
                    {n.first_invoice && <span className="text-amber-300"> — first invoice on this placement</span>}
                    {(n.changes ?? []).map((c: any, i: number) => (
                      <p key={i} className="pl-3 text-amber-200/90">
                        From {c.effective_from}:{' '}
                        {(c.fields ?? []).map((f: any) => `${f.field.replace(/_/g, ' ')} ${f.before ?? '—'} → ${f.after ?? '—'}`).join(', ')}
                        {c.changed_by ? ` — ${c.changed_by}` : ''}
                        {c.reason ? ` · “${c.reason}”` : ''}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {selected.is_consolidated && ['SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID'].includes(selected.status) && correction && (
              <div id="invoice-correction-box" className="space-y-2 rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 text-xs">
                {correction.nothing_to_correct ? (
                  <p className="text-slate-300">
                    This invoice already matches the rates and attendance on record. Change the rate on the placement
                    first (back-dated to these days), then correct it here.
                  </p>
                ) : (
                  <>
                    <p className="font-semibold text-sky-200">What it should have been — the sent invoice is not edited</p>
                    <table className="w-full text-[11px]">
                      <thead className="text-slate-400">
                        <tr>
                          <th className="text-left">Staff</th><th className="text-right">Billed</th><th className="text-right">Should be</th>
                          <th className="text-right">Paid</th><th className="text-right">Should be</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(correction.lines ?? []).map((l: any) => (
                          <tr key={l.payroll_id} className="text-slate-200">
                            <td>{l.staff_name} <span className="text-slate-500">{l.period}</span></td>
                            <td className="text-right">{fmtRs(l.billed_before)}</td>
                            <td className="text-right">{fmtRs(l.billed_after)}</td>
                            <td className="text-right">{fmtRs(l.paid_before)}</td>
                            <td className="text-right">{fmtRs(l.paid_after)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <ul className="list-disc pl-4 text-slate-200">
                      {correction.actions?.credit_note > 0 && (
                        <li>Credit note to the client: {fmtRs(correction.actions.credit_note)} (tax included)</li>
                      )}
                      {correction.actions?.supplementary_invoice > 0 && (
                        <li>Supplementary invoice (draft): {fmtRs(correction.actions.supplementary_invoice)} (tax included)</li>
                      )}
                      {correction.actions?.arrears_to_pay > 0 && (
                        <li>Arrears added to the staff member&apos;s next salary: {fmtRs(correction.actions.arrears_to_pay)}</li>
                      )}
                      {correction.actions?.overpayment_recorded > 0 && (
                        <li>Staff overpaid {fmtRs(correction.actions.overpayment_recorded)} — recorded, never deducted</li>
                      )}
                    </ul>
                    <textarea
                      id={`input-correction-reason-${selected.id}`}
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      rows={2}
                      placeholder="Why — this goes on the credit note / supplementary invoice"
                      className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100"
                    />
                    <button
                      id={`btn-modal-correct-apply-${selected.id}`}
                      onClick={() => applyCorrection(selected.id)}
                      disabled={actioning === selected.id + '_corr_apply' || correctionReason.trim().length < 10}
                      className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold transition disabled:opacity-50"
                    >
                      {actioning === selected.id + '_corr_apply' ? 'Applying…' : 'Apply correction'}
                    </button>
                  </>
                )}
                {corrections.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-slate-400">Earlier corrections ({corrections.length})</summary>
                    <ul className="mt-1 space-y-1 text-slate-300">
                      {corrections.map((c: any) => (
                        <li key={c.id}>
                          {new Date(c.created_at).toLocaleDateString('en-IN')} — {c.created_by_name ?? 'Finance'}: “{c.reason}”
                          {c.credit_note_number ? ` · ${c.credit_note_number}` : ''}
                          {c.supplementary_invoice_number ? ` · ${c.supplementary_invoice_number}` : ''}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
            {history.length > 0 && (
              <details className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300">
                <summary className="cursor-pointer text-slate-400">History ({history.length})</summary>
                <ul className="mt-2 space-y-1">
                  {history.map((e: any, i: number) => (
                    <li key={i}>
                      <span className="text-slate-500">{e.at ? new Date(e.at).toLocaleString('en-IN') : '—'}</span>{' '}
                      {e.what}
                      {e.who ? <span className="text-slate-400"> — {e.who}</span> : null}
                      {e.detail ? <span className="text-slate-400"> · “{e.detail}”</span> : null}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {selected.status === 'CANCELLED' && selected.reject_reason && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                <span className="font-semibold">Rejected by Finance</span>
                {selected.rejected_at ? ` on ${new Date(selected.rejected_at).toLocaleDateString('en-IN')}` : ''}:
                {' '}{selected.reject_reason}
              </div>
            )}
            {selected.is_consolidated && ['DRAFT', 'APPROVED'].includes(selected.status) && (
              rejecting ? (
                <div id="invoice-reject-box" className="space-y-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
                  <p className="text-xs text-slate-300">
                    Why is this invoice wrong? The RM is told, its payroll is voided, and this client cannot be
                    invoiced again until the RM corrects or confirms the rate.
                  </p>
                  <textarea
                    id={`input-reject-reason-${selected.id}`}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="e.g. Live-in rate entered as ₹5,000 per duty, agreed rate is ₹500"
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100"
                  />
                  <div className="flex gap-2">
                    <button
                      id={`btn-modal-reject-confirm-${selected.id}`}
                      onClick={() => handleReject(selected.id)}
                      disabled={actioning === selected.id + '_reject' || rejectReason.trim().length < 10}
                      className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition disabled:opacity-50"
                    >
                      {actioning === selected.id + '_reject' ? 'Rejecting…' : 'Reject invoice'}
                    </button>
                    <button
                      onClick={() => { setRejecting(false); setRejectReason(''); }}
                      className="py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm"
                    >
                      Back
                    </button>
                  </div>
                </div>
              ) : null
            )}
            {canGo(selected.status, 'APPROVED') && (
              <p className="text-xs text-slate-400">
                Check every staff line — rate, duties or days — before approving. Approving releases the
                salary slips to the staff app and makes them payable.
              </p>
            )}
              </div>
            </div>

            {/* Footer: every action on the invoice, always in view. Secondary
                ones on the left, the next step in its life on the right. */}
            <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-[#0b1222] px-5 py-3">
              <button
                id={`btn-modal-download-${selected.id}`}
                onClick={() => handleDownload(selected.id, selected.invoice_number)}
                disabled={downloading === selected.id}
                className={btnGhost}
              >
                {downloading === selected.id ? 'Downloading…' : 'Download (HTML)'}
              </button>
              {selected.is_consolidated && ['DRAFT', 'APPROVED'].includes(selected.status) && (
                <button
                  id={`btn-modal-recalc-${selected.id}`}
                  onClick={() => handleRecalculate(selected.id)}
                  disabled={actioning === selected.id + '_recalc'}
                  className={`${btnGhost} border-amber-500/30 text-amber-300 hover:bg-amber-500/10`}
                >
                  {actioning === selected.id + '_recalc'
                    ? 'Recalculating…'
                    : selected.document_type === 'BILL_OF_SUPPLY' ? 'Recalculate with GST' : 'Recalculate'}
                </button>
              )}
              {selected.is_consolidated && ['DRAFT', 'APPROVED'].includes(selected.status) && !rejecting && (
                <button
                  id={`btn-modal-reject-${selected.id}`}
                  onClick={() => { setRejecting(true); revealInSide('invoice-reject-box'); }}
                  className={`${btnGhost} border-rose-500/30 text-rose-300 hover:bg-rose-500/10`}
                >
                  Reject
                </button>
              )}
              {selected.is_consolidated && ['SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID'].includes(selected.status) && !correction && (
                <button
                  id={`btn-modal-correct-${selected.id}`}
                  onClick={async () => { await loadCorrection(selected.id); revealInSide('invoice-correction-box'); }}
                  disabled={actioning === selected.id + '_corr'}
                  className={`${btnGhost} border-sky-500/30 text-sky-300 hover:bg-sky-500/10`}
                >
                  {actioning === selected.id + '_corr' ? 'Working it out…' : 'Correct invoice'}
                </button>
              )}
              <div className="hidden flex-1 sm:block" />
              {canGo(selected.status, 'PAID') && (
                <button
                  id={`btn-modal-settle-${selected.id}`}
                  onClick={() => { setSettleFor(selected); setSelected(null); }}
                  className="min-w-[140px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold transition"
                >
                  Record payment
                </button>
              )}
              {canGo(selected.status, 'APPROVED') && (
                <button
                  id={`btn-modal-approve-${selected.id}`}
                  onClick={() => { handleApprove(selected.id); setSelected(null); }}
                  className="min-w-[140px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition"
                >
                  Approve
                </button>
              )}
              {canGo(selected.status, 'SENT') && (
                <button
                  id={`btn-modal-send-${selected.id}`}
                  onClick={() => { handleSend(selected.id); setSelected(null); }}
                  className="min-w-[140px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
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
                  className="min-w-[120px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-semibold transition"
                >
                  Credit Note
                </button>
              )}
              {canGo(selected.status, 'PAID') && (
                <button
                  id={`btn-modal-payment-link-${selected.id}`}
                  onClick={() => handleGeneratePaymentLink(selected.id, selected.total_amount)}
                  disabled={actioning === selected.id + '_payment_link'}
                  className="min-w-[140px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition disabled:opacity-50"
                >
                  {actioning === selected.id + '_payment_link' ? 'Generating…' : 'Generate Payment Link'}
                </button>
              )}
              {!['PAID', 'APPROVED', 'SENT', 'CREDIT_NOTE'].some((to) => canGo(selected.status, to)) && (
                <span className="text-xs text-slate-500">
                  {selected.status === 'CANCELLED' ? 'Cancelled — nothing more to do on this invoice.' : 'Settled — nothing more to do on this invoice.'}
                </span>
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

      {/* What needs Finance today. Salary waits on a draft invoice, a client
          waits on an RM's rate check — this is where either gets noticed. */}
      {attention && Object.values(attention.counts ?? {}).some((n: any) => n > 0) && (
        <details className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
          <summary className="cursor-pointer font-semibold">
            Needs attention —{' '}
            {[
              attention.counts.draft_invoices_waiting && `${attention.counts.draft_invoices_waiting} draft invoice(s) holding salary`,
              attention.counts.slips_held && `${attention.counts.slips_held} slip(s) held`,
              attention.counts.rate_reviews_open && `${attention.counts.rate_reviews_open} rate review(s) with RMs`,
              attention.counts.sent_invoices_needing_correction && `${attention.counts.sent_invoices_needing_correction} sent invoice(s) to correct`,
              attention.counts.arrears_pending && `${attention.counts.arrears_pending} arrears pending`,
              attention.counts.ready_to_reinvoice && `${attention.counts.ready_to_reinvoice} ready to re-invoice`,
              attention.counts.disputes_unresolved && `${attention.counts.disputes_unresolved} disputed day(s) over 48 h`,
              attention.counts.muster_rolls_unsigned && `${attention.counts.muster_rolls_unsigned} muster roll(s) unsigned`,
            ].filter(Boolean).join(' · ')}
          </summary>
          <div className="mt-3 grid gap-3 text-xs md:grid-cols-2">
            {(attention.disputes_unresolved ?? []).length > 0 && (
              <div>
                <p className="font-semibold text-rose-300">Disputed days the RM has not resolved (48 h+) — not billed or paid</p>
                {attention.disputes_unresolved.map((x: any) => (
                  <p key={x.id} className="py-0.5">
                    {x.date} · {x.staff_name} at {x.customer_name}{x.rm_name ? ` · RM ${x.rm_name}` : ''} · {x.days_waiting} day(s)
                  </p>
                ))}
              </div>
            )}
            {(attention.muster_rolls_unsigned ?? []).length > 0 && (
              <div>
                <p className="font-semibold text-amber-200">Last month&apos;s muster roll not signed</p>
                {attention.muster_rolls_unsigned.map((x: any) => (
                  <p key={x.client_id} className="py-0.5">
                    {x.customer_name} · {x.period_month}/{x.period_year} · {x.days} day(s){x.rm_days ? `, ${x.rm_days} marked by RM` : ''}
                  </p>
                ))}
                <a href="/finance/muster-rolls" className="underline">Open muster rolls</a>
              </div>
            )}
            {(attention.ready_to_reinvoice ?? []).length > 0 && (
              <div className="md:col-span-2">
                <p className="font-semibold text-emerald-300">Ready to re-invoice — the RM has corrected or confirmed the rate</p>
                {attention.ready_to_reinvoice.map((x: any) => (
                  <div key={x.id} className="flex flex-wrap items-center gap-2 py-0.5">
                    <span>
                      {x.invoice_number} · {x.customer_name} · {x.period_from} to {x.period_to}
                      <span className="text-amber-200/70"> — rejected: “{x.reject_reason}”</span>
                    </span>
                    <button
                      id={`btn-reinvoice-${x.id}`}
                      onClick={() => handleReinvoice(x)}
                      disabled={actioning === x.id + '_reinvoice'}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      {actioning === x.id + '_reinvoice' ? 'Raising…' : 'Re-invoice'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {(attention.draft_invoices_waiting ?? []).length > 0 && (
              <div>
                <p className="font-semibold text-amber-200">Drafts waiting for approval</p>
                {attention.draft_invoices_waiting.map((x: any) => (
                  <p key={x.id}>{x.invoice_number} · {x.customer_name} · {x.days_waiting} days</p>
                ))}
              </div>
            )}
            {(attention.rate_reviews_open ?? []).length > 0 && (
              <div>
                <p className="font-semibold text-amber-200">Waiting for the RM to check the rate</p>
                {attention.rate_reviews_open.map((x: any) => (
                  <p key={x.placement_id}>{x.staff_name} · {x.customer_name} · {x.rm_name ?? 'RM'} · {x.days_waiting} days</p>
                ))}
              </div>
            )}
            {(attention.sent_invoices_needing_correction ?? []).length > 0 && (
              <div>
                <p className="font-semibold text-amber-200">Sent, then the rate changed — open and correct</p>
                {attention.sent_invoices_needing_correction.map((x: any) => (
                  <p key={x.id}>{x.invoice_number} · {x.staff_name} · from {x.effective_from}</p>
                ))}
              </div>
            )}
            {(attention.arrears_pending ?? []).length > 0 && (
              <div>
                <p className="font-semibold text-amber-200">Arrears waiting for the next payroll</p>
                {attention.arrears_pending.map((x: any) => (
                  <p key={x.id}>{x.staff_name} · {fmtRs(x.amount)} · {x.days_waiting} days</p>
                ))}
              </div>
            )}
            {(attention.slips_held ?? []).length > 0 && (
              <div>
                <p className="font-semibold text-amber-200">Salary slips held (Admin can release with a reason)</p>
                {attention.slips_held.map((x: any) => (
                  <p key={x.payroll_id}>{x.staff_name} · {x.invoice_number ?? 'no invoice'} · {x.days_waiting} days</p>
                ))}
              </div>
            )}
          </div>
        </details>
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
        Bill a client by their unit code. This sits above the list because it
        is the thing Finance comes here to do — the list below is the record of
        what has already been done. See HOURLY_MULTI_CLIENT_PLAN.md §F1.
      */}
      <ClientLookup
        onIssued={(msg) => { showToast('success', msg); load(); }}
        onViewInvoice={handleDetail}
      />

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
                  <th className="px-4 py-3 text-right">GST</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Due Date</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv: any) => {
                  const overdue = isOverdue(inv);
                  const gstAmt = parseFloat(inv.gst_amount ?? 0);
                  // GST is charged on the whole taxable value (wages + employer
                  // ESIC/PF + fee), so the rate is read against that. Dividing
                  // by the fee alone printed "170% GST on fee".
                  const taxable = parseFloat(inv.taxable_value ?? 0);
                  const gstPct = taxable > 0 && gstAmt > 0 ? Math.round((gstAmt / taxable) * 10000) / 100 : null;
                  const isBos = inv.document_type === 'BILL_OF_SUPPLY';
                  return (
                    <tr key={inv.id} className={`border-b border-white/5 hover:bg-white/2 transition ${overdue ? 'bg-red-500/3' : ''}`}>
                      <td className="px-5 py-3 font-mono text-xs text-slate-300">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-white">
                        {inv.client_name ?? inv.client_id?.slice(0, 8)}
                        {inv.reject_reason && (
                          <p className="text-[11px] text-rose-300 mt-0.5 max-w-[260px] truncate" title={inv.reject_reason}>
                            Rejected: {inv.reject_reason}
                          </p>
                        )}
                      </td>
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
                      <td className="px-4 py-3 text-center text-slate-400">
                        {/* An invoice can cover part of a month — show its own dates. */}
                        {inv.period_from && inv.period_to && !(istDay(inv.period_from).slice(0, 2) === '01' && Number(istDay(inv.period_to).slice(0, 2)) === new Date(Date.UTC(inv.period_year, inv.period_month, 0)).getUTCDate())
                          ? <span className="text-xs">{istDay(inv.period_from).slice(0, 2)}–{istDay(inv.period_to).slice(0, 2)} {MONTHS_SHORT[inv.period_month - 1]} {inv.period_year}</span>
                          : <>{MONTHS_SHORT[inv.period_month - 1]} {inv.period_year}</>}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">{fmtRs(inv.staff_salary_component)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={isBos ? 'text-amber-400' : 'text-indigo-400'}>{fmtRs(gstAmt)}</span>
                        <span className="text-[10px] text-slate-500 block">
                          {isBos
                            ? 'Bill of Supply — no GST'
                            : gstPct != null ? `${gstPct}% on ${fmtRs(taxable)}` : 'GST'}
                        </span>
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
