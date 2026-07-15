'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, BASE_URL, tokenStore } from '@/lib/api/client';
import { Spinner } from '@/components/ui/loading';
import { FileText, ArrowLeft, AlertTriangle, Eye, Download, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  DOC_LABELS,
  DOC_TYPE_FROM_API,
  DOC_TYPE_TO_API,
  unwrapData,
  unwrapItems,
} from '@/lib/hr/utils';

const BASE_DOC_KEYS = ['aadhaar', 'pan', 'photo', 'police_verification'] as const;

async function openDocument(docId: string, mode: 'preview' | 'download', filename?: string) {
  const token = tokenStore.getAccess();
  const res = await fetch(`${BASE_URL}/documents/${docId}/${mode}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Could not open document');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (mode === 'download') {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename ?? 'document';
    a.click();
  } else {
    window.open(url, '_blank');
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function isUnavailableDoc(doc: any): boolean {
  return doc?.status === 'Not Available' || doc?.fileUrl === 'unavailable';
}

function getUnavailableRemark(doc: any): string {
  return String(doc?.metadata?.remark ?? '').trim();
}

function emptyPending() {
  return {
    aadhaar: { file: null as File | null },
    pan: { file: null as File | null },
    photo: { file: null as File | null },
    police_verification: { file: null as File | null },
    driving_license: { file: null as File | null, expiry: '', issue: '' },
  };
}

function emptyUnavailable() {
  return {
    aadhaar: { checked: false, remark: '' },
    pan: { checked: false, remark: '' },
    photo: { checked: false, remark: '' },
    police_verification: { checked: false, remark: '' },
    driving_license: { checked: false, remark: '' },
  };
}

export default function EmployeeDocumentsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: empRaw, isLoading: empLoading, error: empError } = useQuery({
    queryKey: ['employee', params.id],
    queryFn: () => api.getEmployee(params.id),
  });

  const { data: docsRaw, isLoading: docsLoading, refetch: refetchDocs } = useQuery({
    queryKey: ['employee-documents', params.id],
    queryFn: () => api.getEmployeeDocuments(params.id),
    enabled: Boolean(params.id),
  });

  const employee = unwrapData(empRaw);
  const documents = unwrapItems(docsRaw);

  const docsByUiKey = useMemo(() => {
    const map: Record<string, any> = {};
    for (const doc of documents) {
      const uiKey = DOC_TYPE_FROM_API[doc.type];
      if (uiKey) map[uiKey] = doc;
    }
    return map;
  }, [documents]);

  const [pendingUploads, setPendingUploads] = useState(emptyPending);
  const [unavailable, setUnavailable] = useState(emptyUnavailable);
  const [onboardingRemark, setOnboardingRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [remarkPrefillDone, setRemarkPrefillDone] = useState(false);

  const isDriver = employee?.category?.name === 'Driver';
  const docRows = [...BASE_DOC_KEYS, ...(isDriver ? (['driving_license'] as const) : [])];

  useEffect(() => {
    if (!employee || remarkPrefillDone) return;
    const contact = employee.emergencyContact;
    if (contact && typeof contact === 'object' && contact.onboardingRemark) {
      setOnboardingRemark(String(contact.onboardingRemark));
    }
    setRemarkPrefillDone(true);
  }, [employee, remarkPrefillDone]);

  const handleFileChange = (docType: string, file: File | null) => {
    setPendingUploads((prev) => ({
      ...prev,
      [docType]: { ...prev[docType as keyof typeof prev], file },
    }));
    if (file) {
      setUnavailable((prev) => ({
        ...prev,
        [docType]: { ...prev[docType as keyof typeof prev], checked: false },
      }));
    }
  };

  const toggleUnavailable = (key: string, checked: boolean) => {
    setUnavailable((prev) => ({
      ...prev,
      [key]: {
        checked,
        remark: checked
          ? prev[key as keyof typeof prev]?.remark || getUnavailableRemark(docsByUiKey[key])
          : prev[key as keyof typeof prev]?.remark || '',
      },
    }));
    if (checked) {
      setPendingUploads((prev) => ({
        ...prev,
        [key]:
          key === 'driving_license'
            ? { file: null, expiry: '', issue: '' }
            : { ...prev[key as keyof typeof prev], file: null },
      }));
    }
  };

  const handleUpload = async () => {
    if (!employee?.id) return;

    const entries = Object.entries(pendingUploads).filter(([, data]) => data.file !== null);
    const unavailableEntries = Object.entries(unavailable).filter(([key, data]) => {
      if (!data.checked) return false;
      if (entries.some(([k]) => k === key)) return false;
      const existing = docsByUiKey[key];
      if (existing && !isUnavailableDoc(existing)) return false;
      return true;
    });

    if (isDriver) {
      const dlUploaded = Boolean(
        pendingUploads.driving_license.file ||
          (docsByUiKey.driving_license && !isUnavailableDoc(docsByUiKey.driving_license)),
      );
      const dlUnavailable =
        unavailable.driving_license.checked ||
        (docsByUiKey.driving_license && isUnavailableDoc(docsByUiKey.driving_license));
      if (!dlUploaded && !dlUnavailable) {
        toast.error('Driving License is mandatory — upload it or mark Not available with a remark');
        return;
      }
      if (pendingUploads.driving_license.file) {
        if (!pendingUploads.driving_license.expiry || !pendingUploads.driving_license.issue) {
          toast.error('Driving License issue and expiry dates are mandatory');
          return;
        }
      }
    }

    for (const [key, data] of unavailableEntries) {
      if (!data.remark.trim()) {
        toast.error(`Add a remark for ${DOC_LABELS[key] ?? key} (not available)`);
        return;
      }
    }

    if (entries.length === 0 && unavailableEntries.length === 0) {
      toast('No new documents or remarks to save.', { icon: 'ℹ️' });
      return;
    }

    setSaving(true);
    try {
      await Promise.all([
        ...entries.map(async ([key, data]) => {
          const formData = new FormData();
          formData.append('type', DOC_TYPE_TO_API[key] ?? key);
          formData.append('file', data.file!);
          if (key === 'driving_license') {
            if (data.issue) formData.append('issueDate', data.issue);
            if (data.expiry) formData.append('validTill', data.expiry);
          }
          return api.uploadDocument(employee.id, formData);
        }),
        ...unavailableEntries.map(([key, data]) =>
          api.markDocumentUnavailable(employee.id, {
            type: DOC_TYPE_TO_API[key] ?? key,
            remark: data.remark.trim(),
          }),
        ),
      ]);
      toast.success('Documents / remarks saved');
      setPendingUploads(emptyPending());
      setUnavailable(emptyUnavailable());
      refetchDocs();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save documents');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!employee?.id) return;
    setCompleting(true);
    try {
      const pendingUnavailable = Object.entries(unavailable).filter(
        ([key, data]) => data.checked && !(docsByUiKey[key] && isUnavailableDoc(docsByUiKey[key])),
      );
      for (const [key, data] of pendingUnavailable) {
        if (!data.remark.trim()) {
          toast.error(`Add a remark for ${DOC_LABELS[key] ?? key} before completing onboarding`);
          setCompleting(false);
          return;
        }
        await api.markDocumentUnavailable(employee.id, {
          type: DOC_TYPE_TO_API[key] ?? key,
          remark: data.remark.trim(),
        });
      }

      await api.completeEmployeeOnboarding(employee.id, {
        remark: onboardingRemark.trim() || undefined,
      });
      toast.success('Onboarding completed');
      router.push('/hr/employees');
    } catch (error: any) {
      toast.error(error?.message || 'Could not complete onboarding');
      refetchDocs();
    } finally {
      setCompleting(false);
    }
  };

  if (empLoading || docsLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (empError || !employee) {
    return (
      <div className="page-padding text-white">
        <p className="mb-4">Employee not found.</p>
        <Link href="/hr/employees" className="text-primary hover:underline">
          Back to employees
        </Link>
      </div>
    );
  }

  const onboardingDone = Boolean(
    employee?.emergencyContact &&
      typeof employee.emergencyContact === 'object' &&
      (employee.emergencyContact as any).onboardingCompletedAt,
  );

  const renderUnavailableToggle = (key: string) => {
    const existing = docsByUiKey[key];
    const alreadyUploaded = existing && !isUnavailableDoc(existing);
    if (alreadyUploaded) return null;

    return (
      <div className="space-y-2 pt-1 border-t border-white/5">
        <label className="flex items-center gap-2 text-sm text-secondary-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={unavailable[key as keyof typeof unavailable]?.checked ?? false}
            onChange={(e) => toggleUnavailable(key, e.target.checked)}
            className="rounded border-white/20"
          />
          Document not available
        </label>
        {unavailable[key as keyof typeof unavailable]?.checked && (
          <textarea
            placeholder={`Remark (required) — e.g. ${DOC_LABELS[key] ?? key} applied / pending`}
            value={unavailable[key as keyof typeof unavailable]?.remark ?? ''}
            onChange={(e) =>
              setUnavailable((prev) => ({
                ...prev,
                [key]: { checked: true, remark: e.target.value },
              }))
            }
            rows={2}
            className="w-full rounded-xl border border-amber-500/30 bg-background px-3 py-2 text-sm text-white placeholder:text-secondary-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        )}
      </div>
    );
  };

  return (
    <div className="page-padding max-w-[1000px] mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hr/employees" className="rounded-xl bg-white/5 p-2 hover:bg-white/10 transition-colors">
          <ArrowLeft className="h-5 w-5 text-secondary-foreground" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/10 p-2.5">
            <FileText className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Document Verification</h1>
            <p className="text-sm text-secondary-foreground">
              {employee.fullName} ({employee.employeeId}) • {employee.category?.name ?? employee.department}
              {onboardingDone ? ' • Onboarding complete' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-background/40 p-6 backdrop-blur-xl">
        <h2 className="text-lg font-semibold text-white mb-4">Uploaded Documents</h2>
        <div className="space-y-3">
          {docRows.map((docKey) => {
            const doc = docsByUiKey[docKey];
            const unavailableDoc = doc && isUnavailableDoc(doc);
            const docName = DOC_LABELS[docKey] ?? docKey;

            return (
              <div
                key={docKey}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`rounded-lg p-2 shrink-0 ${
                      unavailableDoc ? 'bg-amber-500/20' : doc ? 'bg-green-500/20' : 'bg-red-500/10'
                    }`}
                  >
                    {unavailableDoc ? (
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    ) : doc ? (
                      <FileText className="h-4 w-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{docName}</p>
                    <p
                      className={`text-xs ${
                        unavailableDoc ? 'text-amber-400' : doc ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {unavailableDoc
                        ? `Not available — ${getUnavailableRemark(doc) || 'no remark'}`
                        : doc
                          ? doc.status ?? 'Uploaded'
                          : 'Not uploaded yet'}
                    </p>
                  </div>
                </div>
                {doc && !unavailableDoc && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-secondary-foreground hover:text-white"
                      onClick={() => openDocument(doc.id, 'preview').catch(() => toast.error('Preview failed'))}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-secondary-foreground hover:text-white"
                      onClick={() =>
                        openDocument(doc.id, 'download', doc.type).catch(() => toast.error('Download failed'))
                      }
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-background/40 p-6 backdrop-blur-xl">
        <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2 mb-6">
          Upload / Mark Unavailable
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {BASE_DOC_KEYS.map((key) => {
            const existing = docsByUiKey[key];
            const alreadyUploaded = existing && !isUnavailableDoc(existing);
            const isPolice = key === 'police_verification';
            return (
              <div
                key={key}
                className={`space-y-3 rounded-xl border p-4 ${
                  isPolice
                    ? 'border-violet-500/20 bg-violet-500/5 sm:col-span-2'
                    : 'border-white/5 bg-white/5'
                }`}
              >
                <label
                  className={`text-sm font-semibold ${isPolice ? 'text-violet-300' : 'text-white'}`}
                >
                  {DOC_LABELS[key]} {!alreadyUploaded && '*'}
                </label>
                <input
                  type="file"
                  accept={key === 'photo' ? 'image/*' : '.pdf,image/*'}
                  disabled={unavailable[key]?.checked}
                  onChange={(e) => handleFileChange(key, e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-secondary-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/30 disabled:opacity-40"
                />
                {renderUnavailableToggle(key)}
              </div>
            );
          })}

          {isDriver && (
            <div className="space-y-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 sm:col-span-2">
              <label className="text-sm font-semibold text-blue-400">Driving License (Mandatory)</label>
              <input
                type="file"
                accept=".pdf,image/*"
                disabled={unavailable.driving_license?.checked}
                onChange={(e) => handleFileChange('driving_license', e.target.files?.[0] ?? null)}
                className="w-full text-sm text-secondary-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-blue-500/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-400 disabled:opacity-40"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="date"
                  disabled={unavailable.driving_license?.checked}
                  value={pendingUploads.driving_license.issue}
                  onChange={(e) =>
                    setPendingUploads((prev) => ({
                      ...prev,
                      driving_license: { ...prev.driving_license, issue: e.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-background/50 px-3 py-2 text-sm text-white disabled:opacity-40"
                />
                <input
                  type="date"
                  disabled={unavailable.driving_license?.checked}
                  value={pendingUploads.driving_license.expiry}
                  onChange={(e) =>
                    setPendingUploads((prev) => ({
                      ...prev,
                      driving_license: { ...prev.driving_license, expiry: e.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-background/50 px-3 py-2 text-sm text-white disabled:opacity-40"
                />
              </div>
              {renderUnavailableToggle('driving_license')}
            </div>
          )}
        </div>
        <div className="flex justify-end pt-6 border-t border-white/10 mt-6">
          <Button onClick={handleUpload} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Upload Documents'}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-background/40 p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-green-500/10 p-2.5 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Complete onboarding</h2>
            <p className="text-sm text-secondary-foreground mt-1">
              Upload every required document (including Police Verification), or mark it Not available
              with a remark, then complete onboarding.
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-white">Overall remark (optional)</label>
          <textarea
            placeholder="Any extra note for HR follow-up…"
            value={onboardingRemark}
            onChange={(e) => setOnboardingRemark(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white placeholder:text-secondary-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleCompleteOnboarding} disabled={completing || onboardingDone}>
            {onboardingDone
              ? 'Onboarding already complete'
              : completing
                ? 'Completing...'
                : 'Complete Onboarding'}
          </Button>
        </div>
      </div>
    </div>
  );
}
