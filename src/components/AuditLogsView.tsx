import React from 'react';
import { History, Trash2, CheckCircle2, AlertTriangle, AlertCircle, Info, ExternalLink, Globe, Mail, Send, Smartphone } from 'lucide-react';
import { ActivityLog } from '../types/exam';
import { formatToDDMMYYYY } from '../utils/date';

interface AuditLogsViewProps {
  logs: ActivityLog[];
  onClearLogs: () => Promise<void>;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs, onClearLogs }) => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-blue-500" />
            <span>Activity & Publishing Audit Logs</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent event trail of approvals, remote links clicked, notifications dispatched, and WordPress REST API calls.
          </p>
        </div>

        {logs.length > 0 && (
          <button
            onClick={onClearLogs}
            className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1.5 font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No activity logged yet. Approvals and publishing events will appear here automatically.
          </div>
        ) : (
          logs.map((log) => {
            const timeFormatted = `${formatToDDMMYYYY(log.timestamp)}, ${new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

            return (
              <div key={log.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors flex items-start gap-3 text-xs">
                {/* Icon based on status */}
                <div className="mt-0.5 shrink-0">
                  {log.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : log.status === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  ) : log.status === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  ) : (
                    <Info className="w-4 h-4 text-blue-500" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{log.title}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{timeFormatted}</span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{log.details}</p>

                  <div className="flex items-center gap-2 pt-1 text-[11px]">
                    {log.channel && (
                      <span className="inline-flex items-center gap-1 text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {log.channel === 'email' && <Mail className="w-3 h-3 text-blue-400" />}
                        {log.channel === 'whatsapp' && <Smartphone className="w-3 h-3 text-emerald-400" />}
                        {log.channel === 'telegram' && <Send className="w-3 h-3 text-sky-400" />}
                        {log.channel === 'web' && <Globe className="w-3 h-3 text-slate-400" />}
                        <span>Channel: {log.channel.toUpperCase()}</span>
                      </span>
                    )}

                    {log.extraUrl && (
                      <a
                        href={log.extraUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>Related URL</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
