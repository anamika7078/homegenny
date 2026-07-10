'use client';

import { BarChart2 } from 'lucide-react';

const REPORT_TYPES = [
  { label: 'Headcount Report',      desc: 'Total employees per category and branch',   tone: 'text-blue-400',   bg: 'bg-blue-500/10' },
  { label: 'Attendance Summary',    desc: 'Monthly attendance rates and leave details', tone: 'text-green-400',  bg: 'bg-green-500/10' },
  { label: 'New Hires',             desc: 'Staff onboarded in the selected period',     tone: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { label: 'Attrition Report',      desc: 'Exited staff and termination reasons',       tone: 'text-red-400',    bg: 'bg-red-500/10' },
  { label: 'Compliance Report',     desc: 'Document verification and ESIC/PF status',  tone: 'text-purple-400', bg: 'bg-purple-500/10' },
];

export default function HrReportsPage() {
  return (
    <div className="page-padding max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-orange-500/10 p-2.5">
          <BarChart2 className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">HR Reports</h1>
          <p className="text-sm text-secondary-foreground">Workforce analytics and compliance reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_TYPES.map(({ label, desc, tone, bg }) => (
          <button
            key={label}
            className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-background/40 p-5 text-left backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:border-white/20 hover:shadow-lg cursor-not-allowed opacity-70"
            title="Coming soon"
            disabled
          >
            <div className={`rounded-xl p-2.5 w-fit ${bg}`}>
              <BarChart2 className={`h-5 w-5 ${tone}`} />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{label}</p>
              <p className="mt-1 text-xs text-secondary-foreground">{desc}</p>
            </div>
            <span className="self-start rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground uppercase tracking-wider">
              Coming Soon
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-background/40 p-6 backdrop-blur-xl">
        <p className="text-sm text-secondary-foreground">
          HR reports are under development. Contact your system administrator for manual report exports.
        </p>
      </div>
    </div>
  );
}
