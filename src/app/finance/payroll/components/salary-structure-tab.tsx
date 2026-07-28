'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, Plus, Trash2, Edit3, Check, X,
  Layers, DollarSign, ShieldAlert, Percent,
} from 'lucide-react';
import toast from 'react-hot-toast';

function fmtRs(n: number | string) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(n || 0))}`;
}

export function SalaryStructureTab() {
  const [structures, setStructures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [basicSalary, setBasicSalary] = useState<number>(25000);
  const [hraPercent, setHraPercent] = useState<number>(40);
  const [daPercent, setDaPercent] = useState<number>(10);
  const [specialAllowance, setSpecialAllowance] = useState<number>(5000);
  const [pfEnabled, setPfEnabled] = useState(true);
  const [esicEnabled, setEsicEnabled] = useState(true);
  const [ptEnabled, setPtEnabled] = useState(true);

  const loadStructures = async () => {
    setLoading(true);
    try {
      const res = await api.listSalaryStructures();
      const items = res?.data ?? res;
      setStructures(Array.isArray(items) ? items : []);
    } catch {
      toast.error('Failed to load salary structures.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStructures();
  }, []);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName) return toast.error('Please enter a template name.');
    setSubmitting(true);
    try {
      const components = [
        { name: 'HRA (House Rent Allowance)', type: 'EARNING', calculationType: 'PERCENTAGE', percentageValue: hraPercent, isTaxable: true },
        { name: 'DA (Dearness Allowance)', type: 'EARNING', calculationType: 'PERCENTAGE', percentageValue: daPercent, isTaxable: true },
        { name: 'Special Allowance', type: 'EARNING', calculationType: 'FLAT', amount: specialAllowance, isTaxable: true },
        { name: 'Provident Fund (PF)', type: 'DEDUCTION', calculationType: pfEnabled ? 'PERCENTAGE' : 'FLAT', amount: pfEnabled ? 1800 : 0, isStatutory: pfEnabled },
        { name: 'ESIC Contribution', type: 'DEDUCTION', calculationType: esicEnabled ? 'PERCENTAGE' : 'FLAT', amount: esicEnabled ? 500 : 0, isStatutory: esicEnabled },
        { name: 'Professional Tax (PT)', type: 'DEDUCTION', calculationType: 'FLAT', amount: ptEnabled ? 200 : 0, isStatutory: ptEnabled },
      ];

      await api.createSalaryStructure({
        templateName,
        description,
        department: 'General',
        designation: 'All Designations',
        employmentType: 'Full-Time',
        basicSalary,
        components,
      });
      toast.success('Salary Structure template created successfully!');
      setIsModalOpen(false);
      setTemplateName('');
      setDescription('');
      loadStructures();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create template.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Delete salary structure "${name}"?`)) return;
    try {
      await api.deleteSalaryStructure(id);
      toast.success('Template removed.');
      loadStructures();
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to delete template.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between flex-wrap gap-4 rounded-2xl border border-white/10 bg-[#131c2e] p-5 shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Salary Structure Templates
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure reusable earnings (Basic, HRA, DA, Allowances) and statutory deduction rules (PF, ESIC, PT) for employee tiers.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-900/30 transition"
        >
          <Plus className="w-4 h-4" />
          Create New Template
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      ) : structures.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/20 bg-[#131c2e]/50 p-12 text-center flex flex-col items-center justify-center gap-4">
          <Layers className="w-10 h-10 text-slate-500" />
          <div>
            <h3 className="text-base font-bold text-white">No Salary Templates Created</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Create your first structure template (e.g., "Senior Engineering Tier" or "General Operations Staff") to assign to employee profiles.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
          >
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {structures.map((st: any) => {
            const basic = Number(st.basicSalary || 0);
            const comps = st.components || [];
            const earnings = comps.filter((c: any) => c.type === 'EARNING');
            const deductions = comps.filter((c: any) => c.type === 'DEDUCTION');

            return (
              <div key={st.id} className="rounded-2xl border border-white/10 bg-[#131c2e] p-5 shadow-xl flex flex-col justify-between hover:border-indigo-500/30 transition">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white">{st.templateName}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{st.description || 'Standard salary structure'}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteTemplate(st.id, st.templateName)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-white font-semibold">
                      <span className="text-slate-400">Base Basic Salary:</span>
                      <span className="text-emerald-400 font-mono text-sm">{fmtRs(basic)}</span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Earnings ({earnings.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {earnings.map((e: any, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px]">
                            {e.name}: {e.calculationType === 'PERCENTAGE' ? `${e.percentageValue}%` : fmtRs(e.amount)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Statutory Deductions ({deductions.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {deductions.map((d: any, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px]">
                            {d.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <span>Created {new Date(st.createdAt || Date.now()).toLocaleDateString()}</span>
                  <span className="text-indigo-400 font-semibold">{st._count?.profiles || 0} Employees Assigned</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#131c2e] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Create Salary Structure Template
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Executive Tier"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full rounded-xl bg-[#1a253a] border border-white/10 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Applicable for managers and technical leads"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl bg-[#1a253a] border border-white/10 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Base Basic Salary (₹) *</label>
                  <input
                    type="number"
                    required
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(Number(e.target.value))}
                    className="w-full rounded-xl bg-[#1a253a] border border-white/10 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">HRA (% of Basic)</label>
                  <input
                    type="number"
                    value={hraPercent}
                    onChange={(e) => setHraPercent(Number(e.target.value))}
                    className="w-full rounded-xl bg-[#1a253a] border border-white/10 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">DA (% of Basic)</label>
                  <input
                    type="number"
                    value={daPercent}
                    onChange={(e) => setDaPercent(Number(e.target.value))}
                    className="w-full rounded-xl bg-[#1a253a] border border-white/10 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Special Allowance (Fixed ₹)</label>
                  <input
                    type="number"
                    value={specialAllowance}
                    onChange={(e) => setSpecialAllowance(Number(e.target.value))}
                    className="w-full rounded-xl bg-[#1a253a] border border-white/10 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 space-y-2">
                <p className="text-xs font-bold text-slate-300">Statutory Deductions Integration</p>
                <div className="flex items-center gap-4 text-xs text-white">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={pfEnabled} onChange={(e) => setPfEnabled(e.target.checked)} className="rounded bg-black/40 border-white/20 text-indigo-500" />
                    <span>Provident Fund (12%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={esicEnabled} onChange={(e) => setEsicEnabled(e.target.checked)} className="rounded bg-black/40 border-white/20 text-indigo-500" />
                    <span>ESIC (0.75%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={ptEnabled} onChange={(e) => setPtEnabled(e.target.checked)} className="rounded bg-black/40 border-white/20 text-indigo-500" />
                    <span>Professional Tax</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
