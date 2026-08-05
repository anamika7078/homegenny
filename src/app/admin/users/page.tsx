"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { api } from '@/lib/api/client';
import { Search, Plus, Edit2, ShieldBan, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { SelectMenu, SelectMenuItem } from '@/components/ui/select-menu';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    role: 'STAFF',
    branchId: ''
  });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.getAdminUsers(),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['admin', 'branches'],
    queryFn: () => api.getAdminBranches(),
  });

  const users = Array.isArray(usersData) ? usersData : (usersData?.data || []);
  const branches = Array.isArray(branchesData) ? branchesData : (branchesData?.data || []);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createAdminUser(data),
    onSuccess: () => {
      toast.success("User created successfully");
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsCreateModalOpen(false);
      setFormData({ fullName: '', phone: '', email: '', password: '', role: 'STAFF', branchId: '' });
    },
    onError: (error: any) => toast.error(error.message || "Failed to create user")
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateAdminUser(data.id, data),
    onSuccess: () => {
      toast.success("User updated successfully");
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsEditModalOpen(false);
    },
    onError: (error: any) => toast.error(error.message || "Failed to update user")
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.deactivateAdminUser(id),
    onSuccess: () => {
      toast.success("User deactivated successfully");
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error: any) => toast.error(error.message || "Failed to deactivate user")
  });

  const filteredUsers = users.filter((u: any) => 
    u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.includes(searchTerm) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ ...formData, id: selectedUser.id });
  };

  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setFormData({
      fullName: user.fullName || '',
      phone: user.phone || '',
      email: user.email || '',
      password: '',
      role: user.role || 'STAFF',
      branchId: user.branchId || ''
    });
    setIsEditModalOpen(true);
  };

  return (
    <div className="page-padding space-y-6 sm:space-y-8 min-h-screen text-[#E8EDF8]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#E8EDF8]">User Management</h1>
          <p className="text-[#8D9AB5] mt-1 text-sm">Manage platform users, roles, and branch assignments.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="shadow-md hover:shadow-lg transition-all">
          <Plus className="mr-2 h-4 w-4" /> Create User
        </Button>
      </div>

      <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-border/40">
          <CardTitle className="text-xl font-bold text-[#E8EDF8]">All Platform Users</CardTitle>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D9AB5]/70 h-4 w-4" />
            <Input 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-[#0F172A]/50 border-border text-[#E8EDF8] placeholder-[#8D9AB5]/50 focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-[#8D9AB5]">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0F172A]/80 text-[#8D9AB5] uppercase text-xs border-b border-border/60">
                  <tr>
                    <th className="px-6 py-4 font-semibold">User</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Branch</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[#8D9AB5]/70">
                        No users found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user: any) => (
                      <tr key={user.id} className="hover:bg-accent/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-[#E8EDF8]">{user.fullName || 'Unnamed'}</div>
                          <div className="text-xs text-[#8D9AB5] flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-[#8D9AB5]/70"/>{user.phone}</span>
                            {user.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-[#8D9AB5]/70"/>{user.email}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="border-border bg-slate-900/40 text-slate-300 font-mono text-xs">
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-[#8D9AB5]">
                          {user.branch ? (
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-[#8D9AB5]/70"/>{user.branch.name}</span>
                          ) : (
                            <span className="text-[#8D9AB5]/60 italic">Global</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {user.isActive ? (
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
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(user)} className="text-blue-400 hover:bg-blue-950/40 mr-2">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {user.isActive && (
                            <Button variant="ghost" size="sm" onClick={() => deactivateMutation.mutate(user.id)} className="text-rose-400 hover:bg-rose-950/40">
                              <ShieldBan className="h-4 w-4" />
                            </Button>
                          )}
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

      {/* Create User Modal */}
      <Modal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New User">
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4 text-[#E8EDF8]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#8D9AB5]">Full Name</label>
            <Input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8D9AB5]">Phone</label>
              <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8D9AB5]">Email</label>
              <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#8D9AB5]">Password (Optional — Default: HomeGenny@2024)</label>
            <Input
              type="password"
              placeholder="Enter custom password"
              value={formData.password || ''}
              onChange={e => setFormData({...formData, password: e.target.value})}
              className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8D9AB5]">Role</label>
              <SelectMenu
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v })}
                placeholder="Select role"
                className="bg-[#0F172A]/50 border-border"
              >
                <SelectMenuItem value="STAFF">Staff</SelectMenuItem>
                <SelectMenuItem value="CLIENT">Client</SelectMenuItem>
                <SelectMenuItem value="RM">Relationship Manager</SelectMenuItem>
                <SelectMenuItem value="BM">Branch Manager</SelectMenuItem>
                <SelectMenuItem value="FINANCE">Finance</SelectMenuItem>
                <SelectMenuItem value="ADMIN">Admin</SelectMenuItem>
                <SelectMenuItem value="TRAINER">Trainer</SelectMenuItem>
                <SelectMenuItem value="ASSESSOR">Assessor</SelectMenuItem>
                <SelectMenuItem value="SUPPORT">Support</SelectMenuItem>
              </SelectMenu>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8D9AB5]">Branch (Optional)</label>
              <SelectMenu
                value={formData.branchId || 'NONE'}
                onValueChange={(v) => setFormData({ ...formData, branchId: v === 'NONE' ? '' : v })}
                placeholder="Select Branch"
                className="bg-[#0F172A]/50 border-border"
              >
                <SelectMenuItem value="NONE">Global (No Branch)</SelectMenuItem>
                {branches.map((b: any) => (
                  <SelectMenuItem key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </SelectMenuItem>
                ))}
              </SelectMenu>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border/40 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} className="border-border hover:bg-[#1C2740] hover:text-white">Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit User">
        <form onSubmit={handleEditSubmit} className="space-y-4 pt-4 text-[#E8EDF8]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#8D9AB5]">Full Name</label>
            <Input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8D9AB5]">Phone</label>
              <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8D9AB5]">Email</label>
              <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="bg-[#0F172A]/50 border-border text-[#E8EDF8] focus:ring-1 focus:ring-primary focus:border-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8D9AB5]">Role</label>
              <SelectMenu
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v })}
                placeholder="Select role"
                className="bg-[#0F172A]/50 border-border"
              >
                <SelectMenuItem value="STAFF">Staff</SelectMenuItem>
                <SelectMenuItem value="CLIENT">Client</SelectMenuItem>
                <SelectMenuItem value="RM">Relationship Manager</SelectMenuItem>
                <SelectMenuItem value="BM">Branch Manager</SelectMenuItem>
                <SelectMenuItem value="FINANCE">Finance</SelectMenuItem>
                <SelectMenuItem value="ADMIN">Admin</SelectMenuItem>
                <SelectMenuItem value="TRAINER">Trainer</SelectMenuItem>
                <SelectMenuItem value="ASSESSOR">Assessor</SelectMenuItem>
                <SelectMenuItem value="SUPPORT">Support</SelectMenuItem>
              </SelectMenu>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8D9AB5]">Branch (Optional)</label>
              <SelectMenu
                value={formData.branchId || 'NONE'}
                onValueChange={(v) => setFormData({ ...formData, branchId: v === 'NONE' ? '' : v })}
                placeholder="Select Branch"
                className="bg-[#0F172A]/50 border-border"
              >
                <SelectMenuItem value="NONE">Global (No Branch)</SelectMenuItem>
                {branches.map((b: any) => (
                  <SelectMenuItem key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </SelectMenuItem>
                ))}
              </SelectMenu>
            </div>
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
