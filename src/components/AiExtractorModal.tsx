import React, { useState } from 'react';
import { Sparkles, X, ArrowRight, CheckCircle2, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { ExamNotification } from '../types/exam';
import { formatToDDMMYYYY } from '../utils/date';
import { api } from '../services/api';

interface AiExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtracted: (exam: Partial<ExamNotification>) => void;
  onExtractApi: (rawText: string, sourceUrl?: string) => Promise<{ exam: Partial<ExamNotification>; source: string }>;
}

const SAMPLE_CIRCULAR = `WEST BENGAL AUDIT AND ACCOUNTS SERVICE RECRUITMENT EXAMINATION, 2026
Advertisement No. 12/2026
Public Service Commission, West Bengal (WBPSC) invites online applications from eligible Indian citizens for recruitment to 225 vacancies in West Bengal Audit and Accounts Service in Pay Level 16 (Rs. 56,100 - 1,44,300).
Eligibility: Bachelor’s degree in Commerce from a recognized University or Member of the Institute of Chartered Accountants of India or Member of the Institute of Cost Accountants of India.
Age Limit: Not more than 36 years as on 01.01.2026. Upper age limit relaxable by 5 years for SC/ST and 3 years for BC of West Bengal.
Important Dates: Online application commences on 1st November 2026. Closing date for submission of online application: 30th November 2026. Last date for payment of fees: 1st December 2026. Preliminary Examination will be held tentatively in February 2027.
Application Fee: Rs. 210/- only + service charges. SC/ST of West Bengal and PwD (40% and above) are exempted from payment of fee.
Selection Process: Preliminary Examination (200 marks, MCQ), Main Examination (Written 800 marks), Personality Test (200 marks).
Website: https://psc.wb.gov.in`;

export const AiExtractorModal: React.FC<AiExtractorModalProps> = ({
  isOpen,
  onClose,
  onExtracted,
  onExtractApi
}) => {
  const [rawText, setRawText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExtract = async () => {
    if (!rawText.trim()) {
      setError('Please paste raw notification text or circular');
      return;
    }
    setLoading(true);
    setError(null);
    setStatusText('Extracting notification metadata with Gemini...');
    try {
      const res = await onExtractApi(rawText, sourceUrl);
      const extracted = res.exam;
      if (extracted.importantDates) {
        extracted.importantDates = {
          ...extracted.importantDates,
          applicationStart: formatToDDMMYYYY(extracted.importantDates.applicationStart),
          applicationEnd: formatToDDMMYYYY(extracted.importantDates.applicationEnd),
          feeLastDate: extracted.importantDates.feeLastDate ? formatToDDMMYYYY(extracted.importantDates.feeLastDate) : undefined,
          admitCardDate: extracted.importantDates.admitCardDate ? formatToDDMMYYYY(extracted.importantDates.admitCardDate) : undefined,
          examDate: extracted.importantDates.examDate ? formatToDDMMYYYY(extracted.importantDates.examDate) : undefined,
        };
      }

      // Automatically verify extracted links before passing to editor
      if (extracted.links?.applyOnline || extracted.links?.notificationPdf) {
        setStatusText('Verifying Apply Online Link and Notification PDF...');
        try {
          const verif = await api.verifyLinks({
            applyOnline: extracted.links?.applyOnline,
            notificationPdf: extracted.links?.notificationPdf,
            officialWebsite: extracted.links?.officialWebsite
          });
          extracted.linkVerification = verif;
        } catch (verifErr) {
          console.warn('Auto link verification on extract failed:', verifErr);
        }
      }

      onExtracted(extracted);
      onClose();
    } catch (err: any) {
      setError(err.message || 'AI extraction failed. Please try again.');
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  const loadSample = () => {
    setRawText(SAMPLE_CIRCULAR);
    setSourceUrl('https://psc.wb.gov.in');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">AI Notice & Circular Extractor</h3>
              <p className="text-xs text-slate-500">Extract structured vacancy data from any PDF text or official announcement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Paste Raw Notification / Circular Text
            </label>
            <button
              onClick={loadSample}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Load Sample WBPSC Circular
            </button>
          </div>

          <textarea
            rows={8}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste notification text here from employment newspapers, official PDF announcements, or recruitment website updates..."
            className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Source Website / Official Notice URL (Optional)
            </label>
            <input
              type="text"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="e.g. https://psc.wb.gov.in"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1.5">
            {loading && statusText && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{statusText}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleExtract}
              disabled={loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <Sparkles className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Processing...' : 'Extract Structured Notice'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
