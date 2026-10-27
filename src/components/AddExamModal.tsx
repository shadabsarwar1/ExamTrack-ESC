import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Building2, 
  Calendar, 
  FileText, 
  DollarSign, 
  GraduationCap, 
  Link2, 
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { ExamNotification, ExamCategory, ExamLinkVerification, SingleLinkCheck } from '../types/exam';
import { formatToDDMMYYYY, getTodayDDMMYYYY, getDateAfterDaysDDMMYYYY } from '../utils/date';
import { api } from '../services/api';

interface AddExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exam: Partial<ExamNotification>) => Promise<void>;
  initialData?: Partial<ExamNotification> | null;
}

const CATEGORIES: ExamCategory[] = [
  'State PSC',
  'SSC',
  'Banking',
  'Railways',
  'UPSC',
  'Police',
  'Teaching',
  'Defense',
  'Engineering',
  'PSU',
  'Other'
];

export const AddExamModal: React.FC<AddExamModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [formData, setFormData] = useState<Partial<ExamNotification>>({
    title: '',
    organization: '',
    postName: '',
    category: 'State PSC',
    totalVacancies: '',
    salaryRange: '',
    importantDates: {
      applicationStart: getTodayDDMMYYYY(),
      applicationEnd: getDateAfterDaysDDMMYYYY(30),
      admitCardDate: '',
      examDate: ''
    },
    eligibility: {
      minQualification: '',
      ageLimit: '18 - 35 years',
      experience: ''
    },
    applicationFee: {
      generalOBC: '₹200/-',
      scStPwd: 'Nil / Exempted'
    },
    selectionProcess: ['Preliminary Examination', 'Main Examination', 'Interview'],
    links: {
      officialWebsite: '',
      notificationPdf: '',
      applyOnline: ''
    },
    summary: '',
    escGuidanceNotes: 'Free study guidance and test series offered by ESC Kolkata Employment School.',
    tags: ['Govt Job', 'West Bengal']
  });

  const [saving, setSaving] = useState(false);
  const [linkVerification, setLinkVerification] = useState<ExamLinkVerification | null>(null);
  const [verifyingLinks, setVerifyingLinks] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      if (initialData.linkVerification) {
        setLinkVerification(initialData.linkVerification);
      } else if (initialData.links?.applyOnline && initialData.links?.notificationPdf) {
        // Pre-initialize verification state for existing links
        setLinkVerification({
          verified: false,
          applyOnline: {
            url: initialData.links.applyOnline,
            valid: true,
            status: 'unchecked',
            message: 'Click Verify Links to test reachability'
          },
          notificationPdf: {
            url: initialData.links.notificationPdf,
            valid: true,
            status: 'unchecked',
            message: 'Click Verify Links to test PDF direct link'
          },
          officialWebsite: initialData.links.officialWebsite ? {
            url: initialData.links.officialWebsite,
            valid: true,
            status: 'unchecked',
            message: 'Portal link unchecked'
          } : undefined
        });
      }

      setFormData(prev => ({
        ...prev,
        ...initialData,
        importantDates: {
          applicationStart: formatToDDMMYYYY(initialData.importantDates?.applicationStart || prev.importantDates?.applicationStart || getTodayDDMMYYYY()),
          applicationEnd: formatToDDMMYYYY(initialData.importantDates?.applicationEnd || prev.importantDates?.applicationEnd || getDateAfterDaysDDMMYYYY(30)),
          admitCardDate: initialData.importantDates?.admitCardDate || prev.importantDates?.admitCardDate || '',
          examDate: initialData.importantDates?.examDate || prev.importantDates?.examDate || '',
          feeLastDate: initialData.importantDates?.feeLastDate ? formatToDDMMYYYY(initialData.importantDates.feeLastDate) : prev.importantDates?.feeLastDate,
          resultDate: initialData.importantDates?.resultDate ? formatToDDMMYYYY(initialData.importantDates.resultDate) : prev.importantDates?.resultDate
        },
        eligibility: {
          minQualification: initialData.eligibility?.minQualification || prev.eligibility?.minQualification || '',
          ageLimit: initialData.eligibility?.ageLimit || prev.eligibility?.ageLimit || '18 - 35 years',
          experience: initialData.eligibility?.experience || prev.eligibility?.experience
        },
        applicationFee: {
          generalOBC: initialData.applicationFee?.generalOBC || prev.applicationFee?.generalOBC || '₹200/-',
          scStPwd: initialData.applicationFee?.scStPwd || prev.applicationFee?.scStPwd || 'Nil / Exempted'
        },
        links: {
          officialWebsite: initialData.links?.officialWebsite || prev.links?.officialWebsite || '',
          notificationPdf: initialData.links?.notificationPdf || prev.links?.notificationPdf || '',
          applyOnline: initialData.links?.applyOnline || prev.links?.applyOnline || ''
        }
      }));
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleVerifyLinks = async () => {
    const applyUrl = formData.links?.applyOnline?.trim();
    const pdfUrl = formData.links?.notificationPdf?.trim();

    if (!applyUrl || !pdfUrl) {
      setVerificationError('Both Apply Online Direct Link and Official Notification PDF must be entered before verifying.');
      return null;
    }

    setVerifyingLinks(true);
    setVerificationError(null);
    try {
      const res = await api.verifyLinks({
        applyOnline: applyUrl,
        notificationPdf: pdfUrl,
        officialWebsite: formData.links?.officialWebsite?.trim()
      });
      setLinkVerification(res);
      if (!res.verified) {
        setVerificationError('One or more mandatory links have issues. Check status messages below.');
      }
      return res;
    } catch (err: any) {
      setVerificationError('Link check failed: ' + err.message);
      return null;
    } finally {
      setVerifyingLinks(false);
    }
  };

  const handleManualPass = (type: 'applyOnline' | 'notificationPdf') => {
    if (!linkVerification) return;
    setLinkVerification(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      if (type === 'applyOnline') {
        updated.applyOnline = {
          ...updated.applyOnline,
          valid: true,
          status: 'verified',
          message: 'Manually verified active by administrator in browser',
          verifiedBy: 'manual',
          checkedAt: new Date().toISOString()
        };
      } else {
        updated.notificationPdf = {
          ...updated.notificationPdf,
          valid: true,
          status: 'verified',
          isPdf: true,
          message: 'Manually verified as direct PDF document by administrator',
          verifiedBy: 'manual',
          checkedAt: new Date().toISOString()
        };
      }
      updated.verified = updated.applyOnline.valid && updated.notificationPdf.valid;
      return updated;
    });
    setVerificationError(null);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setVerificationError(null);
    try {
      const sanitizedDates = {
        ...formData.importantDates,
        applicationStart: formatToDDMMYYYY(formData.importantDates?.applicationStart || getTodayDDMMYYYY()),
        applicationEnd: formatToDDMMYYYY(formData.importantDates?.applicationEnd || getDateAfterDaysDDMMYYYY(30)),
        feeLastDate: formData.importantDates?.feeLastDate ? formatToDDMMYYYY(formData.importantDates.feeLastDate) : undefined,
        admitCardDate: formData.importantDates?.admitCardDate ? formatToDDMMYYYY(formData.importantDates.admitCardDate) : undefined,
        examDate: formData.importantDates?.examDate ? formatToDDMMYYYY(formData.importantDates.examDate) : undefined,
        resultDate: formData.importantDates?.resultDate ? formatToDDMMYYYY(formData.importantDates.resultDate) : undefined
      };
      await onSave({
        ...formData,
        status: 'draft',
        importantDates: sanitizedDates as any,
        linkVerification: linkVerification || undefined,
        queueRemovalReason: 'Saved as Draft by administrator. Verify links before sending for approval.'
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError(null);

    const applyUrl = formData.links?.applyOnline?.trim() || '';
    const pdfUrl = formData.links?.notificationPdf?.trim() || '';

    // Requirement: Must verify Apply Online Direct Link & Official Notification PDF before sending for approval
    if (!applyUrl) {
      setVerificationError('Apply Online Direct Link is required before sending for approval. (You can save as Draft instead).');
      return;
    }
    if (!pdfUrl) {
      setVerificationError('Official Notification PDF is required before sending for approval. (You can save as Draft instead).');
      return;
    }

    let currentVerif = linkVerification;
    const needsVerification = 
      !currentVerif || 
      currentVerif.applyOnline.url !== applyUrl || 
      currentVerif.notificationPdf.url !== pdfUrl ||
      currentVerif.applyOnline.status === 'unchecked' ||
      currentVerif.notificationPdf.status === 'unchecked';

    if (needsVerification) {
      setSaving(true);
      currentVerif = await handleVerifyLinks();
      setSaving(false);
    }

    if (!currentVerif) {
      setVerificationError('Please click "Verify Links Now" before sending for approval.');
      return;
    }

    // Block submission if any link has hard error
    if (currentVerif.applyOnline.status === 'error' || currentVerif.applyOnline.valid === false) {
      setVerificationError(`Cannot send to approval queue: Apply Online link failed verification (${currentVerif.applyOnline.message}). Please fix the link or save as Draft.`);
      return;
    }
    if (currentVerif.notificationPdf.status === 'error' || currentVerif.notificationPdf.valid === false) {
      setVerificationError(`Cannot send to approval queue: Official Notification PDF failed verification (${currentVerif.notificationPdf.message}). Please fix the link or save as Draft.`);
      return;
    }

    setSaving(true);
    try {
      const sanitizedDates = {
        ...formData.importantDates,
        applicationStart: formatToDDMMYYYY(formData.importantDates?.applicationStart || getTodayDDMMYYYY()),
        applicationEnd: formatToDDMMYYYY(formData.importantDates?.applicationEnd || getDateAfterDaysDDMMYYYY(30)),
        feeLastDate: formData.importantDates?.feeLastDate ? formatToDDMMYYYY(formData.importantDates.feeLastDate) : undefined,
        admitCardDate: formData.importantDates?.admitCardDate ? formatToDDMMYYYY(formData.importantDates.admitCardDate) : undefined,
        examDate: formData.importantDates?.examDate ? formatToDDMMYYYY(formData.importantDates.examDate) : undefined,
        resultDate: formData.importantDates?.resultDate ? formatToDDMMYYYY(formData.importantDates.resultDate) : undefined
      };
      await onSave({ 
        ...formData,
        status: 'pending_approval',
        importantDates: sanitizedDates as any,
        linkVerification: currentVerif,
        queueRemovalReason: undefined,
        removedFromQueueAt: undefined
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const applyCheck = linkVerification?.applyOnline;
  const pdfCheck = linkVerification?.notificationPdf;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              {initialData?.id ? 'Edit Exam Notification' : 'Create Exam Notification'}
            </h3>
            <p className="text-xs text-slate-500">
              Strict Gate: Apply Online Link & Notification PDF must be verified before approval submission
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Exam Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. WBPSC West Bengal Civil Services (Exe) Recruitment 2026"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ExamCategory })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Organization & Post */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Recruitment Organization *
              </label>
              <input
                type="text"
                required
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="e.g. Public Service Commission, West Bengal (WBPSC)"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Post Name *
              </label>
              <input
                type="text"
                required
                value={formData.postName}
                onChange={(e) => setFormData({ ...formData, postName: e.target.value })}
                placeholder="e.g. WBCS Group A, B, C & D Officers"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Vacancies & Salary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Total Vacancies *
              </label>
              <input
                type="text"
                required
                value={formData.totalVacancies}
                onChange={(e) => setFormData({ ...formData, totalVacancies: e.target.value })}
                placeholder="e.g. 780 or 14,582"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pay Scale / Salary
              </label>
              <input
                type="text"
                value={formData.salaryRange}
                onChange={(e) => setFormData({ ...formData, salaryRange: e.target.value })}
                placeholder="e.g. ₹56,100 - ₹1,77,500 (Level 10)"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Important Dates (Strict DD-MM-YYYY) */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>Important Dates (Format: DD-MM-YYYY)</span>
              </span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">Strict DD-MM-YYYY</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Application Start *</label>
                <input
                  type="text"
                  required
                  placeholder="DD-MM-YYYY"
                  value={formData.importantDates?.applicationStart}
                  onChange={(e) => setFormData({
                    ...formData,
                    importantDates: { ...formData.importantDates!, applicationStart: e.target.value }
                  })}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Application End (Last Date) *</label>
                <input
                  type="text"
                  required
                  placeholder="DD-MM-YYYY"
                  value={formData.importantDates?.applicationEnd}
                  onChange={(e) => setFormData({
                    ...formData,
                    importantDates: { ...formData.importantDates!, applicationEnd: e.target.value }
                  })}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Fee Last Date</label>
                <input
                  type="text"
                  placeholder="DD-MM-YYYY"
                  value={formData.importantDates?.feeLastDate || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    importantDates: { ...formData.importantDates!, feeLastDate: e.target.value }
                  })}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Exam Date</label>
                <input
                  type="text"
                  placeholder="DD-MM-YYYY or Month"
                  value={formData.importantDates?.examDate || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    importantDates: { ...formData.importantDates!, examDate: e.target.value }
                  })}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Eligibility & Age */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Minimum Educational Qualification *
              </label>
              <textarea
                rows={2}
                required
                value={formData.eligibility?.minQualification}
                onChange={(e) => setFormData({
                  ...formData,
                  eligibility: { ...formData.eligibility!, minQualification: e.target.value }
                })}
                placeholder="e.g. Bachelor's Degree in any discipline from recognized University"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Age Limit & Relaxation *
              </label>
              <textarea
                rows={2}
                required
                value={formData.eligibility?.ageLimit}
                onChange={(e) => setFormData({
                  ...formData,
                  eligibility: { ...formData.eligibility!, ageLimit: e.target.value }
                })}
                placeholder="e.g. 21 to 36 years. Upper age relaxable by 5 years for SC/ST"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CRITICAL: Mandatory Link Verification Gate (Apply Online & Notification PDF) */}
          {/* ========================================================================= */}
          <div className="bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-950 p-4 rounded-xl border-2 border-indigo-200 dark:border-indigo-800/80 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-800/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                    Mandatory Link Verification Gate
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Verify <span className="font-semibold text-indigo-600 dark:text-indigo-400">Apply Online Direct Link</span> and <span className="font-semibold text-indigo-600 dark:text-indigo-400">Official Notification PDF</span> before sending for approval.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleVerifyLinks}
                disabled={verifyingLinks}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0 shadow-xs"
              >
                {verifyingLinks ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Pinging URLs...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Verify Links Now</span>
                  </>
                )}
              </button>
            </div>

            {verificationError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-lg p-2.5 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">{verificationError}</div>
              </div>
            )}

            {/* Link 1: Apply Online Direct Link */}
            <div className="space-y-1.5 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  <span>Apply Online Direct Link *</span>
                </label>
                
                {/* Status Badge */}
                {applyCheck ? (
                  applyCheck.status === 'verified' ? (
                    <span className="bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>Verified {applyCheck.statusCode ? `(${applyCheck.statusCode} OK)` : ''}</span>
                    </span>
                  ) : applyCheck.status === 'warning' ? (
                    <span className="bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      <span>Protected / WAF Warning</span>
                    </span>
                  ) : applyCheck.status === 'error' ? (
                    <span className="bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-500" />
                      <span>Verification Failed</span>
                    </span>
                  ) : (
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-[10px] font-medium">
                      Unverified
                    </span>
                  )
                ) : (
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-[10px] font-medium">
                    Unchecked
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  value={formData.links?.applyOnline}
                  onChange={(e) => {
                    const newUrl = e.target.value;
                    setFormData({
                      ...formData,
                      links: { ...formData.links!, applyOnline: newUrl }
                    });
                    if (linkVerification && linkVerification.applyOnline.url !== newUrl) {
                      setLinkVerification({
                        ...linkVerification,
                        applyOnline: { url: newUrl, valid: false, status: 'unchecked', message: 'URL modified. Click Verify Links' }
                      });
                    }
                  }}
                  placeholder="https://psc.wb.gov.in/apply-online"
                  className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white text-xs font-mono"
                />
                {formData.links?.applyOnline && (
                  <a
                    href={formData.links.applyOnline}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                    title="Open in new tab to test"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open</span>
                  </a>
                )}
              </div>

              {applyCheck && (
                <div className="text-[11px] flex flex-wrap items-center justify-between gap-1 mt-1 text-slate-600 dark:text-slate-400">
                  <span className={applyCheck.status === 'error' ? 'text-rose-600 font-semibold' : applyCheck.status === 'warning' ? 'text-amber-600' : 'text-emerald-600'}>
                    {applyCheck.message}
                  </span>
                  {applyCheck.status === 'warning' && (
                    <button
                      type="button"
                      onClick={() => handleManualPass('applyOnline')}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 underline font-semibold hover:text-indigo-800"
                    >
                      Confirm link opened in browser
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Link 2: Official Notification PDF */}
            <div className="space-y-1.5 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                  <span>Official Notification PDF *</span>
                </label>

                {/* Status Badge */}
                {pdfCheck ? (
                  pdfCheck.status === 'verified' ? (
                    <span className="bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>Verified PDF {pdfCheck.statusCode ? `(${pdfCheck.statusCode})` : ''}</span>
                    </span>
                  ) : pdfCheck.status === 'warning' ? (
                    <span className="bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      <span>Review Notice / WAF</span>
                    </span>
                  ) : pdfCheck.status === 'error' ? (
                    <span className="bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-500" />
                      <span>PDF Link Dead</span>
                    </span>
                  ) : (
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-[10px] font-medium">
                      Unverified
                    </span>
                  )
                ) : (
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-[10px] font-medium">
                    Unchecked
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  value={formData.links?.notificationPdf}
                  onChange={(e) => {
                    const newUrl = e.target.value;
                    setFormData({
                      ...formData,
                      links: { ...formData.links!, notificationPdf: newUrl }
                    });
                    if (linkVerification && linkVerification.notificationPdf.url !== newUrl) {
                      setLinkVerification({
                        ...linkVerification,
                        notificationPdf: { url: newUrl, valid: false, status: 'unchecked', message: 'URL modified. Click Verify Links' }
                      });
                    }
                  }}
                  placeholder="https://psc.wb.gov.in/static/advt_wbcs_2026.pdf"
                  className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white text-xs font-mono"
                />
                {formData.links?.notificationPdf && (
                  <a
                    href={formData.links.notificationPdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                    title="Open PDF in new tab"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Open PDF</span>
                  </a>
                )}
              </div>

              {pdfCheck && (
                <div className="text-[11px] flex flex-wrap items-center justify-between gap-1 mt-1 text-slate-600 dark:text-slate-400">
                  <span className={pdfCheck.status === 'error' ? 'text-rose-600 font-semibold' : pdfCheck.status === 'warning' ? 'text-amber-600' : 'text-emerald-600'}>
                    {pdfCheck.message}
                  </span>
                  {pdfCheck.status === 'warning' && (
                    <button
                      type="button"
                      onClick={() => handleManualPass('notificationPdf')}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 underline font-semibold hover:text-indigo-800"
                    >
                      Confirm PDF opened in browser
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Link 3: Official Website */}
            <div className="space-y-1 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <label className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                Official Website Portal (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.links?.officialWebsite}
                  onChange={(e) => setFormData({
                    ...formData,
                    links: { ...formData.links!, officialWebsite: e.target.value }
                  })}
                  placeholder="https://psc.wb.gov.in"
                  className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white text-xs font-mono"
                />
                {formData.links?.officialWebsite && (
                  <a
                    href={formData.links.officialWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

          </div>

          {/* Summary & ESC Mentoring notes */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Brief Summary for Candidates
            </label>
            <textarea
              rows={2}
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="High quality overview of the recruitment for students..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-blue-600 dark:text-blue-400 mb-1">
              ESC Kolkata Mentoring & Guidance Callout
            </label>
            <input
              type="text"
              value={formData.escGuidanceNotes}
              onChange={(e) => setFormData({ ...formData, escGuidanceNotes: e.target.value })}
              placeholder="Advice for students preparing at ESC Kolkata Employment School..."
              className="w-full px-3 py-2 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-slate-900 dark:text-white text-xs"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Verifies Apply Online Link & PDF before queueing for admin approval</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving || verifyingLinks}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                title="Save as Draft without sending to approval queue"
              >
                Save as Draft
              </button>
              <button
                type="submit"
                disabled={saving || verifyingLinks}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying & Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Verify & Queue for Approval</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
