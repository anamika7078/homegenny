'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth.store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';
import { useRouter } from 'next/navigation';

const schema = z.object({
  full_name: z.string().min(2, 'Name required'),
  date_of_birth: z.string().min(1, 'DOB required'),
  mobile: z.string().min(10, 'Valid mobile required'),
  aadhaar_number: z.string().length(12, 'Aadhaar must be 12 digits'),
  address: z.string().min(5, 'Address required'),
  hometown: z.string().optional(),
  series: z.enum(['MAID', 'SKILLED_CARE', 'UNSKILLED_CARE', 'DRIVER']),
  language_tier: z.enum(['T1', 'T2', 'T3', 'T4']).optional(),
  referral_source: z.string().optional(),
  deposit_amount: z.coerce.number().min(0).optional(),
  deposit_collected: z.boolean().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_mobile: z.string().optional(),
  intake_notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function IntakeForm() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [restrictedWarning, setRestrictedWarning] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      series: 'MAID',
      language_tier: 'T2',
      deposit_collected: false,
    },
  });

  const submit = useMutation({
    mutationFn: async (values: FormValues) => {
      const check = await api.checkRestricted(values.aadhaar_number, values.mobile);
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
      if (res.outcome === 'RESTRICTED') {
        toast.error('Restricted list — case terminated');
        router.push('/rm/terminal');
        return;
      }
      toast.success('Intake complete — advanced to S2 Verification');
      if (res.staff?.id) router.push(`/rm/staff/${res.staff.id}`);
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
        <Field label="Full name" error={errors.full_name?.message}>
          <Input {...register('full_name')} placeholder="Full legal name" />
        </Field>
        <Field label="Date of birth" error={errors.date_of_birth?.message}>
          <Input type="date" {...register('date_of_birth')} />
        </Field>
        <Field label="Mobile" error={errors.mobile?.message}>
          <Input {...register('mobile')} placeholder="10-digit mobile" />
        </Field>
        <Field label="Aadhaar" error={errors.aadhaar_number?.message}>
          <Input {...register('aadhaar_number')} placeholder="12 digits" maxLength={12} />
        </Field>
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
                <SelectMenuItem value="MAID">M3X — Maid</SelectMenuItem>
                <SelectMenuItem value="UNSKILLED_CARE">UC — Unskilled Caretaker</SelectMenuItem>
                <SelectMenuItem value="SKILLED_CARE">SC — Skilled Caretaker</SelectMenuItem>
                <SelectMenuItem value="DRIVER">DR — Driver</SelectMenuItem>
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

      <FormActions isSubmitting={isSubmitting || submit.isPending} />
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

function FormActions({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Processing...' : 'Submit Intake'}
      </Button>
    </div>
  );
}
