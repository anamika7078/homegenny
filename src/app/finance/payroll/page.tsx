'use client';

/**
 * Payroll — one screen, one job.
 *
 * This page used to carry six tabs, then four: an analytics dashboard, a
 * 10-step batch pipeline, salary structures, employee salaries, statutory logs,
 * and — last and greyed out as "legacy" — the payroll this business actually
 * runs. Five of the six belonged to a company with internal salaried
 * departments, and depended on seventeen tables production never received.
 *
 * What is left is the whole job: work out what each placed staff member earned
 * from the attendance they worked, approve it, and pay it. Their salary slip
 * appears in HR by itself, and their pay lands on their client's one monthly
 * invoice — both built from the same payroll row, so they cannot disagree.
 *
 * See ONE_STAFF_MODEL_PLAN.md §F6.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, FileText, Users, Eye } from 'lucide-react';
import { LegacyDisbursementTab } from './components/legacy-disbursement-tab';
import { RunStaffPayrollModal } from './components/run-staff-payroll-modal';

export default function FinancePayrollPage() {
  const [showPreview, setShowPreview] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="page-padding space-y-6 min-h-screen bg-[#0b101b] text-white">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#131d31] via-[#162238] to-[#111827] p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              Payroll
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Staff Salaries
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Each staff member is paid from the attendance they worked with their client.
              Statutory ESIC, PF, professional tax and TDS are applied per person. The salary
              slip appears in HR on its own, and the same figures go onto that client&apos;s
              single monthly invoice.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/*
              Check one person before committing the month. Run Payroll pays
              everyone at once, which is the right default but a poor way to
              find out a figure looks wrong.
            */}
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/10 transition"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              Check one staff member
            </button>
            <Link
              href="/finance/invoices"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/10 transition"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              Client Invoices
            </Link>
            <Link
              href="/hr/payroll"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/10 transition"
            >
              <Users className="w-4 h-4 text-indigo-400" />
              Salary Slips
            </Link>
          </div>
        </div>
      </div>

      <LegacyDisbursementTab key={reloadKey} />

      {showPreview && (
        <RunStaffPayrollModal
          onClose={() => setShowPreview(false)}
          onGenerated={() => {
            setShowPreview(false);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
