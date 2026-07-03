'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { api } from '@/lib/api/client';

/* ── Types ─────────────────────────────────────────────────────────────── */
interface CronJob {
  key: string;
  name: string;
  schedule: string;
  scheduleLabel: string;
  description: string;
  status: string;
}

interface ActivityEntry {
  time: string;
  jobKey: string;
  jobName: string;
  recordsScanned: string;
  alertsGenerated: string;
  fcmSent: number;
  status: string;
}

/* ── Fallback Data (matches screenshot exactly) ────────────────────────── */
const FALLBACK_JOBS: CronJob[] = [
  { key: 'dl_expiry_check', name: 'DL Expiry Check', schedule: '0 9 * * *', scheduleLabel: 'daily 9am', description: 'Scans deployed DR staff for DL expiry within 60/30/7-day marks. Alerts RM at 60/30/7-day marks.', status: 'RUNNING' },
  { key: 'echallan_monitor', name: 'eChallan Monitor', schedule: '0 10 * * *', scheduleLabel: 'daily 10am', description: 'Daily challan scan for all deployed drivers. Triggers DR-DB review on 3+ challans.', status: 'RUNNING' },
  { key: 'pv_renewal_alert', name: 'PV Renewal Alert', schedule: '0 9 * * 1', scheduleLabel: 'every Monday', description: 'Deployed staff with Police Verification older than 11 months. Triggers renewal schedule.', status: 'RUNNING' },
  { key: 'video_cert_renewal', name: 'Video Cert Renewal', schedule: '0 9 * * 1', scheduleLabel: 'every Monday', description: 'Annual video self-certification renewal for all deployed staff.', status: 'RUNNING' },
  { key: 'trial_placement_check', name: 'Trial Placement Check', schedule: '0 8 * * *', scheduleLabel: 'daily 8am', description: 'Trial placements expiring within 3 days. Alerts RM and client for decision.', status: 'RUNNING' },
  { key: 'invoice_overdue_alert', name: 'Invoice Overdue Alert', schedule: '0 11 * * *', scheduleLabel: 'daily 11am', description: 'Pending invoices past due date. Escalates at Day 1/3/7 intervals.', status: 'RUNNING' },
  { key: 'upgrade_path_check', name: 'Upgrade Path Check', schedule: '0 9 1 * *', scheduleLabel: '1st of month', description: 'UC/Maid staff eligible for series upgrade after 6 months to confirmed placement.', status: 'RUNNING' },
];

const FALLBACK_LOG: ActivityEntry[] = [
  { time: '09:00:01', jobKey: 'dl_expiry_check', jobName: 'DL Expiry Check', recordsScanned: '21 DR drivers', alertsGenerated: '1 (Ramkishan Yadav)', fcmSent: 3, status: 'OK' },
  { time: '09:01:03', jobKey: 'pv_renewal_alert', jobName: 'PV Renewal Alert', recordsScanned: '14 deployed staff', alertsGenerated: '1 (Sudha Tiwari)', fcmSent: 2, status: 'OK' },
  { time: '09:01:08', jobKey: 'video_cert_renewal', jobName: 'Video Cert Renewal', recordsScanned: '14 deployed staff', alertsGenerated: '0', fcmSent: 0, status: 'OK' },
  { time: '08:30:02', jobKey: 'trial_placement_check', jobName: 'Trial Checkin', recordsScanned: '5 trial placements', alertsGenerated: '1 (Suresh Kumar)', fcmSent: 3, status: 'OK' },
  { time: '10:00:05', jobKey: 'echallan_monitor', jobName: 'eChallan Monitor', recordsScanned: '21 DR drivers', alertsGenerated: '1 (Rajendra Prasad)', fcmSent: 4, status: 'OK' },
  { time: '11:00:03', jobKey: 'invoice_overdue_alert', jobName: 'Invoice Overdue', recordsScanned: '28 invoices', alertsGenerated: '1 (Saxena Family)', fcmSent: 2, status: 'OK' },
];

/* ── Color map for cron job dot colors ─────────────────────────────────── */
const JOB_DOT_COLORS: Record<string, string> = {
  dl_expiry_check:      '#22c55e',
  echallan_monitor:     '#22c55e',
  pv_renewal_alert:     '#f97316',
  video_cert_renewal:   '#f97316',
  trial_placement_check:'#f97316',
  invoice_overdue_alert:'#f97316',
  upgrade_path_check:   '#f97316',
};

/* ── Time color based on value ─────────────────────────────────────────── */
function getTimeColor(time: string): string {
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 9) return '#f97316';   // orange for early
  if (hour < 10) return '#22c55e';  // green for 9am
  if (hour < 11) return '#f97316';  // orange for 10am
  return '#ef4444';                 // red for 11am+
}

/* ══════════════════════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════════════════════ */
export default function MonitoringPage() {
  const [cronJobs, setCronJobs] = useState<CronJob[]>(FALLBACK_JOBS);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>(FALLBACK_LOG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [jobsRes, logRes] = await Promise.allSettled([
          api.getCronJobs(),
          api.getActivityLog(),
        ]);

        if (jobsRes.status === 'fulfilled') {
          const data = jobsRes.value?.data ?? jobsRes.value;
          if (Array.isArray(data) && data.length > 0) setCronJobs(data);
        }
        if (logRes.status === 'fulfilled') {
          const data = logRes.value?.data ?? logRes.value;
          if (Array.isArray(data) && data.length > 0) setActivityLog(data);
        }
      } catch {
        // Use fallback data — already set as defaults
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const runningCount = cronJobs.filter(j => j.status === 'RUNNING').length;
  const totalCount = cronJobs.length;

  return (
    <AppShell>
      <div className="page-padding mx-auto max-w-[1600px] space-y-6 sm:space-y-8">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-2xl font-syne font-bold text-white tracking-tight">
                Monitoring — {totalCount} Cron Jobs
              </h1>
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
                style={{
                  backgroundColor: 'rgba(34,197,94,0.12)',
                  color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.25)',
                }}
              >
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                All {runningCount} Running
              </span>
            </div>
            <p className="text-secondary-foreground text-xs mt-1">
              All active · NestJS <code className="text-[10px]">@nestjs/schedule</code> · Firebase FCM alerts to Flutter app
            </p>
          </div>
        </div>

        {/* ── Cron Job Cards Grid ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {cronJobs.map((job) => {
            const dotColor = JOB_DOT_COLORS[job.key] || '#22c55e';
            return (
              <div
                key={job.key}
                className="glass-card rounded-2xl p-4 hover:border-primary/30 transition-all group cursor-default"
                style={{ minHeight: 120 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: dotColor }}
                  />
                  <h3 className="text-sm font-bold text-white truncate">{job.name}</h3>
                </div>
                <p className="text-[10px] text-secondary-foreground font-mono mb-2">
                  <span className="text-orange-400">{job.schedule}</span>
                  {' · '}
                  <span>{job.scheduleLabel}</span>
                </p>
                <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">
                  {job.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Today's Cron Activity Log ───────────────────────────── */}
        <div>
          <h2 className="text-lg font-syne font-bold text-white tracking-tight mb-5">
            Today&apos;s Cron Activity Log
          </h2>

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-secondary-foreground uppercase tracking-widest">Time</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-secondary-foreground uppercase tracking-widest">Job</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-secondary-foreground uppercase tracking-widest">Records Scanned</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-secondary-foreground uppercase tracking-widest">Alerts Generated</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-secondary-foreground uppercase tracking-widest">FCM Sent</th>
                    <th className="text-left px-5 py-3.5 text-[10px] font-bold text-secondary-foreground uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLog.map((entry, i) => (
                    <tr
                      key={`${entry.jobKey}-${i}`}
                      className="border-b border-border/20 last:border-b-0 hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Time */}
                      <td className="px-5 py-3.5">
                        <span
                          className="font-mono text-xs font-bold"
                          style={{ color: getTimeColor(entry.time) }}
                        >
                          {entry.time}
                        </span>
                      </td>

                      {/* Job Name */}
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-bold text-white">{entry.jobName}</span>
                      </td>

                      {/* Records Scanned */}
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-secondary-foreground">{entry.recordsScanned}</span>
                      </td>

                      {/* Alerts Generated */}
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-secondary-foreground">{entry.alertsGenerated}</span>
                      </td>

                      {/* FCM Sent */}
                      <td className="px-5 py-3.5">
                        <span className="text-xs text-secondary-foreground">{entry.fcmSent}</span>
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: entry.status === 'OK' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                            color: entry.status === 'OK' ? '#22c55e' : '#ef4444',
                            border: `1px solid ${entry.status === 'OK' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                          }}
                        >
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}