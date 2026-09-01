'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Spinner } from '@/components/ui/loading';
import { FileText, Printer, Users, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { unwrapData, unwrapItems } from '@/lib/hr/utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function fmtRs(n: number) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;
}

function todayParts() {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

function HrSalarySlipsContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const focusEmployeeId = searchParams.get('employeeId') || '';

  const now = todayParts();
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const [activeTab, setActiveTab] = useState<'GENERATE' | 'SLIPS'>('GENERATE');
  const [slipModal, setSlipModal] = useState<any | null>(null);
  const [slipReadOnly, setSlipReadOnly] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const yearOptions = [now.year - 1, now.year, now.year + 1];

  const { data: empRaw, isLoading: empLoading } = useQuery({
    queryKey: ['employees', 'hr', 'payroll'],
    queryFn: () => api.listEmployees({ limit: 200, status: 'Active' }),
  });

  const {
    data: payrollsRaw,
    isLoading: payrollsLoading,
    refetch: refetchPayrolls,
  } = useQuery({
    queryKey: ['employee-payrolls', 'hr'],
    queryFn: () => api.getEmployeePayrolls(),
  });

  const employees = unwrapItems(empRaw).filter((e: any) =>
    focusEmployeeId ? e.id === focusEmployeeId : true,
  );
  const payrolls = useMemo(() => {
    const nested = unwrapData(payrollsRaw);
    const rows = Array.isArray(payrollsRaw)
      ? payrollsRaw
      : Array.isArray(nested)
        ? nested
        : unwrapItems(payrollsRaw);
    return focusEmployeeId
      ? rows.filter((p: any) => p.employeeId === focusEmployeeId || p.employee_id === focusEmployeeId)
      : rows;
  }, [payrollsRaw, focusEmployeeId]);

  const openPreview = async (empId: string, empName?: string) => {
    setLoadingId(empId);
    setSlipReadOnly(false);
    try {
      const res = await api.previewEmployeePayroll(empId, month, year);
      const preview = unwrapData(res) ?? res;
      setSlipModal({ ...preview, employeeName: empName });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load salary slip preview');
    } finally {
      setLoadingId(null);
    }
  };

  const openSavedSlip = (p: any) => {
    const deductions =
      typeof p.deductions === 'string'
        ? (() => {
            try {
              return JSON.parse(p.deductions);
            } catch {
              return {};
            }
          })()
        : p.deductions ?? {};
    const gross = Number(p.grossSalary ?? p.gross_salary ?? 0);
    const net = Number(p.netSalary ?? p.net_salary ?? 0);
    // Payroll now records professional tax, TDS, loan EMI and advance recovery
    // alongside ESIC and PF. Reading only the first two would show a slip whose
    // deductions don't account for the difference between gross and net.
    const esic = Number(deductions.esic ?? 0);
    const pf = Number(deductions.pf ?? 0);
    const professionalTax = Number(deductions.professionalTax ?? 0);
    const tds = Number(deductions.tds ?? 0);
    const loanEmi = Number(deductions.loanEmi ?? 0);
    const advance = Number(deductions.advance ?? 0);
    const totalDeductions = esic + pf + professionalTax + tds + loanEmi + advance;
    const periodMonth = Number(p.periodMonth ?? p.period_month);
    const periodYear = Number(p.periodYear ?? p.period_year);
    const presentDays = Number(p.presentDays ?? p.present_days ?? 0);
    const daysInMonth = new Date(periodYear, periodMonth, 0).getDate();

    setSlipReadOnly(true);
    setSlipModal({
      employee_id: p.employeeId ?? p.employee_id,
      employeeName: p.employeeName ?? p.employee?.fullName ?? 'Staff',
      period_month: periodMonth,
      period_year: periodYear,
      billable_days: presentDays,
      days_in_month: daysInMonth,
      present_days: presentDays,
      monthly_salary: gross,
      prorated_gross: gross,
      calculation: {
        grossSalary: gross,
        esicEmployee: esic,
        pfEmployee: pf,
        ptDeduction: professionalTax,
        tdsDeduction: tds,
        loanEmiDeduction: loanEmi,
        advanceDeduction: advance,
        totalDeductions,
        netSalary: net,
      },
    });
  };

  const generateSlip = async () => {
    if (!slipModal?.employee_id) return;
    setLoadingId(slipModal.employee_id);
    try {
      await api.generateEmployeePayroll(
        slipModal.employee_id,
        slipModal.period_month ?? month,
        slipModal.period_year ?? year,
      );
      toast.success('Salary slip saved');
      setSlipModal(null);
      setActiveTab('SLIPS');
      await refetchPayrolls();
      queryClient.invalidateQueries({ queryKey: ['employee-payrolls'] });
    } catch (e: any) {
      const msg = e?.message || 'Failed to generate salary slip';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="page-padding max-w-[1600px] mx-auto space-y-6">
      {slipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 print:static print:bg-white print:p-0">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl print:bg-white print:text-black print:border-0 print:shadow-none print:max-w-none">
            <div className="flex items-center justify-between print:hidden">
              <h3 className="font-bold text-white text-lg">
                {slipReadOnly ? 'Salary Slip' : 'Salary Slip Preview'}
              </h3>
              <button onClick={() => setSlipModal(null)} className="text-slate-400 hover:text-white text-xl">
                &times;
              </button>
            </div>

            <div className="text-center border-b border-white/10 pb-3 print:border-black/20">
              <p className="text-xs uppercase tracking-widest text-secondary-foreground print:text-slate-600">
                HomeGenny
              </p>
              <h4 className="text-lg font-bold text-white print:text-black">Monthly Salary Slip</h4>
              <p className="text-sm text-secondary-foreground print:text-slate-700">
                {slipModal.employeeName ?? 'Staff'} · {MONTHS[(slipModal.period_month ?? month) - 1]}{' '}
                {slipModal.period_year ?? year}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 print:border print:border-slate-300 print:bg-transparent">
                <span className="text-slate-400 block text-xs mb-1 print:text-slate-600">Billable Days</span>
                <span className="text-white font-medium print:text-black">
                  {slipModal.billable_days} / {slipModal.days_in_month}
                </span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 print:border print:border-slate-300 print:bg-transparent">
                <span className="text-slate-400 block text-xs mb-1 print:text-slate-600">Present</span>
                <span className="text-white font-medium print:text-black">{slipModal.present_days ?? '—'}</span>
              </div>
            </div>

            <div className="space-y-2 text-sm border-t border-white/10 pt-4 print:border-black/20">
              <div className="flex justify-between py-1">
                <span className="text-slate-400 print:text-slate-600">Monthly Salary</span>
                <span className="text-white print:text-black">{fmtRs(Number(slipModal.monthly_salary ?? 0))}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400 print:text-slate-600">Pro-rated Gross</span>
                <span className="text-emerald-400 font-medium print:text-black">
                  {fmtRs(Number(slipModal.prorated_gross ?? 0))}
                </span>
              </div>
              {(slipModal.calculation?.esicEmployee ?? 0) > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 print:text-slate-600">ESIC (0.75%)</span>
                  <span className="text-red-400 print:text-black">
                    -{fmtRs(Number(slipModal.calculation.esicEmployee))}
                  </span>
                </div>
              )}
              {(slipModal.calculation?.pfEmployee ?? 0) > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 print:text-slate-600">PF (12%)</span>
                  <span className="text-red-400 print:text-black">
                    -{fmtRs(Number(slipModal.calculation.pfEmployee))}
                  </span>
                </div>
              )}
              {/* Payroll deducts professional tax, TDS and loan/advance recovery
                  too. Listing only ESIC and PF left a gap between what the slip
                  showed and the net it paid. */}
              {([
                ['Professional Tax', slipModal.calculation?.ptDeduction],
                ['TDS', slipModal.calculation?.tdsDeduction],
                ['Loan EMI', slipModal.calculation?.loanEmiDeduction],
                ['Salary Advance', slipModal.calculation?.advanceDeduction],
              ] as [string, number | undefined][])
                .filter(([, v]) => Number(v ?? 0) > 0)
                .map(([label, v]) => (
                  <div key={label} className="flex justify-between py-1">
                    <span className="text-slate-400 print:text-slate-600">{label}</span>
                    <span className="text-red-400 print:text-black">-{fmtRs(Number(v))}</span>
                  </div>
                ))}
              {(slipModal.calculation?.totalDeductions ?? 0) > 0 && (
                <div className="flex justify-between py-1 border-t border-white/5 pt-2">
                  <span className="text-slate-400 print:text-slate-600">Total Deductions</span>
                  <span className="text-red-400 print:text-black">
                    -{fmtRs(Number(slipModal.calculation.totalDeductions))}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t border-white/10 mt-2 font-bold text-lg print:border-black/20">
                <span className="text-white print:text-black">Net Payable</span>
                <span className="text-white print:text-black">
                  {fmtRs(Number(slipModal.calculation?.netSalary ?? 0))}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl border border-white/10 text-white text-sm font-semibold hover:bg-white/5 transition inline-flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
              {!slipReadOnly && (
                <button
                  onClick={generateSlip}
                  disabled={loadingId === slipModal.employee_id}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition disabled:opacity-50"
                >
                  {loadingId === slipModal.employee_id ? 'Saving…' : 'Save Salary Slip'}
                </button>
              )}
              {slipReadOnly && (
                <button
                  onClick={() => setSlipModal(null)}
                  className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-2.5">
            <FileText className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Salary Slips</h1>
            <p className="text-sm text-secondary-foreground">
              Generate and view salary slips for internal HR staff
              {focusEmployeeId ? ' (filtered employee)' : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-white"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-white"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('GENERATE')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'GENERATE' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Generate Slip
        </button>
        <button
          onClick={() => setActiveTab('SLIPS')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'SLIPS' ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Saved Slips
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-background/40 backdrop-blur-xl">
        {activeTab === 'GENERATE' ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Salary
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {empLoading ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center">
                    <Spinner />
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-secondary-foreground">
                    <Users className="mx-auto h-8 w-8 opacity-40 mb-2" />
                    No active employees found.
                  </td>
                </tr>
              ) : (
                employees.map((emp: any) => (
                  <tr key={emp.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{emp.fullName}</div>
                      <div className="text-xs text-secondary-foreground">{emp.employeeId}</div>
                    </td>
                    <td className="px-4 py-3 text-secondary-foreground">
                      {emp.category?.name ?? emp.department ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-secondary-foreground">{fmtRs(Number(emp.salary ?? 0))}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openPreview(emp.id, emp.fullName)}
                        disabled={loadingId === emp.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 disabled:opacity-50"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {loadingId === emp.id ? 'Loading…' : 'Salary Slip'}
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Period
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Days
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Gross
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Net
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {payrollsLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <Spinner />
                  </td>
                </tr>
              ) : payrolls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-secondary-foreground">
                    No salary slips generated yet.
                  </td>
                </tr>
              ) : (
                payrolls.map((p: any) => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white">
                      {MONTHS[(p.periodMonth ?? p.period_month) - 1] ?? p.periodMonth}/{p.periodYear ?? p.period_year}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">
                        {p.employeeName ?? p.employee?.fullName ?? '—'}
                      </div>
                      <div className="text-xs text-secondary-foreground">
                        {p.employeeCode ?? p.department ?? '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-secondary-foreground">
                      {p.presentDays ?? p.present_days ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-secondary-foreground">
                      {fmtRs(Number(p.grossSalary ?? p.gross_salary ?? 0))}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-400">
                      {fmtRs(Number(p.netSalary ?? p.net_salary ?? 0))}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-yellow-500/10 px-2 py-1 text-xs text-yellow-400">
                        {p.status ?? 'PENDING'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openSavedSlip(p)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                      >
                        <Eye className="h-3.5 w-3.5 text-emerald-400" />
                        View
                      </button>
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

export default function HrSalarySlipsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      }
    >
      <HrSalarySlipsContent />
    </Suspense>
  );
}
