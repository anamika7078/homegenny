'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth.store';

export function useRmScope() {
  const user = useAuthStore((s) => s.user);
  return {
    rmId: user?.role === 'RM' ? user.id : undefined,
    branchId: user?.branch_id ?? undefined,
    user,
  };
}

export function useRmDashboard() {
  return useQuery({
    queryKey: ['rm-dashboard'],
    queryFn: () => api.getRmDashboard(),
    refetchInterval: 60_000,
  });
}

export function useRmKanban(params?: { search?: string; series?: string }) {
  return useQuery({
    queryKey: ['rm-kanban', params],
    queryFn: () => api.getRmKanban(params),
    refetchInterval: 30_000,
  });
}

export function useRmAdvanceStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      staffId: string;
      to_stage: string;
      reason_code?: string;
      payload?: Record<string, unknown>;
    }) => api.advanceRmPipeline(input.staffId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rm-kanban'] });
      qc.invalidateQueries({ queryKey: ['rm-dashboard'] });
      qc.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useRmStaffList(params?: Record<string, unknown>) {
  const { rmId } = useRmScope();
  return useQuery({
    queryKey: ['staff', rmId, params],
    queryFn: () => api.listStaff({ ...params, rmId, limit: params?.limit ?? 100 }),
  });
}
