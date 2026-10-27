import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  DollarSign, 
  GraduationCap, 
  Send, 
  Globe, 
  Building2, 
  Check, 
  Edit3, 
  Trash2,
  Users,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Loader2,
  XCircle
} from 'lucide-react';
import { ExamNotification, ExamLinkVerification } from '../types/exam';
import { formatToDDMMYYYY } from '../utils/date';
import { checkExamLinksConfirmed } from '../utils/linkCheck';
import { api } from '../services/api';

interface ExamDetailModalProps {
  exam: ExamNotification | null;
  onClose: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onPublishToWp: (exam: ExamNotification) => Promise<any>;
  onPreviewWp: (exam: ExamNotification) => void;
  onEdit: (exam: ExamNotification) => void;
  onDelete: (id: string) => Promise<void>;
  onRefresh?: () => void;
}

export const ExamDetailModal: React.FC<ExamDetailModalProps> = ({
  exam,
  onClose,
  onApprove,
  onReject,
  onPublishToWp,
  onPreviewWp,
  onEdit,
  onDelete,
  onRefresh
}) => {
  const [currentVerif, setCurrentVerif] = useState<ExamLinkVerification | undefined>(exam?.linkVerification);
  const [verifying, setVerifying] = useState(false);
  const [demoting, setDemoting] = useState(false);

  useEffect(() => {
    setCurrentVerif(exam?.linkVerification);
  }, [exam]);

  if (!exam) return null;

  const linkStatus = checkExamLinksConfirmed({ ...exam, linkVerification: currentVerif });

  const handleDemoteToDraft = async () => {
    setDemoting(true);
    try {
      await api.updateExam(exam.id, {
        status: 'draft',
        queueRemovalReason: linkStatus.reason,
        removedFromQueueAt: new Date().toISOString()
      });
      if (onRefresh) onRefresh();
      onClose();
    } catch (err: any) {
      console.error('Failed to demote:', err);
    } finally {
      setDemoting(false);
    }
  };

  const handleReverify = async () => {
    setVerifying(true);
    try {
      const res = await api.verifyLinks({
        applyOnline: exam.links.applyOnline,
        notificationPdf: exam.links.notificationPdf,
        officialWebsite: exam.links.officialWebsite
      });
      setCurrentVerif(res);
      await api.updateExam(exam.id, { linkVerification: res });
    } catch (err: any) {
      console.error('Re-verification failed:', err);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
              <span className="font-bold text-blue-600 dark:text-blue-400">{exam.category}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 dark:text-slate-400">{exam.organization}</span>
              <span className="text-slate-400">•</span>
              {exam.status === 'published' ? (
                <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-[11px] font-semibold">
                  Published to WordPress
                </span>
              ) : exam.status === 'pending_approval' ? (
                <span className="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded text-[11px] font-semibold animate-pulse">
                  Pending Approval
                </span>
              ) : exam.status === 'approved' ? (
                <span className="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded text-[11px] font-semibold">
                  Approved
                </span>
              ) : (
                <span className="text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                  {exam.status}
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              {exam.title}
            </h2>
            <p className="text-xs text-slate-500 mt-1">Post Name: <strong>{exam.postName}</strong></p>

            {/* Quality Policy Alert Banner */}
            {exam.status === 'pending_approval' && !linkStatus.confirmed && (
              <div className="mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold">Queue Removal Required: Mandatory links are unconfirmed</div>
                  <div>{linkStatus.reason}</div>
                  <div className="text-[11px] text-rose-600 dark:text-rose-300 mt-1">
                    Under the quality policy, this notification cannot be approved and should be moved to Drafts until active links are provided.
                  </div>
                </div>
                <button
                  onClick={handleDemoteToDraft}
                  disabled={demoting}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold shrink-0 transition-colors"
                >
                  {demoting ? 'Removing...' : 'Remove from Queue'}
                </button>
              </div>
            )}

            {exam.status === 'draft' && exam.queueRemovalReason && (
              <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Removed from Approval Queue</div>
                  <div>{exam.queueRemovalReason}</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onEdit(exam)}
              className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Edit Notification"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(exam.id)}
              className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Delete Notification"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Vacancies</span>
            <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{exam.totalVacancies} Posts</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Last Date</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatToDDMMYYYY(exam.importantDates.applicationEnd)}</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Salary Scale</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">{exam.salaryRange}</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Application Fee</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{exam.applicationFee.generalOBC}</span>
          </div>
        </div>

        {/* Important Dates Timeline */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>Important Dates Schedule (DD-MM-YYYY)</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 block">Apply Start</span>
              <span className="font-medium text-slate-900 dark:text-white">{formatToDDMMYYYY(exam.importantDates.applicationStart)}</span>
            </div>
            <div>
              <span className="text-[11px] text-amber-500 block font-semibold">Last Date to Apply</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatToDDMMYYYY(exam.importantDates.applicationEnd)}</span>
            </div>
            {exam.importantDates.admitCardDate && (
              <div>
                <span className="text-[11px] text-slate-400 block">Admit Card</span>
                <span className="font-medium text-slate-900 dark:text-white">{formatToDDMMYYYY(exam.importantDates.admitCardDate)}</span>
              </div>
            )}
            {exam.importantDates.examDate && (
              <div>
                <span className="text-[11px] text-slate-400 block">Exam Date</span>
                <span className="font-medium text-emerald-600 font-semibold">{formatToDDMMYYYY(exam.importantDates.examDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Eligibility & Summary */}
        <div className="space-y-3 text-xs">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-1">Educational Qualification:</h4>
            <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800 leading-relaxed">
              {exam.eligibility.minQualification}
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-1">Age Limit & Relaxation:</h4>
            <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800 leading-relaxed">
              {exam.eligibility.ageLimit}
            </p>
          </div>

          {exam.summary && (
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-1">Overview & Summary:</h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {exam.summary}
              </p>
            </div>
          )}

          {exam.escGuidanceNotes && (
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-3 rounded-xl">
              <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-0.5">
                Educational Support Council (ESC Kolkata) Mentoring Note:
              </h4>
              <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
                {exam.escGuidanceNotes}
              </p>
            </div>
          )}
        </div>

        {/* External Links with Verification Details */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Mandatory External Links Verification</span>
            </h4>
            <button
              onClick={handleReverify}
              disabled={verifying}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
              <span>{verifying ? 'Pinging Links...' : 'Re-verify Links'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Apply Online Direct Link */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Apply Online Direct Link</span>
                {currentVerif?.applyOnline.status === 'verified' ? (
                  <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                ) : currentVerif?.applyOnline.status === 'warning' ? (
                  <span className="text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-600 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>WAF Warning</span>
                  </span>
                ) : (
                  <span className="text-[10px] bg-rose-50 dark:bg-rose-950/60 text-rose-600 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Check Required</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1 font-mono">{exam.links.applyOnline || 'Not provided'}</p>
              {exam.links.applyOnline && (
                <a
                  href={exam.links.applyOnline}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold text-xs hover:underline mt-1"
                >
                  <span>Open Apply Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Official Notification PDF */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Official Notification PDF</span>
                {currentVerif?.notificationPdf.status === 'verified' ? (
                  <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified PDF</span>
                  </span>
                ) : currentVerif?.notificationPdf.status === 'warning' ? (
                  <span className="text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-600 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Review / WAF</span>
                  </span>
                ) : (
                  <span className="text-[10px] bg-rose-50 dark:bg-rose-950/60 text-rose-600 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Check Required</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1 font-mono">{exam.links.notificationPdf || 'Not provided'}</p>
              {exam.links.notificationPdf && (
                <a
                  href={exam.links.notificationPdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold text-xs hover:underline mt-1"
                >
                  <span>Open Notification PDF</span>
                  <FileText className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => onPreviewWp(exam)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Preview WordPress HTML</span>
          </button>
        </div>

        {/* Approval & Publish Footer bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {exam.wpPostUrl ? (
              <a href={exam.wpPostUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 font-semibold underline flex items-center gap-1">
                <span>View Live on esckolkata2003.org</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span>Created on {formatToDDMMYYYY(exam.createdAt)}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {exam.status === 'pending_approval' && (
              <>
                <button
                  onClick={() => onReject(exam.id)}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-semibold"
                >
                  Reject
                </button>

                {!linkStatus.confirmed ? (
                  <button
                    onClick={handleDemoteToDraft}
                    disabled={demoting}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{demoting ? 'Removing...' : 'Remove from Queue'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onApprove(exam.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Publish</span>
                  </button>
                )}
              </>
            )}

            {exam.status === 'draft' && (
              <button
                onClick={() => onEdit(exam)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Links & Resubmit</span>
              </button>
            )}

            {exam.status === 'approved' && !exam.wpPostId && (
              <button
                onClick={() => onPublishToWp(exam)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Globe className="w-4 h-4" />
                <span>Publish to WordPress Now</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
