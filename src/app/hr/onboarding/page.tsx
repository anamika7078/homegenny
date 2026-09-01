'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Spinner } from '@/components/ui/loading';
import { unwrapItems } from '@/lib/hr/utils';
import { SERIES_LABELS } from '@/lib/rm/constants';
import { UserCheck, AlertTriangle, Search } from 'lucide-react';
import toast from 'react-hot-toast';

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const EMPTY_FORM = {
  department: '',
  designation: '',
  categoryId: '',
  employmentType: 'Full Time',
  salary: '',
  joiningDate: todayIso(),
  gender: 'Female',
  city: '',
  state: '',
  pincode: '',
  reportingManager: '',
};

/**
 * HR's handover point from the RM pipeline.
 *
 * Everyone here has finished S1-S5 and is working, but has no `employees`
 * record — so they are invisible to attendance, salary and payslips until HR
 * fills in the employment details the pipeline never collected.
 */
export default function HrOnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['employees', 'pending-onboarding'],
    queryFn: () => api.listPendingOnboarding({ limit: 200 }),
  });
  const { data: categoryData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.listCategories(),
  });

  const candidates = unwrapItems(data);
  const categories = unwrapItems(categoryData);

  const visible = search.trim()
    ? candidates.filter((c: any) =>
        [c.fullName, c.staffCode, c.mobile]
          .filter(Boolean)
          .some((v: string) => v.toLowerCase().includes(search.trim().toLowerCase())),
      )
    : candidates;

  const open = (candidate: any) => {
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id ?? '' });
    setSelected(candidate);
  };

  const submit = async () => {
    if (!selected) return;
    const missing = (['department', 'designation', 'categoryId', 'employmentType', 'joiningDate', 'gender'] as const)
      .filter((k) => !form[k]);
    if (missing.length || !form.salary) {
      toast.error(`Please fill: ${[...missing, ...(form.salary ? [] : ['salary'])].join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      const res = await api.onboardFromPipeline({
        staffApplicantId: selected.id,
        department: form.department.trim(),
        designation: form.designation.trim(),
        categoryId: form.categoryId,
        employmentType: form.employmentType,
        salary: Number(form.salary),
        joiningDate: form.joiningDate,
        gender: form.gender,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
        reportingManager: form.reportingManager.trim() || undefined,
      });
      const payload = (res as any)?.data ?? res;
      const employee = payload?.employee;
      const warnings: string[] = payload?.warnings ?? [];

      toast.success(`${selected.fullName} onboarded as ${employee?.employeeId ?? 'employee'}`);
      warnings.forEach((w) => toast(w, { icon: '⚠️', duration: 6000 }));

      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      refetch();
      if (employee?.id) router.push(`/hr/employees/${employee.id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Onboarding failed';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-padding max-w-[1600px] mx-auto py-24 text-center">
        <p className="text-red-400 text-sm">Failed to load pending onboarding. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="page-padding max-w-[1600px] mx-auto space-y-6">
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-white text-lg">Onboard to HR</h3>
                <p className="text-sm text-secondary-foreground">
                  {selected.fullName} · {selected.staffCode} ·{' '}
                  {SERIES_LABELS[selected.series as keyof typeof SERIES_LABELS] ?? selected.series}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-white text-xl"
              >
                &times;
              </button>
            </div>

            <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-secondary-foreground">
              Name, mobile, date of birth and address come across from the pipeline record. Only the
              employment details below are needed — the candidate keeps their existing login.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { key: 'department', label: 'Department *', placeholder: 'e.g. Field Operations' },
                { key: 'designation', label: 'Designation *', placeholder: 'e.g. Housemaid' },
              ].map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-sm font-semibold text-white">{f.label}</label>
                  <input
                    value={(form as any)[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white placeholder:text-secondary-foreground/50"
                  />
                </div>
              ))}

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-white">Category *</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white"
                >
                  <option value="">Select category…</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-white">Employment type *</label>
                <select
                  value={form.employmentType}
                  onChange={(e) => setForm((s) => ({ ...s, employmentType: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white"
                >
                  {['Full Time', 'Part Time', 'Contract', 'Temporary'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-white">Monthly salary (₹) *</label>
                <input
                  type="number"
                  min={0}
                  value={form.salary}
                  onChange={(e) => setForm((s) => ({ ...s, salary: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-white">Joining date *</label>
                <input
                  type="date"
                  value={form.joiningDate}
                  onChange={(e) => setForm((s) => ({ ...s, joiningDate: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-white">Gender *</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm((s) => ({ ...s, gender: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white"
                >
                  {['Female', 'Male', 'Other'].map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-white">Reporting manager</label>
                <input
                  value={form.reportingManager}
                  onChange={(e) => setForm((s) => ({ ...s, reportingManager: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white"
                />
              </div>

              {/* Intake stores one free-text address, so city/state/pincode have
                  to be entered here or the employee record carries NOT_SET. */}
              {[
                { key: 'city', label: 'City' },
                { key: 'state', label: 'State' },
                { key: 'pincode', label: 'Pincode' },
              ].map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-sm font-semibold text-white">{f.label}</label>
                  <input
                    value={(form as any)[f.key]}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex-1 rounded-xl border border-white/10 py-2 text-sm font-semibold text-white hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="flex-1 rounded-xl bg-primary hover:bg-primary/90 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? 'Onboarding…' : 'Create Employee Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-2.5">
            <UserCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Pending Onboarding</h1>
            <p className="text-sm text-secondary-foreground">
              {candidates.length} deployed candidate{candidates.length === 1 ? '' : 's'} without an
              employee record
            </p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, staff code or mobile…"
            className="w-64 rounded-lg border border-white/10 bg-background py-2 pl-9 pr-3 text-sm text-white placeholder:text-secondary-foreground/50"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-background/40 p-12 text-center">
          <UserCheck className="mx-auto h-10 w-10 text-secondary-foreground/40 mb-3" />
          <p className="text-secondary-foreground text-sm">
            {candidates.length === 0
              ? 'Every deployed candidate already has an employee record.'
              : 'No candidate matches that search.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-background/40 backdrop-blur-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Staff Code', 'Name', 'Series', 'Mobile', 'Branch', 'Assigned RM', ''].map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((c: any) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs text-white">{c.staffCode}</td>
                  <td className="px-4 py-3 text-white">
                    <Link href={`/hr/candidates/${c.id}`} className="hover:text-primary">
                      {c.fullName}
                    </Link>
                    {c.restrictedListFlag && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-300">
                        <AlertTriangle className="h-3 w-3" />
                        Restricted
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-secondary-foreground">
                    {SERIES_LABELS[c.series as keyof typeof SERIES_LABELS] ?? c.series}
                  </td>
                  <td className="px-4 py-3 text-secondary-foreground">{c.mobile}</td>
                  <td className="px-4 py-3 text-secondary-foreground">{c.branch?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-secondary-foreground">{c.assignedRm?.fullName ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => open(c)}
                      disabled={c.restrictedListFlag}
                      title={
                        c.restrictedListFlag
                          ? 'On the restricted list — clear the entry before onboarding'
                          : undefined
                      }
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Onboard
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
