'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, FileText, Video, StickyNote, Plus, Trash2, RefreshCw,
  AlertTriangle, Loader2, ClipboardList, Pencil,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { QuizEditorModal } from '@/components/training/quiz-editor-modal';

// ── Types ────────────────────────────────────────────────────────────────
interface Material {
  id: string; type: 'VIDEO' | 'PDF' | 'NOTE'; title: string;
  storageKey?: string | null; body?: string | null; createdAt: string;
}
interface QuizSummary {
  id: string; title: string; questionCount: number; totalPoints: number; passMarks: number;
  attemptCount: number; pendingGrading: number; editable: boolean;
}

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/15 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#FF5A1F]/50';

// ── Add Material Modal ──────────────────────────────────────────────────
function AddMaterialModal({ batchId, onClose, onAdded }: { batchId: string; onClose: () => void; onAdded: () => void }) {
  const [type, setType] = useState<'VIDEO' | 'PDF' | 'NOTE'>('NOTE');
  const [title, setTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setSubmitting(true); setError('');
    try {
      if (type === 'NOTE') {
        if (!noteBody.trim()) throw new Error('Note content is required');
        await api.createTrainingNote({ batch_id: batchId, title, body: noteBody });
      } else if (type === 'PDF') {
        if (!file) throw new Error('Choose a PDF file');
        const fd = new FormData();
        fd.append('batch_id', batchId);
        fd.append('title', title);
        fd.append('file', file);
        await api.uploadTrainingPdf(fd);
      } else {
        if (!file) throw new Error('Choose a video file');
        const { uploadUrl, key, fields } = await api.getTrainingVideoUploadUrl({ batch_id: batchId, filename: file.name });
        if (uploadUrl.startsWith('/api/v1/training/materials/local-upload')) {
          // Local storage mode — POST the bytes to our own server.
          const fd = new FormData();
          Object.entries(fields).forEach(([k, v]) => fd.append(k, v as string));
          fd.append('batch_id', batchId);
          fd.append('file', file);
          await api.uploadTrainingVideoLocal(fd);
        } else {
          // Real GCS signed POST.
          const fd = new FormData();
          Object.entries(fields).forEach(([k, v]) => fd.append(k, v as string));
          fd.append('file', file);
          await fetch(uploadUrl, { method: 'POST', body: fd });
        }
        await api.createTrainingVideoMaterial({ batch_id: batchId, title, storage_key: key });
      }
      onAdded();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e.message ?? 'Failed to add material');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Add Study Material">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {(['NOTE', 'PDF', 'VIDEO'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setFile(null); setError(''); }}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-semibold transition-colors ${
                type === t ? 'border-[#FF5A1F]/50 bg-[#FF5A1F]/10 text-[#FF5A1F]' : 'border-white/10 bg-white/3 text-muted-foreground'
              }`}
            >
              {t === 'NOTE' && <StickyNote className="w-4 h-4" />}
              {t === 'PDF' && <FileText className="w-4 h-4" />}
              {t === 'VIDEO' && <Video className="w-4 h-4" />}
              {t}
            </button>
          ))}
        </div>

        <input className={inputCls} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />

        {type === 'NOTE' && (
          <textarea
            className={inputCls} rows={5} placeholder="Note content…"
            value={noteBody} onChange={(e) => setNoteBody(e.target.value)}
          />
        )}
        {(type === 'PDF' || type === 'VIDEO') && (
          <input
            type="file"
            accept={type === 'PDF' ? 'application/pdf' : 'video/*'}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-muted-foreground file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[#FF5A1F]/15 file:text-[#FF5A1F] file:text-xs file:font-semibold"
          />
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}
        <Button className="w-full" onClick={submit} disabled={submitting}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Material'}
        </Button>
      </div>
    </Modal>
  );
}

// ── Quiz Card ───────────────────────────────────────────────────────────
function QuizCard({ quiz, onEdit, onDeleted }: { quiz: QuizSummary; onEdit: () => void; onDeleted: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/8 bg-card/60">
      <ClipboardList className="w-4 h-4 text-[#FF5A1F] shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{quiz.title}</p>
        <p className="text-[11px] text-muted-foreground">
          {quiz.questionCount} question{quiz.questionCount !== 1 ? 's' : ''} · {quiz.totalPoints} marks · Pass {quiz.passMarks}
          {' · '}{quiz.attemptCount} attempt{quiz.attemptCount !== 1 ? 's' : ''}
          {quiz.pendingGrading > 0 && <span className="text-violet-300 font-semibold"> · {quiz.pendingGrading} to check</span>}
        </p>
      </div>
      <Link
        href={`/trainer/assessment?quiz_id=${quiz.id}`}
        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/15 text-muted-foreground hover:text-foreground"
      >
        Submissions
      </Link>
      {quiz.editable && (
        <button onClick={onEdit} className="text-muted-foreground hover:text-foreground p-1" aria-label="Edit quiz">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        onClick={() => {
          const warn = quiz.attemptCount > 0 ? ` Iske ${quiz.attemptCount} attempts bhi delete ho jaayenge.` : '';
          if (confirm(`Delete this quiz?${warn}`)) api.deleteTrainingQuiz(quiz.id).then(onDeleted);
        }}
        className="text-muted-foreground hover:text-red-400 p-1" aria-label="Delete quiz"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const router = useRouter();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [editor, setEditor] = useState<{ quizId?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [matRes, quizRes] = await Promise.all([
        api.listTrainingMaterials(batchId),
        api.listTrainingQuizzes(batchId),
      ]);
      setMaterials((matRes as any)?.data ?? matRes ?? []);
      setQuizzes((quizRes as any)?.data ?? quizRes ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => { load(); }, [load]);

  const materialIcon = (t: Material['type']) =>
    t === 'VIDEO' ? <Video className="w-4 h-4 text-sky-400" /> : t === 'PDF' ? <FileText className="w-4 h-4 text-amber-400" /> : <StickyNote className="w-4 h-4 text-emerald-400" />;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page-padding max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/trainer/batches')} className="p-2 rounded-lg hover:bg-white/8 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Study Material &amp; Quizzes</h1>
          <p className="text-xs text-muted-foreground">Batch {batchId}</p>
        </div>
        <button onClick={load} disabled={loading} className="ml-auto p-2 rounded-lg border border-white/15 bg-white/5 text-muted-foreground hover:text-foreground disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Study Material */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Study Material</h2>
          <Button size="sm" onClick={() => setShowAddMaterial(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>
        {materials.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 rounded-xl border border-white/8 bg-card/40">No material yet</p>
        ) : (
          <div className="space-y-2">
            {materials.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/8 bg-card/60">
                {materialIcon(m.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{m.title}</p>
                  {m.type === 'NOTE' && m.body && <p className="text-xs text-muted-foreground line-clamp-2">{m.body}</p>}
                </div>
                <button
                  onClick={() => { if (confirm('Remove this material?')) api.deleteTrainingMaterial(m.id).then(load); }}
                  className="text-muted-foreground hover:text-red-400 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quizzes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Quizzes</h2>
          <Button size="sm" onClick={() => setEditor({})}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Create
          </Button>
        </div>
        {quizzes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 rounded-xl border border-white/8 bg-card/40">No quizzes yet</p>
        ) : (
          <div className="space-y-2">
            {quizzes.map((q) => (
              <QuizCard key={q.id} quiz={q} onEdit={() => setEditor({ quizId: q.id })} onDeleted={load} />
            ))}
          </div>
        )}
      </div>

      {showAddMaterial && <AddMaterialModal batchId={batchId} onClose={() => setShowAddMaterial(false)} onAdded={load} />}
      {editor && <QuizEditorModal batchId={batchId} quizId={editor.quizId} onClose={() => setEditor(null)} onSaved={load} />}
    </motion.div>
  );
}
