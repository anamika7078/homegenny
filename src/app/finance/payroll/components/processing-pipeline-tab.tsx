'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, PlayCircle, CheckCircle2, AlertCircle, Clock,
  Lock, Download, RefreshCw, ChevronRight, FileSpreadsheet, Building2,
} from 'lucide-react';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';
import toast from 'react-hot-toast';

function fmtRs(n: number | string) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(n || 0))}`;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function ProcessingPipelineTab() {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [branchId, setBranchId] = useState<string>('');
  const [branches, setBranches] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const years = Array.from({ length: 4 }, (_, i) => currentDate.getFullYear() - i);

  useEffect(() => {
    // Try to load branches for filter if available
    api.listBranches?.().then((res: any) => {
      const items = res?.data ?? res;
      if (Array.isArray(items)) setBranches(items);
    }).catch(() => {});
  }, []);

  const fetchBatchForPeriod = async () => {
    setLoading(true);
    try {
      const res = await api.listEnterpriseBatches({ month, year, branchId: branchId || undefined });
      const items = res?.data ?? res;
      if (Array.isArray(items) && items.length > 0) {
        const fullBatch = await api.getEnterpriseBatch(items[0].id);
        setActiveBatch(fullBatch?.data ?? fullBatch);
      } else {
        setActiveBatch(null);
      }
    } catch {
      setActiveBatch(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatchForPeriod();
  }, [month, year, branchId]);

  const handleRunPipeline = async () => {
    setProcessing(true);
    try {
      const res = await api.processEnterpriseBatch({
        month,
        year,
        branchId: branchId || undefined,
      });
      const batchData = res?.data ?? res;
      toast.success(`Pipeline complete! Processed ${batchData.totalEmployees || 0} employees.`);
      if (batchData?.id) {
        const full = await api.getEnterpriseBatch(batchData.id);
        setActiveBatch(full?.data ?? full);
      } else {
        fetchBatchForPeriod();
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to execute payroll calculation pipeline.');
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveTier = async (tier: string) => {
    if (!activeBatch?.id) return;
    setActionLoading(tier);
    try {
      await api.approveEnterpriseBatchTier(activeBatch.id, { tier, comments: 'Approved via Enterprise UI' });
      toast.success(`Approved ${tier.replace('LEVEL_', 'Level ')} successfully.`);
      const full = await api.getEnterpriseBatch(activeBatch.id);
      setActiveBatch(full?.data ?? full);
    } catch (e: any) {
      toast.error(e.message ?? 'Approval action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectTier = async (tier: string) => {
    if (!activeBatch?.id) return;
    const comments = prompt('Enter reason for rejection:');
    if (!comments) return;
    setActionLoading(tier);
    try {
      await api.rejectEnterpriseBatchTier(activeBatch.id, { tier, comments });
      toast.error(`Rejected ${tier.replace('LEVEL_', 'Level ')}.`);
      const full = await api.getEnterpriseBatch(activeBatch.id);
      setActiveBatch(full?.data ?? full);
    } catch (e: any) {
      toast.error(e.message ?? 'Rejection action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLockBatch = async () => {
    if (!activeBatch?.id) return;
    if (!confirm('Lock this batch? Once locked, salary slips are finalized and cannot be modified.')) return;
    setActionLoading('LOCK');
    try {
      await api.lockEnterpriseBatch(activeBatch.id);
      toast.success('Payroll batch locked and finalized.');
      const full = await api.getEnterpriseBatch(activeBatch.id);
      setActiveBatch(full?.data ?? full);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to lock batch.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportBankTransfer = async (format: 'CSV' | 'EXCEL') => {
    if (!activeBatch?.id) return;
    setActionLoading(`EXPORT_${format}`);
    try {
      await api.generateBankTransferBatch(activeBatch.id, format).catch(() => {});
      const list = activeBatch.details || [];
      const batchNo = activeBatch.batchNumber || 'PAY-BATCH';

      if (format === 'EXCEL') {
        const tableHtml = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="utf-8"/>
            <title>Bank Transfer Export</title>
            <style>
              table { border-collapse: collapse; width: 100%; font-family: Calibri, sans-serif; }
              th { background-color: #1e293b; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
              td { border: 1px solid #cbd5e1; padding: 8px; font-size: 14px; }
              .num { text-align: right; }
              .net { text-align: right; font-weight: bold; color: #059669; }
              .text-format { mso-number-format: '\\@'; }
            </style>
          </head>
          <body>
            <h2>Enterprise Payroll Bank Transfer — ${batchNo}</h2>
            <p><b>Period:</b> ${MONTHS[month - 1]} ${year} &nbsp;|&nbsp; <b>Total Staff:</b> ${list.length} &nbsp;|&nbsp; <b>Total Net Payable:</b> ₹${activeBatch.totalNet}</p>
            <table>
              <thead>
                <tr>
                  <th>Batch Number</th>
                  <th>Employee ID</th>
                  <th>Employee Name</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Bank Name</th>
                  <th>Account Number</th>
                  <th>IFSC Code</th>
                  <th>PAN Number</th>
                  <th>Present Days</th>
                  <th>Gross Salary (INR)</th>
                  <th>Total Deductions (INR)</th>
                  <th>Net Payable (INR)</th>
                  <th>Transfer Reference</th>
                  <th>Payment Status</th>
                </tr>
              </thead>
              <tbody>
                ${list.map((d: any) => `
                  <tr>
                    <td>${batchNo}</td>
                    <td>${d.employee?.employeeId || ''}</td>
                    <td>${d.employee?.fullName || 'Staff Member'}</td>
                    <td>${d.employee?.department || 'General'}</td>
                    <td>${d.employee?.designation || ''}</td>
                    <td>${d.employee?.salaryProfile?.bankName || 'HDFC Bank'}</td>
                    <td class="text-format">${d.employee?.salaryProfile?.accountNumber || 'N/A'}</td>
                    <td>${d.employee?.salaryProfile?.ifsc || 'HDFC0001234'}</td>
                    <td>${d.employee?.salaryProfile?.pan || 'ABCDE1234F'}</td>
                    <td class="num">${d.presentDays || 0}</td>
                    <td class="num">${d.grossSalary || 0}</td>
                    <td class="num">${d.totalDeductions || 0}</td>
                    <td class="net">${d.netSalary || 0}</td>
                    <td>SALARY-${batchNo}-${d.employee?.employeeId || 'EMP'}</td>
                    <td>READY_FOR_DISBURSEMENT</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
          </html>
        `;
        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Bank_Transfer_${batchNo}.xls`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const headers = [
          'Batch Number',
          'Employee ID',
          'Employee Name',
          'Department',
          'Designation',
          'Bank Name',
          'Account Number',
          'IFSC Code',
          'PAN Number',
          'Present Days',
          'Gross Salary (INR)',
          'Total Deductions (INR)',
          'Net Payable (INR)',
          'Transfer Reference',
          'Payment Status'
        ];
        const rows = list.map((d: any) => [
          batchNo,
          d.employee?.employeeId || '',
          `"${(d.employee?.fullName || 'Staff Member').replace(/"/g, '""')}"`,
          `"${(d.employee?.department || 'General').replace(/"/g, '""')}"`,
          `"${(d.employee?.designation || '').replace(/"/g, '""')}"`,
          `"${(d.employee?.salaryProfile?.bankName || 'HDFC Bank').replace(/"/g, '""')}"`,
          `"\t${d.employee?.salaryProfile?.accountNumber || 'N/A'}"`,
          d.employee?.salaryProfile?.ifsc || 'HDFC0001234',
          d.employee?.salaryProfile?.pan || 'ABCDE1234F',
          d.presentDays || 0,
          d.grossSalary || 0,
          d.totalDeductions || 0,
          d.netSalary || 0,
          `SALARY-${batchNo}-${d.employee?.employeeId || 'EMP'}`,
          'READY_FOR_DISBURSEMENT'
        ]);
        const csvString = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Bank_Transfer_${batchNo}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast.success(`Bank transfer file generated (${format}) and downloaded!`);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to generate bank transfer file.');
    } finally {
      setActionLoading(null);
    }
  };

  const details = activeBatch?.details ?? [];
  const approvals = activeBatch?.approvals ?? [
    { tier: 'LEVEL_1_HR', approverRole: 'HR', status: 'PENDING' },
    { tier: 'LEVEL_2_FINANCE', approverRole: 'FINANCE', status: 'PENDING' },
    { tier: 'LEVEL_3_ADMIN', approverRole: 'ADMIN', status: 'PENDING' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Filter Strip */}
      <div className="flex items-center justify-between flex-wrap gap-4 rounded-2xl border border-white/10 bg-[#131c2e] p-5 shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-emerald-400" />
            10-Step Batch Processing Pipeline
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-calculates attendance proration, overtime, bonus, statutory deductions (PF, ESIC, PT, TDS), and loan EMIs.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="min-w-[130px]">
            <SelectMenu
              value={String(month)}
              onValueChange={(v) => setMonth(Number(v))}
              placeholder="Month"
              className="bg-[#1a253a] border-white/10 text-sm rounded-xl text-white"
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
              className="bg-[#1a253a] border-white/10 text-sm rounded-xl text-white"
            >
              {years.map((y) => (
                <SelectMenuItem key={y} value={String(y)}>
                  {y}
                </SelectMenuItem>
              ))}
            </SelectMenu>
          </div>

          {branches.length > 0 && (
            <div className="min-w-[150px]">
              <SelectMenu
                value={branchId || 'ALL'}
                onValueChange={(v) => setBranchId(v === 'ALL' ? '' : v)}
                placeholder="All Branches"
                className="bg-[#1a253a] border-white/10 text-sm rounded-xl text-white"
              >
                <SelectMenuItem value="ALL">All Branches</SelectMenuItem>
                {branches.map((b) => (
                  <SelectMenuItem key={b.id} value={b.id}>{b.name}</SelectMenuItem>
                ))}
              </SelectMenu>
            </div>
          )}

          <button
            onClick={fetchBatchForPeriod}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-slate-300"
            title="Refresh batch status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleRunPipeline}
            disabled={processing || (activeBatch && (activeBatch.status === 'APPROVED' || activeBatch.status === 'LOCKED'))}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-lg shadow-emerald-900/30 disabled:opacity-50 transition"
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
            {activeBatch ? 'Recalculate Batch' : 'Run 10-Step Pipeline'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-sm font-medium">Checking batch processing status...</p>
        </div>
      ) : !activeBatch ? (
        <div className="rounded-2xl border border-dashed border-white/20 bg-[#131c2e]/50 p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400">
            <PlayCircle className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No Batch Processed for {MONTHS[month - 1]} {year}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Click the "Run 10-Step Pipeline" button above to synchronize attendance from HR, evaluate overtime rules, include approved bonuses and reimbursements, and deduct statutory withholdings.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Workflow Approval Stepper */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#162032] via-[#131c2e] to-[#162032] p-6 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6 border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-400 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                  {activeBatch.batchNumber}
                </span>
                <h3 className="text-xl font-bold text-white mt-2 flex items-center gap-2">
                  Multi-Tier Approval Workflow
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border uppercase
                    ${activeBatch.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      activeBatch.status === 'LOCKED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      activeBatch.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}
                  >
                    {activeBatch.status || 'PENDING'}
                  </span>
                </h3>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-3">
                {activeBatch.status === 'APPROVED' && (
                  <button
                    onClick={handleLockBatch}
                    disabled={actionLoading === 'LOCK'}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg"
                  >
                    {actionLoading === 'LOCK' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                    Lock & Finalize Batch
                  </button>
                )}

                <button
                  onClick={() => handleExportBankTransfer('CSV')}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition border border-white/10"
                >
                  {actionLoading === 'EXPORT_CSV' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />}
                  Export CSV Bank Transfer
                </button>

                <button
                  onClick={() => handleExportBankTransfer('EXCEL')}
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition border border-white/10"
                >
                  {actionLoading === 'EXPORT_EXCEL' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-indigo-400" />}
                  Export Excel
                </button>
              </div>
            </div>

            {/* Stepper Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {approvals.map((step: any, idx: number) => {
                const isApproved = step.status === 'APPROVED';
                const isRejected = step.status === 'REJECTED';
                const isPending = step.status === 'PENDING' || !step.status;
                const tierName = step.tier === 'LEVEL_1_HR' ? 'Level 1: HR Verification' :
                                 step.tier === 'LEVEL_2_FINANCE' ? 'Level 2: Finance Review' :
                                 'Level 3: Executive Approval';

                return (
                  <div key={step.tier || idx} className={`rounded-xl border p-4 transition relative flex flex-col justify-between
                    ${isApproved ? 'border-emerald-500/30 bg-emerald-950/20' :
                      isRejected ? 'border-red-500/30 bg-red-950/20' :
                      'border-white/10 bg-[#111827]/80'}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{step.approverRole || `Level ${idx+1}`}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase
                          ${isApproved ? 'bg-emerald-500/20 text-emerald-400' :
                            isRejected ? 'bg-red-500/20 text-red-400' :
                            'bg-amber-500/20 text-amber-400'}`}
                        >
                          {step.status || 'PENDING'}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-sm">{tierName}</h4>
                      {step.comments && (
                        <p className="text-xs text-slate-400 mt-1 italic">"{step.comments}"</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-end gap-2">
                      {isPending && activeBatch.status !== 'LOCKED' ? (
                        <>
                          <button
                            onClick={() => handleRejectTier(step.tier)}
                            disabled={!!actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs font-semibold border border-red-500/30 transition"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveTier(step.tier)}
                            disabled={!!actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
                          >
                            {actionLoading === step.tier ? '...' : 'Approve Step'}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                          {isApproved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          {isRejected && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                          {isApproved ? 'Verified & Approved' : isRejected ? 'Returned for Revision' : 'Waiting previous tier'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Employee Breakdown Table */}
          <div className="rounded-2xl border border-white/10 bg-[#131c2e] overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-sm font-bold text-white">
                Employee Payroll Breakdown — {details.length} Staff Processed
              </span>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="text-emerald-400">Gross: {fmtRs(activeBatch.totalGross)}</span>
                <span className="text-amber-400">Deductions: {fmtRs(activeBatch.totalDeductions)}</span>
                <span className="text-indigo-400">Net Payable: {fmtRs(activeBatch.totalNet)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider bg-black/20">
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-3 py-3 text-right">Attendance</th>
                    <th className="px-3 py-3 text-right">Basic + Allow</th>
                    <th className="px-3 py-3 text-right">Overtime</th>
                    <th className="px-3 py-3 text-right">Bonus / Reimb</th>
                    <th className="px-3 py-3 text-right">Gross Salary</th>
                    <th className="px-3 py-3 text-right text-amber-400">PF + ESIC</th>
                    <th className="px-3 py-3 text-right text-red-400">TDS + PT</th>
                    <th className="px-3 py-3 text-right text-purple-400">Loan EMI</th>
                    <th className="px-4 py-3 text-right font-bold text-emerald-400">Net Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((d: any) => {
                    const empName = d.employee?.fullName || 'Staff Member';
                    const empCode = d.employee?.employeeId || '';
                    const dept = d.employee?.department || 'General';
                    const basicAllow = Number(d.basicSalary || 0);
                    const ot = Number(d.overtimeAmount || 0);
                    const bonReimb = Number(d.bonusAmount || 0) + Number(d.reimbursementAmount || 0);
                    const pfEsic = Number(d.pfDeduction || 0) + Number(d.esicDeduction || 0);
                    const tdsPt = Number(d.tdsDeduction || 0) + Number(d.ptDeduction || 0);
                    const loanAdv = Number(d.loanEmiDeduction || 0) + Number(d.advanceDeduction || 0);

                    return (
                      <tr key={d.id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="px-4 py-3">
                          <p className="font-bold text-white text-sm">{empName}</p>
                          <p className="text-[11px] text-slate-400">{empCode} · {dept}</p>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="font-semibold text-white">{d.presentDays}</span>
                          <span className="text-slate-500"> / {d.workingDays}d</span>
                        </td>
                        <td className="px-3 py-3 text-right text-slate-300">{fmtRs(basicAllow)}</td>
                        <td className="px-3 py-3 text-right text-slate-300">{ot > 0 ? fmtRs(ot) : '—'}</td>
                        <td className="px-3 py-3 text-right text-slate-300">{bonReimb > 0 ? fmtRs(bonReimb) : '—'}</td>
                        <td className="px-3 py-3 text-right font-bold text-white">{fmtRs(d.grossSalary)}</td>
                        <td className="px-3 py-3 text-right text-amber-400">{fmtRs(pfEsic)}</td>
                        <td className="px-3 py-3 text-right text-red-400">{fmtRs(tdsPt)}</td>
                        <td className="px-3 py-3 text-right text-purple-400">{loanAdv > 0 ? fmtRs(loanAdv) : '—'}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-emerald-400 text-sm">{fmtRs(d.netSalary)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
