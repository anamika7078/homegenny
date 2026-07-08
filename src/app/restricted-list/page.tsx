'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldAlert, 
  UserX, 
  Search, 
  Filter, 
  MoreVertical, 
  AlertTriangle, 
  FileText, 
  History, 
  Scale,
  Ban,
  Building2,
  Lock,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

const RESTRICTED_MOCK = [
  { id: 'RL-102', entity: 'Staff', name: 'Ramesh Kumar', reason: 'Repeated absence without notice (Series: DR)', date: '10 May 2024', severity: 'CRITICAL' },
  { id: 'RL-105', entity: 'Client', name: 'Skyline Apartments', reason: 'Unpaid invoices > 90 days', date: '12 May 2024', severity: 'HIGH' },
  { id: 'RL-109', entity: 'Staff', name: 'Suman Devi', reason: 'Theft report (Police complaint filed)', date: '14 May 2024', severity: 'CRITICAL' },
];

export default function RestrictedListPage() {
  const [activeType, setActiveType] = useState('ALL');

  return (
    <AppShell>
      <div className="page-padding mx-auto max-w-[1600px] space-y-6 sm:space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-syne font-bold text-gradient tracking-tight">Restricted Registry</h1>
            <p className="text-secondary-foreground text-sm mt-1">
              Banned staff and blacklisted clients across all HomeGenny branches.
            </p>
          </div>
          
          <div className="min-w-0">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="inline-flex items-center gap-2 whitespace-nowrap bg-secondary/50 p-1 rounded-xl border border-border">
                {['ALL', 'STAFF', 'CLIENTS'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveType(t)}
                    className={cn(
                      "px-3 sm:px-6 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all",
                      activeType === t ? "bg-danger text-white shadow-lg" : "text-secondary-foreground hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
           {/* List of Restrictions */}
           <div className="xl:col-span-2 space-y-4">
              <div className="relative mb-6">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground" />
                 <input 
                   type="text" 
                   placeholder="Search by name, ID or reason..." 
                   className="w-full bg-secondary/30 border border-border rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-danger/30 transition-all"
                 />
              </div>

              <div className="space-y-4">
                 {RESTRICTED_MOCK.map((item, idx) => (
                   <motion.div
                     key={item.id}
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: idx * 0.1 }}
                     className="glass-card p-5 rounded-2xl border-l-4 border-l-danger hover:bg-white/5 transition-all group"
                   >
                      <div className="flex items-start gap-4">
                         <div className={cn(
                           "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
                           item.entity === 'Staff' ? "bg-danger/10 text-danger border-danger/20" : "bg-warning/10 text-warning border-warning/20"
                         )}>
                            {item.entity === 'Staff' ? <UserX className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                         </div>
                         <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                               <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] font-bold text-danger">{item.id} Protocol</span>
                                  <span className="w-1 h-1 rounded-full bg-border" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-secondary-foreground">{item.entity} Registry</span>
                               </div>
                               <Badge className="bg-danger text-white text-[9px] font-bold">{item.severity}</Badge>
                            </div>
                            <h3 className="text-base font-bold font-syne group-hover:text-danger transition-colors">{item.name}</h3>
                            <p className="text-xs text-secondary-foreground mt-1 line-clamp-1">{item.reason}</p>
                            <p className="text-[10px] text-muted-foreground mt-2">Banned on: {item.date}</p>
                         </div>
                         <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <MoreVertical className="w-4 h-4 text-secondary-foreground" />
                         </button>
                      </div>
                   </motion.div>
                 ))}
              </div>
           </div>

           {/* Policy & Controls */}
           <div className="space-y-6">
              <Card className="border-danger/20 bg-danger/5">
                 <CardHeader>
                    <div className="flex items-center gap-2 text-danger">
                       <ShieldAlert className="w-5 h-5" />
                       <CardTitle className="text-danger">Enforcement Policy</CardTitle>
                    </div>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <p className="text-xs text-danger/80 leading-relaxed font-medium">Restricted list entries are synchronized across all 42 branches in real-time. System blocks automated intake if Aadhaar or Phone matches a banned record.</p>
                    <div className="space-y-2">
                       <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-danger" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Aadhaar Lock ACTIVE</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-danger" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Phone Hash Match ACTIVE</span>
                       </div>
                    </div>
                 </CardContent>
              </Card>

              <Card>
                 <CardHeader>
                    <CardTitle>Appeal Workflow</CardTitle>
                    <CardDescription>Legal and compliance review requests.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border flex items-center justify-between group cursor-pointer hover:border-primary/30 transition-all">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                             <Scale className="w-4 h-4 text-secondary-foreground" />
                          </div>
                          <div>
                             <p className="text-xs font-bold">Pending Appeals</p>
                             <p className="text-[10px] text-muted-foreground">3 reviews scheduled</p>
                          </div>
                       </div>
                       <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>

                    <button className="w-full py-3 bg-secondary border border-border text-xs font-bold rounded-xl hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                       <FileText className="w-3.5 h-3.5" />
                       Generate Conflict Report
                    </button>
                 </CardContent>
              </Card>

              <div className="p-6 rounded-3xl bg-danger text-white shadow-2xl shadow-danger/20 relative overflow-hidden group">
                 <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Ban className="w-32 h-32" />
                 </div>
                 <h3 className="font-syne font-bold text-lg relative z-10">Add Restriction</h3>
                 <p className="text-white/70 text-xs mt-1 relative z-10">Only Regional Managers can ban entities.</p>
                 <button className="mt-6 w-full py-2.5 bg-white text-danger rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition-colors relative z-10">
                    Initiate Ban Protocol
                 </button>
              </div>
           </div>
        </div>
      </div>
    </AppShell>
  );
}
