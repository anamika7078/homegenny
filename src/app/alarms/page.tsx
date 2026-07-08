'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/loading';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';
import {
  AlertCircle,
  ArrowUp,
  User,
  FileWarning,
  CreditCard,
  Settings,
  Check,
  Zap,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils/cn';

const BM_DISPLAY_NAME = 'Amit Gupta';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '— Select action —' },
  { value: 'in_progress', label: 'Mark In Progress' },
  { value: 'resolved', label: 'Mark Resolved' },
  { value: 'escalate_director', label: 'Escalate to Director' },
  { value: 'snooze_24h', label: 'Snooze 24 hours' },
  { value: 'close_no_action', label: 'Close (no action needed)' },
];

type IssueCategory = 'CLIENT' | 'COMPLIANCE' | 'PAYMENT' | 'SYSTEM';
type IssueSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type TabId = 'ALL' | 'CRITICAL' | IssueCategory;

interface Issue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  meta: string;
  footer: string;
  unread: boolean;
  assignedTo: string;
  /** Grey metadata line under the title in the detail panel (defaults to `meta`) */
  detailMeta?: string;
  /** Incident narrative in the detail panel */
  description?: string;
  /** Orange “Recommended action” box copy */
  recommendedAction?: string;
}

interface IssueActionRecord {
  note: string;
  statusValue: string;
}

function resolveDetailCopy(issue: Issue) {
  const detailMeta = issue.detailMeta ?? issue.meta;
  const description =
    issue.description ??
    `This alarm needs branch manager attention. ${issue.title}. Context: ${issue.meta}. Latest signal: ${issue.footer}.`;
  const recommendedAction =
    issue.recommendedAction ??
    `Recommended: Contact the ${issue.assignedTo} owner track, apply the ${issue.category} response checklist, and document outcomes in the shift log before the SLA checkpoint.`;
  return { detailMeta, description, recommendedAction };
}

const ISSUES_MOCK: Issue[] = [
  {
    id: 'AL-012',
    category: 'COMPLIANCE',
    severity: 'CRITICAL',
    title: 'Ramkishan Yadav — Driving Licence Expiring (5 days)',
    meta: 'DR-ST-00029 · Deployed · Vasant Kunj · Client: Suresh Agarwal',
    footer: 'Today 09:00 AM · DL expiry cron',
    unread: true,
    assignedTo: 'Compliance',
  },
  {
    id: 'AL-011',
    category: 'CLIENT',
    severity: 'CRITICAL',
    title: 'Client escalation — delayed replacement (Series DRIVER)',
    meta: 'CL-4412 · Active contract · Gurgaon · Client: Meera Khanna',
    footer: 'Today 08:12 AM · SLA breach monitor',
    unread: true,
    assignedTo: 'Ops Manager',
  },
  {
    id: 'AL-010',
    category: 'PAYMENT',
    severity: 'CRITICAL',
    title: 'Razorpay payout stuck > 48h — staff ST-2388',
    meta: 'PAY-9021 · Payroll batch #44 · NEFT pending',
    footer: 'Yesterday 11:40 PM · Finance webhook',
    unread: true,
    assignedTo: 'Finance Team',
  },
  {
    id: 'AL-009',
    category: 'CLIENT',
    severity: 'HIGH',
    title: 'Agarwal Family — Staff Abandonment Complaint',
    meta: 'CL-505 · Series MAID · South Ext · Client: R. Malhotra',
    footer: 'Yesterday 04:30 PM · RM hotline',
    unread: true,
    assignedTo: 'RM West',
    detailMeta: 'SC-ST-00027 · Sudha Tiwari · Deployed 5 months · Greater Kailash-II, New Delhi',
    description:
      'Client Rekha Agarwal called at 11:15 AM to report Sudha Tiwari did not report for duty without any prior notice. This is the second such incident in 30 days. Client is threatening to cancel the agreement and demand replacement. Sudha Tiwari is unreachable on mobile.',
    recommendedAction:
      'Contact Sudha Tiwari immediately. If unreachable within 2 hours, initiate Placement Exit (scenario SC-09: client-initiated exit). Arrange replacement caretaker from pool within 72 hours per SLA. Document incident in shift log as ABSENT.',
  },
  {
    id: 'AL-008',
    category: 'COMPLIANCE',
    severity: 'HIGH',
    title: 'Sudha Tiwari — Police Verification Renewal Due',
    meta: 'DR-ST-00102 · Pre-deploy · Noida sector 62',
    detailMeta: 'SC-ST-00027 · Deployed 5 months · PV dated 28 Apr 2025 (12 months old)',
    footer: 'Yesterday 02:00 PM · Onboarding checklist',
    unread: false,
    assignedTo: 'HR Manager',
    description:
      'Annual police verification for deployed staff Sudha Tiwari is past the 12-month renewal window. Client household agreement requires valid PV on file.',
    recommendedAction:
      'Schedule PV renewal with the nearest police station or empanelled vendor within 7 days. Upload scanned receipt to compliance vault and mark checklist item PV-RENEW as complete.',
  },
  {
    id: 'AL-007',
    category: 'SYSTEM',
    severity: 'HIGH',
    title: 'SMS delivery failures spiking (12% last hour)',
    meta: 'INFRA-SMS · Provider: MSG91 · Region DEL',
    footer: 'Yesterday 12:15 PM · Monitoring',
    unread: true,
    assignedTo: 'System Admin',
  },
  {
    id: 'AL-006',
    category: 'CLIENT',
    severity: 'MEDIUM',
    title: 'Service quality follow-up — week 2 check-in',
    meta: 'CL-3891 · Cook series · Defence Colony',
    footer: 'Yesterday 10:00 AM · CS playbook',
    unread: false,
    assignedTo: 'CS Lead',
  },
  {
    id: 'AL-005',
    category: 'COMPLIANCE',
    severity: 'MEDIUM',
    title: 'Aadhaar masked mismatch — manual review queue',
    meta: 'ST-2401 · Verification · NSDL delta',
    footer: '13 May 06:20 PM · Compliance engine',
    unread: false,
    assignedTo: 'Compliance',
  },
  {
    id: 'AL-004',
    category: 'CLIENT',
    severity: 'MEDIUM',
    title: 'Contract renewal reminder — 7 days to expiry',
    meta: 'CL-2209 · Driver · Client: Anil Kapoor',
    footer: '13 May 09:00 AM · Renewals cron',
    unread: true,
    assignedTo: 'BM Delhi',
  },
  {
    id: 'AL-003',
    category: 'PAYMENT',
    severity: 'MEDIUM',
    title: 'Client invoice overdue — 9 days past due',
    meta: 'INV-7781 · Corporate · Rs 42,600',
    footer: '12 May 03:00 PM · AR aging',
    unread: false,
    assignedTo: 'Finance Team',
  },
  {
    id: 'AL-002',
    category: 'SYSTEM',
    severity: 'LOW',
    title: 'SMS quota at 85% for current billing cycle',
    meta: 'INFRA-SMS · SendGrid / MSG91 blend',
    footer: '12 May 08:00 AM · Usage report',
    unread: false,
    assignedTo: 'System Admin',
  },
  {
    id: 'AL-001',
    category: 'CLIENT',
    severity: 'LOW',
    title: 'Feedback survey NPS dip — branch aggregate 6.2',
    meta: 'DEL-NCR · Rolling 30d · 38 responses',
    footer: '11 May 05:00 PM · CX dashboard',
    unread: false,
    assignedTo: 'BM Delhi',
  },
];

const TAB_DEFS: { id: TabId; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'CRITICAL', label: 'Critical' },
  { id: 'CLIENT', label: 'Client Issues', icon: User },
  { id: 'COMPLIANCE', label: 'Compliance', icon: FileWarning },
  { id: 'PAYMENT', label: 'Payment', icon: CreditCard },
  { id: 'SYSTEM', label: 'System', icon: Settings },
];

function SeverityIcon({ severity }: { severity: IssueSeverity }) {
  if (severity === 'CRITICAL') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E53E3E]/20 ring-1 ring-[#E53E3E]/40">
        <AlertCircle className="h-5 w-5 text-[#E53E3E]" strokeWidth={2.5} />
      </div>
    );
  }
  if (severity === 'HIGH') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-500/20 ring-1 ring-amber-500/35">
        <ArrowUp className="h-5 w-5 text-amber-400" strokeWidth={2.5} />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/80 ring-1 ring-border">
      <AlertCircle className="h-4 w-4 text-secondary-foreground" strokeWidth={2} />
    </div>
  );
}

const VALID_TABS: TabId[] = ['ALL', 'CRITICAL', 'CLIENT', 'COMPLIANCE', 'PAYMENT', 'SYSTEM'];

function DetailSeverityBadge({ severity }: { severity: IssueSeverity }) {
  if (severity === 'CRITICAL') {
    return (
      <span className="shrink-0 rounded-md bg-[#7f1d1d]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-100 ring-1 ring-red-500/45">
        Critical
      </span>
    );
  }
  if (severity === 'HIGH') {
    return (
      <span className="shrink-0 rounded-md border border-amber-500/75 bg-transparent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-400">
        High
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-md border border-white/20 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground">
      {severity}
    </span>
  );
}

function AlarmsPageContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>('ALL');
  const [selected, setSelected] = useState<Issue | null>(null);
  const [issues, setIssues] = useState<Issue[]>(ISSUES_MOCK);
  const [draftNote, setDraftNote] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [issueActions, setIssueActions] = useState<Record<string, IssueActionRecord>>({});

  useEffect(() => {
    setDraftNote('');
    setDraftStatus('');
  }, [selected?.id]);

  useEffect(() => {
    const raw = searchParams.get('tab')?.toUpperCase();
    if (raw && VALID_TABS.includes(raw as TabId)) setTab(raw as TabId);
  }, [searchParams]);

  const counts = useMemo(() => {
    const critical = issues.filter((i) => i.severity === 'CRITICAL').length;
    const high = issues.filter((i) => i.severity === 'HIGH').length;
    const byCat = (c: IssueCategory) => issues.filter((i) => i.category === c).length;
    return {
      all: issues.length,
      critical,
      high,
      client: byCat('CLIENT'),
      compliance: byCat('COMPLIANCE'),
      payment: byCat('PAYMENT'),
      system: byCat('SYSTEM'),
    };
  }, [issues]);

  const filtered = useMemo(() => {
    if (tab === 'ALL') return issues;
    if (tab === 'CRITICAL') return issues.filter((i) => i.severity === 'CRITICAL');
    return issues.filter((i) => i.category === tab);
  }, [issues, tab]);

  const tabCount = (id: TabId) => {
    if (id === 'ALL') return counts.all;
    if (id === 'CRITICAL') return counts.critical;
    if (id === 'CLIENT') return counts.client;
    if (id === 'COMPLIANCE') return counts.compliance;
    if (id === 'PAYMENT') return counts.payment;
    return counts.system;
  };

  const markAllRead = () => {
    setIssues((prev) => prev.map((i) => ({ ...i, unread: false })));
  };

  const toastSurface: React.CSSProperties = {
    background: '#121926',
    color: '#f8fafc',
    border: '1px solid rgba(255,255,255,0.12)',
    fontSize: '14px',
    padding: '14px 18px',
    maxWidth: 'min(420px, calc(100vw - 32px))',
  };

  const notifyRm = () => {
    if (!selected) return;
    const shortTitle = selected.title.length > 58 ? `${selected.title.slice(0, 58)}…` : selected.title;
    toast.success(`Regional Manager notified: ${shortTitle}`, {
      position: 'bottom-center',
      duration: 4000,
      style: toastSurface,
    });
  };

  const handleSaveDetail = () => {
    if (!selected) return;
    if (!draftNote.trim() && !draftStatus) {
      toast.error('Add a note or choose a status before saving.', {
        position: 'bottom-center',
        duration: 3500,
        style: toastSurface,
      });
      return;
    }
    setIssueActions((prev) => ({
      ...prev,
      [selected.id]: { note: draftNote.trim(), statusValue: draftStatus },
    }));
    toast.success('Record saved and status updated.', {
      position: 'bottom-center',
      duration: 2800,
      style: toastSurface,
    });
  };

  return (
    <AppShell>
      <div className="page-padding mx-auto flex min-h-0 max-w-[1600px] flex-col">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="font-syne text-3xl font-bold tracking-tight text-white lg:text-4xl">Issues & Alarms</h1>
            <p className="mt-2 max-w-2xl text-sm text-secondary-foreground">
              Client complaints · Service alerts · Compliance · System warnings
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-[#E53E3E] px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
              {counts.critical} Critical
            </span>
            <span className="inline-flex items-center rounded-full bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-[#0B111B] shadow-sm">
              {counts.high} High
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-white/20 bg-transparent text-xs font-semibold text-foreground hover:bg-white/5"
              onClick={markAllRead}
            >
              Mark all read
            </Button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-white/[0.06] bg-[#0B111B]/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-xl lg:border lg:border-white/[0.06] lg:bg-[#121926]/50 lg:px-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TAB_DEFS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all',
                  active
                    ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/30'
                    : 'border border-white/10 bg-[#121926]/80 text-secondary-foreground hover:border-white/20 hover:text-foreground'
                )}
              >
                {Icon ? <Icon className="h-3.5 w-3.5 opacity-90" /> : null}
                {t.label}{' '}
                <span className={cn('tabular-nums', active ? 'text-white/90' : 'text-muted-foreground')}>({tabCount(t.id)})</span>
              </button>
            );
          })}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* Issues list */}
          <div className="flex min-h-0 flex-col rounded-xl border border-white/[0.08] bg-[#121926]/60">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <h2 className="font-syne text-lg font-bold text-white">All Issues & Alarms</h2>
              <span className="text-sm tabular-nums text-secondary-foreground">{filtered.length} total</span>
            </div>
            <div className="min-h-0 flex-1 divide-y divide-white/[0.06] overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {filtered.map((issue, idx) => (
                  <motion.button
                    key={issue.id}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.04, 0.35) }}
                    onClick={() => {
                      setSelected(issue);
                      setIssues((prev) => prev.map((i) => (i.id === issue.id ? { ...i, unread: false } : i)));
                    }}
                    className={cn(
                      'flex w-full gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.04]',
                      selected?.id === issue.id && 'bg-[#FF6B00]/10'
                    )}
                  >
                    <SeverityIcon severity={issue.severity} />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-syne text-[15px] font-bold leading-snug text-white">{issue.title}</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-secondary-foreground">{issue.meta}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">{issue.footer}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end justify-center gap-2 pt-1">
                      {issue.unread ? <span className="h-2 w-2 rounded-full bg-[#FF6B00] shadow-[0_0_8px_rgba(255,107,0,0.6)]" title="Unread" /> : <span className="h-2 w-2 rounded-full bg-transparent" />}
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                >
                  {(() => {
                    const { detailMeta, description, recommendedAction } = resolveDetailCopy(selected);
                    const saved = issueActions[selected.id];
                    const statusLine = (rec: IssueActionRecord) => {
                      const lbl = rec.statusValue
                        ? STATUS_OPTIONS.find((o) => o.value === rec.statusValue)?.label
                        : '';
                      return rec.note || lbl || 'Updated';
                    };

                    if (saved) {
                      return (
                        <Card className="border-white/[0.08] bg-[#121926]/90 shadow-xl">
                          <CardContent className="space-y-4 pb-6 pt-6">
                            <div className="flex items-start justify-between gap-3">
                              <h2 className="font-syne text-lg font-bold leading-snug text-white">{selected.title}</h2>
                              <DetailSeverityBadge severity={selected.severity} />
                            </div>
                            <p className="text-xs leading-relaxed text-secondary-foreground">{detailMeta}</p>
                            <div className="flex items-start gap-2 rounded-lg border border-sky-500/25 bg-sky-500/[0.07] px-3 py-2.5 text-sm text-sky-100/95">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" strokeWidth={2.5} />
                              <span>
                                Action by {BM_DISPLAY_NAME}: {statusLine(saved)}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    return (
                      <Card className="border-white/[0.08] bg-[#121926]/90 shadow-xl">
                        <CardContent className="space-y-4 pb-6 pt-6">
                          <div className="flex items-start justify-between gap-3">
                            <h2 className="font-syne text-lg font-bold leading-snug text-white">{selected.title}</h2>
                            <DetailSeverityBadge severity={selected.severity} />
                          </div>
                          <p className="text-xs leading-relaxed text-secondary-foreground">{detailMeta}</p>
                          <p className="text-sm leading-relaxed text-secondary-foreground">{description}</p>
                          <div className="flex gap-2 rounded-lg border border-[#FF6B00]/40 bg-[#FF6B00]/10 p-3 text-sm leading-relaxed text-amber-50/95">
                            <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6B00]" />
                            <p>
                              <span className="font-semibold text-[#FF6B00]">Recommended Action:</span>{' '}
                              {recommendedAction}
                            </p>
                          </div>
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            {selected.footer}
                          </p>
                          <div className="space-y-2">
                            <label
                              htmlFor={`alarm-note-${selected.id}`}
                              className="block text-[10px] font-bold uppercase tracking-widest text-secondary-foreground"
                            >
                              {BM_DISPLAY_NAME.toUpperCase()}&apos;s note / action taken
                            </label>
                            <textarea
                              id={`alarm-note-${selected.id}`}
                              rows={4}
                              value={draftNote}
                              onChange={(e) => setDraftNote(e.target.value)}
                              placeholder="Record your call outcome, decision, or instructions given..."
                              className="w-full resize-y rounded-lg border border-white/15 bg-[#0B111B]/80 px-3 py-2.5 text-sm text-white outline-none ring-offset-0 placeholder:text-muted-foreground focus:border-[#FF6B00]/50 focus:ring-2 focus:ring-[#FF6B00]/35"
                            />
                          </div>
                          <div className="space-y-2">
                            <label
                              htmlFor={`alarm-status-${selected.id}`}
                              className="block text-[10px] font-bold uppercase tracking-widest text-secondary-foreground"
                            >
                              Update status
                            </label>
                            <SelectMenu
                              value={draftStatus}
                              onValueChange={setDraftStatus}
                              placeholder="— Select action —"
                            >
                              {STATUS_OPTIONS.filter((o) => o.value !== '').map((o) => (
                                <SelectMenuItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectMenuItem>
                              ))}
                            </SelectMenu>
                          </div>
                          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                            <Button
                              type="button"
                              className="h-11 flex-1 rounded-xl bg-[#FF6B00] text-xs font-bold text-white hover:bg-[#e65f00]"
                              onClick={handleSaveDetail}
                            >
                              Save &amp; Update
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-11 flex-1 rounded-xl border-sky-400/40 bg-transparent text-xs font-semibold text-foreground hover:bg-white/5"
                              onClick={notifyRm}
                            >
                              Notify RM
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-white/[0.08] bg-[#121926]/60 p-8 text-center"
                >
                  <CardTitle className="font-syne text-lg text-white">Select an alarm</CardTitle>
                  <p className="mt-3 text-sm leading-relaxed text-secondary-foreground">
                    Click any issue on the left to see details and take action.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="rounded-xl border border-white/[0.08] bg-[#121926]/60 p-5">
              <h3 className="font-syne text-base font-bold text-white">April Summary</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-secondary-foreground">Issues raised</dt>
                  <dd className="font-semibold tabular-nums text-white">12</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-secondary-foreground">Resolved</dt>
                  <dd className="font-semibold tabular-nums text-[#38A169]">7</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-secondary-foreground">Pending action</dt>
                  <dd className="font-semibold tabular-nums text-[#FF6B00]">5</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-secondary-foreground">Avg resolution time</dt>
                  <dd className="font-semibold tabular-nums text-white">22 hrs</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-secondary-foreground">Client escalations</dt>
                  <dd className="font-semibold tabular-nums text-[#E53E3E]">2</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-white/[0.06] pt-3">
                  <dt className="text-secondary-foreground">Critical resolved &lt;24h</dt>
                  <dd className="font-semibold tabular-nums text-cyan-400">100%</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function AlarmsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="flex min-h-[240px] items-center justify-center p-8">
            <Spinner size="lg" />
          </div>
        </AppShell>
      }
    >
      <AlarmsPageContent />
    </Suspense>
  );
}
