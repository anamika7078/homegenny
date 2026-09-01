'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Spinner } from '@/components/ui/loading';
import { FileText, Users } from 'lucide-react';
import toast from 'react-hot-toast';

function fmtRs(n: number) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;
}

export default function EmployeePayrollsPage() {
  const [activeTab, setActiveTab] = useState<'EMPLOYEES' | 'GENERATED'>('EMPLOYEES');
  const [payrollModal, setPayrollModal] = useState<any | null>(null);
  const [payrollLoading, setPayrollLoading] = useState<string | null>(null);

  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees', 'finance'],
    queryFn: () => api.listEmployees({ limit: 500 }),
  });

  const { data: payrollsData, isLoading: isLoadingPayrolls, refetch: refetchPayrolls } = useQuery({
    queryKey: ['employee-payrolls'],
    queryFn: () => api.getEmployeePayrolls(),
  });

  const employees = Array.isArray(employeesData) ? employeesData : (employeesData as any)?.data?.items ?? (employeesData as any)?.data ?? [];
  const payrolls = Array.isArray(payrollsData) ? payrollsData : (payrollsData as any)?.data ?? [];

  const handlePreviewPayroll = async (empId: string) => {
    setPayrollLoading(empId);
    try {
      const now = new Date();
      const res = await api.previewEmployeePayroll(empId, now.getMonth() + 1, now.getFullYear());
      setPayrollModal(res?.data ?? res);
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Failed to load payroll preview');
    } finally {
      setPayrollLoading(null);
    }
  };

  const handleGeneratePayroll = async (empId: string) => {
    try {
      const now = new Date();
      await api.generateEmployeePayroll(empId, now.getMonth() + 1, now.getFullYear());
      toast.success('Payroll generated successfully');
      setPayrollModal(null);
      refetchPayrolls();
      setActiveTab('GENERATED');
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Failed to generate payroll');
    }
  };

  return (
    <div className="page-padding max-w-[1600px] mx-auto space-y-6">
      {/* Payroll Modal */}
      {payrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">Payroll Preview</h3>
              <button onClick={() => setPayrollModal(null)} className="text-slate-400 hover:text-white text-xl">&times;</button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-slate-400 block text-xs mb-1">Period</span>
                  <span className="text-white font-medium">{payrollModal.period_month}/{payrollModal.period_year}</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-slate-400 block text-xs mb-1">Billable Days</span>
                  <span className="text-white font-medium">{payrollModal.billable_days} / {payrollModal.days_in_month}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm border-t border-white/10 pt-4">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Monthly Salary</span>
                  <span className="text-white">{fmtRs(payrollModal.monthly_salary)}</span>
                </div>
                {/* Gross now folds in approved overtime, bonuses and
                    reimbursements, so show what made it up rather than a single
                    number the employee cannot reconcile to salary × days. */}
                {payrollModal.calculation?.basicProrated != null && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Basic (pro-rated)</span>
                    <span className="text-slate-300">{fmtRs(payrollModal.calculation.basicProrated)}</span>
                  </div>
                )}
                {([
                  ['Overtime', payrollModal.calculation?.overtimeAmount],
                  ['Bonus', payrollModal.calculation?.bonusAmount],
                  ['Reimbursement', payrollModal.calculation?.reimbursementAmount],
                ] as [string, number | undefined][])
                  .filter(([, v]) => Number(v ?? 0) > 0)
                  .map(([label, v]) => (
                    <div key={label} className="flex justify-between py-1">
                      <span className="text-slate-400">{label}</span>
                      <span className="text-emerald-400/80">+{fmtRs(Number(v))}</span>
                    </div>
                  ))}
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Pro-rated Gross</span>
                  <span className="text-white font-medium text-emerald-400">{fmtRs(payrollModal.prorated_gross)}</span>
                </div>
                {payrollModal.calculation?.esicEmployee > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">ESIC Deduction (0.75%)</span>
                    <span className="text-red-400">-{fmtRs(payrollModal.calculation.esicEmployee)}</span>
                  </div>
                )}
                {payrollModal.calculation?.pfEmployee > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">PF Deduction (12%)</span>
                    <span className="text-red-400">-{fmtRs(payrollModal.calculation.pfEmployee)}</span>
                  </div>
                )}
                {/* Everything else payroll now takes off — without these the
                    listed deductions don't explain the net. */}
                {([
                  ['Professional Tax', payrollModal.calculation?.ptDeduction],
                  ['TDS', payrollModal.calculation?.tdsDeduction],
                  ['Loan EMI', payrollModal.calculation?.loanEmiDeduction],
                  ['Salary Advance', payrollModal.calculation?.advanceDeduction],
                ] as [string, number | undefined][])
                  .filter(([, v]) => Number(v ?? 0) > 0)
                  .map(([label, v]) => (
                    <div key={label} className="flex justify-between py-1">
                      <span className="text-slate-400">{label}</span>
                      <span className="text-red-400">-{fmtRs(Number(v))}</span>
                    </div>
                  ))}
                <div className="flex justify-between py-2 border-t border-white/10 mt-2 font-bold text-lg">
                  <span className="text-white">Net Payable</span>
                  <span className="text-white">{fmtRs(payrollModal.calculation?.netSalary ?? 0)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setPayrollModal(null)}
                className="flex-1 py-2 rounded-xl border border-white/10 text-white text-sm font-semibold hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleGeneratePayroll(payrollModal.employee_id)}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
              >
                Generate Payroll
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-purple-500/10 p-2.5">
          <FileText className="h-6 w-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Internal Staff Payroll</h1>
          <p className="text-sm text-slate-400">Generate and view payroll records for internal HR staff.</p>
        </div>
      </div>

      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('EMPLOYEES')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'EMPLOYEES' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Staff & Generation
        </button>
        <button
          onClick={() => setActiveTab('GENERATED')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'GENERATED' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Generated Payrolls
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-background/40 backdrop-blur-xl">
        {activeTab === 'EMPLOYEES' ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Base Salary</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingEmployees ? (
                <tr>
                  <td colSpan={4} className="text-center py-8"><Spinner /></td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400">No active employees found.</td>
                </tr>
              ) : (
                employees.map((emp: any) => (
                  <tr key={emp.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{emp.fullName}</td>
                    <td className="px-4 py-3 text-secondary-foreground">{emp.department ?? '—'}</td>
                    <td className="px-4 py-3 text-secondary-foreground">{fmtRs(Number(emp.salary))}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handlePreviewPayroll(emp.id)}
                        disabled={payrollLoading === emp.id}
                        className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition disabled:opacity-50"
                      >
                        {payrollLoading === emp.id ? <Spinner /> : <FileText className="w-3.5 h-3.5" />}
                        Generate Payroll
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Period</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Days Present</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Gross Salary</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Net Salary</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingPayrolls ? (
                <tr>
                  <td colSpan={6} className="text-center py-8"><Spinner /></td>
                </tr>
              ) : payrolls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">No payroll records found.</td>
                </tr>
              ) : (
                payrolls.map((p: any) => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white">{p.periodMonth}/{p.periodYear}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{p.employee?.fullName ?? 'Unknown'}</div>
                      <div className="text-xs text-slate-400">{p.employee?.department ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-secondary-foreground">{p.presentDays}</td>
                    <td className="px-4 py-3 text-secondary-foreground">{fmtRs(Number(p.grossSalary))}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-400">{fmtRs(Number(p.netSalary))}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-400">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
