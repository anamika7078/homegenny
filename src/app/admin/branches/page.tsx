"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { api } from '@/lib/api/client';
import { Search, Plus, Edit2, Building2, MapPin, ShieldCheck, ShieldBan, Users, Percent, FileText, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminBranchesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'fee' | 'template'>('info');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    state: '',
    gstin: '',
    address: '',
    phone: '',
    email: '',
    managementFeePct: '10',
    placementCommissionPct: '5',
    serviceChargePct: '8',
    gstPct: '18',
    agreementTemplate: 'Standard Branch Agreement: Service and placement terms governed under local branch jurisdiction.'
  });

  const resetForm = () => {
    setFormData({
      name: '',
      city: '',
      state: '',
      gstin: '',
      address: '',
      phone: '',
      email: '',
      managementFeePct: '10',
      placementCommissionPct: '5',
      serviceChargePct: '8',
      gstPct: '18',
      agreementTemplate: 'Standard Branch Agreement: Service and placement terms governed under local branch jurisdiction.'
    });
    setActiveTab('info');
  };

  const { data: branchesData, isLoading } = useQuery({
    queryKey: ['admin', 'branches'],
    queryFn: () => api.getAdminBranches(),
  });

  const branches = Array.isArray(branchesData) ? branchesData : (branchesData?.data || []);

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = {
        name: data.name,
        city: data.city,
        state: data.state,
        gstin: data.gstin || null,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        feeStructure: {
          managementFeePct: Number(data.managementFeePct) || 10,
          placementCommissionPct: Number(data.placementCommissionPct) || 5,
          serviceChargePct: Number(data.serviceChargePct) || 8,
          gstPct: Number(data.gstPct) || 18,
        },
        agreementTemplate: data.agreementTemplate || null,
      };
      return api.createAdminBranch(payload);
    },
    onSuccess: () => {
      toast.success("Branch created successfully");
      queryClient.invalidateQueries({ queryKey: ['admin', 'branches'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error(error.message || "Failed to create branch")
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = {
        name: data.name,
        city: data.city,
        state: data.state,
        gstin: data.gstin || null,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        feeStructure: {
          managementFeePct: Number(data.managementFeePct) || 10,
          placementCommissionPct: Number(data.placementCommissionPct) || 5,
          serviceChargePct: Number(data.serviceChargePct) || 8,
          gstPct: Number(data.gstPct) || 18,
        },
        agreementTemplate: data.agreementTemplate || null,
      };
      return api.updateAdminBranch(data.id, payload);
    },
    onSuccess: () => {
      toast.success("Branch updated successfully");
      queryClient.invalidateQueries({ queryKey: ['admin', 'branches'] });
      setIsEditModalOpen(false);
    },
    onError: (error: any) => toast.error(error.message || "Failed to update branch")
  });

  const filteredBranches = branches.filter((b: any) => 
    b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.state?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ ...formData, id: selectedBranch.id });
  };

  const openEditModal = (branch: any) => {
    setSelectedBranch(branch);
    const fees = typeof branch.feeStructure === 'object' && branch.feeStructure ? branch.feeStructure : {};
    setFormData({
      name: branch.name || '',
      city: branch.city || '',
      state: branch.state || '',
      gstin: branch.gstin || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      managementFeePct: String(fees.managementFeePct ?? 10),
      placementCommissionPct: String(fees.placementCommissionPct ?? 5),
      serviceChargePct: String(fees.serviceChargePct ?? 8),
      gstPct: String(fees.gstPct ?? 18),
      agreementTemplate: branch.agreementTemplate || 'Standard Branch Agreement: Service and placement terms governed under local branch jurisdiction.'
    });
    setActiveTab('info');
    setIsEditModalOpen(true);
  };

  const openViewModal = (branch: any) => {
    setSelectedBranch(branch);
    setIsViewModalOpen(true);
  };

  return (
    <div className="page-padding space-y-6 sm:space-y-8 min-h-screen text-[#E8EDF8]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#E8EDF8]">Branch Management</h1>
          <p className="text-[#8D9AB5] mt-1 text-sm">Configure branch locations, GSTIN, assigned RMs/BMs, fee structures, and legal agreement templates.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateModalOpen(true); }} className="shadow-md hover:shadow-lg transition-all">
          <Plus className="mr-2 h-4 w-4" /> Create Branch
        </Button>
      </div>

      <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-border/40">
          <CardTitle className="text-xl font-bold text-[#E8EDF8]">Operational Branches</CardTitle>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D9AB5]/70 h-4 w-4" />
            <Input 
              placeholder="Search branches..." 
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
                    <th className="px-6 py-4 font-semibold tracking-wider">Branch Details</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Location & GSTIN</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Assigned RMs & BMs</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Fee Structure</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Agreement Template</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredBranches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-[#8D9AB5]">
                        No branches found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBranches.map((branch: any) => {
                      const assignedUsers = Array.isArray(branch.users) ? branch.users : [];
                      const rms = assignedUsers.filter((u: any) => u.role === 'RM');
                      const bms = assignedUsers.filter((u: any) => u.role === 'BM');
                      const fees = typeof branch.feeStructure === 'object' && branch.feeStructure ? branch.feeStructure : {};

                      return (
                        <tr key={branch.id} className="hover:bg-[#1C2740]/40 transition-all text-[#E8EDF8]/90">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-xl bg-indigo-950/60 flex items-center justify-center text-indigo-400 border border-indigo-800/40 shadow-sm">
                                <Building2 className="h-5 w-5" />
                              </div>
                              <div className="ml-4">
                                <div className="font-semibold text-[#E8EDF8]">{branch.name}</div>
                                <div className="text-xs text-[#8D9AB5]">ID: {branch.id.substring(0,8)}...</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 text-[#8D9AB5]">
                              <span className="flex items-center gap-1.5 font-medium text-[#E8EDF8]"><MapPin className="h-3.5 w-3.5 text-[#8D9AB5]/70"/> {branch.city}, {branch.state}</span>
                              {branch.gstin ? (
                                <span className="font-mono text-xs text-slate-300">GSTIN: {branch.gstin}</span>
                              ) : (
                                <span className="text-xs text-[#8D9AB5]/40 italic">No GSTIN</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5 text-sky-400" />
                                <span className="text-xs font-medium text-[#E8EDF8]">{bms.length} BMs, {rms.length} RMs</span>
                              </div>
                              {assignedUsers.length > 0 && (
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {bms.map((u: any) => (
                                    <Badge key={u.id} className="bg-sky-950/60 text-sky-300 text-[10px] border border-sky-800/40">BM: {u.fullName.split(' ')[0]}</Badge>
                                  ))}
                                  {rms.map((u: any) => (
                                    <Badge key={u.id} className="bg-purple-950/60 text-purple-300 text-[10px] border border-purple-800/40">RM: {u.fullName.split(' ')[0]}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs space-y-0.5 text-slate-300 font-mono">
                              <div>Mgmt Fee: <span className="text-amber-400 font-semibold">{fees.managementFeePct ?? 10}%</span></div>
                              <div>Commission: <span className="text-emerald-400 font-semibold">{fees.placementCommissionPct ?? 5}%</span></div>
                              <div>GST: <span className="text-sky-400 font-semibold">{fees.gstPct ?? 18}%</span></div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {branch.agreementTemplate ? (
                              <Badge className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 shadow-sm flex items-center gap-1 w-max">
                                <FileText className="h-3 w-3" /> Configured
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-900 text-slate-400 border border-slate-700 shadow-sm flex items-center gap-1 w-max">
                                Standard
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openViewModal(branch)} className="text-sky-400 hover:bg-sky-950/40">
                                <Eye className="h-4 w-4 mr-1" /> View
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => openEditModal(branch)} className="text-blue-400 hover:bg-blue-950/40">
                                <Edit2 className="h-4 w-4 mr-1" /> Edit
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Branch Modal */}
      <Modal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Branch">
        <div className="flex gap-2 border-b border-border/40 mb-4 pb-2 text-sm">
          <button type="button" onClick={() => setActiveTab('info')} className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'info' ? 'bg-primary/20 text-primary font-medium' : 'text-[#8D9AB5] hover:text-[#E8EDF8]'}`}>1. Basic Details</button>
          <button type="button" onClick={() => setActiveTab('fee')} className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'fee' ? 'bg-primary/20 text-primary font-medium' : 'text-[#8D9AB5] hover:text-[#E8EDF8]'}`}>2. Fee Structure</button>
          <button type="button" onClick={() => setActiveTab('template')} className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'template' ? 'bg-primary/20 text-primary font-medium' : 'text-[#8D9AB5] hover:text-[#E8EDF8]'}`}>3. Agreement Template</button>
        </div>

        <form onSubmit={handleCreateSubmit} className="space-y-4 text-[#E8EDF8]">
          {activeTab === 'info' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#8D9AB5]">Branch Name</label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. HomeGenny Delhi HQ" className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary placeholder-[#8D9AB5]/30" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#8D9AB5]">City</label>
                  <Input required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#8D9AB5]">State</label>
                  <Input required value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#8D9AB5]">Full Address</label>
                <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#8D9AB5]">Contact Phone (Optional)</label>
                  <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#8D9AB5]">Contact Email (Optional)</label>
                  <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#8D9AB5]">GSTIN (Optional)</label>
                <Input value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value})} className="font-mono bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
              </div>
            </>
          )}

          {activeTab === 'fee' && (
            <div className="space-y-4">
              <p className="text-xs text-[#8D9AB5]">Configure branch-level commercial fee percentages and tax calculations.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#8D9AB5]">Management Fee (%)</label>
                  <Input type="number" step="0.1" value={formData.managementFeePct} onChange={e => setFormData({...formData, managementFeePct: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#8D9AB5]">Placement Commission (%)</label>
                  <Input type="number" step="0.1" value={formData.placementCommissionPct} onChange={e => setFormData({...formData, placementCommissionPct: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#8D9AB5]">Service Charge (%)</label>
                  <Input type="number" step="0.1" value={formData.serviceChargePct} onChange={e => setFormData({...formData, serviceChargePct: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#8D9AB5]">GST Rate (%)</label>
                  <Input type="number" step="0.1" value={formData.gstPct} onChange={e => setFormData({...formData, gstPct: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8]" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'template' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8D9AB5]">Branch Legal & Agreement Template</label>
              <textarea
                rows={6}
                value={formData.agreementTemplate}
                onChange={e => setFormData({...formData, agreementTemplate: e.target.value})}
                placeholder="Enter template text for branch placement agreements..."
                className="w-full rounded-xl bg-[#0F172A]/50 border border-border p-3 text-xs text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t border-border/40 mt-6">
            <div className="text-xs text-[#8D9AB5]">
              {activeTab === 'info' && 'Step 1 of 3'}
              {activeTab === 'fee' && 'Step 2 of 3'}
              {activeTab === 'template' && 'Step 3 of 3'}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} className="border-border hover:bg-[#1C2740] hover:text-white">Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Branch'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Branch Modal */}
      <Modal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Branch">
        <div className="flex gap-2 border-b border-border/40 mb-4 pb-2 text-sm">
          <button type="button" onClick={() => setActiveTab('info')} className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'info' ? 'bg-primary/20 text-primary font-medium' : 'text-[#8D9AB5] hover:text-[#E8EDF8]'}`}>1. Basic Details</button>
          <button type="button" onClick={() => setActiveTab('fee')} className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'fee' ? 'bg-primary/20 text-primary font-medium' : 'text-[#8D9AB5] hover:text-[#E8EDF8]'}`}>2. Fee Structure</button>
          <button type="button" onClick={() => setActiveTab('template')} className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'template' ? 'bg-primary/20 text-primary font-medium' : 'text-[#8D9AB5] hover:text-[#E8EDF8]'}`}>3. Agreement Template</button>
        </div>

        <form onSubmit={handleEditSubmit} className="space-y-4 text-[#E8EDF8]">
          {activeTab === 'info' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#8D9AB5]">Branch Name</label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#8D9AB5]">City</label>
                  <Input required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#8D9AB5]">State</label>
                  <Input required value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#8D9AB5]">Full Address</label>
                <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#8D9AB5]">Contact Phone (Optional)</label>
                  <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#8D9AB5]">Contact Email (Optional)</label>
                  <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#8D9AB5]">GSTIN (Optional)</label>
                <Input value={formData.gstin} onChange={e => setFormData({...formData, gstin: e.target.value})} className="font-mono bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
              </div>
            </>
          )}

          {activeTab === 'fee' && (
            <div className="space-y-4">
              <p className="text-xs text-[#8D9AB5]">Configure branch-level commercial fee percentages and tax calculations.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#8D9AB5]">Management Fee (%)</label>
                  <Input type="number" step="0.1" value={formData.managementFeePct} onChange={e => setFormData({...formData, managementFeePct: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#8D9AB5]">Placement Commission (%)</label>
                  <Input type="number" step="0.1" value={formData.placementCommissionPct} onChange={e => setFormData({...formData, placementCommissionPct: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#8D9AB5]">Service Charge (%)</label>
                  <Input type="number" step="0.1" value={formData.serviceChargePct} onChange={e => setFormData({...formData, serviceChargePct: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#8D9AB5]">GST Rate (%)</label>
                  <Input type="number" step="0.1" value={formData.gstPct} onChange={e => setFormData({...formData, gstPct: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8]" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'template' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8D9AB5]">Branch Legal & Agreement Template</label>
              <textarea
                rows={6}
                value={formData.agreementTemplate}
                onChange={e => setFormData({...formData, agreementTemplate: e.target.value})}
                placeholder="Enter template text for branch placement agreements..."
                className="w-full rounded-xl bg-[#0F172A]/50 border border-border p-3 text-xs text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border/40 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="border-border hover:bg-[#1C2740] hover:text-white">Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Branch Details Modal */}
      {selectedBranch && (
        <Modal open={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={`Branch Details: ${selectedBranch.name}`}>
          <div className="space-y-6 pt-2 text-[#E8EDF8]">
            <div className="bg-[#0F172A]/60 p-4 rounded-xl border border-border/40 space-y-2">
              <h3 className="text-sm font-semibold text-primary">Basic Information</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-[#8D9AB5]">City:</span> {selectedBranch.city}, {selectedBranch.state}</div>
                <div><span className="text-[#8D9AB5]">GSTIN:</span> {selectedBranch.gstin || 'Not configured'}</div>
                <div><span className="text-[#8D9AB5]">Phone:</span> {selectedBranch.phone || 'N/A'}</div>
                <div><span className="text-[#8D9AB5]">Email:</span> {selectedBranch.email || 'N/A'}</div>
                <div className="col-span-2"><span className="text-[#8D9AB5]">Address:</span> {selectedBranch.address || 'N/A'}</div>
              </div>
            </div>

            <div className="bg-[#0F172A]/60 p-4 rounded-xl border border-border/40 space-y-2">
              <h3 className="text-sm font-semibold text-amber-400">Fee Structure Configuration</h3>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>Management Fee: <span className="text-amber-400">{selectedBranch.feeStructure?.managementFeePct ?? 10}%</span></div>
                <div>Placement Commission: <span className="text-emerald-400">{selectedBranch.feeStructure?.placementCommissionPct ?? 5}%</span></div>
                <div>Service Charge: <span className="text-purple-400">{selectedBranch.feeStructure?.serviceChargePct ?? 8}%</span></div>
                <div>GST Rate: <span className="text-sky-400">{selectedBranch.feeStructure?.gstPct ?? 18}%</span></div>
              </div>
            </div>

            <div className="bg-[#0F172A]/60 p-4 rounded-xl border border-border/40 space-y-2">
              <h3 className="text-sm font-semibold text-sky-400">Assigned RMs & Branch Managers</h3>
              {Array.isArray(selectedBranch.users) && selectedBranch.users.length > 0 ? (
                <div className="space-y-1 text-xs">
                  {selectedBranch.users.map((u: any) => (
                    <div key={u.id} className="flex justify-between items-center py-1 border-b border-border/20 last:border-0">
                      <div>
                        <span className="font-medium text-[#E8EDF8]">{u.fullName}</span>
                        <span className="text-[#8D9AB5] ml-2">({u.phone})</span>
                      </div>
                      <Badge className={u.role === 'BM' ? 'bg-sky-950/80 text-sky-300' : 'bg-purple-950/80 text-purple-300'}>{u.role}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8D9AB5]/60 italic">No users currently assigned to this branch.</p>
              )}
            </div>

            <div className="bg-[#0F172A]/60 p-4 rounded-xl border border-border/40 space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">Agreement Template</h3>
              <p className="text-xs text-[#8D9AB5] whitespace-pre-wrap bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                {selectedBranch.agreementTemplate || 'Standard Branch Agreement: Service and placement terms governed under local branch jurisdiction.'}
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
