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
  Scale
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';

export default function AdminPrivacyPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
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

  const rawRequests = Array.isArray(requestsData) ? requestsData : [];
  
  const mockRequests = [
    {
      id: "req_dpdp_01",
      userId: "usr_client_881",
      requestType: "DELETION",
      reason: "Right to be forgotten request after contract termination",
      status: "COMPLETED",
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      processedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "req_dpdp_02",
      userId: "usr_staff_432",
      requestType: "MASKING",
      reason: "Mask phone and Aadhaar after legal dispute settlement",
      status: "PENDING",
      createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      processedAt: null,
    },
    {
      id: "req_dpdp_03",
      userId: "usr_client_112",
      requestType: "ACCESS_REQUEST",
      reason: "Subject Access Request (SAR) - Full Profile Export",
      status: "APPROVED",
      createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      processedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    }
  ];

  const requests = rawRequests.length > 0 ? rawRequests : mockRequests;

  const submitMutation = useMutation({
    mutationFn: (data: any) => api.submitAdminDeleteRequest(data),
    onSuccess: () => {
      toast.success("Privacy & DPDP request submitted successfully");
      queryClient.invalidateQueries({ queryKey: ['admin', 'privacy-requests'] });
      setIsRequestModalOpen(false);
      setFormData({ userId: '', requestType: 'DELETION', reason: '', isConsentVerified: false });
    },
    onError: (error: any) => toast.error(error.message || "Failed to submit privacy request")
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.isConsentVerified) {
      toast.error("You must verify consent or legal authority before submitting.");
      return;
    }
    submitMutation.mutate({
      userId: formData.userId,
      requestType: formData.requestType,
      reason: formData.reason
    });
  };

  const filteredRequests = requests.filter((r: any) => 
    r.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.requestType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-padding space-y-6 sm:space-y-8 min-h-screen text-[#E8EDF8]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#E8EDF8] flex items-center gap-3">
            <Scale className="h-8 w-8 text-primary" /> DPDP Privacy Controls
          </h1>
          <p className="text-[#8D9AB5] mt-1 text-sm">
            Data Principal Protection Act (DPDP) compliance dashboard. Process deletions, PII masking, and legal holds.
          </p>
        </div>
        <Button onClick={() => setIsRequestModalOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:shadow-lg transition-all">
          <Plus className="mr-2 h-4 w-4" /> New DPDP Request
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#8D9AB5]">Active Requests</CardTitle>
            <Clock className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#E8EDF8]">{requests.filter(r => r.status === 'PENDING').length}</div>
            <p className="text-xs text-amber-400 mt-1">Awaiting compliance review</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#8D9AB5]">Processed Deletions</CardTitle>
            <Trash2 className="h-4 w-4 text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#E8EDF8]">{requests.filter(r => r.requestType === 'DELETION' && r.status === 'COMPLETED').length}</div>
            <p className="text-xs text-[#8D9AB5] mt-1">Permanently scrubbed from system</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#8D9AB5]">PII Masked</CardTitle>
            <EyeOff className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#E8EDF8]">{requests.filter(r => r.requestType === 'MASKING' && r.status === 'COMPLETED').length}</div>
            <p className="text-xs text-blue-400 mt-1">Obfuscated fields in backups</p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#8D9AB5]">Legal Holds</CardTitle>
            <Lock className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#E8EDF8]">1</div>
            <p className="text-xs text-emerald-400 mt-1">Agreements preserved in archive</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main ledger table */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
            <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-border/40">
              <CardTitle className="text-xl font-semibold text-[#E8EDF8]">Privacy Request Ledger</CardTitle>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D9AB5]/70 h-4 w-4" />
                <Input
                  placeholder="Search ledger..."
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
                        <th className="px-6 py-4 font-semibold tracking-wider">Request Details</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">User Target</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Type</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                        <th className="px-6 py-4 font-semibold tracking-wider">Date Initiated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {filteredRequests.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-[#8D9AB5]">
                            No privacy requests found.
                          </td>
                        </tr>
                      ) : (
                        filteredRequests.map((req: any) => (
                          <tr key={req.id} className="hover:bg-[#1C2740]/40 transition-all text-[#E8EDF8]/90">
                            <td className="px-6 py-4">
                              <div className="font-medium text-[#E8EDF8]">{req.reason}</div>
                              <div className="text-xs text-[#8D9AB5] mt-0.5">ID: {req.id}</div>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className="bg-[#0F172A]/60 font-mono text-[#8D9AB5] border-border/40">
                                {req.userId}
                              </Badge>
                            </td>
                            <td className="px-6 py-4">
                              {req.requestType === 'DELETION' ? (
                                <Badge className="bg-rose-950/60 text-rose-300 border border-rose-800/40 flex items-center gap-1 w-max">
                                  <UserX className="h-3 w-3" /> Deletion
                                </Badge>
                              ) : req.requestType === 'MASKING' ? (
                                <Badge className="bg-blue-950/60 text-blue-300 border border-blue-800/40 flex items-center gap-1 w-max">
                                  <EyeOff className="h-3 w-3" /> PII Mask
                                </Badge>
                              ) : (
                                <Badge className="bg-purple-950/60 text-purple-300 border border-purple-800/40 flex items-center gap-1 w-max">
                                  <FileText className="h-3 w-3" /> Access Req
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {req.status === 'COMPLETED' ? (
                                <Badge className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 shadow-sm flex items-center gap-1 w-max">
                                  <CheckCircle2 className="h-3 w-3" /> Completed
                                </Badge>
                              ) : req.status === 'APPROVED' ? (
                                <Badge className="bg-blue-950/60 text-blue-300 border border-blue-800/40 shadow-sm flex items-center gap-1 w-max">
                                  <CheckCircle2 className="h-3 w-3" /> Approved
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-950/60 text-amber-300 border border-amber-800/40 shadow-sm flex items-center gap-1 w-max">
                                  <Clock className="h-3 w-3" /> Pending
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 text-[#8D9AB5]">
                              {new Date(req.createdAt).toLocaleString()}
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
                DPDP Act Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-[#8D9AB5]">
              <p>
                Under the Digital Personal Data Protection Act (DPDP Act) of India, user data must be permanently scrubbed or anonymized if:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Consent is withdrawn by the Data Principal.</li>
                <li>The purpose of processing is satisfied.</li>
                <li>There is no longer a valid legal/contractual hold.</li>
              </ul>
              <div className="p-3 bg-amber-950/30 rounded-lg flex gap-3 text-xs border border-amber-800/30">
                <AlertTriangle className="h-6 w-6 text-amber-400 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-[#E8EDF8]">Warning:</span> Permanent Deletion cannot be undone. System database records will be scrubbed, and S3 assets masked instantly.
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-[#E8EDF8]">
                <Lock className="h-4 w-4 text-primary" /> Active Legal Holds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-[#0F172A]/60 rounded-lg border border-border/40">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#E8EDF8] text-sm">Agreement Hold #09</span>
                  <Badge className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">ACTIVE</Badge>
                </div>
                <p className="text-xs text-[#8D9AB5] mt-1">Preserve all contracts for branch DL_SOUTH_01 due to audit.</p>
                <div className="text-[10px] text-[#8D9AB5]/60 mt-2">Initiated by: Admin on 2026-04-12</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New DPDP Request Modal */}
      <Modal open={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="New DPDP Privacy Action">
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#8D9AB5]">Target User ID / Phone / Email</label>
            <Input
              required
              placeholder="e.g. usr_client_881"
              value={formData.userId}
              onChange={e => setFormData({...formData, userId: e.target.value})}
              className="bg-[#0F172A]/50 border-border text-[#E8EDF8] placeholder-[#8D9AB5]/30 focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#8D9AB5]">Compliance Request Type</label>
            <SelectMenu
              value={formData.requestType}
              onValueChange={(v) => setFormData({ ...formData, requestType: v })}
              placeholder="Select request type"
              className="bg-[#0F172A]/50 border-border"
            >
              <SelectMenuItem value="DELETION">PII Permanent Deletion (Right to Erasure)</SelectMenuItem>
              <SelectMenuItem value="MASKING">PII Masking &amp; Anonymization (Right to Restriction)</SelectMenuItem>
              <SelectMenuItem value="ACCESS_REQUEST">Subject Access Request (Right to Access)</SelectMenuItem>
            </SelectMenu>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#8D9AB5]">Justification &amp; Regulatory Reference</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Consent withdrawn by user via support ticket #4432."
              className="flex w-full rounded-md border border-border bg-[#0F172A]/50 px-3 py-2 text-sm text-[#E8EDF8] placeholder-[#8D9AB5]/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
              value={formData.reason}
              onChange={e => setFormData({...formData, reason: e.target.value})}
            />
          </div>

          <div className="flex items-start gap-3 p-3 bg-rose-950/30 border border-rose-800/30 rounded-lg text-xs text-rose-300">
            <input
              type="checkbox"
              id="consent-check"
              required
              className="mt-0.5"
              checked={formData.isConsentVerified}
              onChange={e => setFormData({...formData, isConsentVerified: e.target.checked})}
            />
            <label htmlFor="consent-check" className="cursor-pointer select-none">
              I verify that I have audited this request and confirm that the user has verified identity, or that this is backed by a legal mandate under DPDP regulations.
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border/40 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsRequestModalOpen(false)} className="border-border hover:bg-[#1C2740] hover:text-white">Cancel</Button>
            <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? 'Processing...' : 'Execute Compliance Action'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
