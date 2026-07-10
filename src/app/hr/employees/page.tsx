'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Spinner } from '@/components/ui/loading';
import { Users, Plus, FileText } from 'lucide-react';
import Link from 'next/link';

export default function HrEmployeesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['staff', 'hr'],
    queryFn: () => api.listStaff({ limit: 100 }),
  });

  // API returns { data: { items: [...], total: n } } — match the shape used by staff/pipeline
  const employees: any[] = Array.isArray(data)
    ? data
    : (data as any)?.data?.items ?? (data as any)?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="page-padding max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/10 p-2.5">
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Employees</h1>
            <p className="text-sm text-secondary-foreground">{employees.length} records found</p>
          </div>
        </div>
        <Link 
          href="/hr/employees/create"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Employee
        </Link>
      </div>

      {employees.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-background/40 p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-secondary-foreground/40 mb-3" />
          <p className="text-secondary-foreground text-sm">No employees found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-background/40 backdrop-blur-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Series</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp: any) => (
                <tr key={emp.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-secondary-foreground">{emp.staff_code ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-white">{emp.full_name ?? emp.name ?? '—'}</td>
                  <td className="px-4 py-3 text-secondary-foreground">{emp.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-secondary-foreground">{emp.series ?? '—'}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      const isInactive = 
                        emp.pipeline_stage === 'DEFERRED' || 
                        emp.pipeline_stage === 'TERMINAL' || 
                        emp.terminal_outcome != null;
                      
                      return (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          !isInactive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {!isInactive ? 'Active' : 'Inactive'}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link 
                      href={`/hr/employees/${emp.staff_code}/documents`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5 text-blue-400" />
                      Documents
                    </Link>
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
