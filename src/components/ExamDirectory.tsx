import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Users, 
  Briefcase, 
  GraduationCap, 
  ArrowUpRight, 
  Clock, 
  CheckCircle, 
  FileText, 
  Globe, 
  ChevronRight, 
  LayoutGrid, 
  List, 
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Send,
  Building2,
  Tag,
  AlertTriangle
} from 'lucide-react';
import { ExamNotification, ExamCategory, ExamStatus } from '../types/exam';
import { formatToDDMMYYYY, getDaysRemaining } from '../utils/date';

interface ExamDirectoryProps {
  exams: ExamNotification[];
  onSelectExam: (exam: ExamNotification) => void;
  onApproveExam: (exam: ExamNotification) => void;
  onPublishToWp: (exam: ExamNotification) => void;
  onPreviewWp: (exam: ExamNotification) => void;
  onDispatchAlerts: (exam: ExamNotification) => void;
}

const CATEGORIES: { label: string; value: 'ALL' | ExamCategory }[] = [
  { label: 'All Exams', value: 'ALL' },
  { label: 'State PSC (WBPSC)', value: 'State PSC' },
  { label: 'SSC', value: 'SSC' },
  { label: 'Banking', value: 'Banking' },
  { label: 'Railways', value: 'Railways' },
  { label: 'UPSC / IAS', value: 'UPSC' },
  { label: 'Police & Defense', value: 'Police' },
  { label: 'Teaching', value: 'Teaching' },
  { label: 'PSU & Tech', value: 'PSU' }
];

export const ExamDirectory: React.FC<ExamDirectoryProps> = ({
  exams,
  onSelectExam,
  onApproveExam,
  onPublishToWp,
  onPreviewWp,
  onDispatchAlerts
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ExamCategory>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedQual, setSelectedQual] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Compute directory metrics
  const metrics = useMemo(() => {
    let totalVacanciesCount = 0;
    let pendingApprovals = 0;
    let publishedCount = 0;
    let activeOpenings = 0;

    const today = new Date().toISOString().split('T')[0];

    exams.forEach(e => {
      const v = typeof e.totalVacancies === 'number' ? e.totalVacancies : parseInt(String(e.totalVacancies).replace(/[^0-9]/g, '')) || 0;
      totalVacanciesCount += v;
      if (e.status === 'pending_approval') pendingApprovals++;
      if (e.status === 'published') publishedCount++;
      const daysLeft = getDaysRemaining(e.importantDates.applicationEnd);
      if (daysLeft === null || daysLeft >= 0) activeOpenings++;
    });

    return { totalVacanciesCount, pendingApprovals, publishedCount, activeOpenings };
  }, [exams]);

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      const matchesSearch = 
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.postName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.eligibility.minQualification.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat = selectedCategory === 'ALL' || e.category === selectedCategory;

      let matchesStatus = true;
      if (selectedStatus === 'ACTIVE') {
        const daysLeft = getDaysRemaining(e.importantDates.applicationEnd);
        matchesStatus = daysLeft === null || daysLeft >= 0;
      } else if (selectedStatus === 'PENDING') {
        matchesStatus = e.status === 'pending_approval';
      } else if (selectedStatus === 'DRAFT') {
        matchesStatus = e.status === 'draft';
      } else if (selectedStatus === 'PUBLISHED') {
        matchesStatus = e.status === 'published';
      } else if (selectedStatus === 'APPROVED') {
        matchesStatus = e.status === 'approved';
      }

      let matchesQual = true;
      if (selectedQual === 'GRADUATE') {
        matchesQual = e.eligibility.minQualification.toLowerCase().includes('graduate') || e.eligibility.minQualification.toLowerCase().includes('bachelor') || e.eligibility.minQualification.toLowerCase().includes('degree');
      } else if (selectedQual === '12TH') {
        matchesQual = e.eligibility.minQualification.toLowerCase().includes('12th') || e.eligibility.minQualification.toLowerCase().includes('higher secondary') || e.eligibility.minQualification.toLowerCase().includes('10+2');
      } else if (selectedQual === '10TH') {
        matchesQual = e.eligibility.minQualification.toLowerCase().includes('10th') || e.eligibility.minQualification.toLowerCase().includes('matriculation') || e.eligibility.minQualification.toLowerCase().includes('secondary');
      }

      return matchesSearch && matchesCat && matchesStatus && matchesQual;
    });
  }, [exams, searchTerm, selectedCategory, selectedStatus, selectedQual]);

  return (
    <div className="space-y-6">
      
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Openings</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {metrics.activeOpenings}
            </span>
            <span className="text-xs text-slate-500">exams open</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Vacancies</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
              {metrics.totalVacanciesCount.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">posts tracked</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-500 tracking-tight">
              {metrics.pendingApprovals}
            </span>
            <span className="text-xs text-slate-500">awaiting your review</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Published on WP</span>
            <Globe className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {metrics.publishedCount}
            </span>
            <span className="text-xs text-slate-500">live on website</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Category Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-4">
        
        {/* Search & Top Action Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by exam, department, qualification (e.g. WBPSC, SSC CGL, Graduate, Police)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Qualification Filter */}
            <select
              value={selectedQual}
              onChange={(e) => setSelectedQual(e.target.value)}
              aria-label="Filter by Minimum Qualification"
              className="text-xs py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Qualifications</option>
              <option value="GRADUATE">Graduate / Degree</option>
              <option value="12TH">12th Pass (Higher Sec)</option>
              <option value="10TH">10th Pass (Secondary)</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Filter by Application Status"
              className="text-xs py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active (Ongoing)</option>
              <option value="PENDING">Pending Review</option>
              <option value="DRAFT">Drafts / Removed from Queue</option>
              <option value="APPROVED">Approved</option>
              <option value="PUBLISHED">Published on WP</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-950">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs' : 'text-slate-400'}`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs' : 'text-slate-400'}`}
                title="Table List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Horizontal Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs border-t border-slate-100 dark:border-slate-800/60 pt-3">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Category:</span>
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1 rounded-md whitespace-nowrap font-medium transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Content List */}
      {filteredExams.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No exam notifications match your criteria</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search terms or clear active filters to view all competitive examination alerts.
          </p>
          <button
            onClick={() => { setSearchTerm(''); setSelectedCategory('ALL'); setSelectedStatus('ALL'); setSelectedQual('ALL'); }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-500 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredExams.map((exam) => {
            const daysRemaining = getDaysRemaining(exam.importantDates.applicationEnd);
            const isClosingSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;
            const isExpired = daysRemaining !== null && daysRemaining < 0;

            return (
              <div
                key={exam.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col justify-between shadow-xs hover:shadow-md group"
              >
                <div>
                  {/* Category & Status Bar */}
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-blue-600 dark:text-blue-400 tracking-wide">
                      {exam.category}
                    </span>

                    {/* Status Badge */}
                    <div>
                      {exam.status === 'published' ? (
                        <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          <span>Live on ESC Site</span>
                        </span>
                      ) : exam.status === 'approved' ? (
                        <span className="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-blue-500" />
                          <span>Approved & Queued</span>
                        </span>
                      ) : exam.status === 'pending_approval' ? (
                        <span className="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 animate-pulse">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Needs Your Approval</span>
                        </span>
                      ) : exam.status === 'draft' && exam.queueRemovalReason ? (
                        <span 
                          className="text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1"
                          title={exam.queueRemovalReason}
                        >
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                          <span>Removed from Queue</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                          Draft
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Organization & Title */}
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{exam.organization}</span>
                  </div>

                  <h3 
                    onClick={() => onSelectExam(exam)}
                    className="font-bold text-base text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 cursor-pointer transition-colors"
                  >
                    {exam.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {exam.postName}
                  </p>

                  {/* Highlights Grid */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Vacancies</span>
                      <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                        {exam.totalVacancies} Posts
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800/60">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Last Date</span>
                      <span className={`text-xs font-bold ${isClosingSoon ? 'text-amber-600 dark:text-amber-400' : isExpired ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}`}>
                        {formatToDDMMYYYY(exam.importantDates.applicationEnd)}
                      </span>
                      {daysRemaining !== null && daysRemaining >= 0 && (
                        <span className="text-[10px] text-slate-400 block">
                          ({daysRemaining} days left)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Qualification snippet */}
                  <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{exam.eligibility.minQualification}</span>
                  </div>

                  {/* Salary & Age snippet */}
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Pay: {exam.salaryRange}</span>
                  </div>

                  {/* Mandatory Link Verification Strip */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-400">
                      <ShieldCheck className="w-3 h-3 text-indigo-500" />
                      <span>Links:</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-0.5 ${exam.linkVerification?.applyOnline.valid ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}`}>
                        <span>Apply</span>
                        {exam.linkVerification?.applyOnline.valid ? '✓' : '•'}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <span className={`flex items-center gap-0.5 ${exam.linkVerification?.notificationPdf.valid ? 'text-purple-600 dark:text-purple-400 font-medium' : 'text-slate-400'}`}>
                        <span>Notice PDF</span>
                        {exam.linkVerification?.notificationPdf.valid ? '✓' : '•'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectExam(exam)}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>View Details</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* If pending, show quick approve button */}
                    {exam.status === 'pending_approval' && (
                      <button
                        onClick={() => onApproveExam(exam)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1 transition-all"
                        title="Approve and Publish to WordPress"
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>Approve</span>
                      </button>
                    )}

                    {/* Preview post on WP */}
                    <button
                      onClick={() => onPreviewWp(exam)}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium px-2 py-1.5 rounded-md transition-all"
                      title="Preview WordPress Article Layout"
                    >
                      <Globe className="w-3 h-3" />
                    </button>

                    {/* Dispatch Alert button */}
                    <button
                      onClick={() => onDispatchAlerts(exam)}
                      className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 text-[11px] font-medium px-2 py-1.5 rounded-md transition-all"
                      title="Send Test Alert to Admin Email / WhatsApp / Telegram"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table / List View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Exam / Post</th>
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4 text-center">Vacancies</th>
                  <th className="py-3 px-4">Last Date</th>
                  <th className="py-3 px-4">Qualification</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div 
                        onClick={() => onSelectExam(exam)}
                        className="font-bold text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {exam.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{exam.postName}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {exam.organization}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-blue-600 dark:text-blue-400">
                      {exam.totalVacancies}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {formatToDDMMYYYY(exam.importantDates.applicationEnd)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {exam.eligibility.minQualification}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        {exam.status === 'published' ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] block">
                            Published
                          </span>
                        ) : exam.status === 'pending_approval' ? (
                          <span className="text-amber-600 font-semibold text-[11px] animate-pulse block">
                            Pending Approval
                          </span>
                        ) : exam.status === 'draft' && exam.queueRemovalReason ? (
                          <span className="text-rose-600 font-semibold text-[11px] block" title={exam.queueRemovalReason}>
                            Removed from Queue
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium text-[11px] block">{exam.status}</span>
                        )}
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span>{exam.linkVerification?.applyOnline.valid && exam.linkVerification?.notificationPdf.valid ? 'Links Verified' : 'Links Check'}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectExam(exam)}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded text-[11px] font-medium"
                        >
                          Details
                        </button>
                        {exam.status === 'pending_approval' && (
                          <button
                            onClick={() => onApproveExam(exam)}
                            className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-semibold"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
