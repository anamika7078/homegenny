/**
 * Staff requests (Phase B) — the vocabulary the backend uses, in one place.
 * homegennyserver/src/modules/staff-requests/staff-requests.service.ts is the source.
 */

export type StaffRequestStatus = 'NEW' | 'ASSIGNED' | 'SHORTLISTED' | 'CLIENT_SELECTED' | 'FULFILLED' | 'CANCELLED';
export type CandidateStatus = 'PROPOSED' | 'CLIENT_SELECTED' | 'CLIENT_REJECTED' | 'WITHDRAWN' | 'PLACED';

export const OPEN_STATUSES: StaffRequestStatus[] = ['NEW', 'ASSIGNED', 'SHORTLISTED', 'CLIENT_SELECTED'];

export const REQUEST_STATUS: Record<StaffRequestStatus, { label: string; cls: string; hint: string }> = {
  NEW: { label: 'New — no RM', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30', hint: 'Waiting for a BM to assign an RM' },
  ASSIGNED: { label: 'Assigned', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', hint: 'RM to shortlist staff' },
  SHORTLISTED: { label: 'Shortlisted', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30', hint: 'Waiting for the client to choose' },
  CLIENT_SELECTED: { label: 'Client chose', cls: 'bg-violet-500/15 text-violet-300 border-violet-500/30', hint: 'Set up the trial placement' },
  FULFILLED: { label: 'Fulfilled', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', hint: 'Placement made' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30', hint: 'Closed' },
};

export const CANDIDATE_STATUS: Record<CandidateStatus, { label: string; cls: string }> = {
  PROPOSED: { label: 'Shortlisted', cls: 'text-sky-300' },
  CLIENT_SELECTED: { label: 'Client chose', cls: 'text-violet-300' },
  CLIENT_REJECTED: { label: 'Client said no', cls: 'text-rose-300' },
  WITHDRAWN: { label: 'Withdrawn', cls: 'text-slate-400' },
  PLACED: { label: 'Placed', cls: 'text-emerald-300' },
};

export const SOURCE_LABEL: Record<string, string> = {
  CLIENT_APP: 'Client app',
  RM_WEB: 'RM',
  REPLACEMENT: 'Replacement',
};

export const MOBILITY = [
  { value: 'WALKING', label: 'Walks on their own' },
  { value: 'ASSISTED', label: 'Needs help walking' },
  { value: 'BEDRIDDEN', label: 'Bedridden' },
];
/** Medical duties — only a Skilled Caretaker may do these (the backend refuses them on UC). */
export const MEDICAL_NEEDS = ['MEDICATION', 'VITALS', 'WOUND_CARE', 'INJECTION', 'CLINICAL_ESCALATION'];
export const DIET_TYPES = [
  { value: 'VEG', label: 'Veg' },
  { value: 'EGG', label: 'Veg + egg' },
  { value: 'NON_VEG', label: 'Non-veg' },
  { value: 'JAIN', label: 'Jain' },
  { value: 'VEGAN', label: 'Vegan' },
];
export const MEALS = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];

export const titleCase = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
