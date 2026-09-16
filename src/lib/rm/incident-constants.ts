/**
 * Incident vocabulary, mirrored from the backend.
 *
 * Statuses and the transition map mirror IncidentsService's `transition()`
 * guards — this is a pre-check so the UI only offers moves the server will
 * accept, not a replacement for the server's own validation.
 */

/**
 * The six values the database enum and the generated Prisma client actually
 * accept today. Sending anything else is a 500, not a 400 — Prisma rejects it
 * before any validation runs.
 *
 * `prisma/migrations/20260813000000_extend_incident_type/migration.sql` adds
 * five more (SCOPE_VIOLATION, ABSENTEEISM, CONDUCT, PROPERTY_DAMAGE,
 * INVOICE_DISPUTE) for the spec's client-complaint categories, but that
 * migration has not been applied and `enum IncidentType` in schema.prisma was
 * never updated to match it — so they exist only in a migration file. See
 * PENDING_INCIDENT_TYPES below; move them into the list above once the
 * migration is applied and the Prisma client regenerated.
 */
export const INCIDENT_TYPES = [
  { value: 'CLIENT_COMPLAINT', label: 'Client Complaint' },
  { value: 'STAFF_MISCONDUCT', label: 'Staff Misconduct' },
  { value: 'SAFETY_ISSUE', label: 'Safety Issue' },
  { value: 'ATTENDANCE_FRAUD', label: 'Attendance Fraud' },
  { value: 'DRIVING_VIOLATION', label: 'Driving Violation' },
  { value: 'LATE_EXIT', label: 'Late Exit' },
] as const;

/** Written, migrated-for, but not live. Not offered in any form yet. */
export const PENDING_INCIDENT_TYPES = [
  { value: 'SCOPE_VIOLATION', label: 'Scope Violation' },
  { value: 'ABSENTEEISM', label: 'Absenteeism' },
  { value: 'CONDUCT', label: 'Conduct' },
  { value: 'PROPERTY_DAMAGE', label: 'Property Damage' },
  { value: 'INVOICE_DISPUTE', label: 'Invoice Dispute' },
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number]['value'];

// Labels cover the pending values too, so a row already carrying one (from a
// database where the migration did run) still renders with a readable name.
export const INCIDENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  [...INCIDENT_TYPES, ...PENDING_INCIDENT_TYPES].map((t) => [t.value, t.label]),
);

export const INCIDENT_STATUSES = [
  'OPEN',
  'INVESTIGATING',
  'ESCALATED',
  'RESOLVED',
  'CLOSED',
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  INVESTIGATING: 'Investigating',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const INCIDENT_STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  INVESTIGATING: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  ESCALATED: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  RESOLVED: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  CLOSED: 'bg-white/10 text-muted-foreground border-white/15',
};

/** Which statuses each action is legal from — mirrors IncidentsService. */
export const INCIDENT_ACTION_FROM: Record<string, IncidentStatus[]> = {
  acknowledge: ['OPEN'],
  escalate: ['OPEN', 'INVESTIGATING'],
  resolve: ['OPEN', 'INVESTIGATING', 'ESCALATED'],
  close: ['RESOLVED'],
};

/** Which roles the backend's @Roles() decorators allow for each action. */
export const INCIDENT_ACTION_ROLES: Record<string, string[]> = {
  acknowledge: ['RM', 'ADMIN'],
  escalate: ['RM', 'ADMIN'],
  resolve: ['RM', 'BM', 'ADMIN'],
  close: ['BM', 'ADMIN'],
  legalHold: ['ADMIN'],
  comment: ['RM', 'BM', 'ADMIN', 'CLIENT'],
};

export function canDoIncidentAction(
  action: keyof typeof INCIDENT_ACTION_FROM | 'legalHold' | 'comment',
  status: string | undefined,
  role: string | undefined,
): boolean {
  if (!role || !INCIDENT_ACTION_ROLES[action]?.includes(role)) return false;
  const from = INCIDENT_ACTION_FROM[action];
  if (!from) return true; // comment / legalHold are status-independent
  return !!status && from.includes(status as IncidentStatus);
}
