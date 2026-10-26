'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { Loader2, Building2, CheckCircle2, AlertTriangle, Save } from 'lucide-react';

/**
 * HomeGenny's own GSTIN, state, SAC, GST rate and bank details.
 *
 * Every invoice reads these. Until a valid GSTIN, state and SAC are on file
 * the invoice is a Bill of Supply with no GST — correct for an unregistered
 * supplier, but the dev server was issuing them only because there was no
 * screen to fill these in.
 */

type Form = {
  legal_name: string; gstin: string; state: string; sac_code: string;
  address: string; pan: string; gst_rate_pct: string;
  bank_name: string; bank_account: string; bank_ifsc: string; bank_branch: string;
};

const EMPTY: Form = {
  legal_name: '', gstin: '', state: '', sac_code: '', address: '', pan: '',
  gst_rate_pct: '18', bank_name: '', bank_account: '', bank_ifsc: '', bank_branch: '',
};

export default function CompanySettingsPage() {
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const fill = (d: any) => {
    setData(d);
    setForm({
      legal_name: d?.legal_name ?? '', gstin: d?.gstin ?? '', state: d?.state ?? '',
      sac_code: d?.sac_code ?? '', address: d?.address ?? '', pan: d?.pan ?? '',
      gst_rate_pct: String(d?.gst_rate_pct ?? 18),
      bank_name: d?.bank_name ?? '', bank_account: d?.bank_account ?? '',
      bank_ifsc: d?.bank_ifsc ?? '', bank_branch: d?.bank_branch ?? '',
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await api.getCompanySettings();
      fill(res?.data ?? res);
    } catch (e: any) {
      showToast('error', e.message ?? 'Could not load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // The GSTIN's first two digits are the state it is registered in, so the
  // state follows it rather than being picked separately and disagreeing.
  const onGstin = (v: string) => {
    const gstin = v.toUpperCase().replace(/\s/g, '');
    const code = gstin.slice(0, 2);
    const match = (data?.states ?? []).find((s: any) => s.code === code);
    setForm((f) => ({ ...f, gstin, state: gstin.length >= 2 && match ? match.name : f.state }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res: any = await api.updateCompanySettings({ ...form, gst_rate_pct: Number(form.gst_rate_pct) });
      const d = res?.data ?? res;
      fill(d);
      showToast(
        'success',
        d?.ready_for_tax_invoice
          ? 'Saved. New invoices will be Tax Invoices with GST.'
          : `Saved. Still needed for a Tax Invoice: ${(d?.missing ?? []).join(', ')}`,
      );
    } catch (e: any) {
      showToast('error', e.message ?? 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50';
  const label = 'block text-xs text-slate-400 mb-1';

  const field = (key: keyof Form, text: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className={label} htmlFor={`cs-${key}`}>{text}</label>
      <input
        id={`cs-${key}`}
        className={input}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        {...props}
      />
    </div>
  );

  return (
    <div className="page-padding space-y-6 max-w-3xl">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium border max-w-md
          ${toast.type === 'success' ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300' : 'bg-red-950 border-red-500/30 text-red-300'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Building2 className="w-6 h-6 text-indigo-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Company &amp; GST</h1>
          <p className="text-sm text-slate-400">Printed on every invoice. Decides whether an invoice carries GST.</p>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : data && (
        <>
          {data.ready_for_tax_invoice ? (
            <div className="flex gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-sm text-emerald-300">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                Invoices raised now are <strong>Tax Invoices</strong> with {data.gst_rate_pct}% GST —
                CGST + SGST when the client is in {data.state}, IGST otherwise.
              </div>
            </div>
          ) : (
            <div className="flex gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-sm text-amber-300">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                Invoices are being issued as <strong>Bills of Supply with no GST</strong>.
                Still needed: {data.missing.join(', ')}.
              </div>
            </div>
          )}

          {data.ready_for_tax_invoice && data.unsent_bills_of_supply > 0 && (
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-300">
              {data.unsent_bills_of_supply} unsent invoice{data.unsent_bills_of_supply > 1 ? 's were' : ' was'} raised
              as a Bill of Supply before these details were filled in. Open each on the{' '}
              <Link href="/finance/invoices" className="text-indigo-400 underline">Invoices</Link> page and press
              <strong> Recalculate with GST</strong> — it keeps the same invoice number.
            </div>
          )}

          <section className="space-y-4 p-5 rounded-xl border border-white/10 bg-white/[0.02]">
            <h2 className="text-sm font-semibold text-white">Registration</h2>
            {field('legal_name', 'Legal name (as on GST certificate)')}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={label} htmlFor="cs-gstin">GSTIN</label>
                <input id="cs-gstin" className={input} value={form.gstin} maxLength={15}
                  placeholder="e.g. 05ABCDE1234F1Z5" onChange={(e) => onGstin(e.target.value)} />
              </div>
              <div>
                <label className={label} htmlFor="cs-state">State of registration</label>
                <select id="cs-state" className={input} value={form.state}
                  onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}>
                  <option value="">— Select —</option>
                  {(data.states ?? []).map((s: any) => (
                    <option key={s.code} value={s.name}>{s.code} · {s.name}</option>
                  ))}
                </select>
              </div>
              {field('sac_code', 'SAC code', { placeholder: '6 digits, starts with 99', maxLength: 6 })}
              <div>
                <label className={label} htmlFor="cs-rate">GST rate</label>
                <select id="cs-rate" className={input} value={form.gst_rate_pct}
                  onChange={(e) => setForm((f) => ({ ...f, gst_rate_pct: e.target.value }))}>
                  {(data.allowed_gst_rates ?? [18]).map((r: number) => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
              {field('pan', 'PAN', { maxLength: 10 })}
            </div>
            {field('address', 'Registered address')}
          </section>

          <section className="space-y-4 p-5 rounded-xl border border-white/10 bg-white/[0.02]">
            <h2 className="text-sm font-semibold text-white">Bank details (printed for payment)</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {field('bank_name', 'Bank name')}
              {field('bank_branch', 'Branch')}
              {field('bank_account', 'Account number')}
              {field('bank_ifsc', 'IFSC', { maxLength: 11 })}
            </div>
          </section>

          <button
            id="btn-save-company-settings"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </>
      )}
    </div>
  );
}
