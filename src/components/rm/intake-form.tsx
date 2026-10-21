'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth.store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';
import { useRouter } from 'next/navigation';
import { useSeriesCatalog } from '@/lib/series';

const schema = z.object({
  full_name: z.string().min(2, 'Name required'),
  date_of_birth: z.string().min(1, 'DOB required'),
  mobile: z.string().min(10, 'Valid mobile required'),
  aadhaar_number: z.string().length(12, 'Aadhaar must be 12 digits'),
  address: z.string().min(5, 'Address required'),
  hometown: z.string().optional(),
  // The backend refuses a paused series (MAID/DRIVER) with a clear message.
  series: z.enum(['UNSKILLED_CARE', 'SKILLED_CARE', 'COOK', 'MAID', 'DRIVER']),
  language_tier: z.enum(['T1', 'T2', 'T3', 'T4']).optional(),
  referral_source: z.string().optional(),
  deposit_amount: z.coerce.number().min(0).optional(),
  deposit_collected: z.boolean().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_mobile: z.string().optional(),
  intake_notes: z.string().optional(),
  assigned_rm_id: z.string().optional(),
});

/**
 * "Complete S1" for an app sign-up: the mobile is already on file, and Aadhaar
 * can wait for S2 verification. Everything else S1 needs is still required.
 */
const completionSchema = schema.extend({
  mobile: z.string().optional(),
  aadhaar_number: z.union([z.literal(''), z.string().regex(/^d{12}$/, 'Aadhaar must be 12 digits')]).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
});

type FormValues = z.infer<typeof completionSchema>;

/** The parts of an existing staff row the completion form starts from. */
export interface IntakeExistingStaff {
  id: string;
  mobile: string;
  full_name?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  email?: string | null;
  series_db?: string | null;
  language_tier?: string | null;
  aadhaar_number?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_mobile?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface IntakeFormProps {
  /** Where a successfully-created candidate's detail page lives. */
  successBasePath?: string;
  /** Where to send the user when the restricted-list check terminates the case. */
  terminalRedirect?: string;
  /** Complete S1 for this app sign-up instead of creating a new staff member. */
  existingStaff?: IntakeExistingStaff;
}

export function IntakeForm({
  successBasePath = '/rm/staff',
  terminalRedirect = '/rm/terminal',
  existingStaff,
}: IntakeFormProps = {}) {
  const completing = !!existingStaff;
  const meta = (existingStaff?.metadata ?? {}) as Record<string, string | undefined>;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [restrictedWarning, setRestrictedWarning] = useState<string | null>(null);
  // Completing claims the staff for whoever does it; there is no RM to pick.
  const needsRmPicker = user?.role !== 'RM' && !completing;
  const { active: activeSeries } = useSeriesCatalog();

  const { data: rmUsersRaw, isLoading: rmUsersLoading } = useQuery({
    queryKey: ['rm-users'],
    queryFn: () => api.listRmUsers(),
    enabled: needsRmPicker,
  });
  const rmUsers =
    (rmUsersRaw as { data?: { id: string; full_name: string }[] })?.data ??
    (rmUsersRaw as { id: string; full_name: string }[]) ??
    [];

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(completing ? completionSchema : schema),
    defaultValues: {
      series: (existingStaff?.series_db as FormValues['series'] | undefined) ?? 'UNSKILLED_CARE',
      language_tier: (existingStaff?.language_tier as FormValues['language_tier'] | undefined) ?? 'T2',
      deposit_collected: false,
      ...(existingStaff
        ? {
            full_name: existingStaff.full_name ?? '',
            date_of_birth: existingStaff.date_of_birth ? String(existingStaff.date_of_birth).slice(0, 10) : '',
            mobile: existingStaff.mobile,
            address: existingStaff.address ?? '',
            aadhaar_number: existingStaff.aadhaar_number ?? '',
            emergency_contact_name: existingStaff.emergency_contact_name ?? '',
            emergency_contact_mobile: existingStaff.emergency_contact_mobile ?? '',
            hometown: meta.hometown ?? '',
            gender: meta.gender as FormValues['gender'],
          }
        : {}),
    },
  });

  const submit = useMutation({
    mutationFn: async (values: FormValues) => {
      if (existingStaff) {
        // The backend runs the restricted-list check (phone + Aadhaar) itself.
        const { mobile: _mobile, assigned_rm_id: _rm, ...rest } = values;
        return api.completeIntake(existingStaff.id, rest);
      }
      if (needsRmPicker && !values.assigned_rm_id) {
        throw new Error('Please select which RM this candidate belongs to');
      }
      const check = await api.checkRestricted(values.aadhaar_number ?? "", values.mobile ?? "");
      const hit = (check as { found?: boolean; data?: { found?: boolean } })?.found
        ?? (check as { data?: { found?: boolean } })?.data?.found;
      if (hit) {
        setRestrictedWarning('Restricted list match — staff will be routed to TERMINAL');
      }
      return api.rmIntake({
        ...values,
        branch_id: user?.branch_id,
        metadata: { hometown: values.hometown, intake_notes: values.intake_notes },
        advance_to_verify: !hit,
      });
    },
    onSuccess: (res: { outcome?: string; staff?: { id?: string } }) => {
      qc.invalidateQueries({ queryKey: ['rm-kanban'] });
      qc.invalidateQueries({ queryKey: ['rm-dashboard'] });
      qc.invalidateQueries({ queryKey: ['staff'] });
      qc.invalidateQueries({ queryKey: ['rm-unassigned-staff'] });
      if (res.outcome === 'RESTRICTED') {
        toast.error('Restricted list — case terminated');
        router.push(terminalRedirect);
        return;
      }
      toast.success('Intake complete — advanced to S2 Verification');
      if (res.staff?.id) router.push(`${successBasePath}/${res.staff.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={handleSubmit((v) => submit.mutate(v))}
      className="glass-card mx-auto max-w-3xl space-y-6 rounded-xl p-6"
    >
      {restrictedWarning && (
        <RestrictedAlert message={restrictedWarning} />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {needsRmPicker && (
          <Field label="Assign to RM" className="md:col-span-2" error={errors.assigned_rm_id?.message}>
            <Controller
              control={control}
              name="assigned_rm_id"
              render={({ field }) => (
                <SelectMenu
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  placeholder={rmUsersLoading ? 'Loading RMs...' : 'Select RM'}
                  className="h-10 border-white/10 bg-card text-sm"
                >
                  {rmUsers.map((rm) => (
                    <SelectMenuItem key={rm.id} value={rm.id}>
                      {rm.full_name}
                    </SelectMenuItem>
                  ))}
                </SelectMenu>
              )}
            />
          </Field>
        )}
        <Field label="Full name" error={errors.full_name?.message}>
          <Input {...register('full_name')} placeholder="Full legal name" />
        </Field>
        <Field label="Date of birth" error={errors.date_of_birth?.message}>
          <Input type="date" {...register('date_of_birth')} />
        </Field>
        <Field label="Mobile" error={errors.mobile?.message}>
          <Input {...register('mobile')} placeholder="10-digit mobile" disabled={completing} />
        </Field>
        <Field label={completing ? 'Aadhaar (optional — S2 verifies it)' : 'Aadhaar'} error={errors.aadhaar_number?.message}>
          <Input {...register('aadhaar_number')} placeholder="12 digits" maxLength={12} />
        </Field>
        {completing && (
          <Field label="Gender" error={errors.gender?.message}>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <SelectMenu
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  placeholder="Select gender"
                  className="h-10 border-white/10 bg-card text-sm"
                >
                  <SelectMenuItem value="FEMALE">Female</SelectMenuItem>
                  <SelectMenuItem value="MALE">Male</SelectMenuItem>
                  <SelectMenuItem value="OTHER">Other</SelectMenuItem>
                </SelectMenu>
              )}
            />
          </Field>
        )}
        <Field label="Series" error={errors.series?.message}>
          <Controller
            control={control}
            name="series"
            render={({ field }) => (
              <SelectMenu
                value={field.value}
                onValueChange={field.onChange}
                placeholder="Select series"
                className="h-10 border-white/10 bg-card text-sm"
              >
                {activeSeries.map((s) => (
                  <SelectMenuItem key={s.value} value={s.value}>{s.short} — {s.label}</SelectMenuItem>
                ))}
              </SelectMenu>
            )}
          />
        </Field>
        <Field label="Language tier" error={errors.language_tier?.message}>
          <Controller
            control={control}
            name="language_tier"
            render={({ field }) => (
              <SelectMenu
                value={field.value ?? ''}
                onValueChange={field.onChange}
                placeholder="Select tier"
                className="h-10 border-white/10 bg-card text-sm"
              >
                <SelectMenuItem value="T1">T1</SelectMenuItem>
                <SelectMenuItem value="T2">T2</SelectMenuItem>
                <SelectMenuItem value="T3">T3</SelectMenuItem>
                <SelectMenuItem value="T4">T4</SelectMenuItem>
              </SelectMenu>
            )}
          />
        </Field>
        <Field label="Hometown" className="md:col-span-2">
          <Input {...register('hometown')} />
        </Field>
        <Field label="Address" className="md:col-span-2" error={errors.address?.message}>
          <Input {...register('address')} />
        </Field>
        <Field label="Referral source">
          <Input {...register('referral_source')} placeholder="Walk-in, referral, camp..." />
        </Field>
        <Field label="Deposit amount (₹)">
          <Input type="number" {...register('deposit_amount')} />
        </Field>
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" {...register('deposit_collected')} className="rounded" />
          Deposit collected at intake
        </label>
        <Field label="Emergency contact name">
          <Input {...register('emergency_contact_name')} />
        </Field>
        <Field label="Emergency contact mobile">
          <Input {...register('emergency_contact_mobile')} />
        </Field>
        <Field label="Intake notes" className="md:col-span-2">
          <textarea
            className="min-h-[80px] w-full rounded-lg border border-white/10 bg-card px-3 py-2 text-sm"
            {...register('intake_notes')}
          />
        </Field>
      </div>

      <FormActions isSubmitting={isSubmitting || submit.isPending} label={completing ? 'Complete S1 → S2' : 'Submit Intake'} />
    </form>
  );
}

function RestrictedAlert({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
      {message}
    </div>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}

function FormActions({ isSubmitting, label }: { isSubmitting: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Processing...' : label}
      </Button>
    </div>
  );
}
