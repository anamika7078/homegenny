'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { errorMessage, fieldCls } from './quiz-ui';

/** Default: tomorrow 10:00 in the trainer's local time, formatted for <input type="datetime-local">. */
function defaultWhen(): string {
  const d = new Date(Date.now() + 864e5);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function QuizRescheduleModal({ quizId, staffId, staffName, quizTitle, onClose, onDone }: {
  quizId: string;
  staffId: string;
  staffName: string;
  quizTitle: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [when, setWhen] = useState(defaultWhen());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const at = new Date(when);
    if (isNaN(at.getTime())) return setError('Date/time select karein');
    setSaving(true); setError('');
    try {
      await api.rescheduleQuiz(quizId, { staff_id: staffId, available_at: at.toISOString(), note: note.trim() || undefined });
      onDone();
      onClose();
    } catch (e: any) {
      setError(errorMessage(e, 'Failed to reschedule'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Reschedule Quiz">
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">{staffName} · {quizTitle}</p>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Quiz kab khulegi</label>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={`${fieldCls} [color-scheme:dark]`} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Staff ke liye note (optional)</label>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Jaise: Q3 ka topic dobara padh lein" className={fieldCls} />
        </div>
        <p className="text-[11px] text-muted-foreground">Staff ko app me notification jaayega.</p>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <Button className="w-full" onClick={submit} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reschedule'}
        </Button>
      </div>
    </Modal>
  );
}
