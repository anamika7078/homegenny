import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { StaffAttendanceStatus } from '@/lib/types';

// NEXT_PUBLIC_API_URL is baked at Docker build time via --build-arg
// For local dev:   NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
// For production:  NEXT_PUBLIC_API_URL=https://api.homegenny.com/api/v1
export const BASE_URL =
  process.env['NEXT_PUBLIC_API_URL'] ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://homegennyserver-po5u.onrender.com/api/v1'
    : 'http://localhost:3001/api/v1');

// Local video storage mode (VIDEO_STORAGE_MODE=local on the server) returns
// a relative path like "/api/v1/video-cert/local-file?key=..." instead of an
// absolute GCS signed URL. Used directly as a <video src>, that path resolves
// against the frontend's own origin (which serves no such route) instead of
// the API origin, so the video silently fails to load. Prefix it here.
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

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

// The local-file route above is behind JwtAuthGuard, which only reads the
// Authorization header — a plain <video src> request can't attach that
// header, so the request 401s even once the URL itself is correct. GCS
// signed URLs (the real, non-local storage mode) don't have this problem —
// the signature IS the auth, no header needed. So: only for our own
// same-origin local-file route, fetch the bytes through apiClient (which
// does attach the bearer token) and hand back a blob: URL the <video> tag
// can play directly. Caller is responsible for URL.revokeObjectURL later.
export async function resolvePlayableVideoUrl(url: string | null | undefined): Promise<string | null> {
  const resolved = resolveMediaUrl(url);
  if (!resolved) return null;
  const base = BASE_URL.replace(/\/$/, ''); // e.g. http://localhost:3001/api/v1
  if (!resolved.startsWith(base) || !resolved.includes('/local-file')) return resolved;
  const path = resolved.slice(base.length); // "/video-cert/local-file?key=..." — relative to apiClient's baseURL
  const blob = await apiClient.get(path, { responseType: 'blob' });
  return URL.createObjectURL(blob as unknown as Blob);
}

// ── Request interceptor: attach JWT ──────────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess();
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: unwrap + auto-refresh + readable errors ─────────
let isRefreshing = false;
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      return body.data;
    }
    return body;
  },
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
  listEmployeesForDropdown(branchId?: string): Promise<any[]>;
  listBranches(): Promise<any[]>;
  getEmployee(id: string): Promise<any>;
  createEmployee(body: Record<string, unknown>): Promise<any>;
  listPendingOnboarding(params?: {
    branchId?: string;
    search?: string;
    limit?: number;
  }): Promise<any>;
  onboardFromPipeline(body: {
    staffApplicantId: string;
    department: string;
    designation: string;
    categoryId: string;
    employmentType: string;
    salary: number;
    joiningDate: string;
    gender: string;
    city?: string;
    state?: string;
    pincode?: string;
    reportingManager?: string;
  }): Promise<any>;
  updateEmployeeStatus(id: string, status: string): Promise<any>;
  exitEmployee(
    id: string,
    body: { channel: 'ONLINE' | 'OFFLINE'; reason: string; exitDate: string; notes?: string },
  ): Promise<any>;
  listCategories(): Promise<any>;
  listAttendance(params?: {
    date?: string;
    employeeId?: string;
    branchId?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
  }): Promise<any>;
  getAttendanceStats(params?: { date?: string; branchId?: string }): Promise<any>;
  markAttendance(body: {
    employeeId: string;
    date: string;
    status: string;
    notes?: string;
    overtimeHours?: number;
    /**
     * Records HR's version over the staff member's own GPS check-in for that
     * day. Without it the API refuses the write while a live self-check-in
     * stands, rather than silently replacing it.
     */
    overrideSelfCheckIn?: boolean;
  }): Promise<any>;
  updateAttendance(
    id: string,
    body: { status?: string; notes?: string; checkIn?: string; checkOut?: string; overrideSelfCheckIn?: boolean },
  ): Promise<any>;
  /**
   * Pulls field check-ins (mobile app / RM) into the HR attendance ledger,
   * which is the only table employee payroll counts. Runs nightly on the
   * server too; this is the on-demand version. Days an HR user marked by hand
   * are never overwritten — they come back as `skippedManual`.
   */
  syncAttendanceFromPipeline(body?: {
    month?: number;
    year?: number;
    employeeId?: string;
  }): Promise<any>;
  getEmployeePipelineHistory(employeeId: string): Promise<any>;
  getEmployeeIncidents(employeeId: string): Promise<any>;
  getEmployeeAttendanceMonth(
    employeeId: string,
    params: { month: number; year: number },
  ): Promise<any>;
  listEmployeePayslips(employeeId: string): Promise<any>;
  /** Every salary slip for a period, across everyone — HR's month-end view. */
  listPayslipsForPeriod(month: number, year: number): Promise<any>;
  /** Fetches the rendered payslip as a Blob so the caller can save it. */
  downloadEmployeePayslip(employeeId: string, ref: string): Promise<Blob>;
  previewEmployeePayroll(employeeId: string, month: number, year: number): Promise<any>;
  generateEmployeePayroll(employeeId: string, month: number, year: number): Promise<any>;
  getEmployeePayrolls(): Promise<any>;
  uploadDocument(employeeId: string, formData: FormData): Promise<any>;
  getEmployeeDocuments(employeeId: string): Promise<any>;
  markDocumentUnavailable(employeeId: string, body: { type: string; remark: string }): Promise<any>;
  completeEmployeeOnboarding(employeeId: string, body?: { remark?: string }): Promise<any>;
  getHrNotifications(): Promise<any>;
  markHrNotificationRead(id: string): Promise<any>;
  checkRestricted(aadhaar: string, phone: string): Promise<any>;

  getPlacements(params?: Record<string, unknown>): Promise<any>;
  createPlacement(body: Record<string, unknown>): Promise<any>;
  confirmPlacement(id: string): Promise<any>;
  exitPlacement(id: string, body: Record<string, unknown>): Promise<any>;
  calculateWage(body: Record<string, unknown>): Promise<any>;

  getStaffTimeline(id: string): Promise<any>;
  listAgreements(params?: Record<string, unknown>): Promise<any>;
  createAgreement(body: { staff_id?: string; client_id?: string; type: string; placement_id?: string }): Promise<any>;
  sendAgreementEsignOtp(body: { staff_id: string; agreement_type: string; staff_name: string }): Promise<any>;
  verifyAgreementOtp(body: { staff_id: string; agreement_type: string; otp: string }): Promise<any>;
  signAgreement(id: string, body?: { otp?: string }): Promise<any>;
  generateAgreementPdf(id: string): Promise<any>;

  // Scope of Work (A2)
  listSow(placementId: string): Promise<any>;
  getSow(id: string): Promise<any>;
  createSow(body: { placement_id: string; content: string; is_non_standard?: boolean }): Promise<any>;
  updateSow(id: string, content: string): Promise<any>;
  sendSow(id: string): Promise<any>;
  amendSow(id: string, content: string): Promise<any>;

  // Client Indemnity (A3)
  listIndemnity(placementId: string): Promise<any>;
  getIndemnity(id: string): Promise<any>;
  createIndemnity(body: { placement_id: string; clause_version: string; clause_text: string }): Promise<any>;
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
  listRmUsers(): Promise<any>;

  // Verification (S2)
  getVerificationStatus(staffId: string): Promise<any>;
  generateAadhaarOtp(body: { aadhaar_number: string }): Promise<any>;
  verifyAadhaarOtp(body: { reference_id: string; otp: string; aadhaar_number: string; staff_id: string }): Promise<any>;
  verifyDL(body: { dl_number: string; dob: string; staff_id: string }): Promise<any>;
  checkEchallan(dlNumber: string, staffId: string): Promise<any>;
  submitPoliceVerification(staffId: string, body?: { notes?: string }): Promise<any>;
  closePoliceVerification(staffId: string, body: { result: 'CLEAR' | 'ADVERSE'; notes?: string }): Promise<any>;
  submitMedicalVerification(staffId: string, body: { passed: boolean; notes?: string }): Promise<any>;

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

  getAuditLogs(params?: { limit?: number; page?: number; action?: string; actorId?: string }): Promise<any>;
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
  approvePayrollRecord(payrollId: string): Promise<any>;
  getPayoutReadiness(): Promise<any>;
  getStaffBankAccount(staffId: string): Promise<any>;
  getConsolidatedPending(month: number, year: number): Promise<any>;
  getProfessionalTaxRules(): Promise<any>;
  getPfBaseImpact(): Promise<any>;
  listCreditNotes(clientId?: string): Promise<any>;
  getCreditNotesForInvoice(invoiceId: string): Promise<any>;
  getIncomeTaxSlabs(financialYear?: string): Promise<any>;
  getTaxStatus(): Promise<any>;
  confirmTaxRates(): Promise<any>;
  previewTax(body: { state?: string; monthly_gross: number; month: number; year: number; gender?: string }): Promise<any>;
  listExitSettlements(status?: string): Promise<any>;
  getPendingExits(): Promise<any>;
  previewExitSettlement(body: { placement_id: string; exit_date: string; reason: string; trial_extended?: boolean }): Promise<any>;
  createExitSettlement(body: { placement_id: string; exit_date: string; reason: string; trial_extended?: boolean; scenario_code?: string }): Promise<any>;
  approveExitSettlement(id: string): Promise<any>;
  settleExitSettlement(id: string): Promise<any>;
  getConsolidatedPreview(customerId: string, month: number, year: number): Promise<any>;
  generateConsolidatedInvoice(customerId: string, month: number, year: number): Promise<any>;
  saveStaffBankAccount(staffId: string, body: {
    account_holder_name: string; account_number: string; ifsc: string; bank_name?: string;
  }): Promise<any>;

  // Invoices
  getFinanceInvoices(params?: { status?: string; page?: number }): Promise<any>;
  getFinanceInvoice(id: string): Promise<any>;
  downloadFinanceInvoice(id: string): Promise<Blob>;
  getFinanceInvoiceSummary(): Promise<any>;
  approveFinanceInvoice(id: string): Promise<any>;
  sendFinanceInvoice(id: string): Promise<any>;
  createInvoicePaymentOrder(invoiceId: string, amount: number): Promise<any>;

  // Settlements
  getFinanceSettlements(status?: string): Promise<any>;
  getFinanceSettlementStats(): Promise<any>;
  markSettled(invoiceId: string, paymentRef: string): Promise<any>;
  issueCreditNote(invoiceId: string, reason: string, amount?: number): Promise<any>;

  // ESIC / PF
  getEsicChallan(month: number, year: number): Promise<any>;
  getPfEcr(month: number, year: number): Promise<any>;
  exportEsicPf(type: 'ESIC' | 'PF', month: number, year: number): Promise<Blob>;
  /** @deprecated Use exportEsicPf — raw URL downloads bypass Bearer auth */
  getEsicPfExportUrl(type: 'ESIC' | 'PF', month: number, year: number): string;

  // Deposits
  getFinanceDeposits(status?: string): Promise<any>;
  getFinanceDepositStats(): Promise<any>;
  recordDepositEvent(staffId: string, event: string, notes?: string, scenarioCode?: string, refundAmount?: number): Promise<any>;

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
  deleteTrainingBatch(batchId: string): Promise<any>;
  enrollInBatch(batchId: string, staffId: string): Promise<any>;
  markBatchAttendance(batchId: string, body: { staff_id: string; day_number: number; attended: boolean }): Promise<any>;
  updateBatchStatus(batchId: string, status: string): Promise<any>;

  // Trainer Role Module
  getTrainerDashboard(): Promise<any>;
  getTrainerBatches(): Promise<any>;
  getTrainerVideoCertifications(): Promise<any>;
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
  getAdminPipelineAuditEvents(params?: Record<string, unknown>): Promise<any>;

  getAdminSystemHealth(): Promise<any>;
  getAdminQueueStatus(): Promise<any>;
  getAdminFailedQueueJobs(limit?: number): Promise<any>;
  retryAdminFailedQueueJobs(): Promise<any>;
  getAdminCronStatus(): Promise<any>;
  triggerAdminManualCronRun(jobId: string): Promise<any>;
  getAdminApiTelemetry(): Promise<any>;

  getAdminRevenueAnalytics(): Promise<any>;
  getAdminPipelineAnalytics(): Promise<any>;
  getAdminPipelineOverview(): Promise<any>;
  getAdminPlacementAnalytics(): Promise<any>;

  getAdminVideoCertifications(params?: { status?: string; search?: string; page?: number; limit?: number }): Promise<any>;
  reviewAdminVideoCertification(id: string, body: { status: 'APPROVED' | 'REJECTED'; notes?: string }): Promise<any>;
  overrideAdminVideoCertification(id: string, body: { neverDelete?: boolean; reviewNotes?: string; fraudFlag?: boolean; legalHold?: boolean; legalReason?: string }): Promise<any>;
  getVideoCertViewUrl(key: string): Promise<any>;
  getVideoCertPrompts(series: string): Promise<any>;
  listVideoCertsForStaff(staffId: string): Promise<any>;

  submitAdminDeleteRequest(body: Record<string, unknown>): Promise<any>;
  getAdminPrivacyRequests(): Promise<any>;

  // Admin Dual-Approval endpoints
  getAdminApprovals(): Promise<any>;
  approveAdminAction(id: string): Promise<any>;
  rejectAdminAction(id: string): Promise<any>;

  // Finance Customers
  listFinanceCustomers(search?: string): Promise<any>;
  createFinanceCustomer(body: {
    customer_name: string;
    address: string;
    pan_card: string;
    gstn?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
    email?: string;
    branches?: Array<{
      unit_code: string;
      unit_name: string;
      address?: string;
      state?: string;
      city?: string;
      pincode?: string;
      gstn?: string;
    }>;
  }): Promise<any>;
  getFinanceCustomer(id: string): Promise<any>;
  getCustomerBranches(id: string): Promise<any>;
  addCustomerBranch(id: string, body: {
    unit_code: string;
    unit_name: string;
    address?: string;
    state?: string;
    city?: string;
    pincode?: string;
    gstn?: string;
  }): Promise<any>;
  listAllCustomerBranches(): Promise<any>;
  updateFinanceCustomer(id: string, body: Record<string, unknown>): Promise<any>;
  generateFinanceCustomerBillNumber(id: string): Promise<any>;
  verifyFinanceCustomerPan(id: string): Promise<any>;

  // Finance Commercial
  listWageConfigs(search?: string): Promise<any>;
  createWageConfig(body: Record<string, unknown>): Promise<any>;
  getWageCategories(): Promise<any>;
  getActiveWageConfig(state: string, zone: string, category: string): Promise<any>;
  getWageRevisionComparison(state: string, zone: string, category: string): Promise<any>;
  listCalculations(search?: string): Promise<any>;
  runCalculationOnTheFly(body: Record<string, unknown>): Promise<any>;
  createCalculation(body: Record<string, unknown>): Promise<any>;
  getCalculation(id: string): Promise<any>;
  submitForApproval(id: string): Promise<any>;
  approveCalculation(id: string, comments: string): Promise<any>;
  rejectCalculation(id: string, comments: string): Promise<any>;
  listQuotations(): Promise<any>;
  createQuotation(body: Record<string, unknown>): Promise<any>;
  getQuotation(id: string): Promise<any>;
  listRateCards(search?: string): Promise<any>;
  getCommercialReports(): Promise<any>;

  // ── Enterprise Payroll & Salary Structures ─────────────────────────────────
  listSalaryStructures(params?: any): Promise<any>;
  getSalaryStructure(id: string): Promise<any>;
  createSalaryStructure(body: any): Promise<any>;
  updateSalaryStructure(id: string, body: any): Promise<any>;
  deleteSalaryStructure(id: string): Promise<any>;

  listEmployeeSalaries(params?: any): Promise<any>;
  getEmployeeSalaryProfile(employeeId: string): Promise<any>;
  assignEmployeeSalaryProfile(body: any): Promise<any>;
  reviseEmployeeSalary(employeeId: string, body: any): Promise<any>;

  listOvertimeRules(): Promise<any>;
  createOvertimeRule(body: any): Promise<any>;
  listOvertimeRecords(params?: any): Promise<any>;
  createOvertimeRecord(body: any): Promise<any>;
  approveOvertimeRecord(id: string, role?: string): Promise<any>;
  rejectOvertimeRecord(id: string): Promise<any>;

  listBonusRecords(params?: any): Promise<any>;
  createBonusRecord(body: any): Promise<any>;
  deleteBonusRecord(id: string): Promise<any>;

  listReimbursements(params?: any): Promise<any>;
  createReimbursement(body: any): Promise<any>;
  updateReimbursementStatus(id: string, body: any): Promise<any>;

  listLoans(params?: any): Promise<any>;
  createLoan(body: any): Promise<any>;
  updateLoanStatus(id: string, status: string): Promise<any>;
  listSalaryAdvances(params?: any): Promise<any>;
  createSalaryAdvance(body: any): Promise<any>;

  processEnterpriseBatch(body: any): Promise<any>;
  listEnterpriseBatches(params?: any): Promise<any>;
  getEnterpriseBatch(id: string): Promise<any>;
  approveEnterpriseBatchTier(id: string, body: any): Promise<any>;
  rejectEnterpriseBatchTier(id: string, body: any): Promise<any>;
  lockEnterpriseBatch(id: string): Promise<any>;
  generateBankTransferBatch(id: string, format: string): Promise<any>;
  getEnterprisePayrollSummary(params?: any): Promise<any>;
  getDepartmentPayrollBreakdown(params?: any): Promise<any>;
  getStatutoryComplianceReport(params?: any): Promise<any>;
  listPayrollSettings(): Promise<any>;
  updatePayrollSetting(body: any): Promise<any>;
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
    apiClient.put(`/staff/${id}`, body),
  listEmployees: (params?: Record<string, unknown>) =>
    apiClient.get('/employees', { params }),
  listEmployeesForDropdown: (branchId?: string) =>
    apiClient.get('/employees/list', { params: branchId ? { branchId } : {} }),
  listBranches: () =>
    apiClient.get('/employees/branches'),
  getEmployee: (id: string) => apiClient.get(`/employees/${id}`),
  createEmployee: (body: Record<string, unknown>) =>
    apiClient.post('/employees', body),
  listPendingOnboarding: (params?: { branchId?: string; search?: string; limit?: number }) =>
    apiClient.get('/employees/pending-onboarding', { params }),
  onboardFromPipeline: (body: Record<string, unknown>) =>
    apiClient.post('/employees/onboard-from-pipeline', body),
  updateEmployeeStatus: (id: string, status: string) =>
    apiClient.patch(`/employees/${id}/status`, { status }),
  exitEmployee: (
    id: string,
    body: { channel: 'ONLINE' | 'OFFLINE'; reason: string; exitDate: string; notes?: string },
  ) => apiClient.post(`/employees/${id}/exit`, body),
  listCategories: () => apiClient.get('/categories'),
  listAttendance: (params?: {
    date?: string;
    employeeId?: string;
    branchId?: string;
    categoryId?: string;
    page?: number;
    limit?: number;
  }) => apiClient.get('/attendance', { params }),
  getAttendanceStats: (params?: { date?: string; branchId?: string }) =>
    apiClient.get('/attendance/stats', { params }),
  markAttendance: (body: {
    employeeId: string;
    date: string;
    status: string;
    notes?: string;
    overtimeHours?: number;
    overrideSelfCheckIn?: boolean;
  }) => apiClient.post(`/attendance/mark`, body),
  updateAttendance: (
    id: string,
    body: { status?: string; notes?: string; checkIn?: string; checkOut?: string; overrideSelfCheckIn?: boolean },
  ) => apiClient.put(`/attendance/${id}`, body),
  syncAttendanceFromPipeline: (body?: { month?: number; year?: number; employeeId?: string }) =>
    apiClient.post('/attendance/sync-from-pipeline', body ?? {}),
  getEmployeePipelineHistory: (employeeId: string) =>
    apiClient.get(`/employees/${employeeId}/pipeline-history`),
  getEmployeeIncidents: (employeeId: string) =>
    apiClient.get(`/employees/${employeeId}/incidents`),
  getEmployeeAttendanceMonth: (employeeId: string, params: { month: number; year: number }) =>
    apiClient.get(`/employees/${employeeId}/attendance-month`, { params }),
  listEmployeePayslips: (employeeId: string) =>
    apiClient.get(`/employees/${employeeId}/payslips`),
  listPayslipsForPeriod: (month: number, year: number) =>
    apiClient.get('/employees/payslips', { params: { month, year } }),
  // The shared response interceptor already returns the body rather than the
  // axios response, and a Blob has no `success`/`data` keys, so it comes back
  // untouched — this awaits the Blob itself, not `res.data`.
  downloadEmployeePayslip: async (employeeId: string, ref: string) => {
    const blob = await apiClient.get(`/employees/${employeeId}/payslips/pdf`, {
      params: { ref },
      responseType: 'blob',
    });
    return blob as unknown as Blob;
  },
  previewEmployeePayroll: (employeeId: string, month: number, year: number) =>
    apiClient.get(`/attendance/${employeeId}/payroll-preview`, { params: { month, year } }),
  generateEmployeePayroll: (employeeId: string, month: number, year: number) =>
    apiClient.post(`/attendance/${employeeId}/generate-payroll`, { month, year }),
  getEmployeePayrolls: () => apiClient.get(`/attendance/payrolls/all`),
  uploadDocument: (employeeId: string, formData: FormData) =>
    apiClient.post(`/documents/${employeeId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getEmployeeDocuments: (employeeId: string) =>
    apiClient.get(`/documents/employee/${employeeId}`),
  markDocumentUnavailable: (employeeId: string, body: { type: string; remark: string }) =>
    apiClient.post(`/documents/${employeeId}/unavailable`, body),
  completeEmployeeOnboarding: (employeeId: string, body?: { remark?: string }) =>
    apiClient.post(`/documents/${employeeId}/complete-onboarding`, body ?? {}),
  getHrNotifications: () => apiClient.get('/notifications/in-app'),
  markHrNotificationRead: (id: string) =>
    apiClient.patch(`/notifications/in-app/${id}/read`),
  checkRestricted: (aadhaar: string, phone: string) =>
    apiClient.post('/restricted-list/check', { aadhaar_number: aadhaar, phone }),

  getPlacements: (params?: Record<string, unknown>) =>
    apiClient.get('/placements', { params }),
  createPlacement: (body: Record<string, unknown>) =>
    apiClient.post('/placements', body),
  confirmPlacement: (id: string) =>
    apiClient.post(`/placements/${id}/confirm`),
  exitPlacement: (id: string, body: Record<string, unknown>) =>
    apiClient.post(`/placements/${id}/exit`, body),
  calculateWage: (body: Record<string, unknown>) =>
    apiClient.post('/placements/calculate-wage', body),

  listAgreements: (params?: Record<string, unknown>) =>
    apiClient.get('/agreements', { params }),
  createAgreement: (body) => apiClient.post('/agreements', body),
  sendAgreementEsignOtp: (body: { staff_id: string; agreement_type: string; staff_name: string }) =>
    apiClient.post('/agreements/esign/send-otp', body),
  verifyAgreementOtp: (body: { staff_id: string; agreement_type: string; otp: string }) =>
    apiClient.post('/agreements/esign/verify-otp', body),
  signAgreement: (id: string, body?: { otp?: string }) =>
    apiClient.post(`/agreements/${id}/sign`, body ?? {}),
  generateAgreementPdf: (id: string) =>
    apiClient.post(`/agreements/${id}/generate-pdf`),

  // Scope of Work (A2)
  listSow: (placementId) => apiClient.get('/sow', { params: { placement_id: placementId } }),
  getSow: (id) => apiClient.get(`/sow/${id}`),
  createSow: (body) => apiClient.post('/sow', body),
  updateSow: (id, content) => apiClient.patch(`/sow/${id}`, { content }),
  sendSow: (id) => apiClient.post(`/sow/${id}/send`),
  amendSow: (id, content) => apiClient.post(`/sow/${id}/amend`, { content }),

  // Client Indemnity (A3)
  listIndemnity: (placementId) => apiClient.get('/indemnity', { params: { placement_id: placementId } }),
  getIndemnity: (id) => apiClient.get(`/indemnity/${id}`),
  createIndemnity: (body) => apiClient.post('/indemnity', body),
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
  listRmUsers: () => apiClient.get('/rm/users'),

  // Verification (S2)
  getVerificationStatus: (staffId) => apiClient.get(`/verification/${staffId}`),
  generateAadhaarOtp: (body) => apiClient.post('/verification/aadhaar/generate-otp', body),
  verifyAadhaarOtp: (body) => apiClient.post('/verification/aadhaar/verify-otp', body),
  verifyDL: (body) => apiClient.post('/verification/dl', body),
  checkEchallan: (dlNumber, staffId) =>
    apiClient.post(`/verification/echallan/${dlNumber}`, null, { params: { staff_id: staffId } }),
  submitPoliceVerification: (staffId, body) => apiClient.post(`/verification/pv/submit/${staffId}`, body ?? {}),
  closePoliceVerification: (staffId, body) => apiClient.post(`/verification/pv/${staffId}/close`, body),
  submitMedicalVerification: (staffId, body) => apiClient.post(`/verification/medical/submit/${staffId}`, body),

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
  // Only an APPROVED payroll record can be disbursed (F-12).
  approvePayrollRecord: (payrollId: string) =>
    apiClient.post(`/finance/payroll/${payrollId}/approve`),
  // Whether RazorpayX is configured — false means disbursement only simulates.
  getPayoutReadiness: () =>
    apiClient.get('/finance/payroll/payout-readiness'),
  getStaffBankAccount: (staffId: string) =>
    apiClient.get(`/finance/payroll/staff/${staffId}/bank-account`),
  // One invoice per customer per month, instead of one per placement (F-15).
  getConsolidatedPending: (month: number, year: number) =>
    apiClient.get('/finance/invoices/consolidated/pending', { params: { month, year } }),

  // Tax rules (F-16) — PT is a state levy, TDS an annual projection.
  getProfessionalTaxRules: () => apiClient.get('/finance/tax/professional-tax'),
  // How the PF base is derived, and what changing the rule would cost (F-20).
  getPfBaseImpact: () => apiClient.get('/finance/tax/pf-base'),

  // Credit notes are real documents with their own series (F-18).
  listCreditNotes: (clientId?: string) =>
    apiClient.get('/finance/settlements/credit-notes', { params: clientId ? { clientId } : {} }),
  getCreditNotesForInvoice: (invoiceId: string) =>
    apiClient.get(`/finance/settlements/${invoiceId}/credit-notes`),
  getIncomeTaxSlabs: (financialYear?: string) =>
    apiClient.get('/finance/tax/income-tax', { params: financialYear ? { financialYear } : {} }),
  getTaxStatus: () => apiClient.get('/finance/tax/status'),
  confirmTaxRates: () => apiClient.post('/finance/tax/confirm'),
  previewTax: (body: { state?: string; monthly_gross: number; month: number; year: number; gender?: string }) =>
    apiClient.post('/finance/tax/preview', body),

  // Exit settlements (F-17) — the spec's late-exit fee matrix.
  listExitSettlements: (status?: string) =>
    apiClient.get('/finance/exit-settlements', { params: status ? { status } : {} }),
  getPendingExits: () => apiClient.get('/finance/exit-settlements/pending'),
  previewExitSettlement: (body: { placement_id: string; exit_date: string; reason: string; trial_extended?: boolean }) =>
    apiClient.post('/finance/exit-settlements/preview', body),
  createExitSettlement: (body: { placement_id: string; exit_date: string; reason: string; trial_extended?: boolean; scenario_code?: string }) =>
    apiClient.post('/finance/exit-settlements', body),
  approveExitSettlement: (id: string) => apiClient.post(`/finance/exit-settlements/${id}/approve`),
  settleExitSettlement: (id: string) => apiClient.post(`/finance/exit-settlements/${id}/settle`),
  getConsolidatedPreview: (customerId: string, month: number, year: number) =>
    apiClient.get('/finance/invoices/consolidated/preview', { params: { customerId, month, year } }),
  generateConsolidatedInvoice: (customerId: string, month: number, year: number) =>
    apiClient.post('/finance/invoices/consolidated/generate', { customer_id: customerId, month, year }),
  saveStaffBankAccount: (staffId: string, body: {
    account_holder_name: string; account_number: string; ifsc: string; bank_name?: string;
  }) => apiClient.post(`/finance/payroll/staff/${staffId}/bank-account`, body),

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
  createInvoicePaymentOrder: (invoiceId: string, amount: number) =>
    apiClient.post(`/payroll/invoice/${invoiceId}/payment-order`, { amount }),

  // Settlements
  getFinanceSettlements: (status?: string) =>
    apiClient.get('/finance/settlements', { params: status ? { status } : {} }),
  getFinanceSettlementStats: () =>
    apiClient.get('/finance/settlements/stats'),
  markSettled: (invoiceId: string, paymentRef: string) =>
    apiClient.post(`/finance/settlements/${invoiceId}/mark-settled`, { payment_ref: paymentRef }),
  // Omit amount for a full reversal; pass one to credit part of the invoice (F-18).
  issueCreditNote: (invoiceId: string, reason: string, amount?: number) =>
    apiClient.post(`/finance/settlements/${invoiceId}/credit-note`, {
      reason,
      ...(amount != null ? { amount } : {}),
    }),

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
  // The path takes the STAFF id, not the deposit id — the row's `staff_id`,
  // not its `id`. PARTIAL_REFUND is rejected without a refund_amount.
  recordDepositEvent: (staffId: string, event: string, notes?: string, scenarioCode?: string, refundAmount?: number) =>
    apiClient.post(`/finance/deposits/${staffId}/event`, {
      event,
      notes,
      scenario_code: scenarioCode,
      ...(refundAmount != null ? { refund_amount: refundAmount } : {}),
    }),

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
  getAuditLogs: (params?: { limit?: number; page?: number; action?: string; actorId?: string }) =>
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
  deleteTrainingBatch: (batchId: string) => apiClient.delete(`/training/batches/${batchId}`),
  enrollInBatch: (batchId: string, staffId: string) => apiClient.post(`/training/batches/${batchId}/enroll`, { staff_id: staffId }),
  markBatchAttendance: (batchId: string, body: { staff_id: string; day_number: number; attended: boolean }) =>
    apiClient.patch(`/training/batches/${batchId}/attendance`, body),
  updateBatchStatus: (batchId: string, status: string) => apiClient.patch(`/training/batches/${batchId}/status`, { status }),

  // Trainer Role Module
  getTrainerDashboard: () => apiClient.get('/trainer/dashboard'),
  getTrainerBatches: () => apiClient.get('/trainer/batches'),
  getTrainerVideoCertifications: () => apiClient.get('/trainer/video-certifications'),
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
  getAdminPipelineAuditEvents: (params?: Record<string, unknown>) =>
    apiClient.get('/admin/audit-logs/pipeline-events', { params }),

  getAdminSystemHealth: () => apiClient.get('/admin/system-health'),
  getAdminQueueStatus: () => apiClient.get('/admin/queues'),
  getAdminFailedQueueJobs: (limit = 20) => apiClient.get('/admin/queues/failed', { params: { limit } }),
  retryAdminFailedQueueJobs: () => apiClient.post('/admin/queues/retry-failed'),
  getAdminCronStatus: () => apiClient.get('/admin/cron-status'),
  triggerAdminManualCronRun: (jobId: string) => apiClient.post(`/admin/cron-jobs/${jobId}/trigger`),
  getAdminApiTelemetry: () => apiClient.get('/admin/telemetry/api'),

  getAdminRevenueAnalytics: () => apiClient.get('/admin/analytics/revenue'),
  getAdminPipelineAnalytics: () => apiClient.get('/admin/analytics/pipeline'),
  getAdminPipelineOverview: () => apiClient.get('/admin/pipeline/overview'),
  getAdminPlacementAnalytics: () => apiClient.get('/admin/analytics/placements'),

  getAdminVideoCertifications: (params?: { status?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/video-certifications', { params }),
  reviewAdminVideoCertification: (id: string, body: { status: 'APPROVED' | 'REJECTED'; notes?: string }) =>
    apiClient.put(`/admin/video-certifications/${id}/review`, body),
  overrideAdminVideoCertification: (id: string, body: { neverDelete?: boolean; reviewNotes?: string; fraudFlag?: boolean; legalHold?: boolean; legalReason?: string }) =>
    apiClient.put(`/admin/video-certifications/${id}/override`, body),
  getVideoCertViewUrl: (key: string) => apiClient.post('/video-cert/view-url', { key }),
  getVideoCertPrompts: (series: string) => apiClient.get(`/video-cert/prompts/${series}`),
  listVideoCertsForStaff: (staffId: string) => apiClient.get(`/video-cert/list/${staffId}`),

  submitAdminDeleteRequest: (body: Record<string, unknown>) => apiClient.post('/admin/privacy/delete-request', body),
  getAdminPrivacyRequests: () => apiClient.get('/admin/privacy/requests'),

  // Admin Dual-Approval endpoints
  getAdminApprovals: () => apiClient.get('/admin/approvals'),
  approveAdminAction: (id: string) => apiClient.post(`/admin/approvals/${id}/approve`),
  rejectAdminAction: (id: string) => apiClient.post(`/admin/approvals/${id}/reject`),

  // ── Finance Customers ──────────────────────────────────────────────────────
  listFinanceCustomers: (search?: string) =>
    apiClient.get('/finance/customers', { params: search ? { search } : {} }),
  createFinanceCustomer: (body: {
    customer_name: string;
    address: string;
    pan_card: string;
    gstn?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
    email?: string;
    branches?: Array<{
      unit_code: string;
      unit_name: string;
      address?: string;
      state?: string;
      city?: string;
      pincode?: string;
      gstn?: string;
    }>;
  }) => apiClient.post('/finance/customers', body),
  getFinanceCustomer: (id: string) => apiClient.get(`/finance/customers/${id}`),
  getCustomerBranches: (id: string) => apiClient.get(`/finance/customers/${id}/branches`),
  addCustomerBranch: (id: string, body: any) => apiClient.post(`/finance/customers/${id}/branches`, body),
  listAllCustomerBranches: () => apiClient.get('/finance/customers/branches/all'),
  updateFinanceCustomer: (id: string, body: Record<string, unknown>) =>
    apiClient.put(`/finance/customers/${id}`, body),
  generateFinanceCustomerBillNumber: (id: string) =>
    apiClient.post(`/finance/customers/${id}/bill-number`),
  verifyFinanceCustomerPan: (id: string) =>
    apiClient.post(`/finance/customers/${id}/verify-pan`),

  // ── Finance Commercial ─────────────────────────────────────────────────────
  listWageConfigs: (search?: string) =>
    apiClient.get('/finance/commercial/wage-config', { params: search ? { search } : {} }),
  createWageConfig: (body: any) =>
    apiClient.post('/finance/commercial/wage-config', body),
  getWageCategories: () =>
    apiClient.get('/finance/commercial/wage-config/categories'),
  getActiveWageConfig: (state: string, zone: string, category: string) =>
    apiClient.get('/finance/commercial/wage-config/active', { params: { state, zone, category } }),
  getWageRevisionComparison: (state: string, zone: string, category: string) =>
    apiClient.get('/finance/commercial/wage-config/comparison', { params: { state, zone, category } }),
  listCalculations: (search?: string) =>
    apiClient.get('/finance/commercial/calculations', { params: search ? { search } : {} }),
  runCalculationOnTheFly: (body: any) =>
    apiClient.post('/finance/commercial/calculations/calculate', body),
  createCalculation: (body: any) =>
    apiClient.post('/finance/commercial/calculations', body),
  getCalculation: (id: string) =>
    apiClient.get(`/finance/commercial/calculations/${id}`),
  submitForApproval: (id: string) =>
    apiClient.post(`/finance/commercial/calculations/${id}/submit`),
  approveCalculation: (id: string, comments: string) =>
    apiClient.post(`/finance/commercial/calculations/${id}/approve`, { comments }),
  rejectCalculation: (id: string, comments: string) =>
    apiClient.post(`/finance/commercial/calculations/${id}/reject`, { comments }),
  listQuotations: () =>
    apiClient.get('/finance/commercial/quotations'),
  createQuotation: (body: any) =>
    apiClient.post('/finance/commercial/quotations', body),
  getQuotation: (id: string) =>
    apiClient.get(`/finance/commercial/quotations/${id}`),
  listRateCards: (search?: string) =>
    apiClient.get('/finance/commercial/rate-cards', { params: search ? { search } : {} }),
  getCommercialReports: () =>
    apiClient.get('/finance/commercial/reports'),

  // ── Enterprise Payroll & Salary Structures ─────────────────────────────────
  listSalaryStructures: (params?: any) => apiClient.get('/salary-structure', { params }),
  getSalaryStructure: (id: string) => apiClient.get(`/salary-structure/${id}`),
  createSalaryStructure: (body: any) => apiClient.post('/salary-structure', body),
  updateSalaryStructure: (id: string, body: any) => apiClient.put(`/salary-structure/${id}`, body),
  deleteSalaryStructure: (id: string) => apiClient.delete(`/salary-structure/${id}`),

  listEmployeeSalaries: (params?: any) => apiClient.get('/employee-salary', { params }),
  getEmployeeSalaryProfile: (employeeId: string) => apiClient.get(`/employee-salary/employee/${employeeId}`),
  assignEmployeeSalaryProfile: (body: any) => apiClient.post('/employee-salary', body),
  reviseEmployeeSalary: (employeeId: string, body: any) => apiClient.post(`/employee-salary/employee/${employeeId}/revise`, body),

  listOvertimeRules: () => apiClient.get('/overtime/rules'),
  createOvertimeRule: (body: any) => apiClient.post('/overtime/rules', body),
  listOvertimeRecords: (params?: any) => apiClient.get('/overtime/records', { params }),
  createOvertimeRecord: (body: any) => apiClient.post('/overtime/records', body),
  approveOvertimeRecord: (id: string, role?: string) => apiClient.put(`/overtime/records/${id}/approve`, {}, { params: { role } }),
  rejectOvertimeRecord: (id: string) => apiClient.put(`/overtime/records/${id}/reject`, {}),

  listBonusRecords: (params?: any) => apiClient.get('/bonus', { params }),
  createBonusRecord: (body: any) => apiClient.post('/bonus', body),
  deleteBonusRecord: (id: string) => apiClient.delete(`/bonus/${id}`),

  listReimbursements: (params?: any) => apiClient.get('/reimbursement', { params }),
  createReimbursement: (body: any) => apiClient.post('/reimbursement', body),
  updateReimbursementStatus: (id: string, body: any) => apiClient.put(`/reimbursement/${id}/status`, body),

  listLoans: (params?: any) => apiClient.get('/loan', { params }),
  createLoan: (body: any) => apiClient.post('/loan', body),
  updateLoanStatus: (id: string, status: string) => apiClient.put(`/loan/${id}/status`, { status }),
  listSalaryAdvances: (params?: any) => apiClient.get('/loan/advance/list', { params }),
  createSalaryAdvance: (body: any) => apiClient.post('/loan/advance', body),

  processEnterpriseBatch: (body: any) => apiClient.post('/enterprise-payroll/process-batch', body),
  listEnterpriseBatches: (params?: any) => apiClient.get('/enterprise-payroll/batches', { params }),
  getEnterpriseBatch: (id: string) => apiClient.get(`/enterprise-payroll/batches/${id}`),
  approveEnterpriseBatchTier: (id: string, body: any) => apiClient.put(`/enterprise-payroll/batches/${id}/approve`, body),
  rejectEnterpriseBatchTier: (id: string, body: any) => apiClient.put(`/enterprise-payroll/batches/${id}/reject`, body),
  lockEnterpriseBatch: (id: string) => apiClient.put(`/enterprise-payroll/batches/${id}/lock`, {}),
  generateBankTransferBatch: (id: string, format: string) => apiClient.post(`/enterprise-payroll/batches/${id}/bank-transfer`, { format }),
  getEnterprisePayrollSummary: (params?: any) => apiClient.get('/enterprise-payroll/reports/summary', { params }),
  getDepartmentPayrollBreakdown: (params?: any) => apiClient.get('/enterprise-payroll/reports/department-breakdown', { params }),
  getStatutoryComplianceReport: (params?: any) => apiClient.get('/enterprise-payroll/reports/statutory-compliance', { params }),
  listPayrollSettings: () => apiClient.get('/enterprise-payroll/settings'),
  updatePayrollSetting: (body: any) => apiClient.post('/enterprise-payroll/settings', body),
};
