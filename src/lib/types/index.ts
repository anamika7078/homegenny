export type UserRole =
  | 'STAFF' | 'CLIENT' | 'RM' | 'BM' | 'FINANCE' | 'ADMIN'
  | 'TRAINER' | 'ASSESSOR' | 'SUPPORT' | 'HR';
export type Series = 'MAID' | 'SC' | 'UC' | 'DR';
export type PipelineStage =
  | 'S1_INTAKE' | 'S2_VERIFY' | 'S2_5_ASSESS' | 'S3_TRAIN'
  | 'S4_AGREEMENTS' | 'S5_DEPLOY' | 'DEFERRED' | 'TERMINAL';
export type PlacementStatus = 'TRIAL' | 'CONFIRMED' | 'EXITED' | 'TERMINATED';

export interface User {
  id: string; full_name: string; phone: string; email?: string;
  role: UserRole; branch_id?: string; is_active: boolean;
  permissions?: string[];
}

export interface StaffApplicant {
  id: string; staff_code: string; series: Series;
  pipeline_stage: PipelineStage; current_scenario_code?: string;
  full_name: string; mobile: string; language_tier?: string;
  verified_docs: Record<string, any>; pv_status: string;
  restricted_list_flag: boolean; video_cert_id?: string;
  assigned_rm_id?: string; metadata: Record<string, any>;
  created_at: string; updated_at: string;
}

export interface Placement {
  id: string; staff_id: string; client_id: string;
  status: PlacementStatus; staff_salary: number;
  management_fee: number; trial_start_date?: string;
  trial_end_date?: string; billing_start_date?: string;
}

export interface PayrollCalc {
  grossSalary: number; esicEmployee: number; esicEmployer: number;
  pfEmployee: number; pfEmployer: number; netSalary: number;
  managementFee: number; gstOnFee: number; clientTotalCharge: number;
  ratesUsed?: {
    pfEmployeePct: number; pfEmployerPct: number; pfCeiling: number;
    esicEmployeePct: number; esicEmployerPct: number; gstPct: number;
  };
}

export type StaffAttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'OVERTIME';

export interface DailyAttendanceRecord {
  date: string;
  status: StaffAttendanceStatus;
  overtime_hours?: number | null;
}

export interface StaffAttendanceSummary {
  staff_id: string;
  staff_code: string;
  full_name: string;
  placement_id: string;
  monthly_salary: number;
  monthly_management_fee: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  overtime_days: number;
  billable_days: number;
  days_in_month: number;
  prorated_gross: number;
  invoice_id: string | null;
  daily_records: DailyAttendanceRecord[];
}

export interface RmAttendanceResponse {
  month: number;
  year: number;
  branch_id: string;
  staff: StaffAttendanceSummary[];
}

export interface RmLocationBranch {
  id: string;
  name: string;
  city: string;
}

export interface RmLocationArea {
  city: string;
  area: string;
  branch_code: string;
  branch_id: string;
  label: string;
}

export interface RmLocationsResponse {
  cities: string[];
  branches: RmLocationBranch[];
  areas: RmLocationArea[];
}

export interface AttendanceInvoicePreview {
  placement_id: string;
  staff_id: string;
  staff_code?: string;
  staff_name?: string;
  period_month: number;
  period_year: number;
  monthly_salary: number;
  monthly_management_fee: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  overtime_days: number;
  billable_days: number;
  days_in_month: number;
  prorated_gross: number;
  prorated_management_fee: number;
  invoice_id: string | null;
  calculation: PayrollCalc;
}

export interface ApiResponse<T> { data: T; message?: string; statusCode: number; }
export interface PaginatedResponse<T> { items: T[]; total: number; page: number; limit: number; }