'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Spinner } from '@/components/ui/loading';
import { Users, Plus, FileText, LogOut, DollarSign } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { unwrapItems } from '@/lib/hr/utils';

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HrEmployeesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employees', 'hr'],
    queryFn: () => api.listEmployees({ limit: 100 }),
  });

  const employees = unwrapItems(data);

  const [exitModal, setExitModal] = useState<any | null>(null);
  const [exitForm, setExitForm] = useState({
    channel: 'ONLINE' as 'ONLINE' | 'OFFLINE',
    reason: '',
    exitDate: todayIso(),
    notes: '',
  });
  const [exitSaving, setExitSaving] = useState(false);

  const openExit = (emp: any) => {
    setExitForm({
      channel: 'ONLINE',
      reason: '',
      exitDate: todayIso(),
      notes: '',
    });
    setExitModal(emp);
  };

  const submitExit = async () => {
    if (!exitModal?.id) return;
    if (!exitForm.reason.trim()) {
      toast.error('Please enter a resignation / exit reason');
      return;
    }
    setExitSaving(true);
    try {
      await api.exitEmployee(exitModal.id, {
        channel: exitForm.channel,
        reason: exitForm.reason.trim(),
        exitDate: exitForm.exitDate,
        notes: exitForm.notes.trim() || undefined,
      });
      toast.success(
        `${exitModal.fullName} marked as Resigned (${exitForm.channel === 'ONLINE' ? 'Online' : 'Offline'} exit)`,
      );
      setExitModal(null);
      queryClient.invalidateQueries({ queryKey: ['employees', 'hr'] });
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to process exit';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setExitSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-padding max-w-[1600px] mx-auto py-24 text-center">
        <p className="text-red-400 text-sm">Failed to load employees. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="page-padding max-w-[1600px] mx-auto space-y-6">
      {exitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-lg">Staff Exit / Resignation</h3>
                <p className="text-sm text-secondary-foreground">
                  {exitModal.fullName} ({exitModal.employeeId})
                </p>
              </div>
              <button onClick={() => setExitModal(null)} className="text-slate-400 hover:text-white text-xl">
                &times;
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">Exit type</label>
              <div className="grid grid-cols-2 gap-2">
                {(['ONLINE', 'OFFLINE'] as const).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setExitForm((f) => ({ ...f, channel: ch }))}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      exitForm.channel === ch
                        ? 'border-primary bg-primary/20 text-white'
                        : 'border-white/10 bg-white/5 text-secondary-foreground hover:bg-white/10'
                    }`}
                  >
                    {ch === 'ONLINE' ? 'Online exit' : 'Offline exit'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">Exit date</label>
              <input
                type="date"
                value={exitForm.exitDate}
                onChange={(e) => setExitForm((f) => ({ ...f, exitDate: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">Reason *</label>
              <textarea
                rows={3}
                placeholder="e.g. Personal reasons, better opportunity, end of contract…"
                value={exitForm.reason}
                onChange={(e) => setExitForm((f) => ({ ...f, reason: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white placeholder:text-secondary-foreground/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">Notes (optional)</label>
              <textarea
                rows={2}
                placeholder="Clearance / asset return notes…"
                value={exitForm.notes}
                onChange={(e) => setExitForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white placeholder:text-secondary-foreground/50"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setExitModal(null)}
                className="flex-1 rounded-xl border border-white/10 py-2 text-sm font-semibold text-white hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitExit}
                disabled={exitSaving}
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-500 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {exitSaving ? 'Processing…' : 'Confirm Exit'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/10 p-2.5">
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Employees</h1>
            <p className="text-sm text-secondary-foreground">{employees.length} records found</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/hr/payroll"
            className="hidden sm:flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <DollarSign className="h-4 w-4 text-emerald-400" />
            Salary Slips
          </Link>
          {/*
            Onboarding, not a blank create form: an employee is a pipeline
            candidate who reached S5_DEPLOY, so the first step is choosing that
            person. See ONE_STAFF_MODEL_PLAN.md §F4.
          */}
          <Link
            href="/hr/onboarding"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Onboard Employee
          </Link>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-background/40 p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-secondary-foreground/40 mb-3" />
          <p className="text-secondary-foreground text-sm">No employees found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-background/40 backdrop-blur-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp: any) => {
                const isActive = emp.status === 'Active';
                const isResigned = emp.status === 'Resigned';
                return (
                  <tr key={emp.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-secondary-foreground">{emp.employeeId ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-white">
                      <Link href={`/hr/employees/${emp.id}`} className="hover:text-primary">
                        {emp.fullName ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-secondary-foreground">{emp.mobile ?? '—'}</td>
                    <td className="px-4 py-3 text-secondary-foreground">
                      {emp.category?.name ?? emp.department ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            isActive
                              ? 'bg-green-500/20 text-green-400'
                              : isResigned
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {emp.status ?? '—'}
                        </span>
                        {isResigned && emp.emergencyContact?.exit?.channel && (
                          <p className="text-[11px] text-secondary-foreground">
                            {emp.emergencyContact.exit.channel === 'ONLINE' ? 'Online' : 'Offline'} exit
                            {emp.emergencyContact.exit.exitDate
                              ? ` · ${emp.emergencyContact.exit.exitDate}`
                              : ''}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/hr/employees/${emp.id}/documents`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5 text-blue-400" />
                          Documents
                        </Link>
                        <Link
                          href={`/hr/payroll?employeeId=${emp.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors"
                        >
                          <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                          Salary Slip
                        </Link>
                        {!isResigned && (
                          <button
                            type="button"
                            onClick={() => openExit(emp)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 transition-colors"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            Exit
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
  );
}
