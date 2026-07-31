'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, Plus, Search, Users, X, CheckCircle2,
  Building2, CreditCard, FileText, Hash, RefreshCw,
  ChevronRight, Shield, Trash2, MapPin, Layers, ExternalLink,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface CustomerBranch {
  id?: string;
  unit_code: string;
  unit_name: string;
  address?: string;
  state?: string;
  city?: string;
  pincode?: string;
  gstn?: string;
  status?: string;
}

export interface FinanceCustomer {
  id: string;
  customer_name: string;
  address: string;
  pan_card: string;
  gstn: string | null;
  bill_no_prefix: string;
  bill_seq: number;
  unit_code: string;
  unit_name: string;
  status: string;
  branches?: CustomerBranch[];
  created_at: string;
}

// ── Bill number preview util ──────────────────────────────────────────────────
function previewBillNo(seq = 1): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `BILL/${y}${m}/${String(seq).padStart(4, '0')}`;
}

function deriveUnitCode(name: string, suffixIndex = 1): string {
  if (!name.trim()) return '';
  const clean = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const words = name.trim().toUpperCase().split(/\s+/).filter(Boolean);

  let base = '';
  if (words.length >= 3) {
    base = words.map((w) => w[0]).join('').slice(0, 5);
  }
  if (base.length < 3) {
    base = clean.slice(0, 5);
  }
  if (!base) base = 'UNIT';

  return `${base}-${String(suffixIndex).padStart(2, '0')}`;
}

function deriveUnitName(name: string, index = 1): string {
  if (!name.trim()) return '';
  return `${name.trim().toUpperCase()} UNIT ${index}`;
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'ACTIVE'
      ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
      : 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${cls}`}>
      {status}
    </span>
  );
}

// ── Add Branch Modal (for existing customer) ──────────────────────────────────
function AddBranchModal({
  customer,
  open,
  onClose,
  onBranchAdded,
}: {
  customer: FinanceCustomer;
  open: boolean;
  onClose: () => void;
  onBranchAdded: (updatedCust: FinanceCustomer) => void;
}) {
  const nextIdx = (customer.branches?.length || 0) + 1;
  const [form, setForm] = useState<CustomerBranch>({
    unit_name: deriveUnitName(customer.customer_name, nextIdx),
    unit_code: deriveUnitCode(customer.customer_name, nextIdx),
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstn: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.unit_name.trim()) { setError('Unit Name is required'); return; }
    if (!form.unit_code.trim()) { setError('Unit Code is required'); return; }

    setSaving(true);
    try {
      const res = await api.addCustomerBranch(customer.id, {
        unit_name: form.unit_name.trim(),
        unit_code: form.unit_code.toUpperCase().trim(),
        address: form.address?.trim() || customer.address,
        city: form.city?.trim() || undefined,
        state: form.state?.trim() || undefined,
        pincode: form.pincode?.trim() || undefined,
        gstn: form.gstn?.trim() || undefined,
      });
      const updated = (res as any).data ?? res;
      onBranchAdded(updated);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to add branch');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[560px] bg-[#0b1120] border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 bg-gradient-to-r from-[#0b1120] to-[#111e38]">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            Add New Branch to {customer.customer_name}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Unit / Branch Name <span className="text-red-400">*</span>
              </label>
              <input
                name="unit_name"
                value={form.unit_name}
                onChange={handleChange}
                placeholder="e.g. Noida Sec 62 Branch"
                className="w-full rounded-xl border border-white/10 bg-[#0E1320] px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Unique Unit Code <span className="text-slate-500 font-normal lowercase">(Auto-generated)</span>
              </label>
              <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5 text-sm text-emerald-300 uppercase font-mono font-bold flex items-center justify-between">
                <span>{form.unit_code}</span>
                <span className="text-xs text-emerald-400/60 font-sans font-normal flex items-center gap-1">🔒 Locked</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Branch Address Line / Street
            </label>
            <input
              name="address"
              value={form.address || ''}
              onChange={handleChange}
              placeholder="e.g. Plot B-12, Sector 62 Industrial Area"
              className="w-full rounded-xl border border-white/10 bg-[#0E1320] px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                City
              </label>
              <input
                name="city"
                value={form.city || ''}
                onChange={handleChange}
                placeholder="e.g. Noida"
                className="w-full rounded-lg border border-white/10 bg-[#0E1320] px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                State
              </label>
              <input
                name="state"
                value={form.state || ''}
                onChange={handleChange}
                placeholder="e.g. Uttar Pradesh"
                className="w-full rounded-lg border border-white/10 bg-[#0E1320] px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Pincode
              </label>
              <input
                name="pincode"
                value={form.pincode || ''}
                onChange={handleChange}
                placeholder="e.g. 201301"
                className="w-full rounded-lg border border-white/10 bg-[#0E1320] px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Branch GSTN <span className="text-slate-500 normal-case font-normal">(Optional)</span>
            </label>
            <input
              name="gstn"
              value={form.gstn || ''}
              onChange={handleChange}
              placeholder="e.g. 09ABCDE1234F1Z5"
              className="w-full rounded-xl border border-white/10 bg-[#0E1320] px-3.5 py-2 text-sm text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-white/8">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-white hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {saving ? 'Adding…' : 'Add Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create Customer Drawer (Multi-Branch Support) ─────────────────────────────
interface CreateDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreated: (c: FinanceCustomer) => void;
}

function CreateCustomerDrawer({ open, onClose, onCreated }: CreateDrawerProps) {
  const [form, setForm] = useState({
    customer_name: '',
    address: '',
    pan_card: '',
    gstn: '',
  });

  const [branches, setBranches] = useState<CustomerBranch[]>([
    { unit_name: '', unit_code: '', address: '', state: '', city: '', pincode: '', gstn: '' },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<FinanceCustomer | null>(null);

  useEffect(() => {
    if (!form.customer_name.trim()) {
      setBranches((prev) =>
        prev.map((b) => ({ ...b, unit_code: '', unit_name: '' })),
      );
      return;
    }
    setBranches((prev) =>
      prev.map((b, idx) => ({
        ...b,
        unit_code: deriveUnitCode(form.customer_name, idx + 1),
        unit_name: deriveUnitName(form.customer_name, idx + 1),
      })),
    );
  }, [form.customer_name]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  }

  function handleBranchChange(index: number, field: keyof CustomerBranch, val: string) {
    setBranches((prev) =>
      prev.map((b, idx) => (idx === index ? { ...b, [field]: val } : b)),
    );
    setError('');
  }

  function addBranchRow() {
    const nextIdx = branches.length + 1;
    const autoCode = deriveUnitCode(form.customer_name, nextIdx);
    const autoName = deriveUnitName(form.customer_name, nextIdx);
    setBranches((prev) => [
      ...prev,
      { unit_name: autoName, unit_code: autoCode, address: '', state: '', city: '', pincode: '', gstn: '' },
    ]);
  }

  function removeBranchRow(index: number) {
    if (branches.length <= 1) return;
    setBranches((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name.trim()) { setError('Customer name is required'); return; }
    if (!form.address.trim())       { setError('Address is required'); return; }
    if (!form.pan_card.trim())      { setError('PAN Card is required'); return; }

    const panRe = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRe.test(form.pan_card.toUpperCase())) {
      setError('Invalid PAN format — must be like ABCDE1234F');
      return;
    }

    for (let i = 0; i < branches.length; i++) {
      const b = branches[i];
      if (!b.unit_name.trim()) {
        setError(`Branch #${i + 1} Unit Name is required`);
        return;
      }
      if (!b.unit_code.trim()) {
        setError(`Branch #${i + 1} Unit Code is required`);
        return;
      }
    }

    const codes = branches.map((b) => b.unit_code.trim().toUpperCase());
    const uniqueCodes = new Set(codes);
    if (uniqueCodes.size !== codes.length) {
      setError('Each branch must have a unique Unit Code');
      return;
    }

    setSaving(true);
    try {
      const res = await api.createFinanceCustomer({
        customer_name: form.customer_name.trim(),
        address: form.address.trim(),
        pan_card: form.pan_card.toUpperCase().trim(),
        gstn: form.gstn.trim() || undefined,
        branches: branches.map((b) => ({
          unit_code: b.unit_code.toUpperCase().trim(),
          unit_name: b.unit_name.trim(),
          address: b.address?.trim() || form.address.trim(),
          state: b.state?.trim() || undefined,
          city: b.city?.trim() || undefined,
          pincode: b.pincode?.trim() || undefined,
          gstn: b.gstn?.trim() || form.gstn.trim() || undefined,
        })),
      });
      const customer = (res as any).data ?? res;
      setSuccess(customer);
      onCreated(customer);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setForm({ customer_name: '', address: '', pan_card: '', gstn: '' });
    setBranches([{ unit_name: '', unit_code: '', address: '', state: '', city: '', pincode: '', gstn: '' }]);
    setError('');
    setSuccess(null);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-[760px] bg-[#0b1120] border border-white/10 rounded-2xl flex flex-col shadow-2xl max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 bg-gradient-to-r from-[#0b1120] to-[#111e38] flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              Create Customer & Branches
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Finance module · Structured address & unique Unit Codes</p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/8 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 py-10 overflow-y-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white mb-1">Customer Created Successfully!</p>
              <p className="text-sm text-slate-400">Customer master and all branch address records are saved.</p>
            </div>

            <div className="w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
              <p className="text-[10px] font-semibold text-emerald-300 uppercase tracking-widest mb-1">
                Branches Created ({success.branches?.length || 1})
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(success.branches && success.branches.length > 0
                  ? success.branches
                  : [{ unit_code: success.unit_code, unit_name: success.unit_name }]
                ).map((b, idx) => (
                  <div key={idx} className="bg-slate-900/60 p-3 rounded-xl border border-white/5 text-xs flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {b.unit_code}
                      </span>
                      <span className="text-slate-300 font-semibold">{b.unit_name}</span>
                    </div>
                    {(b.address || b.city || b.state) && (
                      <p className="text-[11px] text-slate-400 truncate">
                        {[b.address, b.city, b.state, b.pincode].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => { setSuccess(null); setForm({ customer_name: '', address: '', pan_card: '', gstn: '' }); setBranches([{ unit_name: '', unit_code: '', address: '', state: '', city: '', pincode: '', gstn: '' }]); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-white hover:bg-white/5 transition-colors"
              >
                Create Another
              </button>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto min-h-0 custom-scrollbar">

              {/* Master Customer Details */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" />
                  Primary Customer Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                      Customer Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="customer_name"
                      name="customer_name"
                      value={form.customer_name}
                      onChange={handleChange}
                      placeholder="e.g. Hunesh Sharma / DLF Cybercity Ltd"
                      className="w-full rounded-xl border border-white/10 bg-[#0E1320] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                      PAN Card <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        id="pan_card"
                        name="pan_card"
                        value={form.pan_card}
                        onChange={handleChange}
                        maxLength={10}
                        placeholder="ABCDE1234F"
                        className="w-full rounded-xl border border-white/10 bg-[#0E1320] pl-10 pr-4 py-2.5 text-sm text-white uppercase placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 font-mono tracking-widest"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                      HQ GSTN <span className="text-slate-500 normal-case font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        id="gstn"
                        name="gstn"
                        value={form.gstn}
                        onChange={handleChange}
                        maxLength={15}
                        placeholder="07ABCDE1234F1Z5"
                        className="w-full rounded-xl border border-white/10 bg-[#0E1320] pl-10 pr-4 py-2.5 text-sm text-white uppercase placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 font-mono tracking-widest"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                      Headquarters Address <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Full corporate headquarters address"
                      className="w-full rounded-xl border border-white/10 bg-[#0E1320] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* ── Branches / Units Section (Dynamic Rows & Address Fields) ── */}
              <div className="border-t border-white/5 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" />
                    Customer Branches / Units ({branches.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addBranchRow}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-xs font-semibold transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Branch
                  </button>
                </div>

                <div className="space-y-4">
                  {branches.map((b, idx) => (
                    <div key={idx} className="bg-slate-900/50 border border-white/8 rounded-xl p-4 space-y-3 relative group">
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          Branch #{idx + 1}
                        </span>
                        {branches.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBranchRow(idx)}
                            className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                            title="Remove branch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Unit Name <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={b.unit_name}
                            onChange={(e) => handleBranchChange(idx, 'unit_name', e.target.value)}
                            placeholder="e.g. Gurgaon Branch"
                            className="w-full rounded-lg border border-white/10 bg-[#0E1320] px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Unique Unit Code <span className="text-slate-500 font-normal lowercase">(Auto-generated)</span>
                          </label>
                          <div className="w-full rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300 uppercase font-mono font-bold tracking-wider flex items-center justify-between">
                            <span>{b.unit_code || '—'}</span>
                            <span className="text-[10px] text-emerald-400/60 font-sans font-normal">🔒 Auto</span>
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Branch Address Line / Street
                          </label>
                          <input
                            type="text"
                            value={b.address || ''}
                            onChange={(e) => handleBranchChange(idx, 'address', e.target.value)}
                            placeholder="Street / Building / Area (leave blank to copy HQ address)"
                            className="w-full rounded-lg border border-white/10 bg-[#0E1320] px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            value={b.city || ''}
                            onChange={(e) => handleBranchChange(idx, 'city', e.target.value)}
                            placeholder="e.g. Gurgaon"
                            className="w-full rounded-lg border border-white/10 bg-[#0E1320] px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            State
                          </label>
                          <input
                            type="text"
                            value={b.state || ''}
                            onChange={(e) => handleBranchChange(idx, 'state', e.target.value)}
                            placeholder="e.g. Haryana"
                            className="w-full rounded-lg border border-white/10 bg-[#0E1320] px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Pincode
                          </label>
                          <input
                            type="text"
                            value={b.pincode || ''}
                            onChange={(e) => handleBranchChange(idx, 'pincode', e.target.value)}
                            placeholder="e.g. 122002"
                            className="w-full rounded-lg border border-white/10 bg-[#0E1320] px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Branch GSTN <span className="text-slate-500 normal-case font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={b.gstn || ''}
                            onChange={(e) => handleBranchChange(idx, 'gstn', e.target.value.toUpperCase())}
                            placeholder="e.g. 06ABCDE1234F1Z5"
                            className="w-full rounded-lg border border-white/10 bg-[#0E1320] px-3 py-2 text-xs text-white uppercase font-mono tracking-wider placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 flex items-center gap-2">
                  <X className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/8 flex gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                id="create-customer-submit"
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Saving Customer & Branches…' : 'Create Customer & Branches'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Customer Detail Drawer (with + Add Branch button) ─────────────────────────
function CustomerDetailDrawer({
  customer,
  onClose,
  onBillGenerated,
  onCustomerUpdated,
}: {
  customer: FinanceCustomer | null;
  onClose: () => void;
  onBillGenerated: (id: string, billNo: string) => void;
  onCustomerUpdated: (updated: FinanceCustomer) => void;
}) {
  const [generatingBill, setGeneratingBill] = useState(false);
  const [lastBill, setLastBill] = useState<string | null>(null);
  const [addBranchOpen, setAddBranchOpen] = useState(false);

  if (!customer) return null;

  async function handleGenerateBill() {
    if (!customer) return;
    setGeneratingBill(true);
    try {
      const res = await api.generateFinanceCustomerBillNumber(customer.id);
      const data = (res as any).data ?? res;
      setLastBill(data.bill_number);
      onBillGenerated(customer.id, data.bill_number);
    } catch {
      // ignore
    } finally {
      setGeneratingBill(false);
    }
  }

  const branches = customer.branches || [];

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative ml-auto h-full w-full max-w-[500px] bg-[#0b1120] border-l border-white/8 flex flex-col shadow-2xl overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{customer.customer_name}</p>
                <p className="text-xs text-slate-500 font-mono">PAN: {customer.pan_card}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/8 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Linked Branches Card + Add Branch Button */}
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-indigo-300 uppercase tracking-widest">
                  Linked Units / Branches ({branches.length || 1})
                </p>
                <button
                  onClick={() => setAddBranchOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-semibold transition"
                >
                  <Plus className="w-3 h-3" /> Add Branch
                </button>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {(branches.length > 0 ? branches : [{ unit_code: customer.unit_code, unit_name: customer.unit_name }]).map((b, idx) => (
                  <div key={idx} className="bg-slate-900/70 p-3.5 rounded-xl border border-white/8 text-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {b.unit_code}
                      </span>
                      <span className="text-slate-200 font-semibold">{b.unit_name}</span>
                    </div>

                    {/* Detailed Branch Address */}
                    <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-white/5">
                      {b.address && (
                        <p className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{b.address}</span>
                        </p>
                      )}
                      {(b.city || b.state || b.pincode) && (
                        <p className="pl-4 text-slate-400">
                          {[b.city, b.state, b.pincode ? `PIN: ${b.pincode}` : ''].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {b.gstn && (
                        <p className="pl-4 text-slate-500 font-mono text-[10px]">
                          GSTN: {b.gstn}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Details */}
            <div className="rounded-2xl border border-white/8 bg-[#131c2e] p-5 space-y-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Customer Master Details
              </p>
              <InfoRow icon={<Hash className="w-3 h-3" />} label="PAN Card" value={customer.pan_card} />
              {customer.gstn && (
                <InfoRow icon={<Shield className="w-3 h-3" />} label="Primary GSTN" value={customer.gstn} />
              )}
              <div className="flex items-start gap-2 text-xs">
                <span className="text-slate-500 mt-0.5"><Building2 className="w-3 h-3" /></span>
                <span className="text-slate-400 min-w-[70px]">Address:</span>
                <span className="text-white">{customer.address}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500"><Hash className="w-3 h-3" /></span>
                <span className="text-slate-400 min-w-[70px]">Status:</span>
                <StatusBadge status={customer.status} />
              </div>
            </div>

            {/* Bill Number Generator */}
            <div className="rounded-2xl border border-white/8 bg-[#131c2e] p-5 space-y-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                Bill Number Generator
              </p>
              <div>
                <p className="text-xs text-slate-400 mb-1">Current prefix</p>
                <p className="text-sm font-mono text-white">{customer.bill_no_prefix}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Current sequence</p>
                <p className="text-sm font-mono text-white">
                  {previewBillNo(customer.bill_seq)}
                </p>
              </div>
              {lastBill && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                  <p className="text-[10px] text-slate-400 mb-0.5">Last generated</p>
                  <p className="text-base font-mono font-bold text-emerald-400">{lastBill}</p>
                </div>
              )}
              <button
                onClick={handleGenerateBill}
                disabled={generatingBill}
                className="w-full mt-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
              >
                {generatingBill
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <FileText className="w-4 h-4" />}
                {generatingBill ? 'Generating…' : 'Generate Next Bill No.'}
              </button>
            </div>

            <p className="text-[10px] text-slate-600 text-center">
              Created {new Date(customer.created_at).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      <AddBranchModal
        customer={customer}
        open={addBranchOpen}
        onClose={() => setAddBranchOpen(false)}
        onBranchAdded={(updatedCust) => {
          onCustomerUpdated(updatedCust);
        }}
      />
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FinanceCustomersPage() {
  const [customers, setCustomers] = useState<FinanceCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<FinanceCustomer | null>(null);

  const fetchCustomers = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const res = await api.listFinanceCustomers(q);
      const data = (res as any).data ?? res;
      setCustomers(Array.isArray(data) ? data : []);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(search || undefined), 300);
    return () => clearTimeout(t);
  }, [search, fetchCustomers]);

  function handleCreated(c: FinanceCustomer) {
    setCustomers((prev) => [c, ...prev]);
  }

  function handleBillGenerated(id: string, billNo: string) {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, bill_seq: c.bill_seq + 1 }
          : c,
      ),
    );
    if (selected?.id === id) {
      setSelected((s) => s ? { ...s, bill_seq: s.bill_seq + 1 } : s);
    }
  }

  function handleCustomerUpdated(updated: FinanceCustomer) {
    setCustomers((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    );
    if (selected?.id === updated.id) {
      setSelected(updated);
    }
  }

  const filtered = customers;

  return (
    <div className="page-padding space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Finance Customers</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Create and manage customers · Multi-branch support · Unique Unit Codes & Addresses
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCustomers(search || undefined)}
            className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            id="open-create-customer"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            Create Customer
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          id="customer-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, PAN, unit code…"
          className="w-full rounded-xl border border-white/10 bg-[#0E1320] pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
        />
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Customers"
          value={String(customers.length)}
          icon={<Users className="w-4 h-4" />}
          color="#10b981"
        />
        <StatCard
          label="Total Units / Branches"
          value={String(customers.reduce((acc, c) => acc + (c.branches?.length || 1), 0))}
          icon={<Layers className="w-4 h-4" />}
          color="#6366f1"
        />
        <StatCard
          label="With GSTN"
          value={String(customers.filter((c) => c.gstn).length)}
          icon={<Shield className="w-4 h-4" />}
          color="#f59e0b"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/8 bg-[#131c2e] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
              <Users className="w-7 h-7 text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm">
              {search ? `No customers match "${search}"` : 'No customers yet — create the first one!'}
            </p>
            {!search && (
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-sm text-emerald-400 hover:bg-emerald-600/30 transition-colors"
              >
                <Plus className="w-4 h-4" /> Create Customer
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  {['Customer Name', 'PAN Card', 'Units / Branches', 'Primary GSTN', 'Bill Prefix', 'Status', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-widest"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const bList = c.branches || [];
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-white/5 hover:bg-white/3 cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-white/1'}`}
                      onClick={() => setSelected(c)}
                    >
                      <td className="px-4 py-3 text-white font-bold max-w-[200px] truncate">
                        {c.customer_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">{c.pan_card}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 items-center">
                          {(bList.length > 0 ? bList : [{ unit_code: c.unit_code, unit_name: c.unit_name }]).map((b, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md border border-indigo-500/30 bg-indigo-500/10 text-[11px] font-bold text-indigo-300 font-mono">
                              {b.unit_code}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400 text-xs">
                        {c.gstn || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-400 text-xs">
                        {c.bill_no_prefix}/{String(c.bill_seq).padStart(4, '0')}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        <ChevronRight className="w-4 h-4" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawers & Modals */}
      <CreateCustomerDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <CustomerDetailDrawer
        customer={selected}
        onClose={() => setSelected(null)}
        onBillGenerated={handleBillGenerated}
        onCustomerUpdated={handleCustomerUpdated}
      />
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#131c2e] p-5 flex items-center gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}22` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

// ── Info Row helper ───────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-500">{icon}</span>
      <span className="text-slate-400 min-w-[70px]">{label}:</span>
      <span className="text-white font-mono">{value}</span>
    </div>
  );
}
