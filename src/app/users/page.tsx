'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Users, 
  Shield, 
  Lock, 
  Search, 
  MoreVertical, 
  UserPlus, 
  Settings, 
  Eye, 
  Trash2,
  CheckCircle2,
  History,
  Briefcase,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

const ROLES = [
  { id: 'SYS_ADMIN', name: 'System Admin', count: 2, color: 'text-primary bg-primary/10 border-primary/20' },
  { id: 'BM', name: 'Branch Manager', count: 12, color: 'text-violet bg-violet/10 border-violet/20' },
  { id: 'RM', name: 'Regional Manager', count: 8, color: 'text-info bg-info/10 border-info/20' },
  { id: 'FINANCE', name: 'Finance Admin', count: 4, color: 'text-success bg-success/10 border-success/20' },
];

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState('USERS');

  return (
    <AppShell>
      <div className="page-padding mx-auto max-w-[1600px] space-y-6 sm:space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-syne font-bold text-gradient tracking-tight">Identity & Access</h1>
            <p className="text-secondary-foreground text-sm mt-1">
              Manage enterprise roles, permissions, and administrative security.
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-secondary/50 p-1 rounded-xl border border-border">
            {['USERS', 'ROLES', 'AUDIT'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                  activeTab === tab ? "bg-primary text-white shadow-lg" : "text-secondary-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
           {/* Summary Stats */}
           <div className="xl:col-span-1 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                 {ROLES.map((role) => (
                   <Card key={role.id} className="p-4 hover:border-primary/30 transition-all cursor-pointer">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", role.color)}>
                               <Shield className="w-5 h-5" />
                            </div>
                            <div>
                               <h3 className="text-xs font-bold">{role.name}</h3>
                               <p className="text-[10px] text-secondary-foreground">{role.count} Active Accounts</p>
                            </div>
                         </div>
                         <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                   </Card>
                 ))}
              </div>

              <Card className="bg-primary text-white shadow-2xl shadow-primary/20 relative overflow-hidden">
                 <div className="absolute -right-4 -bottom-4 opacity-10">
                    <ShieldCheck className="w-32 h-32" />
                 </div>
                 <CardHeader>
                    <CardTitle className="text-white">Security Protocol</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <p className="text-xs text-white/70 leading-relaxed">Identity management is enforced via JWT (RS256) and RBAC middleware. Audit logs are immutable.</p>
                    <button className="mt-4 w-full py-2.5 bg-white text-primary rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition-colors">
                       View Compliance Report
                    </button>
                 </CardContent>
              </Card>
           </div>

           {/* Main Content Area */}
           <div className="xl:col-span-3 space-y-6">
              <AnimatePresence mode="wait">
                 {activeTab === 'USERS' && (
                   <motion.div
                     key="users"
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                   >
                      <Card>
                         <CardHeader>
                            <div className="flex items-center justify-between">
                               <div>
                                  <CardTitle>Administrative Personnel</CardTitle>
                                  <CardDescription>Accounts with access to the HomeGenny control panel.</CardDescription>
                               </div>
                               <button className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-xl shadow-primary/20 hover:bg-accent transition-all">
                                  <UserPlus className="w-4 h-4" />
                                  Provision Account
                               </button>
                            </div>
                         </CardHeader>
                         <CardContent>
                            <div className="relative mb-6">
                               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground" />
                               <input 
                                 type="text" 
                                 placeholder="Search by name, email or role..." 
                                 className="w-full bg-secondary/30 border border-border rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none"
                               />
                            </div>

                            <div className="overflow-x-auto">
                               <table className="w-full">
                                  <thead>
                                     <tr className="text-left border-b border-border">
                                        <th className="pb-4 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">User</th>
                                        <th className="pb-4 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">Access Role</th>
                                        <th className="pb-4 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">Status</th>
                                        <th className="pb-4 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground text-right">Actions</th>
                                     </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                     {[1, 2, 3, 4].map((i) => (
                                        <tr key={i} className="group hover:bg-white/5 transition-colors">
                                           <td className="py-4">
                                              <div className="flex items-center gap-3">
                                                 <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">JD</div>
                                                 <div>
                                                    <p className="text-xs font-bold">John Doe</p>
                                                    <p className="text-[10px] text-secondary-foreground">john.doe@homegenny.com</p>
                                                 </div>
                                              </div>
                                           </td>
                                           <td className="py-4">
                                              <Badge className="bg-secondary/50 border-border text-foreground text-[9px] uppercase tracking-tighter">
                                                 Branch Manager
                                              </Badge>
                                           </td>
                                           <td className="py-4">
                                              <div className="flex items-center gap-1.5">
                                                 <div className="w-1.5 h-1.5 rounded-full bg-success" />
                                                 <span className="text-[10px] font-bold uppercase text-secondary-foreground">Active</span>
                                              </div>
                                           </td>
                                           <td className="py-4 text-right">
                                              <div className="flex items-center justify-end gap-2">
                                                 <button className="p-2 rounded-lg hover:bg-secondary text-secondary-foreground transition-colors"><Settings className="w-4 h-4" /></button>
                                                 <button className="p-2 rounded-lg hover:bg-danger/10 text-danger transition-colors"><Trash2 className="w-4 h-4" /></button>
                                              </div>
                                           </td>
                                        </tr>
                                     ))}
                                  </tbody>
                               </table>
                            </div>
                         </CardContent>
                      </Card>
                   </motion.div>
                 )}

                 {activeTab === 'ROLES' && (
                    <motion.div
                      key="roles"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                       <Card>
                          <CardHeader>
                             <CardTitle>Permission Matrix</CardTitle>
                             <CardDescription>Configure granular access control for each role.</CardDescription>
                          </CardHeader>
                          <CardContent>
                             <div className="grid grid-cols-5 border border-border rounded-2xl overflow-hidden">
                                <div className="p-4 bg-secondary/50 border-r border-b border-border text-[10px] font-bold uppercase">Capability</div>
                                {['SYS', 'BM', 'RM', 'FIN'].map(r => (
                                  <div key={r} className="p-4 bg-secondary/30 border-r border-b border-border text-[10px] font-bold uppercase text-center">{r}</div>
                                ))}
                                
                                {[
                                  'Manage Branches', 'View Financials', 'Issue Agreements', 'Staff Intake', 'System Config'
                                ].map((cap) => (
                                  <React.Fragment key={cap}>
                                    <div className="p-4 border-r border-b border-border text-xs font-medium">{cap}</div>
                                    {[1, 2, 3, 4].map(i => (
                                      <div key={i} className="p-4 border-r border-b border-border flex items-center justify-center">
                                         <div className={cn(
                                           "w-5 h-5 rounded-md flex items-center justify-center border-2",
                                           i === 1 || i === 2 ? "bg-primary border-primary text-white" : "border-border"
                                         )}>
                                            {(i === 1 || i === 2) && <CheckCircle2 className="w-3.5 h-3.5" />}
                                         </div>
                                      </div>
                                    ))}
                                  </React.Fragment>
                                ))}
                             </div>
                          </CardContent>
                       </Card>
                    </motion.div>
                 )}

                 {activeTab === 'AUDIT' && (
                    <motion.div
                      key="audit"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                       <Card>
                          <CardHeader>
                             <CardTitle>Enterprise Audit Trail</CardTitle>
                             <CardDescription>Detailed logs of all administrative actions.</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                             {[1, 2, 3, 4, 5].map((i) => (
                               <div key={i} className="flex gap-4 p-4 rounded-2xl border border-border hover:bg-white/5 transition-all">
                                  <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0">
                                     <History className="w-5 h-5 text-secondary-foreground" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                     <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs font-bold">Admin <span className="text-primary">@satyam</span> updated permission matrix</p>
                                        <span className="text-[10px] text-muted-foreground">14 May, 12:42 PM</span>
                                     </div>
                                     <p className="text-[10px] text-secondary-foreground">Scope: ROLES_MANAGEMENT | Object: SYS_ADMIN | Action: UPDATE</p>
                                  </div>
                               </div>
                             ))}
                          </CardContent>
                       </Card>
                    </motion.div>
                 )}
              </AnimatePresence>
           </div>
        </div>
      </div>
    </AppShell>
  );
}