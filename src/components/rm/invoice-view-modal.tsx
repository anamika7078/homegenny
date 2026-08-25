'use client';

import React from 'react';
import type { AttendanceInvoicePreview } from '@/lib/types';

function fmtRs(n: number | string) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n))}`;
}

interface InvoiceViewModalProps {
  data: AttendanceInvoicePreview | Record<string, unknown> | null;
  onClose: () => void;
  title?: string;
}

export function InvoiceViewModal({ data, onClose, title }: InvoiceViewModalProps) {
  if (!data) return null;

  const calc = (data as AttendanceInvoicePreview).calculation;
  const preview = data as AttendanceInvoicePreview;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-lg">
            {title ?? `Invoice Preview — ${preview.staff_name ?? preview.staff_code ?? 'Staff'}`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-1 text-sm">
          <Row label="Staff" value={`${preview.staff_code ?? ''} ${preview.staff_name ?? ''}`.trim()} />
          <Row label="Period" value={`${preview.period_month}/${preview.period_year}`} />
          <Row label="Monthly salary" value={fmtRs(preview.monthly_salary)} />
          <Row
            label="Attendance"
            value={`${preview.billable_days} billable / ${preview.days_in_month} days (P:${preview.present_days} L:${preview.leave_days} OT:${preview.overtime_days} A:${preview.absent_days})`}
          />
          <Row label="Prorated gross" value={fmtRs(preview.prorated_gross)} highlight />
          {calc && (
            <>
              {calc.managementFee != null && (
                <Row label="Management fee" value={fmtRs(calc.managementFee)} />
              )}
              {calc.gstOnFee != null && (
                <Row
                  label={`GST on fee${calc.ratesUsed ? ` (${calc.ratesUsed.gstPct}%)` : ''}`}
                  value={fmtRs(calc.gstOnFee)}
                />
              )}
              {calc.esicEmployee != null && calc.esicEmployee > 0 && (
                <Row
                  label={`ESIC (employee)${calc.ratesUsed ? ` (${calc.ratesUsed.esicEmployeePct}%)` : ''}`}
                  value={fmtRs(calc.esicEmployee)}
                />
              )}
              {calc.pfEmployee != null && calc.pfEmployee > 0 && (
                <Row
                  label={`PF (employee)${calc.ratesUsed ? ` (${calc.ratesUsed.pfEmployeePct}%)` : ''}`}
                  value={fmtRs(calc.pfEmployee)}
                />
              )}
              {calc.netSalary != null && (
                <Row label="Net salary" value={fmtRs(calc.netSalary)} />
              )}
              {calc.clientTotalCharge != null && (
                <Row label="Client total" value={fmtRs(calc.clientTotalCharge)} highlight />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between py-2 border-b border-white/5 gap-4">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className={`text-right ${highlight ? 'text-emerald-400 font-semibold' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}
