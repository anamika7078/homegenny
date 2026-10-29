'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';

/** Pages that change what is stuck fire this so the bell catches up at once. */
export const ATTENTION_REFRESH_EVENT = 'finance-attention:refresh';

const rs = (n: number | string) => `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function Section({ title, tone = 'amber', children }: { title: string; tone?: 'amber' | 'rose' | 'emerald'; children: React.ReactNode }) {
  const color = tone === 'rose' ? 'text-rose-300' : tone === 'emerald' ? 'text-emerald-300' : 'text-amber-200';
  return (
    <div className="space-y-1 border-b border-white/5 px-4 py-3 last:border-0">
      <p className={cn('text-xs font-semibold', color)}>{title}</p>
      <div className="space-y-0.5 text-xs text-slate-300">{children}</div>
    </div>
  );
}

/**
 * What is stuck for Finance — drafts holding salary, held slips, rate reviews,
 * sent invoices to correct, arrears, disputes, unsigned muster rolls — behind
 * a bell in the top bar, with the count on it.
 */
export function AttentionBell() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [raising, setRaising] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const q = useQuery({
    queryKey: ['finance-attention'],
    queryFn: async () => {
      const res: any = await api.getFinanceAttention();
      return res?.data ?? res;
    },
    refetchInterval: 120_000,
    staleTime: 30_000,
  });
  const a = q.data;
  const counts: Record<string, number> = a?.counts ?? {};
  const total = Object.values(counts).reduce((s, n) => s + (Number(n) || 0), 0);

  useEffect(() => {
    const refresh = () => qc.invalidateQueries({ queryKey: ['finance-attention'] });
    window.addEventListener(ATTENTION_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(ATTENTION_REFRESH_EVENT, refresh);
  }, [qc]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  // Raises a rejected invoice again — same client, same days, at the rate the
  // RM has now corrected or confirmed. Lands as a DRAFT like any other.
  const reinvoice = async (x: any) => {
    setRaising(x.id);
    try {
      const res: any = await api.generateConsolidatedInvoice(x.client_id, x.period_month, x.period_year, x.period_to);
      const inv = res?.invoice ?? res?.data?.invoice;
      toast.success(`${inv?.invoice_number ?? 'Invoice'} raised as a draft — check it and approve`);
      qc.invalidateQueries({ queryKey: ['finance-attention'] });
      window.dispatchEvent(new Event('finance-invoices:refresh'));
    } catch (e: any) {
      toast.error(e.message ?? 'Could not raise the invoice');
    } finally {
      setRaising(null);
    }
  };

  const list = (k: string): any[] => (Array.isArray(a?.[k]) ? a[k] : []);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) q.refetch(); }}
        aria-label={total ? `${total} things need attention` : 'Notifications'}
        title="Needs attention"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-[#151c2c] text-secondary-foreground transition-colors hover:bg-white/10 hover:text-white"
      >
        <Bell className="h-4 w-4" />
        {total > 0 && (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#FF5A1F] px-1 text-center text-[10px] font-bold leading-[18px] text-white">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-4 right-4 top-14 z-50 sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-[440px] overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-bold text-white">Needs attention</p>
            <span className="text-[11px] text-slate-500">{q.isFetching ? 'Refreshing…' : total ? `${total} item(s)` : ''}</span>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {q.isLoading ? (
              <p className="px-4 py-6 text-center text-xs text-slate-500">Loading…</p>
            ) : !total ? (
              <p className="px-4 py-6 text-center text-xs text-slate-400">Nothing is stuck right now.</p>
            ) : (
              <>
                {list('ready_to_reinvoice').length > 0 && (
                  <Section title="Ready to re-invoice — the RM has corrected or confirmed the rate" tone="emerald">
                    {list('ready_to_reinvoice').map((x) => (
                      <div key={x.id} className="flex items-center justify-between gap-2 py-0.5">
                        <span className="min-w-0">
                          {x.invoice_number} · {x.customer_name}
                          <span className="block truncate text-amber-200/70">rejected: “{x.reject_reason}”</span>
                        </span>
                        <button
                          onClick={() => reinvoice(x)}
                          disabled={raising === x.id}
                          className="shrink-0 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                          {raising === x.id ? 'Raising…' : 'Re-invoice'}
                        </button>
                      </div>
                    ))}
                  </Section>
                )}
                {list('draft_invoices_waiting').length > 0 && (
                  <Section title={`Draft invoices holding salary (${counts.draft_invoices_waiting})`}>
                    {list('draft_invoices_waiting').map((x) => (
                      <p key={x.id}>{x.invoice_number} · {x.customer_name} · {x.days_waiting} days</p>
                    ))}
                    <Link href="/finance/invoices" onClick={() => setOpen(false)} className="text-[11px] text-[#FF5A1F] hover:underline">Open drafts →</Link>
                  </Section>
                )}
                {list('slips_held').length > 0 && (
                  <Section title={`Salary slips held (${counts.slips_held}) — Admin can release with a reason`}>
                    {list('slips_held').map((x) => (
                      <p key={x.payroll_id}>{x.staff_name} · {x.invoice_number ?? 'no invoice'} · {x.days_waiting} days</p>
                    ))}
                  </Section>
                )}
                {list('rate_reviews_open').length > 0 && (
                  <Section title={`Rate reviews with RMs (${counts.rate_reviews_open})`}>
                    {list('rate_reviews_open').map((x) => (
                      <p key={x.placement_id}>{x.staff_name} · {x.customer_name} · {x.rm_name ?? 'RM'} · {x.days_waiting} days</p>
                    ))}
                  </Section>
                )}
                {list('sent_invoices_needing_correction').length > 0 && (
                  <Section title="Sent, then the rate changed — open and correct">
                    {list('sent_invoices_needing_correction').map((x) => (
                      <p key={x.id}>{x.invoice_number} · {x.staff_name} · from {x.effective_from}</p>
                    ))}
                  </Section>
                )}
                {list('arrears_pending').length > 0 && (
                  <Section title="Arrears waiting for the next payroll">
                    {list('arrears_pending').map((x) => (
                      <p key={x.id}>{x.staff_name} · {rs(x.amount)} · {x.days_waiting} days</p>
                    ))}
                  </Section>
                )}
                {list('disputes_unresolved').length > 0 && (
                  <Section title="Disputed days the RM has not resolved (48 h+) — not billed or paid" tone="rose">
                    {list('disputes_unresolved').map((x) => (
                      <p key={x.id}>{x.date} · {x.staff_name} at {x.customer_name}{x.rm_name ? ` · RM ${x.rm_name}` : ''}</p>
                    ))}
                  </Section>
                )}
                {list('muster_rolls_unsigned').length > 0 && (
                  <Section title="Last month's muster roll not signed">
                    {list('muster_rolls_unsigned').map((x) => (
                      <p key={x.client_id}>{x.customer_name} · {x.period_month}/{x.period_year} · {x.days} day(s)</p>
                    ))}
                    <Link href="/finance/muster-rolls" onClick={() => setOpen(false)} className="text-[11px] text-[#FF5A1F] hover:underline">Open muster rolls →</Link>
                  </Section>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
