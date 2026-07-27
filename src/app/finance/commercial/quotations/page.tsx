'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, Plus, FileText, Calendar, User, Printer, Download, Sparkles, CheckCircle2,
} from 'lucide-react';

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n));
}
function fmtRs(n: number | string) { return `₹${fmt(n)}`; }

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [calculations, setCalculations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCalcId, setSelectedCalcId] = useState('');
  const [validityDays, setValidityDays] = useState(30);
  const [preparedBy, setPreparedBy] = useState('Rajesh Finance');
  const [terms, setTerms] = useState('1. Payment: 30 days from billing.\n2. Standard service level agreements apply.\n3. Escalation clause active annually.');
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [quotes, calcs] = await Promise.all([
        api.listQuotations(),
        api.listCalculations(),
      ]);
      const quotesData = (quotes as any)?.data ?? quotes;
      const calcsData = (calcs as any)?.data ?? calcs;
      setQuotations(Array.isArray(quotesData) ? quotesData : []);
      // Allow active calculations (Draft, Pending Approval, or Approved) to be used to generate quotations
      const activeCalcs = Array.isArray(calcsData) ? calcsData.filter((c: any) => c.status !== 'REJECTED') : [];
      setCalculations(activeCalcs);
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCalcId) {
      showToast('error', 'Select an approved calculation');
      return;
    }
    setLoading(true);
    try {
      const res = await api.createQuotation({
        calculation_id: selectedCalcId,
        validity_days: validityDays,
        terms_conditions: terms,
        prepared_by: preparedBy,
      });
      const resData = (res as any)?.data ?? res;
      showToast('success', `Quotation Generated! Number: ${resData.quotation_number}`);
      setShowCreate(false);
      loadData();
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to create quotation');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (id: string) => {
    setLoading(true);
    try {
      const item = await api.getQuotation(id);
      setPreviewItem((item as any)?.data ?? item);
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = (q: any) => {
    // Generate simple CSV download for Excel compatibility
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `QUOTATION SUMMARY\n`;
    csvContent += `Quotation Number,${q.quotation_number}\n`;
    csvContent += `Customer Name,${q.customer_name}\n`;
    csvContent += `Unit Code,${q.unit_code}\n`;
    csvContent += `Date,${q.date}\n`;
    csvContent += `Validity,${q.validity}\n`;
    csvContent += `Prepared By,${q.prepared_by}\n\n`;
    csvContent += `Category,No Of Resources,Monthly Rate,GST,Grand Total\n`;

    q.items.forEach((item: any) => {
      csvContent += `${item.category},${item.no_of_resources},${item.monthly_rate},${item.gst},${item.grand_total}\n`;
    });

    csvContent += `\nTotal Monthly Cost,${q.total_monthly_cost}\n`;
    csvContent += `Total GST,${q.total_gst}\n`;
    csvContent += `Grand Total,${q.total_grand_total}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${q.quotation_number.replace(/\//g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

      {/* Header */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="text-orange-500 w-7 h-7" />
            Quotations
          </h1>
          <p className="text-sm text-slate-400">Generate client-ready commercial proposals from approved calculations.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition shadow-lg shadow-orange-500/10"
        >
          <Plus className="w-4 h-4" />
          Generate Quotation
        </button>
      </div>

      {/* Quotation List */}
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-900/50 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                <th className="py-4 px-6">Quotation No</th>
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Validity</th>
                <th className="py-4 px-6 text-right">Monthly cost</th>
                <th className="py-4 px-6 text-right">Grand Total</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {loading && quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                    Loading quotations...
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No quotations generated yet.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 font-semibold text-white">{q.quotation_number}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-white text-xs">{q.customer_name}</span>
                        <span className="text-[10px] text-slate-400">Unit: {q.unit_code}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-400">
                      {new Date(q.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-400">
                      {new Date(q.validity).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-4 px-6 text-right text-xs font-semibold text-white">
                      {fmtRs(q.total_monthly_cost)}
                    </td>
                    <td className="py-4 px-6 text-right text-xs font-bold text-orange-400">
                      {fmtRs(q.total_grand_total)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handlePreview(q.id)}
                        className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white transition text-xs font-semibold"
                      >
                        Preview Proposal
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Quotation Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-lg">Generate New Quotation</h3>
            <p className="text-xs text-slate-400">Select a commercial calculation sheet to populate and package as a quotation.</p>
            <form onSubmit={handleCreateQuotation} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Select Calculation Sheet</label>
                <select
                  required
                  value={selectedCalcId}
                  onChange={(e) => setSelectedCalcId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none"
                >
                  <option value="">Select calculation sheet...</option>
                  {calculations.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.status}] {c.customer_name} ({c.unit_code || 'Unit'}) - Rev {c.revision_number} (₹{fmt(c.total_grand_total)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Validity (Days)</label>
                  <input
                    type="number"
                    required
                    value={validityDays}
                    onChange={(e) => setValidityDays(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Prepared By</label>
                  <input
                    type="text"
                    required
                    value={preparedBy}
                    onChange={(e) => setPreparedBy(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Terms & Conditions</label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-xs resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Generate Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Proposal Drawer */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto print:relative print:bg-white print:p-0">
          <div className="w-full max-w-4xl max-h-[90vh] bg-slate-950 border border-white/10 rounded-2xl p-6 sm:p-8 overflow-y-auto flex flex-col space-y-6 shadow-2xl my-auto print:border-none print:shadow-none print:bg-white print:text-black print:w-full print:max-h-none print:h-auto print:my-0">
            {/* Header Control Buttons (hidden when printing) */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4 print:hidden">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="text-orange-500 w-5 h-5 animate-pulse" />
                Proposal Preview
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Printer className="w-4 h-4" />
                  Print Proposal (PDF)
                </button>
                <button
                  onClick={() => handleExportExcel(previewItem)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="px-3 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition text-xs font-semibold"
                >
                  Close Preview
                </button>
              </div>
            </div>

            {/* Proposal Layout Content */}
            <div className="flex-1 bg-white p-8 rounded-xl shadow-inner text-slate-800 space-y-8 min-h-[842px] print:p-0 print:shadow-none">
              {/* Proposal Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6">
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">HomeGenny</h1>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">DOMESTIC STAFFING · COMMERCIAL PROPOSAL</p>
                  <p className="text-xs text-slate-500 mt-2">GCP Hub, Delhi NCR · contact@homegenny.com</p>
                </div>
                <div className="text-right space-y-1">
                  <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wide">
                    Quotation
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-2">Proposal #: {previewItem.quotation_number}</p>
                  <p className="text-xs text-slate-500">Date: {new Date(previewItem.date).toLocaleDateString('en-IN')}</p>
                  <p className="text-xs text-slate-500">Validity: {new Date(previewItem.validity).toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-2 gap-8 text-xs">
                <div>
                  <h4 className="font-bold text-slate-500 uppercase tracking-wide mb-1.5">Prepared For:</h4>
                  <p className="text-sm font-extrabold text-slate-900">{previewItem.customer_name}</p>
                  <p className="text-slate-600 mt-1">Unit Code: {previewItem.unit_code}</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-500 uppercase tracking-wide mb-1.5">Prepared By:</h4>
                  <p className="text-sm font-extrabold text-slate-900">{previewItem.prepared_by}</p>
                  <p className="text-slate-600 mt-1">HomeGenny Finance Division</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-700 font-bold">
                    <th className="py-3 px-4">Manpower Category</th>
                    <th className="py-3 px-4 text-center">Resources Count</th>
                    <th className="py-3 px-4 text-right">Monthly Billing / Resource</th>
                    <th className="py-3 px-4 text-right">Total Monthly Billing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {previewItem.items.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="py-3 px-4 font-bold text-slate-900">{item.category}</td>
                      <td className="py-3 px-4 text-center font-semibold">{item.no_of_resources}</td>
                      <td className="py-3 px-4 text-right">{fmtRs(item.monthly_rate)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">{fmtRs(item.monthly_rate * item.no_of_resources)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary Block */}
              <div className="flex justify-end pt-4">
                <div className="w-80 space-y-2 text-xs border-t border-slate-200 pt-4">
                  <div className="flex justify-between text-slate-600">
                    <span>Monthly cost:</span>
                    <span>{fmtRs(previewItem.total_monthly_cost)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>GST (18%):</span>
                    <span>{fmtRs(previewItem.total_gst)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm text-slate-900 border-t border-slate-200 pt-2">
                    <span>Grand Total:</span>
                    <span>{fmtRs(previewItem.total_grand_total)}</span>
                  </div>
                </div>
              </div>

              {/* Terms and Signatures */}
              <div className="border-t border-slate-200 pt-6 space-y-6 text-xs text-slate-500">
                <div>
                  <h4 className="font-bold text-slate-700 uppercase mb-2">Terms & Conditions</h4>
                  <p className="whitespace-pre-line leading-relaxed">{previewItem.terms_conditions}</p>
                </div>
                <div className="flex justify-between pt-12">
                  <div className="w-48 border-t border-slate-300 pt-2 text-center text-[10px]">
                    Authorized Signature (HomeGenny)
                  </div>
                  <div className="w-48 border-t border-slate-300 pt-2 text-center text-[10px]">
                    Accepted Signature (Client)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
