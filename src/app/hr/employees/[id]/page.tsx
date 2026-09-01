'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Spinner } from '@/components/ui/loading';
import { unwrapData, unwrapItems } from '@/lib/hr/utils';
import { SERIES_LABELS, STAGE_LABELS } from '@/lib/rm/constants';
import {
  ArrowLeft,
  User,
  Calendar,
  DollarSign,
  FileText,
  GitBranch,
  Building2,
  ShieldCheck,
  RefreshCw,
  Download,
  AlertTriangle,
  History,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'attendance', label: 'Attendance', icon: Calendar },
  { key: 'salary', label: 'Salary & Payslips', icon: DollarSign },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'history', label: 'Pipeline History', icon: History },
  { key: 'incidents', label: 'Incidents', icon: AlertTriangle },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const STATUS_OPTIONS = ['Present', 'Half Day', 'Leave', 'Absent', 'Late'] as const;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-widest text-secondary-foreground">{label}</p>
      <p className="text-sm text-white">{value ?? '—'}</p>
    </div>
  );
}

export default function HrEmployeeDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? '');
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('overview');

  const { data, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => api.getEmployee(id),
    enabled: Boolean(id),
  });
  const employee: any = unwrapData(data);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (error || !employee?.id) {
    return (
      <div className="page-padding max-w-[1600px] mx-auto py-24 text-center space-y-3">
        <p className="text-red-400 text-sm">Could not load this employee.</p>
        <Link href="/hr/employees" className="text-primary text-sm hover:underline">
          Back to employees
        </Link>
      </div>
    );
  }

  const pipeline = employee.staffApplicant;

  return (
    <div className="page-padding max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/hr/employees"
            className="mt-1 rounded-lg border border-white/10 bg-white/5 p-2 text-secondary-foreground hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">{employee.fullName}</h1>
            <p className="text-sm text-secondary-foreground">
              {employee.employeeId} · {employee.designation} · {employee.department}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              employee.status === 'Active'
                ? 'bg-emerald-500/15 text-emerald-300'
                : employee.status === 'Resigned'
                  ? 'bg-red-500/15 text-red-300'
                  : 'bg-white/10 text-secondary-foreground'
            }`}
          >
            {employee.status}
          </span>
          {pipeline && (
            <Link
              href={`/hr/candidates/${pipeline.id}`}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
            >
              <GitBranch className="h-3.5 w-3.5 text-primary" />
              {pipeline.staffCode}
            </Link>
          )}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-background/40 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? 'bg-primary text-primary-foreground'
                : 'text-secondary-foreground hover:bg-white/5 hover:text-white'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab employee={employee} pipeline={pipeline} />}
      {tab === 'attendance' && (
        <AttendanceTab employee={employee} pipeline={pipeline} queryClient={queryClient} />
      )}
      {tab === 'salary' && <SalaryTab employee={employee} />}
      {tab === 'documents' && <DocumentsTab employee={employee} />}
      {tab === 'history' && <PipelineHistoryTab employee={employee} />}
      {tab === 'incidents' && <IncidentsTab employee={employee} />}
    </div>
  );
}

function OverviewTab({ employee, pipeline }: { employee: any; pipeline: any }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-background/40 p-5 space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <User className="h-4 w-4 text-blue-400" /> Personal
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mobile" value={employee.mobile} />
          <Field label="Alternate" value={employee.alternateMobile} />
          <Field label="Email" value={employee.email} />
          <Field label="Date of birth" value={fmtDate(employee.dateOfBirth)} />
          <Field label="Gender" value={employee.gender} />
          <Field label="Blood group" value={employee.bloodGroup} />
          <div className="col-span-2">
            <Field label="Address" value={employee.address} />
          </div>
          <Field
            label="City / State"
            value={[employee.city, employee.state].filter((v) => v && v !== 'NOT_SET').join(', ') || '—'}
          />
          <Field label="Pincode" value={employee.pincode === 'NOT_SET' ? '—' : employee.pincode} />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-background/40 p-5 space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <Building2 className="h-4 w-4 text-emerald-400" /> Employment
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employee ID" value={<span className="font-mono">{employee.employeeId}</span>} />
          <Field label="Joining date" value={fmtDate(employee.joiningDate)} />
          <Field label="Department" value={employee.department} />
          <Field label="Designation" value={employee.designation} />
          <Field label="Category" value={employee.category?.name} />
          <Field label="Employment type" value={employee.employmentType} />
          <Field label="Branch" value={employee.branch?.name} />
          <Field label="Reporting manager" value={employee.reportingManager} />
          <Field
            label="Monthly salary"
            value={
              employee.salary != null
                ? `₹${Number(employee.salary).toLocaleString('en-IN')}`
                : '—'
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-background/40 p-5 space-y-4 lg:col-span-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <GitBranch className="h-4 w-4 text-primary" /> Pipeline origin
        </h2>
        {pipeline ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Staff code" value={<span className="font-mono">{pipeline.staffCode}</span>} />
              <Field
                label="Series"
                value={SERIES_LABELS[pipeline.series as keyof typeof SERIES_LABELS] ?? pipeline.series}
              />
              <Field
                label="Stage"
                value={STAGE_LABELS[pipeline.pipelineStage as keyof typeof STAGE_LABELS] ?? pipeline.pipelineStage}
              />
              <Field label="PV status" value={pipeline.pvStatus} />
              <Field label="Language tier" value={pipeline.languageTier} />
              <Field label="Scenario" value={pipeline.currentScenarioCode} />
            </div>
            <Link
              href={`/hr/candidates/${pipeline.id}`}
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              Open the full pipeline record
            </Link>
          </>
        ) : (
          <p className="text-sm text-secondary-foreground">
            Direct HR hire — this employee never went through the S1–S5 pipeline, so their
            attendance is HR-marked only and does not flow into placement billing.
          </p>
        )}
      </section>
    </div>
  );
}

function AttendanceTab({
  employee,
  pipeline,
  queryClient,
}: {
  employee: any;
  pipeline: any;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const now = new Date();
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [form, setForm] = useState({
    date: todayIso(),
    status: 'Present' as (typeof STATUS_OPTIONS)[number],
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // The merged view, not the raw HR ledger. It reads the pipeline's own record
  // alongside HR's, so a check-in a staff member made minutes ago is visible
  // immediately rather than waiting for the projection to copy it across.
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['employee-attendance-month', employee.id, period.month, period.year],
    queryFn: () => api.getEmployeeAttendanceMonth(employee.id, period),
    // Field staff check in through the day; keep the board reasonably fresh
    // without the user having to reload.
    refetchInterval: 60_000,
  });
  const payload: any = unwrapData(data);
  const days: any[] = payload?.items ?? [];

  const syncFromField = async () => {
    setSyncing(true);
    try {
      const res = await api.syncAttendanceFromPipeline({
        month: period.month,
        year: period.year,
        employeeId: employee.id,
      });
      const r = (res as any)?.data ?? res;
      const moved = Number(r?.inserted ?? 0) + Number(r?.updated ?? 0);
      toast.success(
        moved === 0
          ? 'Payroll ledger already matches their field check-ins'
          : `Committed ${moved} field day${moved === 1 ? '' : 's'} to the payroll ledger` +
              (Number(r?.skippedManual) > 0 ? ` (${r.skippedManual} left as HR marked them)` : ''),
      );
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Sync failed';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSyncing(false);
    }
  };

  const submit = async (overrideSelfCheckIn = false) => {
    setSaving(true);
    try {
      const res = await api.markAttendance({
        employeeId: employee.id,
        date: form.date,
        status: form.status,
        notes: form.notes.trim() || undefined,
        ...(overrideSelfCheckIn ? { overrideSelfCheckIn: true } : {}),
      });
      const p = (res as any)?.data ?? res;
      toast.success(
        p?.pipelineAttendance
          ? `Marked ${form.status} — also recorded against their placement`
          : `Marked ${form.status}`,
      );
      setForm((f) => ({ ...f, notes: '' }));
      queryClient.invalidateQueries({ queryKey: ['employee-attendance-month'] });
      refetch();
    } catch (err: any) {
      const raw = err?.response?.data?.message || err?.message || 'Could not mark attendance';
      const msg = Array.isArray(raw) ? raw.join(', ') : String(raw);
      // The API refuses to bury the staff member's own GPS check-in unless HR
      // says so explicitly, so offer that as a deliberate second step.
      if (/self-check-in/i.test(msg) && !overrideSelfCheckIn) {
        toast(
          (t) => (
            <span className="text-sm">
              {msg}
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  submit(true);
                }}
                className="ml-3 rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white"
              >
                Override
              </button>
            </span>
          ),
          { duration: 10000 },
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const presentCount = days.filter((d) => d.effectiveStatus === 'Present').length;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-background/40 p-5 space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Calendar className="h-4 w-4 text-blue-400" /> Mark attendance on their behalf
          </h2>
          <p className="mt-1 text-xs text-secondary-foreground">
            {pipeline
              ? 'This employee came from the RM pipeline, so the day is also recorded against their placement — which is what payroll and client invoicing count.'
              : 'Direct hire — this is recorded in the HR attendance ledger only.'}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-white">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-white">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
              className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-semibold text-white">Note</label>
            <div className="flex gap-2">
              <input
                value={form.notes}
                placeholder="Why HR is marking this…"
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="flex-1 rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white placeholder:text-secondary-foreground/50"
              />
              <button
                onClick={() => submit()}
                disabled={saving}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Mark'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-background/40 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <h2 className="text-sm font-bold text-white">
              {new Date(period.year, period.month - 1).toLocaleString('en-IN', { month: 'long' })}{' '}
              {period.year}
            </h2>
            <p className="mt-1 text-xs text-secondary-foreground">
              {presentCount} present of {days.length} recorded day{days.length === 1 ? '' : 's'}
              {Number(payload?.unprojectedDays) > 0 && (
                <>
                  {' · '}
                  <span className="text-amber-300">
                    {payload.unprojectedDays} not yet counted for payroll
                  </span>
                </>
              )}
              {Number(payload?.divergingDays) > 0 && (
                <>
                  {' · '}
                  <span className="text-blue-300">
                    {payload.divergingDays} corrected by HR
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={period.month}
              onChange={(e) => setPeriod((p) => ({ ...p, month: Number(e.target.value) }))}
              className="rounded-lg border border-white/10 bg-background px-3 py-2 text-xs text-white"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString('en-IN', { month: 'long' })}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={period.year}
              onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))}
              className="w-24 rounded-lg border border-white/10 bg-background px-3 py-2 text-xs text-white"
            />
            {pipeline && (
              <button
                onClick={syncFromField}
                disabled={syncing}
                title="Commit these field days into the payroll ledger now, instead of waiting for the scheduled run"
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-primary ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing…' : 'Commit to payroll'}
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : days.length === 0 ? (
          <p className="p-12 text-center text-sm text-secondary-foreground">
            No attendance recorded for this month.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {['Date', 'Status', 'Marked by', 'Check in', 'Check out', 'Note'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.date} className="border-b border-white/5">
                    <td className="px-4 py-3 text-white">{fmtDate(d.date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                          d.effectiveStatus === 'Present'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : d.effectiveStatus === 'Absent'
                              ? 'bg-red-500/15 text-red-300'
                              : 'bg-white/10 text-secondary-foreground'
                        }`}
                      >
                        {d.effectiveStatus ?? '—'}
                      </span>
                      {d.divergesFromField && (
                        <span
                          className="ml-2 text-[10px] text-blue-300"
                          title={`Staff record says ${d.pipelineStatus}`}
                        >
                          differs from field
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {d.source === 'HR' ? (
                        <span className="rounded-md bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                          HR
                        </span>
                      ) : d.source === 'FIELD' ? (
                        <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                          Staff check-in
                        </span>
                      ) : (
                        <span
                          className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300"
                          title="Recorded by the staff member; not yet committed to the payroll ledger"
                        >
                          Staff check-in · pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-secondary-foreground">
                      {d.checkIn ? new Date(d.checkIn).toLocaleTimeString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3 text-secondary-foreground">
                      {d.checkOut ? new Date(d.checkOut).toLocaleTimeString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3 text-secondary-foreground">{d.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SalaryTab({ employee }: { employee: any }) {
  const now = new Date();
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['employee-payslips', employee.id],
    queryFn: () => api.listEmployeePayslips(employee.id),
  });
  const payslips = unwrapItems(data);

  const generate = async () => {
    setGenerating(true);
    try {
      // The server pulls that month's field check-ins across before it counts
      // days, so a staff member who marked their own attendance is paid for it.
      const res = await api.generateEmployeePayroll(employee.id, period.month, period.year);
      const projection = ((res as any)?.data ?? res)?.attendanceProjection;
      const pulled = Number(projection?.inserted ?? 0) + Number(projection?.updated ?? 0);
      toast.success(
        `Payslip generated for ${period.month}/${period.year}` +
          (pulled > 0 ? ` (${pulled} field day${pulled === 1 ? '' : 's'} pulled in first)` : ''),
      );
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not generate payslip';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setGenerating(false);
    }
  };

  const download = async (slip: any) => {
    setDownloading(slip.ref);
    try {
      const blob = await api.downloadEmployeePayslip(employee.id, slip.ref);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${employee.employeeId}-${String(slip.periodMonth).padStart(2, '0')}-${slip.periodYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not download payslip';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-background/40 p-5 space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <DollarSign className="h-4 w-4 text-emerald-400" /> Generate a payslip
        </h2>
        <p className="text-xs text-secondary-foreground">
          Built from the attendance recorded for the period, against a base of ₹
          {Number(employee.salary ?? 0).toLocaleString('en-IN')} per month.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-white">Month</label>
            <select
              value={period.month}
              onChange={(e) => setPeriod((p) => ({ ...p, month: Number(e.target.value) }))}
              className="rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString('en-IN', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-white">Year</label>
            <input
              type="number"
              value={period.year}
              onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))}
              className="w-28 rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white"
            />
          </div>
          <button
            onClick={generate}
            disabled={generating}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-background/40 overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <h2 className="text-sm font-bold text-white">All payslips</h2>
          <p className="mt-1 text-xs text-secondary-foreground">
            Merged across HR payroll, the enterprise batch run, and the field/placement run — HR
            should not have to know which one paid this person in a given month.
          </p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : payslips.length === 0 ? (
          <p className="p-12 text-center text-sm text-secondary-foreground">
            No payslips for this employee yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {['Period', 'Source', 'Days paid', 'Gross', 'Deductions', 'Net', 'Status', ''].map(
                    (h, i) => (
                      <th
                        key={i}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {payslips.map((p: any) => (
                  <tr key={p.ref} className="border-b border-white/5">
                    <td className="px-4 py-3 text-white">
                      {new Date(p.periodYear, p.periodMonth - 1).toLocaleString('en-IN', {
                        month: 'short',
                      })}{' '}
                      {p.periodYear}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                        {p.sourceLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-secondary-foreground">{p.presentDays ?? '—'}</td>
                    <td className="px-4 py-3 text-secondary-foreground">
                      ₹{Number(p.grossSalary ?? 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-secondary-foreground">
                      ₹{Number(p.totalDeductions ?? 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      ₹{Number(p.netSalary ?? 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-secondary-foreground">{p.status}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => download(p)}
                        disabled={downloading === p.ref}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                      >
                        <Download className="h-3.5 w-3.5 text-emerald-400" />
                        {downloading === p.ref ? 'Preparing…' : 'PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function PipelineHistoryTab({ employee }: { employee: any }) {
  const { data, isLoading } = useQuery({
    queryKey: ['employee-pipeline-history', employee.id],
    queryFn: () => api.getEmployeePipelineHistory(employee.id),
  });
  const payload: any = unwrapData(data);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!payload?.linkedToPipeline) {
    return (
      <section className="rounded-2xl border border-white/10 bg-background/40 p-12 text-center">
        <History className="mx-auto h-10 w-10 text-secondary-foreground/40 mb-3" />
        <p className="text-sm text-secondary-foreground">
          {payload?.note ?? 'This employee has no pipeline record.'}
        </p>
      </section>
    );
  }

  const events: any[] = payload.events ?? [];

  return (
    <section className="rounded-2xl border border-white/10 bg-background/40 overflow-hidden">
      <div className="border-b border-white/10 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <History className="h-4 w-4 text-primary" /> How this employee was hired
        </h2>
        <p className="mt-1 text-xs text-secondary-foreground">
          {events.length} event{events.length === 1 ? '' : 's'} on {payload.applicant?.staffCode},
          newest first.
        </p>
      </div>
      {events.length === 0 ? (
        <p className="p-12 text-center text-sm text-secondary-foreground">
          No pipeline events recorded.
        </p>
      ) : (
        <ol className="divide-y divide-white/5">
          {events.map((e) => (
            <li key={e.id} className="flex gap-4 p-4">
              <div className="w-36 shrink-0 text-xs text-secondary-foreground">
                {fmtDate(e.occurredAt)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  {e.eventType.replace(/_/g, ' ')}
                  {e.fromStage && e.toStage && e.fromStage !== e.toStage && (
                    <span className="ml-2 font-normal text-secondary-foreground">
                      {STAGE_LABELS[e.fromStage as keyof typeof STAGE_LABELS] ?? e.fromStage} →{' '}
                      {STAGE_LABELS[e.toStage as keyof typeof STAGE_LABELS] ?? e.toStage}
                    </span>
                  )}
                </p>
                {e.notes && <p className="mt-0.5 text-xs text-secondary-foreground">{e.notes}</p>}
                <p className="mt-1 text-[11px] text-secondary-foreground/70">
                  {e.actor ? `${e.actor.fullName} (${e.actor.role})` : 'System'}
                  {e.reasonCode ? ` · ${e.reasonCode}` : ''}
                  {e.scenarioCode ? ` · scenario ${e.scenarioCode}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function IncidentsTab({ employee }: { employee: any }) {
  const { data, isLoading } = useQuery({
    queryKey: ['employee-incidents', employee.id],
    queryFn: () => api.getEmployeeIncidents(employee.id),
  });
  const payload: any = unwrapData(data);
  const items: any[] = payload?.items ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-background/40 overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <AlertTriangle className="h-4 w-4 text-amber-400" /> Incidents
        </h2>
        {items.length > 0 && (
          <span className="rounded-lg bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300">
            {payload?.openCount ?? 0} open
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="p-12 text-center text-sm text-secondary-foreground">
          {payload?.linkedToPipeline === false
            ? 'Direct hire — incidents are only recorded against deployed pipeline staff.'
            : 'No incidents recorded against this employee.'}
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {items.map((i) => (
            <li key={i.id} className="p-4 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-white">{i.title}</p>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    i.status === 'OPEN'
                      ? 'bg-red-500/15 text-red-300'
                      : 'bg-emerald-500/15 text-emerald-300'
                  }`}
                >
                  {i.status}
                </span>
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-secondary-foreground">
                  {String(i.type).replace(/_/g, ' ')}
                </span>
                {i.legalHold && (
                  <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                    Legal hold
                  </span>
                )}
              </div>
              {i.description && (
                <p className="text-xs text-secondary-foreground">{i.description}</p>
              )}
              {i.resolution && (
                <p className="text-xs text-emerald-300/80">Resolution: {i.resolution}</p>
              )}
              <p className="text-[11px] text-secondary-foreground/70">
                Raised {fmtDate(i.createdAt)}
                {i.resolvedAt ? ` · resolved ${fmtDate(i.resolvedAt)}` : ''}
                {i.comments?.length ? ` · ${i.comments.length} comment(s)` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DocumentsTab({ employee }: { employee: any }) {
  const { data, isLoading } = useQuery({
    queryKey: ['employee-documents', employee.id],
    queryFn: () => api.getEmployeeDocuments(employee.id),
  });
  const docs = unwrapItems(data);

  return (
    <section className="rounded-2xl border border-white/10 bg-background/40 overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <ShieldCheck className="h-4 w-4 text-amber-400" /> Documents
        </h2>
        <Link
          href={`/hr/employees/${employee.id}/documents`}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Manage & upload
        </Link>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : docs.length === 0 ? (
        <p className="p-12 text-center text-sm text-secondary-foreground">
          No documents on file yet.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {['Type', 'Number', 'Valid till', 'Status'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docs.map((d: any) => (
              <tr key={d.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-white">{d.type}</td>
                <td className="px-4 py-3 font-mono text-xs text-secondary-foreground">
                  {d.docNumber ?? '—'}
                </td>
                <td className="px-4 py-3 text-secondary-foreground">{fmtDate(d.validTill)}</td>
                <td className="px-4 py-3 text-secondary-foreground">{d.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
