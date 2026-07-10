'use client';

import { FileText } from 'lucide-react';

const CATEGORIES = [
  { code: 'DR',  label: 'Driver',              count: '—', color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  { code: 'SC',  label: 'Security Guard',      count: '—', color: 'text-green-400',  bg: 'bg-green-500/10' },
  { code: 'UC',  label: 'Unskilled Worker',    count: '—', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { code: 'HK',  label: 'Housekeeping',        count: '—', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { code: 'CE',  label: 'Civil Engineering',   count: '—', color: 'text-orange-400', bg: 'bg-orange-500/10' },
];

export default function HrCategoriesPage() {
  return (
    <div className="page-padding max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-yellow-500/10 p-2.5">
          <FileText className="h-5 w-5 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Job Categories</h1>
          <p className="text-sm text-secondary-foreground">Staff series and category breakdown</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map(({ code, label, count, color, bg }) => (
          <div
            key={code}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-background/40 p-5 backdrop-blur-xl"
          >
            <div className={`rounded-xl p-3 ${bg}`}>
              <FileText className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-secondary-foreground/60">{code}</p>
              <p className="text-base font-semibold text-white">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{count}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-background/40 p-6 backdrop-blur-xl">
        <p className="text-sm text-secondary-foreground">
          Categories are defined by the system series codes. Contact an Admin to add or modify categories.
        </p>
      </div>
    </div>
  );
}
