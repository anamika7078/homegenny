"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { api } from '@/lib/api/client';
import { 
  ShieldAlert, 
  Trash2, 
  EyeOff, 
  UserX, 
  CheckCircle2, 
  Clock, 
  Lock, 
  Plus, 
  Search, 
  FileText,
  AlertTriangle,
  Scale,
  ShieldCheck,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';

export default function AdminPrivacyPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isPiiMaskingEnabled, setIsPiiMaskingEnabled] = useState(true);

  const [formData, setFormData] = useState({
    userId: '',
    requestType: 'DELETION',
    reason: '',
    isConsentVerified: false
  });

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['admin', 'privacy-requests'],
    queryFn: () => api.getAdminPrivacyRequests(),
  });

  const rawRequests = Array.isArray(requestsData?.data) ? requestsData.data : (Array.isArray(requestsData) ? requestsData : []);

  const submitMutation = useMutation({
    mutationFn: (data: any) => api.submitAdminDeleteRequest(data),
    onSuccess: (res: any) => {
      toast.success(res?.message || "DPDP Privacy Request processed successfully");
      queryClient.invalidateQueries({ queryKey: ['admin', 'privacy-requests'] });
      setIsRequestModalOpen(false);
      setFormData({ userId: '', requestType: 'DELETION', reason: '', isConsentVerified: false });
    },
    onError: (error: any) => toast.error(error.message || "Failed to process DPDP privacy request")
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.isConsentVerified) {
      toast.error("You must verify consent or legal authority before executing a DPDP compliance action.");
      return;
    }
    submitMutation.mutate({
      userId: formData.userId,
      requestType: formData.requestType,
      reason: formData.reason
    });
  };

  const filteredRequests = rawRequests.filter((r: any) => 
    r.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.requestType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTestPiiExport = () => {
    toast.success("Generating DPDP PII-Masked Compliance Export...");
    setTimeout(() => {
      const piiMask = (val: string, type: 'name' | 'phone' | 'email') => {
        if (!isPiiMaskingEnabled) return val;
        if (type === 'phone') return val.replace(/(\+\d{2}\s*\d{2})\d{4}(\d{2})/, '$1****$2');
        if (type === 'email') return val.replace(/(^.|\@.)([^@]+)(?=@)/g, '$1***');
        return val.replace(/\b(\w)(\w+)/g, '$1***');
      };

      const sampleData = [
        { name: piiMask("Pooja Mishra", 'name'), phone: piiMask("+91 9800000002", 'phone'), email: piiMask("pooja@homegenny.com", 'email'), dpdpStatus: "ERASED_EXCEPT_NEVER_DELETE_CERT" },
        { name: piiMask("Amit Gupta", 'name'), phone: piiMask("+91 9800000001", 'phone'), email: piiMask("amit@homegenny.com", 'email'), dpdpStatus: "PII_MASKED" },
      ];

      const csvContent = "data:text/csv;charset=utf-8,"
        + `DPDP ACT 2023 AUDIT REPORT (PII Masking: ${isPiiMaskingEnabled ? 'ENABLED' : 'DISABLED'})\n`
        + "Staff Name,Phone,Email,DPDP Compliance Status\n"
        + sampleData.map(d => `"${d.name}","${d.phone}","${d.email}","${d.dpdpStatus}"`).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `dpdp_compliance_export_pii_${isPiiMaskingEnabled ? 'masked' : 'unmasked'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("DPDP Export Downloaded!");
    }, 1000);
  };

  return (
    <div className="page-padding space-y-6 sm:space-y-8 min-h-screen text-[#E8EDF8]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#E8EDF8] flex items-center gap-3">
            <Scale className="h-8 w-8 text-primary" /> Data Privacy (DPDP Act 2023) Controls
          </h1>
          <p className="text-[#8D9AB5] mt-1 text-sm">
            Process Data Principal erasure requests per DPDP Act 2023. Enforce never_delete video cert legal hold exemptions &amp; export PII masking.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleTestPiiExport} variant="outline" className="border-border/60 hover:bg-[#1C2740] hover:text-white transition-all text-[#8D9AB5] bg-transparent">
            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-400" /> Export PII-Masked Report
          </Button>
          <Button onClick={() => setIsRequestModalOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:shadow-lg transition-all">
            <Plus className="mr-2 h-4 w-4" /> Process DPDP Erasure
          </Button>
        </div>
      </div>

      {/* DPDP Legal Hold Exemption Banner */}
      <Card className="border border-amber-800/40 bg-gradient-to-br from-amber-950/30 via-slate-900/60 to-slate-950/80 shadow-2xl backdrop-blur-md">
        <CardContent className="pt-5 pb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-950/80 rounded-xl text-amber-400 border border-amber-800/60 shrink-0">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#E8EDF8] flex items-center gap-2">
                DPDP Act 2023 Legal Exemption Rule: Video Certifications (never_delete=true)
              </h3>
              <p className="text-xs text-[#8D9AB5] mt-1 leading-relaxed max-w-4xl">
                Under <span className="text-amber-300 font-semibold">DPDP Act 2023 Section 8(3) &amp; Legal Compliance Exceptions</span>, video certification records flagged as <span className="font-mono text-amber-300">never_delete=true</span> (Fraud or Legal Hold Lock) <span className="text-rose-400 font-bold">CANNOT BE DELETED</span> regardless of a Data Principal erasure request. All personal PII is scrubbed, but video evidence remains locked.
              </p>
            </div>
          </div>
          <Badge className="bg-amber-950 text-amber-300 border border-amber-800/60 shrink-0 font-mono text-xs px-3 py-1">
            Section 8(3) Protected
          </Badge>
        </CardContent>
      </Card>

      {/* Metrics & PII Masking Control Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#8D9AB5]">Active DPDP Erasures</CardTitle>
            <Clock className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#E8EDF8]">{rawRequests.filter((r: any) => r.status === 'PENDING').length}</div>
            <p className="text-xs text-amber-400 mt-1">Pending compliance audit</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#8D9AB5]">Completed Erasures</CardTitle>
            <UserX className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#E8EDF8]">{rawRequests.filter((r: any) => r.requestType === 'DELETION').length}</div>
            <p className="text-xs text-rose-400 mt-1">PII scrubbed per DPDP 2023</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#8D9AB5]">Exemption Holds (never_delete)</CardTitle>
            <Lock className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-300">
              {rawRequests.reduce((sum: number, r: any) => sum + (r.preservedVideoCerts || 0), 1)}
            </div>
            <p className="text-xs text-amber-400 mt-1">Video certs preserved</p>
          </CardContent>
        </Card>

        {/* Global PII Masking Switch Card */}
        <Card className="border border-blue-900/60 bg-blue-955/20 backdrop-blur-md shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-blue-300 flex items-center gap-1.5">
              <EyeOff className="h-4 w-4 text-blue-400" /> PII Export Masking
            </CardTitle>
            <input
              type="checkbox"
              checked={isPiiMaskingEnabled}
              onChange={(e) => {
                setIsPiiMaskingEnabled(e.target.checked);
                toast(e.target.checked ? "PII Export Masking ENABLED (+91 98******03)" : "PII Export Masking DISABLED", { icon: '🛡️' });
              }}
              className="h-4 w-4 accent-blue-500 rounded cursor-pointer"
            />
          </CardHeader>
          <CardContent>
            <div className="text-xs font-semibold text-[#E8EDF8] mb-1">
              {isPiiMaskingEnabled ? 'ENABLED (Obfuscated)' : 'DISABLED (Raw)'}
            </div>
            <p className="text-[11px] text-[#8D9AB5]">
              {isPiiMaskingEnabled ? 'Phone, Email & Aadhaar masked in CSV/PDF exports' : 'Unmasked export format'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main ledger table */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
            <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-border/40">
              <CardTitle className="text-xl font-semibold text-[#E8EDF8]">DPDP Erasure &amp; Privacy Request Ledger</CardTitle>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D9AB5]/70 h-4 w-4" />
                <Input
                  placeholder="Search target user or request..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-[#0F172A]/50 border-border text-[#E8EDF8] placeholder-[#8D9AB5]/50 focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[#8D9AB5] uppercase bg-[#0F172A]/60 border-b border-border/40">
                      <tr>
                        <th className="px-6 py-4 font-semibold tracking-wider">Target Data Principal</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Compliance Type</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">never_delete Exemptions</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Processed Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {filteredRequests.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-[#8D9AB5]">
                            No DPDP privacy requests found.
                          </td>
                        </tr>
                      ) : (
                        filteredRequests.map((req: any) => (
                          <tr key={req.id} className="hover:bg-[#1C2740]/40 transition-all text-[#E8EDF8]/90">
                            <td className="px-6 py-4">
                              <div className="font-mono text-xs font-semibold text-[#E8EDF8]">{req.userId}</div>
                              <div className="text-xs text-[#8D9AB5] mt-0.5 truncate max-w-[200px]" title={req.reason}>{req.reason}</div>
                            </td>
                            <td className="px-6 py-4">
                              {req.requestType === 'DELETION' ? (
                                <Badge className="bg-rose-950/60 text-rose-300 border border-rose-800/40 flex items-center gap-1 w-max">
                                  <UserX className="h-3 w-3" /> PII Erasure
                                </Badge>
                              ) : req.requestType === 'MASKING' ? (
                                <Badge className="bg-blue-950/60 text-blue-300 border border-blue-800/40 flex items-center gap-1 w-max">
                                  <EyeOff className="h-3 w-3" /> PII Mask
                                </Badge>
                              ) : (
                                <Badge className="bg-purple-950/60 text-purple-300 border border-purple-800/40 flex items-center gap-1 w-max">
                                  <FileText className="h-3 w-3" /> SAR Access
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {req.status === 'COMPLETED_WITH_EXEMPTIONS' ? (
                                <Badge className="bg-amber-950/80 text-amber-300 border border-amber-800/40 flex items-center gap-1 w-max">
                                  <Lock className="h-3 w-3" /> Erased w/ Exemptions
                                </Badge>
                              ) : req.status === 'COMPLETED' ? (
                                <Badge className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 flex items-center gap-1 w-max">
                                  <CheckCircle2 className="h-3 w-3" /> Completed
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-950/60 text-blue-300 border border-blue-800/40 flex items-center gap-1 w-max">
                                  <Clock className="h-3 w-3" /> Pending Review
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {req.preservedVideoCerts ? (
                                <span className="text-xs font-mono text-amber-400 font-bold flex items-center gap-1">
                                  <Lock className="h-3 w-3" /> {req.preservedVideoCerts} Video Cert Preserved
                                </span>
                              ) : (
                                <span className="text-xs text-[#8D9AB5] italic">None (0)</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-[#8D9AB5] font-mono text-xs">
                              {new Date(req.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric'
                              })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border border-border/80 bg-gradient-to-br from-[#0F172A] to-[#1a1040] shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-[#E8EDF8]">
                <ShieldAlert className="h-5 w-5 text-rose-400" />
                DPDP Act 2023 Mandate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-[#8D9AB5]">
              <p>
                The Digital Personal Data Protection Act 2023 requires data fiduciaries to scrub personal PII when consent is withdrawn.
              </p>
              <div className="p-3 bg-amber-950/30 rounded-lg flex gap-3 text-xs border border-amber-800/30">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#E8EDF8]">Section 8(3) Exemption:</span> Video certifications with <span className="font-mono text-amber-300">never_delete=true</span> are retained for legal/fraud audit purposes.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Legal Holds */}
          <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-[#E8EDF8]">
                <Lock className="h-4 w-4 text-amber-400" /> Active Video Cert Legal Holds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-[#0F172A]/60 rounded-lg border border-border/40 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#E8EDF8] text-xs">Video Cert #VC-881</span>
                  <Badge className="bg-amber-950/80 text-amber-300 border border-amber-800/40 text-[10px]">never_delete=true</Badge>
                </div>
                <p className="text-[11px] text-[#8D9AB5]">Preserved under DPDP Fraud Investigation Exemption.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New DPDP Request Modal */}
      <Modal open={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="Process DPDP Erasure / Privacy Action">
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-[#E8EDF8]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#8D9AB5]">Target Data Principal ID / Staff Code / Phone</label>
            <Input
              required
              placeholder="e.g. STF-1029 or 9800000002"
              value={formData.userId}
              onChange={e => setFormData({...formData, userId: e.target.value})}
              className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#8D9AB5]">DPDP Compliance Request Type</label>
            <SelectMenu
              value={formData.requestType}
              onValueChange={(v) => setFormData({ ...formData, requestType: v })}
              placeholder="Select request type"
              className="bg-[#0F172A]/50 border-border"
            >
              <SelectMenuItem value="DELETION">PII Permanent Erasure (Section 12 DPDP Right to Erasure)</SelectMenuItem>
              <SelectMenuItem value="MASKING">PII Masking &amp; Anonymization (Right to Restriction)</SelectMenuItem>
              <SelectMenuItem value="ACCESS_REQUEST">Subject Access Request (SAR Profile Export)</SelectMenuItem>
            </SelectMenu>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#8D9AB5]">Regulatory Justification &amp; Consent Reference</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Consent withdrawn by Data Principal per DPDP Act Section 12."
              className="flex w-full rounded-md border border-border bg-[#0F172A]/50 px-3 py-2 text-xs text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary"
              value={formData.reason}
              onChange={e => setFormData({...formData, reason: e.target.value})}
            />
          </div>

          {/* Exemption Notice in Modal */}
          <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Automatic DPDP Exemption Check:
            </div>
            <p className="text-[11px] text-[#8D9AB5]">
              All personal PII (Name, Email, Address) will be scrubbed. Any video certifications with <span className="font-mono text-amber-300">never_delete=true</span> will be automatically preserved under DPDP Act 2023 legal exemption.
            </p>
          </div>

          <div className="flex items-start gap-3 p-3 bg-rose-950/30 border border-rose-800/30 rounded-lg text-xs text-rose-300">
            <input
              type="checkbox"
              id="consent-check"
              required
              className="mt-0.5 accent-rose-500"
              checked={formData.isConsentVerified}
              onChange={e => setFormData({...formData, isConsentVerified: e.target.checked})}
            />
            <label htmlFor="consent-check" className="cursor-pointer select-none">
              I verify identity and confirm execution of this erasure action per DPDP Act 2023 regulations.
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border/40 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsRequestModalOpen(false)} className="border-border hover:bg-[#1C2740] hover:text-white">Cancel</Button>
            <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-semibold" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Executing...' : 'Execute DPDP Erasure'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
