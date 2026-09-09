'use client';

/**
 * The second half of onboarding: the papers.
 *
 * Documents hang off an `employees` row (employee_documents.employee_id is NOT
 * NULL), so they cannot be attached until the record exists. Rather than send
 * HR to a different screen afterwards — which is how people end up onboarded
 * with nothing on file — the record is created first and this opens in the
 * same dialog, already knowing which documents this category owes.
 *
 * What lands here shows up immediately at /staff/documents for the staff
 * member themselves.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api/client';
import {
  Loader2, Upload, Check, AlertCircle, FileText, X, ChevronRight,
} from 'lucide-react';

interface Checklist {
  employeeId: string;
  category: string | null;
  required: string[];
  missing: string[];
  uploaded: { id: string; type: string; status: string; uploadedAt: string }[];
  complete: boolean;
}

export function DocumentUploadStep({
  employeeId,
  employeeName,
  employeeCode,
  onDone,
}: {
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  onDone: () => void;
}) {
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    try {
      const res: any = await api.getDocumentChecklist(employeeId);
      setChecklist(res?.data ?? res);
    } catch (e: any) {
      setError(e?.response?.data?.message?.message ?? e.message ?? 'Could not load the document list.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  const upload = async (type: string, file: File) => {
    setUploading(type);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      await api.uploadDocument(employeeId, fd);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? `Could not upload the ${type}.`);
    } finally {
      setUploading(null);
    }
  };

  const uploadedTypes = new Set((checklist?.uploaded ?? []).map((d) => d.type));
  // Required first, then anything extra that was uploaded anyway.
  const rows = [
    ...(checklist?.required ?? []),
    ...(checklist?.uploaded ?? [])
      .map((d) => d.type)
      .filter((t) => !(checklist?.required ?? []).includes(t)),
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-white">Documents</h3>
        <p className="mt-0.5 text-sm text-secondary-foreground">
          {employeeName}{employeeCode ? ` · ${employeeCode}` : ''} is on the books now.
          {checklist?.category && (
            <> A {checklist.category.toLowerCase()} needs the papers below.</>
          )}
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-secondary-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the list…
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((type) => {
            const done = uploadedTypes.has(type);
            const busy = uploading === type;
            return (
              <div
                key={type}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 ${
                  done ? 'border-emerald-500/25 bg-emerald-500/[0.06]' : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  {done ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                  )}
                  <span className={`truncate ${done ? 'text-emerald-300' : 'text-white'}`}>{type}</span>
                </span>

                <input
                  ref={(el) => { inputs.current[type] = el; }}
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(type, f);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => inputs.current[type]?.click()}
                  disabled={busy}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5
                             text-xs font-semibold text-slate-300 transition hover:bg-white/8 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {done ? 'Replace' : 'Upload'}
                </button>
              </div>
            );
          })}

          {!rows.length && (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-500">
              No documents are required for this category.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-4">
        <p className="text-xs text-secondary-foreground">
          {checklist?.complete ? (
            <span className="text-emerald-400">Everything required is on file.</span>
          ) : (
            <>
              {checklist?.missing.length ?? 0} still missing — you can add them later from the
              employee&apos;s Documents page.
            </>
          )}
        </p>
        <button
          type="button"
          onClick={onDone}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold
                     text-primary-foreground transition hover:opacity-90"
        >
          Done
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
