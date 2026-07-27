'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import {
  TrendingUp, Calculator, FileText, CreditCard, BarChart3,
  CheckCircle2, Clock, AlertCircle, ArrowRight, Loader2,
  IndianRupee, Sparkles, Building2,
} from 'lucide-react';

const MODULE_CARDS = [
  {
    href: '/finance/commercial/wage-config',
    icon: Building2,
    label: 'Wage Configuration',
    desc: 'Manage minimum wage templates by state, zone and category',
    color: 'from-violet-500/20 to-purple-600/20',
    border: 'border-violet-500/30',
    iconColor: 'text-violet-400',
  },
  {
    href: '/finance/commercial/calculator',
    icon: Calculator,
    label: 'Commercial Calculator',
    desc: 'Compute manpower costs, fees and margins dynamically',
    color: 'from-blue-500/20 to-cyan-600/20',
    border: 'border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  {
    href: '/finance/commercial/quotations',
    icon: FileText,
    label: 'Quotations',
    desc: 'Generate professional client quotation documents',
    color: 'from-emerald-500/20 to-teal-600/20',
    border: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  {
    href: '/finance/commercial/rate-cards',
    icon: CreditCard,
    label: 'Rate Cards',
    desc: 'Standard pricing cards for services by category',
    color: 'from-orange-500/20 to-amber-600/20',
    border: 'border-orange-500/30',
    iconColor: 'text-orange-400',
  },
  {
    href: '/finance/commercial/reports',
    icon: BarChart3,
    label: 'Reports',
    desc: 'Analytics and financial summaries for commercial data',
    color: 'from-pink-500/20 to-rose-600/20',
    border: 'border-pink-500/30',
    iconColor: 'text-pink-400',
  },
  {
    href: '/finance/commercial/approvals',
    icon: CheckCircle2,
    label: 'Approvals',
    desc: 'Review and approve calculation sheets in workflow stages',
    color: 'from-lime-500/20 to-green-600/20',
    border: 'border-lime-500/30',
    iconColor: 'text-lime-400',
  },
];

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-white/10 ${iconColor}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs text-white/50 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function CommercialDashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCommercialReports()
      .then((r: any) => setReports(r?.data ?? r))
      .catch(() => setReports(null))
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = reports?.revenue ?? reports?.totalRevenue ?? 0;
  const pendingApprovals = reports?.quotation_history?.length ?? reports?.pendingApprovals ?? 0;
  const totalCalculations = reports?.resources ?? reports?.totalCalculations ?? 0;
  const activeRateCards = reports?.upcoming_revisions?.length ?? reports?.activeRateCards ?? 0;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1a1f2e] to-[#0d1117] border-b border-white/10 px-8 py-10">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 right-20 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-start gap-5">
          <div className="p-4 bg-gradient-to-br from-violet-600/30 to-blue-600/30 rounded-2xl border border-white/10">
            <TrendingUp className="w-8 h-8 text-violet-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-semibold text-yellow-400 uppercase tracking-widest">Finance Module</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Commercial</h1>
            <p className="text-white/50 mt-1 text-sm max-w-xl">
              Dynamic manpower commercial management — replace Excel with live calculations,
              approvals and quotations.
            </p>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto space-y-8">
        {/* Stats */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-7 h-7 animate-spin text-violet-400" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={IndianRupee}
              label="Total Revenue"
              value={totalRevenue ? `₹${Number(totalRevenue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
              sub="From quotations"
              iconColor="text-emerald-400"
            />
            <StatCard
              icon={Calculator}
              label="Calculations"
              value={totalCalculations}
              sub="All time"
              iconColor="text-blue-400"
            />
            <StatCard
              icon={Clock}
              label="Pending Approvals"
              value={pendingApprovals}
              sub="Awaiting review"
              iconColor="text-yellow-400"
            />
            <StatCard
              icon={CreditCard}
              label="Active Rate Cards"
              value={activeRateCards}
              sub="Across categories"
              iconColor="text-violet-400"
            />
          </div>
        )}

        {/* Pending Approvals Alert */}
        {!loading && pendingApprovals > 0 && (
          <div
            onClick={() => router.push('/finance/commercial/approvals')}
            className="cursor-pointer flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-xl px-5 py-3 text-sm hover:bg-yellow-500/20 transition-colors"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>
              <strong>{pendingApprovals}</strong> calculation sheet{pendingApprovals !== 1 ? 's' : ''} pending approval — click to review
            </span>
            <ArrowRight className="w-4 h-4 ml-auto flex-shrink-0" />
          </div>
        )}

        {/* Module Navigation Cards */}
        <div>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-5">Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.href}
                  onClick={() => router.push(card.href)}
                  className={`group relative text-left p-6 rounded-2xl border bg-gradient-to-br ${card.color} ${card.border} hover:scale-[1.02] transition-all duration-200 overflow-hidden`}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/5 rounded-2xl" />
                  <div className={`inline-flex p-3 rounded-xl bg-white/10 mb-4 ${card.iconColor}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-1">{card.label}</h3>
                  <p className="text-xs text-white/50 leading-relaxed">{card.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-xs text-white/40 group-hover:text-white/70 transition-colors">
                    <span>Open module</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Approval Workflow */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-5">Approval Workflow</h2>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-0">
            {[
              { step: '1', label: 'Finance Executive', action: 'Creates calculation & submits', color: 'bg-blue-500' },
              { step: '2', label: 'Finance Manager', action: 'Reviews and approves or rejects', color: 'bg-violet-500' },
              { step: '3', label: 'Super Admin', action: 'Final approval — generates quotation', color: 'bg-emerald-500' },
            ].map((s, i) => (
              <React.Fragment key={s.step}>
                <div className="flex sm:flex-col items-start sm:items-center gap-3 sm:gap-2 flex-1">
                  <div className={`w-9 h-9 ${s.color} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {s.step}
                  </div>
                  <div className="sm:text-center">
                    <p className="text-sm font-semibold text-white">{s.label}</p>
                    <p className="text-xs text-white/40 mt-0.5">{s.action}</p>
                  </div>
                </div>
                {i < 2 && (
                  <div className="hidden sm:flex items-center px-2 text-white/20">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
