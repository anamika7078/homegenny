'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Spinner } from '@/components/ui/loading';
import { FileText, ArrowLeft, AlertTriangle, Eye, Download } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';

export default function EmployeeDocumentsPage({ params }: { params: { id: string } }) {
  const { data: empData, isLoading } = useQuery({
    queryKey: ['staff', params.id],
    queryFn: () => api.getStaff(params.id),
  });

  const employee = empData?.data ?? empData;

  const [documents, setDocuments] = useState<Record<string, { file: File | null; expiry?: string; issue?: string }>>({
    aadhaar: { file: null },
    pan: { file: null },
    photo: { file: null },
    driving_license: { file: null, expiry: '', issue: '' },
  });

  // Map verified_docs boolean keys → UI doc keys
  const verifiedDocs: Record<string, any> = employee?.verified_docs ?? {};
  const docKeyMap: Record<string, string> = {
    aadhaar: 'aadhaar',
    pan: 'pan',
    photo: 'photo',
    dl: 'driving_license',
  };
  const [uploadedDocs, setUploadedDocs] = useState<string[]>(
    Object.entries(verifiedDocs)
      .filter(([, v]) => v === true || (typeof v === 'string' && v))
      .map(([k]) => docKeyMap[k] ?? k)
  );

  const handleFileChange = (docType: string, file: File | null) => {
    setDocuments(prev => ({
      ...prev,
      [docType]: { ...prev[docType], file }
    }));
  };

  const handleIssueChange = (expiry: string) => {
    setDocuments(prev => ({
      ...prev,
      driving_license: { ...prev.driving_license, issue: expiry },
    }));
  };

  const handleView = (docKey: string) => {
    // Reverse map UI key → verified_docs key to get URL if stored
    const reverseMap: Record<string, string> = {
      aadhaar: 'aadhaar', pan: 'pan', photo: 'photo', driving_license: 'dl',
    };
    const vKey = reverseMap[docKey] ?? docKey;
    const entry = (employee?.verified_docs ?? {})[vKey];
    if (typeof entry === 'string' && (entry.startsWith('http') || entry.startsWith('/'))) {
      window.open(entry, '_blank');
    } else {
      toast('Document is verified but no preview URL is stored yet.', { icon: 'ℹ️' });
    }
  };

  const handleDownload = (docKey: string) => {
    const reverseMap: Record<string, string> = {
      aadhaar: 'aadhaar', pan: 'pan', photo: 'photo', driving_license: 'dl',
    };
    const vKey = reverseMap[docKey] ?? docKey;
    const entry = (employee?.verified_docs ?? {})[vKey];
    if (typeof entry === 'string' && (entry.startsWith('http') || entry.startsWith('/'))) {
      const a = document.createElement('a');
      a.href = entry;
      a.download = docKey;
      a.click();
    } else {
      toast('No downloadable file URL is stored for this document yet.', { icon: 'ℹ️' });
    }
  };

  const handleExpiryChange = (docType: string, expiry: string) => {
    setDocuments(prev => ({
      ...prev,
      [docType]: { ...prev[docType], expiry }
    }));
  };

  const handleUpload = async () => {
    if (employee?.series === 'DRIVER' || employee?.series === 'DR') {
      if (!documents.driving_license.file && !uploadedDocs.includes('driving_license')) {
        toast.error('Driving License is mandatory for drivers');
        return;
      }
      if (documents.driving_license.file) {
        if (!documents.driving_license.expiry) {
          toast.error('Driving License expiry date is mandatory');
          return;
        }
        if (!documents.driving_license.issue) {
          toast.error('Driving License issue date is mandatory');
          return;
        }
        const expiryDate = new Date(documents.driving_license.expiry);
        const issueDate = new Date(documents.driving_license.issue);
        if (expiryDate < new Date()) {
          toast.error('Driving License is expired! Cannot proceed.');
          return;
        }
        if (issueDate > new Date()) {
          toast.error('Driving License issue date cannot be in the future.');
          return;
        }
      }
    }

    try {
      const uploadPromises = Object.entries(documents)
        .filter(([, data]) => data.file !== null)
        .map(async ([key, data]) => {
          const formData = new FormData();
          // Map UI key to backend expected type (e.g., driving_license -> dl)
          const type = key === 'driving_license' ? 'dl' : key;
          formData.append('type', type);
          formData.append('file', data.file!);
          
          if (key === 'driving_license') {
            if (data.issue) formData.append('issueDate', data.issue);
            if (data.expiry) formData.append('validTill', data.expiry);
          }

          return api.uploadDocument(employee.id, formData);
        });

      if (uploadPromises.length === 0) {
        toast('No new documents selected to upload.', { icon: 'ℹ️' });
        return;
      }

      await Promise.all(uploadPromises);
      toast.success('Documents uploaded successfully');
      
      // Update uploaded docs list
      const newDocs = Object.keys(documents).filter(k => documents[k].file !== null);
      setUploadedDocs(prev => Array.from(new Set([...prev, ...newDocs])));
      
      // Clear files from inputs
      setDocuments({
        aadhaar: { file: null },
        pan: { file: null },
        photo: { file: null },
        driving_license: { file: null, expiry: '', issue: '' },
      });
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(error?.response?.data?.message || 'Failed to upload documents');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (!employee) {
    return <div className="text-white p-6">Employee not found</div>;
  }

  const isDriver = employee.series === 'DRIVER' || employee.series === 'DR';

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
              {employee.full_name ?? employee.name} ({employee.staff_code}) • {employee.series}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-background/40 p-6 backdrop-blur-xl mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Uploaded Documents</h2>
        <div className="space-y-3">
          {['aadhaar', 'pan', 'photo', ...(isDriver ? ['driving_license'] : [])].map((docKey) => {
            const isUploaded = uploadedDocs.includes(docKey);
            const docName = {
              aadhaar: 'Aadhaar Card',
              pan: 'PAN Card',
              photo: 'Passport Photo',
              driving_license: 'Driving License'
            }[docKey];

            return (
              <div key={docKey} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${isUploaded ? 'bg-green-500/20' : 'bg-red-500/10'}`}>
                    {isUploaded ? (
                      <FileText className="h-4 w-4 text-green-400" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{docName}</p>
                    {isUploaded ? (
                      <p className="text-xs text-green-400">Verified</p>
                    ) : (
                      <p className="text-xs text-red-400">Not uploaded. Please upload it.</p>
                    )}
                  </div>
                </div>
                {isUploaded && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-secondary-foreground hover:text-white"
                      onClick={() => handleView(docKey)}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-secondary-foreground hover:text-white"
                      onClick={() => handleDownload(docKey)}
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
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Upload New Documents</h2>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Aadhaar (Common) */}
            <div className="space-y-2 rounded-xl border border-white/5 bg-white/5 p-4">
              <label className="text-sm font-semibold text-white">Aadhaar Card *</label>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => handleFileChange('aadhaar', e.target.files?.[0] ?? null)}
                className="w-full text-sm text-secondary-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/30"
              />
            </div>

            {/* PAN (Common) */}
            <div className="space-y-2 rounded-xl border border-white/5 bg-white/5 p-4">
              <label className="text-sm font-semibold text-white">PAN Card *</label>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => handleFileChange('pan', e.target.files?.[0] ?? null)}
                className="w-full text-sm text-secondary-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/30"
              />
            </div>

            {/* Photo (Common) */}
            <div className="space-y-2 rounded-xl border border-white/5 bg-white/5 p-4">
              <label className="text-sm font-semibold text-white">Passport Photo *</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange('photo', e.target.files?.[0] ?? null)}
                className="w-full text-sm text-secondary-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/30"
              />
            </div>

            {/* Category Specific */}
            {isDriver ? (
              <div className="space-y-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-blue-400" />
                  <label className="text-sm font-semibold text-blue-400">Driving License (Mandatory)</label>
                </div>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => handleFileChange('driving_license', e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-secondary-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-blue-500/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-400 hover:file:bg-blue-500/30"
                />
                <input
                  type="date"
                  value={documents.driving_license.issue}
                  onChange={(e) => handleIssueChange(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-background/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Issue Date"
                />
                <input
                  type="date"
                  value={documents.driving_license.expiry}
                  onChange={(e) => handleExpiryChange('driving_license', e.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-background/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Expiry Date"
                />
              </div>
            ) : null}
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10">
            <Button onClick={handleUpload}>Save & Upload Documents</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
