'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, Calculator, Plus, UserCheck, MapPin, Building2, Eye
} from 'lucide-react';
import { fmtRs } from '@/lib/finance/wageEngine';
import WageConfigFormModal, { WageConfigFormData, UnitOption } from '@/components/finance/WageConfigFormModal';
import WageConfigViewModal from '@/components/finance/WageConfigViewModal';

export default function CommercialCalculatorPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Master records
  const [categories, setCategories] = useState<string[]>([]);
  const [allUnits, setAllUnits] = useState<UnitOption[]>([]);

  // Saved calculations list state
  const [savedCalculations, setSavedCalculations] = useState<any[]>([]);
  const [loadingCalculations, setLoadingCalculations] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Editable Form Modal State (Assign Staff)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<Partial<WageConfigFormData>>({});

  // Read-Only Calculation Detail Dialog Box State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCalcToView, setSelectedCalcToView] = useState<any>(null);

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
      const [custs, cats] = await Promise.all([
        api.listFinanceCustomers(),
        api.getWageCategories(),
      ]);
      const custsData = (custs as any)?.data ?? custs;
      const catsData = (cats as any)?.data ?? cats;
      
      const parsedCusts = Array.isArray(custsData) ? custsData : [];
      setCategories(Array.isArray(catsData) ? catsData : []);

      const unitsList: UnitOption[] = parsedCusts.map((c: any) => ({
        unit_code: c.unit_code,
        unit_name: c.unit_name || c.customer_name,
        customer_id: c.id,
        customer_name: c.customer_name,
        address: c.address,
        city: c.city || 'Gurugram',
        state: c.state || 'Delhi NCR',
        zone: c.zone || 'Zone A',
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

  const fetchMasterWageConfig = async (cat: string, st?: string, zn?: string) => {
    try {
      const res = await api.getActiveWageConfig(st || 'Delhi NCR', zn || 'Zone A', cat);
      const masterData = (res as any)?.data ?? res;
      if (masterData && masterData.basic_wage !== undefined) {
        return {
          basic_wage: Number(masterData.basic_wage) || 15000,
          da: Number(masterData.da) || 0,
          hra: Number(masterData.hra) || 0,
          skilled_allowance: Number(masterData.skilled_allowance) || 0,
          employer_pf_pct: Number(masterData.employer_pf_pct) || 13,
          employer_pf_max: Number(masterData.employer_pf_max) || 15000,
          employee_pf_pct: Number(masterData.employee_pf_pct) || 12,
          employer_esic_pct: Number(masterData.employer_esic_pct) || 3.25,
          employee_esic_pct: Number(masterData.employee_esic_pct) || 0.75,
          bonus_pct: Number(masterData.bonus_pct) || 8.33,
          leave_days: Number(masterData.leave_days) || 32,
          lwf_amount: Number(masterData.lwf_max ?? masterData.lwf_amount) || 62,
          uniform_allowance: Number(masterData.uniform_allowance) || 275,
          relieving_pct: Number(masterData.relieving_pct) || 16.67,
          management_pct: Number(masterData.management_pct) || 5.5,
          professional_tax: Number(masterData.professional_tax) || 0,
          pf_applicable: masterData.pf_applicable !== false,
          esic_applicable: masterData.esic_applicable !== false,
          bonus_applicable: masterData.bonus_applicable !== false,
          bonus_frequency: masterData.bonus_frequency || 'monthly',
          lwf_applicable: masterData.lwf_applicable !== false,
          uniform_applicable: masterData.uniform_applicable !== false,
          relieving_applicable: masterData.relieving_applicable !== false,
          nfh_applicable: masterData.nfh_applicable === true,
          gst_applicable: masterData.gst_applicable !== false,
          gst_type: masterData.gst_type || 'intra_state',
          gst_pct: Number(masterData.gst_pct) || 18,
        };
      }
    } catch (e) {
      console.warn('Could not fetch active master wage config:', e);
    }
    return null;
  };

  const handleOpenAssignModal = async (calcData?: any) => {
    if (calcData) {
      // Opening for an existing record - only pass identity/location fields, NOT old wage values
      const item = Array.isArray(calcData.items) && calcData.items[0] ? calcData.items[0] : {};
      setModalInitialData({
        unit_code: calcData.unit_code || '',
        customer_name: calcData.customer_name || '',
        state: calcData.state || 'Delhi NCR',
        city: calcData.city || '',
        zone: calcData.zone || 'Zone A',
        category: item.category || categories[0] || 'Security Guard',
        no_of_resources: item.no_of_resources || 1,
        working_hours: item.working_hours || 8,
        shift_type: item.shift_type || 'Day',
      });
    } else {
      // Assigning new staff category - start completely fresh
      setModalInitialData({
        unit_code: '',
        customer_name: '',
        state: '',
        city: '',
        zone: '',
        category: categories[0] || 'Security Guard',
        no_of_resources: 1,
        working_hours: 8,
        shift_type: 'Day',
      });
    }

    setIsModalOpen(true);
  };

  const handleSaveModalAssignment = async (formData: WageConfigFormData) => {
    if (!formData.unit_code) {
      showToast('error', 'Please select a Unit Code first.');
      return;
    }

    const selectedUnit = allUnits.find((u) => u.unit_code === formData.unit_code);
    const itemPayload = {
      ...formData,
      basic_wage: Number(formData.basic_wage) || 0,
      basic: Number(formData.basic_wage) || 0,
      da: Number(formData.da) || 0,
      hra: Number(formData.hra) || 0,
      skilled_allowance: Number(formData.skilled_allowance) || 0,
      employer_pf_pct: Number(formData.employer_pf_pct) || 0,
      employer_pf_max: Number(formData.employer_pf_max) || 15000,
      employee_pf_pct: Number(formData.employee_pf_pct) || 0,
      employer_esic_pct: Number(formData.employer_esic_pct) || 0,
      employee_esic_pct: Number(formData.employee_esic_pct) || 0,
      bonus_pct: Number(formData.bonus_pct) || 0,
      leave_days: Number(formData.leave_days) || 32,
      lwf_amount: Number(formData.lwf_amount) || 62,
      uniform_allowance: Number(formData.uniform_allowance) || 275,
      relieving_pct: Number(formData.relieving_pct) || 0,
      management_pct: Number(formData.management_pct) || 0,
      professional_tax: Number(formData.professional_tax) || 0,
      pf_applicable: formData.pf_applicable !== false,
      esic_applicable: formData.esic_applicable !== false,
      bonus_applicable: formData.bonus_applicable !== false,
      bonus_frequency: formData.bonus_frequency || 'monthly',
      lwf_applicable: formData.lwf_applicable !== false,
      uniform_applicable: formData.uniform_applicable !== false,
      relieving_applicable: formData.relieving_applicable !== false,
      nfh_applicable: formData.nfh_applicable === true,
      gst_applicable: formData.gst_applicable !== false,
      gst_type: formData.gst_type || 'intra_state',
      gst_pct: Number(formData.gst_pct) || 18,
      category: formData.category,
      no_of_resources: Number(formData.no_of_resources) || 1,
      working_hours: Number(formData.working_hours) || 8,
      shift_type: formData.shift_type || 'Day',
    };

    setSaving(true);
    try {
      // 1. Run calculation formula on the fly
      const res = await api.runCalculationOnTheFly({
        state: formData.state || 'Delhi NCR',
        zone: formData.zone || 'Zone A',
        items: [itemPayload],
      });
      const calcResults = (res as any)?.data ?? res;

      // 2. Save calculation to database
      await api.createCalculation({
        customer_id: selectedUnit?.customer_id || '',
        unit_code: formData.unit_code,
        state: formData.state || 'Delhi NCR',
        zone: formData.zone || 'Zone A',
        contract_duration: 12,
        contract_duration_months: 12,
        items: [itemPayload],
        results: Array.isArray(calcResults) ? calcResults : [calcResults],
      });

      showToast('success', `Staff assignment for ${formData.category} saved & added to list!`);
      
      // 3. Immediately refresh saved calculations list
      await loadSavedCalculations();
      setIsModalOpen(false);
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to save staff assignment');
      throw err;
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

  return (
    <div className="page-padding space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium border
          ${toast.type === 'success' ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300' : 'bg-red-950 border-red-500/30 text-red-300'}`}
        >
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5 tracking-tight">
            <Calculator className="w-7 h-7 text-orange-500" />
            Commercial Calculator & Staff Assignments
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage customer staff assignments, wage configurations, and commercial rate cards.
          </p>
        </div>
        <button
          onClick={() => handleOpenAssignModal()}
          className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition flex items-center gap-2 shadow-lg shadow-orange-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Assign Staff
        </button>
      </div>

      {/* DIRECT LIST DISPLAY: Saved Commercial Staff Assignments & Calculations Table */}
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-orange-400" />
              Commercial Staff Assignments List
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              All saved customer staff assignments, wage breakups, and rate card entries.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/5">
            Total Records: {savedCalculations.length}
          </span>
        </div>

        {loadingCalculations ? (
          <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            Loading commercial staff assignments...
          </div>
        ) : savedCalculations.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-4 bg-slate-900/30 rounded-xl border border-dashed border-white/10 p-8">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No Staff Assignments Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Click &quot;Assign Staff&quot; above to select a customer unit code, configure wage breakup, and create a commercial calculation.
              </p>
            </div>
            <button
              onClick={() => handleOpenAssignModal()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition shadow-lg shadow-orange-500/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Assign Staff Now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase text-slate-400 font-bold tracking-wider bg-slate-900/80">
                  <th className="py-4 px-4">Unit Code</th>
                  <th className="py-4 px-4">Customer Name</th>
                  <th className="py-4 px-4">Location</th>
                  <th className="py-4 px-4 text-center">Staff Requirements</th>
                  <th className="py-4 px-4 text-right">Total Billing (Incl. GST)</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {savedCalculations.map((calc) => {
                  const itemsList = Array.isArray(calc.items) ? calc.items : [];
                  const firstItem = itemsList[0] || {};
                  
                  // Calculate total resources from total_resources field or items sum
                  const resourceCount = Number(calc.total_resources) || itemsList.reduce((acc: number, it: any) => acc + Number(it.no_of_resources || 1), 0) || 1;
                  const firstCategory = firstItem.category || 'Security Guard';
                  const workingHours = firstItem.working_hours || 8;
                  const shiftType = firstItem.shift_type || 'Day';

                  // Calculate grand total billing amount
                  const grandTotalAmount = Number(calc.total_grand_total) || Number(calc.grand_total) || Number(firstItem.grand_total) || 0;
                  const singleHeadCtc = firstItem.monthly_cost ? Number(firstItem.monthly_cost) / Math.max(1, Number(firstItem.no_of_resources || 1)) : (grandTotalAmount / Math.max(1, resourceCount));

                  return (
                    <tr key={calc.id} className="hover:bg-white/5 transition-colors group">
                      <td className="py-4 px-4 font-mono font-bold whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-mono font-bold">
                          <Building2 className="w-3.5 h-3.5" />
                          {calc.unit_code || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-white text-sm tracking-tight">{calc.customer_name || 'N/A'}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-slate-200 font-medium text-xs">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {calc.state || 'Delhi NCR'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 pl-5">
                          {calc.city ? `${calc.city} · ` : ''}{calc.zone || 'Zone A'}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="font-bold text-white text-xs">{firstCategory}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          <span className="font-bold text-orange-300">{resourceCount} {resourceCount === 1 ? 'Resource' : 'Resources'}</span>
                          <span className="mx-1">·</span>
                          <span>{workingHours}h {shiftType} Shift</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-emerald-400 text-sm tracking-tight">
                          {fmtRs(grandTotalAmount)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {fmtRs(singleHeadCtc)}/head CTC
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          calc.status === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                          calc.status === 'SUBMITTED' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                          'bg-slate-500/10 border-slate-500/30 text-slate-300'
                        }`}>
                          {calc.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedCalcToView(calc);
                              setIsViewModalOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:text-white hover:bg-white/10 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5 text-orange-400" />
                            <span>View</span>
                          </button>
                          {calc.status === 'DRAFT' && (
                            <button
                              onClick={() => handleSubmitForApproval(calc.id)}
                              disabled={submittingId === calc.id}
                              className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-40 shadow-lg shadow-orange-500/10"
                            >
                              {submittingId === calc.id ? 'Submitting...' : 'Submit'}
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

      {/* Editable Form Modal (Assign Staff) */}
      <WageConfigFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModalAssignment}
        mode="customer_assignment"
        categories={categories}
        units={allUnits}
        initialData={modalInitialData}
      />

      {/* Read-Only Detailed Calculation Dialog Box */}
      <WageConfigViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        calculationData={selectedCalcToView}
      />
    </div>
  );
}
