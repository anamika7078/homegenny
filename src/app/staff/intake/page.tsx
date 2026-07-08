'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api/client';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';

const SERIES_COLORS: Record<string, string> = {
  DR: '#38BDF8', 
  SC: '#00C9A7', 
  UC: '#8B5CF6', 
  MAID: '#F0A500',
};

export default function StaffIntakePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    series: '',
    languageTier: 'Tier 1 — Hindi + English',
    aadhaar_last4: '',
    security_deposit: '',
  });
  const [isChecking, setIsChecking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [restrictedStatus, setRestrictedStatus] = useState<'idle' | 'clear' | 'restricted'>('idle');
  const [error, setError] = useState('');

  // ── Pending Approvals (S4_AGREEMENTS stage) ──────────────────────────────
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.listStaff({ stage: 'S4_AGREEMENTS', limit: 10 })
      .then((res: any) => {
        const raw = res?.data?.items ?? res?.items ?? res?.data;
        const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
        if (!cancelled) setPendingApprovals(items);
      })
      .catch(() => { /* silently fail — non-critical panel */ })
      .finally(() => { if (!cancelled) setLoadingApprovals(false); });
    return () => { cancelled = true; };
  }, []);

  const handleCheckRestricted = async () => {
    if (!formData.aadhaar_last4 || !formData.phone) {
      setError('Please provide Mobile Number and Aadhaar Last 4 to check restricted list.');
      return;
    }
    setError('');
    setIsChecking(true);
    setRestrictedStatus('idle');
    try {
      // In a real scenario we might need full aadhaar, but UI shows Last 4. 
      // Assuming API accepts what we send for checking.
      const res: any = await api.checkRestricted(
        formData.aadhaar_last4,
        formData.phone
      );
      if (res.found) {
        setRestrictedStatus('restricted');
        setError(res.reason || 'Applicant is on the restricted list.');
      } else {
        setRestrictedStatus('clear');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check restricted list.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleCreateRecord = async () => {
    if (!formData.name || !formData.phone || !formData.series || !formData.aadhaar_last4) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setIsCreating(true);
    try {
      // Mapping Series dropdown to Backend Enum
      let mappedSeries = formData.series;
      if (formData.series === 'DR') mappedSeries = 'DRIVER';
      else if (formData.series === 'SC') mappedSeries = 'SKILLED_CARE';
      else if (formData.series === 'UC') mappedSeries = 'UNSKILLED_CARE';
      
      let mappedTier = 'T1';
      if (formData.languageTier.includes('Tier 2')) mappedTier = 'T2';
      else if (formData.languageTier.includes('Tier 3')) mappedTier = 'T3';

      // Get user info for branch_id if available, otherwise use default
      let branchId = '00000000-0000-0000-0000-000000000001'; // Default HQ
      try {
        const me = await api.me();
        if (me?.branch_id) branchId = me.branch_id;
      } catch (e) {
        console.warn('Failed to fetch user branch, using default');
      }

      await api.createStaff({
        full_name: formData.name,
        mobile: formData.phone,
        series: mappedSeries,
        language_tier: mappedTier,
        pipeline_stage: 'S1_INTAKE',
        // Postgres DATE type requires YYYY-MM-DD
        date_of_birth: new Date().toISOString().split('T')[0], 
        address: 'TBD',
        branch_id: branchId,
        deposit_amount: formData.security_deposit ? Number(formData.security_deposit) : 0,
        metadata: {
          aadhaar_last4: formData.aadhaar_last4,
        }
      });
      router.push('/staff/pipeline'); // Redirect to Kanban
    } catch (err: any) {
      setError(err.message || 'Failed to create S1 record.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AppShell>
      <div className="page-padding pt-2 max-w-[1400px] mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            S1 Intake <span className="text-secondary-foreground font-normal">— New Staff Applicant</span>
          </h1>
          <p className="text-xs text-secondary-foreground mt-1 tracking-wide">
            Restricted list SHA-256 check · Pipeline FSM initialised on creation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column - Form */}
          <Card className="bg-[#121827] border-border/50 rounded-xl overflow-hidden shadow-lg h-fit">
            <CardHeader className="border-b border-border/20 px-6 py-5">
              <CardTitle className="text-base font-bold text-white">Applicant Details</CardTitle>
            </CardHeader>
            <CardContent className="page-padding space-y-5">
              {error && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                  <p className="text-xs text-danger">{error}</p>
                </div>
              )}
              {restrictedStatus === 'clear' && (
                <div className="p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  <p className="text-xs text-success">Restricted list check passed. Applicant is clear.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">Full Name (Aadhaar)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Ramnath Prasad Gupta"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-[#0f1523] border border-border/50 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-secondary-foreground/50 focus:outline-none focus:border-[#FF5A1F]/50 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">Mobile Number</label>
                  <input 
                    type="tel" 
                    placeholder="10-digit"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-[#0f1523] border border-border/50 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-secondary-foreground/50 focus:outline-none focus:border-[#FF5A1F]/50 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">Series</label>
                  <SelectMenu
                    value={formData.series}
                    onValueChange={(v) => setFormData({ ...formData, series: v })}
                    placeholder="Select"
                    className="border-border/50 bg-[#0f1523] py-2.5"
                  >
                    <SelectMenuItem value="DR">DR - Driver</SelectMenuItem>
                    <SelectMenuItem value="SC">SC - Skilled Caretaker</SelectMenuItem>
                    <SelectMenuItem value="UC">UC - Unskilled Caretaker</SelectMenuItem>
                    <SelectMenuItem value="MAID">MAID - Maid</SelectMenuItem>
                  </SelectMenu>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">Language Tier</label>
                  <SelectMenu
                    value={formData.languageTier}
                    onValueChange={(v) => setFormData({ ...formData, languageTier: v })}
                    placeholder="Select"
                    className="border-border/50 bg-[#0f1523] py-2.5"
                  >
                    <SelectMenuItem value="Tier 1 — Hindi + English">Tier 1 — Hindi + English</SelectMenuItem>
                    <SelectMenuItem value="Tier 2 — Hindi Only">Tier 2 — Hindi Only</SelectMenuItem>
                    <SelectMenuItem value="Tier 3 — Regional">Tier 3 — Regional</SelectMenuItem>
                  </SelectMenu>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">Aadhaar Last 4</label>
                  <input 
                    type="text" 
                    placeholder="XXXX"
                    maxLength={4}
                    value={formData.aadhaar_last4}
                    onChange={(e) => setFormData({...formData, aadhaar_last4: e.target.value})}
                    className="w-full bg-[#0f1523] border border-border/50 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-secondary-foreground/50 focus:outline-none focus:border-[#FF5A1F]/50 transition-colors font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">Security Deposit (₹)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 2000"
                    value={formData.security_deposit}
                    onChange={(e) => setFormData({...formData, security_deposit: e.target.value})}
                    className="w-full bg-[#0f1523] border border-border/50 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-secondary-foreground/50 focus:outline-none focus:border-[#FF5A1F]/50 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-4">
                <button 
                  onClick={handleCheckRestricted}
                  disabled={isChecking}
                  className="px-5 py-2.5 rounded-lg border border-border/80 text-sm font-medium text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  {isChecking ? 'Checking...' : 'Check Restricted List'}
                </button>
                <button 
                  onClick={handleCreateRecord}
                  disabled={isCreating || restrictedStatus === 'restricted'}
                  className="px-5 py-2.5 rounded-lg bg-[#FF5A1F] text-sm font-bold text-white hover:bg-[#E04B1A] transition-colors shadow-lg shadow-[#FF5A1F]/20 disabled:opacity-50 disabled:shadow-none"
                >
                  {isCreating ? 'Creating...' : 'Create S1 Record'}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            <Card className="bg-[#121827] border-border/50 rounded-xl overflow-hidden shadow-lg">
              <CardHeader className="border-b border-border/20 px-6 py-5">
                <CardTitle className="text-base font-bold text-white">Series Requirements</CardTitle>
              </CardHeader>
              <CardContent className="page-padding space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-8 shrink-0 text-xs font-bold" style={{ color: SERIES_COLORS['DR'] }}>DR</div>
                  <div className="text-sm text-secondary-foreground leading-relaxed">
                    Sarathi DL verify · eChallan check · PV · Practical test
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 shrink-0 text-xs font-bold" style={{ color: SERIES_COLORS['SC'] }}>SC</div>
                  <div className="text-sm text-secondary-foreground leading-relaxed">
                    Aadhaar eKYC · S2.5 assessment · 7-day training · A4 Medical Addendum
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 shrink-0 text-xs font-bold" style={{ color: SERIES_COLORS['UC'] }}>UC</div>
                  <div className="text-sm text-secondary-foreground leading-relaxed">
                    Aadhaar eKYC · Temperament check · A5 Medical Exclusion Clause
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 shrink-0 text-xs font-bold" style={{ color: SERIES_COLORS['MAID'] }}>MAID</div>
                  <div className="text-sm text-secondary-foreground leading-relaxed">
                    Aadhaar eKYC · Background check · PV submission
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#121827] border-border/50 rounded-xl overflow-hidden shadow-lg flex-grow">
              <CardHeader className="border-b border-border/20 px-6 py-5 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-white">Pending Approvals</CardTitle>
                {!loadingApprovals && (
                  <span className="text-xs text-secondary-foreground font-normal">
                    {pendingApprovals.length} awaiting
                  </span>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {loadingApprovals ? (
                  <div className="divide-y divide-border/20">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="p-5 flex gap-4 items-center">
                        <div className="w-10 h-10 rounded-lg bg-white/5 animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-white/5 rounded animate-pulse w-3/4" />
                          <div className="h-2 bg-white/5 rounded animate-pulse w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : pendingApprovals.length === 0 ? (
                  <div className="p-8 flex flex-col items-center justify-center text-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-success/50" />
                    <p className="text-sm text-secondary-foreground">No pending approvals</p>
                    <p className="text-xs text-secondary-foreground/60">All staff at S4 stage are up to date</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/20">
                    {pendingApprovals.map((staff: any) => {
                      const seriesKey = staff.series === 'DRIVER' ? 'DR'
                        : staff.series === 'SKILLED_CARE' ? 'SC'
                        : staff.series === 'UNSKILLED_CARE' ? 'UC'
                        : 'MAID';
                      const color = SERIES_COLORS[seriesKey] ?? '#94a3b8';
                      const initials = (staff.full_name ?? '?')
                        .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                      return (
                        <div
                          key={staff.id}
                          className="p-5 flex gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${color}18` }}
                          >
                            <span className="font-bold text-sm" style={{ color }}>{initials}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white truncate">
                              {staff.full_name} — Agreements Pending
                            </div>
                            <div className="text-xs text-secondary-foreground mt-0.5">
                              {staff.staff_code} · {seriesKey} · {staff.pipeline_stage?.replace(/_/g, ' ')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
