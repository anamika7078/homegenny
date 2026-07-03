"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { api } from '@/lib/api/client';
import { Search, Plus, Edit2, Building2, MapPin, ShieldCheck, ShieldBan } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminBranchesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    state: '',
    gstin: '',
    address: '',
    phone: '',
    email: ''
  });

  const { data: branchesData, isLoading } = useQuery({
    queryKey: ['admin', 'branches'],
    queryFn: () => api.getAdminBranches(),
  });

  const branches = Array.isArray(branchesData) ? branchesData : (branchesData?.data || []);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createAdminBranch(data),
    onSuccess: () => {
      toast.success("Branch created successfully");
      queryClient.invalidateQueries({ queryKey: ['admin', 'branches'] });
      setIsCreateModalOpen(false);
      setFormData({ name: '', city: '', state: '', gstin: '', address: '', phone: '', email: '' });
    },
    onError: (error: any) => toast.error(error.message || "Failed to create branch")
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateAdminBranch(data.id, data),
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
    setFormData({
      name: branch.name || '',
      city: branch.city || '',
      state: branch.state || '',
      gstin: branch.gstin || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || ''
    });
    setIsEditModalOpen(true);
  };

  return (
    <div className="page-padding space-y-6 sm:space-y-8 min-h-screen text-[#E8EDF8]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#E8EDF8]">Branch Management</h1>
          <p className="text-[#8D9AB5] mt-1 text-sm">Manage HomeGenny operational branches, GSTIN configurations, and locations.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="shadow-md hover:shadow-lg transition-all">
          <Plus className="mr-2 h-4 w-4" /> Create Branch
        </Button>
      </div>

      <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-border/40">
          <CardTitle className="text-xl font-bold text-[#E8EDF8]">Active Branches</CardTitle>
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
                    <th className="px-6 py-4 font-semibold tracking-wider">Location</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">GSTIN</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filteredBranches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-[#8D9AB5]">
                        No branches found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBranches.map((branch: any) => (
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
                            <span className="flex items-center gap-2 font-medium text-[#E8EDF8]"><MapPin className="h-3 w-3 text-[#8D9AB5]/70"/> {branch.city}, {branch.state}</span>
                            <span className="text-xs truncate max-w-[200px] text-[#8D9AB5]/80" title={branch.address}>{branch.address}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {branch.gstin ? (
                            <span className="font-mono text-xs bg-[#0F172A]/50 px-2 py-1 rounded border border-border/40 text-[#E8EDF8]">{branch.gstin}</span>
                          ) : (
                            <span className="text-[#8D9AB5]/40 italic">Not set</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {branch.isActive ? (
                            <Badge className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 shadow-sm flex items-center gap-1 w-max">
                              <ShieldCheck className="h-3 w-3" /> Active
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-950/60 text-rose-300 border border-rose-800/40 shadow-sm flex items-center gap-1 w-max">
                              <ShieldBan className="h-3 w-3" /> Inactive
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(branch)} className="text-blue-400 hover:bg-blue-950/40 mr-2">
                            <Edit2 className="h-4 w-4 mr-1" /> Edit
                          </Button>
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

      {/* Create Branch Modal */}
      <Modal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Branch">
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4 text-[#E8EDF8]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#8D9AB5]">Branch Name</label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. HomeGenny Mumbai HQ" className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary placeholder-[#8D9AB5]/30" />
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
          <div className="flex justify-end gap-2 pt-4 border-t border-border/40 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} className="border-border hover:bg-[#1C2740] hover:text-white">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Branch'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Branch Modal */}
      <Modal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Branch">
        <form onSubmit={handleEditSubmit} className="space-y-4 pt-4 text-[#E8EDF8]">
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
          <div className="flex justify-end gap-2 pt-4 border-t border-border/40 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="border-border hover:bg-[#1C2740] hover:text-white">Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
