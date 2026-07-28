'use client';

import React, { useState } from 'react';
import {
  BarChart2, PlayCircle, Layers, UserCheck, Clock, History, Building2, ShieldCheck,
} from 'lucide-react';
import { PayrollDashboardTab } from './components/payroll-dashboard-tab';
import { ProcessingPipelineTab } from './components/processing-pipeline-tab';
import { SalaryStructureTab } from './components/salary-structure-tab';
import { EmployeeSalaryTab } from './components/employee-salary-tab';
import { AttendanceIntegrationTab } from './components/attendance-integration-tab';
import { LegacyDisbursementTab } from './components/legacy-disbursement-tab';

export default function EnterpriseFinancePayrollPage() {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PIPELINE' | 'STRUCTURES' | 'EMPLOYEES' | 'INTEGRATION' | 'LEGACY'>('DASHBOARD');

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
              Enterprise Clean Architecture · HR & Finance Synchronized
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Enterprise Payroll & Statutory Management
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Automated 10-step salary calculation pipeline with multi-tier approvals (Level 1 HR → Level 2 Finance → Level 3 Admin), attendance proration, overtime evaluations, statutory compliance (PF, ESIC, PT, TDS), loan recovery, and direct bank transfer exports.
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
              onClick={() => setActiveTab('STRUCTURES')}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/10 transition"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              Salary Templates
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

        <button
          onClick={() => setActiveTab('STRUCTURES')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition
            ${activeTab === 'STRUCTURES'
              ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-950/50'
              : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <Layers className="w-4 h-4" />
          Salary Structures
        </button>

        <button
          onClick={() => setActiveTab('EMPLOYEES')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition
            ${activeTab === 'EMPLOYEES'
              ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-950/50'
              : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <UserCheck className="w-4 h-4" />
          Employee Salaries & Bank
        </button>

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

        <button
          onClick={() => setActiveTab('LEGACY')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition
            ${activeTab === 'LEGACY'
              ? 'bg-white/10 text-white border border-white/20'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
        >
          <History className="w-4 h-4" />
          Legacy Placement Payroll
        </button>
      </div>

      {/* Tab Content Display */}
      <div className="pt-2">
        {activeTab === 'DASHBOARD' && <PayrollDashboardTab />}
        {activeTab === 'PIPELINE' && <ProcessingPipelineTab />}
        {activeTab === 'STRUCTURES' && <SalaryStructureTab />}
        {activeTab === 'EMPLOYEES' && <EmployeeSalaryTab />}
        {activeTab === 'INTEGRATION' && <AttendanceIntegrationTab />}
        {activeTab === 'LEGACY' && <LegacyDisbursementTab />}
      </div>
    </div>
  );
}
