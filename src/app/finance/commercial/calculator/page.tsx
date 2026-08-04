'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, Calculator, Save, User, MapPin, Plus, Trash2, CheckCircle2, ChevronRight,
  RotateCw, Send, FileText,
} from 'lucide-react';

function fmt(n: number | string) {
  const val = Number(n);
  if (isNaN(val)) return '0.00';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(val);
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

  // Saved calculations list state
  const [savedCalculations, setSavedCalculations] = useState<any[]>([]);
  const [loadingCalculations, setLoadingCalculations] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Unit-code centric selection states
  const [allUnits, setAllUnits] = useState<any[]>([]);
  const [selectedUnitCode, setSelectedUnitCode] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<any>(null);

  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
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

  const loadSavedCalculations = async () => {
    setLoadingCalculations(true);
    try {
      const res = await api.listCalculations();
      const data = (res as any)?.data ?? res;
      setSavedCalculations(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Failed to load saved calculations:', e);
    } finally {
      setLoadingCalculations(false);
    }
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

      // Extract unit codes from customers list
      const unitsList: any[] = parsedCusts.map((c: any) => ({
        unit_code: c.unit_code,
        unit_name: c.unit_name,
        customer_id: c.id,
        customer_name: c.customer_name,
        pan_card: c.pan_card,
        address: c.address,
        city: c.city,
        state: c.state,
        pincode: c.pincode,
        gstn: c.gstn,
      }));
      setAllUnits(unitsList);
      await loadSavedCalculations();
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
    if (found) {
      setState(found.state || '');
      setCity(found.city || '');
    } else {
      setState('');
      setCity('');
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
    if (!state || !zone) {
      showToast('error', 'State and Zone are required');
      return;
    }
    if (!items || items.length === 0) {
      showToast('error', 'Please add at least one calculation row');
      return;
    }
    setSaving(true);
    try {
      let currentResults = results;
      if (currentResults.length === 0) {
        const res = await api.runCalculationOnTheFly({ state, zone, items });
        const resData = (res as any)?.data ?? res;
        if (Array.isArray(resData)) {
          currentResults = resData;
          setResults(resData);
        }
      }

      await api.createCalculation({
        customer_id: selectedUnit.customer_id,
        branch_id: selectedBranchId || null,
        unit_code: selectedUnit.unit_code,
        state,
        zone,
        contract_duration: Number(contractDuration),
        contract_duration_months: Number(contractDuration),
        items,
        results: currentResults,
      });
      showToast('success', 'Calculation saved as draft!');
      await loadSavedCalculations();
    } catch (e: any) {
      showToast('error', e.message ?? 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async (calcId: string) => {
    setSubmittingId(calcId);
    try {
      await api.submitForApproval(calcId);
      showToast('success', 'Submitted for executive review!');
      await loadSavedCalculations();
    } catch (e: any) {
      showToast('error', e.message ?? 'Failed to submit calculation');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleLoadCalculation = async (calcId: string) => {
    try {
      const data = await api.getCalculation(calcId);
      const calcData = (data as any)?.data ?? data;
      if (calcData) {
        if (calcData.unit_code) {
          handleUnitCodeChange(calcData.unit_code);
        }
        if (calcData.state) setState(calcData.state);
        if (calcData.zone) setZone(calcData.zone);
        if (calcData.contract_duration) setContractDuration(calcData.contract_duration);

        if (Array.isArray(calcData.items) && calcData.items.length > 0) {
          setItems(calcData.items.map((it: any) => ({
            category: it.category,
            no_of_resources: it.no_of_resources,
            working_hours: it.working_hours,
            shift_type: it.shift_type || 'Day',
          })));
          setResults(calcData.items);
        }
        showToast('success', `Loaded calculation Rev #${calcData.revision_number || 1}`);
      }
    } catch (e: any) {
      showToast('error', e.message ?? 'Failed to load calculation details');
    }
  };

  // Grand totals of results
  const resArray = Array.isArray(results) ? results : [];
  const totalCost = resArray.reduce((acc, r) => acc + Number(r.monthly_cost ?? r.monthlyCost ?? 0), 0);
  const totalGst = resArray.reduce((acc, r) => acc + Number(r.gst || 0), 0);
  const totalGrand = resArray.reduce((acc, r) => acc + Number(r.grand_total ?? r.grandTotal ?? 0), 0);
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
            Select Unit Code — Customer Name, State, City & Address will populate automatically.
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
            disabled={saving || !selectedUnit || items.length === 0}
            className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition flex items-center gap-2 shadow-lg shadow-orange-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft calculation
          </button>
        </div>
      </div>

      {/* Master Configuration Selection (Unit Code FIRST -> Customer, State, City & Address) */}
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 sm:gap-6">
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
                  [{u.unit_code}] {u.customer_name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Customer Name */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
              2. Customer Name
            </label>
            <div className="bg-slate-900/70 border border-white/8 rounded-xl px-4 py-2.5 text-sm h-11 flex items-center">
              {selectedUnit ? (
                <span className="text-white font-bold truncate">{selectedUnit.customer_name}</span>
              ) : (
                <span className="text-slate-600 italic text-xs">Customer Name</span>
              )}
            </div>
          </div>

          {/* 3. State */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
              3. State
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Delhi NCR / Haryana"
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50"
            />
          </div>

          {/* 4. City */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
              4. City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Gurugram / Noida"
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

        {/* Customer Address Banner */}
        {selectedUnit && (
          <div className="pt-3 border-t border-white/8 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-900/60 px-4 py-3 rounded-xl border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-slate-300">Customer Address:</span>
              <span className="text-white font-medium">
                {selectedUnit.address || [
                  selectedUnit.city,
                  selectedUnit.state,
                  selectedUnit.pincode ? `PIN: ${selectedUnit.pincode}` : '',
                ].filter(Boolean).join(', ') || 'N/A'}
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
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Shift Hours</label>
                <select
                  value={row.working_hours}
                  onChange={(e) => handleRowChange(idx, 'working_hours', Number(e.target.value))}
                  className="w-28 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none font-medium"
                >
                  <option value={8}>8 Hours</option>
                  <option value={12}>12 Hours</option>
                </select>
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
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.subtotal1 || 0)}</p>
                    </div>
                    <div>
                      <span>Additional Hours:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.additional_hours ?? r.additionalHours ?? 0)}</p>
                    </div>
                    <div>
                      <span>Subtotal2 (Basic+DA+OT+HRA+Skill):</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.subtotal2 || 0)}</p>
                    </div>
                    <div>
                      <span>Employer PF:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.employer_pf ?? r.employerPf ?? 0)}</p>
                    </div>
                    <div>
                      <span>Bonus (ER component):</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.bonus || 0)}</p>
                    </div>
                    <div>
                      <span>Leave Wages:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.leave_wages ?? r.leaveWages ?? 0)}</p>
                    </div>
                    <div>
                      <span>ESIC:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.esic || 0)}</p>
                    </div>
                    <div>
                      <span>LWF & Uniform:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(Number(r.lwf || 0) + Number(r.uniform || 0))}</p>
                    </div>
                    <div>
                      <span>Relieving Charges:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.relieving || 0)}</p>
                    </div>
                    <div>
                      <span>Management Fee:</span>
                      <p className="text-sm font-semibold text-white mt-0.5">{fmtRs(r.management_fee ?? r.managementFee ?? 0)}</p>
                    </div>
                    <div className="col-span-3 border-t border-white/5 my-2 pt-2 grid grid-cols-3 gap-6">
                      <div>
                        <span className="text-slate-500">Monthly Commercial Cost:</span>
                        <p className="text-base font-bold text-white mt-0.5">{fmtRs(r.monthly_cost ?? r.monthlyCost ?? 0)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Daily Billing Rate:</span>
                        <p className="text-base font-bold text-white mt-0.5">{fmtRs(r.daily_rate ?? r.dailyRate ?? 0)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Hourly Rate:</span>
                        <p className="text-base font-bold text-white mt-0.5">{fmtRs(r.hourly_rate ?? r.hourlyRate ?? 0)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Saved Draft & Commercial Calculations List Section */}
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-400" />
              Saved Draft & Commercial Calculations
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              List of all saved draft sheets, revision history & approval statuses.
            </p>
          </div>
          <button
            onClick={loadSavedCalculations}
            disabled={loadingCalculations}
            className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-semibold transition flex items-center gap-1.5"
          >
            {loadingCalculations ? <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" /> : <RotateCw className="w-3.5 h-3.5" />}
            Refresh List
          </button>
        </div>

        {loadingCalculations ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
          </div>
        ) : savedCalculations.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-white/10 rounded-xl bg-slate-900/40">
            <Calculator className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-medium">No saved calculation drafts found.</p>
            <p className="text-xs text-slate-500 mt-1">Select a Unit Code above and click "Save Draft calculation" to create your first draft.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider bg-slate-900/60">
                  <th className="py-3 px-4">Unit / Customer</th>
                  <th className="py-3 px-3">State & Zone</th>
                  <th className="py-3 px-3">Rev</th>
                  <th className="py-3 px-3">Resources</th>
                  <th className="py-3 px-3">Monthly Cost</th>
                  <th className="py-3 px-3">Grand Total</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {savedCalculations.map((calc: any) => {
                  const statusColors: Record<string, string> = {
                    DRAFT: 'bg-slate-800 text-slate-300 border-slate-700',
                    PENDING_EXECUTIVE: 'bg-yellow-950/60 text-yellow-400 border-yellow-500/30',
                    PENDING_MANAGER: 'bg-blue-950/60 text-blue-400 border-blue-500/30',
                    PENDING_SUPER_ADMIN: 'bg-purple-950/60 text-purple-400 border-purple-500/30',
                    APPROVED: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30',
                    REJECTED: 'bg-red-950/60 text-red-400 border-red-500/30',
                  };
                  const isDraftOrRejected = calc.status === 'DRAFT' || calc.status === 'REJECTED';

                  return (
                    <tr key={calc.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 px-4 font-semibold text-white">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-emerald-400 font-bold">[{calc.unit_code || 'N/A'}]</span>
                          <span className="truncate max-w-[180px]">{calc.customer_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {calc.state} · <span className="text-slate-400">{calc.zone}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono font-bold">
                          Rev #{calc.revision_number || 1}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-medium">
                        {calc.total_resources || 0}
                      </td>
                      <td className="py-3 px-3 text-emerald-400 font-bold font-mono">
                        {fmtRs(calc.total_monthly_cost || 0)}
                      </td>
                      <td className="py-3 px-3 text-orange-400 font-bold font-mono">
                        {fmtRs(calc.total_grand_total || 0)}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusColors[calc.status] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                          {calc.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {calc.created_at ? new Date(calc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleLoadCalculation(calc.id)}
                            className="px-2.5 py-1 rounded-lg border border-white/10 hover:bg-white/10 text-white text-[11px] font-medium transition"
                          >
                            View
                          </button>
                          {isDraftOrRejected && (
                            <button
                              onClick={() => handleSubmitForApproval(calc.id)}
                              disabled={submittingId === calc.id}
                              className="px-2.5 py-1 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 hover:bg-orange-500/30 text-[11px] font-semibold transition flex items-center gap-1 disabled:opacity-50"
                            >
                              {submittingId === calc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                              Submit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
