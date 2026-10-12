'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api/client';
import { RmPageHeader } from '@/components/rm/rm-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Refused {
  id: string;
  placement_id: string;
  text: string | null;
  voice_file_id: string | null;
  staff_note: string | null;
  refused_at: string;
  staff_name: string;
  client_name: string;
  scope_of_work: { content: string; version: number; status: string } | null;
}

/**
 * A staff member said "not part of my job" to a client's instruction. The RM
 * reads the scope of work and decides: UPHELD (the staff was right) or
 * OVERTURNED (it is part of the job). Both sides are told.
 */
export default function RefusedInstructionsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['refused-instructions'], queryFn: () => api.getRefusedInstructions() });
  const items: Refused[] = data?.items ?? [];
  const [notes, setNotes] = useState<Record<string, string>>({});
  const decide = useMutation({
    mutationFn: (v: { id: string; decision: 'UPHELD' | 'OVERTURNED' }) => api.decideInstruction(v.id, { decision: v.decision, note: notes[v.id] ?? '' }),
    onSuccess: () => {
      toast.success('Decision sent to the family and the staff');
      qc.invalidateQueries({ queryKey: ['refused-instructions'] });
      qc.invalidateQueries({ queryKey: ['care-compliance'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="page-padding max-w-4xl mx-auto space-y-4">
      <Link href="/rm/care" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Daily Care
      </Link>
      <RmPageHeader title="Refused Instructions" description="Staff said it is not their job — check the scope of work and decide" />
      {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && items.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Nothing waiting.</p>}
      {items.map((i) => (
        <div key={i.id} className="glass-card space-y-3 rounded-xl p-5">
          <div>
            <p className="text-xs text-muted-foreground">{i.client_name} → {i.staff_name} · refused {new Date(i.refused_at).toLocaleString()}</p>
            <p className="mt-1 font-semibold">“{i.text ?? 'Voice note'}”</p>
            <p className="mt-1 text-sm text-rose-300">Staff: {i.staff_note}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs">
            <p className="mb-1 font-semibold">Scope of work{i.scope_of_work ? ` (v${i.scope_of_work.version}, ${i.scope_of_work.status.toLowerCase()})` : ''}</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{i.scope_of_work?.content ?? 'No scope of work has been sent for this placement.'}</p>
          </div>
          <Input
            value={notes[i.id] ?? ''}
            onChange={(e) => setNotes({ ...notes, [i.id]: e.target.value })}
            placeholder="Note for both the family and the staff (required)"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={!notes[i.id]?.trim() || decide.isPending} onClick={() => decide.mutate({ id: i.id, decision: 'OVERTURNED' })}>
              Part of the job — staff does it
            </Button>
            <Button disabled={!notes[i.id]?.trim() || decide.isPending} onClick={() => decide.mutate({ id: i.id, decision: 'UPHELD' })}>
              Staff is right — outside the job
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
