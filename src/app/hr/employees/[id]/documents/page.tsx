'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, BASE_URL, tokenStore } from '@/lib/api/client';
import { Spinner } from '@/components/ui/loading';
import { FileText, ArrowLeft, AlertTriangle, Eye, Download } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { DOC_TYPE_FROM_API, DOC_TYPE_TO_API, unwrapData, unwrapItems } from '@/lib/hr/utils';

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

export default function EmployeeDocumentsPage({ params }: { params: { id: string } }) {
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

  const [pendingUploads, setPendingUploads] = useState<
    Record<string, { file: File | null; expiry?: string; issue?: string }>
  >({
    aadhaar: { file: null },
    pan: { file: null },
    photo: { file: null },
    driving_license: { file: null, expiry: '', issue: '' },
  });

  const isDriver = employee?.category?.name === 'Driver';

  const handleFileChange = (docType: string, file: File | null) => {
    setPendingUploads((prev) => ({
      ...prev,
      [docType]: { ...prev[docType], file },
    }));
  };

  const handleUpload = async () => {
    if (!employee?.id) return;

    if (isDriver) {
      if (!pendingUploads.driving_license.file && !docsByUiKey.driving_license) {
        toast.error('Driving License is mandatory for drivers');
        return;
      }
      if (pendingUploads.driving_license.file) {
        if (!pendingUploads.driving_license.expiry || !pendingUploads.driving_license.issue) {
          toast.error('Driving License issue and expiry dates are mandatory');
          return;
        }
      }
    }

    const entries = Object.entries(pendingUploads).filter(([, data]) => data.file !== null);
    if (entries.length === 0) {
      toast('No new documents selected to upload.', { icon: 'ℹ️' });
      return;
    }

    try {
      await Promise.all(
        entries.map(async ([key, data]) => {
          const formData = new FormData();
          formData.append('type', DOC_TYPE_TO_API[key] ?? key);
          formData.append('file', data.file!);
          if (key === 'driving_license') {
            if (data.issue) formData.append('issueDate', data.issue);
            if (data.expiry) formData.append('validTill', data.expiry);
          }
          return api.uploadDocument(employee.id, formData);
        }),
      );
      toast.success('Documents uploaded successfully');
      setPendingUploads({
        aadhaar: { file: null },
        pan: { file: null },
        photo: { file: null },
        driving_license: { file: null, expiry: '', issue: '' },
      });
      refetchDocs();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to upload documents');
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

  const docRows = ['aadhaar', 'pan', 'photo', ...(isDriver ? ['driving_license'] : [])];

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
            <h1 className="text-xl font-bold text-white sm:text-2xl">Upload Documents</h1>
            <p className="text-sm text-secondary-foreground">
              {employee.fullName} ({employee.employeeId}) • {employee.category?.name ?? employee.department}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-background/40 p-6 backdrop-blur-xl">
        <h2 className="text-lg font-semibold text-white mb-4">Uploaded Documents</h2>
        <div className="space-y-3">
          {docRows.map((docKey) => {
            const doc = docsByUiKey[docKey];
            const docName =
              {
                aadhaar: 'Aadhaar Card',
                pan: 'PAN Card',
                photo: 'Passport Photo',
                driving_license: 'Driving License',
              }[docKey] ?? docKey;

            return (
              <div
                key={docKey}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${doc ? 'bg-green-500/20' : 'bg-red-500/10'}`}>
                    {doc ? (
                      <FileText className="h-4 w-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{docName}</p>
                    <p className={`text-xs ${doc ? 'text-green-400' : 'text-red-400'}`}>
                      {doc ? doc.status ?? 'Uploaded' : 'Not uploaded yet'}
                    </p>
                  </div>
                </div>
                {doc && (
                  <div className="flex gap-2">
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
          Upload New Documents
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {['aadhaar', 'pan', 'photo'].map((key) => (
            <div key={key} className="space-y-2 rounded-xl border border-white/5 bg-white/5 p-4">
              <label className="text-sm font-semibold text-white capitalize">{key.replace('_', ' ')} *</label>
              <input
                type="file"
                accept={key === 'photo' ? 'image/*' : '.pdf,image/*'}
                onChange={(e) => handleFileChange(key, e.target.files?.[0] ?? null)}
                className="w-full text-sm text-secondary-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/30"
              />
            </div>
          ))}
          {isDriver && (
            <div className="space-y-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 sm:col-span-2">
              <label className="text-sm font-semibold text-blue-400">Driving License (Mandatory)</label>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => handleFileChange('driving_license', e.target.files?.[0] ?? null)}
                className="w-full text-sm text-secondary-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-blue-500/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-400"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="date"
                  value={pendingUploads.driving_license.issue}
                  onChange={(e) =>
                    setPendingUploads((prev) => ({
                      ...prev,
                      driving_license: { ...prev.driving_license, issue: e.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-background/50 px-3 py-2 text-sm text-white"
                />
                <input
                  type="date"
                  value={pendingUploads.driving_license.expiry}
                  onChange={(e) =>
                    setPendingUploads((prev) => ({
                      ...prev,
                      driving_license: { ...prev.driving_license, expiry: e.target.value },
                    }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-background/50 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end pt-6 border-t border-white/10 mt-6">
          <Button onClick={handleUpload}>Save & Upload Documents</Button>
        </div>
      </div>
    </div>
  );
}
