'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Spinner } from '@/components/ui/loading';
import { FileText } from 'lucide-react';
import { unwrapItems } from '@/lib/hr/utils';

const COLORS = [
  { color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { color: 'text-green-400', bg: 'bg-green-500/10' },
  { color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { color: 'text-pink-400', bg: 'bg-pink-500/10' },
];

export default function HrCategoriesPage() {
  const { data: categoriesRaw, isLoading: catLoading } = useQuery({
    queryKey: ['categories', 'hr'],
    queryFn: () => api.listCategories(),
  });

  const { data: employeesRaw, isLoading: empLoading } = useQuery({
    queryKey: ['employees', 'hr'],
    queryFn: () => api.listEmployees({ limit: 500 }),
  });

  const categories = unwrapItems(categoriesRaw);
  const employees = unwrapItems(employeesRaw);

  const countByCategory = employees.reduce<Record<string, number>>((acc, emp: any) => {
    const name = emp.category?.name ?? 'Uncategorized';
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});

  if (catLoading || empLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="page-padding max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-yellow-500/10 p-2.5">
          <FileText className="h-5 w-5 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Job Categories</h1>
          <p className="text-sm text-secondary-foreground">Employee categories and headcount</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat: any, index: number) => {
          const palette = COLORS[index % COLORS.length];
          const count = countByCategory[cat.name] ?? 0;
          return (
            <div
              key={cat.id}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-background/40 p-5 backdrop-blur-xl"
            >
              <div className={`rounded-xl p-3 ${palette.bg}`}>
                <FileText className={`h-5 w-5 ${palette.color}`} />
              </div>
              <div>
                <p className="text-base font-semibold text-white">{cat.name}</p>
                <p className={`text-2xl font-black ${palette.color}`}>{count}</p>
                <p className="text-xs text-secondary-foreground">employees</p>
              </div>
            </div>
          );
        })}
      </div>

      {categories.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-background/40 p-6 text-center text-secondary-foreground">
          No categories found.
        </div>
      )}
    </div>
  );
}
