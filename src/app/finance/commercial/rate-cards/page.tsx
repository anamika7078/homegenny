'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, CreditCard, Search, MapPin, Calendar, Layers,
} from 'lucide-react';

function fmt(n: number | string) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n));
}
function fmtRs(n: number | string) { return `₹${fmt(n)}`; }

export default function RateCardsPage() {
  const [search, setSearch] = useState('');
  const [rateCards, setRateCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.listRateCards(search || undefined);
      const resData = (res as any)?.data ?? res;
      setRateCards(Array.isArray(resData) ? resData : []);
    } catch (err: any) {
      showToast('error', err.message ?? 'Failed to load rate cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search]);

  return (
    <div className="page-padding space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium border
          ${toast.type === 'success' ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300' : 'bg-red-950 border-red-500/30 text-red-300'}`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="text-orange-500 w-7 h-7" />
            Rate Cards
          </h1>
          <p className="text-sm text-slate-400">View customer-wise and category-wise active commercial billing rates.</p>
        </div>
      </div>

      {/* Filter and search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, unit code, category..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Cards / Table view */}
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-slate-900/50 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                <th className="py-4 px-6">Customer / Unit Code</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6 text-right">Monthly rate</th>
                <th className="py-4 px-6 text-right">Daily rate</th>
                <th className="py-4 px-6 text-right">Hourly rate</th>
                <th className="py-4 px-6">Effective Date</th>
                <th className="py-4 px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {loading && rateCards.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
                    Loading rate cards...
                  </td>
                </tr>
              ) : rateCards.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No active rate cards found. Run calculations and approve them to generate rate cards.
                  </td>
                </tr>
              ) : (
                rateCards.map((rc) => (
                  <tr key={rc.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-white font-semibold">{rc.customer_name}</span>
                        <span className="text-[10px] text-slate-400">Unit: {rc.unit_code}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-white">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        {rc.category}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-semibold text-emerald-400">
                      {fmtRs(rc.monthly_rate)}
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-white">
                      {fmtRs(rc.daily_rate)}
                    </td>
                    <td className="py-4 px-6 text-right text-slate-300">
                      {fmtRs(rc.hourly_rate)}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(rc.effective_date).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border
                        ${rc.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-slate-400 bg-slate-400/10 border-slate-400/20'}`}
                      >
                        {rc.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
