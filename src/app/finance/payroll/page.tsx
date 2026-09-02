'use client';

import React, { useState } from 'react';
import {
  BarChart2, PlayCircle, Clock, History, Building2, ShieldCheck,
} from 'lucide-react';
import { PayrollDashboardTab } from './components/payroll-dashboard-tab';
import { ProcessingPipelineTab } from './components/processing-pipeline-tab';
import { AttendanceIntegrationTab } from './components/attendance-integration-tab';
import { LegacyDisbursementTab } from './components/legacy-disbursement-tab';

export default function EnterpriseFinancePayrollPage() {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PIPELINE' | 'INTEGRATION' | 'LEGACY'>('DASHBOARD');

  return (
    <div className="page-padding space-y-6 min-h-screen bg-[#0b101b] text-white">
      {/* Enterprise Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#131d31] via-[#162238] to-[#111827] p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              Placement Payroll · HR & Finance Synchronized
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Payroll & Statutory Management
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Staff placed with a client are paid from their own attendance, with statutory compliance (PF, ESIC, PT, TDS) applied per person. Each client then receives a single monthly invoice listing every staff member placed with them.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('PIPELINE')}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 transition hover:scale-[1.02]"
            >
              <PlayCircle className="w-4 h-4" />
              Run Batch Pipeline
            </button>
            <button
              onClick={() => setActiveTab('LEGACY')}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/10 transition"
            >
              <History className="w-4 h-4 text-emerald-400" />
              Placement Payroll
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 scrollbar-none">
        <button
          onClick={() => setActiveTab('DASHBOARD')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition
            ${activeTab === 'DASHBOARD'
              ? 'bg-gradient-to-r from-emerald-600/20 to-teal-600/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/50'
              : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <BarChart2 className="w-4 h-4" />
          Analytics Dashboard
        </button>

        <button
          onClick={() => setActiveTab('PIPELINE')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition
            ${activeTab === 'PIPELINE'
              ? 'bg-gradient-to-r from-emerald-600/20 to-teal-600/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/50'
              : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <PlayCircle className="w-4 h-4" />
          10-Step Processing Pipeline
        </button>

        {/*
          "Salary Structures" and "Employee Salaries & Bank" used to sit here.
          They belong to a company with internal salaried departments — their
          own dashboard named Engineering and Sales & Marketing. HomeGenny has
          one kind of staff: the person RM places with a client. Those tabs also
          depend on 17 tables that were never deployed to production, which is
          why they returned 500. See ONE_STAFF_MODEL_PLAN.md §F1.
        */}

        <button
          onClick={() => setActiveTab('INTEGRATION')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition
            ${activeTab === 'INTEGRATION'
              ? 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-950/50'
              : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <Clock className="w-4 h-4" />
          Attendance & Statutory Logs
        </button>

        {/*
          Not "legacy" — this is the payroll this business actually runs. Every
          staff member is placed with a client and paid from their attendance,
          and the client invoice is built from these records. It was styled as
          deprecated while the enterprise batch tabs took top billing, which had
          it exactly backwards.
        */}
        <button
          onClick={() => setActiveTab('LEGACY')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition
            ${activeTab === 'LEGACY'
              ? 'bg-gradient-to-r from-emerald-600/20 to-teal-600/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-950/50'
              : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <History className="w-4 h-4" />
          Placement Payroll
        </button>
      </div>

      {/* Tab Content Display */}
      <div className="pt-2">
        {activeTab === 'DASHBOARD' && <PayrollDashboardTab />}
        {activeTab === 'PIPELINE' && <ProcessingPipelineTab />}
        {activeTab === 'INTEGRATION' && <AttendanceIntegrationTab />}
        {activeTab === 'LEGACY' && <LegacyDisbursementTab />}
      </div>
    </div>
  );
}
