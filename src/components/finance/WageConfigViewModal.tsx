'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Calculator, MapPin, Building2, ShieldCheck,
  Printer, X
} from 'lucide-react';
import { fmtRs } from '@/lib/finance/wageEngine';

interface WageConfigViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculationData: any;
}

function DetailRow({
  label,
  value,
  bold,
  sub,
  highlight,
  badge,
}: {
  label: string;
  value: string;
  bold?: boolean;
  sub?: boolean;
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 px-3 rounded-lg text-xs transition-colors ${
        highlight
          ? 'bg-orange-500/10 border border-orange-500/20 text-orange-300 font-bold'
          : sub
          ? 'bg-slate-900/60 font-semibold text-slate-200'
          : 'hover:bg-white/5 text-slate-300'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={bold || highlight || sub ? 'font-bold text-white' : 'text-slate-300'}>
          {label}
        </span>
        {badge && (
          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-slate-800 text-slate-400 border border-white/5 uppercase">
            {badge}
          </span>
        )}
      </div>
      <span className={`font-mono ${highlight ? 'text-orange-400 text-sm font-bold' : sub ? 'text-white font-bold' : 'text-slate-200'}`}>
        {value}
      </span>
    </div>
  );
}

export default function WageConfigViewModal({
  isOpen,
  onClose,
  calculationData,
}: WageConfigViewModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || !calculationData) return null;

  // Use saved items from database — these are the EXACT values that were calculated & saved in the form
  const itemsList = Array.isArray(calculationData.items) ? calculationData.items : [];
  const item = itemsList[0] || {};

  // All values come directly from the saved database record — NO re-calculation
  const basic = Number(item.basic) || 0;
  const da = Number(item.da) || 0;
  const hra = Number(item.hra) || 0;
  const skilledAllowance = Number(item.skilled_allowance) || 0;
  const additionalHours = Number(item.additional_hours) || 0;
  const subtotal1 = Number(item.subtotal1) || 0;
  const subtotal2 = Number(item.subtotal2) || 0;
  const employerPf = Number(item.employer_pf) || 0;
  const bonus = Number(item.bonus) || 0;
  const leaveWages = Number(item.leave_wages) || 0;
  const esic = Number(item.esic) || 0;
  const lwf = Number(item.lwf) || 0;
  const uniform = Number(item.uniform) || 0;
  const nfh = Number(item.nfh) || 0;
  const subtotal3 = Number(item.subtotal3) || 0;
  const relieving = Number(item.relieving) || 0;
  const subtotal4 = Number(item.subtotal4) || 0;
  const managementFee = Number(item.management_fee) || 0;
  const monthlyCost = Number(item.monthly_cost) || 0;
  const dailyRate = Number(item.daily_rate) || 0;
  const hourlyRate = Number(item.hourly_rate) || 0;
  const gst = Number(item.gst) || 0;
  const grandTotal = Number(item.grand_total) || 0;
  const grossSalary = Number(item.gross_salary) || 0;
  const employeePf = Number(item.employee_pf) || 0;
  const employeeEsic = Number(item.employee_esic) || 0;
  const professionalTax = Number(item.professional_tax) || 0;
  const netSalary = Number(item.net_salary) || 0;

  // Master-level totals from the calculation record
  const totalMonthlyCost = Number(calculationData.total_monthly_cost) || monthlyCost;
  const totalGst = Number(calculationData.total_gst) || gst;
  const totalGrandTotal = Number(calculationData.total_grand_total) || grandTotal;

  // Identity / location info
  const customerName = calculationData.customer_name || 'Customer N/A';
  const unitCode = calculationData.unit_code || 'N/A';
  const stateName = calculationData.state || 'Delhi NCR';
  const cityName = calculationData.city || '';
  const zoneName = calculationData.zone || 'Zone A';
  const categoryName = item.category || 'Security Guard';
  const resourceCount = Number(calculationData.total_resources) || Number(item.no_of_resources) || 1;
  const shiftHours = Number(item.working_hours) || 8;
  const shiftType = item.shift_type || 'Day';
  const revisionNumber = calculationData.revision_number || 1;
  const status = calculationData.status || 'DRAFT';

  // Per-head CTC = monthly_cost / no_of_resources (or if single resource, just monthly_cost)
  const noOfResInItem = Number(item.no_of_resources) || 1;
  const perHeadCTC = noOfResInItem > 1 ? monthlyCost / noOfResInItem : monthlyCost;

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-white/10 bg-slate-900/80 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Commercial Calculation Sheet</h3>
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-md bg-white/5 border border-white/10 text-orange-400">
                  REV-{revisionNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Saved calculation values as submitted</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
                status === 'APPROVED'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : status === 'SUBMITTED'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-slate-500/10 border-slate-500/30 text-slate-300'
              }`}
            >
              {status}
            </span>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
              title="Print / Export Sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* CUSTOMER & ASSIGNMENT SUMMARY HEADER */}
          <div className="bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 rounded-xl p-4 border border-white/10 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold text-white">{customerName}</span>
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-orange-500/10 border border-orange-500/20 text-orange-400">
                  {unitCode}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{stateName}</span>
                {cityName && <span>· {cityName}</span>}
                <span className="text-slate-500">({zoneName})</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Category</div>
                <div className="font-bold text-white mt-0.5">{categoryName}</div>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Requirements</div>
                <div className="font-bold text-orange-400 mt-0.5">{resourceCount} {resourceCount === 1 ? 'Resource' : 'Resources'}</div>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Shift Pattern</div>
                <div className="font-bold text-white mt-0.5">{shiftHours} Hours ({shiftType})</div>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-white/5">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Rate Per Day / Hour</div>
                <div className="font-bold text-emerald-400 font-mono mt-0.5">{fmtRs(dailyRate)} / {fmtRs(hourlyRate)}</div>
              </div>
            </div>
          </div>

          {/* 4 HIGH-LEVEL FINANCIAL SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/60 p-4 rounded-xl border border-white/10 text-center space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Per Head CTC</div>
              <div className="text-base font-bold text-white font-mono">{fmtRs(perHeadCTC)}</div>
              <div className="text-[10px] text-slate-500">Per Month / Head</div>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-white/10 text-center space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Net Take-Home</div>
              <div className="text-base font-bold text-emerald-400 font-mono">{fmtRs(netSalary)}</div>
              <div className="text-[10px] text-slate-500">Per Month / Head</div>
            </div>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-white/10 text-center space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Subtotal Billing</div>
              <div className="text-base font-bold text-orange-400 font-mono">{fmtRs(totalMonthlyCost)}</div>
              <div className="text-[10px] text-slate-500">{resourceCount} Resources (Excl. GST)</div>
            </div>
            <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/30 text-center space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-orange-300 font-bold">Grand Total</div>
              <div className="text-lg font-bold text-orange-400 font-mono">{fmtRs(totalGrandTotal)}</div>
              <div className="text-[10px] text-orange-300/80 font-medium">Incl. GST ({resourceCount} Resources)</div>
            </div>
          </div>

          {/* DETAILED PHASE BREAKDOWN GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* LEFT COLUMN: Phase A, Phase B, Employee Take Home */}
            <div className="space-y-5">
              
              {/* Phase A: Gross Salary */}
              <div className="bg-slate-900/40 rounded-xl p-4 border border-white/5 space-y-2">
                <h4 className="text-xs uppercase font-bold tracking-wider text-orange-400 border-b border-white/5 pb-2">
                  Phase A — Gross Salary Breakdown
                </h4>
                <DetailRow label="Basic Wage" value={fmtRs(basic)} />
                <DetailRow label="Dearness Allowance (DA)" value={fmtRs(da)} />
                <DetailRow label="Sub Total 1 (Basic + DA)" value={fmtRs(subtotal1)} sub />
                {additionalHours > 0 && (
                  <DetailRow label="Additional Hours Overtime (+50%)" value={fmtRs(additionalHours)} highlight />
                )}
                <DetailRow label="House Rent Allowance (HRA)" value={fmtRs(hra)} />
                <DetailRow label="Skilled Allowance" value={fmtRs(skilledAllowance)} />
                <DetailRow label="Sub Total 2 (Gross Base)" value={fmtRs(subtotal2)} sub />
              </div>

              {/* Phase B: Statutory Contributions */}
              <div className="bg-slate-900/40 rounded-xl p-4 border border-white/5 space-y-2">
                <h4 className="text-xs uppercase font-bold tracking-wider text-orange-400 border-b border-white/5 pb-2">
                  Phase B — Statutory Employer Contributions
                </h4>
                <DetailRow label="Statutory Bonus (8.33%)" value={fmtRs(bonus)} />
                <DetailRow label="Leave with Wages (32/312 Days)" value={fmtRs(leaveWages)} />
                <DetailRow label="EPFO Employer (13%)" value={fmtRs(employerPf)} />
                <DetailRow label="ESIC Employer (3.25%)" value={fmtRs(esic)} />
                <DetailRow label="Labour Welfare Fund (LWF)" value={fmtRs(lwf)} />
                <DetailRow label="Uniform Allowance" value={fmtRs(uniform)} />
              </div>

              {/* Employee Take Home */}
              <div className="bg-slate-900/40 rounded-xl p-4 border border-white/5 space-y-2">
                <h4 className="text-xs uppercase font-bold tracking-wider text-emerald-400 border-b border-white/5 pb-2">
                  Employee Take-Home (Per Head)
                </h4>
                <DetailRow label="Gross Earnings" value={fmtRs(grossSalary)} sub />
                <DetailRow label="(−) Employee EPFO (12%)" value={fmtRs(employeePf)} />
                <DetailRow label="(−) Employee ESIC (0.75%)" value={fmtRs(employeeEsic)} />
                <DetailRow label="(−) Professional Tax" value={fmtRs(professionalTax)} />
                <DetailRow label="Total Deductions" value={fmtRs(employeePf + employeeEsic + professionalTax)} />
                <DetailRow label="Net Take-Home Salary" value={fmtRs(netSalary)} highlight />
              </div>

            </div>

            {/* RIGHT COLUMN: Phase C, Phase D */}
            <div className="space-y-5">
              
              {/* Phase C: CTC */}
              <div className="bg-slate-900/40 rounded-xl p-4 border border-white/5 space-y-2">
                <h4 className="text-xs uppercase font-bold tracking-wider text-orange-400 border-b border-white/5 pb-2">
                  Phase C — Cost to Company (CTC)
                </h4>
                <DetailRow label="Sub Total 3 (Accumulated Cost)" value={fmtRs(subtotal3)} sub />
                <DetailRow label="Relieving Charges (16.67%)" value={fmtRs(relieving)} />
                <DetailRow label="Sub Total 4 (Pre-Management Fee)" value={fmtRs(subtotal4)} sub />
                <DetailRow label="Management / Service Fee (5.5%)" value={fmtRs(managementFee)} />
                <DetailRow label="Total Monthly CTC (Per Head)" value={fmtRs(perHeadCTC)} highlight />
                
                <div className="grid grid-cols-2 gap-2 pt-2 mt-2 border-t border-white/5 font-mono text-xs">
                  <div className="bg-slate-950/60 p-2 rounded-lg text-center border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Rate Per Day</div>
                    <div className="font-bold text-white mt-0.5">{fmtRs(dailyRate)}</div>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-lg text-center border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Rate Per Hour</div>
                    <div className="font-bold text-white mt-0.5">{fmtRs(hourlyRate)}</div>
                  </div>
                </div>
              </div>

              {/* Phase D: Customer Billing & GST */}
              <div className="bg-slate-900/40 rounded-xl p-4 border border-white/5 space-y-2">
                <h4 className="text-xs uppercase font-bold tracking-wider text-orange-400 border-b border-white/5 pb-2">
                  Phase D — Customer Total Billing & GST
                </h4>
                <DetailRow label="Per Head CTC" value={fmtRs(perHeadCTC)} />
                {resourceCount > 1 && (
                  <DetailRow label={`Subtotal (${resourceCount} Resources)`} value={fmtRs(totalMonthlyCost)} sub />
                )}
                <DetailRow label="GST (18%)" value={fmtRs(totalGst)} />
                <DetailRow label="Grand Total Customer Billing" value={fmtRs(totalGrandTotal)} highlight />
              </div>

              {/* NFH Extra Claim (If Applicable) */}
              {nfh > 0 && (
                <div className="bg-slate-900/40 rounded-xl p-4 border border-orange-500/20 space-y-2">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-orange-400 border-b border-white/5 pb-2">
                    National & Festival Holiday (NFH)
                  </h4>
                  <DetailRow label="NFH Amount" value={fmtRs(nfh)} highlight />
                </div>
              )}

            </div>

          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Values shown are exactly as saved during form submission</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition cursor-pointer border border-white/10"
          >
            Close
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
