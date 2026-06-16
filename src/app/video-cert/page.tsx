'use client';

import React, { useMemo } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Lock, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const STAFF_NAME = 'Pushpa Lata Dubey';
const SERIES_LABEL = 'SC Series';

const PROMPTS: { id: number; text: string }[] = [
  { id: 1, text: 'Introduce yourself and describe your experience in skilled care.' },
  { id: 2, text: 'How do you ensure dignity and privacy when assisting a client with bathing?' },
  { id: 3, text: 'Walk through how you would help a client take prescribed medication on time.' },
  {
    id: 4,
    text: 'How do you handle a patient who becomes aggressive or non-compliant?',
  },
  { id: 5, text: 'Describe how you would respond if you noticed signs of a pressure injury.' },
  { id: 6, text: 'How do you communicate changes in condition to family or the care team?' },
  { id: 7, text: 'Explain your approach to infection control in a home setting.' },
  { id: 8, text: 'What steps do you take when a client refuses care you believe is necessary?' },
  { id: 9, text: 'How do you maintain boundaries while building trust with the household?' },
  { id: 10, text: 'Closing: confirm your availability and any certifications you hold.' },
];

type CertStatus = 'Verified' | 'Recording';

interface RecentCertRow {
  staff: string;
  series: 'SC' | 'DR' | 'MAID';
  date: string;
  sha: string;
  status: CertStatus;
}

const RECENT_CERTS: RecentCertRow[] = [
  {
    staff: 'Savitri Devi Sharma',
    series: 'SC',
    date: '14 May 2026',
    sha: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'Verified',
  },
  {
    staff: 'Ramkishan Yadav',
    series: 'DR',
    date: '14 May 2026',
    sha: '2c26b46b68ffc68ff99b453c1d3041340e32cf90275d0dfc6b1f486a1d5b1d1e',
    status: 'Recording',
  },
  {
    staff: 'Geeta Rani',
    series: 'MAID',
    date: '13 May 2026',
    sha: '6ae8a75555209fd6c441f6534f91a1b65e748e5b9bb5f9a6c8b5e95b5b5b5b5b',
    status: 'Verified',
  },
  {
    staff: 'Sudha Tiwari',
    series: 'SC',
    date: '13 May 2026',
    sha: '4523490e89e5831552677a4e7e33c35f2b0c2b0c2b0c2b0c2b0c2b0c2b0c2b0',
    status: 'Verified',
  },
];

const SERIES_BADGE: Record<RecentCertRow['series'], { bg: string; text: string; label: string }> = {
  SC: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'SC' },
  DR: { bg: 'bg-sky-500/15', text: 'text-sky-400', label: 'DR' },
  MAID: { bg: 'bg-[#FF6B00]/15', text: 'text-[#FF6B00]', label: 'MAID' },
};

const GCS_ROWS: { label: string; value: string; valueClass?: string }[] = [
  { label: 'Bucket', value: 'homegenny-video-certs-prod', valueClass: 'font-mono text-[#FF6B00]' },
  { label: 'Retention policy', value: 'LOCKED - 7 years', valueClass: 'text-emerald-400 font-medium' },
  { label: 'Signed URL expiry', value: '15 minutes' },
  { label: 'Encryption', value: 'AES-256 · Google-managed' },
  { label: 'isLocked', value: 'true · 220,752,000s', valueClass: 'text-emerald-400 font-medium' },
];

function truncateSha(hex: string) {
  if (hex.length <= 18) return hex;
  return `${hex.slice(0, 10)}…${hex.slice(-8)}`;
}

export default function VideoSelfCertPage() {
  const activePromptId = 4;

  const promptStates = useMemo(() => {
    return PROMPTS.map((p) => {
      if (p.id < activePromptId) return 'done' as const;
      if (p.id === activePromptId) return 'active' as const;
      return 'pending' as const;
    });
  }, [activePromptId]);

  return (
    <AppShell>
      <div className="mx-auto min-h-0 max-w-[1600px] px-6 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="font-syne text-3xl font-bold tracking-tight text-white lg:text-4xl">
              Video Self-Certification
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-secondary-foreground">
              SHA-256 integrity · GCS 7-year locked retention · Tamper-proof
            </p>
          </div>
          <div className="flex shrink-0 items-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 shadow-sm">
              <Lock className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2.5} />
              <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-300">
                GCS compliance lock — 7 years
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Left: recording / prompts (~58%) */}
          <div className="lg:col-span-7">
            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#121926]/90 shadow-xl">
              <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4 sm:px-6">
                <h2 className="font-syne text-lg font-bold leading-snug text-white sm:text-xl">
                  {SERIES_LABEL} — {STAFF_NAME}{' '}
                  <span className="text-secondary-foreground font-semibold">({PROMPTS.length} prompts)</span>
                </h2>
                <span className="shrink-0 rounded-full bg-[#FF6B00] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md shadow-[#FF6B00]/25">
                  Recording
                </span>
              </div>
              <div className="space-y-3 p-4 sm:p-5">
                {PROMPTS.map((prompt, idx) => {
                  const state = promptStates[idx];
                  const isActive = state === 'active';
                  const isDone = state === 'done';

                  return (
                    <div
                      key={prompt.id}
                      className={cn(
                        'flex gap-3 rounded-xl border px-4 py-3.5 transition-colors sm:gap-4 sm:px-5 sm:py-4',
                        isActive
                          ? 'border-[#FF6B00]/70 bg-[#FF6B00]/[0.07] ring-1 ring-[#FF6B00]/20'
                          : 'border-white/[0.06] bg-[#0B111B]/50',
                        isDone && 'border-emerald-500/20 bg-emerald-500/[0.04]'
                      )}
                    >
                      <div className="flex shrink-0 items-start pt-0.5">
                        <div
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold tabular-nums sm:h-10 sm:w-10',
                            isDone && 'bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-500/40',
                            isActive && 'bg-[#FF6B00]/20 text-[#FF6B00] ring-1 ring-[#FF6B00]/45',
                            state === 'pending' && 'bg-[#1a2332] text-muted-foreground ring-1 ring-white/10'
                          )}
                        >
                          {prompt.id}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        {isActive ? (
                          <p className="text-sm font-semibold leading-relaxed text-[#FF6B00] sm:text-[15px]">
                            <span className="mr-1.5 font-bold uppercase tracking-wide">Now recording —</span>
                            {prompt.text}
                          </p>
                        ) : (
                          <p
                            className={cn(
                              'text-sm leading-relaxed sm:text-[15px]',
                              isDone ? 'text-white/90' : 'text-muted-foreground'
                            )}
                          >
                            {prompt.text}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6 lg:col-span-5">
            {/* Recent Certifications */}
            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#121926]/90 shadow-xl">
              <div className="border-b border-white/[0.06] px-5 py-4">
                <h3 className="font-syne text-base font-bold text-white">Recent Certifications</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-widest text-secondary-foreground">
                      <th className="px-4 py-3 font-semibold">Staff</th>
                      <th className="px-3 py-3 font-semibold">Series</th>
                      <th className="px-3 py-3 font-semibold">Date</th>
                      <th className="px-3 py-3 font-semibold">SHA-256</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {RECENT_CERTS.map((row, i) => {
                      const badge = SERIES_BADGE[row.series];
                      return (
                        <tr key={`${row.staff}-${row.sha}-${i}`} className="text-secondary-foreground hover:bg-white/[0.02]">
                          <td className="max-w-[140px] truncate px-4 py-3 font-medium text-white">{row.staff}</td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                'inline-flex min-w-[2rem] items-center justify-center rounded-md px-2 py-0.5 text-[11px] font-bold',
                                badge.bg,
                                badge.text
                              )}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-xs">{row.date}</td>
                          <td className="px-3 py-3 font-mono text-[11px] text-[#FF6B00]/90">{truncateSha(row.sha)}</td>
                          <td className="px-4 py-3">
                            {row.status === 'Verified' ? (
                              <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400 ring-1 ring-emerald-500/30">
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#FF6B00]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#FF6B00] ring-1 ring-[#FF6B00]/35">
                                <CircleDot className="h-3 w-3" />
                                Recording
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* GCS Storage */}
            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#121926]/90 shadow-xl">
              <div className="border-b border-white/[0.06] px-5 py-4">
                <h3 className="font-syne text-base font-bold text-white">GCS Storage</h3>
              </div>
              <dl className="divide-y divide-white/[0.06] px-5 py-1">
                {GCS_ROWS.map((row) => (
                  <div key={row.label} className="flex flex-col gap-0.5 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <dt className="shrink-0 text-xs font-medium text-secondary-foreground">{row.label}</dt>
                    <dd
                      className={cn(
                        'text-right text-sm text-white sm:max-w-[65%] sm:truncate sm:text-right',
                        row.valueClass
                      )}
                      title={row.value}
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
