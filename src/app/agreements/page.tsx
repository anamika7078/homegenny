'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';
import { api } from '@/lib/api/client';
import { usePathname } from 'next/navigation';

type DocStatus = 'signed' | 'pending' | 'locked' | 'na';
type AgreementStep = 'A1' | 'A2' | 'A3' | 'A4' | 'A5';

interface PendingRow {
  staffId: string;
  staff: string;
  series: 'DR' | 'SC' | 'MAID';
  client: string;
  a1: DocStatus;
  a2: DocStatus;
  a3: DocStatus;
  addendum: DocStatus;
  action: { label: string; step: AgreementStep } | null;
}

interface StaffListItem {
  id: string;
  full_name: string;
  series?: string;
}

function mapSeriesShort(series?: string): PendingRow['series'] {
  const s = (series ?? '').toUpperCase();
  if (s === 'DR' || s === 'DRIVER') return 'DR';
  if (s === 'SC' || s === 'SKILLED_CARE') return 'SC';
  return 'MAID';
}

function staffToPendingRow(s: StaffListItem): PendingRow {
  return {
    staffId: s.id,
    staff: s.full_name,
    series: mapSeriesShort(s.series),
    client: 'Client TBD',
    a1: 'pending',
    a2: 'locked',
    a3: 'locked',
    addendum: 'na',
    action: { label: 'Send A1 OTP', step: 'A1' },
  };
}

/** Demo rows — only used when API returns no staff (IDs are not in DB) */
const DEMO_ROWS: PendingRow[] = [
  {
    staffId: 'a0000001-0000-4000-8000-000000000001',
    staff: 'Ramesh Babu Trivedi',
    series: 'DR',
    client: 'Kapoor Family',
    a1: 'signed',
    a2: 'pending',
    a3: 'pending',
    addendum: 'locked',
    action: { label: 'Send A2 OTP', step: 'A2' },
  },
  {
    staffId: 'a0000002-0000-4000-8000-000000000002',
    staff: 'Durga Devi Joshi',
    series: 'SC',
    client: 'Srivastava Family',
    a1: 'signed',
    a2: 'signed',
    a3: 'pending',
    addendum: 'pending',
    action: { label: 'Send A4 OTP', step: 'A4' },
  },
  {
    staffId: 'a0000003-0000-4000-8000-000000000003',
    staff: 'Geeta Rani',
    series: 'MAID',
    client: 'Mehrotra Family',
    a1: 'pending',
    a2: 'locked',
    a3: 'locked',
    addendum: 'na',
    action: { label: 'Send A1 OTP', step: 'A1' },
  },
  {
    staffId: 'a0000004-0000-4000-8000-000000000004',
    staff: 'Ramkishan Yadav',
    series: 'DR',
    client: 'Khanna Family',
    a1: 'signed',
    a2: 'signed',
    a3: 'pending',
    addendum: 'locked',
    action: { label: 'Send A3 OTP', step: 'A3' },
  },
];

const SERIES_BADGE: Record<PendingRow['series'], { bg: string; text: string }> = {
  DR: { bg: 'bg-sky-500/15', text: 'text-sky-400' },
  SC: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  MAID: { bg: 'bg-[#FF6B00]/15', text: 'text-[#FF6B00]' },
};

function StatusBadge({ status }: { status: DocStatus }) {
  if (status === 'signed') {
    return (
      <span className="inline-flex rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400 ring-1 ring-emerald-500/35">
        Signed
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex rounded-md bg-[#FF6B00]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#FF6B00] ring-1 ring-[#FF6B00]/35">
        Pending
      </span>
    );
  }
  if (status === 'locked') {
    return <span className="text-[11px] font-medium text-muted-foreground">Locked</span>;
  }
  return <span className="text-[11px] font-medium text-muted-foreground">N/A</span>;
}

function unwrap<T = unknown>(body: unknown): T {
  const b = body as { data?: T };
  return (b?.data !== undefined ? b.data : body) as T;
}

function toastEsignOtp(agreementType: string, staffName: string, minutes: number) {
  toast.custom(
    () => (
      <div className="pointer-events-auto flex w-full max-w-[min(420px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-white/10 bg-[#121418] text-white shadow-2xl">
        <div className="w-1.5 shrink-0 rounded-l-[14px] bg-[#FF6B00]" aria-hidden />
        <p className="flex-1 py-4 pl-3 pr-4 text-sm font-medium leading-snug">
          {`${agreementType} OTP sent to ${staffName} — valid ${minutes} min`}
        </p>
      </div>
    ),
    { position: 'bottom-center', duration: 5000 }
  );
}

const INFO_CARDS = [
  {
    title: 'A1 – EOR Agreement',
    body: 'Employer-on-Record agreement between HomeGenny and the client. Establishes statutory employment and compliance obligations.',
  },
  {
    title: 'A2 – Scope of Work',
    body: 'Defines duties, working hours, and location. Unlocked only after A1 is fully signed by the client.',
  },
  {
    title: 'A3 – Indemnity',
    body: 'Client indemnifies HomeGenny for claims arising from the placement. Final legal step before deployment can proceed.',
  },
];

export default function AgreementsPage() {
  const pathname = usePathname();
  const isRmPortal = pathname?.startsWith('/rm');
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const { data: staffItems = [], isLoading: staffLoading } = useQuery({
    queryKey: ['agreements-staff'],
    queryFn: async () => {
      const load = async (params: Record<string, unknown>) => {
        const raw = await api.listStaff(params);
        const body = unwrap<{ items?: StaffListItem[] }>(raw);
        return body.items ?? [];
      };
      const atStage = await load({ stage: 'S4_AGREEMENTS', limit: 50 });
      if (atStage.length) return atStage;
      return load({ limit: 50 });
    },
  });

  const rows = useMemo(
    () => (staffItems.length ? staffItems.map(staffToPendingRow) : DEMO_ROWS),
    [staffItems],
  );

  const sendOtp = useCallback(async (row: PendingRow) => {
    if (!row.action) return;
    const key = `${row.staffId}-${row.action.step}`;
    setBusyKey(key);
    try {
      const raw = await api.sendAgreementEsignOtp({
        staff_id: row.staffId,
        agreement_type: row.action.step,
        staff_name: row.staff,
      });
      const data = unwrap<{ agreement_type: string; staff_name: string; expires_in_minutes: number }>(raw);
      toastEsignOtp(data.agreement_type, data.staff_name, data.expires_in_minutes ?? 10);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send OTP';
      toast.error(msg, { position: 'bottom-center' });
    } finally {
      setBusyKey(null);
    }
  }, []);

  const renderContent = (
    <div className="page-padding mx-auto max-w-[1600px]">
      <div className="mb-8">
        <h1 className="font-syne text-3xl font-bold tracking-tight text-white lg:text-4xl">Agreements – eSign Status</h1>
        <p className="mt-2 max-w-3xl text-sm text-secondary-foreground">
          A1 EOR · A2 SOW · A3 Indemnity · A4 Medical Addendum · A5 Medical Exclusion
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#121926]/90 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-widest text-secondary-foreground">
                <th className="whitespace-nowrap px-4 py-3.5 font-semibold sm:px-5">Staff</th>
                <th className="whitespace-nowrap px-3 py-3.5 font-semibold">Series</th>
                <th className="whitespace-nowrap px-3 py-3.5 font-semibold">Client</th>
                <th className="whitespace-nowrap px-3 py-3.5 font-semibold">A1 EOR</th>
                <th className="whitespace-nowrap px-3 py-3.5 font-semibold">A2 SOW</th>
                <th className="whitespace-nowrap px-3 py-3.5 font-semibold">A3 Indemnity</th>
                <th className="whitespace-nowrap px-3 py-3.5 font-semibold">Addendum</th>
                <th className="whitespace-nowrap px-4 py-3.5 font-semibold sm:px-5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {staffLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    Loading staff…
                  </td>
                </tr>
              ) : null}
              {rows.map((row) => {
                const busy = row.action && busyKey === `${row.staffId}-${row.action.step}`;
                const series = SERIES_BADGE[row.series];
                return (
                  <tr key={row.staffId} className="text-secondary-foreground hover:bg-white/[0.02]">
                    <td className="max-w-[160px] truncate px-4 py-3.5 font-medium text-white sm:max-w-[200px] sm:px-5">
                      {row.staff}
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={cn(
                          'inline-flex min-w-[2.25rem] items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-bold',
                          series.bg,
                          series.text
                        )}
                      >
                        {row.series}
                      </span>
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-3.5 text-xs sm:max-w-none">{row.client}</td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={row.a1} />
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={row.a2} />
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={row.a3} />
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={row.addendum} />
                    </td>
                    <td className="px-4 py-3.5 sm:px-5">
                      {row.action ? (
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => sendOtp(row)}
                          className="rounded-full bg-[#FF6B00] px-4 py-2 text-[11px] font-bold text-white shadow-md shadow-[#FF6B00]/25 transition-colors hover:bg-[#e65f00] disabled:opacity-50"
                        >
                          {busy ? 'Sending…' : row.action.label}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {INFO_CARDS.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-white/[0.08] bg-[#121926]/80 p-5 shadow-lg"
          >
            <h3 className="font-syne text-sm font-bold text-white">{card.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-secondary-foreground">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );

  if (isRmPortal) {
    return renderContent;
  }

  return <AppShell>{renderContent}</AppShell>;
}
