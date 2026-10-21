'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { UserCheck, Phone, ClipboardEdit, Pencil, StickyNote } from 'lucide-react';
import { useUnassignedStaff, useClaimStaff, useClientLeads, useUpdateClientLead } from '@/lib/rm/hooks';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { SERIES_BADGE, SERIES_LABELS, STAGE_LABELS } from '@/lib/rm/constants';
import { cn } from '@/lib/utils/cn';
import { fToNow } from '@/lib/utils/format';
import type { StaffApplicant } from '@/lib/types';

/**
 * People who signed up from the app with a mobile number only.
 *
 * Staff fill in their own profile in the app; submitting it moves them to S2
 * and gives them the RM of their city automatically. Two kinds show here:
 * still filling the profile (call them, or fill it in with Complete S1), and
 * finished but with no RM in their city (claim them). Clients finish their
 * profile in the app before they can ask for staff; an RM can call and fill
 * it in (PAN/GST too). docs/REGISTRATION_ONBOARDING_PLAN.md.
 */
export default function RmLeadsPage() {
  const [tab, setTab] = useState<'staff' | 'clients'>('staff');
  return (
    <div className="page-padding max-w-4xl mx-auto space-y-4">
      <RmPageHeader
        title="New Leads"
        description="App sign-ups still filling their profile, or with no RM in their city"
      />
      <div className="flex gap-2">
        {(['staff', 'clients'] as const).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)}>
            {t === 'staff' ? 'Staff' : 'Clients'}
          </Button>
        ))}
      </div>
      {tab === 'staff' ? <StaffLeads /> : <ClientLeads />}
    </div>
  );
}

const MISSING_LABEL: Record<string, string> = {
  full_name: 'name',
  date_of_birth: 'DOB',
  address: 'address',
  series: 'category',
  gender: 'gender',
  city: 'city',
  pincode: 'pincode',
  emergency_contact: 'emergency contact',
  name: 'name',
};

function StaffLeads() {
  const { data, isLoading } = useUnassignedStaff();
  const leads: StaffApplicant[] = Array.isArray(data) ? data : [];
  const claim = useClaimStaff();

  if (isLoading) return <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>;
  if (leads.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No unclaimed staff sign-ups right now</p>;
  }
  return (
    <div className="space-y-2">
      {leads.map((s) => {
        const seriesKey = (s.series ?? '') as string;
        // Still in S1 = still filling the profile; past it with no RM = no RM in their city.
        const needsS1 = s.pipeline_stage === 'S1_INTAKE';
        const label = s.full_name || s.mobile;
        return (
          <div key={s.id} className="glass-card rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/rm/staff/${s.id}`} className="font-semibold hover:text-primary truncate">
                  {label}
                </Link>
                {seriesKey && (
                  <span
                    className={cn(
                      'shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase',
                      SERIES_BADGE[seriesKey] ?? 'bg-muted text-muted-foreground',
                    )}
                  >
                    {SERIES_LABELS[seriesKey] ?? seriesKey}
                  </span>
                )}
                {needsS1 && (
                  <span className="shrink-0 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                    Filling profile
                  </span>
                )}
                {!needsS1 && (
                  <span className="shrink-0 rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-sky-300">
                    No RM in city
                  </span>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <a href={`tel:${s.mobile}`} className="hover:text-primary">{s.mobile}</a>
                <span className="font-mono text-xs">· {s.staff_code}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                registered {fToNow(s.created_at)} · now at {STAGE_LABELS[s.pipeline_stage] ?? s.pipeline_stage}
                {needsS1 && (s.profile_missing ?? s.intake_missing)?.length
                  ? ` · missing ${(s.profile_missing ?? s.intake_missing ?? []).map((m) => MISSING_LABEL[m] ?? m).join(', ')}`
                  : ''}
              </p>
            </div>
            <div className="flex gap-2">
              {needsS1 && (
                <Link href={`/rm/staff/${s.id}/intake`}>
                  <Button size="sm">
                    <ClipboardEdit className="mr-1 h-3.5 w-3.5" />
                    Complete S1
                  </Button>
                </Link>
              )}
              <Button
                size="sm"
                variant={needsS1 ? 'outline' : 'default'}
                disabled={claim.isPending}
                onClick={() =>
                  claim.mutate(s.id, {
                    onSuccess: () => toast.success(`${label} is now yours`),
                    onError: (e: Error) => toast.error(e.message, { duration: 8000 }),
                  })
                }
              >
                <UserCheck className="mr-1 h-3.5 w-3.5" />
                Claim
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ClientLead {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  pan_card: string | null;
  gstn: string | null;
  unit_code: string;
  profile_complete: boolean;
  profile_missing: string[];
  request_count: number;
  last_request: { id: string; request_no: string; status: string; created_at: string } | null;
  lead_notes: { at: string; by: string; text: string }[];
  registered_at: string;
  last_login_at: string | null;
}

function ClientLeads() {
  const [onlyPending, setOnlyPending] = useState(true);
  const { data, isLoading } = useClientLeads(onlyPending ? 'pending' : 'all');
  const leads: ClientLead[] = Array.isArray(data) ? data : [];
  const [editing, setEditing] = useState<ClientLead | null>(null);

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} className="rounded" />
        Only clients with a missing profile or no request yet
      </label>
      {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>}
      {!isLoading && leads.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No client sign-ups to follow up</p>
      )}
      <div className="space-y-2">
        {leads.map((c) => (
          <div key={c.id} className="glass-card rounded-lg p-4 flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold truncate">{c.name || 'Name not given yet'}</span>
                {c.profile_complete ? (
                  <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                    Profile done
                  </span>
                ) : (
                  <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                    Missing {c.profile_missing.join(', ')}
                  </span>
                )}
                <span className="font-mono text-xs text-muted-foreground">{c.unit_code}</span>
              </div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {c.phone ? <a href={`tel:${c.phone}`} className="hover:text-primary">{c.phone}</a> : '—'}
                {c.city ? <span>· {c.city}</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                registered {fToNow(c.registered_at)} ·{' '}
                {c.last_request ? (
                  <Link href={`/rm/requests/${c.last_request.id}`} className="hover:text-primary">
                    {c.request_count} request{c.request_count === 1 ? '' : 's'} — {c.last_request.request_no} ({c.last_request.status})
                  </Link>
                ) : (
                  'no staff request yet'
                )}
              </p>
              {c.lead_notes.length > 0 && (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    {c.lead_notes[c.lead_notes.length - 1].text}{' '}
                    <span className="opacity-70">({fToNow(c.lead_notes[c.lead_notes.length - 1].at)})</span>
                  </span>
                </p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit / note
            </Button>
          </div>
        ))}
      </div>
      {editing && <ClientLeadModal lead={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

const CLIENT_FIELDS: { key: string; label: string; placeholder?: string; wide?: boolean }[] = [
  { key: 'full_name', label: 'Name', placeholder: 'Full name or household name' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address', wide: true },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'pincode', label: 'Pincode', placeholder: '6 digits' },
  { key: 'pan_card', label: 'PAN', placeholder: 'ABCDE1234F' },
  { key: 'gstn', label: 'GSTN (business clients)' },
];

function ClientLeadModal({ lead, onClose }: { lead: ClientLead; onClose: () => void }) {
  const update = useUpdateClientLead();
  const [values, setValues] = useState<Record<string, string>>({
    full_name: lead.name ?? '',
    email: lead.email ?? '',
    address: lead.address ?? '',
    city: lead.city ?? '',
    state: lead.state ?? '',
    pincode: lead.pincode ?? '',
    pan_card: lead.pan_card ?? '',
    gstn: lead.gstn ?? '',
    note: '',
  });
  const set = (k: string, v: string) => setValues((prev) => ({ ...prev, [k]: v }));

  const save = () => {
    // Only what changed — a blank field means "leave as is" on the server.
    const original: Record<string, string> = {
      full_name: lead.name ?? '', email: lead.email ?? '', address: lead.address ?? '', city: lead.city ?? '',
      state: lead.state ?? '', pincode: lead.pincode ?? '', pan_card: lead.pan_card ?? '', gstn: lead.gstn ?? '',
    };
    const body: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      if (k === 'note' ? v.trim() : v.trim() && v.trim() !== original[k]) body[k] = v.trim();
    }
    if (!Object.keys(body).length) {
      onClose();
      return;
    }
    update.mutate(
      { id: lead.id, body },
      {
        onSuccess: () => {
          toast.success('Client updated');
          onClose();
        },
        onError: (e: Error) => toast.error(e.message, { duration: 8000 }),
      },
    );
  };

  return (
    <Modal open onClose={onClose} title={`Client lead · ${lead.phone ?? ''}`} className="max-w-2xl">
      <div className="grid gap-3 md:grid-cols-2">
        {CLIENT_FIELDS.map((f) => (
          <div key={f.key} className={f.wide ? 'md:col-span-2' : undefined}>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{f.label}</label>
            <Input value={values[f.key]} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
          </div>
        ))}
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Call note</label>
          <textarea
            className="min-h-[70px] w-full rounded-lg border border-white/10 bg-card px-3 py-2 text-sm"
            placeholder="e.g. Needs a cook from next month, call back Friday"
            value={values.note}
            onChange={(e) => set('note', e.target.value)}
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save'}</Button>
      </div>
    </Modal>
  );
}
