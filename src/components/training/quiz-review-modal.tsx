'use client';
import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api/client';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { errorMessage, formatDateTime } from './quiz-ui';

interface Answer {
  questionId: string;
  questionText: string;
  type: 'MCQ' | 'TEXT';
  options: string[] | null;
  correctOption: number | null;
  points: number;
  selectedOption: number | null;
  answerText: string | null;
  answered: boolean;
  isCorrect: boolean | null;
}

/**
 * Trainer marks every answer ✔/✘ — ✔ earns the question's full marks, ✘ earns 0.
 * MCQ arrives pre-marked from submit but can be overridden.
 */
export function QuizReviewModal({ attemptId, onClose, onDone }: { attemptId: string; onClose: () => void; onDone: () => void }) {
  const [detail, setDetail] = useState<any>(null);
  const [marks, setMarks] = useState<Record<string, boolean | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getQuizAttempt(attemptId)
      .then((d: any) => {
        setDetail(d);
        setMarks(Object.fromEntries(d.answers.map((a: Answer) => [a.questionId, a.isCorrect])));
      })
      .catch((e: any) => setError(errorMessage(e, 'Failed to load attempt')))
      .finally(() => setLoading(false));
  }, [attemptId]);

  const answers: Answer[] = detail?.answers ?? [];
  const score = useMemo(() => answers.reduce((s, a) => s + (marks[a.questionId] ? a.points : 0), 0), [answers, marks]);
  const unmarked = answers.filter((a) => marks[a.questionId] == null).length;
  const reviewable = !!detail?.reviewable;

  const finalize = async () => {
    setSaving(true); setError('');
    try {
      await api.reviewQuizAttempt(attemptId, {
        marks: answers
          .filter((a) => marks[a.questionId] != null && marks[a.questionId] !== a.isCorrect)
          .map((a) => ({ question_id: a.questionId, correct: marks[a.questionId] as boolean })),
      });
      onDone();
      onClose();
    } catch (e: any) {
      setError(errorMessage(e, 'Failed to save review'));
    } finally {
      setSaving(false);
    }
  };

  const title = detail ? `${detail.staffName} · Attempt ${detail.attemptNumber}` : 'Review';

  return (
    <Modal open onClose={onClose} title={title} className="max-w-2xl">
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
      ) : !detail ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
            <span>{detail.quizTitle} · {detail.batchCode} · {detail.staffCode}</span>
            <span>Submitted {formatDateTime(detail.submittedAt)}</span>
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {answers.map((a, i) => {
              const mark = marks[a.questionId];
              return (
                <div key={a.questionId} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">
                      <span className="text-muted-foreground mr-1">Q{i + 1}.</span>{a.questionText}
                    </p>
                    <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                      {a.type === 'MCQ' ? 'MCQ' : 'Answer-type'} · {a.points} marks
                    </span>
                  </div>

                  {a.type === 'MCQ' ? (
                    <ul className="space-y-1">
                      {(a.options ?? []).map((opt, oi) => (
                        <li
                          key={oi}
                          className={`text-xs px-2 py-1 rounded-md border ${
                            oi === a.selectedOption
                              ? oi === a.correctOption ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-red-500/40 bg-red-500/10 text-red-300'
                              : oi === a.correctOption ? 'border-emerald-500/25 text-emerald-400/80' : 'border-transparent text-muted-foreground'
                          }`}
                        >
                          {opt}
                          {oi === a.selectedOption && <span className="ml-2 font-bold">← staff</span>}
                          {oi === a.correctOption && <span className="ml-2">(sahi jawab)</span>}
                        </li>
                      ))}
                      {a.selectedOption == null && <li className="text-xs italic text-muted-foreground">Staff ne jawab nahi diya</li>}
                    </ul>
                  ) : (
                    <p className={`text-sm rounded-md px-3 py-2 bg-white/5 ${a.answered ? 'text-foreground' : 'italic text-muted-foreground'}`}>
                      {a.answered ? a.answerText : 'Staff ne jawab nahi diya'}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      disabled={!reviewable}
                      onClick={() => setMarks((m) => ({ ...m, [a.questionId]: true }))}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-60 ${
                        mark === true ? 'bg-emerald-600 text-white border-emerald-600' : 'border-white/15 text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/40'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" /> Correct
                    </button>
                    <button
                      disabled={!reviewable}
                      onClick={() => setMarks((m) => ({ ...m, [a.questionId]: false }))}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-60 ${
                        mark === false ? 'bg-red-600 text-white border-red-600' : 'border-white/15 text-muted-foreground hover:text-red-400 hover:border-red-500/40'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" /> Incorrect
                    </button>
                    <span className="ml-auto text-xs font-semibold text-muted-foreground">
                      {mark == null ? '— / ' : `${mark ? a.points : 0} / `}{a.points}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-foreground">{score} / {detail.totalPoints}</p>
              <p className="text-[11px] text-muted-foreground">Pass marks: {detail.passMarks}</p>
            </div>
            {unmarked > 0 ? (
              <span className="text-xs text-amber-400">{unmarked} question(s) mark karne baaki</span>
            ) : (
              <span className={`text-sm font-bold ${score >= detail.passMarks ? 'text-emerald-400' : 'text-red-400'}`}>
                {score >= detail.passMarks ? 'PASS' : 'FAIL'}
              </span>
            )}
          </div>

          {detail.history?.length > 1 && (
            <div className="text-[11px] text-muted-foreground space-y-0.5">
              <p className="font-semibold">Attempt history</p>
              {detail.history.map((h: any) => (
                <p key={h.attemptId}>
                  #{h.attemptNumber} · {h.status === 'GRADED' ? `${h.score}/${h.maxScore} ${h.passed ? 'Pass' : 'Fail'}` : h.status}
                  {h.status === 'SCHEDULED' && ` · opens ${formatDateTime(h.availableAt)}`}
                </p>
              ))}
            </div>
          )}

          {!reviewable && <p className="text-xs text-muted-foreground">Is staff ka naya attempt aa chuka hai — ye purana attempt sirf dekhne ke liye hai.</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}
          {reviewable && (
            <Button className="w-full" onClick={finalize} disabled={saving || unmarked > 0}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : detail.status === 'GRADED' ? 'Update Result' : 'Finalize Result'}
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}
