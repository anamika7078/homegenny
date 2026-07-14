import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { StaffAttendanceStatus } from '@/lib/types';

// NEXT_PUBLIC_API_URL is baked at Docker build time via --build-arg
// For local dev:   NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
// For production:  NEXT_PUBLIC_API_URL=https://api.homegenny.com/api/v1
export const BASE_URL =
  process.env['NEXT_PUBLIC_API_URL'] ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? `${window.location.origin}/api/v1`
    : 'http://localhost:3001/api/v1');

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  // Keep a reasonable upper bound so the UI doesn't sit “stuck” for a full minute.
  // Backend cold-starts should be fixed server-side; here we fail fast and show a toast.
  timeout: 25_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token helpers (localStorage) ─────────────────────────────────────────
const TOKEN_KEY = 'hg_access_token_v2';   // FIX 5: bumped key clears stale tokens
const REFRESH_KEY = 'hg_refresh_token_v2';
const USER_ID_KEY = 'hg_user_id_v2';

export const tokenStore = {
  getAccess: () => (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null),
  getRefresh: () => (typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null),
  getUserId: () => (typeof window !== 'undefined' ? localStorage.getItem(USER_ID_KEY) : null),
  setAccess: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  setRefresh: (t: string) => localStorage.setItem(REFRESH_KEY, t),
  setUserId: (id: string) => localStorage.setItem(USER_ID_KEY, id),
  setSessionCookie: () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'hg_auth=1; path=/; max-age=604800; SameSite=Lax';
    }
  },
  clearSessionCookie: () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'hg_auth=; path=/; max-age=0';
    }
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_ID_KEY);
    // Also clear old v1 keys so stale sessions don't interfere
    localStorage.removeItem('hg_access_token');
    localStorage.removeItem('hg_refresh_token');
    localStorage.removeItem('hg_user_id');
    tokenStore.clearSessionCookie();
  },
};

// ── Request interceptor: attach JWT ──────────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess();
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: unwrap + auto-refresh + readable errors ─────────
let isRefreshing = false;
apiClient.interceptors.response.use(
  (response) => response.data,   // unwrap — callers get body directly
  async (error) => {
    const original = error.config;

    const isAuthRoute = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');
    if (error.response?.status === 401 && !original._retry && !isAuthRoute) {
      if (isRefreshing) {
        tokenStore.clear();
        if (typeof window !== 'undefined') window.location.href = '/auth/login';
        return Promise.reject(error);
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = tokenStore.getRefresh();
        const userId = tokenStore.getUserId();
        if (!refreshToken || !userId) throw new Error('No refresh token');
        const res = await axios.post(`${BASE_URL}/auth/refresh`, {
          userId, refresh_token: refreshToken,
        });
        // FIX 3: handle both wrapped and unwrapped refresh response
        const newToken: string =
          (res.data as any)?.data?.access_token ||
          (res.data as any)?.access_token;
        if (!newToken) throw new Error('No token in refresh response');
        tokenStore.setAccess(newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch {
        tokenStore.clear();
        if (typeof window !== 'undefined') window.location.href = '/auth/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    const raw = error.response?.data as Record<string, unknown> | undefined;
    let nested = raw?.message;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const inner = nested as Record<string, unknown>;
      nested = inner.message ?? inner.error;
    }
    const msg =
      (typeof nested === 'string' ? nested : null) ||
      (Array.isArray(nested) && typeof nested[0] === 'string' ? nested[0] : null) ||
      (typeof raw?.error === 'string' ? raw.error : null) ||
      error.message ||
      'Request failed';
    const apiError = new Error(msg) as Error & { status?: number };
    apiError.status = error.response?.status;
    return Promise.reject(apiError);
  },
);

// ── Typed API calls ───────────────────────────────────────────────────────

/** Explicit interface prevents TypeScript from bleeding AxiosInstance's
 *  raw `.post`/`.get` methods into the inferred type of `api`. */
export interface ApiClient {
  login(phone: string, password: string, totp?: string): Promise<any>;
  reset2faSetup(phone: string, password: string): Promise<any>;
  logout(): Promise<any>;
  me(): Promise<any>;

  listStaff(params?: Record<string, unknown>): Promise<any>;
  getStaff(id: string): Promise<any>;
  createStaff(body: Record<string, unknown>): Promise<any>;
  updateStaff(id: string, body: Record<string, unknown>): Promise<any>;
  listEmployees(params?: Record<string, unknown>): Promise<any>;
  getEmployee(id: string): Promise<any>;
  createEmployee(body: Record<string, unknown>): Promise<any>;
  listCategories(): Promise<any>;
  getAttendanceStats(params?: { date?: string; branchId?: string }): Promise<any>;
  markAttendance(body: { employeeId: string; date: string; status: string }): Promise<any>;
  previewEmployeePayroll(employeeId: string, month: number, year: number): Promise<any>;
  generateEmployeePayroll(employeeId: string, month: number, year: number): Promise<any>;
  getEmployeePayrolls(): Promise<any>;
  uploadDocument(employeeId: string, formData: FormData): Promise<any>;
  getEmployeeDocuments(employeeId: string): Promise<any>;
  getHrNotifications(): Promise<any>;
  markHrNotificationRead(id: string): Promise<any>;
  checkRestricted(aadhaar: string, phone: string): Promise<any>;

  getPlacements(params?: Record<string, unknown>): Promise<any>;
  createPlacement(body: Record<string, unknown>): Promise<any>;
  exitPlacement(id: string, body: Record<string, unknown>): Promise<any>;

  getStaffTimeline(id: string): Promise<any>;
  listAgreements(params?: Record<string, unknown>): Promise<any>;
  sendAgreementEsignOtp(body: { staff_id: string; agreement_type: string; staff_name: string }): Promise<any>;
  verifyAgreementOtp(body: { staff_id: string; agreement_type: string; otp: string }): Promise<any>;
  signAgreement(id: string, body?: { otp?: string }): Promise<any>;
  generateAgreementPdf(id: string): Promise<any>;
  assignScCareTypes(staffId: string, careTypes: string[]): Promise<any>;
  driverVerifyApis(staffId: string, dlNumber: string): Promise<any>;
  upgradeUcToSc(staffId: string, notes?: string): Promise<any>;
  getDashboardAdmin(): Promise<any>;
  getDashboardBm(): Promise<any>;
  getDashboardRm(): Promise<any>;

  getRmDashboard(): Promise<any>;
  getRmKanban(params?: { search?: string; series?: string }): Promise<any>;
  advanceRmPipeline(
    staffId: string,
    body: { to_stage: string; reason_code?: string; payload?: Record<string, unknown> },
  ): Promise<any>;
  getRmTrials(): Promise<any>;
  getRmDeferred(): Promise<any>;
  resumeRmDeferred(staffId: string, to_stage: string): Promise<any>;
  getRmTerminal(): Promise<any>;
  getRmIncidents(status?: string): Promise<any>;
  createRmIncident(body: Record<string, unknown>): Promise<any>;
  getRmShifts(status?: string): Promise<any>;
  reviewRmShift(id: string, body: { action: string; notes?: string }): Promise<any>;
  getRmLocations(): Promise<any>;
  getRmAttendance(params: { branchId: string; month: number; year: number; branchCode?: string }): Promise<any>;
  markRmAttendance(body: {
    staff_id: string;
    date: string;
    status?: StaffAttendanceStatus | null;
    overtime_hours?: number;
    branch_id?: string;
  }): Promise<any>;
  previewRmAttendanceInvoice(staffId: string, month: number, year: number): Promise<any>;
  generateRmAttendanceInvoice(staffId: string, month: number, year: number): Promise<any>;
  getRmUpgrades(): Promise<any>;
  rmIntake(body: Record<string, unknown>): Promise<any>;

  forgotPassword(phone: string): Promise<any>;
  verifyOtp(phone: string, otp: string): Promise<any>;
  resetPassword(phone: string, otp: string, newPassword: string): Promise<any>;
  setup2fa(): Promise<any>;
  confirm2fa(code: string): Promise<any>;
  logoutAllDevices(): Promise<any>;

  getReportsConversion(): Promise<any>;
  getReportsRmProductivity(rmId?: string): Promise<any>;

  listInvoices(params?: Record<string, unknown>): Promise<any>;

  calculatePayroll(grossSalary: number, feePercent: number): Promise<any>;
  queuePayrollBatch(body: { month: number; year: number; series?: string }): Promise<any>;
  /** @deprecated Alias for queuePayrollBatch — /payroll/trigger does not exist on backend */
  triggerPayroll(month: number, year: number): Promise<any>;

  getAuditLogs(params?: { limit?: number }): Promise<any>;
  getAlarms(params?: { severity?: string; category?: string; status?: string }): Promise<any>;

  // ── Finance Role APIs ──────────────────────────────────────────────────────
  // Payroll
  getFinancePayroll(params?: { month?: number; year?: number }): Promise<any>;
  lookupFinanceStaffByCode(code: string): Promise<any>;
  previewFinanceAttendancePayroll(code: string, month: number, year: number): Promise<any>;
  generateFinanceAttendancePayroll(code: string, month: number, year: number): Promise<any>;
  downloadFinanceAttendancePreview(code: string, month: number, year: number): Promise<Blob>;
  previewFinancePayroll(placementId: string, month: number, year: number): Promise<any>;
  confirmPayrollBatch(month: number, year: number): Promise<any>;
  disbursePayroll(payrollId: string): Promise<any>;

  // Invoices
  getFinanceInvoices(params?: { status?: string; page?: number }): Promise<any>;
  getFinanceInvoice(id: string): Promise<any>;
  downloadFinanceInvoice(id: string): Promise<Blob>;
  getFinanceInvoiceSummary(): Promise<any>;
  approveFinanceInvoice(id: string): Promise<any>;
  sendFinanceInvoice(id: string): Promise<any>;

  // Settlements
  getFinanceSettlements(status?: string): Promise<any>;
  getFinanceSettlementStats(): Promise<any>;
  markSettled(invoiceId: string, paymentRef: string): Promise<any>;
  issueCreditNote(invoiceId: string, reason: string): Promise<any>;

  // ESIC / PF
  getEsicChallan(month: number, year: number): Promise<any>;
  getPfEcr(month: number, year: number): Promise<any>;
  exportEsicPf(type: 'ESIC' | 'PF', month: number, year: number): Promise<Blob>;
  /** @deprecated Use exportEsicPf — raw URL downloads bypass Bearer auth */
  getEsicPfExportUrl(type: 'ESIC' | 'PF', month: number, year: number): string;

  // Deposits
  getFinanceDeposits(status?: string): Promise<any>;
  getFinanceDepositStats(): Promise<any>;
  recordDepositEvent(staffId: string, event: string, notes?: string, scenarioCode?: string): Promise<any>;

  // Analytics
  getFinanceDashboard(): Promise<any>;
  getFinanceRevenue(): Promise<any>;
  getFinanceGst(): Promise<any>;
  getFinanceEsicPfOutflow(): Promise<any>;
  getFinanceBranchPnl(): Promise<any>;
  getFinanceInvoiceAging(): Promise<any>;
  // ───────────────────────────────────────────────────────────────────────────

  listUsers(params?: Record<string, unknown>): Promise<any>;
  createUser(body: Record<string, unknown>): Promise<any>;
  health(): Promise<any>;

  // Monitoring
  getCronJobs(): Promise<any>;
  getActivityLog(): Promise<any>;
  getSystemHealth(): Promise<any>;
  triggerCronJob(jobKey: string): Promise<any>;

  // Training
  getTrainingBatches(): Promise<any>;
  getTrainingStats(): Promise<any>;
  createTrainingBatch(body: Record<string, unknown>): Promise<any>;
  enrollInBatch(batchId: string, staffId: string): Promise<any>;
  markBatchAttendance(batchId: string, body: { staff_id: string; day_number: number; attended: boolean }): Promise<any>;
  updateBatchStatus(batchId: string, status: string): Promise<any>;

  // Trainer Role Module
  getTrainerDashboard(): Promise<any>;
  getTrainerBatches(): Promise<any>;
  reviewTrainerVideoCert(id: string, body: { status: 'APPROVED' | 'REJECTED'; notes?: string }): Promise<any>;
  updateTrainerAssessment(traineeId: string, body: Record<string, unknown>): Promise<any>;

  // Assessor Role Module
  getAssessorDashboard(): Promise<any>;
  getAssessorAssessments(): Promise<any>;
  getAssessorSchedules(): Promise<any>;
  getAssessorReports(): Promise<any>;
  createAssessment(body: Record<string, unknown>): Promise<any>;
  submitDriverAssessment(body: { id: string; score: number; result: string; remarks: string; assessor_id?: string }): Promise<any>;
  submitScAssessment(body: { id: string; score: number; result: string; remarks: string; scenario_code: string; assessor_id?: string }): Promise<any>;

  // Admin Role Module
  getAdminUsers(): Promise<any>;
  createAdminUser(body: Record<string, unknown>): Promise<any>;
  updateAdminUser(id: string, body: Record<string, unknown>): Promise<any>;
  deactivateAdminUser(id: string): Promise<any>;

  getAdminBranches(): Promise<any>;
  createAdminBranch(body: Record<string, unknown>): Promise<any>;
  updateAdminBranch(id: string, body: Record<string, unknown>): Promise<any>;

  getAdminAuditLogs(): Promise<any>;
  getAdminAuditLogDetails(id: string): Promise<any>;

  getAdminSystemHealth(): Promise<any>;
  getAdminQueueStatus(): Promise<any>;
  getAdminFailedQueueJobs(limit?: number): Promise<any>;
  retryAdminFailedQueueJobs(): Promise<any>;
  getAdminCronStatus(): Promise<any>;

  getAdminRevenueAnalytics(): Promise<any>;
  getAdminPipelineAnalytics(): Promise<any>;
  getAdminPipelineOverview(): Promise<any>;
  getAdminPlacementAnalytics(): Promise<any>;

  getAdminVideoCertifications(params?: { status?: string; search?: string; page?: number; limit?: number }): Promise<any>;
  reviewAdminVideoCertification(id: string, body: { status: 'APPROVED' | 'REJECTED'; notes?: string }): Promise<any>;
  getVideoCertViewUrl(key: string): Promise<any>;

  submitAdminDeleteRequest(body: Record<string, unknown>): Promise<any>;
  getAdminPrivacyRequests(): Promise<any>;

  // Admin Dual-Approval endpoints
  getAdminApprovals(): Promise<any>;
  approveAdminAction(id: string): Promise<any>;
  rejectAdminAction(id: string): Promise<any>;
}

export const api: ApiClient = {
  login: (phone: string, password: string, totp?: string) =>
    apiClient.post('/auth/login', { phone, password, totp }, { timeout: 35_000 }),
  reset2faSetup: (phone: string, password: string) =>
    apiClient.post('/auth/2fa/reset-setup', { phone, password }, { timeout: 35_000 }),
  logout: () => apiClient.post('/auth/logout').catch(() => { }),
  me: () => apiClient.get('/auth/me'),

  listStaff: (params?: Record<string, unknown>) =>
    apiClient.get('/staff', { params }),
  getStaff: (id: string) => apiClient.get(`/staff/${id}`),
  getStaffTimeline: (id: string) => apiClient.get(`/staff/${id}/timeline`),
  createStaff: (body: Record<string, unknown>) =>
    apiClient.post('/staff', body),
  updateStaff: (id: string, body: Record<string, unknown>) =>
    apiClient.put(`/staff/${id}`, body).then(res => res.data),
  listEmployees: (params?: Record<string, unknown>) =>
    apiClient.get('/employees', { params }).then((res) => res.data),
  getEmployee: (id: string) => apiClient.get(`/employees/${id}`).then((res) => res.data),
  createEmployee: (body: Record<string, unknown>) =>
    apiClient.post('/employees', body).then((res) => res.data),
  listCategories: () => apiClient.get('/categories').then((res) => res.data),
  getAttendanceStats: (params?: { date?: string; branchId?: string }) =>
    apiClient.get('/attendance/stats', { params }),
  markAttendance: (body: { employeeId: string; date: string; status: string }) =>
    apiClient.post(`/attendance/mark`, body).then((res) => res.data),
  previewEmployeePayroll: (employeeId: string, month: number, year: number) =>
    apiClient.get(`/attendance/${employeeId}/payroll-preview`, { params: { month, year } }).then((res) => res.data),
  generateEmployeePayroll: (employeeId: string, month: number, year: number) =>
    apiClient.post(`/attendance/${employeeId}/generate-payroll`, null, { params: { month, year } }).then((res) => res.data),
  getEmployeePayrolls: () =>
    apiClient.get(`/attendance/payrolls/all`).then((res) => res.data),
  uploadDocument: (employeeId: string, formData: FormData) =>
    apiClient.post(`/documents/${employeeId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getEmployeeDocuments: (employeeId: string) =>
    apiClient.get(`/documents/employee/${employeeId}`).then((res) => res.data),
  getHrNotifications: () => apiClient.get('/notifications/in-app'),
  markHrNotificationRead: (id: string) =>
    apiClient.patch(`/notifications/in-app/${id}/read`),
  checkRestricted: (aadhaar: string, phone: string) =>
    apiClient.post('/restricted-list/check', { aadhaar_number: aadhaar, phone }),

  getPlacements: (params?: Record<string, unknown>) =>
    apiClient.get('/placements', { params }),
  createPlacement: (body: Record<string, unknown>) =>
    apiClient.post('/placements', body),
  exitPlacement: (id: string, body: Record<string, unknown>) =>
    apiClient.post(`/placements/${id}/exit`, body),

  listAgreements: (params?: Record<string, unknown>) =>
    apiClient.get('/agreements', { params }),
  sendAgreementEsignOtp: (body: { staff_id: string; agreement_type: string; staff_name: string }) =>
    apiClient.post('/agreements/esign/send-otp', body),
  verifyAgreementOtp: (body: { staff_id: string; agreement_type: string; otp: string }) =>
    apiClient.post('/agreements/esign/verify-otp', body),
  signAgreement: (id: string, body?: { otp?: string }) =>
    apiClient.post(`/agreements/${id}/sign`, body ?? {}),
  generateAgreementPdf: (id: string) =>
    apiClient.post(`/agreements/${id}/generate-pdf`),
  assignScCareTypes: (staffId: string, careTypes: string[]) =>
    apiClient.post(`/series/sc/${staffId}/care-types`, { care_types: careTypes }),
  driverVerifyApis: (staffId: string, dlNumber: string) =>
    apiClient.post(`/series/dr/${staffId}/verify-apis`, { dl_number: dlNumber }),
  upgradeUcToSc: (staffId: string, notes?: string) =>
    apiClient.post(`/series/uc/${staffId}/upgrade-to-sc`, { notes }),
  getDashboardAdmin: () => apiClient.get('/dashboard/admin'),
  getDashboardBm: () => apiClient.get('/dashboard/bm'),
  getDashboardRm: () => apiClient.get('/dashboard/rm'),

  getRmDashboard: () => apiClient.get('/rm/dashboard'),
  getRmKanban: (params?: { search?: string; series?: string }) =>
    apiClient.get('/rm/kanban', { params }),
  advanceRmPipeline: (staffId, body) =>
    apiClient.post(`/rm/pipeline/${staffId}/advance`, body),
  getRmTrials: () => apiClient.get('/rm/trials'),
  getRmDeferred: () => apiClient.get('/rm/deferred'),
  resumeRmDeferred: (staffId, to_stage) =>
    apiClient.post(`/rm/deferred/${staffId}/resume`, { to_stage }),
  getRmTerminal: () => apiClient.get('/rm/terminal'),
  getRmIncidents: (status?: string) =>
    apiClient.get('/rm/incidents', { params: status ? { status } : {} }),
  createRmIncident: (body) => apiClient.post('/rm/incidents', body),
  getRmShifts: (status?: string) =>
    apiClient.get('/rm/shifts', { params: status ? { status } : {} }),
  reviewRmShift: (id, body) => apiClient.patch(`/rm/shifts/${id}/review`, body),
  getRmLocations: () => apiClient.get('/rm/locations'),
  getRmAttendance: (params) => apiClient.get('/rm/attendance', { params }),
  markRmAttendance: (body) => apiClient.put('/rm/attendance', body),
  previewRmAttendanceInvoice: (staffId, month, year) =>
    apiClient.get(`/rm/attendance/${staffId}/invoice-preview`, { params: { month, year } }),
  generateRmAttendanceInvoice: (staffId, month, year) =>
    apiClient.post(`/rm/attendance/${staffId}/generate-invoice`, null, { params: { month, year } }),
  getRmUpgrades: () => apiClient.get('/rm/upgrades'),
  rmIntake: (body) => apiClient.post('/rm/intake', body),

  forgotPassword: (phone) => apiClient.post('/auth/forgot-password', { phone }),
  verifyOtp: (phone, otp) => apiClient.post('/auth/verify-otp', { phone, otp }),
  resetPassword: (phone, otp, newPassword) =>
    apiClient.post('/auth/reset-password', { phone, otp, new_password: newPassword }),
  setup2fa: () => apiClient.post('/auth/2fa/setup'),
  confirm2fa: (code) => apiClient.post('/auth/2fa/confirm', { code }),
  logoutAllDevices: () => apiClient.post('/auth/logout-all'),

  getReportsConversion: () => apiClient.get('/reports/conversion'),
  getReportsRmProductivity: (rmId?: string) =>
    apiClient.get('/reports/rm-productivity', { params: rmId ? { rmId } : {} }),

  listInvoices: (params?: Record<string, unknown>) =>
    apiClient.get('/finance/invoices', { params }),

  calculatePayroll: (grossSalary: number, feePercent: number) =>
    apiClient.post('/payroll/calculate', {
      gross_salary: grossSalary,
      management_fee_percent: feePercent,
    }),
  queuePayrollBatch: (body: { month: number; year: number; series?: string }) =>
    apiClient.post('/payroll/queue-batch', body),
  triggerPayroll: (month: number, year: number) =>
    apiClient.post('/payroll/queue-batch', { month, year }),

  // ── Finance Role APIs ──────────────────────────────────────────────────────
  // Payroll
  getFinancePayroll: (params?: { month?: number; year?: number }) =>
    apiClient.get('/finance/payroll', { params }),
  lookupFinanceStaffByCode: (code: string) =>
    apiClient.get('/finance/payroll/lookup', { params: { code } }),
  previewFinanceAttendancePayroll: (code: string, month: number, year: number) =>
    apiClient.get('/finance/payroll/attendance-preview', { params: { code, month, year } }),
  generateFinanceAttendancePayroll: (code: string, month: number, year: number) =>
    apiClient.post('/finance/payroll/attendance-generate', { code, month, year }),
  downloadFinanceAttendancePreview: async (code: string, month: number, year: number): Promise<Blob> => {
    const token = tokenStore.getAccess();
    const res = await axios.get(`${BASE_URL}/finance/payroll/attendance-preview/download`, {
      params: { code, month, year },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      responseType: 'blob',
    });
    return res.data as Blob;
  },
  previewFinancePayroll: (placementId: string, month: number, year: number) =>
    apiClient.post('/finance/payroll/preview', { placement_id: placementId, month, year }),
  confirmPayrollBatch: (month: number, year: number) =>
    apiClient.post('/finance/payroll/confirm-batch', { month, year }),
  disbursePayroll: (payrollId: string) =>
    apiClient.post(`/finance/payroll/${payrollId}/disburse`),

  // Invoices
  getFinanceInvoices: (params?: { status?: string; page?: number }) =>
    apiClient.get('/finance/invoices', { params }),
  getFinanceInvoice: (id: string) =>
    apiClient.get(`/finance/invoices/${id}`),
  downloadFinanceInvoice: async (id: string): Promise<Blob> => {
    const token = tokenStore.getAccess();
    const res = await axios.get(`${BASE_URL}/finance/invoices/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      responseType: 'blob',
    });
    return res.data as Blob;
  },
  getFinanceInvoiceSummary: () =>
    apiClient.get('/finance/invoices/summary'),
  approveFinanceInvoice: (id: string) =>
    apiClient.post(`/finance/invoices/${id}/approve`),
  sendFinanceInvoice: (id: string) =>
    apiClient.post(`/finance/invoices/${id}/send`),

  // Settlements
  getFinanceSettlements: (status?: string) =>
    apiClient.get('/finance/settlements', { params: status ? { status } : {} }),
  getFinanceSettlementStats: () =>
    apiClient.get('/finance/settlements/stats'),
  markSettled: (invoiceId: string, paymentRef: string) =>
    apiClient.post(`/finance/settlements/${invoiceId}/mark-settled`, { payment_ref: paymentRef }),
  issueCreditNote: (invoiceId: string, reason: string) =>
    apiClient.post(`/finance/settlements/${invoiceId}/credit-note`, { reason }),

  // ESIC / PF
  getEsicChallan: (month: number, year: number) =>
    apiClient.get('/finance/esic/challan', { params: { month, year } }),
  getPfEcr: (month: number, year: number) =>
    apiClient.get('/finance/esic/pf-ecr', { params: { month, year } }),
  getEsicPfExportUrl: (type: 'ESIC' | 'PF', month: number, year: number): string =>
    `${BASE_URL}/finance/esic/export?type=${type}&month=${month}&year=${year}`,
  exportEsicPf: async (type: 'ESIC' | 'PF', month: number, year: number): Promise<Blob> => {
    const token = tokenStore.getAccess();
    const res = await axios.get(`${BASE_URL}/finance/esic/export`, {
      params: { type, month, year },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      responseType: 'blob',
    });
    return res.data as Blob;
  },

  // Deposits
  getFinanceDeposits: (status?: string) =>
    apiClient.get('/finance/deposits', { params: status ? { status } : {} }),
  getFinanceDepositStats: () =>
    apiClient.get('/finance/deposits/stats'),
  recordDepositEvent: (staffId: string, event: string, notes?: string, scenarioCode?: string) =>
    apiClient.post(`/finance/deposits/${staffId}/event`, { event, notes, scenario_code: scenarioCode }),

  // Analytics
  getFinanceDashboard: () =>
    apiClient.get('/finance/analytics'),
  getFinanceRevenue: () =>
    apiClient.get('/finance/analytics/revenue'),
  getFinanceGst: () =>
    apiClient.get('/finance/analytics/gst'),
  getFinanceEsicPfOutflow: () =>
    apiClient.get('/finance/analytics/esic-pf'),
  getFinanceBranchPnl: () =>
    apiClient.get('/finance/analytics/branch-pnl'),
  getFinanceInvoiceAging: () =>
    apiClient.get('/finance/analytics/invoice-aging'),
  // ───────────────────────────────────────────────────────────────────────────

  listUsers: (params?: Record<string, unknown>) => apiClient.get('/admin/users', { params }),
  createUser: (body: Record<string, unknown>) => apiClient.post('/admin/users/create', body),
  getAuditLogs: (params?: { limit?: number }) =>
    apiClient.get('/audit/logs', { params }),
  getAlarms: (params?: { severity?: string; category?: string; status?: string }) =>
    apiClient.get('/alarms', { params }),
  health: () => apiClient.get('/health'),

  // Monitoring
  getCronJobs: () => apiClient.get('/monitoring/cron-jobs'),
  getActivityLog: () => apiClient.get('/monitoring/activity-log'),
  getSystemHealth: () => apiClient.get('/monitoring/system-health'),
  triggerCronJob: (jobKey: string) => apiClient.post(`/monitoring/cron-jobs/${jobKey}/trigger`),

  // Training
  getTrainingBatches: () => apiClient.get('/training/batches'),
  getTrainingStats: () => apiClient.get('/training/stats'),
  createTrainingBatch: (body: Record<string, unknown>) => apiClient.post('/training/batches', body),
  enrollInBatch: (batchId: string, staffId: string) => apiClient.post(`/training/batches/${batchId}/enroll`, { staff_id: staffId }),
  markBatchAttendance: (batchId: string, body: { staff_id: string; day_number: number; attended: boolean }) =>
    apiClient.patch(`/training/batches/${batchId}/attendance`, body),
  updateBatchStatus: (batchId: string, status: string) => apiClient.patch(`/training/batches/${batchId}/status`, { status }),

  // Trainer Role Module
  getTrainerDashboard: () => apiClient.get('/trainer/dashboard'),
  getTrainerBatches: () => apiClient.get('/trainer/batches'),
  reviewTrainerVideoCert: (id: string, body: { status: 'APPROVED' | 'REJECTED'; notes?: string }) =>
    apiClient.put(`/trainer/video-certifications/${id}/review`, body),
  updateTrainerAssessment: (traineeId: string, body: Record<string, unknown>) => apiClient.put(`/trainer/assessment/${traineeId}`, body),

  // Assessor Role Module
  getAssessorDashboard: () => apiClient.get('/assessors/dashboard'),
  getAssessorAssessments: () => apiClient.get('/assessors/assessments'),
  getAssessorSchedules: () => apiClient.get('/assessors/schedules'),
  getAssessorReports: () => apiClient.get('/assessors/reports'),
  createAssessment: (body: Record<string, unknown>) => apiClient.post('/assessments/create', body),
  submitDriverAssessment: (body: { id: string; score: number; result: string; remarks: string; assessor_id?: string }) =>
    apiClient.post('/assessments/submit', body),
  submitScAssessment: (body: { id: string; score: number; result: string; remarks: string; scenario_code: string; assessor_id?: string }) =>
    apiClient.post('/assessments/submit', body),

  // Admin Role Module
  getAdminUsers: () => apiClient.get('/admin/users'),
  createAdminUser: (body: Record<string, unknown>) => apiClient.post('/admin/users/create', body),
  updateAdminUser: (id: string, body: Record<string, unknown>) => apiClient.put(`/admin/users/update/${id}`, body),
  deactivateAdminUser: (id: string) => apiClient.delete(`/admin/users/deactivate/${id}`),

  getAdminBranches: () => apiClient.get('/admin/branches'),
  createAdminBranch: (body: Record<string, unknown>) => apiClient.post('/admin/branches/create', body),
  updateAdminBranch: (id: string, body: Record<string, unknown>) => apiClient.put(`/admin/branches/update/${id}`, body),

  getAdminAuditLogs: () => apiClient.get('/admin/audit-logs'),
  getAdminAuditLogDetails: (id: string) => apiClient.get(`/admin/audit-logs/${id}`),

  getAdminSystemHealth: () => apiClient.get('/admin/system-health'),
  getAdminQueueStatus: () => apiClient.get('/admin/queues'),
  getAdminFailedQueueJobs: (limit = 20) => apiClient.get('/admin/queues/failed', { params: { limit } }),
  retryAdminFailedQueueJobs: () => apiClient.post('/admin/queues/retry-failed'),
  getAdminCronStatus: () => apiClient.get('/admin/cron-status'),

  getAdminRevenueAnalytics: () => apiClient.get('/admin/analytics/revenue'),
  getAdminPipelineAnalytics: () => apiClient.get('/admin/analytics/pipeline'),
  getAdminPipelineOverview: () => apiClient.get('/admin/pipeline/overview'),
  getAdminPlacementAnalytics: () => apiClient.get('/admin/analytics/placements'),

  getAdminVideoCertifications: (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/video-certifications', { params }),
  reviewAdminVideoCertification: (id: string, body: { status: 'APPROVED' | 'REJECTED'; notes?: string }) =>
    apiClient.put(`/admin/video-certifications/${id}/review`, body),
  getVideoCertViewUrl: (key: string) => apiClient.post('/video-cert/view-url', { key }),

  submitAdminDeleteRequest: (body: Record<string, unknown>) => apiClient.post('/admin/privacy/delete-request', body),
  getAdminPrivacyRequests: () => apiClient.get('/admin/privacy/requests'),

  // Admin Dual-Approval endpoints
  getAdminApprovals: () => apiClient.get('/admin/approvals'),
  approveAdminAction: (id: string) => apiClient.post(`/admin/approvals/${id}/approve`),
  rejectAdminAction: (id: string) => apiClient.post(`/admin/approvals/${id}/reject`),
};
