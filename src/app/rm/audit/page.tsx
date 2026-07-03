'use client';
import { useState, Fragment } from 'react';
import { motion } from 'framer-motion';
import { Shield, Search, Download } from 'lucide-react';

type EventType = 'stage_transition' | 'verification' | 'login' | 'document' | 'system' | 'approval';

const TYPE_STYLE: Record<EventType,{cls:string;label:string;icon:string}> = {
  stage_transition: {cls:'bg-[#FF5A1F]/10 text-[#FF5A1F] border-[#FF5A1F]/20',   label:'Stage Transition', icon:'🔄'},
  verification:     {cls:'bg-sky-500/10 text-sky-400 border-sky-500/20',           label:'Verification',     icon:'✅'},
  login:            {cls:'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',label:'Login',           icon:'🔐'},
  document:         {cls:'bg-violet-500/10 text-violet-400 border-violet-500/20',  label:'Document',         icon:'📄'},
  system:           {cls:'bg-slate-500/10 text-slate-400 border-slate-500/20',     label:'System',           icon:'⚙️'},
  approval:         {cls:'bg-amber-500/10 text-amber-400 border-amber-500/20',     label:'Approval',         icon:'👍'},
};

interface AuditLog {
  id: string; timestamp: string; actor: string; actorRole: string;
  eventType: EventType; action: string; target: string;
  reason?: string; ip: string; payload?: string;
}

const LOGS: AuditLog[] = [
  {id:'l1', timestamp:'22 May 2026, 14:21:05', actor:'Pooja Mishra', actorRole:'RM', eventType:'stage_transition', action:'S2 → S3 (Training)', target:'SC-010 Sunita Devi', reason:'All verifications cleared', ip:'192.168.1.42', payload:'{"from":"S2","to":"S3","scenario":"SC-10"}'},
  {id:'l2', timestamp:'22 May 2026, 14:05:33', actor:'Pooja Mishra', actorRole:'RM', eventType:'verification',     action:'Aadhaar eKYC Approved', target:'DR-003 Mohan Singh', ip:'192.168.1.42'},
  {id:'l3', timestamp:'22 May 2026, 13:48:17', actor:'Pooja Mishra', actorRole:'RM', eventType:'document',         action:'SOW Agreement Generated', target:'DR-003 / Kapoor Household', ip:'192.168.1.42'},
  {id:'l4', timestamp:'22 May 2026, 13:30:00', actor:'Pooja Mishra', actorRole:'RM', eventType:'login',            action:'User Login', target:'Session #9823', ip:'192.168.1.42'},
  {id:'l5', timestamp:'22 May 2026, 12:10:44', actor:'Pooja Mishra', actorRole:'RM', eventType:'approval',         action:'Video Cert Approved', target:'UC-020 Meena Kumari', ip:'192.168.1.42'},
  {id:'l6', timestamp:'22 May 2026, 11:55:02', actor:'Pooja Mishra', actorRole:'RM', eventType:'stage_transition', action:'S2.5 → Deferred (DR-08)', target:'DR-004 Deepak Chauhan', reason:'2nd assessment fail — 14-day retry', ip:'192.168.1.42', payload:'{"from":"S2.5","to":"deferred","attempt":2}'},
  {id:'l7', timestamp:'22 May 2026, 11:20:15', actor:'Pooja Mishra', actorRole:'RM', eventType:'document',         action:'Police Verification Doc Uploaded', target:'SC-011 Kavita Singh', ip:'192.168.1.42'},
  {id:'l8', timestamp:'22 May 2026, 10:45:30', actor:'System',       actorRole:'SYSTEM', eventType:'system',      action:'Auto-deferred: PV timeout 30 days', target:'DR-005 Vijay Prasad', ip:'127.0.0.1', payload:'{"reason":"PV_TIMEOUT","daysElapsed":30}'},
  {id:'l9', timestamp:'22 May 2026, 10:00:00', actor:'Pooja Mishra', actorRole:'RM', eventType:'stage_transition', action:'S1 → S2 (Verification)', target:'M3X-030 Pooja Sharma', reason:'Intake complete, deposit collected', ip:'192.168.1.42', payload:'{"from":"S1","to":"S2","scenario":"M3X-04"}'},
  {id:'l10',timestamp:'21 May 2026, 17:30:00', actor:'Pooja Mishra', actorRole:'RM', eventType:'approval',         action:'Trial Placement Confirmed', target:'UC-020 Meena Kumari → Verma Residence', ip:'192.168.1.42'},
];

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<string|null>(null);

  const filtered = LOGS.filter(l => {
    const matchType = typeFilter === 'all' || l.eventType === typeFilter;
    const matchSearch = !search || [l.actor,l.action,l.target,l.id].some(f=>f.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchSearch;
  });

  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="page-padding max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Immutable event trail · All FSM transitions recorded</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-sm font-bold text-foreground hover:bg-white/10 transition-colors">
          <Download className="w-4 h-4"/>Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:'Stage Transitions',val:LOGS.filter(l=>l.eventType==='stage_transition').length,cls:'text-[#FF5A1F]'},
          {label:'Verifications',val:LOGS.filter(l=>l.eventType==='verification').length,cls:'text-sky-400'},
          {label:'Documents',val:LOGS.filter(l=>l.eventType==='document').length,cls:'text-violet-400'},
          {label:'Total Events',val:LOGS.length,cls:'text-foreground'},
        ].map(s=>(
          <div key={s.label} className="p-4 rounded-xl border border-white/8 bg-card/40">
            <p className={`text-2xl font-bold ${s.cls}`}>{s.val}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-white/10 bg-white/5">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search actor, action, target..."
            className="bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none flex-1"/>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/8">
          {['all','stage_transition','verification','document','approval','login','system'].map(f=>(
            <button key={f} onClick={()=>setTypeFilter(f)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wide transition-all ${typeFilter===f?'bg-[#FF5A1F] text-white':'text-muted-foreground hover:text-foreground'}`}>
              {f==='all'?'All':f.replace('_',' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Log table */}
      <div className="rounded-xl border border-white/8 bg-card/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Timestamp</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Actor</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">Target</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log=>{
                const ts = TYPE_STYLE[log.eventType];
                const isOpen = expanded === log.id;
                return (
                  <Fragment key={log.id}>
                    <tr onClick={()=>setExpanded(isOpen?null:log.id)}
                      className="border-b border-white/5 hover:bg-white/3 cursor-pointer transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{log.timestamp}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5 ${ts.cls}`}>
                          {ts.icon} {ts.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{log.actor}</p>
                        <p className="text-muted-foreground">{log.actorRole}</p>
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium">{log.action}</td>
                      <td className="px-4 py-3 text-muted-foreground">{log.target}</td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{log.ip}</td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-white/5 bg-white/2">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="space-y-2">
                            {log.reason && <p className="text-xs text-muted-foreground">Reason: <span className="text-foreground">{log.reason}</span></p>}
                            {log.payload && (
                              <div className="p-2 rounded-lg bg-black/30 font-mono text-[11px] text-emerald-400">
                                payload: {log.payload}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length===0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No audit logs match your filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground text-center pb-4">
        All events are immutable · actor_id, timestamp, reason_code, and payload snapshot recorded per FSM rule
      </p>
    </motion.div>
  );
}
