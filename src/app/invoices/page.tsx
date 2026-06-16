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
    queryFn: () => api.getPlacements({ limit: 200 }),
    refetchInterval: 60000,
  });

  const placements: any[] = (data as any)?.data?.items || [];

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <PageHeader title="Invoices" subtitle="Client billing and payment tracking" />
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {isLoading ? <div className="p-4"><TableSkeleton rows={6} /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/60">
                  <tr>
                    {['Invoice No','Period','Amount','Status','Due Date','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {placements.slice(0, 20).map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono text-xs text-brand-400">INV-{p.id?.slice(0,8)}</td>
                      <td className="px-4 py-3 text-xs text-slate-300">Current Month</td>
                      <td className="px-4 py-3 text-xs text-slate-300">{fCurrency(p.staff_salary)}</td>
                      <td className="px-4 py-3"><Badge variant="yellow">PENDING</Badge></td>
                      <td className="px-4 py-3 text-xs text-slate-400">{fDate(p.billing_start_date)}</td>
                      <td className="px-4 py-3">
                        <button className="text-xs text-brand-400 hover:text-brand-300">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {placements.length === 0 && (
                <div className="text-center py-12 text-slate-500">No invoices yet</div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}