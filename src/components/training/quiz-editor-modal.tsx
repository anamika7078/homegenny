'use client';
import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api/client';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { errorMessage, fieldCls } from './quiz-ui';

interface QuestionDraft {
  question_text: string;
  type: 'MCQ' | 'TEXT';
  options: string[];
  correct_option: number;
  points: number;
}

const blankQuestion = (): QuestionDraft => ({ question_text: '', type: 'MCQ', options: ['', ''], correct_option: 0, points: 1 });

/** Create a quiz, or edit one (`quizId`) — edit only works while nobody has attempted it. */
export function QuizEditorModal({ batchId, quizId, onClose, onSaved }: {
  batchId: string;
  quizId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [passMarks, setPassMarks] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([blankQuestion()]);
  const [loading, setLoading] = useState(!!quizId);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!quizId) return;
    api.getTrainingQuiz(quizId)
      .then((q: any) => {
        setTitle(q.title);
        setPassMarks(q.passMarksIsDefault ? '' : String(q.passMarks));
        setLocked(!q.editable);
        setQuestions(q.questions.map((x: any) => ({
          question_text: x.questionText,
          type: x.type,
          options: x.type === 'MCQ' ? x.options : ['', ''],
          correct_option: x.correctOption ?? 0,
          points: x.points,
        })));
      })
      .catch((e: any) => setError(errorMessage(e, 'Failed to load quiz')))
      .finally(() => setLoading(false));
  }, [quizId]);

  const total = questions.reduce((s, q) => s + (q.points || 0), 0);
  const defaultPass = Math.ceil(total * 0.6);

  const update = (i: number, patch: Partial<QuestionDraft>) =>
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const submit = async () => {
    setError('');
    if (!title.trim()) return setError('Quiz title is required');
    for (const [i, q] of questions.entries()) {
      if (!q.question_text.trim()) return setError(`Question ${i + 1}: text is required`);
      if (q.type === 'MCQ' && q.options.some((o) => !o.trim())) return setError(`Question ${i + 1}: fill every option or remove the empty one`);
    }
    const pm = passMarks.trim() ? Number(passMarks) : null;
    if (pm != null && (!Number.isInteger(pm) || pm < 1 || pm > total)) return setError(`Pass marks must be between 1 and ${total}`);

    const body = {
      title: title.trim(),
      pass_marks: pm,
      questions: questions.map((q) => ({
        question_text: q.question_text.trim(),
        type: q.type,
        points: q.points,
        ...(q.type === 'MCQ' ? { options: q.options.map((o) => o.trim()), correct_option: q.correct_option } : {}),
      })),
    };
    setSubmitting(true);
    try {
      if (quizId) await api.updateTrainingQuiz(quizId, body);
      else await api.createTrainingQuiz({ batch_id: batchId, ...body });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(errorMessage(e, 'Failed to save quiz'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={quizId ? 'Edit Quiz' : 'Create Quiz'} className="max-w-2xl">
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
      ) : locked ? (
        <p className="text-sm text-amber-400">
          Is quiz ke attempts ho chuke hain, isliye ab edit nahi ho sakti. Galat answer key ko Assessment tab me review karte waqt ✔/✘ override se theek karein.
        </p>
      ) : (
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          <input className={fieldCls} placeholder="Quiz title" value={title} onChange={(e) => setTitle(e.target.value)} />

          {questions.map((q, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-muted-foreground">Question {i + 1}</span>
                <div className="flex items-center gap-2">
                  <select
                    value={q.type}
                    onChange={(e) => update(i, { type: e.target.value as 'MCQ' | 'TEXT' })}
                    className="bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-xs text-foreground"
                  >
                    <option value="MCQ">MCQ</option>
                    <option value="TEXT">Answer-type</option>
                  </select>
                  <label className="text-[11px] text-muted-foreground">Marks</label>
                  <input
                    type="number" min={1} value={q.points}
                    onChange={(e) => update(i, { points: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
                    className="w-14 bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-xs text-foreground"
                  />
                  {questions.length > 1 && (
                    <button onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300" aria-label="Remove question">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <input className={fieldCls} placeholder="Question text" value={q.question_text} onChange={(e) => update(i, { question_text: e.target.value })} />
              {q.type === 'MCQ' ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">Sahi option ka circle select karein</p>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input type="radio" checked={q.correct_option === oi} onChange={() => update(i, { correct_option: oi })} aria-label="Correct answer" />
                      <input
                        className={fieldCls} placeholder={`Option ${oi + 1}`} value={opt}
                        onChange={(e) => update(i, { options: q.options.map((o, idx) => (idx === oi ? e.target.value : o)) })}
                      />
                      {q.options.length > 2 && (
                        <button
                          onClick={() => update(i, {
                            options: q.options.filter((_, idx) => idx !== oi),
                            correct_option: q.correct_option === oi ? 0 : q.correct_option > oi ? q.correct_option - 1 : q.correct_option,
                          })}
                          className="text-muted-foreground hover:text-red-400" aria-label="Remove option"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => update(i, { options: [...q.options, ''] })} className="text-[11px] text-[#FF5A1F] hover:underline">
                    + Add option
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Staff likh ke jawab dega — aap Assessment tab me ✔/✘ karenge.</p>
              )}
            </div>
          ))}

          <button
            onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}
            className="w-full py-2 rounded-lg border border-dashed border-white/15 text-xs text-muted-foreground hover:text-foreground hover:border-white/30"
          >
            <Plus className="w-3.5 h-3.5 inline mr-1" /> Add another question
          </button>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">Total marks: <span className="font-bold text-foreground">{total}</span></span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Pass marks</label>
              <input
                type="number" min={1} max={total} value={passMarks} placeholder={String(defaultPass)}
                onChange={(e) => setPassMarks(e.target.value)}
                className="w-20 bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-xs text-foreground"
              />
              <span className="text-[11px] text-muted-foreground">(khaali = 60% = {defaultPass})</span>
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          <Button className="w-full" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : quizId ? 'Save Changes' : 'Create Quiz'}
          </Button>
        </div>
      )}
      {locked && error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </Modal>
  );
}
