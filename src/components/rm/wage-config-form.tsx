'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Calculator } from 'lucide-react';
import { api } from '@/lib/api/client';

export interface WageConfig {
  basic_wage: string;
  da: string;
  hra: string;
  skilled_allowance: string;
  working_hours: '8' | '12';
  pf_applicable: boolean;
  employer_pf_pct: string;
  employer_pf_max: string;
  employee_pf_pct: string;
  esic_applicable: boolean;
  employer_esic_pct: string;
  employee_esic_pct: string;
  bonus_applicable: boolean;
  bonus_pct: string;
  bonus_frequency: 'monthly' | 'yearly';
  leave_days: string;
  lwf_applicable: boolean;
  lwf_amount: string;
  uniform_applicable: boolean;
  uniform_allowance: string;
  relieving_applicable: boolean;
  relieving_pct: string;
  management_pct: string;
  professional_tax: string;
  gst_applicable: boolean;
  gst_type: 'intra_state' | 'inter_state';
  gst_pct: string;
}

export const DEFAULT_WAGE_CONFIG: WageConfig = {
  basic_wage: '',
  da: '',
  hra: '',
  skilled_allowance: '',
  working_hours: '8',
  pf_applicable: true,
  employer_pf_pct: '13',
  employer_pf_max: '15000',
  employee_pf_pct: '12',
  esic_applicable: true,
  employer_esic_pct: '3.25',
  employee_esic_pct: '0.75',
  bonus_applicable: true,
  bonus_pct: '8.33',
  bonus_frequency: 'monthly',
  leave_days: '32',
  lwf_applicable: true,
  lwf_amount: '62',
  uniform_applicable: true,
  uniform_allowance: '275',
  relieving_applicable: false,
  relieving_pct: '0',
  management_pct: '15',
  professional_tax: '200',
  gst_applicable: true,
  gst_type: 'intra_state',
  gst_pct: '18',
};

interface WageBreakup {
  netSalary: number;
  managementFee: number;
  grossEarnings: number;
  totalCTC: number;
  epfoEmployer: number;
  epfoEmployee: number;
  esicEmployer: number;
  esicEmployee: number;
  bonusMonthly: number;
  totalGstAmount: number;
}

function toPayload(c: WageConfig) {
  return {
    basic_wage: Number(c.basic_wage) || 0,
    da: Number(c.da) || 0,
    hra: Number(c.hra) || 0,
    skilled_allowance: Number(c.skilled_allowance) || 0,
    working_hours: Number(c.working_hours),
    pf_applicable: c.pf_applicable,
    employer_pf_pct: Number(c.employer_pf_pct) || 0,
    employer_pf_max: Number(c.employer_pf_max) || 0,
    employee_pf_pct: Number(c.employee_pf_pct) || 0,
    esic_applicable: c.esic_applicable,
    employer_esic_pct: Number(c.employer_esic_pct) || 0,
    employee_esic_pct: Number(c.employee_esic_pct) || 0,
    bonus_applicable: c.bonus_applicable,
    bonus_pct: Number(c.bonus_pct) || 0,
    bonus_frequency: c.bonus_frequency,
    leave_days: Number(c.leave_days) || 0,
    lwf_applicable: c.lwf_applicable,
    lwf_amount: Number(c.lwf_amount) || 0,
    uniform_applicable: c.uniform_applicable,
    uniform_allowance: Number(c.uniform_allowance) || 0,
    relieving_applicable: c.relieving_applicable,
    relieving_pct: Number(c.relieving_pct) || 0,
    management_pct: Number(c.management_pct) || 0,
    professional_tax: Number(c.professional_tax) || 0,
    gst_applicable: c.gst_applicable,
    gst_type: c.gst_type,
    gst_pct: Number(c.gst_pct) || 0,
  };
}

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF5A1F]/50';
const labelCls = 'text-[11px] font-semibold text-muted-foreground';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[#FF5A1F]" />
      {label}
    </label>
  );
}

/** Debounced wage config form — computes a live breakdown via POST /placements/calculate-wage
 *  and reports the resulting staff_salary/management_fee back to the parent. */
export function WageConfigForm({
  onResult,
}: {
  onResult: (result: { staffSalary: number; managementFee: number; breakup: WageBreakup } | null) => void;
}) {
  const [config, setConfig] = useState<WageConfig>(DEFAULT_WAGE_CONFIG);
  const calc = useMutation({
    mutationFn: (c: WageConfig) => api.calculateWage(toPayload(c)),
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      calc.mutate(config, {
        onSuccess: (res) => {
          const breakup = res as WageBreakup;
          onResult({ staffSalary: breakup.netSalary, managementFee: breakup.managementFee, breakup });
        },
        onError: () => onResult(null),
      });
    }, 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const set = <K extends keyof WageConfig>(key: K, value: WageConfig[K]) => setConfig((c) => ({ ...c, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Basic Wage (₹/mo)">
          <input className={inputCls} type="number" value={config.basic_wage} onChange={(e) => set('basic_wage', e.target.value)} />
        </Field>
        <Field label="DA (₹/mo)">
          <input className={inputCls} type="number" value={config.da} onChange={(e) => set('da', e.target.value)} />
        </Field>
        <Field label="HRA (₹/mo)">
          <input className={inputCls} type="number" value={config.hra} onChange={(e) => set('hra', e.target.value)} />
        </Field>
        <Field label="Skilled Allowance (₹/mo)">
          <input className={inputCls} type="number" value={config.skilled_allowance} onChange={(e) => set('skilled_allowance', e.target.value)} />
        </Field>
        <Field label="Working Hours">
          <select className={inputCls} value={config.working_hours} onChange={(e) => set('working_hours', e.target.value as '8' | '12')}>
            <option value="8" className="bg-[#0E1420]">8 hours</option>
            <option value="12" className="bg-[#0E1420]">12 hours</option>
          </select>
        </Field>
        <Field label="Leave Days / Year">
          <input className={inputCls} type="number" value={config.leave_days} onChange={(e) => set('leave_days', e.target.value)} />
        </Field>
      </div>

      <div className="space-y-2 p-3 rounded-lg bg-white/3 border border-white/8">
        <ToggleRow label="PF Applicable" checked={config.pf_applicable} onChange={(v) => set('pf_applicable', v)} />
        {config.pf_applicable && (
          <div className="grid grid-cols-3 gap-2 pl-6">
            <Field label="Employer PF %"><input className={inputCls} type="number" value={config.employer_pf_pct} onChange={(e) => set('employer_pf_pct', e.target.value)} /></Field>
            <Field label="PF Max Base (₹)"><input className={inputCls} type="number" value={config.employer_pf_max} onChange={(e) => set('employer_pf_max', e.target.value)} /></Field>
            <Field label="Employee PF %"><input className={inputCls} type="number" value={config.employee_pf_pct} onChange={(e) => set('employee_pf_pct', e.target.value)} /></Field>
          </div>
        )}
      </div>

      <div className="space-y-2 p-3 rounded-lg bg-white/3 border border-white/8">
        <ToggleRow label="ESIC Applicable" checked={config.esic_applicable} onChange={(v) => set('esic_applicable', v)} />
        {config.esic_applicable && (
          <div className="grid grid-cols-2 gap-2 pl-6">
            <Field label="Employer ESIC %"><input className={inputCls} type="number" value={config.employer_esic_pct} onChange={(e) => set('employer_esic_pct', e.target.value)} /></Field>
            <Field label="Employee ESIC %"><input className={inputCls} type="number" value={config.employee_esic_pct} onChange={(e) => set('employee_esic_pct', e.target.value)} /></Field>
          </div>
        )}
      </div>

      <div className="space-y-2 p-3 rounded-lg bg-white/3 border border-white/8">
        <ToggleRow label="Bonus Applicable" checked={config.bonus_applicable} onChange={(v) => set('bonus_applicable', v)} />
        {config.bonus_applicable && (
          <div className="grid grid-cols-2 gap-2 pl-6">
            <Field label="Bonus %"><input className={inputCls} type="number" value={config.bonus_pct} onChange={(e) => set('bonus_pct', e.target.value)} /></Field>
            <Field label="Frequency">
              <select className={inputCls} value={config.bonus_frequency} onChange={(e) => set('bonus_frequency', e.target.value as 'monthly' | 'yearly')}>
                <option value="monthly" className="bg-[#0E1420]">Monthly</option>
                <option value="yearly" className="bg-[#0E1420]">Yearly</option>
              </select>
            </Field>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-white/3 border border-white/8">
        <div className="space-y-2">
          <ToggleRow label="LWF" checked={config.lwf_applicable} onChange={(v) => set('lwf_applicable', v)} />
          {config.lwf_applicable && <input className={inputCls} type="number" placeholder="Amount" value={config.lwf_amount} onChange={(e) => set('lwf_amount', e.target.value)} />}
        </div>
        <div className="space-y-2">
          <ToggleRow label="Uniform" checked={config.uniform_applicable} onChange={(v) => set('uniform_applicable', v)} />
          {config.uniform_applicable && <input className={inputCls} type="number" placeholder="Amount" value={config.uniform_allowance} onChange={(e) => set('uniform_allowance', e.target.value)} />}
        </div>
        <div className="space-y-2 col-span-2">
          <ToggleRow label="Relieving Allowance" checked={config.relieving_applicable} onChange={(v) => set('relieving_applicable', v)} />
          {config.relieving_applicable && <input className={inputCls} type="number" placeholder="Relieving %" value={config.relieving_pct} onChange={(e) => set('relieving_pct', e.target.value)} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Management Fee %">
          <input className={inputCls} type="number" value={config.management_pct} onChange={(e) => set('management_pct', e.target.value)} />
        </Field>
        <Field label="Professional Tax (₹)">
          <input className={inputCls} type="number" value={config.professional_tax} onChange={(e) => set('professional_tax', e.target.value)} />
        </Field>
      </div>

      <div className="space-y-2 p-3 rounded-lg bg-white/3 border border-white/8">
        <ToggleRow label="GST Applicable" checked={config.gst_applicable} onChange={(v) => set('gst_applicable', v)} />
        {config.gst_applicable && (
          <div className="grid grid-cols-2 gap-2 pl-6">
            <Field label="GST Type">
              <select className={inputCls} value={config.gst_type} onChange={(e) => set('gst_type', e.target.value as 'intra_state' | 'inter_state')}>
                <option value="intra_state" className="bg-[#0E1420]">Intra-state (CGST+SGST)</option>
                <option value="inter_state" className="bg-[#0E1420]">Inter-state (IGST)</option>
              </select>
            </Field>
            <Field label="GST %"><input className={inputCls} type="number" value={config.gst_pct} onChange={(e) => set('gst_pct', e.target.value)} /></Field>
          </div>
        )}
      </div>

      <div className="p-4 rounded-xl bg-[#FF5A1F]/5 border border-[#FF5A1F]/20 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#FF5A1F] uppercase tracking-wider">
          <Calculator className="w-3.5 h-3.5" /> Live Breakdown
        </div>
        {calc.isPending && <p className="text-xs text-muted-foreground">Calculating…</p>}
        {calc.isError && <p className="text-xs text-red-400">{calc.error.message}</p>}
        {calc.data && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <Row label="Gross Earnings" value={(calc.data as WageBreakup).grossEarnings} />
            <Row label="Net Salary (to staff)" value={(calc.data as WageBreakup).netSalary} highlight />
            <Row label="Employer PF" value={(calc.data as WageBreakup).epfoEmployer} />
            <Row label="Employee PF" value={(calc.data as WageBreakup).epfoEmployee} />
            <Row label="Employer ESIC" value={(calc.data as WageBreakup).esicEmployer} />
            <Row label="Employee ESIC" value={(calc.data as WageBreakup).esicEmployee} />
            <Row label="Bonus (monthly)" value={(calc.data as WageBreakup).bonusMonthly} />
            <Row label="Management Fee" value={(calc.data as WageBreakup).managementFee} highlight />
            <Row label="GST Amount" value={(calc.data as WageBreakup).totalGstAmount} />
            <Row label="Total CTC" value={(calc.data as WageBreakup).totalCTC} highlight />
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? 'font-bold text-foreground' : 'text-foreground'}>
        ₹{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </span>
    </div>
  );
}
