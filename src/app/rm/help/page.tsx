'use client';

import { RmPageHeader } from '@/components/rm/rm-page-header';

const TOPICS = [
  ['FSM transitions', 'Use Pipeline Board — direct stage PATCH is blocked for RM role.'],
  ['Restricted list', 'Always runs at S1 intake before deposit collection.'],
  ['PV rules', 'Maid may deploy with pending PV; SC/UC/DR require CLEAR PV.'],
  ['Driver assessment', 'Max 3 attempts — failures 1–2 defer, attempt 3 terminals.'],
  ['Deferred timeout', 'Auto-terminal after 90 days via cron job.'],
];

export default function RmHelpPage() {
  return (
    <div className="p-6">
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
