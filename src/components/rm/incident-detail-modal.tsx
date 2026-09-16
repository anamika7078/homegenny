'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertTriangle, Lock, MessageSquare, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth.store';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { fToNow } from '@/lib/utils/format';
import {
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_STYLES,
  INCIDENT_TYPE_LABELS,
  canDoIncidentAction,
} from '@/lib/rm/incident-constants';

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF5A1F]/50';

type Incident = Record<string, any>;

/**
 * The incident workflow, which until now existed only on the server.
 *
 * `/v1/incidents/:id/{acknowledge,escalate,resolve,close,comment,legal-hold}`
 * were all implemented and guarded backend-side but had no caller in either
 * the web app or the Flutter app — an RM could see and raise an incident and
 * then had no way to do anything about it. Every button here is gated on both
 * the caller's role and the incident's current status, mirroring the server's
 * own guards so an illegal move is not offered rather than 400-ing.
 */
export function IncidentDetailModal({
  incidentId,
  onClose,
}: {
  incidentId: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const [comment, setComment] = useState('');
  const [resolution, setResolution] = useState('');
  const [showResolve, setShowResolve] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: () => api.getIncident(incidentId as string),
    enabled: !!incidentId,
  });

  const incident: Incident =
    (data as { data?: Incident })?.data ?? (data as Incident) ?? {};
  const status = incident.status as string | undefined;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['incident', incidentId] });
    qc.invalidateQueries({ queryKey: ['rm-incidents'] });
    qc.invalidateQueries({ queryKey: ['incidents'] });
    qc.invalidateQueries({ queryKey: ['rm-dashboard'] });
  };

  const act = useMutation({
    mutationFn: async (action: string) => {
      if (!incidentId) return;
      switch (action) {
        case 'acknowledge': return api.acknowledgeIncident(incidentId);
        case 'escalate':    return api.escalateIncident(incidentId);
        case 'close':       return api.closeIncident(incidentId);
        case 'resolve':     return api.resolveIncident(incidentId, resolution.trim());
        default: throw new Error(`Unknown action ${action}`);
      }
    },
    onSuccess: (_d, action) => {
      toast.success(
        action === 'acknowledge' ? 'Marked as investigating'
          : action === 'escalate' ? 'Escalated to Branch Manager'
          : action === 'resolve' ? 'Incident resolved'
          : 'Incident closed',
      );
      setShowResolve(false);
      setResolution('');
      refresh();
    },
    onError: (e: Error) => toast.error(e.message || 'Action failed'),
  });

  const addComment = useMutation({
    mutationFn: () => api.commentOnIncident(incidentId as string, comment.trim()),
    onSuccess: () => { setComment(''); toast.success('Comment added'); refresh(); },
    onError: (e: Error) => toast.error(e.message || 'Could not add comment'),
  });

  const legalHold = useMutation({
    mutationFn: (hold: boolean) => api.setIncidentLegalHold(incidentId as string, hold),
    onSuccess: () => { toast.success('Legal hold updated'); refresh(); },
    onError: (e: Error) => toast.error(e.message || 'Could not update legal hold'),
  });

  const comments: Incident[] = Array.isArray(incident.comments) ? incident.comments : [];
  const busy = act.isPending || addComment.isPending || legalHold.isPending;

  return (
    <Modal
      open={!!incidentId}
      onClose={onClose}
      title="Incident"
      className="max-w-2xl"
    >
      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* ── header ─────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold text-white">{incident.title}</h3>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  INCIDENT_STATUS_STYLES[status ?? ''] ?? 'bg-white/10 text-muted-foreground border-white/15'
                }`}
              >
                {INCIDENT_STATUS_LABELS[status ?? ''] ?? status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {INCIDENT_TYPE_LABELS[incident.type] ?? incident.type}
              {incident.createdAt ? ` · raised ${fToNow(String(incident.createdAt))}` : ''}
            </p>
            {incident.legalHold && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                <Lock className="h-3.5 w-3.5" /> Legal hold is active
              </p>
            )}
          </div>

          {incident.staff && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
              <p className="font-medium text-white">
                {incident.staff.fullName}{' '}
                <span className="font-mono text-xs text-muted-foreground">
                  {incident.staff.staffCode}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {incident.staff.series}
                {incident.staff.pipelineStage ? ` · ${incident.staff.pipelineStage}` : ''}
              </p>
            </div>
          )}

          {incident.description && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{incident.description}</p>
          )}

          {Array.isArray(incident.evidenceUrls) && incident.evidenceUrls.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Evidence</p>
              {incident.evidenceUrls.map((u: string) => (
                <a key={u} href={u} target="_blank" rel="noopener noreferrer"
                   className="block truncate text-xs text-[#FF5A1F] hover:underline">{u}</a>
              ))}
            </div>
          )}

          {incident.resolution && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
              <p className="text-xs font-semibold text-emerald-300">Resolution</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-emerald-100/90">{incident.resolution}</p>
            </div>
          )}

          {/* ── actions ────────────────────────────────────────────────── */}
          <div className="space-y-2 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold text-muted-foreground">Actions</p>
            <div className="flex flex-wrap gap-2">
              {canDoIncidentAction('acknowledge', status, role) && (
                <Button variant="outline" disabled={busy} onClick={() => act.mutate('acknowledge')}>
                  Acknowledge
                </Button>
              )}
              {canDoIncidentAction('escalate', status, role) && (
                <Button variant="outline" disabled={busy} onClick={() => act.mutate('escalate')}>
                  <ShieldAlert className="h-4 w-4" /> Escalate to BM
                </Button>
              )}
              {canDoIncidentAction('resolve', status, role) && !showResolve && (
                <Button disabled={busy} onClick={() => setShowResolve(true)}>Resolve</Button>
              )}
              {canDoIncidentAction('close', status, role) && (
                <Button disabled={busy} onClick={() => act.mutate('close')}>Close</Button>
              )}
              {canDoIncidentAction('legalHold', status, role) && (
                <Button variant="outline" disabled={busy}
                        onClick={() => legalHold.mutate(!incident.legalHold)}>
                  <Lock className="h-4 w-4" />
                  {incident.legalHold ? 'Clear legal hold' : 'Set legal hold'}
                </Button>
              )}
            </div>

            {showResolve && (
              <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
                <label className="text-xs font-semibold text-muted-foreground">
                  Resolution note (required)
                </label>
                <textarea
                  className={inputCls}
                  rows={3}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="What was done to resolve this?"
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setShowResolve(false); setResolution(''); }}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!resolution.trim() || busy}
                    onClick={() => act.mutate('resolve')}
                  >
                    {act.isPending ? 'Resolving…' : 'Confirm resolution'}
                  </Button>
                </div>
              </div>
            )}

            {status === 'CLOSED' && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5" /> Closed incidents cannot be reopened here.
              </p>
            )}
          </div>

          {/* ── comments ───────────────────────────────────────────────── */}
          <div className="space-y-2 border-t border-white/10 pt-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" /> Comments ({comments.length})
            </p>
            {comments.length === 0 && (
              <p className="text-xs text-muted-foreground">No comments yet.</p>
            )}
            {comments.map((c) => (
              <div key={String(c.id)} className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {c.createdAt ? fToNow(String(c.createdAt)) : ''}
                </p>
              </div>
            ))}
            {canDoIncidentAction('comment', status, role) && (
              <div className="flex gap-2 pt-1">
                <input
                  className={inputCls}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a note…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && comment.trim() && !busy) addComment.mutate();
                  }}
                />
                <Button disabled={!comment.trim() || busy} onClick={() => addComment.mutate()}>
                  Post
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
