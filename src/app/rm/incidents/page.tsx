'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Lock, MessageSquare, Plus, X } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useRmStaffList } from '@/lib/rm/hooks';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { TableSkeleton } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { IncidentDetailModal } from '@/components/rm/incident-detail-modal';
import { fToNow } from '@/lib/utils/format';
import {
  INCIDENT_STATUSES,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_STYLES,
  INCIDENT_TYPES,
  INCIDENT_TYPE_LABELS,
} from '@/lib/rm/incident-constants';

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF5A1F]/50';

type StaffOption = { id: string; staff_code?: string; full_name?: string; series?: string };

function NewIncidentModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<string>(INCIDENT_TYPES[0].value);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [staffId, setStaffId] = useState('');
  const qc = useQueryClient();

  // Same source the RM staff list page uses — scoped server-side, so an RM
  // only ever sees their own assigned staff here. This replaced a free-text
  // "Staff ID" box that asked the user to paste a UUID by hand.
  const { data: staffData, isLoading: staffLoading } = useRmStaffList({ limit: 200 });
  const staffOptions: StaffOption[] =
    (staffData as { data?: { items?: StaffOption[] } })?.data?.items ??
    (staffData as { items?: StaffOption[] })?.items ??
    [];

  const create = useMutation({
    mutationFn: () =>
      api.createRmIncident({
        type,
        title,
        description: description || undefined,
        staff_id: staffId || undefined,
      }),
    onSuccess: () => {
      toast.success('Incident raised');
      qc.invalidateQueries({ queryKey: ['rm-incidents'] });
      qc.invalidateQueries({ queryKey: ['rm-dashboard'] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to raise incident'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-md space-y-4 rounded-2xl border border-white/15 bg-[#0E1420] p-6">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-bold text-white">Raise Incident</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
            {INCIDENT_TYPES.map((t) => (
              <option key={t.value} value={t.value} className="bg-[#0E1420]">
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Title</label>
          <input
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short summary"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Description (optional)</label>
          <textarea className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Staff member</label>
          <select
            className={inputCls}
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            disabled={staffLoading}
          >
            <option value="" className="bg-[#0E1420]">
              {staffLoading ? 'Loading staff…' : '— Not linked to a staff member —'}
            </option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#0E1420]">
                {[s.staff_code, s.full_name].filter(Boolean).join(' · ')}
                {s.series ? ` (${s.series})` : ''}
              </option>
            ))}
          </select>
          {!staffLoading && staffOptions.length === 0 && (
            <p className="text-xs text-amber-400">No staff assigned to you yet.</p>
          )}
        </div>

        {create.isError && <p className="text-xs text-red-400">{create.error.message}</p>}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={!title || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Raising…' : 'Raise Incident'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function RmIncidentsPage() {
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [openId, setOpenId] = useState<string | null>(null);

  // /rm/incidents is the RM-scoped inbox; the same rows carry the status
  // machine that IncidentDetailModal drives via /v1/incidents/:id/*.
  const { data, isLoading } = useQuery({
    queryKey: ['rm-incidents', statusFilter],
    queryFn: () => api.getRmIncidents(statusFilter || undefined),
  });

  const items: Record<string, any>[] = Array.isArray(data)
    ? data
    : ((data as { data?: any[] })?.data ?? (data as { items?: any[] })?.items ?? []);

  return (
    <div className="page-padding">
      <RmPageHeader
        title="Incidents"
        description="Complaints, misconduct, safety, attendance fraud — acknowledge, escalate, resolve"
        actions={
          <Button onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4" /> Raise Incident
          </Button>
        }
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {[{ value: '', label: 'All' }, ...INCIDENT_STATUSES.map((s) => ({ value: s, label: INCIDENT_STATUS_LABELS[s] }))].map(
          (t) => (
            <button
              key={t.value || 'all'}
              type="button"
              onClick={() => setStatusFilter(t.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === t.value
                  ? 'bg-[#FF5A1F] text-white'
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ),
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : items.length === 0 ? (
        <div className="glass-card rounded-xl py-16 text-center text-muted-foreground">
          {statusFilter ? `No ${INCIDENT_STATUS_LABELS[statusFilter]?.toLowerCase()} incidents` : 'No incidents'}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <button
              key={String(i.id)}
              type="button"
              onClick={() => setOpenId(String(i.id))}
              className="glass-card w-full rounded-lg p-4 text-left transition-colors hover:border-primary/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold">{String(i.title)}</p>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                    INCIDENT_STATUS_STYLES[i.status] ?? 'border-white/15 bg-white/10 text-muted-foreground'
                  }`}
                >
                  {INCIDENT_STATUS_LABELS[i.status] ?? String(i.status)}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {INCIDENT_TYPE_LABELS[i.type] ?? String(i.type)}
                {i.staff ? ` · ${i.staff.fullName} (${i.staff.staffCode})` : ''}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                {i.createdAt && <span>{fToNow(String(i.createdAt))}</span>}
                {i._count?.comments > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> {i._count.comments}
                  </span>
                )}
                {i.legalHold && (
                  <span className="inline-flex items-center gap-1 font-semibold text-rose-300">
                    <Lock className="h-3 w-3" /> Legal hold
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {showNew && <NewIncidentModal onClose={() => setShowNew(false)} />}
      <IncidentDetailModal incidentId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
