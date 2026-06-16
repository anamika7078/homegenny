"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { api } from '@/lib/api/client';
import { Search, Download, Clock, User, Activity, FileJson, AlertCircle } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: () => api.getAdminAuditLogs(),
  });

  const logs = Array.isArray(logsData)
    ? logsData
    : Array.isArray(logsData?.data)
      ? logsData.data
      : Array.isArray(logsData?.data?.items)
        ? logsData.data.items
        : Array.isArray(logsData?.items)
          ? logsData.items
          : [];

  const filteredLogs = logs.filter((l: any) => 
    l.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.entityType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.actorId?.includes(searchTerm)
  );

  const viewDetails = (log: any) => {
    setSelectedLog(log);
    setIsDetailsModalOpen(true);
  };

  const getActionColor = (action: string) => {
    if (['LOGIN', 'LOGOUT'].includes(action)) return 'bg-blue-950/60 text-blue-300 border border-blue-800/40';
    if (['APPROVAL', 'STAGE_TRANSITION'].includes(action)) return 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40';
    if (['DENIAL', 'RESTRICTED_LIST'].includes(action)) return 'bg-rose-950/60 text-rose-300 border border-rose-800/40';
    if (['SETTINGS_CHANGE'].includes(action)) return 'bg-amber-950/60 text-amber-300 border border-amber-800/40';
    return 'bg-slate-800 text-slate-300 border border-slate-700/50';
  };

  return (
    <div className="p-8 space-y-8 min-h-screen text-[#E8EDF8]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#E8EDF8]">Audit & Compliance Logs</h1>
          <p className="text-[#8D9AB5] mt-1 text-sm">Immutable tracking of all platform administrative and operational events.</p>
        </div>
        <Button variant="outline" className="border-border/60 hover:bg-[#1C2740] hover:text-white transition-all text-[#8D9AB5] bg-transparent">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card className="border border-border/80 bg-card/40 backdrop-blur-md shadow-2xl">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-border/40">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-[#E8EDF8]">
            <Activity className="h-5 w-5 text-primary" /> System Event Log
          </CardTitle>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D9AB5]/70 h-4 w-4" />
            <Input 
              placeholder="Search by action, actor ID, entity..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-[#0F172A]/50 border-border text-[#E8EDF8] placeholder-[#8D9AB5]/50 focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-[#8D9AB5] flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="h-10 w-10 text-[#8D9AB5]/50" />
                        No audit events match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-[#1C2740]/40 transition-all font-mono text-xs text-[#E8EDF8]/90">
                        <td className="px-6 py-4 whitespace-nowrap text-[#8D9AB5]">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-[#8D9AB5]" />
                            {new Date(log.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={`${getActionColor(log.action)} shadow-sm`}>
                            {log.action}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-[#E8EDF8]">
                          {log.actorId ? (
                            <span className="flex items-center gap-1.5 text-[#E8EDF8]" title={log.actorId}>
                              <User className="h-3 w-3 text-[#8D9AB5]" /> {log.actorId.substring(0, 8)}...
                            </span>
                          ) : (
                            <span className="text-[#8D9AB5] italic">System</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-semibold text-[#8D9AB5]">
                          {log.entityType || '-'}
                        </td>
                        <td className="px-6 py-4 text-[#8D9AB5]/80">
                          {log.entityId ? log.entityId.substring(0, 8) + '...' : '-'}
                        </td>
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
          <div className="space-y-4 pt-4 text-[#E8EDF8]">
            <div className="grid grid-cols-2 gap-4 text-sm bg-[#0F172A] p-4 rounded-xl border border-border/40">
              <div>
                <span className="text-[#8D9AB5] block text-xs mb-1 uppercase tracking-wider">Event ID</span>
                <span className="font-mono text-xs font-semibold text-[#E8EDF8]">{selectedLog.id}</span>
              </div>
              <div>
                <span className="text-[#8D9AB5] block text-xs mb-1 uppercase tracking-wider">Timestamp</span>
                <span className="font-mono text-xs text-[#E8EDF8]">{new Date(selectedLog.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[#8D9AB5] block text-xs mb-1 uppercase tracking-wider">IP Address</span>
                <span className="font-mono text-xs text-[#E8EDF8]">{selectedLog.ipAddress || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-[#8D9AB5] block text-xs mb-1 uppercase tracking-wider">User Agent</span>
                <span className="text-xs truncate block text-[#E8EDF8]" title={selectedLog.userAgent}>{selectedLog.userAgent || 'Unknown'}</span>
              </div>
            </div>

            {selectedLog.before && (
              <div className="space-y-2">
                <span className="text-sm font-semibold text-[#8D9AB5] flex items-center gap-2">Before State</span>
                <pre className="bg-[#080D1A] text-[#8D9AB5] p-4 rounded-xl text-xs overflow-x-auto border border-border/20">
                  {JSON.stringify(selectedLog.before, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.after && (
              <div className="space-y-2 mt-4">
                <span className="text-sm font-semibold text-[#8D9AB5] flex items-center gap-2">After State / Payload</span>
                <pre className="bg-[#080D1A] text-emerald-400 p-4 rounded-xl text-xs overflow-x-auto border border-emerald-950/40">
                  {JSON.stringify(selectedLog.after, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div className="space-y-2 mt-4">
                <span className="text-sm font-semibold text-[#8D9AB5]">Metadata</span>
                <pre className="bg-[#080D1A] text-[#E8EDF8] p-4 rounded-xl text-xs overflow-x-auto border border-border/20">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
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
