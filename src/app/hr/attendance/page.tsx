'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Spinner } from '@/components/ui/loading';
import { Calendar, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_ICONS = {
  PRESENT: <CheckCircle className="h-4 w-4 text-green-400" />,
  ABSENT: <XCircle className="h-4 w-4 text-red-400" />,
  LEAVE: <Clock className="h-4 w-4 text-yellow-400" />,
  HALF_DAY: <AlertTriangle className="h-4 w-4 text-orange-400" />,
};

export default function HrAttendancePage() {
  const [date] = useState(new Date().toISOString().split('T')[0]); // Today's date by default

  const { data, isLoading } = useQuery({
    queryKey: ['staff', 'hr'],
    queryFn: () => api.listStaff({ limit: 100 }),
  });

  const employees: any[] = Array.isArray(data)
    ? data
    : (data as any)?.data?.items ?? (data as any)?.data ?? [];

  const [attendance, setAttendance] = useState<Record<string, string>>({});

  const handleStatusChange = (empId: string, status: string) => {
    setAttendance(prev => ({
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

    try {
      const promises = changes.map(([empId, status]) =>
        api.markAttendance({
          employeeId: empId,
          date,
          status: statusMap[status] || 'Present',
        })
      );
      await Promise.all(promises);
      toast.success('Attendance records saved successfully');
      // Clear tracking after save
      setAttendance({});
    } catch (error: any) {
      console.error('Save failed:', error);
      toast.error(error?.response?.data?.message || 'Failed to save attendance');
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
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Save All
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-background/40 backdrop-blur-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Employee ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Status (Today)</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp: any) => {
              const currentStatus = attendance[emp.id] || 'PRESENT';
              return (
                <tr key={emp.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-secondary-foreground">{emp.staff_code ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-white">{emp.full_name ?? emp.name ?? '—'}</td>
                  <td className="px-4 py-3 text-secondary-foreground">{emp.series ?? '—'}</td>
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
    </div>
  );
}
