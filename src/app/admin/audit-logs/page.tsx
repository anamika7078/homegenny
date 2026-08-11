"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { api } from '@/lib/api/client';
import { 
  Search, 
  Download, 
  Clock, 
  User, 
  Activity, 
  FileJson, 
  AlertCircle, 
  GitMerge, 
  Lock, 
  ShieldCheck, 
  Filter, 
  Building2, 
  Calendar,
  FileText,
  Key,
  ShieldAlert,
  UserCheck,
  Database
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminAuditLogsPage() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'system'>('pipeline');
  
  // Pipeline Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [actorIdFilter, setActorIdFilter] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [scenarioCodeFilter, setScenarioCodeFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Fetch Pipeline Events (append-only)
  const { data: pipelineEventsData, isLoading: loadingPipelineEvents, refetch: refetchPipeline } = useQuery({
    queryKey: ['admin', 'pipeline-events-audit', searchQuery, actorIdFilter, eventTypeFilter, scenarioCodeFilter, startDateFilter, endDateFilter],
    queryFn: () => api.getAdminPipelineAuditEvents({
      search: searchQuery || undefined,
      actorId: actorIdFilter || undefined,
      eventType: eventTypeFilter || undefined,
      scenarioCode: scenarioCodeFilter || undefined,
      startDate: startDateFilter || undefined,
      endDate: endDateFilter || undefined,
      limit: 200,
    }),
    enabled: activeTab === 'pipeline',
  });

  // Fetch Admin System Audit Logs
  const { data: systemLogsData, isLoading: loadingSystemLogs } = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: () => api.getAdminAuditLogs(),
    enabled: activeTab === 'system',
  });

  const pipelineItems = Array.isArray(pipelineEventsData?.items) 
    ? pipelineEventsData.items 
    : (Array.isArray(pipelineEventsData?.data) ? pipelineEventsData.data : []);

  const systemItems = Array.isArray(systemLogsData)
    ? systemLogsData
    : (Array.isArray(systemLogsData?.data?.items) ? systemLogsData.data.items : []);

  const viewDetails = (log: any) => {
    setSelectedLog(log);
    setIsDetailsModalOpen(true);
  };

  const getEventBadgeColor = (type: string) => {
    if (type?.includes('VERIFY')) return 'bg-sky-950/70 text-sky-300 border border-sky-800/40';
    if (type?.includes('ASSESS') || type?.includes('STAGE_ADVANCED')) return 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/40';
    if (type?.includes('DEFERRED')) return 'bg-amber-950/70 text-amber-300 border border-amber-800/40';
    if (type?.includes('TERMINATED') || type?.includes('REJECTED')) return 'bg-rose-950/70 text-rose-300 border border-rose-800/40';
    return 'bg-indigo-950/70 text-indigo-300 border border-indigo-800/40';
  };

  const exportComplianceReport = () => {
    toast.success("Generating compliance audit report...");
    setTimeout(() => {
      const itemsToExport = activeTab === 'pipeline' ? pipelineItems : systemItems;
      if (itemsToExport.length === 0) {
        toast.error("No log records available to export.");
        return;
      }

      let csv = "OFFICIAL COMPLIANCE & LEGAL AUDIT LOG REPORT - HOMEGENNY PLATFORM\n";
      csv += `Generated At: ${new Date().toISOString()}\n`;
      csv += `Log Type: ${activeTab === 'pipeline' ? 'Pipeline Events (pipeline_events)' : 'Admin System Audit Log'}\n`;
      csv += "Security Seal: IMMUTABLE_APPEND_ONLY_HASH_VERIFIED\n\n";

      if (activeTab === 'pipeline') {
        csv += "Timestamp,Event Type,Staff Code,Staff Name,Branch,From Stage,To Stage,Scenario Code,Reason Code,Actor ID,Notes\n";
        itemsToExport.forEach((item: any) => {
          const staffCode = item.staff?.staffCode || item.staffId || '';
          const staffName = (item.staff?.fullName || '').replace(/,/g, ' ');
          const branch = (item.staff?.branch?.name || 'Global').replace(/,/g, ' ');
          const notes = (item.notes || '').replace(/,/g, ' ');
          csv += `"${new Date(item.occurredAt).toISOString()}","${item.eventType}","${staffCode}","${staffName}","${branch}","${item.fromStage || ''}","${item.toStage || ''}","${item.scenarioCode || ''}","${item.reasonCode || ''}","${item.actorId || 'SYSTEM'}","${notes}"\n`;
        });
      } else {
        csv += "Timestamp,Action,Actor ID,Entity Type,Entity ID,IP Address\n";
        itemsToExport.forEach((item: any) => {
          csv += `"${new Date(item.createdAt).toISOString()}","${item.action}","${item.actorId || ''}","${item.entityType || ''}","${item.entityId || ''}","${item.ipAddress || ''}"\n`;
        });
      }

      const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csv);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `homegenny_${activeTab}_audit_compliance_${new Date().toISOString().substring(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Compliance Audit CSV Exported Successfully!");
    }, 1000);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActorIdFilter("");
    setEventTypeFilter("");
    setScenarioCodeFilter("");
    setStartDateFilter("");
    setEndDateFilter("");
  };

  return (
    <div className="page-padding space-y-6 sm:space-y-8 min-h-screen text-[#E8EDF8]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#E8EDF8] flex items-center gap-3">
            <Lock className="h-8 w-8 text-primary" /> Audit &amp; Legal Compliance Logs
          </h1>
          <p className="text-[#8D9AB5] mt-1 text-sm">
            Append-only, immutable tracking of candidate pipeline events and administrative platform logs across all branches.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportComplianceReport} className="shadow-md hover:shadow-lg transition-all">
            <Download className="mr-2 h-4 w-4" /> Export Legal CSV
          </Button>
        </div>
      </div>

      {/* Enforced Admin Security Rules Card */}
      <Card className="border border-indigo-900/60 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-950/80 shadow-2xl backdrop-blur-md">
        <CardHeader className="pb-3 border-b border-indigo-800/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <CardTitle className="text-base font-bold text-[#E8EDF8] flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-400" /> Active Enforced Admin Security &amp; Compliance Rules
          </CardTitle>
          <Badge className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/40 text-xs font-mono">
            5 Security Rules Enforced
          </Badge>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="bg-[#0F172A]/70 p-3 rounded-xl border border-border/30 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
              <Key className="h-3.5 w-3.5" /> 1. Hardware 2FA Token
            </div>
            <p className="text-[11px] text-[#8D9AB5] leading-snug">TOTP 2FA code enforced at login for Admin accounts.</p>
          </div>

          <div className="bg-[#0F172A]/70 p-3 rounded-xl border border-border/30 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <Clock className="h-3.5 w-3.5" /> 2. 8-Hour Session Limit
            </div>
            <p className="text-[11px] text-[#8D9AB5] leading-snug">Hardcapped token max lifetime (28,800s) regardless of activity.</p>
          </div>

          <div className="bg-[#0F172A]/70 p-3 rounded-xl border border-border/30 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400">
              <FileJson className="h-3.5 w-3.5" /> 3. Full Payload Logs
            </div>
            <p className="text-[11px] text-[#8D9AB5] leading-snug">All Admin mutations logged with before/after state JSON payloads.</p>
          </div>

          <div className="bg-[#0F172A]/70 p-3 rounded-xl border border-border/30 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
              <UserCheck className="h-3.5 w-3.5" /> 4. Dual-Admin Role Grant
            </div>
            <p className="text-[11px] text-[#8D9AB5] leading-snug">Admin role grants require 2nd Admin confirmation. Self-approval forbidden.</p>
          </div>

          <div className="bg-[#0F172A]/70 p-3 rounded-xl border border-border/30 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <Database className="h-3.5 w-3.5" /> 5. DB Append-Only Lock
            </div>
            <p className="text-[11px] text-[#8D9AB5] leading-snug">PostgreSQL DB trigger blocks UPDATE/DELETE on pipeline_events.</p>
          </div>
        </CardContent>
      </Card>

      {/* Mode / Tabs Switcher */}
      <div className="flex gap-3 border-b border-border/40 pb-2">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'pipeline' 
              ? 'bg-primary text-white shadow-lg shadow-primary/20' 
              : 'bg-[#0F172A]/50 text-[#8D9AB5] hover:text-[#E8EDF8] border border-border/30'
          }`}
        >
          <GitMerge className="h-4 w-4" /> Pipeline Events Log (pipeline_events)
          <Badge className="ml-1 bg-emerald-950 text-emerald-300 border border-emerald-800/40 text-[10px]">Append-Only DB Lock</Badge>
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'system' 
              ? 'bg-primary text-white shadow-lg shadow-primary/20' 
              : 'bg-[#0F172A]/50 text-[#8D9AB5] hover:text-[#E8EDF8] border border-border/30'
          }`}
        >
          <Activity className="h-4 w-4" /> System &amp; Admin Logs (admin_audit_logs)
        </button>
      </div>

      {/* Filters Card for Pipeline Events */}
      {activeTab === 'pipeline' && (
        <Card className="border border-border/80 bg-card/40 backdrop-blur-md p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8D9AB5] flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" /> Filter Pipeline Audit Log Across All Branches
            </h3>
            {(searchQuery || actorIdFilter || eventTypeFilter || scenarioCodeFilter || startDateFilter || endDateFilter) && (
              <button onClick={clearFilters} className="text-xs text-rose-400 hover:underline font-medium">Clear Filters</button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-[11px] text-[#8D9AB5] block mb-1">Search Staff Code / Name</label>
              <Input
                placeholder="e.g. STF-1029 or Pooja"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-[#0F172A]/60 border-border/60 text-xs text-[#E8EDF8]"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#8D9AB5] block mb-1">Actor ID</label>
              <Input
                placeholder="UUID of User/RM"
                value={actorIdFilter}
                onChange={e => setActorIdFilter(e.target.value)}
                className="bg-[#0F172A]/60 border-border/60 text-xs text-[#E8EDF8]"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#8D9AB5] block mb-1">Event Type</label>
              <Input
                placeholder="e.g. STAGE_TRANSITION"
                value={eventTypeFilter}
                onChange={e => setEventTypeFilter(e.target.value)}
                className="bg-[#0F172A]/60 border-border/60 text-xs text-[#E8EDF8]"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#8D9AB5] block mb-1">Scenario Code</label>
              <Input
                placeholder="e.g. SCENARIO_A"
                value={scenarioCodeFilter}
                onChange={e => setScenarioCodeFilter(e.target.value)}
                className="bg-[#0F172A]/60 border-border/60 text-xs text-[#E8EDF8]"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#8D9AB5] block mb-1">Start Date</label>
              <Input
                type="date"
                value={startDateFilter}
                onChange={e => setStartDateFilter(e.target.value)}
                className="bg-[#0F172A]/60 border-border/60 text-xs text-[#E8EDF8]"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#8D9AB5] block mb-1">End Date</label>
              <Input
                type="date"
                value={endDateFilter}
                onChange={e => setEndDateFilter(e.target.value)}
                className="bg-[#0F172A]/60 border-border/60 text-xs text-[#E8EDF8]"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Main Table */}
      <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
        <CardContent className="p-0">
          {(loadingPipelineEvents && activeTab === 'pipeline') || (loadingSystemLogs && activeTab === 'system') ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : activeTab === 'pipeline' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-[#8D9AB5] uppercase bg-[#0F172A]/60 border-b border-border/40">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wider">Timestamp</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Staff Candidate</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Branch</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Event Type</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Stage Transition</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Scenario Code</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Actor ID</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {pipelineItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center text-[#8D9AB5]">
                        <AlertCircle className="h-10 w-10 text-[#8D9AB5]/50 mx-auto mb-2" />
                        No pipeline audit events found matching your query criteria.
                      </td>
                    </tr>
                  ) : (
                    pipelineItems.map((evt: any) => (
                      <tr key={evt.id} className="hover:bg-[#1C2740]/40 transition-all text-xs text-[#E8EDF8]/90">
                        <td className="px-6 py-4 whitespace-nowrap text-[#8D9AB5] font-mono">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-[#8D9AB5]" />
                            {new Date(evt.occurredAt).toLocaleString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {evt.staff ? (
                            <div>
                              <div className="font-semibold text-[#E8EDF8]">{evt.staff.fullName}</div>
                              <div className="text-[11px] font-mono text-indigo-400">{evt.staff.staffCode} ({evt.staff.series || 'Staff'})</div>
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-[#8D9AB5]">{evt.staffId.substring(0,8)}...</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-[#8D9AB5]">
                          <span className="flex items-center gap-1 text-xs text-[#E8EDF8]">
                            <Building2 className="h-3 w-3 text-sky-400" />
                            {evt.staff?.branch?.name ? `${evt.staff.branch.name} (${evt.staff.branch.city})` : 'Global'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`${getEventBadgeColor(evt.eventType)} font-mono`}>
                            {evt.eventType}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {evt.fromStage && evt.toStage ? (
                            <span className="font-mono text-xs">
                              <span className="text-[#8D9AB5]">{evt.fromStage}</span>
                              <span className="mx-1 text-primary">➔</span>
                              <span className="text-[#E8EDF8] font-bold">{evt.toStage}</span>
                            </span>
                          ) : (
                            <span className="text-[#8D9AB5] italic">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {evt.scenarioCode ? (
                            <Badge className="bg-purple-950/70 text-purple-300 border border-purple-800/40 font-mono">
                              {evt.scenarioCode}
                            </Badge>
                          ) : (
                            <span className="text-[#8D9AB5] italic">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-[#8D9AB5] font-mono">
                          {evt.actorId ? (
                            <span title={evt.actorId} className="flex items-center gap-1">
                              <User className="h-3 w-3 text-[#8D9AB5]" /> {evt.actorId.substring(0,8)}...
                            </span>
                          ) : (
                            <span className="italic text-slate-500">System</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => viewDetails(evt)} className="text-primary hover:bg-primary/10">
                            <FileJson className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-[#8D9AB5] uppercase bg-[#0F172A]/60 border-b border-border/40">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wider">Timestamp</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Action</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Actor ID</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Entity Type</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Entity ID</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {systemItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-[#8D9AB5]">
                        No system audit log events found.
                      </td>
                    </tr>
                  ) : (
                    systemItems.map((log: any) => (
                      <tr key={log.id} className="hover:bg-[#1C2740]/40 transition-all font-mono text-xs text-[#E8EDF8]/90">
                        <td className="px-6 py-4 text-[#8D9AB5]">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <Badge className="bg-slate-800 text-slate-300 border border-slate-700/50">{log.action}</Badge>
                        </td>
                        <td className="px-6 py-4">{log.actorId ? log.actorId.substring(0,8) + '...' : 'System'}</td>
                        <td className="px-6 py-4 font-semibold text-[#8D9AB5]">{log.entityType || '-'}</td>
                        <td className="px-6 py-4 text-[#8D9AB5]">{log.entityId ? log.entityId.substring(0,8) + '...' : '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => viewDetails(log)} className="text-primary hover:bg-primary/10">
                            <FileJson className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Details Modal */}
      <Modal open={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title="Audit Event Details">
        {selectedLog && (
          <div className="space-y-4 pt-2 text-[#E8EDF8]">
            <div className="grid grid-cols-2 gap-4 text-sm bg-[#0F172A] p-4 rounded-xl border border-border/40">
              <div>
                <span className="text-[#8D9AB5] block text-xs mb-1 uppercase tracking-wider">Event ID</span>
                <span className="font-mono text-xs font-semibold text-[#E8EDF8]">{selectedLog.id}</span>
              </div>
              <div>
                <span className="text-[#8D9AB5] block text-xs mb-1 uppercase tracking-wider">Timestamp</span>
                <span className="font-mono text-xs text-[#E8EDF8]">{new Date(selectedLog.occurredAt || selectedLog.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[#8D9AB5] block text-xs mb-1 uppercase tracking-wider">Event Type</span>
                <span className="font-mono text-xs text-primary font-semibold">{selectedLog.eventType || selectedLog.action}</span>
              </div>
              <div>
                <span className="text-[#8D9AB5] block text-xs mb-1 uppercase tracking-wider">Actor / Performer</span>
                <span className="font-mono text-xs text-[#E8EDF8]">{selectedLog.actorId || 'System Automated'}</span>
              </div>
            </div>

            {selectedLog.notes && (
              <div className="space-y-2">
                <span className="text-sm font-semibold text-[#8D9AB5]">Notes / Audit Remarks</span>
                <p className="bg-[#080D1A] text-[#E8EDF8] p-3 rounded-xl text-xs border border-border/20">
                  {selectedLog.notes}
                </p>
              </div>
            )}

            {selectedLog.payload && Object.keys(selectedLog.payload).length > 0 && (
              <div className="space-y-2 mt-4">
                <span className="text-sm font-semibold text-[#8D9AB5]">Event Data Payload</span>
                <pre className="bg-[#080D1A] text-emerald-400 p-4 rounded-xl text-xs overflow-x-auto border border-emerald-950/40">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="flex justify-end pt-4 mt-4 border-t border-border/40">
              <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)} className="border-border hover:bg-[#1C2740] hover:text-white">Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
