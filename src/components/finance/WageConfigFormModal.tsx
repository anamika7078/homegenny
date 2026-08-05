'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Calculator, Eye, EyeOff, MapPin, IndianRupee, ShieldAlert,
  BadgePercent, ChevronUp, ChevronDown, Loader2, Building2
} from 'lucide-react';
import { computeWageBreakup, fmtRs, WageConfigInput } from '@/lib/finance/wageEngine';

export interface WageConfigFormData extends WageConfigInput {
  // Master config basic fields
  state: string;
  zone: string;
  category: string;
  effective_date: string;
  basic_wage: number;
  da: number;
  hra: number;
  skilled_allowance: number;
  shift_pattern: '8' | '12';
  
  // Statutory percentages & amounts
  employer_pf_pct: number;
  employer_pf_max: number;
  employee_pf_pct: number;
  employer_esic_pct: number;
  employee_esic_pct: number;
  bonus_pct: number;
  leave_days: number;
  lwf_amount: number;
  uniform_allowance: number;
  relieving_pct: number;
  management_pct: number;
  professional_tax: number;
  
  // Applicability Toggles
  pf_applicable: boolean;
  esic_applicable: boolean;
  bonus_applicable: boolean;
  bonus_frequency: 'monthly' | 'yearly';
  lwf_applicable: boolean;
  uniform_applicable: boolean;
  relieving_applicable: boolean;
  nfh_applicable: boolean;

  // GST
  gst_applicable: boolean;
  gst_type: 'intra_state' | 'inter_state';
  gst_pct: number;

  // Customer Assignment Mode specific fields (Picture 2)
  unit_code?: string;
  customer_name?: string;
  city?: string;
  no_of_resources?: number;
  working_hours?: number;
  shift_type?: string;
}

export interface UnitOption {
  unit_code: string;
  unit_name?: string;
  customer_id?: string;
  customer_name?: string;
  state?: string;
  city?: string;
  zone?: string;
}

interface WageConfigFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: WageConfigFormData) => Promise<void> | void;
  mode: 'master' | 'customer_assignment';
  categories: string[];
  units?: UnitOption[];
  initialData?: Partial<WageConfigFormData>;
  title?: string;
  submitText?: string;
  onUnitCodeSelect?: (unitCode: string) => void;
  onCategorySelect?: (category: string, state?: string, zone?: string) => Promise<any> | any;
}

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

const DEFAULT_FORM_DATA: WageConfigFormData = {
  state: '',
  zone: '',
  effective_date: new Date().toISOString().split('T')[0],
  category: 'Security Guard',
  basic_wage: 15000,
  da: 0,
  hra: 0,
  skilled_allowance: 0,
  shift_pattern: '8',
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
  pf_applicable: true,
  esic_applicable: true,
  bonus_applicable: true,
  bonus_frequency: 'monthly',
  lwf_applicable: true,
  uniform_applicable: true,
  relieving_applicable: true,
  nfh_applicable: false,
  gst_applicable: true,
  gst_type: 'intra_state',
  gst_pct: 18,
  unit_code: '',
  customer_name: '',
  city: '',
  no_of_resources: 1,
  working_hours: 8,
  shift_type: 'Day',
};

export default function WageConfigFormModal({
  isOpen,
  onClose,
  onSave,
  mode,
  categories,
  units = [],
  initialData,
  title,
  submitText,
  onUnitCodeSelect,
  onCategorySelect,
}: WageConfigFormModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [formData, setFormData] = useState<WageConfigFormData>(DEFAULT_FORM_DATA);

  const [expandedSections, setExpandedSections] = useState({
    phaseA: true, phaseB: true, phaseC: true, gst: true, employee: true, nfh: true,
  });

  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // Always start with a FRESH form - only carry over location/unit fields, never old calculation values
      const init: WageConfigFormData = {
        ...DEFAULT_FORM_DATA,
        // Only preserve customer assignment identity fields from initialData
        unit_code: initialData?.unit_code || '',
        customer_name: initialData?.customer_name || '',
        state: initialData?.state || '',
        city: initialData?.city || '',
        zone: initialData?.zone || '',
        category: initialData?.category || categories[0] || 'Security Guard',
        no_of_resources: initialData?.no_of_resources || 1,
        working_hours: initialData?.working_hours || 8,
        shift_type: initialData?.shift_type || 'Day',
      };

      // Auto-fill customer_name, state, city, zone if unit_code is present in units
      if (init.unit_code && units.length > 0) {
        const foundUnit = units.find((u) => u.unit_code === init.unit_code);
        if (foundUnit) {
          init.customer_name = foundUnit.customer_name || init.customer_name || '';
          init.state = foundUnit.state || init.state || 'Delhi NCR';
          init.city = foundUnit.city || init.city || 'Gurugram';
          init.zone = foundUnit.zone || init.zone || 'Zone A';
        }
      }

      setFormData(init);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialData, categories, units]);

  const calc = useMemo(() => {
    return computeWageBreakup(formData, mode === 'customer_assignment' ? formData.working_hours : undefined);
  }, [formData, mode]);

  if (!isOpen || !mounted) return null;

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleInputChange = (key: keyof WageConfigFormData, val: any) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        [key]: typeof val === 'string' && !isNaN(Number(val)) && val !== '' &&
          !['state', 'zone', 'category', 'effective_date', 'shift_pattern', 'bonus_frequency', 'unit_code', 'customer_name', 'city', 'shift_type', 'gst_type'].includes(key)
          ? Number(val)
          : val,
      };

      // Handle Unit Code change & auto-fill customer, state, city, zone
      if (key === 'unit_code') {
        if (!val) {
          next.unit_code = '';
          next.customer_name = '';
          next.state = '';
          next.city = '';
          next.zone = '';
        } else {
          const selectedUnit = units.find((u) => u.unit_code === val);
          if (selectedUnit) {
            next.customer_name = selectedUnit.customer_name || '';
            next.state = selectedUnit.state || 'Delhi NCR';
            next.city = selectedUnit.city || 'Gurugram';
            next.zone = selectedUnit.zone || 'Zone A';
          }
        }
        if (onUnitCodeSelect) onUnitCodeSelect(val);
      }

      // When category changes, reset all wage calculation fields to defaults for a fresh calculation
      if (key === 'category') {
        next.basic_wage = DEFAULT_FORM_DATA.basic_wage;
        next.da = DEFAULT_FORM_DATA.da;
        next.hra = DEFAULT_FORM_DATA.hra;
        next.skilled_allowance = DEFAULT_FORM_DATA.skilled_allowance;
        next.employer_pf_pct = DEFAULT_FORM_DATA.employer_pf_pct;
        next.employer_pf_max = DEFAULT_FORM_DATA.employer_pf_max;
        next.employee_pf_pct = DEFAULT_FORM_DATA.employee_pf_pct;
        next.employer_esic_pct = DEFAULT_FORM_DATA.employer_esic_pct;
        next.employee_esic_pct = DEFAULT_FORM_DATA.employee_esic_pct;
        next.bonus_pct = DEFAULT_FORM_DATA.bonus_pct;
        next.leave_days = DEFAULT_FORM_DATA.leave_days;
        next.lwf_amount = DEFAULT_FORM_DATA.lwf_amount;
        next.uniform_allowance = DEFAULT_FORM_DATA.uniform_allowance;
        next.relieving_pct = DEFAULT_FORM_DATA.relieving_pct;
        next.management_pct = DEFAULT_FORM_DATA.management_pct;
        next.professional_tax = DEFAULT_FORM_DATA.professional_tax;
        next.pf_applicable = DEFAULT_FORM_DATA.pf_applicable;
        next.esic_applicable = DEFAULT_FORM_DATA.esic_applicable;
        next.bonus_applicable = DEFAULT_FORM_DATA.bonus_applicable;
        next.lwf_applicable = DEFAULT_FORM_DATA.lwf_applicable;
        next.uniform_applicable = DEFAULT_FORM_DATA.uniform_applicable;
        next.relieving_applicable = DEFAULT_FORM_DATA.relieving_applicable;
        next.nfh_applicable = DEFAULT_FORM_DATA.nfh_applicable;
      }

      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      console.error('Failed to submit form:', err);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-500/60 transition placeholder:text-slate-600";
  const labelCls = "text-[11px] font-semibold text-slate-400 mb-1 block uppercase tracking-wider";

  const modalTitle = title || (mode === 'customer_assignment' ? 'Assign Staff / Commercial Calculator' : 'Create Wage Config Revision');
  const modalSubmitText = submitText || (mode === 'customer_assignment' ? 'Save Staff Assignment' : 'Submit Revision');

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#070b14]/95 backdrop-blur-md p-3 sm:p-6 overflow-hidden">
      <div className={`w-full ${showLivePreview ? 'max-w-6xl' : 'max-w-3xl'} h-[92vh] max-h-[850px] bg-[#0b1120] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative transition-all duration-300`}>
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 px-6 py-4 bg-[#0f172a] flex-shrink-0 z-30 shadow-lg relative">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">{modalTitle}</h3>
              <p className="text-xs text-slate-400">
                {mode === 'customer_assignment'
                  ? 'Configure unit code, staff requirements, and wage breakup.'
                  : 'Revision rules prevent updates to existing configs. Submit a new revision.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          
          {/* LEFT: Form Inputs */}
          <div className="flex-1 px-6 sm:px-8 py-6 space-y-6 overflow-y-auto min-h-0 custom-scrollbar">
            
            {/* PICTURE 2: Customer / Unit Selection Header (Visible ONLY in customer_assignment mode) */}
            {mode === 'customer_assignment' && (
              <div className="space-y-3 bg-gradient-to-r from-orange-500/10 via-slate-900/40 to-slate-900/40 rounded-xl p-4 border border-orange-500/20">
                <h4 className="text-xs uppercase font-bold tracking-wider text-orange-400 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" />
                  Customer & Unit Assignment
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  <div className="sm:col-span-1">
                    <label className={labelCls}>1. Unit Code *</label>
                    <select
                      value={formData.unit_code || ''}
                      onChange={(e) => handleInputChange('unit_code', e.target.value)}
                      className={inputCls}
                      required
                    >
                      <option value="">Select Unit Code</option>
                      {units.map((u) => (
                        <option key={u.unit_code} value={u.unit_code}>
                          {u.unit_code} {u.customer_name ? `(${u.customer_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <label className={labelCls}>2. Customer Name</label>
                    <input
                      type="text"
                      readOnly
                      value={formData.customer_name || ''}
                      placeholder="Customer Name"
                      className={`${inputCls} bg-slate-900/40 text-slate-400 cursor-not-allowed`}
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className={labelCls}>3. State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="e.g. Delhi NCR"
                      className={inputCls}
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className={labelCls}>4. City</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="e.g. Gurugram"
                      className={inputCls}
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className={labelCls}>5. Zone</label>
                    <input
                      type="text"
                      value={formData.zone}
                      onChange={(e) => handleInputChange('zone', e.target.value)}
                      placeholder="Zone A"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Additional Resource Requirement Inputs */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/5">
                  <div>
                    <label className={labelCls}>No. of Resources</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.no_of_resources || 1}
                      onChange={(e) => handleInputChange('no_of_resources', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Working Hours / Shift</label>
                    <select
                      value={formData.working_hours || 8}
                      onChange={(e) => handleInputChange('working_hours', e.target.value)}
                      className={inputCls}
                    >
                      <option value={8}>8 Hours</option>
                      <option value={12}>12 Hours (Includes +50% Additional Hours)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Shift Type</label>
                    <select
                      value={formData.shift_type || 'Day'}
                      onChange={(e) => handleInputChange('shift_type', e.target.value)}
                      className={inputCls}
                    >
                      <option value="Day">Day Shift</option>
                      <option value="Night">Night Shift</option>
                      <option value="Rotational">Rotational</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* PICTURE 1: Basic Configuration (State, Zone, Category, Effective Date) */}
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

            {/* Wage Breakup */}
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

            {/* Applicability Toggles */}
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

            {/* GST Configuration */}
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

            {/* Compliance Rates */}
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

            {/* Submit Actions */}
            <div className="flex gap-4 border-t border-white/5 pt-6 pb-2">
              <button
                type="button"
                onClick={onClose}
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
                {modalSubmitText}
              </button>
            </div>
          </div>

          {/* RIGHT: Live Calculation Preview */}
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
                    {calc.additionalHours > 0 && (
                      <CalcRow label={`Additional Hours (+${calc.additionalHoursPct}%)`} value={fmtRs(calc.additionalHours)} highlight />
                    )}
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

              {/* Phase D - GST & Total Customer Billing */}
              <div className="space-y-1">
                <button type="button" onClick={() => toggleSection('gst')}
                  className="flex items-center justify-between w-full text-left py-1 hover:text-white transition">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Phase D — Customer Total Billing</span>
                  {expandedSections.gst ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                </button>
                {expandedSections.gst && (
                  <div className="space-y-0.5">
                    <CalcRow label="Single Head CTC" value={fmtRs(calc.totalCTC)} sub />
                    {calc.noOfResources > 1 && (
                      <CalcRow label={`Total Subtotal (${calc.noOfResources} Resources)`} value={fmtRs(calc.totalMonthlyBillingBeforeGst)} highlight />
                    )}
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
                    <CalcRow label="Grand Total Customer Billing" value={fmtRs(calc.grandTotalWithGst)} highlight />
                  </div>
                )}
              </div>

              <div className="border-t border-white/5" />

              {/* Employee Salary */}
              <div className="space-y-1">
                <button type="button" onClick={() => toggleSection('employee')}
                  className="flex items-center justify-between w-full text-left py-1 hover:text-white transition">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Employee Take-Home (Per Head)</span>
                  {expandedSections.employee ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
                </button>
                {expandedSections.employee && (
                  <div className="space-y-0.5">
                    <CalcRow label="Single Head Gross Earnings" value={fmtRs(calc.grossEarnings)} sub />
                    <CalcRow label={`(−) Employee PF (${formData.employee_pf_pct}%)`} value={fmtRs(calc.epfoEmployee)}
                      dimmed={!formData.pf_applicable} />
                    <CalcRow label={`(−) Employee ESIC (${formData.employee_esic_pct}%)`} value={fmtRs(calc.esicEmployee)}
                      dimmed={!formData.esic_applicable} />
                    <CalcRow label="(−) Prof. Tax" value={fmtRs(formData.professional_tax)} dimmed={formData.professional_tax === 0} />
                    <CalcRow label="Total Deductions" value={fmtRs(calc.totalDeductions)} />
                    <CalcRow label="Net Take-Home (Per Head)" value={fmtRs(calc.netSalary)} highlight />
                  </div>
                )}
              </div>

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
                      <div className="space-y-0.5 font-mono text-xs">
                        <CalcRow label="Double Pay / Day" value={fmtRs(calc.nfhPayDouble)} />
                        <CalcRow label="ESIC on NFH" value={fmtRs(calc.nfhEsic)} />
                        <CalcRow label="Service Charge on NFH" value={fmtRs(calc.nfhServiceCharge)} />
                        <CalcRow label="Total NFH Claim / Day" value={fmtRs(calc.totalNfh)} highlight />
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
  );
}
