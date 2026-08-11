"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from '@/lib/api/client';
import {
  Video,
  RefreshCw,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Lock,
  ShieldAlert,
  FileText,
  AlertTriangle,
  Scale
} from 'lucide-react';
import toast from 'react-hot-toast';

interface VideoCert {
  id: string;
  staffId: string;
  promptKey: string;
  videoUrl: string;
  sha256Hash?: string;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  attemptNumber: number;
  reviewNotes?: string;
  neverDelete: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  staff?: {
    id: string;
    fullName: string;
    staffCode: string;
    series: string;
  };
}

const STATUS_STYLES = {
  PENDING: { className: 'border-amber-500/30 text-amber-400 bg-amber-500/10', label: 'Pending' },
  APPROVED: { className: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10', label: 'Approved' },
  REJECTED: { className: 'border-rose-500/30 text-rose-400 bg-rose-500/10', label: 'Rejected' },
};

function ReviewAndOverrideModal({
  cert,
  onClose,
  onDecision,
  onOverride,
}: {
  cert: VideoCert;
  onClose: () => void;
  onDecision: (id: string, status: 'APPROVED' | 'REJECTED', notes: string) => Promise<void>;
  onOverride: (id: string, body: { neverDelete: boolean; reviewNotes?: string; fraudFlag?: boolean; legalHold?: boolean; legalReason?: string }) => Promise<void>;
}) {
  const [notes, setNotes] = useState(cert.reviewNotes || '');
  const [saving, setSaving] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(true);

  // Override Form State
  const [neverDelete, setNeverDelete] = useState(cert.neverDelete ?? true);
  const [fraudFlag, setFraudFlag] = useState(Boolean(cert.metadata?.fraudFlag));
  const [legalHold, setLegalHold] = useState(Boolean(cert.metadata?.legalHold));
  const [legalReason, setLegalReason] = useState(cert.metadata?.legalReason || '');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getVideoCertViewUrl(cert.videoUrl);
        const url = res?.data?.url ?? res?.url;
        if (!cancelled) setPlaybackUrl(url ?? null);
      } catch {
        if (!cancelled) setPlaybackUrl(null);
      } font: {
        if (!cancelled) setLoadingVideo(false);
      }
    })();
    return () => { cancelled = true; };
  }, [cert.videoUrl]);

  const decide = async (status: 'APPROVED' | 'REJECTED') => {
    setSaving(true);
    try {
      await onDecision(cert.id, status, notes);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleApplyOverride = async () => {
    setSaving(true);
    try {
      await onOverride(cert.id, {
        neverDelete,
        reviewNotes: notes,
        fraudFlag,
        legalHold,
        legalReason,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-[#0E1420] border border-white/15 rounded-2xl p-6 space-y-5 my-8">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" /> Video Certification &amp; Fraud Override
            </h2>
            <p className="text-xs text-[#8D9AB5] mt-0.5 font-mono">
              {cert.promptKey} · Attempt #{cert.attemptNumber}
              {cert.staff && ` · ${cert.staff.fullName} (${cert.staff.staffCode})`}
            </p>
          </div>
          <button onClick={onClose} className="text-[#8D9AB5] hover:text-white text-xl w-8 h-8 flex items-center justify-center">×</button>
        </div>

        {/* Video Player */}
        <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-white/10">
          {loadingVideo ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          ) : playbackUrl ? (
            <video controls className="w-full h-full" src={playbackUrl}>
              Your browser does not support video playback.
            </video>
          ) : (
            <p className="text-sm text-[#8D9AB5]">Unable to load video playback URL</p>
          )}
        </div>

        {/* Immutability Banner */}
        <div className="bg-slate-900/80 border border-slate-700/60 p-3 rounded-xl flex items-start gap-2.5 text-xs text-[#8D9AB5]">
          <Lock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-[#E8EDF8]">Content Immutability Protected:</span> Video media content (video URL, SHA256 hash) is strictly immutable and cannot be deleted or modified. Only metadata flags can be updated.
          </div>
        </div>

        {/* Legal / Fraud Override Controls */}
        <div className="bg-amber-950/20 border border-amber-800/40 p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Scale className="h-4 w-4 text-amber-400" /> Fraud / Legal Case Override
          </div>

          <div className="flex items-center justify-between py-1 border-b border-amber-900/40 text-xs">
            <div>
              <span className="font-medium text-[#E8EDF8] block">Flag as never_delete = true</span>
              <span className="text-[11px] text-[#8D9AB5]">Prevents data deletion in exceptional legal or fraud cases</span>
            </div>
            <input
              type="checkbox"
              checked={neverDelete}
              onChange={e => setNeverDelete(e.target.checked)}
              className="h-4 w-4 accent-amber-500 rounded cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-2 text-xs text-[#E8EDF8] cursor-pointer">
              <input
                type="checkbox"
                checked={fraudFlag}
                onChange={e => setFraudFlag(e.target.checked)}
                className="h-3.5 w-3.5 accent-rose-500 rounded"
              />
              <span className="text-rose-300 font-medium">Fraud Investigation Flag</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-[#E8EDF8] cursor-pointer">
              <input
                type="checkbox"
                checked={legalHold}
                onChange={e => setLegalHold(e.target.checked)}
                className="h-3.5 w-3.5 accent-purple-500 rounded"
              />
              <span className="text-purple-300 font-medium">Legal Hold Lock</span>
            </label>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#8D9AB5] block">Legal / Fraud Case Reason</label>
            <Input
              value={legalReason}
              onChange={e => setLegalReason(e.target.value)}
              placeholder="e.g. Case #FL-2026: Impersonation / Document forgery under investigation"
              className="bg-[#0F172A]/80 border-border/60 text-xs text-[#E8EDF8]"
            />
          </div>
        </div>

        {/* Review Notes */}
        <div>
          <label className="text-xs font-semibold text-[#8D9AB5] mb-1 block">Review Notes / Audit Remarks</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Feedback notes or legal review remarks…"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-[#E8EDF8] focus:outline-none focus:border-primary/50 resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button onClick={onClose} variant="outline" className="border-white/15 text-[#8D9AB5]">Cancel</Button>
          
          {cert.reviewStatus === 'PENDING' && (
            <>
              <Button
                onClick={() => decide('REJECTED')}
                disabled={saving}
                variant="outline"
                className="border-rose-500/30 bg-rose-500/10 text-rose-400"
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Reject Cert
              </Button>
              <Button
                onClick={() => decide('APPROVED')}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-1.5" /> Approve Cert
              </Button>
            </>
          )}

          <Button
            onClick={handleApplyOverride}
            disabled={saving}
            className="bg-amber-600 hover:bg-amber-700 text-white shadow-md font-semibold ml-auto"
          >
            <ShieldAlert className="w-4 h-4 mr-1.5" /> Apply Legal Override
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminVideoCertificationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [reviewing, setReviewing] = useState<VideoCert | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'video-certifications', filter, search],
    queryFn: () => api.getAdminVideoCertifications({
      status: filter === 'ALL' ? undefined : filter,
      search: search || undefined,
      limit: 100,
    }),
    refetchInterval: 60_000,
  });

  const payload = data?.data ?? data ?? {};
  const certs: VideoCert[] = payload.items ?? [];
  const counts = payload.counts ?? { ALL: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 };

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: 'APPROVED' | 'REJECTED'; notes?: string }) =>
      api.reviewAdminVideoCertification(id, { status, notes }),
    onSuccess: () => {
      toast.success('Review submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'video-certifications'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Review failed'),
  });

  const overrideMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      api.overrideAdminVideoCertification(id, body),
    onSuccess: () => {
      toast.success('Video cert metadata & never_delete flag updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'video-certifications'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Override failed'),
  });

  const handleDecision = async (id: string, status: 'APPROVED' | 'REJECTED', notes: string) => {
    await reviewMutation.mutateAsync({ id, status, notes });
  };

  const handleOverride = async (id: string, body: any) => {
    await overrideMutation.mutateAsync({ id, body });
  };

  return (
    <div className="page-padding space-y-6 sm:space-y-8 min-h-screen text-[#E8EDF8]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#E8EDF8]">Video Certifications &amp; Legal Override</h1>
          <p className="text-[#8D9AB5] mt-1 text-sm">Global video certification integrity, fraud investigation locks, and immutable retention management.</p>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="border-border/60 hover:bg-[#1C2740] hover:text-white transition-all text-[#8D9AB5] bg-transparent"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                filter === f
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border/60 bg-card/40 text-[#8D9AB5] hover:text-[#E8EDF8]'
              }`}
            >
              {f} <span className="ml-1 opacity-70">({counts[f] ?? 0})</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8D9AB5]" />
          <Input
            placeholder="Search staff name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/40 border-border/60 text-[#E8EDF8] placeholder:text-[#8D9AB5]"
          />
        </div>
      </div>

      <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
        <CardHeader className="pb-6 border-b border-border/40">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-[#E8EDF8]">
            <Video className="h-5 w-5 text-primary" />
            Global Certification Records
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : certs.length === 0 ? (
            <div className="text-center py-16">
              <Video className="w-12 h-12 text-[#8D9AB5] mx-auto mb-3 opacity-40" />
              <p className="text-[#8D9AB5]">
                {filter === 'PENDING' ? 'No videos awaiting review' : `No ${filter.toLowerCase()} certifications`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#8D9AB5] border-b border-border/40">
                    <th className="pb-3 pr-4 font-medium">Staff</th>
                    <th className="pb-3 pr-4 font-medium">Prompt Key</th>
                    <th className="pb-3 pr-4 font-medium">Attempt</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Legal / Retention Lock</th>
                    <th className="pb-3 pr-4 font-medium">Submitted</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {certs.map((cert) => {
                    const style = STATUS_STYLES[cert.reviewStatus];
                    const isFraud = Boolean(cert.metadata?.fraudFlag);
                    const isLegal = Boolean(cert.metadata?.legalHold);

                    return (
                      <tr key={cert.id} className="border-b border-border/20 hover:bg-[#1C2740]/40">
                        <td className="py-3 pr-4">
                          <div className="font-medium text-[#E8EDF8]">{cert.staff?.fullName ?? '—'}</div>
                          <div className="text-xs text-[#8D9AB5] flex items-center gap-2 font-mono">
                            {cert.staff?.staffCode}
                            {cert.staff?.series && (
                              <Badge variant="outline" className="text-[9px] py-0 border-border/60">{cert.staff.series}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-[#8D9AB5] max-w-[180px] truncate font-mono text-xs" title={cert.promptKey}>
                          {cert.promptKey}
                        </td>
                        <td className="py-3 pr-4 text-[#8D9AB5] font-mono text-xs">#{cert.attemptNumber}</td>
                        <td className="py-3 pr-4">
                          <Badge className={style.className}>{style.label}</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {cert.neverDelete && (
                              <Badge className="bg-amber-950/80 text-amber-300 border border-amber-800/40 text-[10px] flex items-center gap-1">
                                <Lock className="h-2.5 w-2.5 text-amber-400" /> never_delete=true
                              </Badge>
                            )}
                            {isFraud && (
                              <Badge className="bg-rose-950/80 text-rose-300 border border-rose-800/40 text-[10px]">
                                Fraud Hold
                              </Badge>
                            )}
                            {isLegal && (
                              <Badge className="bg-purple-950/80 text-purple-300 border border-purple-800/40 text-[10px]">
                                Legal Hold
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-xs text-[#8D9AB5] font-mono">
                          {new Date(cert.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReviewing(cert)}
                            className="border-border/60 text-[#8D9AB5] hover:text-[#E8EDF8]"
                          >
                            <Eye className="h-3 w-3 mr-1" /> View / Override
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {reviewing && (
        <ReviewAndOverrideModal
          cert={reviewing}
          onClose={() => setReviewing(null)}
          onDecision={handleDecision}
          onOverride={handleOverride}
        />
      )}
    </div>
  );
}
