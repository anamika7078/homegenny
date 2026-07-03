'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Play, Check, X, AlertTriangle, ShieldCheck, RotateCcw } from 'lucide-react';

type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

interface VideoEntry {
  id: string; staffCode: string; name: string; series: string;
  attempt: number; maxAttempts: number; duration: string;
  uploadedAt: string; status: ReviewStatus; hash: string;
  hashVerified: boolean; scenario: string;
}

const STATUS_STYLE: Record<ReviewStatus, { cls: string; label: string }> = {
  pending:  { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30',   label: 'Pending Review' },
  approved: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Approved' },
  rejected: { cls: 'bg-red-500/15 text-red-400 border-red-500/30',         label: 'Rejected' },
  flagged:  { cls: 'bg-violet-500/15 text-violet-400 border-violet-500/30', label: 'Flagged' },
};

const SERIES_CLR: Record<string,string> = {
  DR:'bg-amber-500/10 border-amber-500/20 text-amber-400',
  SC:'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  UC:'bg-sky-500/10 border-sky-500/20 text-sky-400',
  M3X:'bg-violet-500/10 border-violet-500/20 text-violet-400',
};

const MOCK: VideoEntry[] = [
  { id:'v1', staffCode:'SC-010', name:'Sunita Devi',    series:'SC',  attempt:1, maxAttempts:3, duration:'4:32', uploadedAt:'21 May, 10:15 AM', status:'pending',  hash:'a3f7b2c9...', hashVerified:true,  scenario:'SC-10' },
  { id:'v2', staffCode:'DR-002', name:'Suresh Yadav',   series:'DR',  attempt:2, maxAttempts:3, duration:'3:47', uploadedAt:'20 May, 3:40 PM',  status:'pending',  hash:'d8e1a4f5...', hashVerified:true,  scenario:'DR-14' },
  { id:'v3', staffCode:'UC-021', name:'Asha Rani',      series:'UC',  attempt:1, maxAttempts:3, duration:'5:10', uploadedAt:'19 May, 9:00 AM',  status:'approved', hash:'b2c3d9e1...', hashVerified:true,  scenario:'UC-07' },
  { id:'v4', staffCode:'M3X-030',name:'Pooja Sharma',   series:'M3X', attempt:1, maxAttempts:3, duration:'2:55', uploadedAt:'18 May, 2:20 PM',  status:'rejected', hash:'f4a9b7c2...', hashVerified:true,  scenario:'M3X-07' },
  { id:'v5', staffCode:'DR-004', name:'Deepak Chauhan', series:'DR',  attempt:3, maxAttempts:3, duration:'4:01', uploadedAt:'17 May, 11:00 AM', status:'flagged',  hash:'c1d2e3f4...', hashVerified:false, scenario:'DR-14' },
];

function VideoCard({ entry, onAction }: { entry: VideoEntry; onAction: (id: string, action: 'approve'|'reject'|'flag'|'re-record') => void }) {
  const [open, setOpen] = useState(entry.status === 'pending');
  const st = STATUS_STYLE[entry.status];

  return (
    <div className="rounded-xl border border-white/8 bg-card/60 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/3 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center flex-shrink-0">
          <Video className="w-5 h-5 text-[#FF5A1F]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{entry.name}</span>
            <span className="text-[10px] font-mono text-muted-foreground">{entry.staffCode}</span>
            <span className={`text-[9px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 ${SERIES_CLR[entry.series]}`}>{entry.series}</span>
            <span className="text-[10px] font-mono text-[#FF5A1F]">{entry.scenario}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>Attempt {entry.attempt}/{entry.maxAttempts}</span>
            <span>{entry.duration}</span>
            <span>{entry.uploadedAt}</span>
            {entry.hashVerified
              ? <span className="flex items-center gap-1 text-emerald-400"><ShieldCheck className="w-3 h-3"/>Hash OK</span>
              : <span className="flex items-center gap-1 text-red-400"><AlertTriangle className="w-3 h-3"/>Hash FAIL</span>
            }
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.25}} className="overflow-hidden border-t border-white/6">
            <div className="px-5 py-4 space-y-4">
              {/* Video player placeholder */}
              <div className="relative rounded-xl overflow-hidden bg-black/60 border border-white/10 aspect-video flex items-center justify-center">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-[#FF5A1F]/20 border border-[#FF5A1F]/30 flex items-center justify-center mx-auto mb-2">
                    <Play className="w-6 h-6 text-[#FF5A1F] ml-1" />
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.name} — Certification Video</p>
                  <p className="text-xs text-muted-foreground mt-1">{entry.duration} · {entry.uploadedAt}</p>
                </div>
                {!entry.hashVerified && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400"/>
                    <span className="text-xs font-bold text-red-400">Integrity Hash MISMATCH</span>
                  </div>
                )}
              </div>

              {/* Hash */}
              <div className="p-3 rounded-lg bg-white/3 border border-white/8 font-mono text-xs text-muted-foreground">
                SHA-256: {entry.hash}<span className="opacity-40">d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3</span>
              </div>

              {/* Attempt counter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Attempts:</span>
                {Array.from({length:entry.maxAttempts},(_,i)=>(
                  <div key={i} className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                    i<entry.attempt ? 'bg-[#FF5A1F]/20 border-[#FF5A1F]/40 text-[#FF5A1F]' : 'bg-white/5 border-white/15 text-muted-foreground'
                  }`}>{i+1}</div>
                ))}
                {entry.attempt >= entry.maxAttempts && <span className="text-xs text-red-400 font-bold">Max attempts reached</span>}
              </div>

              {/* Actions */}
              {entry.status === 'pending' && (
                <div className="flex flex-wrap gap-2">
                  <button onClick={()=>onAction(entry.id,'approve')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                    <Check className="w-3.5 h-3.5"/>Approve
                  </button>
                  <button onClick={()=>onAction(entry.id,'reject')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors">
                    <X className="w-3.5 h-3.5"/>Reject
                  </button>
                  <button onClick={()=>onAction(entry.id,'flag')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-400 hover:bg-violet-500/30 transition-colors">
                    <AlertTriangle className="w-3.5 h-3.5"/>Flag Suspicious
                  </button>
                  {entry.attempt < entry.maxAttempts && (
                    <button onClick={()=>onAction(entry.id,'re-record')} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border border-white/15 bg-white/5 text-foreground hover:bg-white/10 transition-colors">
                      <RotateCcw className="w-3.5 h-3.5"/>Request Re-record
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VideoQueuePage() {
  const [entries, setEntries] = useState(MOCK);
  const [filter, setFilter] = useState('all');

  const handleAction = (id: string, action: 'approve'|'reject'|'flag'|'re-record') => {
    setEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      if (action === 'approve') return { ...e, status: 'approved' as ReviewStatus };
      if (action === 'reject')  return { ...e, status: 'rejected' as ReviewStatus };
      if (action === 'flag')    return { ...e, status: 'flagged' as ReviewStatus };
      return e;
    }));
  };

  const filtered = filter === 'all' ? entries : entries.filter(e => e.status === filter);
  const pending  = entries.filter(e => e.status === 'pending').length;

  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="page-padding max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Video Certification Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Review · Approve · Flag suspicious recordings</p>
        </div>
        {pending > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>
            <span className="text-sm font-bold text-amber-400">{pending} pending review</span>
          </div>
        )}
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/8 w-fit">
        {['all','pending','approved','rejected','flagged'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${filter===f ? 'bg-[#FF5A1F] text-white shadow' : 'text-muted-foreground hover:text-foreground'}`}>
            {f === 'all' ? `All (${entries.length})` : `${f} (${entries.filter(e=>e.status===f).length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(e => <VideoCard key={e.id} entry={e} onAction={handleAction}/>)}
        {filtered.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No videos in this category.</p>}
      </div>

      <p className="text-[11px] text-muted-foreground text-center pb-4">
        Max 3 attempts per staff · SHA-256 hash integrity verified on upload · Flagged videos escalated to BM
      </p>
    </motion.div>
  );
}
