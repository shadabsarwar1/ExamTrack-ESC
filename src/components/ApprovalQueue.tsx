import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Mail, 
  Send, 
  Globe, 
  Eye, 
  Edit3, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle,
  Smartphone,
  Check,
  ChevronRight,
  Sparkles,
  Building2,
  Calendar,
  Users,
  RefreshCw,
  FileText,
  AlertCircle,
  Loader2,
  Trash2,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Copy,
  Layers
} from 'lucide-react';
import { ExamNotification, AppConfig } from '../types/exam';
import { formatToDDMMYYYY } from '../utils/date';
import { checkExamLinksConfirmed } from '../utils/linkCheck';
import { api } from '../services/api';

interface ApprovalQueueProps {
  exams: ExamNotification[];
  config: AppConfig | null;
  onApprove: (id: string, channel: 'web' | 'email' | 'whatsapp' | 'telegram', note?: string) => Promise<void>;
  onReject: (id: string, channel: 'web' | 'email' | 'whatsapp' | 'telegram', note?: string) => Promise<void>;
  onPreviewWp: (exam: ExamNotification) => void;
  onSelectExam: (exam: ExamNotification) => void;
  onDispatchAlerts: (exam: ExamNotification) => Promise<any>;
  onRefresh?: () => void;
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  exams,
  config,
  onApprove,
  onReject,
  onPreviewWp,
  onSelectExam,
  onDispatchAlerts,
  onRefresh
}) => {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [alertSuccessId, setAlertSuccessId] = useState<string | null>(null);
  const [isPruning, setIsPruning] = useState(false);
  const [pruneNotice, setPruneNotice] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const [showRemovedSection, setShowRemovedSection] = useState(true);

  // States for Job Vacancies page (https://esckolkata2003.org/job-vacancies/)
  const [syncingPage, setSyncingPage] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const [showPagePreviewModal, setShowPagePreviewModal] = useState(false);
  const [pagePreviewHtml, setPagePreviewHtml] = useState<string>('');
  const [loadingPagePreview, setLoadingPagePreview] = useState(false);
  const [pagePreviewTab, setPagePreviewTab] = useState<'visual' | 'code'>('visual');
  const [copiedHtml, setCopiedHtml] = useState(false);

  // Filter queues
  const pendingExams = exams.filter(e => e.status === 'pending_approval');
  const removedFromQueueExams = exams.filter(e => e.status === 'draft' && e.queueRemovalReason);
  const processedExams = exams.filter(e => e.status === 'approved' || e.status === 'published' || e.status === 'rejected');
  const approvedExams = exams.filter(e => e.status === 'approved' || e.status === 'published');

  // Count how many pending items have unconfirmed links
  const pendingWithUnconfirmedLinks = pendingExams.filter(e => !checkExamLinksConfirmed(e).confirmed);

  // Sync approved jobs to https://esckolkata2003.org/job-vacancies/
  const handleSyncVacanciesPage = async () => {
    setSyncingPage(true);
    try {
      const res = await api.syncJobVacanciesPage();
      if (res.success) {
        setSyncSuccessMsg({
          type: 'success',
          text: `Success! Synced ${res.count || approvedExams.length} approved jobs to ${res.pageUrl || 'https://esckolkata2003.org/job-vacancies/'}`
        });
      } else {
        setSyncSuccessMsg({
          type: 'info',
          text: `Compiled ${res.count || approvedExams.length} approved jobs for https://esckolkata2003.org/job-vacancies/. WP note: ${res.error || 'Ready in queue'}`
        });
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setSyncSuccessMsg({
        type: 'info',
        text: `Sync note: ${err.message}`
      });
    } finally {
      setSyncingPage(false);
      setTimeout(() => setSyncSuccessMsg(null), 8000);
    }
  };

  const handleOpenPagePreview = async () => {
    setShowPagePreviewModal(true);
    setLoadingPagePreview(true);
    try {
      const html = await api.getJobVacanciesPreviewHtml();
      setPagePreviewHtml(html);
    } catch (err: any) {
      setPagePreviewHtml(`<div style="color:red; padding:20px;">Preview error: ${err.message}</div>`);
    } finally {
      setLoadingPagePreview(false);
    }
  };

  const handleCopyPageHtml = () => {
    navigator.clipboard.writeText(pagePreviewHtml);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2500);
  };

  // Prune unconfirmed links from queue
  const handlePruneUnconfirmed = async () => {
    setIsPruning(true);
    try {
      const res = await api.pruneQueueUnconfirmed();
      if (res.prunedCount > 0) {
        setPruneNotice({
          type: 'success',
          text: `Quality Policy Enforced: Removed ${res.prunedCount} exam(s) from the approval queue to Drafts because mandatory links were not available or confirmed.`
        });
      } else {
        setPruneNotice({
          type: 'info',
          text: 'Audit Complete: All notifications in the approval queue have available and confirmed links.'
        });
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setPruneNotice({
        type: 'warning',
        text: 'Queue audit failed: ' + err.message
      });
    } finally {
      setIsPruning(false);
      setTimeout(() => setPruneNotice(null), 8000);
    }
  };

  // Remove single item from queue to Drafts
  const handleRemoveFromQueue = async (exam: ExamNotification, customReason?: string) => {
    setProcessingId(exam.id);
    try {
      const check = checkExamLinksConfirmed(exam);
      const reason = customReason || check.reason || 'Mandatory links (Apply Online / Official PDF) are missing or unconfirmed.';
      await api.updateExam(exam.id, {
        status: 'draft',
        queueRemovalReason: reason,
        removedFromQueueAt: new Date().toISOString()
      });
      setPruneNotice({
        type: 'info',
        text: `"${exam.title}" removed from approval queue to Drafts until links are confirmed.`
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Failed to remove from queue:', err);
    } finally {
      setProcessingId(null);
      setTimeout(() => setPruneNotice(null), 6000);
    }
  };

  // Re-verify links and optionally restore to queue if confirmed
  const handleReverifyAndRestore = async (exam: ExamNotification, restoreIfValid = false) => {
    setVerifyingId(exam.id);
    try {
      const verif = await api.verifyLinks({
        applyOnline: exam.links.applyOnline,
        notificationPdf: exam.links.notificationPdf,
        officialWebsite: exam.links.officialWebsite
      });

      const updatedExam = { ...exam, linkVerification: verif };
      const check = checkExamLinksConfirmed(updatedExam);

      if (restoreIfValid && check.confirmed) {
        await api.updateExam(exam.id, {
          linkVerification: verif,
          status: 'pending_approval',
          queueRemovalReason: undefined,
          removedFromQueueAt: undefined
        });
        setPruneNotice({
          type: 'success',
          text: `"${exam.title}" links confirmed! Restored to Approval Queue.`
        });
      } else {
        await api.updateExam(exam.id, { linkVerification: verif });
      }

      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Re-verification failed:', err);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleApproveClick = async (exam: ExamNotification) => {
    const check = checkExamLinksConfirmed(exam);
    if (!check.confirmed) {
      alert(`Approval Blocked: This notification cannot be approved.\n\nReason: ${check.reason}\n\nRule: If links are not available or confirmed, the notification must be removed from the approval queue.`);
      await handleRemoveFromQueue(exam, check.reason);
      return;
    }

    setProcessingId(exam.id);
    try {
      await onApprove(exam.id, 'web', 'Approved from Web Approval Center');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async (id: string) => {
    setProcessingId(id);
    try {
      await onReject(id, 'web', rejectNote || 'Admin rejected notification');
      setRejectingId(null);
      setRejectNote('');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSendTestAlert = async (exam: ExamNotification) => {
    const check = checkExamLinksConfirmed(exam);
    if (!check.confirmed) {
      alert(`Cannot send approval alerts: Links are unconfirmed (${check.reason}). Please verify links first.`);
      return;
    }

    setProcessingId(exam.id);
    try {
      await onDispatchAlerts(exam);
      setAlertSuccessId(exam.id);
      setTimeout(() => setAlertSuccessId(null), 4000);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Overview & Security Notice */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 border border-blue-800/80 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-300 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Admin Quality Gate & Approval Control</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Notification Approval Center</h2>
            <p className="text-xs sm:text-sm text-blue-200/90 mt-1 max-w-2xl leading-relaxed">
              Every competitive exam announcement or vacancy alert must pass through your review. When approved, 
              it automatically publishes directly to your WordPress website (<span className="text-white font-mono font-medium">esckolkata2003.org</span>) and updates the central <span className="text-white font-mono font-medium">/job-vacancies/</span> page in strict <strong className="text-amber-300">DD-MM-YYYY</strong> date format.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-blue-950/80 border border-blue-700/60 rounded-xl p-3 sm:p-4 text-center shrink-0">
              <span className="text-[11px] text-blue-300 uppercase font-semibold block">In Approval Queue</span>
              <div className="text-3xl font-extrabold text-amber-400 mt-0.5">{pendingExams.length}</div>
              <span className="text-[10px] text-blue-300">ready for review</span>
            </div>

            {removedFromQueueExams.length > 0 && (
              <div className="bg-rose-950/80 border border-rose-700/60 rounded-xl p-3 sm:p-4 text-center shrink-0">
                <span className="text-[11px] text-rose-300 uppercase font-semibold block">Removed / Drafts</span>
                <div className="text-3xl font-extrabold text-rose-400 mt-0.5">{removedFromQueueExams.length}</div>
                <span className="text-[10px] text-rose-300">unconfirmed links</span>
              </div>
            )}
          </div>
        </div>

        {/* Quality Gate Rule Notice Strip with Action */}
        <div className="mt-5 pt-4 border-t border-blue-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Rule Enforced:</strong> Both <em>Apply Online Direct Link</em> and <em>Official Notification PDF</em> must be available and confirmed. If links are missing or unconfirmed, items are removed from the queue.
            </span>
          </div>

          <button
            onClick={handlePruneUnconfirmed}
            disabled={isPruning}
            className="px-3 py-1.5 bg-blue-700/80 hover:bg-blue-600 border border-blue-500/60 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0"
            title="Scan approval queue and automatically demote any items with unconfirmed links to Drafts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPruning ? 'animate-spin' : ''}`} />
            <span>{isPruning ? 'Auditing Queue...' : 'Audit & Prune Unconfirmed'}</span>
          </button>
        </div>

        {/* Multi-channel Remote Approval Summary Strip */}
        <div className="mt-4 pt-3 border-t border-blue-900/60 flex flex-wrap items-center gap-4 text-xs text-blue-200">
          <span className="font-semibold text-white">Active Channels for 1-Click Remote Approval:</span>
          <div className="flex items-center gap-1.5 bg-blue-950/70 px-2.5 py-1 rounded-md border border-blue-700/50">
            <Mail className="w-3.5 h-3.5 text-blue-300" />
            <span>Email: <strong>{config?.adminEmail.email || 'shadabsarwar@gmail.com'}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-950/70 px-2.5 py-1 rounded-md border border-blue-700/50">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>WhatsApp: <strong>{config?.adminWhatsApp.phoneNumber || '+91 98300 XXXXX'}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-950/70 px-2.5 py-1 rounded-md border border-blue-700/50">
            <Send className="w-3.5 h-3.5 text-sky-400" />
            <span>Telegram Bot: <strong>{config?.adminTelegram.chatId ? 'Connected' : 'Simulated'}</strong></span>
          </div>
        </div>
      </div>

      {/* Pruning Toast / Banner */}
      {pruneNotice && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
          pruneNotice.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : pruneNotice.type === 'warning'
            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            : 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
        }`}>
          {pruneNotice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs sm:text-sm font-medium flex-1">
            {pruneNotice.text}
          </div>
        </div>
      )}

      {/* Warning banner if queue contains unconfirmed items */}
      {pendingWithUnconfirmedLinks.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>Attention:</strong> {pendingWithUnconfirmedLinks.length} exam notification(s) in this queue have missing or unconfirmed links. Under the quality policy, they cannot be approved and should be removed to Drafts.
            </span>
          </div>
          <button
            onClick={handlePruneUnconfirmed}
            disabled={isPruning}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-xs"
          >
            Remove Unconfirmed Now
          </button>
        </div>
      )}

      {/* PENDING APPROVAL QUEUE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Pending Admin Review ({pendingExams.length})</span>
          </h3>
          <span className="text-xs text-slate-500">
            Only items with confirmed links can be approved & published
          </span>
        </div>

        {pendingExams.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">All caught up! No notifications pending approval.</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              New exam circulars will appear here when added manually or extracted via AI Notice Parser.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingExams.map((exam) => {
              const linkStatus = checkExamLinksConfirmed(exam);
              const isConfirmed = linkStatus.confirmed;

              return (
                <div 
                  key={exam.id}
                  className={`bg-white dark:bg-slate-900 border-2 rounded-xl p-5 shadow-xs transition-all ${
                    isConfirmed 
                      ? 'border-amber-300 dark:border-amber-600/60' 
                      : 'border-rose-300 dark:border-rose-800/80 bg-rose-50/10'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    {/* Left Column: Details */}
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-blue-600 dark:text-blue-400">{exam.category}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{exam.organization}</span>
                        <span className="text-slate-400">•</span>
                        
                        {isConfirmed ? (
                          <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Links Confirmed & Ready</span>
                          </span>
                        ) : (
                          <span className="text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded text-[11px] font-semibold border border-rose-200 dark:border-rose-800/80 flex items-center gap-1 animate-pulse">
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                            <span>Links Unconfirmed — Removal Required</span>
                          </span>
                        )}
                      </div>

                      <h4 
                        onClick={() => onSelectExam(exam)}
                        className="font-bold text-lg text-slate-900 dark:text-white hover:text-blue-600 cursor-pointer transition-colors"
                      >
                        {exam.title}
                      </h4>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {exam.summary || exam.postName}
                      </p>

                      {/* Quick Metadata Pill Strip */}
                      <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          <span><strong>{exam.totalVacancies}</strong> Vacancies</span>
                        </div>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-amber-500" />
                          <span>Last Date: <strong>{formatToDDMMYYYY(exam.importantDates.applicationEnd)}</strong></span>
                        </div>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <div className="text-slate-600 dark:text-slate-400">
                          Pay: <strong>{exam.salaryRange}</strong>
                        </div>
                      </div>

                      {/* Diagnostic Alert if unconfirmed */}
                      {!isConfirmed && (
                        <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="font-bold">Queue Removal Triggered: </span>
                            <span>{linkStatus.reason}</span>
                            <div className="text-[11px] text-rose-600 dark:text-rose-300 mt-0.5">
                              This notification must be removed from the approval queue until valid links are verified.
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveFromQueue(exam, linkStatus.reason)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold shrink-0 transition-colors"
                          >
                            Remove to Drafts
                          </button>
                        </div>
                      )}

                      {/* Dedicated Mandatory Link Verification Status Bar */}
                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 bg-indigo-50/50 dark:bg-indigo-950/20 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Mandatory Links:</span>
                          </span>

                          {/* Apply Online */}
                          <div className="flex items-center gap-1">
                            {exam.linkVerification?.applyOnline.status === 'verified' ? (
                              <span className="bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span>Apply Online: Verified</span>
                              </span>
                            ) : exam.linkVerification?.applyOnline.status === 'warning' ? (
                              <span className="bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                <span>Apply Online: WAF Reachable</span>
                              </span>
                            ) : (
                              <span className="bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-rose-500" />
                                <span>Apply Online: {exam.links.applyOnline ? 'Check Failed' : 'Missing'}</span>
                              </span>
                            )}
                            {exam.links.applyOnline && (
                              <a
                                href={exam.links.applyOnline}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-blue-600 p-0.5"
                                title="Open Apply Online Direct Link in new tab"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          {/* Notification PDF */}
                          <div className="flex items-center gap-1">
                            {exam.linkVerification?.notificationPdf.status === 'verified' ? (
                              <span className="bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span>Notice PDF: Verified</span>
                              </span>
                            ) : exam.linkVerification?.notificationPdf.status === 'warning' ? (
                              <span className="bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                <span>Notice PDF: Reachable</span>
                              </span>
                            ) : (
                              <span className="bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-rose-500" />
                                <span>Notice PDF: {exam.links.notificationPdf ? 'Check Failed' : 'Missing'}</span>
                              </span>
                            )}
                            {exam.links.notificationPdf && (
                              <a
                                href={exam.links.notificationPdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-purple-600 p-0.5"
                                title="Open Official Notification PDF in new tab"
                              >
                                <FileText className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleReverifyAndRestore(exam, false)}
                          disabled={verifyingId === exam.id}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-semibold flex items-center gap-1 ml-auto"
                        >
                          <RefreshCw className={`w-3 h-3 ${verifyingId === exam.id ? 'animate-spin' : ''}`} />
                          <span>{verifyingId === exam.id ? 'Testing...' : 'Re-verify Links'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-slate-800">
                      
                      {/* Preview on WP */}
                      <button
                        onClick={() => onPreviewWp(exam)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                        title="Preview how article looks on ESC Kolkata WordPress site"
                      >
                        <Globe className="w-3.5 h-3.5 text-slate-500" />
                        <span>Preview WP</span>
                      </button>

                      {/* If unconfirmed, show dedicated Remove from Queue button */}
                      {!isConfirmed ? (
                        <button
                          onClick={() => handleRemoveFromQueue(exam, linkStatus.reason)}
                          disabled={processingId === exam.id}
                          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                          title="Policy requirement: Remove item with unconfirmed links from approval queue"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Remove from Queue</span>
                        </button>
                      ) : (
                        <>
                          {/* Send Multi-Channel Alert to Admin */}
                          <button
                            onClick={() => handleSendTestAlert(exam)}
                            disabled={processingId === exam.id}
                            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-blue-200 dark:border-blue-800/80"
                            title="Dispatch alert to your Email, WhatsApp, and Telegram with 1-click approve link"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{alertSuccessId === exam.id ? 'Alerts Sent!' : 'Send Alert'}</span>
                          </button>

                          {/* Reject Trigger */}
                          <button
                            onClick={() => setRejectingId(rejectingId === exam.id ? null : exam.id)}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-rose-200 dark:border-rose-800/80"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {/* 1-Click Approve & Auto-Publish */}
                      <button
                        onClick={() => handleApproveClick(exam)}
                        disabled={processingId === exam.id || !isConfirmed}
                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                          isConfirmed 
                            ? 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white' 
                            : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                        }`}
                        title={isConfirmed ? 'Approve and publish to WordPress' : 'Cannot approve: Links must be available and confirmed first'}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {processingId === exam.id ? 'Publishing...' : !isConfirmed ? 'Approval Blocked' : 'Approve & Publish'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Reject note dialog */}
                  {rejectingId === exam.id && (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder="Optional reason for rejection (e.g. invalid date, duplicate notice)..."
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800 dark:text-slate-100"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRejectConfirm(exam.id)}
                          disabled={processingId === exam.id}
                          className="px-3 py-1.5 bg-rose-600 text-white rounded-md text-xs font-semibold hover:bg-rose-500"
                        >
                          Confirm Rejection
                        </button>
                        <button
                          onClick={() => setRejectingId(null)}
                          className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DEDICATED SECTION: ITEMS REMOVED FROM QUEUE (AWAITING LINK CONFIRMATION) */}
      {removedFromQueueExams.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Removed from Approval Queue — Unconfirmed Links ({removedFromQueueExams.length})
              </h3>
            </div>
            <button
              onClick={() => setShowRemovedSection(!showRemovedSection)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
            >
              <span>{showRemovedSection ? 'Hide' : 'Show'} List</span>
              {showRemovedSection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <p className="text-xs text-slate-500">
            These notifications were removed from the approval queue pursuant to policy. Provide active Apply Online Direct Links and Official Notification PDFs to restore them to the queue.
          </p>

          {showRemovedSection && (
            <div className="space-y-3">
              {removedFromQueueExams.map((exam) => (
                <div 
                  key={exam.id}
                  className="bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{exam.category}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">{exam.organization}</span>
                      <span className="text-slate-400">•</span>
                      <span className="bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded text-[10px] font-bold">
                        Draft (Removed from Queue)
                      </span>
                    </div>

                    <h4 
                      onClick={() => onSelectExam(exam)}
                      className="font-bold text-base text-slate-900 dark:text-white hover:text-blue-600 cursor-pointer"
                    >
                      {exam.title}
                    </h4>

                    {/* Removal Reason callout */}
                    <div className="text-xs text-rose-700 dark:text-rose-300 bg-white/60 dark:bg-slate-900/60 border border-rose-200 dark:border-rose-800/60 rounded-md p-2">
                      <strong>Removal Reason:</strong> {exam.queueRemovalReason || 'Mandatory links unconfirmed'}
                      {exam.removedFromQueueAt && (
                        <span className="text-slate-400 ml-2">
                          (Demoted: {formatToDDMMYYYY(exam.removedFromQueueAt)})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                    <button
                      onClick={() => handleReverifyAndRestore(exam, true)}
                      disabled={verifyingId === exam.id}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                      title="Re-verify links and restore to approval queue if confirmed"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${verifyingId === exam.id ? 'animate-spin' : ''}`} />
                      <span>{verifyingId === exam.id ? 'Verifying...' : 'Re-verify & Restore'}</span>
                    </button>

                    <button
                      onClick={() => onSelectExam(exam)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Edit notification and supply direct links"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                      <span>Edit Links</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DESTINATION PAGE CARD: https://esckolkata2003.org/job-vacancies/ */}
      <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-2 border-emerald-500/40 rounded-2xl p-6 shadow-sm space-y-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-emerald-400" />
                Target Page Destination
              </span>
              <span className="text-slate-400 text-xs hidden sm:inline">•</span>
              <span className="text-xs font-mono text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                https://esckolkata2003.org/job-vacancies/
              </span>
              <span className="bg-blue-500/20 text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-500/30">
                Auto-Sync Active
              </span>
            </div>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Post Approved Jobs to /job-vacancies/</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Every job approved via Web, Email, WhatsApp, or Telegram is automatically compiled and posted to 
              <strong className="text-emerald-400 ml-1">https://esckolkata2003.org/job-vacancies/</strong> with verified 
              <span className="text-white font-medium"> Apply Online</span> &amp; <span className="text-white font-medium">Notification PDF</span> direct links, and strict <span className="text-amber-300 font-semibold">DD-MM-YYYY</span> date formatting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleSyncVacanciesPage}
              disabled={syncingPage}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
              title="Compile all approved vacancies and post to https://esckolkata2003.org/job-vacancies/"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingPage ? 'animate-spin' : ''}`} />
              <span>{syncingPage ? 'Syncing to Page...' : 'Sync to /job-vacancies/ Now'}</span>
            </button>

            <button
              onClick={handleOpenPagePreview}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="View full visual layout and Gutenberg code for the job-vacancies page"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Preview Page</span>
            </button>

            <a
              href="https://esckolkata2003.org/job-vacancies/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Open the live WordPress page in a new tab"
            >
              <span>Live Site</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Sync notification message */}
        {syncSuccessMsg && (
          <div className={`text-xs p-3 rounded-lg border flex items-center justify-between gap-3 ${
            syncSuccessMsg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : 'bg-blue-950/80 border-blue-500/40 text-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncSuccessMsg.text}</span>
            </div>
            <button
              onClick={() => setSyncSuccessMsg(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded hover:bg-slate-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Snapshot of Approved Jobs ready for the /job-vacancies/ table */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Compiled Jobs on /job-vacancies/ ({approvedExams.length})</span>
            </span>
            <span className="text-[11px] text-slate-400">
              Only includes quality-verified items with active Apply &amp; PDF links
            </span>
          </div>

          {approvedExams.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
              No approved notifications yet. When you approve notifications above, they appear here and automatically post to the page.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {approvedExams.slice(0, 4).map((exam) => (
                <div 
                  key={exam.id}
                  className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg flex items-center justify-between gap-2 hover:border-slate-700 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs font-bold text-white truncate">{exam.title}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{exam.totalVacancies} Posts</span>
                      <span>•</span>
                      <span>End: <strong className="text-slate-200">{formatToDDMMYYYY(exam.importantDates.applicationEnd)}</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-1.5 py-0.5 rounded font-medium">
                      Links Verified
                    </span>
                    <button
                      onClick={() => onSelectExam(exam)}
                      className="text-xs text-blue-400 hover:text-blue-300 p-1"
                      title="Inspect details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {approvedExams.length > 4 && (
            <p className="text-[11px] text-slate-400 text-center pt-1">
              + {approvedExams.length - 4} more approved jobs included on the page. Click "Preview Page" to see the full rendered table.
            </p>
          )}
        </div>
      </div>

      {/* RECENTLY APPROVED & PUBLISHED HISTORY */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-500" />
          <span>Published &amp; Approved Feed</span>
        </h3>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
          {processedExams.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No previously processed notifications yet.
            </div>
          ) : (
            processedExams.map((exam) => (
              <div key={exam.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{exam.category}</span>
                    <span className="text-slate-400">•</span>
                    {exam.status === 'published' ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Published to esckolkata2003.org</span>
                      </span>
                    ) : exam.status === 'approved' ? (
                      <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 text-[11px]">
                        <Check className="w-3 h-3" />
                        <span>Approved &amp; Synced to /job-vacancies/</span>
                      </span>
                    ) : (
                      <span className="text-rose-500 font-semibold flex items-center gap-1 text-[11px]">
                        <XCircle className="w-3 h-3" />
                        <span>Rejected</span>
                      </span>
                    )}

                    {exam.approvalChannel && (
                      <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        via {exam.approvalChannel.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <h5 
                    onClick={() => onSelectExam(exam)}
                    className="font-bold text-sm text-slate-900 dark:text-white cursor-pointer hover:text-blue-600"
                  >
                    {exam.title}
                  </h5>

                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    <span>{exam.totalVacancies} Posts</span>
                    <span>•</span>
                    <span>Last Date: {formatToDDMMYYYY(exam.importantDates.applicationEnd)}</span>
                    {exam.publishedAt && (
                      <>
                        <span>•</span>
                        <span>Published: {formatToDDMMYYYY(exam.publishedAt)}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {exam.wpPostUrl && (
                    <a
                      href={exam.wpPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs font-semibold flex items-center gap-1 hover:bg-emerald-100"
                    >
                      <span>Live Post</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  <button
                    onClick={() => onSelectExam(exam)}
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-md text-xs font-medium hover:bg-slate-200"
                  >
                    View
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* JOB VACANCIES PAGE PREVIEW MODAL */}
      {showPagePreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/70">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="font-bold text-white text-base sm:text-lg">
                    Destination Page Preview: https://esckolkata2003.org/job-vacancies/
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Compiled list of all approved employment notifications with strict DD-MM-YYYY dates &amp; verified direct links.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* View Mode Toggle */}
                <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex text-xs">
                  <button
                    onClick={() => setPagePreviewTab('visual')}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      pagePreviewTab === 'visual'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Rendered Page
                  </button>
                  <button
                    onClick={() => setPagePreviewTab('code')}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      pagePreviewTab === 'code'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Gutenberg Block HTML
                  </button>
                </div>

                <button
                  onClick={() => setShowPagePreviewModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
              {loadingPagePreview ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Compiling approved jobs into WordPress Gutenberg format...</p>
                </div>
              ) : pagePreviewTab === 'visual' ? (
                <div className="bg-white rounded-xl shadow-inner text-slate-900 overflow-hidden">
                  <div className="bg-slate-800 text-slate-300 px-4 py-2 text-[11px] font-mono flex items-center justify-between border-b border-slate-700">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <Globe className="w-3.5 h-3.5" />
                      https://esckolkata2003.org/job-vacancies/
                    </span>
                    <span className="text-slate-400">Page Preview Simulation</span>
                  </div>
                  <div 
                    className="p-6 sm:p-8 space-y-4 max-w-none text-slate-800"
                    dangerouslySetInnerHTML={{ __html: pagePreviewHtml }}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">WordPress Gutenberg Block Compatible HTML</span>
                    <button
                      onClick={handleCopyPageHtml}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      {copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedHtml ? 'Copied to Clipboard!' : 'Copy Gutenberg HTML'}</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-900 text-emerald-300 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800 max-h-[60vh] select-all">
                    {pagePreviewHtml}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/90 text-xs">
              <div className="text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Format verified: DD-MM-YYYY dates • Direct Apply Online Link • Official Notification PDF</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncVacanciesPage}
                  disabled={syncingPage}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingPage ? 'animate-spin' : ''}`} />
                  <span>{syncingPage ? 'Syncing...' : 'Sync to WordPress Page Now'}</span>
                </button>
                <button
                  onClick={() => setShowPagePreviewModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

