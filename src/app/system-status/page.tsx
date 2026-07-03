'use client';

import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { cn } from '@/lib/utils/cn';

/* ── Types ─────────────────────────────────────────────────────────────── */
interface StatusItem {
  label: string;
  badge: string;
  variant: 'teal' | 'orange' | 'green' | 'blue' | 'yellow';
}

/* ── Data (Matches Screenshot Exactly) ─────────────────────────────────── */
const GCP_SERVICES: StatusItem[] = [
  { label: 'NestJS Backend (Docker)', badge: 'api.homegenny.com · Port 3001', variant: 'teal' },
  { label: 'Cloud SQL PostgreSQL 15', badge: 'Connected · asia-south1', variant: 'teal' },
  { label: 'Memorystore Redis 7', badge: 'Connected · Private IP', variant: 'teal' },
  { label: 'GCS — Video Certs Bucket', badge: 'LOCKED · 7yr · COMPLIANCE', variant: 'teal' },
  { label: 'Firebase FCM (ADC)', badge: 'No key file · GCE service account', variant: 'teal' },
  { label: 'Next.js Admin (Docker)', badge: 'admin.homegenny.com · Port 3000', variant: 'teal' },
  { label: 'Nginx + SSL (Let\'s Encrypt)', badge: 'TLS 1.3 · HSTS · Auto-renew', variant: 'teal' },
  { label: 'Database backups (GCS)', badge: 'Daily 01:00 AM · 90-day retention', variant: 'teal' },
];

const EXTERNAL_APIS: StatusItem[] = [
  { label: 'UIDAI Aadhaar eKYC', badge: 'Mock mode · Approval pending', variant: 'orange' },
  { label: 'Sarathi DL Verify API', badge: 'Mock mode · Approval pending', variant: 'orange' },
  { label: 'eChallan API', badge: 'Mock mode · Bundled Sarathi', variant: 'orange' },
  { label: 'Razorpay Payouts', badge: 'Live · KYC approved', variant: 'green' },
  { label: 'SendGrid SMTP', badge: '82/100 today · Upgrade needed', variant: 'yellow' },
];

/* ── Badge Component (Custom for this page to match screenshot) ─────────── */
function StatusBadge({ text, variant }: { text: string; variant: StatusItem['variant'] }) {
  const styles = {
    teal: 'bg-[#00d1b2]/10 text-[#00d1b2] border-[#00d1b2]/30',
    orange: 'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/30',
    green: 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/30',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  };

  return (
    <span className={cn(
      "px-3 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap",
      styles[variant]
    )}>
      {text}
    </span>
  );
}

export default function SystemStatusPage() {
  return (
    <AppShell>
      <div className="page-padding mx-auto max-w-[1600px] space-y-6 sm:space-y-8">
        
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-syne font-bold text-white tracking-tight">
                System Status — Google Cloud
              </h1>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 border border-success/30 text-[10px] font-bold text-success uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Operational
              </div>
            </div>
            <p className="text-secondary-foreground text-[11px] mt-1 font-medium">
              GCE · Cloud SQL · Memorystore · GCS · Firebase ADC · homegenny.com
            </p>
          </div>
        </div>

        {/* ── Content Grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Card: GCP Services */}
          <div className="glass-card rounded-3xl p-8 border border-white/5">
            <h2 className="text-lg font-syne font-bold text-white mb-8">GCP Services</h2>
            <div className="space-y-6">
              {GCP_SERVICES.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-secondary-foreground">{item.label}</span>
                  <StatusBadge text={item.badge} variant={item.variant} />
                </div>
              ))}
            </div>
          </div>

          {/* Right Card: External APIs */}
          <div className="space-y-8">
            <div className="glass-card rounded-3xl p-8 border border-white/5">
              <h2 className="text-lg font-syne font-bold text-white mb-8">External APIs & Integrations</h2>
              <div className="space-y-6">
                {EXTERNAL_APIS.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-4">
                    <span className="text-xs font-medium text-secondary-foreground">{item.label}</span>
                    <StatusBadge text={item.badge} variant={item.variant} />
                  </div>
                ))}
              </div>

              {/* Info Box */}
              <div className="mt-10 p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                <p className="text-[10px] leading-relaxed text-blue-400 font-medium">
                  JWT_SECRET + JWT_REFRESH_SECRET loaded from process.env at bootstrap. 
                  Application Default Credentials auto-detected from GCE service account. 
                  NEXT_PUBLIC_API_URL baked into Next.js bundle at Docker build time.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
