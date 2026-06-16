'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ChevronDown, CheckCircle2, Clock, XCircle, Download, Plus, PenLine } from 'lucide-react';

type AgreementStatus = 'pending' | 'sent' | 'signed' | 'rejected';
type Series = 'DR'|'SC'|'UC'|'M3X';

const STATUS_STYLE: Record<AgreementStatus,{cls:string;label:string;icon:string}> = {
  pending:  {cls:'bg-amber-500/15 text-amber-400 border-amber-500/30',   label:'Pending',  icon:'⏳'},
  sent:     {cls:'bg-sky-500/15 text-sky-400 border-sky-500/30',         label:'Sent',     icon:'📤'},
  signed:   {cls:'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label:'Signed', icon:'✅'},
  rejected: {cls:'bg-red-500/15 text-red-400 border-red-500/30',         label:'Rejected', icon:'❌'},
};
const SERIES_CLR: Record<Series,string> = {
  DR:'bg-amber-500/10 border-amber-500/20 text-amber-400',
  SC:'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  UC:'bg-sky-500/10 border-sky-500/20 text-sky-400',
  M3X:'bg-violet-500/10 border-violet-500/20 text-violet-400',
};
const SCENARIO: Record<Series,string> = {DR:'DR-15',SC:'SC-11',UC:'UC-08',M3X:'M3X-08'};

interface AgreementDoc {
  type: 'EOR'|'SOW'|'Indemnity';
  status: AgreementStatus;
  signedAt?: string;
  version: string;
}
interface AgreementRecord {
  id: string; staffCode: string; staffName: string; series: Series;
  clientName: string; scenario: string;
  docs: AgreementDoc[];
  overallStatus: AgreementStatus;
}

const AGREEMENTS: AgreementRecord[] = [
  { id:'a1', staffCode:'SC-010', staffName:'Sunita Devi',   series:'SC', clientName:'Sharma Family',    scenario:'SC-11',
    overallStatus:'signed',
    docs:[
      {type:'EOR',       status:'signed',  signedAt:'20 May 2026', version:'v1.2'},
      {type:'SOW',       status:'signed',  signedAt:'20 May 2026', version:'v1.0'},
      {type:'Indemnity', status:'signed',  signedAt:'20 May 2026', version:'v1.1'},
    ]},
  { id:'a2', staffCode:'DR-003', staffName:'Mohan Singh',   series:'DR', clientName:'Kapoor Household', scenario:'DR-15',
    overallStatus:'sent',
    docs:[
      {type:'EOR',       status:'signed',  signedAt:'19 May 2026', version:'v1.2'},
      {type:'SOW',       status:'sent',    version:'v1.0'},
      {type:'Indemnity', status:'pending', version:'v1.1'},
    ]},
  { id:'a3', staffCode:'UC-020', staffName:'Meena Kumari',  series:'UC', clientName:'Verma Residence',  scenario:'UC-08',
    overallStatus:'pending',
    docs:[
      {type:'EOR',       status:'pending', version:'v1.2'},
      {type:'SOW',       status:'pending', version:'v1.0'},
      {type:'Indemnity', status:'pending', version:'v1.1'},
    ]},
  { id:'a4', staffCode:'M3X-031', staffName:'Geeta Devi',   series:'M3X', clientName:'Gupta Family',   scenario:'M3X-08',
    overallStatus:'rejected',
    docs:[
      {type:'EOR',       status:'signed',  signedAt:'15 May 2026', version:'v1.2'},
      {type:'SOW',       status:'rejected',version:'v1.0'},
      {type:'Indemnity', status:'pending', version:'v1.1'},
    ]},
];

function DocStatusIcon({status}:{status:AgreementStatus}) {
  if (status==='signed')   return <CheckCircle2 className="w-4 h-4 text-emerald-400"/>;
  if (status==='sent')     return <Clock className="w-4 h-4 text-sky-400"/>;
  if (status==='rejected') return <XCircle className="w-4 h-4 text-red-400"/>;
  return <Clock className="w-4 h-4 text-muted-foreground"/>;
}

function AgreementCard({rec}:{rec:AgreementRecord}) {
  const [open,setOpen] = useState(rec.overallStatus==='sent'||rec.overallStatus==='pending');
  const st = STATUS_STYLE[rec.overallStatus];
  const signedCount = rec.docs.filter(d=>d.status==='signed').length;

  return (
    <div className="rounded-xl border border-white/8 bg-card/60 overflow-hidden">
      <button onClick={()=>setOpen(!open)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/3 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-[#FF5A1F]/10 border border-[#FF5A1F]/20 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-[#FF5A1F]"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{rec.staffName}</span>
            <span className="text-[10px] font-mono text-muted-foreground">{rec.staffCode}</span>
            <span className={`text-[9px] font-bold uppercase border rounded-full px-2 py-0.5 ${SERIES_CLR[rec.series]}`}>{rec.series}</span>
            <span className="text-[10px] font-mono text-[#FF5A1F]">{rec.scenario}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>📋 {rec.clientName}</span>
            <span>· {signedCount}/3 docs signed</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="flex-1 max-w-[120px] h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{width:`${(signedCount/3)*100}%`}}/>
            </div>
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-0.5 ${st.cls}`}>{st.icon} {st.label}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground ml-1 transition-transform ${open?'rotate-180':''}`}/>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.25}} className="overflow-hidden border-t border-white/6">
            <div className="px-5 py-4 space-y-4">
              {/* Documents table */}
              <div className="space-y-2">
                {rec.docs.map(doc=>{
                  const ds = STATUS_STYLE[doc.status];
                  return (
                    <div key={doc.type} className="flex items-center gap-4 p-3 rounded-lg border border-white/8 bg-white/3">
                      <DocStatusIcon status={doc.status}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {doc.type === 'EOR' ? 'Employment on Record (EOR)' : doc.type === 'SOW' ? 'Scope of Work (SOW)' : 'Client Indemnity'}
                        </p>
                        <p className="text-xs text-muted-foreground">{doc.version}{doc.signedAt ? ` · Signed ${doc.signedAt}` : ''}</p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5 ${ds.cls}`}>{ds.label}</span>
                      {doc.status==='signed' && <button className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"><Download className="w-3.5 h-3.5"/></button>}
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {rec.overallStatus !== 'signed' && (
                  <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#FF5A1F] text-white hover:bg-[#e04d17] transition-colors">
                    <PenLine className="w-3.5 h-3.5"/>Generate & Send for eSign
                  </button>
                )}
                <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border border-white/15 bg-white/5 text-foreground hover:bg-white/10 transition-colors">
                  <Download className="w-3.5 h-3.5"/>Download All PDFs
                </button>
                <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border border-white/15 bg-white/5 text-foreground hover:bg-white/10 transition-colors">
                  Build SOW
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AgreementsPage() {
  const signed  = AGREEMENTS.filter(a=>a.overallStatus==='signed').length;
  const pending = AGREEMENTS.filter(a=>a.overallStatus==='pending'||a.overallStatus==='sent').length;

  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Agreements Module</h1>
          <p className="text-sm text-muted-foreground mt-1">S4 · EOR · SOW · Client Indemnity · eSign</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5A1F] text-white text-sm font-bold hover:bg-[#e04d17] transition-colors">
          <Plus className="w-4 h-4"/>New Agreement
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:'Fully Signed', val:signed,  cls:'text-emerald-400'},
          {label:'Pending',      val:pending, cls:'text-amber-400'},
          {label:'Rejected',     val:AGREEMENTS.filter(a=>a.overallStatus==='rejected').length, cls:'text-red-400'},
          {label:'Total',        val:AGREEMENTS.length, cls:'text-foreground'},
        ].map(s=>(
          <div key={s.label} className="p-4 rounded-xl border border-white/8 bg-card/40">
            <p className={`text-2xl font-bold ${s.cls}`}>{s.val}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl border border-white/8 bg-white/3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Agreement Suite</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
          {[
            {title:'EOR Agreement',  desc:'Employment on Record — staff terms, compensation, conduct clauses'},
            {title:'Scope of Work',  desc:'Duties, shift timing, residential/non-residential, excluded tasks'},
            {title:'Client Indemnity', desc:'Client liability waiver, dispute resolution, insurance clauses'},
          ].map(d=>(
            <div key={d.title} className="p-3 rounded-lg bg-white/3 border border-white/8">
              <p className="font-semibold text-foreground mb-1">{d.title}</p>
              <p>{d.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {AGREEMENTS.map(a=><AgreementCard key={a.id} rec={a}/>)}
      </div>
    </motion.div>
  );
}
