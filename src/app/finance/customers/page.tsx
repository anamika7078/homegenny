'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, Plus, Search, Users, X, CheckCircle2,
  Building2, CreditCard, FileText, Hash, RefreshCw,
  ChevronRight, Shield, Eye,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface FinanceCustomer {
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
  created_at: string;
}

// ── Bill number preview util ──────────────────────────────────────────────────
function previewBillNo(seq = 1): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `BILL/${y}${m}/${String(seq).padStart(4, '0')}`;
}

function deriveUnitCode(name: string): string {
  if (!name.trim()) return '';
  const words = name.trim().toUpperCase().split(/\s+/).filter(Boolean);
  let code = words.map((w) => w[0]).join('').slice(0, 5);
  if (code.length < 3) code = name.replace(/\s+/g, '').slice(0, 5).toUpperCase();
  return code;
}

function deriveUnitName(name: string): string {
  return name.toUpperCase().slice(0, 50);
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

// ── Create Customer Drawer ────────────────────────────────────────────────────
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<FinanceCustomer | null>(null);

  const previewCode = deriveUnitCode(form.customer_name);
  const previewName = deriveUnitName(form.customer_name);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
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

    setSaving(true);
    try {
      const res = await api.createFinanceCustomer({
        customer_name: form.customer_name.trim(),
        address: form.address.trim(),
        pan_card: form.pan_card.toUpperCase().trim(),
        gstn: form.gstn.trim() || undefined,
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
    setError('');
    setSuccess(null);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Centered Modal */}
      <div className="relative w-full max-w-[540px] bg-[#0b1120] border border-white/10 rounded-2xl flex flex-col shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 bg-gradient-to-r from-[#0b1120] to-[#111e38]">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              Create Customer
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Finance module · Unit code auto-generated</p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/8 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          /* ── Success card ── */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 py-10">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white mb-1">Customer Created!</p>
              <p className="text-sm text-slate-400">Unit code has been auto-assigned.</p>
            </div>

            {/* Unit Code Preview — matches the image format */}
            <div className="w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Unit Code</p>
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded-lg border border-white/10 bg-[#0E1320] px-3 py-1.5 text-sm font-bold text-white focus:outline-none"
                      defaultValue={success.unit_code}
                    >
                      <option>{success.unit_code}</option>
                    </select>
                  </div>
                </div>
                <div className="flex-1 ml-4">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Unit Name</p>
                  <p className="text-sm font-bold text-white truncate">{success.unit_name}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <InfoRow icon={<Hash className="w-3 h-3" />} label="PAN Card" value={success.pan_card} />
                {success.gstn && <InfoRow icon={<Shield className="w-3 h-3" />} label="GSTN" value={success.gstn} />}
                <InfoRow icon={<FileText className="w-3 h-3" />} label="First Bill No." value={previewBillNo(1)} />
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => { setSuccess(null); setForm({ customer_name: '', address: '', pan_card: '', gstn: '' }); }}
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
          /* ── Form ── */
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="flex-1 px-6 py-6 space-y-5">

              {/* Customer Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  Customer Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="customer_name"
                  name="customer_name"
                  value={form.customer_name}
                  onChange={handleChange}
                  placeholder="e.g. Aakash Educational Services Ltd"
                  className="w-full rounded-xl border border-white/10 bg-[#0E1320] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                />
              </div>

              {/* Unit Code / Unit Name Preview */}
              {form.customer_name.trim().length >= 2 && (
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                  <p className="text-[10px] font-semibold text-indigo-300 uppercase tracking-widest mb-3">
                    Auto-Generated Unit Info
                  </p>
                  <div className="flex items-start gap-4">
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">Unit Code</p>
                      <div className="flex items-center gap-1.5">
                        <select
                          className="rounded-lg border border-white/10 bg-[#0b1120] px-3 py-1 text-sm font-bold text-white focus:outline-none"
                          defaultValue={previewCode}
                        >
                          <option>{previewCode || '—'}</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-500 mb-1">Unit Name</p>
                      <p className="text-sm font-bold text-white truncate">
                        {previewName || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  Address <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Full address of the customer"
                  className="w-full rounded-xl border border-white/10 bg-[#0E1320] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none"
                />
              </div>

              {/* PAN Card */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
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
                    className="w-full rounded-xl border border-white/10 bg-[#0E1320] pl-10 pr-4 py-2.5 text-sm text-white uppercase placeholder:text-slate-600 placeholder:normal-case focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 font-mono tracking-widest"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Format: 5 letters · 4 digits · 1 letter (e.g. ABCDE1234F)</p>
              </div>

              {/* GSTN (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  GSTN <span className="text-slate-500 normal-case font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="gstn"
                    name="gstn"
                    value={form.gstn}
                    onChange={handleChange}
                    maxLength={15}
                    placeholder="22ABCDE1234F1Z5"
                    className="w-full rounded-xl border border-white/10 bg-[#0E1320] pl-10 pr-4 py-2.5 text-sm text-white uppercase placeholder:text-slate-600 placeholder:normal-case focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 font-mono tracking-widest"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">15-character GSTIN number</p>
              </div>



              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 flex items-center gap-2">
                  <X className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/8 flex gap-3">
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
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Creating…' : 'Create Customer'}
              </button>
            </div>
          </form>
        )}
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

// ── Customer Detail Drawer ────────────────────────────────────────────────────
function CustomerDetailDrawer({
  customer,
  onClose,
  onBillGenerated,
}: {
  customer: FinanceCustomer | null;
  onClose: () => void;
  onBillGenerated: (id: string, billNo: string) => void;
}) {
  const [generatingBill, setGeneratingBill] = useState(false);
  const [lastBill, setLastBill] = useState<string | null>(null);

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

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-[460px] bg-[#0b1120] border-l border-white/8 flex flex-col shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{customer.customer_name}</p>
              <p className="text-xs text-slate-500 font-mono">{customer.unit_code}</p>
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
          {/* Unit Code Card */}
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
            <p className="text-[10px] font-semibold text-indigo-300 uppercase tracking-widest mb-4">
              Unit Information
            </p>
            <div className="flex items-start gap-4">
              <div>
                <p className="text-[10px] text-slate-500 mb-1">Unit Code</p>
                <select
                  className="rounded-lg border border-white/10 bg-[#0b1120] px-3 py-1.5 text-sm font-bold text-white focus:outline-none"
                  defaultValue={customer.unit_code}
                >
                  <option>{customer.unit_code}</option>
                </select>
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-500 mb-1">Unit Name</p>
                <p className="text-sm font-bold text-white">{customer.unit_name}</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="rounded-2xl border border-white/8 bg-[#131c2e] p-5 space-y-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Customer Details
            </p>
            <InfoRow icon={<Hash className="w-3 h-3" />} label="PAN Card" value={customer.pan_card} />
            {customer.gstn && (
              <InfoRow icon={<Shield className="w-3 h-3" />} label="GSTN" value={customer.gstn} />
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
              Bill Number
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

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(search || undefined), 300);
    return () => clearTimeout(t);
  }, [search, fetchCustomers]);

  function handleCreated(c: FinanceCustomer) {
    setCustomers((prev) => [c, ...prev]);
  }

  function handleBillGenerated(id: string, billNo: string) {
    // update seq in list
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

  const filtered = customers; // server-side search already applied

  return (
    <div className="page-padding space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Finance Customers</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Create and manage customers · Auto unit codes · Month-wise billing
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
          label="Active"
          value={String(customers.filter((c) => c.status === 'ACTIVE').length)}
          icon={<CheckCircle2 className="w-4 h-4" />}
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
                  {['Unit Code', 'Unit Name', 'Customer Name', 'PAN Card', 'GSTN', 'Bill Prefix', 'Status', ''].map(
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
                {filtered.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`border-b border-white/5 hover:bg-white/3 cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-white/1'}`}
                    onClick={() => setSelected(c)}
                  >
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-xs font-bold text-indigo-300 font-mono">
                        {c.unit_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate">
                      {c.unit_name}
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-[200px] truncate">
                      {c.customer_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">{c.pan_card}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawers */}
      <CreateCustomerDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <CustomerDetailDrawer
        customer={selected}
        onClose={() => setSelected(null)}
        onBillGenerated={handleBillGenerated}
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
