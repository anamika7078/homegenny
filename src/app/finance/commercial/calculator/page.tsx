'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, Calculator, Save, User, MapPin, Plus, Trash2, CheckCircle2, ChevronRight,
} from 'lucide-react';

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n));
}
function fmtRs(n: number | string) { return `₹${fmt(n)}`; }

export default function CommercialCalculatorPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Unit-code centric selection states
  const [allUnits, setAllUnits] = useState<any[]>([]);
  const [selectedUnitCode, setSelectedUnitCode] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<any>(null);

  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [state, setState] = useState('Delhi NCR');
  const [zone, setZone] = useState('Zone A');
  const [contractDuration, setContractDuration] = useState(12);

  // Dynamic rows of calculator items
  const [items, setItems] = useState<any[]>([
    { category: 'Security Guard', no_of_resources: 1, working_hours: 8, shift_type: 'Day' },
  ]);

  // Results from backend
  const [results, setResults] = useState<any[]>([]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [custs, brs, cats] = await Promise.all([
        api.listFinanceCustomers(),
        api.getAdminBranches().catch(() => ({ data: [] })),
        api.getWageCategories(),
      ]);
      const custsData = (custs as any)?.data ?? custs;
      const brsData = (brs as any)?.data ?? brs;
      const catsData = (cats as any)?.data ?? cats;
      
      const parsedCusts = Array.isArray(custsData) ? custsData : [];
      setCustomers(parsedCusts);
      setBranches(Array.isArray(brsData) ? brsData : []);
      setCategories(Array.isArray(catsData) ? catsData : []);

      // Extract all unit codes across customers & branches into flat array
      const unitsList: any[] = [];
      parsedCusts.forEach((c: any) => {
        const cBranches = (c.branches && c.branches.length > 0)
          ? c.branches
          : [{
              unit_code: c.unit_code,
              unit_name: c.unit_name,
              address: c.address,
              state: c.state,
              city: c.city,
              pincode: c.pincode,
              gstn: c.gstn,
            }];
        cBranches.forEach((b: any) => {
          unitsList.push({
            ...b,
            customer_id: c.id,
            customer_name: c.customer_name,
            pan_card: c.pan_card,
            hq_address: c.address,
            hq_gstn: c.gstn,
          });
        });
      });
      setAllUnits(unitsList);
    } catch (e: any) {
      showToast('error', e.message ?? 'Failed to load master records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUnitCodeChange = (unitCode: string) => {
    setSelectedUnitCode(unitCode);
    const found = allUnits.find((u) => u.unit_code === unitCode);
    setSelectedUnit(found || null);
    if (found?.state) {
      setState(found.state);
    }
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      { category: categories[0] || 'Security Guard', no_of_resources: 1, working_hours: 8, shift_type: 'Day' },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, key: string, val: any) => {
    setItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: val } : row))
    );
  };

  const handleCalculate = async () => {
    if (!state || !zone) {
      showToast('error', 'State and Zone are required');
      return;
    }
    setCalculating(true);
    try {
      const res = await api.runCalculationOnTheFly({ state, zone, items });
      const resData = (res as any)?.data ?? res;
      if (!Array.isArray(resData)) {
        throw new Error((resData as any)?.message || 'Calculation returned invalid format');
      }
      setResults(resData);
      showToast('success', 'Calculated successfully!');
    } catch (e: any) {
      showToast('error', e.message ?? 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedUnit) {
      showToast('error', 'Please select a Unit Code first');
      return;
    }
    setSaving(true);
    try {
      await api.createCalculation({
        customer_id: selectedUnit.customer_id,
        branch_id: selectedBranchId || null,
        unit_code: selectedUnit.unit_code,
        state,
        zone,
        contract_duration_months: contractDuration,
        items,
        results,
      });
      showToast('success', 'Calculation saved as draft!');
    } catch (e: any) {
      showToast('error', e.message ?? 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  // Grand totals of results
  const resArray = Array.isArray(results) ? results : [];
  const totalCost = resArray.reduce((acc, r) => acc + Number(r.monthly_cost || 0), 0);
  const totalGst = resArray.reduce((acc, r) => acc + Number(r.gst || 0), 0);
  const totalGrand = resArray.reduce((acc, r) => acc + Number(r.grand_total || 0), 0);
  const totalResources = resArray.reduce((acc, r) => acc + Number(r.no_of_resources || 0), 0);

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

      {/* Top Bar / Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-7 h-7 text-orange-500" />
            Commercial Calculator
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Select Unit Code first — Customer Name, Branch, and Address will auto-fill automatically.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCalculate}
            disabled={calculating || items.length === 0}
            className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white font-semibold text-sm transition flex items-center gap-2"
          >
            {calculating && <Loader2 className="w-4 h-4 animate-spin text-orange-500" />}
            Calculate Rates
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={saving || results.length === 0}
            className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition flex items-center gap-2 shadow-lg shadow-orange-500/10"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft calculation
          </button>
        </div>
      </div>

      {/* Master Configuration Selection (Unit Code FIRST -> Auto-fill Customer, Branch & Address) */}
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* 1. Unit Code Selection (FIRST) */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
              1. Select Unit Code <span className="text-orange-400">*</span>
            </label>
            <select
              value={selectedUnitCode}
              onChange={(e) => handleUnitCodeChange(e.target.value)}
              className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono font-bold"
            >
              <option value="">Select Unit Code...</option>
              {allUnits.map((u, idx) => (
                <option key={idx} value={u.unit_code}>
                  [{u.unit_code}] {u.customer_name} — {u.unit_name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Customer Name (Auto-filled Read-Only) */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
              2. Customer Name <span className="text-emerald-400/70 text-[10px] uppercase font-normal">(Auto-filled)</span>
            </label>
            <div className="bg-slate-900/70 border border-white/8 rounded-xl px-4 py-2.5 text-sm h-11 flex items-center">
              {selectedUnit ? (
                <span className="text-white font-bold truncate">{selectedUnit.customer_name}</span>
              ) : (
                <span className="text-slate-600 italic text-xs">Auto-filled from Unit Code</span>
              )}
            </div>
          </div>

          {/* 3. Branch / Unit Name (Auto-filled Read-Only) */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
              3. Branch / Unit <span className="text-emerald-400/70 text-[10px] uppercase font-normal">(Auto-filled)</span>
            </label>
            <div className="bg-slate-900/70 border border-white/8 rounded-xl px-4 py-2.5 text-sm h-11 flex items-center">
              {selectedUnit ? (
                <span className="text-slate-200 font-semibold truncate">{selectedUnit.unit_name}</span>
              ) : (
                <span className="text-slate-600 italic text-xs">Auto-filled from Unit Code</span>
              )}
            </div>
          </div>

          {/* 4. State */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">4. State</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Delhi NCR / Haryana"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50"
            />
          </div>

          {/* 5. Zone */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">5. Zone</label>
            <input
              type="text"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="e.g. Zone A"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50"
            />
          </div>
        </div>

        {/* Auto-filled Branch Address Banner */}
        {selectedUnit && (
          <div className="pt-3 border-t border-white/8 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-900/60 px-4 py-3 rounded-xl border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-slate-300">Auto-filled Branch Address:</span>
              <span className="text-white font-medium">
                {[
                  selectedUnit.address,
                  selectedUnit.city,
                  selectedUnit.state,
                  selectedUnit.pincode ? `PIN: ${selectedUnit.pincode}` : '',
                ].filter(Boolean).join(', ') || selectedUnit.hq_address || 'N/A'}
              </span>
            </div>
            {selectedUnit.gstn && (
              <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                <span className="text-slate-500">GSTN:</span>
                <span className="text-slate-200">{selectedUnit.gstn}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Calculator Rows */}
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Calculator Rows</h2>
          <button
            onClick={addItemRow}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white text-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>
        </div>

        <div className="space-y-3">
          {items.map((row, idx) => (
            <div key={idx} className="flex gap-4 items-end bg-slate-900/30 p-4 rounded-xl border border-white/5">
              <div className="flex-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Category</label>
                <select
                  value={row.category}
                  onChange={(e) => handleRowChange(idx, 'category', e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Resources</label>
                <input
                  type="number"
                  min="1"
                  value={row.no_of_resources}
                  onChange={(e) => handleRowChange(idx, 'no_of_resources', Number(e.target.value))}
                  className="w-20 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Working Hours</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={row.working_hours}
                  onChange={(e) => handleRowChange(idx, 'working_hours', Number(e.target.value))}
                  className="w-24 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Shift Type</label>
                <select
                  value={row.shift_type}
                  onChange={(e) => handleRowChange(idx, 'shift_type', e.target.value)}
                  className="w-28 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none"
                >
                  <option value="Day">Day Shift</option>
                  <option value="Night">Night Shift</option>
                  <option value="Rotational">Rotational</option>
                </select>
              </div>

              <button
                disabled={items.length === 1}
                onClick={() => removeItemRow(idx)}
                className="p-2 rounded-lg bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Results View */}
      {results.length > 0 && (
        <div className="space-y-6">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Calculated Commercial Rates</h2>
              <div className="flex gap-6 text-sm">
                <span className="text-slate-400">Total Resources: <span className="text-white font-bold">{totalResources}</span></span>
                <span className="text-slate-400">Subtotal: <span className="text-emerald-400 font-bold">{fmtRs(totalCost)}</span></span>
                <span className="text-slate-400">GST: <span className="text-white font-bold">{fmtRs(totalGst)}</span></span>
                <span className="text-slate-400">Grand Total: <span className="text-orange-500 font-bold">{fmtRs(totalGrand)}</span></span>
              </div>
            </div>

            <div className="divide-y divide-white/5 p-6 space-y-6">
              {results.map((r, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 first:pt-0">
                  <div className="col-span-1">
                    <h3 className="text-base font-bold text-white">{r.category}</h3>
                    <p className="text-xs text-slate-400">{r.no_of_resources} resources · {r.working_hours} hrs · {r.shift_type}</p>
                    <div className="mt-4 bg-slate-900/50 rounded-xl p-3 border border-white/5 space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Employee Take-Home (Net Salary)</div>
                      <div className="flex justify-between text-xs">
                        <span>Gross Salary:</span>
                        <span className="text-slate-300">{fmtRs(r.gross_salary)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>PF Deduction:</span>
                        <span className="text-slate-300">{fmtRs(r.employee_pf)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>ESIC Deduction:</span>
                        <span className="text-slate-300">{fmtRs(r.employee_esic)}</span>
                      </div>
                      <div className="flex justify-between text-xs pt-1 border-t border-white/5 font-semibold">
                        <span className="text-white">Net Salary:</span>
                        <span className="text-emerald-400">{fmtRs(r.net_salary)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-3 grid grid-cols-3 gap-x-6 gap-y-3 text-xs text-slate-400">
                    <div>
                      <span>Basic + DA:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.subtotal1)}</p>
                    </div>
                    <div>
                      <span>Additional Hours:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.additional_hours)}</p>
                    </div>
                    <div>
                      <span>Subtotal2 (Basic+DA+OT+HRA+Skill):</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.subtotal2)}</p>
                    </div>
                    <div>
                      <span>Employer PF:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.employer_pf)}</p>
                    </div>
                    <div>
                      <span>Bonus (ER component):</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.bonus)}</p>
                    </div>
                    <div>
                      <span>Leave Wages:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.leave_wages)}</p>
                    </div>
                    <div>
                      <span>ESIC:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.esic)}</p>
                    </div>
                    <div>
                      <span>LWF & Uniform:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.lwf + r.uniform)}</p>
                    </div>
                    <div>
                      <span>Relieving Charges:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.relieving)}</p>
                    </div>
                    <div>
                      <span>Management Fee:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.management_fee)}</p>
                    </div>
                    <div className="col-span-3 border-t border-white/5 my-2 pt-2 grid grid-cols-3 gap-6">
                      <div>
                        <span className="text-slate-500">Monthly Commercial Cost:</span>
                        <p className="text-base font-bold text-white mt-0.5">{fmtRs(r.monthly_cost)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Daily Billing Rate:</span>
                        <p className="text-base font-bold text-white mt-0.5">{fmtRs(r.daily_rate)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Hourly Rate:</span>
                        <p className="text-base font-bold text-white mt-0.5">{fmtRs(r.hourly_rate)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
