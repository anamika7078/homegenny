'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, Plus, Search, Calendar, MapPin, BadgePercent, ShieldAlert,
} from 'lucide-react';

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n));
}
function fmtRs(n: number | string) { return `₹${fmt(n)}`; }

export default function WageConfigPage() {
  const [search, setSearch] = useState('');
  const [configs, setConfigs] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    state: 'Delhi NCR',
    zone: 'Zone A',
    effective_date: new Date().toISOString().split('T')[0],
    category: 'Security Guard',
    basic_wage: 15000,
    da: 2000,
    hra: 1500,
    skilled_allowance: 1000,
    additional_hours_pct: 50, // default 50% so subtotal1 / 2
    employer_pf_pct: 12,
    employer_pf_max: 15000,
    employee_pf_pct: 12,
    employer_esic_pct: 3.25,
    employee_esic_pct: 0.75,
    bonus_pct: 8.33,
    leave_days: 15,
    lwf_pct: 0.2,
    lwf_max: 25,
    uniform_allowance: 500,
    relieving_pct: 8.33,
    management_pct: 10,
    training_charges: 300,
    gst_pct: 18,
    professional_tax: 200,
    nfh: 300, // NFH configured allowance/days
  });

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [list, cats] = await Promise.all([
        api.listWageConfigs(search || undefined),
        api.getWageCategories(),
      ]);
      const listData = (list as any)?.data ?? list;
      const catsData = (cats as any)?.data ?? cats;
      setConfigs(Array.isArray(listData) ? listData : []);
      const catsArray = Array.isArray(catsData) ? catsData : [];
      setCategories(catsArray);
      if (catsArray.length > 0) {
        setFormData((prev) => ({
          ...prev,
          category: catsArray.includes(prev.category) ? prev.category : catsArray[0],
        }));
      }
    } catch (e: any) {
      showToast('error', e.message ?? 'Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createWageConfig(formData);
      showToast('success', 'Wage Configuration Revision created successfully!');
      setShowDrawer(false);
      load();
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to create revision');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: string, val: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [key]: typeof val === 'string' && !isNaN(Number(val)) && val !== '' ? Number(val) : val,
    }));
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Wage Configuration</h1>
          <p className="text-sm text-slate-400">Configure state-wise, zone-wise category wages and compliance parameters.</p>
        </div>
        <button
          onClick={() => setShowDrawer(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition shadow-lg shadow-orange-500/10"
        >
          <Plus className="w-4 h-4" />
          Create Revision
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by state, zone, category..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-900/50 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">State / Zone</th>
                <th className="py-4 px-6">Effective Date</th>
                <th className="py-4 px-6 text-right">Basic + DA</th>
                <th className="py-4 px-6 text-right">PF %</th>
                <th className="py-4 px-6 text-right">ESIC %</th>
                <th className="py-4 px-6 text-right">GST %</th>
                <th className="py-4 px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {loading && configs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                    Loading configurations...
                  </td>
                </tr>
              ) : configs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No configurations found. Click "Create Revision" to add one.
                  </td>
                </tr>
              ) : (
                configs.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 font-semibold text-white">{c.category}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-white text-xs">{c.state}</span>
                        <span className="text-[10px] text-slate-400">{c.zone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(c.effective_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-emerald-400">
                      {fmtRs(Number(c.basic_wage) + Number(c.da))}
                    </td>
                    <td className="py-4 px-6 text-right text-xs">
                      ER {c.employer_pf_pct}% · EE {c.employee_pf_pct}%
                    </td>
                    <td className="py-4 px-6 text-right text-xs">
                      ER {c.employer_esic_pct}% · EE {c.employee_esic_pct}%
                    </td>
                    <td className="py-4 px-6 text-right text-xs">{c.gst_pct}%</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                        ${c.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-slate-400 bg-slate-400/10 border-slate-400/20'}`}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Revision Popup / Modal Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl max-h-[90vh] bg-[#0f172a] border border-white/10 rounded-2xl p-6 sm:p-8 overflow-y-auto space-y-6 shadow-2xl flex flex-col my-auto">
            <div className="flex justify-between items-start border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Create Wage Config Revision</h3>
                <p className="text-xs text-slate-400">Important: Revision rules prevent updates to existing configs. Submit a new revision.</p>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 space-y-6">
              {/* Category, State, Zone, Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">State</label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Zone</label>
                  <input
                    type="text"
                    required
                    value={formData.zone}
                    onChange={(e) => handleInputChange('zone', e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Effective Date</label>
                  <input
                    type="date"
                    required
                    value={formData.effective_date}
                    onChange={(e) => handleInputChange('effective_date', e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Wage details */}
              <div className="border-t border-white/5 pt-4 space-y-4">
                <h4 className="text-xs uppercase font-bold tracking-wider text-orange-500">Wage Breakup</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Basic Wage</label>
                    <input
                      type="number"
                      required
                      value={formData.basic_wage}
                      onChange={(e) => handleInputChange('basic_wage', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">DA</label>
                    <input
                      type="number"
                      required
                      value={formData.da}
                      onChange={(e) => handleInputChange('da', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">HRA</label>
                    <input
                      type="number"
                      required
                      value={formData.hra}
                      onChange={(e) => handleInputChange('hra', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Skilled Allowance</label>
                    <input
                      type="number"
                      required
                      value={formData.skilled_allowance}
                      onChange={(e) => handleInputChange('skilled_allowance', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Additional Hours %</label>
                    <input
                      type="number"
                      required
                      value={formData.additional_hours_pct}
                      onChange={(e) => handleInputChange('additional_hours_pct', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Compliance Parameter details */}
              <div className="border-t border-white/5 pt-4 space-y-4">
                <h4 className="text-xs uppercase font-bold tracking-wider text-orange-500">Compliance & Allowances</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Employer PF %</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.employer_pf_pct}
                      onChange={(e) => handleInputChange('employer_pf_pct', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Employer PF Max</label>
                    <input
                      type="number"
                      required
                      value={formData.employer_pf_max}
                      onChange={(e) => handleInputChange('employer_pf_max', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Employee PF %</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.employee_pf_pct}
                      onChange={(e) => handleInputChange('employee_pf_pct', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Employer ESIC %</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.employer_esic_pct}
                      onChange={(e) => handleInputChange('employer_esic_pct', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Employee ESIC %</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.employee_esic_pct}
                      onChange={(e) => handleInputChange('employee_esic_pct', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Bonus %</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.bonus_pct}
                      onChange={(e) => handleInputChange('bonus_pct', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Leave Days (Annual)</label>
                    <input
                      type="number"
                      required
                      value={formData.leave_days}
                      onChange={(e) => handleInputChange('leave_days', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">LWF %</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.lwf_pct}
                      onChange={(e) => handleInputChange('lwf_pct', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">LWF Max Limit</label>
                    <input
                      type="number"
                      required
                      value={formData.lwf_max}
                      onChange={(e) => handleInputChange('lwf_max', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Uniform Allowance</label>
                    <input
                      type="number"
                      required
                      value={formData.uniform_allowance}
                      onChange={(e) => handleInputChange('uniform_allowance', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Relieving %</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.relieving_pct}
                      onChange={(e) => handleInputChange('relieving_pct', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Management Fee %</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.management_pct}
                      onChange={(e) => handleInputChange('management_pct', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Training Charges</label>
                    <input
                      type="number"
                      required
                      value={formData.training_charges}
                      onChange={(e) => handleInputChange('training_charges', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">GST %</label>
                    <input
                      type="number"
                      required
                      value={formData.gst_pct}
                      onChange={(e) => handleInputChange('gst_pct', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Professional Tax</label>
                    <input
                      type="number"
                      required
                      value={formData.professional_tax}
                      onChange={(e) => handleInputChange('professional_tax', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">NFH Allowance</label>
                    <input
                      type="number"
                      required
                      value={formData.nfh}
                      onChange={(e) => handleInputChange('nfh', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-4 border-t border-white/5 pt-6">
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white font-semibold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit Revision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
