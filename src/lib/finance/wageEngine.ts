export interface WageConfigInput {
  basic_wage?: number | string;
  da?: number | string;
  hra?: number | string;
  skilled_allowance?: number | string;
  additional_hours_pct?: number | string;
  
  // Contributions & Percentages
  employer_pf_pct?: number | string;
  employer_pf_max?: number | string;
  employee_pf_pct?: number | string;
  employer_esic_pct?: number | string;
  employee_esic_pct?: number | string;
  bonus_pct?: number | string;
  leave_days?: number | string;
  lwf_amount?: number | string;
  uniform_allowance?: number | string;
  relieving_pct?: number | string;
  management_pct?: number | string;
  professional_tax?: number | string;

  // Applicability Toggles
  pf_applicable?: boolean;
  esic_applicable?: boolean;
  bonus_applicable?: boolean;
  bonus_frequency?: 'monthly' | 'yearly' | string;
  lwf_applicable?: boolean;
  uniform_applicable?: boolean;
  relieving_applicable?: boolean;
  nfh_applicable?: boolean;
  shift_pattern?: '8' | '12' | string;

  // Customer Assignment & Quantity Options
  no_of_resources?: number | string;
  working_hours?: number | string;

  // GST Settings
  gst_applicable?: boolean;
  gst_type?: 'intra_state' | 'inter_state' | string;
  gst_pct?: number | string;
}

export interface WageCalculationResult {
  subtotal1: number;
  additionalHoursPct: number;
  additionalHours: number;
  subtotal2: number;
  bonusRaw: number;
  bonusMonthly: number;
  leaveWages: number;
  pfBase: number;
  epfoEmployer: number;
  esicEmployer: number;
  lwf: number;
  uniform: number;
  subtotal3: number;
  relieving: number;
  subtotal4: number;
  managementFee: number;
  
  // Per-Head Single Employee Costs
  totalCTC: number;
  ratePerDay: number;
  ratePerHour: number;
  grossEarnings: number;
  epfoEmployee: number;
  esicEmployee: number;
  totalDeductions: number;
  netSalary: number;

  // Multi-Resource Customer Billing Scaling
  noOfResources: number;
  totalMonthlyBillingBeforeGst: number;

  // NFH Extra Claim (per day)
  nfhPayDouble: number;
  nfhEsic: number;
  nfhServiceCharge: number;
  totalNfh: number;

  // GST & Total Customer Billing
  gstOn: boolean;
  gstType: 'intra_state' | 'inter_state';
  gstRate: number;
  cgstPct: number;
  sgstPct: number;
  igstPct: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGstAmount: number;
  grandTotalWithGst: number;
}

export function fmt(n: number | string): string {
  const val = Number(n);
  if (isNaN(val)) return '0.00';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(val);
}

export function fmtRs(n: number | string): string {
  return `₹${fmt(n)}`;
}

/**
 * Unified Wage Calculation Engine
 * Pure function that calculates complete wage breakup, CTC, net salary, and billing totals.
 * Handles single-head salary breakdown as well as multi-resource customer billing scaling.
 */
export function computeWageBreakup(
  d: WageConfigInput,
  workingHoursOverride?: number
): WageCalculationResult {
  const basic = Number(d.basic_wage) || 0;
  const da = Number(d.da) || 0;
  const hra = Number(d.hra) || 0;
  const skilledAllowance = Number(d.skilled_allowance) || 0;

  const employerPfPct = Number(d.employer_pf_pct) || 0;
  const employerPfMax = Number(d.employer_pf_max) || 15000;
  const employeePfPct = Number(d.employee_pf_pct) || 0;
  const employerEsicPct = Number(d.employer_esic_pct) || 0;
  const employeeEsicPct = Number(d.employee_esic_pct) || 0;
  const bonusPct = Number(d.bonus_pct) || 0;
  const leaveDays = Number(d.leave_days) || 32;
  const lwfAmount = Number(d.lwf_amount) || 62;
  const uniformAllowance = Number(d.uniform_allowance) || 275;
  const relievingPct = Number(d.relieving_pct) || 0;
  const managementPct = Number(d.management_pct) || 0;
  const professionalTax = Number(d.professional_tax) || 0;

  const pfOn = d.pf_applicable !== false;
  const esicOn = d.esic_applicable !== false;
  const bonusOn = d.bonus_applicable !== false;
  const bonusFreq: string = d.bonus_frequency || 'monthly';
  const lwfOn = d.lwf_applicable !== false;
  const uniformOn = d.uniform_applicable !== false;
  const relievingOn = d.relieving_applicable !== false;
  const nfhOn = d.nfh_applicable === true;

  // ── Phase A: Gross Salary ──
  const subtotal1 = basic + da;

  // Determine shift hours: check override parameter first, then d.working_hours, then d.shift_pattern
  const effectiveShiftHours = workingHoursOverride !== undefined 
    ? workingHoursOverride 
    : (Number(d.working_hours) || Number(d.shift_pattern) || 8);

  let additionalHoursPct = 0;
  let additionalHours = 0;
  if (effectiveShiftHours >= 12) {
    additionalHoursPct = Number(d.additional_hours_pct) || 50;
    additionalHours = subtotal1 * (additionalHoursPct / 100);
  }

  const subtotal2 = subtotal1 + additionalHours + hra + skilledAllowance;

  // ── Phase B: Statutory Contributions ──
  const bonusRaw = bonusOn ? subtotal1 * (bonusPct / 100) : 0;
  const bonusMonthly = bonusFreq === 'yearly' ? bonusRaw / 12 : bonusRaw;

  const workingYear = 312;
  const leaveWages = subtotal2 * (leaveDays / workingYear);

  const pfBase = basic + skilledAllowance + leaveWages;
  const employerPfCeiling = employerPfMax * (employerPfPct / 100);
  const epfoEmployer = pfOn
    ? Math.min(Math.round(pfBase * (employerPfPct / 100)), employerPfCeiling)
    : 0;

  const esicEmployer = esicOn
    ? (subtotal2 + leaveWages + bonusMonthly) * (employerEsicPct / 100)
    : 0;

  const lwf = lwfOn ? lwfAmount : 0;
  const uniform = uniformOn ? uniformAllowance : 0;

  // ── Phase C: CTC Per Head ──
  const subtotal3 =
    subtotal2 + epfoEmployer + esicEmployer + bonusMonthly + leaveWages + lwf + uniform;
  const relieving = relievingOn ? subtotal3 * (relievingPct / 100) : 0;
  const subtotal4 = subtotal3 + relieving;
  const managementFee = subtotal4 * (managementPct / 100);
  const totalCTC = subtotal4 + managementFee;
  const ratePerDay = totalCTC / 30.45;
  const ratePerHour = ratePerDay / 8;

  // ── Employee Net Salary (Per Head) ──
  const grossEarnings = subtotal2 + leaveWages + bonusMonthly;
  const employeePfCeiling = employerPfMax * (employeePfPct / 100);
  const epfoEmployee = pfOn
    ? Math.min(Math.round(pfBase * (employeePfPct / 100)), employeePfCeiling)
    : 0;
  const esicEmployee = esicOn ? grossEarnings * (employeeEsicPct / 100) : 0;
  const totalDeductions = epfoEmployee + esicEmployee + professionalTax;
  const netSalary = grossEarnings - totalDeductions;

  // ── Multi-Resource Billing Scaling ──
  const noOfResources = Math.max(1, Number(d.no_of_resources) || 1);
  const totalMonthlyBillingBeforeGst = totalCTC * noOfResources;

  // ── NFH Extra Claim ──
  const nfhPayDouble = nfhOn ? (subtotal2 / 26) * 2 : 0;
  const nfhEsic = nfhOn ? nfhPayDouble * (employerEsicPct / 100) : 0;
  const nfhServiceCharge = nfhOn
    ? (nfhPayDouble + nfhEsic) * (managementPct / 100)
    : 0;
  const totalNfh = nfhPayDouble + nfhEsic + nfhServiceCharge;

  // ── Phase D: GST & Customer Total Billing ──
  const gstOn = d.gst_applicable !== false;
  const gstType: 'intra_state' | 'inter_state' =
    d.gst_type === 'inter_state' ? 'inter_state' : 'intra_state';
  const gstRate = Number(d.gst_pct) || 18;

  let cgstPct = 0;
  let sgstPct = 0;
  let igstPct = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalGstAmount = 0;

  if (gstOn) {
    if (gstType === 'intra_state') {
      cgstPct = gstRate / 2;
      sgstPct = gstRate / 2;
      cgstAmount = totalMonthlyBillingBeforeGst * (cgstPct / 100);
      sgstAmount = totalMonthlyBillingBeforeGst * (sgstPct / 100);
      totalGstAmount = cgstAmount + sgstAmount;
    } else {
      igstPct = gstRate;
      igstAmount = totalMonthlyBillingBeforeGst * (igstPct / 100);
      totalGstAmount = igstAmount;
    }
  }

  const grandTotalWithGst = totalMonthlyBillingBeforeGst + totalGstAmount;

  return {
    subtotal1,
    additionalHoursPct,
    additionalHours,
    subtotal2,
    bonusRaw,
    bonusMonthly,
    leaveWages,
    pfBase,
    epfoEmployer,
    esicEmployer,
    lwf,
    uniform,
    subtotal3,
    relieving,
    subtotal4,
    managementFee,
    totalCTC,
    ratePerDay,
    ratePerHour,
    grossEarnings,
    epfoEmployee,
    esicEmployee,
    totalDeductions,
    netSalary,
    noOfResources,
    totalMonthlyBillingBeforeGst,
    nfhPayDouble,
    nfhEsic,
    nfhServiceCharge,
    totalNfh,
    gstOn,
    gstType,
    gstRate,
    cgstPct,
    sgstPct,
    igstPct,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalGstAmount,
    grandTotalWithGst,
  };
}
