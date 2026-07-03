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
} from 'lucide-react';
import toast from 'react-hot-toast';

interface VideoCert {
  id: string;
  staffId: string;
  promptKey: string;
  videoUrl: string;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  attemptNumber: number;
  reviewNotes?: string;
  neverDelete: boolean;
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

function ReviewModal({
  cert,
  onClose,
  onDecision,
}: {
  cert: VideoCert;
  onClose: () => void;
  onDecision: (id: string, status: 'APPROVED' | 'REJECTED', notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getVideoCertViewUrl(cert.videoUrl);
        const url = res?.data?.url ?? res?.url;
        if (!cancelled) setPlaybackUrl(url ?? null);
      } catch {
        if (!cancelled) setPlaybackUrl(null);
      } finally {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0e1420] border border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-bold text-white text-lg">Video Review</h2>
            <p className="text-xs text-[#8D9AB5] mt-0.5">
              {cert.promptKey} · Attempt #{cert.attemptNumber}
              {cert.staff && ` · ${cert.staff.fullName} (${cert.staff.staffCode})`}
            </p>
          </div>
          <button onClick={onClose} className="text-[#8D9AB5] hover:text-white text-xl w-8 h-8 flex items-center justify-center">×</button>
        </div>

        <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
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

        {cert.reviewStatus === 'PENDING' ? (
          <>
            <div>
              <label className="text-xs font-semibold text-[#8D9AB5] mb-1 block">Review Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Optional feedback for the staff member…"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#E8EDF8] focus:outline-none focus:border-primary/50 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={onClose} variant="outline" className="flex-1 border-white/15 text-[#8D9AB5]">Cancel</Button>
              <Button
                onClick={() => decide('REJECTED')}
                disabled={saving}
                variant="outline"
                className="flex-1 border-rose-500/30 bg-rose-500/10 text-rose-400"
              >
                <XCircle className="w-4 h-4 mr-2" /> Reject
              </Button>
              <Button
                onClick={() => decide('APPROVED')}
                disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Approve
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Badge className={STATUS_STYLES[cert.reviewStatus].className}>
              {STATUS_STYLES[cert.reviewStatus].label}
            </Badge>
            {cert.reviewNotes && (
              <p className="text-sm text-[#8D9AB5]">{cert.reviewNotes}</p>
            )}
            <Button onClick={onClose} variant="outline" className="w-full border-white/15 text-[#8D9AB5]">Close</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminVideoCertificationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
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
      toast.success('Review submitted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'video-certifications'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Review failed'),
  });

  const handleDecision = async (id: string, status: 'APPROVED' | 'REJECTED', notes: string) => {
    await reviewMutation.mutateAsync({ id, status, notes });
  };

  return (
    <div className="p-8 space-y-8 min-h-screen text-[#E8EDF8]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#E8EDF8]">Video Certifications</h1>
          <p className="text-[#8D9AB5] mt-1 text-sm">Global certification compliance and integrity monitoring.</p>
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
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((f) => (
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
            Global Certifications & Integrity Monitoring
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
                    <th className="pb-3 pr-4 font-medium">Prompt</th>
                    <th className="pb-3 pr-4 font-medium">Attempt</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Submitted</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {certs.map((cert) => {
                    const style = STATUS_STYLES[cert.reviewStatus];
                    return (
                      <tr key={cert.id} className="border-b border-border/20 hover:bg-[#1C2740]/40">
                        <td className="py-3 pr-4">
                          <div className="font-medium text-[#E8EDF8]">{cert.staff?.fullName ?? '—'}</div>
                          <div className="text-xs text-[#8D9AB5] flex items-center gap-2">
                            {cert.staff?.staffCode}
                            {cert.staff?.series && (
                              <Badge variant="outline" className="text-[9px] py-0 border-border/60">{cert.staff.series}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-[#8D9AB5] max-w-[200px] truncate" title={cert.promptKey}>
                          {cert.promptKey}
                        </td>
                        <td className="py-3 pr-4 text-[#8D9AB5]">#{cert.attemptNumber}</td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Badge className={style.className}>{style.label}</Badge>
                            {cert.neverDelete && (
                              <Lock className="h-3 w-3 text-amber-400" title="Fraud lock — never delete" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-xs text-[#8D9AB5]">
                          {new Date(cert.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </td>
                        <td className="py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReviewing(cert)}
                            className="border-border/60 text-[#8D9AB5] hover:text-[#E8EDF8]"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {cert.reviewStatus === 'PENDING' ? 'Review' : 'View'}
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
        <ReviewModal
          cert={reviewing}
          onClose={() => setReviewing(null)}
          onDecision={handleDecision}
        />
      )}
    </div>
  );
}
