'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, ShieldCheck, AlertTriangle, RefreshCw, Calculator, MapPin, CheckCircle2, Scale,
} from 'lucide-react';

function fmtRs(n: number | string) {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n ?? 0))}`;
}

/**
 * Professional tax and TDS rules.
 *
 * PT was a flat ₹200 above ₹15,000 for everyone — but it is levied by the
 * state, and **Delhi and Haryana do not levy it at all**, which is where
 * almost every HomeGenny employee works. TDS was a flat 5% above ₹50,000,
 * which over-deducts from anyone inside the rebate. Both now come from these
 * tables. See F-16.
 */
export default function TaxRulesPage() {
  const [pt, setPt] = useState<any>(null);
  const [it, setIt] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [pfBase, setPfBase] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Calculator
  const [calcState, setCalcState] = useState('Delhi');
  const [calcGross, setCalcGross] = useState('40000');
  const [calcMonth, setCalcMonth] = useState('6');
  const [calcResult, setCalcResult] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [a, b, c, d] = await Promise.all([
        api.getProfessionalTaxRules(), api.getIncomeTaxSlabs(), api.getTaxStatus(), api.getPfBaseImpact(),
      ]);
      setPt(a?.data ?? a); setIt(b?.data ?? b); setStatus(c?.data ?? c); setPfBase(d?.data ?? d);
    } catch (e: any) {
      showToast('error', e.message ?? 'Could not load tax rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const confirm = async () => {
    if (!window.confirm(
      'Confirm that these rates have been checked against the current Budget and the relevant ' +
      'state notifications? Payroll will stop flagging them as unverified.',
    )) return;
    setConfirming(true);
    try {
      await api.confirmTaxRates();
      showToast('success', 'Tax rates marked as confirmed');
      load();
    } catch (e: any) {
      showToast('error', e.message ?? 'Could not confirm');
    } finally {
      setConfirming(false);
    }
  };

  const runCalc = async () => {
    setCalculating(true);
    try {
      const res = await api.previewTax({
        state: calcState, monthly_gross: Number(calcGross),
        month: Number(calcMonth), year: new Date().getFullYear(),
      });
      setCalcResult(res?.data ?? res);
    } catch (e: any) {
      showToast('error', e.message ?? 'Could not calculate');
    } finally {
      setCalculating(false);
    }
  };

  if (loading && !pt) {
    return (
      <div className="page-padding flex justify-center items-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="page-padding space-y-6">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium border max-w-md
          ${toast.type === 'success'
            ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300'
            : 'bg-red-950 border-red-500/30 text-red-300'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tax Rules</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Professional tax by state · income-tax slabs used for TDS
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Nobody should mistake a seeded default for a verified figure. */}
      {status && !status.confirmed && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-300">These rates have not been verified</p>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Everything below was seeded as a starting point. Slabs move with every Budget and
              state notification, so check them with your CA before they drive a real payroll.
              Payroll still runs meanwhile — each figure is flagged as unconfirmed.
            </p>
          </div>
          <button
            id="btn-confirm-tax-rates"
            onClick={confirm}
            disabled={confirming}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition disabled:opacity-50 shrink-0"
          >
            {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark as verified'}
          </button>
        </div>
      )}
      {status?.confirmed && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-3 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <p className="text-sm text-emerald-300">Tax rates have been verified by Finance.</p>
        </div>
      )}

      {/* Professional tax */}
      <div className="rounded-2xl border border-white/8 bg-[#131c2e] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-white">Professional Tax by State</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(pt?.states ?? []).map((s: any) => (
              <div key={s.state} className={`rounded-xl border px-4 py-3 ${
                s.levies_pt ? 'border-white/10 bg-white/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">{s.state}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                    s.levies_pt
                      ? 'text-amber-400 bg-amber-400/10 border-amber-400/25'
                      : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25'}`}>
                    {s.levies_pt ? 'Levies PT' : 'No PT'}
                  </span>
                </div>
                {s.notes && <p className="text-[11px] text-slate-400 mt-1.5">{s.notes}</p>}
              </div>
            ))}
          </div>

          {(pt?.slabs ?? []).length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left">State</th>
                    <th className="px-4 py-2.5 text-left">Applies to</th>
                    <th className="px-4 py-2.5 text-right">Monthly gross</th>
                    <th className="px-4 py-2.5 text-right">PT / month</th>
                    <th className="px-4 py-2.5 text-right">Last FY month</th>
                  </tr>
                </thead>
                <tbody>
                  {(pt?.slabs ?? []).map((s: any) => (
                    <tr key={s.id} className="border-b border-white/5">
                      <td className="px-4 py-2.5 text-white">{s.state}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">
                        {s.applies_to_gender ? s.applies_to_gender.toLowerCase() : 'everyone'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-300 tabular-nums">
                        {fmtRs(s.min_monthly_gross)} – {s.max_monthly_gross ? fmtRs(s.max_monthly_gross) : 'above'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-white tabular-nums">{fmtRs(s.monthly_amount)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-400 tabular-nums">
                        {s.february_amount ? fmtRs(s.february_amount) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-slate-500">
            A state with no rule here deducts nothing and is reported as unknown — which is not the
            same as a state that levies nothing.
          </p>
        </div>
      </div>

      {/* PF base — F-20 */}
      {pfBase && (
        <div className="rounded-2xl border border-white/8 bg-[#131c2e] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">Provident Fund base</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded bg-blue-400/10 border border-blue-400/25 text-blue-300">
              {pfBase.current_rule}
            </span>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-400 max-w-3xl">
              Three different PF bases were in use at once: the client was quoted PF on the agreed
              base, the enterprise batch deducted on basic, and the EOR payroll deducted on gross.
              PF now follows one rule — the base actually agreed, with the whole wage used where no
              breakdown exists.
            </p>

            <div className="grid gap-3 sm:grid-cols-4">
              {([
                ['Placements checked', String(pfBase.placements_checked ?? 0), '#64748b'],
                ['With an agreed base', String(pfBase.placements_with_agreed_base ?? 0), '#3b82f6'],
                ['Would deduct differently', String(pfBase.placements_that_differ ?? 0),
                  (pfBase.placements_that_differ ?? 0) > 0 ? '#f59e0b' : '#10b981'],
                ['PF ceiling', fmtRs(pfBase.pf_ceiling ?? 15000), '#64748b'],
              ] as [string, string, string][]).map(([label, value, color]) => (
                <div key={label} className="rounded-xl border border-white/8 bg-white/5 p-4">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className="text-xl font-bold mt-1 tabular-nums" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Identical figures are not the same as missing data — say which. */}
            <p className="text-xs text-slate-400 bg-white/5 border border-white/8 rounded-xl px-4 py-3">
              {pfBase.note}
            </p>

            {(pfBase.detail ?? []).length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-2.5 text-left">Staff</th>
                      <th className="px-4 py-2.5 text-right">Gross</th>
                      <th className="px-4 py-2.5 text-right">Agreed base</th>
                      <th className="px-4 py-2.5 text-right">PF on gross</th>
                      <th className="px-4 py-2.5 text-right">PF on agreed base</th>
                      <th className="px-4 py-2.5 text-right">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pfBase.detail ?? []).map((d: any) => (
                      <tr key={d.staff_code} className="border-b border-white/5">
                        <td className="px-4 py-2.5 text-white">
                          {d.full_name}
                          <span className="block text-[11px] text-slate-500">{d.staff_code}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-300 tabular-nums">{fmtRs(d.gross)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-300 tabular-nums">{d.agreed_base != null ? fmtRs(d.agreed_base) : '—'}</td>
                        <td className="px-4 py-2.5 text-right text-slate-400 tabular-nums">{fmtRs(d.pf_on_gross)}</td>
                        <td className="px-4 py-2.5 text-right text-white tabular-nums">{fmtRs(d.pf_on_agreed_base)}</td>
                        <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${d.delta_per_side < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {d.delta_per_side > 0 ? '+' : ''}{fmtRs(d.delta_per_side)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(pfBase.placements_that_differ ?? 0) > 0 && (
              <p className="text-xs text-amber-400/90">
                Employer PF matches employee PF, so the company&apos;s monthly change is
                {" "}{fmtRs(pfBase.monthly_delta_total_both_sides ?? 0)}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Income tax */}
      <div className="rounded-2xl border border-white/8 bg-[#131c2e] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-white">
            Income-tax slabs — FY {it?.financial_year}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-white/5 text-[11px] text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-2.5 text-left">Regime</th>
                <th className="px-4 py-2.5 text-right">Annual income</th>
                <th className="px-4 py-2.5 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {(it?.slabs ?? []).map((s: any) => (
                <tr key={s.id} className="border-b border-white/5">
                  <td className="px-5 py-2.5 text-slate-300">{s.regime}</td>
                  <td className="px-4 py-2.5 text-right text-slate-300 tabular-nums">
                    {fmtRs(s.min_annual)} – {s.max_annual ? fmtRs(s.max_annual) : 'above'}
                  </td>
                  <td className="px-4 py-2.5 text-right text-white tabular-nums">{s.rate_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-3 text-xs text-slate-500 border-t border-white/5">
          TDS is projected across the financial year and spread over the remaining months, after the
          standard deduction and the 87A rebate — not taken as a flat share of one month's pay.
        </p>
      </div>

      {/* Calculator */}
      <div className="rounded-2xl border border-white/8 bg-[#131c2e] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Check a figure</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">State</label>
              <input
                id="input-tax-state"
                value={calcState}
                onChange={(e) => setCalcState(e.target.value)}
                className="w-full bg-[#0f172a] border border-white/10 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Monthly gross</label>
              <input
                id="input-tax-gross"
                type="number"
                value={calcGross}
                onChange={(e) => setCalcGross(e.target.value)}
                className="w-full bg-[#0f172a] border border-white/10 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Month (1–12)</label>
              <input
                id="input-tax-month"
                type="number" min="1" max="12"
                value={calcMonth}
                onChange={(e) => setCalcMonth(e.target.value)}
                className="w-full bg-[#0f172a] border border-white/10 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-end">
              <button
                id="btn-run-tax-calc"
                onClick={runCalc}
                disabled={calculating}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 transition"
              >
                {calculating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Calculate'}
              </button>
            </div>
          </div>

          {calcResult && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Professional tax</p>
                <p className="text-2xl font-bold text-white mt-1 tabular-nums">
                  {fmtRs(calcResult.professional_tax?.amount)}
                </p>
                <p className="text-xs text-slate-400 mt-1.5">{calcResult.professional_tax?.reason}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider">TDS this month</p>
                <p className="text-2xl font-bold text-white mt-1 tabular-nums">
                  {fmtRs(calcResult.tds?.monthlyAmount)}
                </p>
                <p className="text-xs text-slate-400 mt-1.5">{calcResult.tds?.reason}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
