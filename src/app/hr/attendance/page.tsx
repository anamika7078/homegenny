'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { Spinner } from '@/components/ui/loading';
import { Calendar, CheckCircle, XCircle, Clock, AlertTriangle, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { unwrapItems } from '@/lib/hr/utils';

const STATUS_ICONS = {
  PRESENT: <CheckCircle className="h-4 w-4 text-green-400" />,
  ABSENT: <XCircle className="h-4 w-4 text-red-400" />,
  LEAVE: <Clock className="h-4 w-4 text-yellow-400" />,
  HALF_DAY: <AlertTriangle className="h-4 w-4 text-orange-400" />,
};

function unwrapEmployees(data: unknown): any[] {
  return unwrapItems(data);
}

export default function HrAttendancePage() {
  const [date] = useState(new Date().toISOString().split('T')[0]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', 'hr', 'attendance'],
    queryFn: () => api.listEmployees({ limit: 100, status: 'Active' }),
  });

  const employees = unwrapEmployees(data);

  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleStatusChange = (empId: string, status: string) => {
    setAttendance((prev) => ({
      ...prev,
      [empId]: status,
    }));
  };

  const handleSave = async () => {
    const changes = Object.entries(attendance);
    if (changes.length === 0) {
      toast('No changes to save', { icon: 'ℹ️' });
      return;
    }

    const statusMap: Record<string, string> = {
      PRESENT: 'Present',
      ABSENT: 'Absent',
      LEAVE: 'Leave',
      HALF_DAY: 'Half Day',
    };

    setSaving(true);
    try {
      await Promise.all(
        changes.map(([empId, status]) =>
          api.markAttendance({
            employeeId: empId,
            date,
            status: statusMap[status] || 'Present',
          }),
        ),
      );
      toast.success('Attendance records saved successfully');
      setAttendance({});
    } catch (err: any) {
      console.error('Save failed:', err);
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to save attendance';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    toast.success('Exporting attendance report...');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-padding max-w-[1600px] mx-auto py-24 text-center">
        <p className="text-red-400 text-sm">Failed to load employees. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="page-padding max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-purple-500/10 p-2.5">
            <Calendar className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Daily Attendance</h1>
            <p className="text-sm text-secondary-foreground">Mark attendance for {date}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Export Report
          </button>
          <button
            onClick={handleSave}
            disabled={saving || employees.length === 0}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save All'}
          </button>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-background/40 p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-secondary-foreground/40 mb-3" />
          <p className="text-secondary-foreground text-sm mb-4">
            No employees found. Add employees first, then mark attendance.
          </p>
          <Link
            href="/hr/employees/create"
            className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Add Employee
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-background/40 backdrop-blur-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Employee ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                  Status (Today)
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp: any) => {
                const currentStatus = attendance[emp.id] || 'PRESENT';
                return (
                  <tr key={emp.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-secondary-foreground">{emp.employeeId ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-white">{emp.fullName ?? '—'}</td>
                    <td className="px-4 py-3 text-secondary-foreground">
                      {emp.category?.name ?? emp.department ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(emp.id, e.target.value)}
                          className="rounded-lg border border-white/10 bg-background px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="PRESENT">Present</option>
                          <option value="HALF_DAY">Half Day</option>
                          <option value="LEAVE">Leave</option>
                          <option value="ABSENT">Absent</option>
                        </select>
                        {STATUS_ICONS[currentStatus as keyof typeof STATUS_ICONS]}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
