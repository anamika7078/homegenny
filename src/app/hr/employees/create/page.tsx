'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  { value: 'DRIVER', label: 'Driver' },
  { value: 'MAID', label: 'Maid / Cook' },
  { value: 'SKILLED_CARE', label: 'Skilled Care (SC)' },
  { value: 'UNSKILLED_CARE', label: 'Unskilled Care (UC)' },
];

export default function HrCreateEmployeePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    series: 'MAID',
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.createStaff(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'hr'] });
      toast.success(`Employee created! ID: ${res.staff_code}`);
      router.push(`/hr/employees`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create employee');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone) {
      toast.error('Name and Phone are required');
      return;
    }
    if (formData.phone.length < 10) {
      toast.error('Phone number must be at least 10 digits');
      return;
    }

    createMutation.mutate({
      full_name: formData.fullName,
      phone: formData.phone,
      series: formData.series,
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
            <h1 className="text-xl font-bold text-white sm:text-2xl">Add New Employee</h1>
            <p className="text-sm text-secondary-foreground">Enter basic details to onboard staff</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-background/40 p-6 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <Input
              label="Full Name"
              placeholder="e.g. Anamika Singh"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
            <Input
              label="Phone Number"
              placeholder="9876543210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
              maxLength={10}
              required
            />
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-white">Category / Role</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-background px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={formData.series}
                onChange={(e) => setFormData({ ...formData, series: e.target.value })}
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="rounded-lg bg-blue-500/10 p-4 border border-blue-500/20">
            <p className="text-sm text-blue-200">
              <strong>Note:</strong> The Employee ID will be automatically generated upon creation (e.g. if the name is Anamika, the ID will be anamika001, anamika002, etc. based on availability).
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Create Employee'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
