'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, ShieldCheck, Download, ChevronDown,
  RefreshCw, FileCheck,
} from 'lucide-react';

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n));
}
function fmtRs(n: number | string) { return `₹${fmt(n)}`; }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const currentDate = new Date();

export default function EsicPfPage() {
  const [month, setMonth]       = useState(currentDate.getMonth() + 1);
  const [year, setYear]         = useState(currentDate.getFullYear());
  const [activeTab, setActiveTab] = useState<'ESIC' | 'PF'>('ESIC');
  const [esicData, setEsicData] = useState<any>(null);
  const [pfData, setPfData]     = useState<any>(null);
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [esic, pf] = await Promise.all([
        api.getEsicChallan(month, year),
        api.getPfEcr(month, year),
      ]);
      setEsicData(esic);
      setPfData(pf);
    } catch (e: any) {
      showToast('error', e.message ?? 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month, year]);

  const handleExport = async (type: 'ESIC' | 'PF') => {
    try {
      const blob = await api.exportEsicPf(type, month, year);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HomeGenny_${type}_${month}_${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', `${type} report exported as CSV`);
    } catch (e: any) {
      showToast('error', e.message ?? 'Export failed');
    }
  };

  const years = Array.from({ length: 4 }, (_, i) => currentDate.getFullYear() - i);
  const data = activeTab === 'ESIC' ? esicData : pfData;
  const records = data?.records ?? [];

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">ESIC & PF Reports</h1>
          <p className="text-sm text-slate-400 mt-0.5">Monthly challan · PF ECR · Government filing export</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
              className="appearance-none bg-[#131c2e] border border-white/10 text-white text-sm rounded-xl pl-4 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500">
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="appearance-none bg-[#131c2e] border border-white/10 text-white text-sm rounded-xl pl-4 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
          <button id="btn-refresh-esic-pf" onClick={load} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && esicData && pfData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'ESIC Employee', value: fmtRs(esicData.total_employee_contribution), color: '#f59e0b' },
            { label: 'ESIC Employer', value: fmtRs(esicData.total_employer_contribution), color: '#fb923c' },
            { label: 'PF Employee',   value: fmtRs(pfData.total_employee_contribution),   color: '#a78bfa' },
            { label: 'PF Employer',   value: fmtRs(pfData.total_employer_contribution),   color: '#818cf8' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-white/8 bg-[#131c2e] p-4">
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">{label}</p>
              <p className="text-xl font-bold mt-1" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Compliance rules banner */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2 text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span className="font-semibold">ESIC:</span>
          <span>Employee 0.75% · Employer 3.25% · Applicable if gross ≤ ₹21,000</span>
        </div>
        <div className="flex items-center gap-2 text-purple-400">
          <ShieldCheck className="w-4 h-4" />
          <span className="font-semibold">PF:</span>
          <span>Employee 12% · Employer 12% · Wage ceiling ₹15,000</span>
        </div>
      </div>

      {/* Tabs + Export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1">
          {(['ESIC', 'PF'] as const).map((t) => (
            <button
              key={t}
              id={`tab-${t.toLowerCase()}`}
              onClick={() => setActiveTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition
                ${activeTab === t ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white border border-white/8'}`}
            >
              {t === 'ESIC' ? 'ESIC Challan' : 'PF ECR'}
            </button>
          ))}
        </div>
        <button
          id={`btn-export-${activeTab.toLowerCase()}`}
          onClick={() => handleExport(activeTab)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/8 bg-[#131c2e] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">
              {activeTab === 'ESIC' ? 'ESIC Challan' : 'PF ECR'} — {MONTHS[month - 1]} {year}
            </span>
            {data && <span className="text-xs text-slate-500">({data.staff_count} eligible staff)</span>}
          </div>
          {data && (
            <div className="text-sm font-bold text-emerald-400">
              Total: {fmtRs(activeTab === 'ESIC' ? data.total_challan_amount : data.total_ecr_amount)}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ShieldCheck className="w-10 h-10 text-slate-600" />
            <p className="text-slate-400 text-sm">No {activeTab} applicable records for {MONTHS[month - 1]} {year}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Staff Code</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-right">Gross Salary</th>
                  {activeTab === 'ESIC' ? (
                    <>
                      <th className="px-4 py-3 text-right">Employee (0.75%)</th>
                      <th className="px-4 py-3 text-right">Employer (3.25%)</th>
                      <th className="px-4 py-3 text-right">Total ESIC</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-right">PF Wage Base</th>
                      <th className="px-4 py-3 text-right">Employee (12%)</th>
                      <th className="px-4 py-3 text-right">Employer (12%)</th>
                      <th className="px-4 py-3 text-right">Total PF</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {records.map((r: any) => {
                  const gross = parseFloat(r.gross_salary);
                  if (activeTab === 'ESIC') {
                    const emp = parseFloat(r.esic_employee);
                    const er  = parseFloat(r.esic_employer);
                    return (
                      <tr key={r.staff_id} className="border-b border-white/5 hover:bg-white/2 transition">
                        <td className="px-5 py-3 font-mono text-xs text-slate-400">{r.staff_code}</td>
                        <td className="px-4 py-3 text-white">{r.staff_name}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{fmtRs(gross)}</td>
                        <td className="px-4 py-3 text-right text-amber-400">{fmtRs(emp)}</td>
                        <td className="px-4 py-3 text-right text-orange-400">{fmtRs(er)}</td>
                        <td className="px-4 py-3 text-right text-white font-bold">{fmtRs(emp + er)}</td>
                      </tr>
                    );
                  } else {
                    const pfBase = Math.min(gross, 15000);
                    const emp = parseFloat(r.pf_employee);
                    const er  = parseFloat(r.pf_employer);
                    return (
                      <tr key={r.staff_id} className="border-b border-white/5 hover:bg-white/2 transition">
                        <td className="px-5 py-3 font-mono text-xs text-slate-400">{r.staff_code}</td>
                        <td className="px-4 py-3 text-white">{r.staff_name}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{fmtRs(gross)}</td>
                        <td className="px-4 py-3 text-right text-slate-400">{fmtRs(pfBase)}</td>
                        <td className="px-4 py-3 text-right text-purple-400">{fmtRs(emp)}</td>
                        <td className="px-4 py-3 text-right text-violet-400">{fmtRs(er)}</td>
                        <td className="px-4 py-3 text-right text-white font-bold">{fmtRs(emp + er)}</td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
