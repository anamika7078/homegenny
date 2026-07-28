'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, UserCheck, DollarSign, Building, Edit,
  TrendingUp, Search, CheckCircle2, History, X, Plus,
} from 'lucide-react';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';
import toast from 'react-hot-toast';

function fmtRs(n: number | string) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(n || 0))}`;
}

export function EmployeeSalaryTab() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [isAssignModal, setIsAssignModal] = useState(false);
  const [isReviseModal, setIsReviseModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Assign Form State
  const [templateId, setTemplateId] = useState('');
  const [grossSalary, setGrossSalary] = useState(35000);
  const [bankName, setBankName] = useState('HDFC Bank');
  const [accountNumber, setAccountNumber] = useState('50100293847582');
  const [ifsc, setIfsc] = useState('HDFC0001234');
  const [panNumber, setPanNumber] = useState('ABCDE1234F');
  const [pfUan, setPfUan] = useState('100928374652');

  // Revise Form State
  const [newGross, setNewGross] = useState(40000);
  const [revisionType, setRevisionType] = useState('INCREMENT');
  const [notes, setNotes] = useState('Annual appraisal promotion');

  const loadData = async () => {
    setLoading(true);
    try {
      const [profRes, tempRes] = await Promise.all([
        api.listEmployeeSalaries({ search: search || undefined }),
        api.listSalaryStructures(),
      ]);
      const profItems = profRes?.data ?? profRes;
      setProfiles(Array.isArray(profItems) ? profItems : []);
      const tempItems = tempRes?.data ?? tempRes;
      setTemplates(Array.isArray(tempItems) ? tempItems : []);
    } catch {
      toast.error('Failed to load employee salary profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp?.employee?.id && !selectedEmp?.id) return;
    const empId = selectedEmp.employee?.id || selectedEmp.id;

    setSubmitting(true);
    try {
      await api.assignEmployeeSalaryProfile({
        employeeId: empId,
        templateId: templateId || undefined,
        grossSalary: Number(grossSalary),
        bankName,
        accountNumber,
        ifsc,
        pan: panNumber,
        panNumber,
        uan: pfUan,
        pfUan,
      });
      toast.success('Employee salary profile and bank details updated!');
      setIsAssignModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update salary profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp?.employee?.id && !selectedEmp?.id) return;
    const empId = selectedEmp.employee?.id || selectedEmp.id;

    setSubmitting(true);
    try {
      await api.reviseEmployeeSalary(empId, {
        newGross: Number(newGross),
        revisionType,
        effectiveDate: new Date().toISOString(),
        notes,
        approvedBy: 'Finance Director',
      });
      toast.success('Salary revision submitted and effective immediately!');
      setIsReviseModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to revise salary.');
    } finally {
      setSubmitting(false);
    }
  };

  const openAssignModal = (emp: any) => {
    setSelectedEmp(emp);
    setGrossSalary(Number(emp.grossSalary || 35000));
    setTemplateId(emp.templateId || '');
    setBankName(emp.bankName || 'HDFC Bank');
    setAccountNumber(emp.accountNumber || '');
    setIfsc(emp.ifsc || 'HDFC0001234');
    setPanNumber(emp.pan || emp.panNumber || 'ABCDE1234F');
    setPfUan(emp.uan || emp.pfUan || '100928374652');
    setIsAssignModal(true);
  };

  const openReviseModal = (emp: any) => {
    setSelectedEmp(emp);
    setNewGross(Number(emp.grossSalary || 35000) + 5000);
    setIsReviseModal(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between flex-wrap gap-4 rounded-2xl border border-white/10 bg-[#131c2e] p-5 shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            Employee Salary Profiles & Bank Details
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Assign salary structures, manage gross compensation, configure bank accounts for direct transfer, and process annual increments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl bg-[#1a253a] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500 w-64"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/20 bg-[#131c2e]/50 p-12 text-center flex flex-col items-center justify-center gap-3">
          <UserCheck className="w-10 h-10 text-slate-500" />
          <p className="text-sm font-semibold text-white">No Employee Salary Profiles Found</p>
          <p className="text-xs text-slate-400">Profiles are auto-generated when employees are added or assigned.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#131c2e] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider bg-black/20">
                  <th className="px-5 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-left">Department / Designation</th>
                  <th className="px-4 py-3 text-left">Assigned Structure</th>
                  <th className="px-4 py-3 text-right">Gross Salary</th>
                  <th className="px-4 py-3 text-left">Bank Account / IFSC</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p: any) => {
                  const emp = p.employee || p;
                  const stName = p.template?.templateName || 'Custom / Unassigned';
                  const gross = Number(p.grossSalary || 0);
                  const acct = p.accountNumber ? `••••${p.accountNumber.slice(-4)}` : 'Not Configured';
                  const bank = p.bankName || '—';

                  return (
                    <tr key={emp.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-white text-sm">{emp.fullName || 'Unnamed Staff'}</p>
                        <p className="text-[11px] font-mono text-emerald-400">{emp.employeeId || emp.id.slice(0,8)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        <p className="font-medium">{emp.department || 'General'}</p>
                        <p className="text-[11px] text-slate-500">{emp.designation || 'Staff'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-semibold">
                          {stName}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-white text-sm font-mono">
                        {fmtRs(gross)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        <p className="font-medium">{bank}</p>
                        <p className="text-[11px] font-mono text-slate-500">{acct} ({p.ifsc || 'NO IFSC'})</p>
                      </td>
                      <td className="px-4 py-3.5 text-center space-x-2">
                        <button
                          onClick={() => openAssignModal(p)}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition inline-flex items-center gap-1 border border-white/10"
                          title="Edit Profile & Bank Details"
                        >
                          <Edit className="w-3 h-3 text-emerald-400" />
                          Configure
                        </button>
                        <button
                          onClick={() => openReviseModal(p)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 text-xs font-bold transition inline-flex items-center gap-1 border border-emerald-500/30"
                          title="Submit Salary Increment / Revision"
                        >
                          <TrendingUp className="w-3 h-3" />
                          Revise
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign / Configure Modal */}
      {isAssignModal && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#131c2e] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-emerald-400" />
                Configure Salary Profile & Bank Details
              </h3>
              <button onClick={() => setIsAssignModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Employee</label>
                <input
                  type="text"
                  disabled
                  value={selectedEmp.employee?.fullName || selectedEmp.fullName || 'Employee'}
                  className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Salary Structure Template</label>
                  <SelectMenu
                    value={templateId || 'NONE'}
                    onValueChange={(v) => setTemplateId(v === 'NONE' ? '' : v)}
                    placeholder="Select Template"
                    className="bg-[#1a253a] border-white/10 text-xs rounded-xl text-white"
                  >
                    <SelectMenuItem value="NONE">Custom / Unassigned</SelectMenuItem>
                    {templates.map((t) => (
                      <SelectMenuItem key={t.id} value={t.id}>{t.templateName}</SelectMenuItem>
                    ))}
                  </SelectMenu>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Gross Monthly Salary (₹) *</label>
                  <input
                    type="number"
                    required
                    value={grossSalary}
                    onChange={(e) => setGrossSalary(Number(e.target.value))}
                    className="w-full rounded-xl bg-[#1a253a] border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 space-y-3">
                <p className="font-bold text-slate-300">Bank Disbursement Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full rounded-xl bg-[#1a253a] border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full rounded-xl bg-[#1a253a] border border-white/10 px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                      className="w-full rounded-xl bg-[#1a253a] border border-white/10 px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">PAN Number</label>
                    <input
                      type="text"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                      className="w-full rounded-xl bg-[#1a253a] border border-white/10 px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAssignModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revise Modal */}
      {isReviseModal && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#131c2e] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Submit Salary Revision / Increment
              </h3>
              <button onClick={() => setIsReviseModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviseSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Current Gross Salary</label>
                <input
                  type="text"
                  disabled
                  value={fmtRs(selectedEmp.grossSalary || 35000)}
                  className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-slate-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">New Gross Monthly Salary (₹) *</label>
                <input
                  type="number"
                  required
                  value={newGross}
                  onChange={(e) => setNewGross(Number(e.target.value))}
                  className="w-full rounded-xl bg-[#1a253a] border border-white/10 px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Revision Type</label>
                <SelectMenu
                  value={revisionType}
                  onValueChange={(v) => setRevisionType(v)}
                  placeholder="Type"
                  className="bg-[#1a253a] border-white/10 text-xs rounded-xl text-white"
                >
                  <SelectMenuItem value="INCREMENT">Annual Increment</SelectMenuItem>
                  <SelectMenuItem value="PROMOTION">Role Promotion</SelectMenuItem>
                  <SelectMenuItem value="ADJUSTMENT">Market Adjustment</SelectMenuItem>
                </SelectMenu>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Notes / Justification</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. FY26 performance appraisal increment"
                  className="w-full rounded-xl bg-[#1a253a] border border-white/10 p-3 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsReviseModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Increment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
