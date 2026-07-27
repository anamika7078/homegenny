'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { HR_BRANCH_ID, unwrapData, unwrapItems } from '@/lib/hr/utils';
export default function HrCreateEmployeePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    email: '',
    gender: 'Female',
    dateOfBirth: '1995-01-01',
    address: 'Delhi',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
    joiningDate: new Date().toISOString().split('T')[0],
    categoryId: '',
    branchId: HR_BRANCH_ID,
    salary: '18000',
    docsNotAvailable: false,
    onboardingRemark: '',
  });

  const { data: categoriesRaw, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', 'hr'],
    queryFn: () => api.listCategories(),
  });

  const { data: branchesRaw, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches', 'hr'],
    queryFn: () => api.listBranches(),
  });

  const categories = unwrapItems(categoriesRaw);
  const branches = unwrapItems(branchesRaw);

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createEmployee(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['employees', 'hr'] });
      const employee = unwrapData(res) ?? res?.data ?? res;
      toast.success(`Employee created! ID: ${employee?.employeeId ?? 'saved'}`);
      if (employee?.id) {
        router.push(`/hr/employees/${employee.id}/documents`);
      } else {
        router.push('/hr/employees');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create employee');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.mobile) {
      toast.error('Name and phone are required');
      return;
    }
    if (formData.mobile.length < 10) {
      toast.error('Phone number must be at least 10 digits');
      return;
    }
    if (!formData.categoryId) {
      toast.error('Please select a category');
      return;
    }
    if (formData.docsNotAvailable && !formData.onboardingRemark.trim()) {
      toast.error('Please leave a remark when documents are not available');
      return;
    }

    const category = categories.find((c: any) => c.id === formData.categoryId);
    const categoryName = category?.name ?? 'Operations';

    createMutation.mutate({
      fullName: formData.fullName,
      mobile: formData.mobile,
      email: formData.email || undefined,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      pincode: formData.pincode,
      emergencyContact: formData.docsNotAvailable
        ? { onboardingRemark: formData.onboardingRemark.trim(), docsNotAvailableAtCreate: true }
        : {},
      joiningDate: formData.joiningDate,
      branchId: formData.branchId || HR_BRANCH_ID,
      categoryId: formData.categoryId,
      department: categoryName,
      designation: categoryName,
      employmentType: 'Full-time',
      salary: Number(formData.salary) || 18000,
      status: 'Active',
    });
  };

  return (
    <div className="page-padding max-w-[1000px] mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/hr/employees" className="rounded-xl bg-white/5 p-2 hover:bg-white/10 transition-colors">
          <ArrowLeft className="h-5 w-5 text-secondary-foreground" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/10 p-2.5">
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Create New Employee</h1>
            <p className="text-xs text-secondary-foreground">Add staff to HR database</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-card p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-secondary-foreground">
            Personal Details
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Full Name"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
            <Input
              label="Mobile Number"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
              maxLength={10}
              required
            />
            <Input
              label="Email Address (Optional)"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">Gender</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <Input
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              required
            />
            <Input
              label="Joining Date"
              type="date"
              value={formData.joiningDate}
              onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
              required
            />
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-semibold text-white">Category</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                required
                disabled={categoriesLoading}
              >
                <option value="">Select category</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-semibold text-white">Branch Assignment</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                disabled={branchesLoading}
              >
                <option value={HR_BRANCH_ID}>Corporate / Default Branch (All Modules)</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.city ? `(${b.city})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Monthly Salary (₹)"
              type="number"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              required
            />
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
            />
            <Input
              label="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              required
            />
            <Input
              label="Pincode"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
              maxLength={6}
              required
            />
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-semibold text-white">Address</label>
              <textarea
                className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="space-y-3 sm:col-span-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.docsNotAvailable}
                  onChange={(e) =>
                    setFormData({ ...formData, docsNotAvailable: e.target.checked })
                  }
                  className="rounded border-white/20"
                />
                Documents not available yet — leave a remark to continue onboarding
              </label>
              {formData.docsNotAvailable && (
                <textarea
                  placeholder="Remark (required) — e.g. PAN applied for, documents with candidate"
                  value={formData.onboardingRemark}
                  onChange={(e) => setFormData({ ...formData, onboardingRemark: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-amber-500/30 bg-background px-3 py-2 text-sm text-white placeholder:text-secondary-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={createMutation.isPending || categoriesLoading}>
              {createMutation.isPending ? 'Saving...' : 'Create & Continue Onboarding'}
            </Button>
          </div> </div>
      </form>
    </div>

  );
}
