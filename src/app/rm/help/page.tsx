'use client';

import { RmPageHeader } from '@/components/rm/rm-page-header';

const TOPICS = [
  ['Moving stages', 'Use the Kanban Board. If a move is refused, the message lists exactly what is still missing.'],
  ['Restricted list', 'Checked first at S1, and again on every later move. A match stops the staff member.'],
  ['Verification (S2)', 'Aadhaar eKYC, police verification and medical clearance must all be Clear before S3.'],
  ['Training (S3)', 'A failed quiz only schedules a retake. Every required video prompt must be approved before S4.'],
  ['Holds', 'Hold a stage to let the staff member move on while one item is pending. Nobody on hold can be placed.'],
  ['Deferred', 'A reason is required. Resume never goes past the stage deferred from. Cases close after 90 days.'],
  ['Placements', 'A Permanent placement must be the staff member’s only one. Several Temporary (hourly) placements are fine.'],
  ['Leaving staff', 'Exit every active placement, with a date and reason, before closing a staff member as Terminal.'],
];

export default function RmHelpPage() {
  return (
    <div className="page-padding">
      <RmPageHeader title="Help Center" description="RM workflow reference" />
      <ul className="space-y-3">
        {TOPICS.map(([title, body]) => (
          <li key={title} className="glass-card rounded-lg p-4">
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
