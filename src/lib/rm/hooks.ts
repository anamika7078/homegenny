'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, resolvePlayableVideoUrl } from '@/lib/api/client';
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

/** Staff who self-registered from the app: S1 already done, no RM yet. */
export function useUnassignedStaff() {
  return useQuery({
    queryKey: ['rm-unassigned-staff'],
    queryFn: () => api.listUnassignedStaff(),
    refetchInterval: 30_000,
  });
}

/** First to claim wins — see the 409 message for what to show on a race loss. */
export function useClaimStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (staffId: string) => api.claimStaff(staffId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rm-unassigned-staff'] });
      qc.invalidateQueries({ queryKey: ['rm-kanban'] });
      qc.invalidateQueries({ queryKey: ['rm-dashboard'] });
    },
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
      terminal_outcome?: string;
    }) => api.advanceRmPipeline(input.staffId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rm-kanban'] });
      qc.invalidateQueries({ queryKey: ['rm-dashboard'] });
      qc.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

function useInvalidateHolds() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['rm-kanban'] });
    qc.invalidateQueries({ queryKey: ['rm-holds'] });
  };
}

/** Puts a stage on hold — the staff may still advance past it. */
export function usePlaceHold() {
  const invalidate = useInvalidateHolds();
  return useMutation({
    mutationFn: (input: { staffId: string; reason: string; stage?: string; notes?: string }) =>
      api.placeRmHold(input.staffId, { reason: input.reason, stage: input.stage, notes: input.notes }),
    onSuccess: invalidate,
  });
}

/**
 * Marks a stage complete — for a staff whose work there already happened
 * outside the system. Permanent, not re-checked, and unlike a hold it does
 * not block placement.
 */
export function useMarkComplete() {
  const invalidate = useInvalidateHolds();
  return useMutation({
    mutationFn: (input: { staffId: string; reason: string; stage?: string; notes?: string }) =>
      api.markRmComplete(input.staffId, { reason: input.reason, stage: input.stage, notes: input.notes }),
    onSuccess: invalidate,
  });
}

/**
 * Releases a HOLD (400s, with what's missing, if the staff moved past the
 * held stage and its gate still fails) or reverts a COMPLETE (always
 * succeeds — there's no gate result to re-check, just the RM's word).
 */
export function useReleaseHold() {
  const invalidate = useInvalidateHolds();
  return useMutation({
    mutationFn: (input: { holdId: string; notes?: string }) => api.releaseRmHold(input.holdId, input.notes),
    onSuccess: invalidate,
  });
}

export function useRmStaffList(params?: Record<string, unknown>) {
  const { rmId } = useRmScope();
  return useQuery({
    queryKey: ['staff', rmId, params],
    queryFn: () => api.listStaff({ ...params, rmId, limit: params?.limit ?? 100 }),
  });
}

export function useVerificationStatus(staffId: string) {
  return useQuery({
    queryKey: ['verification-status', staffId],
    queryFn: () => api.getVerificationStatus(staffId),
    enabled: !!staffId,
  });
}

function useInvalidateVerification(staffId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['verification-status', staffId] });
    qc.invalidateQueries({ queryKey: ['staff'] });
  };
}

export function useGenerateAadhaarOtp() {
  return useMutation({
    mutationFn: (body: { aadhaar_number: string }) => api.generateAadhaarOtp(body),
  });
}

export function useVerifyAadhaarOtp(staffId: string) {
  const invalidate = useInvalidateVerification(staffId);
  return useMutation({
    mutationFn: (body: { reference_id: string; otp: string; aadhaar_number: string }) =>
      api.verifyAadhaarOtp({ ...body, staff_id: staffId }),
    onSuccess: invalidate,
  });
}

export function useVerifyDL(staffId: string) {
  const invalidate = useInvalidateVerification(staffId);
  return useMutation({
    mutationFn: (body: { dl_number: string; dob: string }) => api.verifyDL({ ...body, staff_id: staffId }),
    onSuccess: invalidate,
  });
}

export function useCheckEchallan(staffId: string) {
  const invalidate = useInvalidateVerification(staffId);
  return useMutation({
    mutationFn: (dlNumber: string) => api.checkEchallan(dlNumber, staffId),
    onSuccess: invalidate,
  });
}

export function useSubmitPoliceVerification(staffId: string) {
  const invalidate = useInvalidateVerification(staffId);
  return useMutation({
    mutationFn: (body?: { notes?: string }) => api.submitPoliceVerification(staffId, body),
    onSuccess: invalidate,
  });
}

export function useClosePoliceVerification(staffId: string) {
  const invalidate = useInvalidateVerification(staffId);
  return useMutation({
    mutationFn: (body: { result: 'CLEAR' | 'ADVERSE'; notes?: string }) => api.closePoliceVerification(staffId, body),
    onSuccess: invalidate,
  });
}

export function useSubmitMedicalVerification(staffId: string) {
  const invalidate = useInvalidateVerification(staffId);
  return useMutation({
    mutationFn: (body: { passed: boolean; notes?: string }) => api.submitMedicalVerification(staffId, body),
    onSuccess: invalidate,
  });
}

// ── Agreements (A1 EOR) ──────────────────────────────────────────────────

export function useStaffAgreements(staffId: string) {
  return useQuery({
    queryKey: ['agreements', staffId],
    queryFn: () => api.listAgreements({ staffId }),
    enabled: !!staffId,
  });
}

function useInvalidateAgreements(staffId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['agreements', staffId] });
}

export function useCreateAgreement(staffId: string) {
  const invalidate = useInvalidateAgreements(staffId);
  return useMutation({
    mutationFn: (body: { type: string; client_id?: string }) => api.createAgreement({ staff_id: staffId, ...body }),
    onSuccess: invalidate,
  });
}

export function useSendEsignOtp(staffId: string) {
  const invalidate = useInvalidateAgreements(staffId);
  return useMutation({
    mutationFn: (body: { agreement_type: string; staff_name: string }) =>
      api.sendAgreementEsignOtp({ staff_id: staffId, ...body }),
    onSuccess: invalidate,
  });
}

export function useVerifyEsignOtp(staffId: string) {
  const invalidate = useInvalidateAgreements(staffId);
  return useMutation({
    mutationFn: (body: { agreement_type: string; otp: string }) =>
      api.verifyAgreementOtp({ staff_id: staffId, ...body }),
    onSuccess: invalidate,
  });
}

export function useSignAgreement(staffId: string) {
  const invalidate = useInvalidateAgreements(staffId);
  return useMutation({
    mutationFn: ({ id, otp }: { id: string; otp?: string }) => api.signAgreement(id, { otp }),
    onSuccess: invalidate,
  });
}

export function useGenerateAgreementPdf(staffId: string) {
  const invalidate = useInvalidateAgreements(staffId);
  return useMutation({
    mutationFn: (id: string) => api.generateAgreementPdf(id),
    onSuccess: invalidate,
  });
}

// ── Scope of Work (A2) ───────────────────────────────────────────────────

export function usePlacementSow(placementId: string) {
  return useQuery({
    queryKey: ['sow', placementId],
    queryFn: () => api.listSow(placementId),
    enabled: !!placementId,
  });
}

function useInvalidateSow(placementId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['sow', placementId] });
}

export function useCreateSow(placementId: string) {
  const invalidate = useInvalidateSow(placementId);
  return useMutation({
    mutationFn: (body: { content: string; is_non_standard?: boolean }) =>
      api.createSow({ placement_id: placementId, ...body }),
    onSuccess: invalidate,
  });
}

export function useSendSow(placementId: string) {
  const invalidate = useInvalidateSow(placementId);
  return useMutation({
    mutationFn: (id: string) => api.sendSow(id),
    onSuccess: invalidate,
  });
}

export function useAmendSow(placementId: string) {
  const invalidate = useInvalidateSow(placementId);
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => api.amendSow(id, content),
    onSuccess: invalidate,
  });
}

// ── Client Indemnity (A3) ────────────────────────────────────────────────

export function usePlacementIndemnity(placementId: string) {
  return useQuery({
    queryKey: ['indemnity', placementId],
    queryFn: () => api.listIndemnity(placementId),
    enabled: !!placementId,
  });
}

// ── Video Certification (read-only for RM) ──────────────────────────────

export function useVideoCertPrompts(series: string) {
  return useQuery({
    queryKey: ['video-cert-prompts', series],
    queryFn: () => api.getVideoCertPrompts(series),
    enabled: !!series,
  });
}

export function useStaffVideoCerts(staffId: string) {
  return useQuery({
    queryKey: ['video-certs', staffId],
    queryFn: () => api.listVideoCertsForStaff(staffId),
    enabled: !!staffId,
  });
}

export function useVideoCertViewUrl() {
  return useMutation({
    mutationFn: async (key: string) => {
      const res = (await api.getVideoCertViewUrl(key)) as { data?: { url?: string } } & { url?: string };
      const raw = res?.data?.url ?? res?.url;
      const url = await resolvePlayableVideoUrl(raw);
      return { url };
    },
  });
}

export function useCreateIndemnity(placementId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { clause_version: string; clause_text: string }) =>
      api.createIndemnity({ placement_id: placementId, ...body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['indemnity', placementId] }),
  });
}
