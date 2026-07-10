'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, ChevronDown, ChevronRight, Eye, FileText,
  Loader2, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api/client';
import { useRmScope } from '@/lib/rm/hooks';
import type {
  RmAttendanceResponse,
  RmLocationsResponse,
  StaffAttendanceStatus,
  StaffAttendanceSummary,
  AttendanceInvoicePreview,
} from '@/lib/types';
import { AttendanceDayGrid } from '@/components/rm/attendance-day-grid';
import { InvoiceViewModal } from '@/components/rm/invoice-view-modal';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function fmtRs(n: number) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;
}

export default function AttendancePage() {
  const { branchId: scopeBranchId } = useRmScope();
  const now = new Date();

  const [locations, setLocations] = useState<RmLocationsResponse | null>(null);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedBranchCode, setSelectedBranchCode] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<RmAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [cellLoading, setCellLoading] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState<string | null>(null);
  const [invoiceModal, setInvoiceModal] = useState<AttendanceInvoicePreview | null>(null);

  const areasInCity = useMemo(() => {
    if (!locations || !selectedCity) return [];
    return locations.areas.filter((a) => a.city === selectedCity);
  }, [locations, selectedCity]);

  const activeArea = useMemo(
    () => areasInCity.find((a) => a.branch_code === selectedBranchCode),
    [areasInCity, selectedBranchCode],
  );

  const branchIdForApi = activeArea?.branch_id ?? '';

  const loadLocations = useCallback(async () => {
    try {
      const res = await api.getRmLocations();
      const payload = (res?.data ?? res) as RmLocationsResponse;
      setLocations(payload);
      if (payload.cities.length) {
        const scopedArea = payload.areas.find((a) => a.branch_id === scopeBranchId);
        const city = scopedArea?.city
          ?? payload.branches.find((b) => b.id === scopeBranchId)?.city
          ?? payload.cities[0];
        setSelectedCity(city);
        const area = scopedArea ?? payload.areas.find((a) => a.city === city);
        if (area) {
          setSelectedArea(area.area);
          setSelectedBranchCode(area.branch_code);
        }
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load locations');
    }
  }, [scopeBranchId]);

  const loadAttendance = useCallback(async () => {
    if (!branchIdForApi || !selectedBranchCode) return;
    setLoading(true);
    try {
      const res = await api.getRmAttendance({
        branchId: branchIdForApi,
        month,
        year,
        branchCode: selectedBranchCode,
      });
      const payload = (res?.data ?? res) as RmAttendanceResponse;
      setData(payload);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load attendance');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [branchIdForApi, selectedBranchCode, month, year]);

  useEffect(() => { loadLocations(); }, [loadLocations]);
  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  const updateStaffInState = (staffId: string, updater: (s: StaffAttendanceSummary) => StaffAttendanceSummary) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        staff: prev.staff.map((s) => (s.staff_id === staffId ? updater(s) : s)),
      };
    });
  };

  const recalcSummary = (records: StaffAttendanceSummary['daily_records'], monthlySalary: number, daysInMonth: number) => {
    const counts = { PRESENT: 0, ABSENT: 0, LEAVE: 0, OVERTIME: 0 };
    for (const r of records) counts[r.status] += 1;
    const billable = counts.PRESENT + counts.OVERTIME;
    const prorated = Math.round(monthlySalary * (billable / daysInMonth) * 100) / 100;
    return {
      present_days: counts.PRESENT,
      absent_days: counts.ABSENT,
      leave_days: counts.LEAVE,
      overtime_days: counts.OVERTIME,
      billable_days: billable,
      prorated_gross: prorated,
    };
  };

  const handleMark = async (staff: StaffAttendanceSummary, date: string, status: StaffAttendanceStatus | null) => {
    const key = `${staff.staff_id}-${date}`;
    setCellLoading(key);
    try {
      await api.markRmAttendance({
        staff_id: staff.staff_id,
        date,
        status,
        branch_id: branchIdForApi,
      });
      updateStaffInState(staff.staff_id, (s) => {
        const records = status
          ? [...s.daily_records.filter((r) => r.date !== date), { date, status }]
          : s.daily_records.filter((r) => r.date !== date);
        records.sort((a, b) => a.date.localeCompare(b.date));
        const summary = recalcSummary(records, s.monthly_salary, s.days_in_month);
        return { ...s, daily_records: records, ...summary };
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark attendance');
    } finally {
      setCellLoading(null);
    }
  };

  const handlePreviewInvoice = async (staffId: string) => {
    setInvoiceLoading(staffId + '_view');
    try {
      const res = await api.previewRmAttendanceInvoice(staffId, month, year);
      setInvoiceModal((res?.data ?? res) as AttendanceInvoicePreview);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load invoice preview');
    } finally {
      setInvoiceLoading(null);
    }
  };

  const handleViewInvoice = async (invoiceId: string, staffId: string) => {
    setInvoiceLoading(staffId + '_view');
    try {
      const res = await api.getFinanceInvoice(invoiceId);
      const inv = res?.data ?? res;
      const preview = await api.previewRmAttendanceInvoice(staffId, month, year);
      const base = (preview?.data ?? preview) as AttendanceInvoicePreview;
      setInvoiceModal({
        ...base,
        invoice_id: invoiceId,
        staff_name: inv.staff_name ?? base.staff_name,
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load invoice');
    } finally {
      setInvoiceLoading(null);
    }
  };

  const handleGenerateInvoice = async (staffId: string) => {
    if (!confirm('Generate monthly invoice from attendance for this staff?')) return;
    setInvoiceLoading(staffId + '_gen');
    try {
      const res = await api.generateRmAttendanceInvoice(staffId, month, year);
      const payload = res?.data ?? res;
      toast.success(`Invoice ${payload.invoice_number ?? 'created'}`);
      await loadAttendance();
      if (payload.preview) setInvoiceModal(payload.preview as AttendanceInvoicePreview);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Invoice generation failed');
    } finally {
      setInvoiceLoading(null);
    }
  };

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-8 p-6 pb-20">
      <InvoiceViewModal data={invoiceModal} onClose={() => setInvoiceModal(null)} />

      <div className="flex flex-col gap-2">
        <h1 className="font-syne text-2xl font-bold text-white">Attendance</h1>
        <p className="text-sm text-secondary-foreground">
          Manage daily attendance, overtime, leave, and monthly invoices by branch
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card gradient-border rounded-2xl p-6 shadow-2xl space-y-6"
      >
        <h3 className="font-syne font-bold text-lg text-white mb-2">Location Selection</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-secondary-foreground uppercase tracking-wider">City</label>
            <select
              value={selectedCity}
              onChange={(e) => {
                const city = e.target.value;
                setSelectedCity(city);
                const first = locations?.areas.find((a) => a.city === city);
                setSelectedArea(first?.area ?? '');
                setSelectedBranchCode(first?.branch_code ?? '');
              }}
              className="w-full rounded-xl border border-white/10 bg-[#0E1320] px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select City</option>
              {(locations?.cities ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-secondary-foreground uppercase tracking-wider">Branch</label>
            <select
              value={selectedArea}
              onChange={(e) => {
                const areaName = e.target.value;
                setSelectedArea(areaName);
                const match = areasInCity.find((a) => a.area === areaName);
                if (match) setSelectedBranchCode(match.branch_code);
              }}
              disabled={!selectedCity}
              className="w-full rounded-xl border border-white/10 bg-[#0E1320] px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              <option value="">Select Branch</option>
              {areasInCity.map((a) => (
                <option key={a.branch_code} value={a.area}>{a.area}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-secondary-foreground uppercase tracking-wider">Unit Code</label>
            <select
              value={selectedBranchCode}
              onChange={(e) => {
                const code = e.target.value;
                setSelectedBranchCode(code);
                const match = areasInCity.find((a) => a.branch_code === code);
                if (match) setSelectedArea(match.area);
              }}
              disabled={!selectedCity}
              className="w-full rounded-xl border border-white/10 bg-[#0E1320] px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              <option value="">Select Code</option>
              {areasInCity.map((a) => (
                <option key={a.branch_code} value={a.branch_code}>{a.branch_code}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-secondary-foreground uppercase tracking-wider">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              className="w-full rounded-xl border border-white/10 bg-[#0E1320] px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-secondary-foreground uppercase tracking-wider">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="w-full rounded-xl border border-white/10 bg-[#0E1320] px-4 py-2.5 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-secondary-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>Click day cells to cycle: Present → Absent → Leave → Overtime → Clear</span>
          <button
            type="button"
            onClick={loadAttendance}
            className="ml-auto flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 hover:bg-white/5"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card gradient-border rounded-2xl overflow-hidden shadow-2xl"
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !branchIdForApi || !selectedBranchCode ? (
          <p className="py-16 text-center text-sm text-secondary-foreground">Select city, branch, and branch code to view staff attendance</p>
        ) : !data?.staff.length ? (
          <p className="py-16 text-center text-sm text-secondary-foreground">No deployed staff at this branch</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-card/80 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 w-8" />
                  <th className="p-3">Staff</th>
                  <th className="p-3 text-right">Salary</th>
                  <th className="p-3 text-center">Present</th>
                  <th className="p-3 text-center">Leave</th>
                  <th className="p-3 text-center">OT</th>
                  <th className="p-3 text-center">Absent</th>
                  <th className="p-3 text-right">Prorated</th>
                  <th className="p-3 text-center">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {data.staff.map((staff) => {
                  const expanded = expandedStaff === staff.staff_id;
                  const busy = invoiceLoading?.startsWith(staff.staff_id);
                  return (
                    <React.Fragment key={staff.staff_id}>
                      <tr className="border-t border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => setExpandedStaff(expanded ? null : staff.staff_id)}
                            className="text-muted-foreground hover:text-white"
                          >
                            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-white">{staff.staff_code}</p>
                          <p className="text-xs text-muted-foreground">{staff.full_name}</p>
                        </td>
                        <td className="p-3 text-right text-white">{fmtRs(staff.monthly_salary)}</td>
                        <td className="p-3 text-center text-emerald-400">{staff.present_days}</td>
                        <td className="p-3 text-center text-amber-400">{staff.leave_days}</td>
                        <td className="p-3 text-center text-sky-400">{staff.overtime_days}</td>
                        <td className="p-3 text-center text-red-400">{staff.absent_days}</td>
                        <td className="p-3 text-right font-semibold text-white">{fmtRs(staff.prorated_gross)}</td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            {staff.invoice_id ? (
                              <button
                                type="button"
                                disabled={!!busy}
                                onClick={() => handleViewInvoice(staff.invoice_id!, staff.staff_id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs hover:bg-white/5"
                              >
                                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                                View
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={!!busy || staff.billable_days === 0}
                                  onClick={() => handlePreviewInvoice(staff.staff_id)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs hover:bg-white/5 disabled:opacity-40"
                                >
                                  Preview
                                </button>
                                <button
                                  type="button"
                                  disabled={!!busy || staff.billable_days === 0}
                                  onClick={() => handleGenerateInvoice(staff.staff_id)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-primary/20 border border-primary/30 px-2 py-1 text-xs text-primary hover:bg-primary/30 disabled:opacity-40"
                                >
                                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                                  Generate
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-t border-white/5 bg-black/20">
                          <td colSpan={9} className="px-4 pb-4">
                            <AttendanceDayGrid
                              year={year}
                              month={month}
                              records={staff.daily_records}
                              loadingKey={cellLoading}
                              onMark={(date, status) => handleMark(staff, date, status)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
