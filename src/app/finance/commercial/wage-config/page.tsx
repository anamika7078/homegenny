'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api/client';
import {
  Loader2, Plus, Search, Calendar, MapPin, BadgePercent, ShieldAlert,
  Clock, IndianRupee, ChevronDown, ChevronUp, Calculator, Eye, EyeOff,
} from 'lucide-react';

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n));
}
function fmtRs(n: number | string) { return `₹${fmt(n)}`; }

/* ──────────────────────────────────────────────────────
   Unified Toggle Switch Component (Consistent Orange Theme)
   ────────────────────────────────────────────────────── */
function Toggle({
  label, checked, onChange,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 group cursor-pointer select-none"
    >
      <div
        className={`relative w-9 h-5 rounded-full transition-all duration-200 ${
          checked
            ? 'bg-orange-500 shadow-md shadow-orange-500/30'
            : 'bg-slate-700/80 hover:bg-slate-700'
        }`}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </div>
      <span className={`text-xs font-semibold transition-colors ${checked ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>
        {label}
      </span>
    </button>
  );
}

/* ──────────────────────────────────────────────────────
   Calculation Row Component
   ────────────────────────────────────────────────────── */
function CalcRow({
  label, value, highlight, sub, dimmed, badge,
}: {
  label: string; value: string; highlight?: boolean; sub?: boolean; dimmed?: boolean; badge?: string;
}) {
  return (
    <div
      className={`flex justify-between items-center py-1.5 px-3 rounded-lg transition-colors ${
        highlight
          ? 'bg-orange-500/10 border border-orange-500/20'
          : sub
          ? 'bg-cyan-500/5 border border-cyan-500/10'
          : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`text-xs ${dimmed ? 'text-slate-600' : highlight ? 'text-orange-400 font-semibold' : sub ? 'text-cyan-400 font-medium' : 'text-slate-400'}`}>
          {label}
        </span>
        {badge && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-medium border border-orange-500/20">
            {badge}
          </span>
        )}
      </div>
      <span className={`text-xs font-mono tabular-nums ${dimmed ? 'text-slate-600' : highlight ? 'text-orange-400 font-bold' : sub ? 'text-cyan-300 font-semibold' : 'text-slate-300'}`}>
        {value}
      </span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   Calculation Engine (pure function)
   ────────────────────────────────────────────────────── */
function computeAll(d: any) {
  const basic = Number(d.basic_wage) || 0;
  const da = Number(d.da) || 0;
  const hra = Number(d.hra) || 0;
  const skilledAllowance = Number(d.skilled_allowance) || 0;

  const employerPfPct = Number(d.employer_pf_pct) || 0;
  const employerPfMax = Number(d.employer_pf_max) || 15000;
  const employeePfPct = Number(d.employee_pf_pct) || 0;
  const employerEsicPct = Number(d.employer_esic_pct) || 0;
  const employeeEsicPct = Number(d.employee_esic_pct) || 0;
  const bonusPct = Number(d.bonus_pct) || 0;
  const leaveDays = Number(d.leave_days) || 32;
  const lwfAmount = Number(d.lwf_amount) || 62;
  const uniformAllowance = Number(d.uniform_allowance) || 275;
  const relievingPct = Number(d.relieving_pct) || 0;
  const managementPct = Number(d.management_pct) || 0;
  const professionalTax = Number(d.professional_tax) || 0;

  const pfOn = d.pf_applicable !== false;
  const esicOn = d.esic_applicable !== false;
  const bonusOn = d.bonus_applicable !== false;
  const bonusFreq: string = d.bonus_frequency || 'monthly';
  const lwfOn = d.lwf_applicable !== false;
  const uniformOn = d.uniform_applicable !== false;
  const relievingOn = d.relieving_applicable !== false;
  const nfhOn = d.nfh_applicable === true;

  // ── Phase A: Gross Salary ──
  const subtotal1 = basic + da;
  // Shift pattern is stored as config only — actual shift-based calculation
  // happens in the Commercial Calculator screen, not here.
  const additionalHoursPct = 0;
  const additionalHours = 0;
  const subtotal2 = subtotal1 + additionalHours + hra + skilledAllowance;

  // ── Phase B: Statutory Contributions ──
  const bonusRaw = bonusOn ? subtotal1 * (bonusPct / 100) : 0;
  const bonusMonthly = bonusFreq === 'yearly' ? bonusRaw / 12 : bonusRaw;

  const workingYear = 312;
  const leaveWages = subtotal2 * (leaveDays / workingYear);

  const pfBase = basic + skilledAllowance + leaveWages;
  const employerPfCeiling = employerPfMax * (employerPfPct / 100);
  const epfoEmployer = pfOn ? Math.min(Math.round(pfBase * (employerPfPct / 100)), employerPfCeiling) : 0;

  const esicEmployer = esicOn ? (subtotal2 + leaveWages + bonusMonthly) * (employerEsicPct / 100) : 0;

  const lwf = lwfOn ? lwfAmount : 0;
  const uniform = uniformOn ? uniformAllowance : 0;

  // ── Phase C: CTC ──
  const subtotal3 = subtotal2 + epfoEmployer + esicEmployer + bonusMonthly + leaveWages + lwf + uniform;
  const relieving = relievingOn ? subtotal3 * (relievingPct / 100) : 0;
  const subtotal4 = subtotal3 + relieving;
  const managementFee = subtotal4 * (managementPct / 100);
  const totalCTC = subtotal4 + managementFee;
  const ratePerDay = totalCTC / 30.45;
  const ratePerHour = ratePerDay / 8;

  // ── Employee Net Salary ──
  const grossEarnings = subtotal2 + leaveWages + bonusMonthly;
  const employeePfCeiling = employerPfMax * (employeePfPct / 100);
  const epfoEmployee = pfOn ? Math.min(Math.round(pfBase * (employeePfPct / 100)), employeePfCeiling) : 0;
  const esicEmployee = esicOn ? grossEarnings * (employeeEsicPct / 100) : 0;
  const totalDeductions = epfoEmployee + esicEmployee + professionalTax;
  const netSalary = grossEarnings - totalDeductions;

  // ── NFH Extra Claim ──
  const nfhPayDouble = nfhOn ? (subtotal2 / 26) * 2 : 0;
  const nfhEsic = nfhOn ? nfhPayDouble * (employerEsicPct / 100) : 0;
  const nfhServiceCharge = nfhOn ? (nfhPayDouble + nfhEsic) * (managementPct / 100) : 0;
  const totalNfh = nfhPayDouble + nfhEsic + nfhServiceCharge;

  // ── Phase D: GST & Billing ──
  const gstOn = d.gst_applicable !== false;
  const gstType: 'intra_state' | 'inter_state' = d.gst_type || 'intra_state';
  const gstRate = Number(d.gst_pct) || 18;

  let cgstPct = 0;
  let sgstPct = 0;
  let igstPct = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalGstAmount = 0;

  if (gstOn) {
    if (gstType === 'intra_state') {
      cgstPct = gstRate / 2;
      sgstPct = gstRate / 2;
      cgstAmount = totalCTC * (cgstPct / 100);
      sgstAmount = totalCTC * (sgstPct / 100);
      totalGstAmount = cgstAmount + sgstAmount;
    } else {
      igstPct = gstRate;
      igstAmount = totalCTC * (igstPct / 100);
      totalGstAmount = igstAmount;
    }
  }

  const grandTotalWithGst = totalCTC + totalGstAmount;

  return {
    subtotal1, additionalHours, additionalHoursPct, subtotal2,
    bonusRaw, bonusMonthly, leaveWages, pfBase,
    epfoEmployer, esicEmployer, lwf, uniform,
    subtotal3, relieving, subtotal4, managementFee, totalCTC,
    ratePerDay, ratePerHour,
    grossEarnings, epfoEmployee, esicEmployee, totalDeductions, netSalary,
    nfhPayDouble, nfhEsic, nfhServiceCharge, totalNfh,
    gstOn, gstType, gstRate, cgstPct, sgstPct, igstPct,
    cgstAmount, sgstAmount, igstAmount, totalGstAmount, grandTotalWithGst,
  };
}

/* ══════════════════════════════════════════════════════
   Main Page Component
   ══════════════════════════════════════════════════════ */
export default function WageConfigPage() {
  const [search, setSearch] = useState('');
  const [configs, setConfigs] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    state: 'Delhi NCR',
    zone: 'Zone A',
    effective_date: new Date().toISOString().split('T')[0],
    category: 'Security Guard',
    // Wage Breakup
    basic_wage: 15000,
    da: 0,
    hra: 0,
    skilled_allowance: 0,
    shift_pattern: '8' as '8' | '12',
    // Compliance Rates
    employer_pf_pct: 13,
    employer_pf_max: 15000,
    employee_pf_pct: 12,
    employer_esic_pct: 3.25,
    employee_esic_pct: 0.75,
    bonus_pct: 8.33,
    leave_days: 32,
    lwf_amount: 62,
    uniform_allowance: 275,
    relieving_pct: 16.67,
    management_pct: 5.5,
    professional_tax: 0,
    // Toggle flags
    pf_applicable: true,
    esic_applicable: true,
    bonus_applicable: true,
    bonus_frequency: 'monthly' as 'monthly' | 'yearly',
    lwf_applicable: true,
    uniform_applicable: true,
    relieving_applicable: true,
    nfh_applicable: false,
    // GST fields
    gst_applicable: true,
    gst_type: 'intra_state' as 'intra_state' | 'inter_state',
    gst_pct: 18,
  });

  // Calculation sections collapse state
  const [expandedSections, setExpandedSections] = useState({
    phaseA: true, phaseB: true, phaseC: true, gst: true, employee: true, nfh: true,
  });

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Live calculation
  const calc = useMemo(() => computeAll(formData), [formData]);

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
      const payload: any = {
        ...formData,
        // Additional hours % is the OT rate applied when 12h shift is selected in Commercial Calculator
        // Always stored as 50% — the calculator decides whether to apply it based on shift selection
        additional_hours_pct: 50,
        lwf_pct: 0,
        lwf_max: formData.lwf_amount,
        training_charges: 0,
        gst_pct: formData.gst_pct || 18,
        nfh: 0,
      };
      await api.createWageConfig(payload);
      showToast('success', 'Wage Configuration Revision created successfully!');
      setShowDrawer(false);
      load();
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to create revision');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: string, val: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [key]: typeof val === 'string' && !isNaN(Number(val)) && val !== '' && key !== 'state' && key !== 'zone' && key !== 'category' && key !== 'effective_date' && key !== 'shift_pattern' && key !== 'bonus_frequency'
        ? Number(val) : val,
    }));
  };

  /* ─── Input field helper ─── */
  const inputCls = "w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/60 transition placeholder:text-slate-600";
  const labelCls = "text-[11px] font-semibold text-slate-400 mb-1 block uppercase tracking-wider";

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
                    No configurations found. Click &quot;Create Revision&quot; to add one.
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

      {/* ══════════════════════════════════════════════════════
         CREATE REVISION MODAL — Portalled to Body (Full Viewport Overlay)
         ══════════════════════════════════════════════════════ */}
      {showDrawer && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#070b14]/95 backdrop-blur-md p-3 sm:p-6 overflow-hidden">
          <div className={`w-full ${showLivePreview ? 'max-w-6xl' : 'max-w-3xl'} h-[92vh] max-h-[850px] bg-[#0b1120] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative transition-all duration-300`}>
            
            {/* Modal Fixed Header (Solid Top Stripe - No Content Bleed-Through) */}
            <div className="flex justify-between items-center border-b border-white/10 px-6 py-4 bg-[#0f172a] flex-shrink-0 z-30 shadow-lg relative">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Create Wage Config Revision</h3>
                  <p className="text-xs text-slate-400">Revision rules prevent updates to existing configs. Submit a new revision.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Eye Button for Live Calculation Preview */}
                <button
                  type="button"
                  onClick={() => setShowLivePreview((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                    showLivePreview
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                  title={showLivePreview ? 'Hide Live Calculation Preview' : 'Show Live Calculation Preview'}
                >
                  {showLivePreview ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                  <span className="hidden sm:inline">{showLivePreview ? 'Hide Preview' : 'Live Preview'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body — Two Columns (Left Scrollable, Right Scrollable) */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
              
              {/* ─── LEFT: Form Inputs ─── */}
              <div className="flex-1 px-6 sm:px-8 py-6 space-y-6 overflow-y-auto min-h-0 custom-scrollbar">
                
                {/* ── Basic Configuration (Top Section - Properly Aligned Card Grid) ── */}
                <div className="space-y-3">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-orange-500 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    Basic Configuration
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-900/40 rounded-xl p-4 border border-white/5">
                    <div>
                      <label className={labelCls}>State</label>
                      <input
                        type="text" required value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Zone</label>
                      <input
                        type="text" required value={formData.zone}
                        onChange={(e) => handleInputChange('zone', e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className={inputCls}
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Effective Date</label>
                      <input
                        type="date" required value={formData.effective_date}
                        onChange={(e) => handleInputChange('effective_date', e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Wage Breakup ── */}
                <div className="border-t border-white/5 pt-5 space-y-3">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-orange-500 flex items-center gap-2">
                    <IndianRupee className="w-3.5 h-3.5" />
                    Wage Breakup
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>Basic Wage</label>
                      <input type="number" required value={formData.basic_wage}
                        onChange={(e) => handleInputChange('basic_wage', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>DA</label>
                      <input type="number" required value={formData.da}
                        onChange={(e) => handleInputChange('da', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>HRA</label>
                      <input type="number" required value={formData.hra}
                        onChange={(e) => handleInputChange('hra', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Skilled Allowance</label>
                      <input type="number" required value={formData.skilled_allowance}
                        onChange={(e) => handleInputChange('skilled_allowance', e.target.value)} className={inputCls} />
                    </div>
                  </div>
                </div>

                {/* ── Applicability Toggles (Unified Orange Theme) ── */}
                <div className="border-t border-white/5 pt-5 space-y-3">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-orange-500 flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Applicability Toggles
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3.5 bg-slate-900/40 rounded-xl p-4 border border-white/5">
                    <Toggle label="PF (EPFO)" checked={formData.pf_applicable}
                      onChange={(v) => handleInputChange('pf_applicable', v)} />
                    <Toggle label="ESIC" checked={formData.esic_applicable}
                      onChange={(v) => handleInputChange('esic_applicable', v)} />
                    <Toggle label="Bonus" checked={formData.bonus_applicable}
                      onChange={(v) => handleInputChange('bonus_applicable', v)} />
                    <Toggle label="LWF" checked={formData.lwf_applicable}
                      onChange={(v) => handleInputChange('lwf_applicable', v)} />
                    <Toggle label="Uniform" checked={formData.uniform_applicable}
                      onChange={(v) => handleInputChange('uniform_applicable', v)} />
                    <Toggle label="Relieving" checked={formData.relieving_applicable}
                      onChange={(v) => handleInputChange('relieving_applicable', v)} />
                    <Toggle label="NFH Holiday" checked={formData.nfh_applicable}
                      onChange={(v) => handleInputChange('nfh_applicable', v)} />
                  </div>

                  {/* Bonus Frequency — visible only when bonus is ON */}
                  {formData.bonus_applicable && (
                    <div className="flex items-center gap-3 bg-orange-500/5 border border-orange-500/10 rounded-xl px-4 py-2.5">
                      <span className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider">Bonus Type:</span>
                      <div className="flex gap-1 bg-slate-900/60 rounded-lg p-0.5 border border-white/5">
                        {(['monthly', 'yearly'] as const).map((freq) => (
                          <button
                            key={freq}
                            type="button"
                            onClick={() => handleInputChange('bonus_frequency', freq)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                              formData.bonus_frequency === freq
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {freq === 'monthly' ? 'Monthly' : 'Yearly'}
                          </button>
                        ))}
                      </div>
                      {formData.bonus_frequency === 'yearly' && (
                        <span className="text-[10px] text-orange-400/80 ml-auto font-mono">
                          Annual {fmtRs(calc.bonusRaw)} → {fmtRs(calc.bonusMonthly)}/mo
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* ── GST Configuration ── */}
                <div className="border-t border-white/5 pt-5 space-y-3">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-orange-500 flex items-center gap-2">
                    <BadgePercent className="w-3.5 h-3.5" />
                    GST Configuration
                  </h4>
                  <div className="bg-slate-900/40 rounded-xl p-4 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Toggle
                        label="GST (18% Statutory Tax)"
                        checked={formData.gst_applicable}
                        onChange={(v) => handleInputChange('gst_applicable', v)}
                      />
                      {formData.gst_applicable && (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                          Total Rate: {formData.gst_pct}%
                        </span>
                      )}
                    </div>

                    {formData.gst_applicable && (
                      <div className="pt-2.5 border-t border-white/5 space-y-2">
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Supply Type / GST Classification
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleInputChange('gst_type', 'intra_state')}
                            className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                              formData.gst_type === 'intra_state'
                                ? 'bg-orange-500/15 border-orange-500/50 text-white shadow-lg shadow-orange-500/10'
                                : 'bg-slate-900/60 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200'
                            }`}
                          >
                            <span className="text-xs font-bold flex items-center justify-between">
                              Intra-State (Same State)
                              {formData.gst_type === 'intra_state' && (
                                <span className="w-2 h-2 rounded-full bg-orange-400" />
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              CGST (9%) + SGST (9%) = 18% Total
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleInputChange('gst_type', 'inter_state')}
                            className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                              formData.gst_type === 'inter_state'
                                ? 'bg-orange-500/15 border-orange-500/50 text-white shadow-lg shadow-orange-500/10'
                                : 'bg-slate-900/60 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200'
                            }`}
                          >
                            <span className="text-xs font-bold flex items-center justify-between">
                              Inter-State (Different State)
                              {formData.gst_type === 'inter_state' && (
                                <span className="w-2 h-2 rounded-full bg-orange-400" />
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              IGST (18%) Integrated Tax
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Compliance Rates ── */}
                <div className="border-t border-white/5 pt-5 space-y-3">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-orange-500 flex items-center gap-2">
                    <BadgePercent className="w-3.5 h-3.5" />
                    Compliance Rates
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className={!formData.pf_applicable ? 'opacity-40 pointer-events-none' : ''}>
                      <label className={labelCls}>Employer PF %</label>
                      <input type="number" step="0.01" value={formData.employer_pf_pct}
                        onChange={(e) => handleInputChange('employer_pf_pct', e.target.value)} className={inputCls} />
                    </div>
                    <div className={!formData.pf_applicable ? 'opacity-40 pointer-events-none' : ''}>
                      <label className={labelCls}>PF Ceiling Limit</label>
                      <input type="number" value={formData.employer_pf_max}
                        onChange={(e) => handleInputChange('employer_pf_max', e.target.value)} className={inputCls} />
                    </div>
                    <div className={!formData.pf_applicable ? 'opacity-40 pointer-events-none' : ''}>
                      <label className={labelCls}>Employee PF %</label>
                      <input type="number" step="0.01" value={formData.employee_pf_pct}
                        onChange={(e) => handleInputChange('employee_pf_pct', e.target.value)} className={inputCls} />
                    </div>
                    <div className={!formData.esic_applicable ? 'opacity-40 pointer-events-none' : ''}>
                      <label className={labelCls}>Employer ESIC %</label>
                      <input type="number" step="0.01" value={formData.employer_esic_pct}
                        onChange={(e) => handleInputChange('employer_esic_pct', e.target.value)} className={inputCls} />
                    </div>
                    <div className={!formData.esic_applicable ? 'opacity-40 pointer-events-none' : ''}>
                      <label className={labelCls}>Employee ESIC %</label>
                      <input type="number" step="0.01" value={formData.employee_esic_pct}
                        onChange={(e) => handleInputChange('employee_esic_pct', e.target.value)} className={inputCls} />
                    </div>
                    <div className={!formData.bonus_applicable ? 'opacity-40 pointer-events-none' : ''}>
                      <label className={labelCls}>Bonus %</label>
                      <input type="number" step="0.01" value={formData.bonus_pct}
                        onChange={(e) => handleInputChange('bonus_pct', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Leave Days / Year</label>
                      <input type="number" value={formData.leave_days}
                        onChange={(e) => handleInputChange('leave_days', e.target.value)} className={inputCls} />
                    </div>
                    <div className={!formData.lwf_applicable ? 'opacity-40 pointer-events-none' : ''}>
                      <label className={labelCls}>LWF Amount (₹)</label>
                      <input type="number" value={formData.lwf_amount}
                        onChange={(e) => handleInputChange('lwf_amount', e.target.value)} className={inputCls} />
                    </div>
                    <div className={!formData.uniform_applicable ? 'opacity-40 pointer-events-none' : ''}>
                      <label className={labelCls}>Uniform Allow. (₹)</label>
                      <input type="number" value={formData.uniform_allowance}
                        onChange={(e) => handleInputChange('uniform_allowance', e.target.value)} className={inputCls} />
                    </div>
                    <div className={!formData.relieving_applicable ? 'opacity-40 pointer-events-none' : ''}>
                      <label className={labelCls}>Relieving %</label>
                      <input type="number" step="0.01" value={formData.relieving_pct}
                        onChange={(e) => handleInputChange('relieving_pct', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Management Fee %</label>
                      <input type="number" step="0.01" value={formData.management_pct}
                        onChange={(e) => handleInputChange('management_pct', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Professional Tax (₹)</label>
                      <input type="number" value={formData.professional_tax}
                        onChange={(e) => handleInputChange('professional_tax', e.target.value)} className={inputCls} />
                    </div>
                  </div>
                </div>

                {/* Action Buttons (Pinned in left scroll area) */}
                <div className="flex gap-4 border-t border-white/5 pt-6 pb-2">
                  <button
                    type="button"
                    onClick={() => setShowDrawer(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white font-semibold text-sm transition hover:bg-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit Revision
                  </button>
                </div>
              </div>

              {/* ─── RIGHT: Live Calculation Preview (Hidden by default, toggled via Eye button) ─── */}
              {showLivePreview && (
                <div className="w-full lg:w-[400px] flex-shrink-0 px-6 py-6 space-y-3 bg-[#070d1a] border-t lg:border-t-0 lg:border-l border-white/10 overflow-y-auto min-h-0 custom-scrollbar">
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <h4 className="text-xs uppercase font-bold tracking-widest text-emerald-400">Live Calculation Preview</h4>
                  </div>

                {/* Phase A */}
                <div className="space-y-1">
                  <button type="button" onClick={() => toggleSection('phaseA')}
                    className="flex items-center justify-between w-full text-left py-1 hover:text-white transition">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Phase A — Gross Salary</span>
                    {expandedSections.phaseA ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                  </button>
                  {expandedSections.phaseA && (
                    <div className="space-y-0.5">
                      <CalcRow label="Basic" value={fmtRs(formData.basic_wage)} />
                      <CalcRow label="DA" value={fmtRs(formData.da)} />
                      <CalcRow label="Sub Total 1" value={fmtRs(calc.subtotal1)} sub />
                      <CalcRow label="HRA" value={fmtRs(formData.hra)} />
                      <CalcRow label="Skilled Allowance" value={fmtRs(formData.skilled_allowance)} />
                      <CalcRow label="Sub Total 2" value={fmtRs(calc.subtotal2)} sub />
                    </div>
                  )}
                </div>

                <div className="border-t border-white/5" />

                {/* Phase B */}
                <div className="space-y-1">
                  <button type="button" onClick={() => toggleSection('phaseB')}
                    className="flex items-center justify-between w-full text-left py-1 hover:text-white transition">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Phase B — Statutory</span>
                    {expandedSections.phaseB ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                  </button>
                  {expandedSections.phaseB && (
                    <div className="space-y-0.5">
                      <CalcRow label={`Bonus (${formData.bonus_pct}%)`} value={fmtRs(calc.bonusMonthly)}
                        dimmed={!formData.bonus_applicable}
                        badge={formData.bonus_applicable ? (formData.bonus_frequency === 'yearly' ? 'Yearly' : 'Monthly') : 'OFF'} />
                      <CalcRow label={`Leave Wages (${formData.leave_days}/312)`} value={fmtRs(calc.leaveWages)} />
                      <CalcRow label={`EPFO Employer (${formData.employer_pf_pct}%)`} value={fmtRs(calc.epfoEmployer)}
                        dimmed={!formData.pf_applicable} badge={!formData.pf_applicable ? 'OFF' : undefined} />
                      <CalcRow label={`ESIC Employer (${formData.employer_esic_pct}%)`} value={fmtRs(calc.esicEmployer)}
                        dimmed={!formData.esic_applicable} badge={!formData.esic_applicable ? 'OFF' : undefined} />
                      <CalcRow label="LWF" value={fmtRs(calc.lwf)}
                        dimmed={!formData.lwf_applicable} badge={!formData.lwf_applicable ? 'OFF' : undefined} />
                      <CalcRow label="Uniform" value={fmtRs(calc.uniform)}
                        dimmed={!formData.uniform_applicable} badge={!formData.uniform_applicable ? 'OFF' : undefined} />
                    </div>
                  )}
                </div>

                <div className="border-t border-white/5" />

                {/* Phase C */}
                <div className="space-y-1">
                  <button type="button" onClick={() => toggleSection('phaseC')}
                    className="flex items-center justify-between w-full text-left py-1 hover:text-white transition">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Phase C — CTC</span>
                    {expandedSections.phaseC ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                  </button>
                  {expandedSections.phaseC && (
                    <div className="space-y-0.5">
                      <CalcRow label="Sub Total 3" value={fmtRs(calc.subtotal3)} sub />
                      <CalcRow label={`Relieving (${formData.relieving_pct}%)`} value={fmtRs(calc.relieving)}
                        dimmed={!formData.relieving_applicable} badge={!formData.relieving_applicable ? 'OFF' : undefined} />
                      <CalcRow label="Sub Total 4" value={fmtRs(calc.subtotal4)} sub />
                      <CalcRow label={`Management Fee (${formData.management_pct}%)`} value={fmtRs(calc.managementFee)} />
                      <CalcRow label="Total Monthly CTC" value={fmtRs(calc.totalCTC)} highlight />
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="bg-slate-900/60 rounded-lg px-3 py-2 text-center border border-white/5">
                          <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Rate/Day</div>
                          <div className="text-xs font-bold text-white font-mono mt-0.5">{fmtRs(calc.ratePerDay)}</div>
                        </div>
                        <div className="bg-slate-900/60 rounded-lg px-3 py-2 text-center border border-white/5">
                          <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Rate/Hour</div>
                          <div className="text-xs font-bold text-white font-mono mt-0.5">{fmtRs(calc.ratePerHour)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/5" />

                {/* Phase D - GST */}
                <div className="space-y-1">
                  <button type="button" onClick={() => toggleSection('gst')}
                    className="flex items-center justify-between w-full text-left py-1 hover:text-white transition">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Phase D — GST & Billing</span>
                    {expandedSections.gst ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                  </button>
                  {expandedSections.gst && (
                    <div className="space-y-0.5">
                      <CalcRow label="Total Monthly CTC" value={fmtRs(calc.totalCTC)} sub />
                      {calc.gstOn ? (
                        calc.gstType === 'intra_state' ? (
                          <>
                            <CalcRow label={`(+) CGST (${calc.cgstPct}%)`} value={fmtRs(calc.cgstAmount)} />
                            <CalcRow label={`(+) SGST (${calc.sgstPct}%)`} value={fmtRs(calc.sgstAmount)} />
                            <CalcRow label="Total GST Amount (18%)" value={fmtRs(calc.totalGstAmount)} sub />
                          </>
                        ) : (
                          <>
                            <CalcRow label={`(+) IGST (${calc.igstPct}%)`} value={fmtRs(calc.igstAmount)} />
                            <CalcRow label="Total GST Amount (18%)" value={fmtRs(calc.totalGstAmount)} sub />
                          </>
                        )
                      ) : (
                        <CalcRow label="GST (18%)" value="EXEMPT / OFF" dimmed badge="OFF" />
                      )}
                      <CalcRow label="Grand Total (Incl. GST)" value={fmtRs(calc.grandTotalWithGst)} highlight />
                    </div>
                  )}
                </div>

                <div className="border-t border-white/5" />

                {/* Employee Salary */}
                <div className="space-y-1">
                  <button type="button" onClick={() => toggleSection('employee')}
                    className="flex items-center justify-between w-full text-left py-1 hover:text-white transition">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Employee Take-Home</span>
                    {expandedSections.employee ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                  </button>
                  {expandedSections.employee && (
                    <div className="space-y-0.5">
                      <CalcRow label="Gross Earnings" value={fmtRs(calc.grossEarnings)} sub />
                      <CalcRow label={`(−) Employee PF (${formData.employee_pf_pct}%)`} value={fmtRs(calc.epfoEmployee)}
                        dimmed={!formData.pf_applicable} />
                      <CalcRow label={`(−) Employee ESIC (${formData.employee_esic_pct}%)`} value={fmtRs(calc.esicEmployee)}
                        dimmed={!formData.esic_applicable} />
                      <CalcRow label="(−) Prof. Tax" value={fmtRs(formData.professional_tax)} dimmed={formData.professional_tax === 0} />
                      <CalcRow label="Total Deductions" value={fmtRs(calc.totalDeductions)} />
                      <CalcRow label="Net Take-Home" value={fmtRs(calc.netSalary)} highlight />
                    </div>
                  )}
                </div>

                {/* NFH */}
                {formData.nfh_applicable && (
                  <>
                    <div className="border-t border-white/5" />
                    <div className="space-y-1">
                      <button type="button" onClick={() => toggleSection('nfh')}
                        className="flex items-center justify-between w-full text-left py-1 hover:text-white transition">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">NFH Holiday Extra Claim</span>
                        {expandedSections.nfh ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                      </button>
                      {expandedSections.nfh && (
                        <div className="space-y-0.5">
                          <CalcRow label="NFH Pay (Double)" value={fmtRs(calc.nfhPayDouble)} />
                          <CalcRow label="NFH ESIC" value={fmtRs(calc.nfhEsic)} />
                          <CalcRow label="NFH Service Charge" value={fmtRs(calc.nfhServiceCharge)} />
                          <CalcRow label="Total NFH Claim" value={fmtRs(calc.totalNfh)} highlight />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              )}
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
