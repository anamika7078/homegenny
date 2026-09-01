'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react';
import { api } from '@/lib/api/client';
import { RmListPage } from '@/components/rm/rm-list-page';
import { Button } from '@/components/ui/button';

const INCIDENT_TYPES = [
  { value: 'CLIENT_COMPLAINT', label: 'Client Complaint' },
  { value: 'STAFF_MISCONDUCT', label: 'Staff Misconduct' },
  { value: 'SAFETY_ISSUE', label: 'Safety Issue' },
  { value: 'ATTENDANCE_FRAUD', label: 'Attendance Fraud' },
  { value: 'DRIVING_VIOLATION', label: 'Driving Violation' },
  { value: 'LATE_EXIT', label: 'Late Exit' },
];

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF5A1F]/50';

function NewIncidentModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState(INCIDENT_TYPES[0].value);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [staffId, setStaffId] = useState('');
  const qc = useQueryClient();

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
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to raise incident'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-[#0E1420] border border-white/15 rounded-2xl p-6 space-y-4 my-8">
        <div className="flex justify-between items-start">
          <h2 className="font-bold text-white text-lg">Raise Incident</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white">
            <X className="w-5 h-5" />
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
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Description (optional)</label>
          <textarea className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Staff ID (optional)</label>
          <input className={inputCls} value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="Linked staff member" />
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

  return (
    <>
      <RmListPage
        title="Incidents"
        description="Complaints, misconduct, safety, attendance fraud"
        queryKey={['rm-incidents']}
        queryFn={() => api.getRmIncidents()}
        emptyMessage="No open incidents"
        renderItem={(i) => (
          <div key={String(i.id)} className="glass-card rounded-lg p-4">
            <div className="flex justify-between gap-2">
              <p className="font-semibold">{String(i.title)}</p>
              <span className="text-xs uppercase text-destructive">{String(i.status)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{String(i.type)}</p>
          </div>
        )}
      />
      <div className="fixed bottom-6 right-6">
        <Button onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4" /> Raise Incident
        </Button>
      </div>
      {showNew && <NewIncidentModal onClose={() => setShowNew(false)} />}
    </>
  );
}
