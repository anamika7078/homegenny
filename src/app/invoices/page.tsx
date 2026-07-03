'use client';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/app-shell';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/loading';
import { fDate, fCurrency } from '@/lib/utils/format';
import { api } from '@/lib/api/client';

export default function InvoicesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.getFinanceInvoices({ page: 1 }),
    refetchInterval: 60000,
  });

  const payload = (data as any)?.data ?? data;
  const invoices: any[] = Array.isArray(payload) ? payload : payload?.data ?? [];

  return (
    <AppShell>
      <div className="page-padding space-y-6">
        <PageHeader title="Invoices" subtitle="Client billing and payment tracking" />
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {isLoading ? <div className="p-4"><TableSkeleton rows={6} /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/60">
                  <tr>
                    {['Invoice No','Period','Amount','Status','Due Date','Client'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {invoices.slice(0, 20).map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono text-xs text-brand-400">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {inv.period_month}/{inv.period_year}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">{fCurrency(inv.total_amount)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={inv.status === 'PAID' ? 'green' : 'yellow'}>{inv.status ?? 'PENDING'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{fDate(inv.due_date)}</td>
                      <td className="px-4 py-3 text-xs text-slate-300">{inv.client_name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {invoices.length === 0 && (
                <div className="text-center py-12 text-slate-500">No invoices yet</div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
