import React, { useState } from 'react';
import { 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  ExternalLink, 
  FileText, 
  Settings, 
  Check, 
  HelpCircle,
  Eye,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight,
  Code,
  Copy,
  Calendar
} from 'lucide-react';
import { AppConfig, ExamNotification } from '../types/exam';
import { api } from '../services/api';
import { formatToDDMMYYYY } from '../utils/date';

interface WordPressEngineViewProps {
  config: AppConfig | null;
  onUpdateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
  onTestConnection: (creds: { siteUrl: string; username: string; applicationPassword: string }) => Promise<any>;
  exams: ExamNotification[];
  onPublishToWp: (exam: ExamNotification) => Promise<any>;
  onPreviewWp: (exam: ExamNotification) => void;
  onSyncJobVacanciesPage?: () => Promise<any>;
}

export const WordPressEngineView: React.FC<WordPressEngineViewProps> = ({
  config,
  onUpdateConfig,
  onTestConnection,
  exams,
  onPublishToWp,
  onPreviewWp,
  onSyncJobVacanciesPage
}) => {
  const [siteUrl, setSiteUrl] = useState(config?.wordpress.siteUrl || 'https://esckolkata2003.org');
  const [apiEndpoint, setApiEndpoint] = useState(config?.wordpress.apiEndpoint || 'https://esckolkata2003.org/wp-json/wp/v2/posts');
  const [jobVacanciesPageSlug, setJobVacanciesPageSlug] = useState(config?.wordpress.jobVacanciesPageSlug || 'job-vacancies');
  const [jobVacanciesPageUrl, setJobVacanciesPageUrl] = useState(config?.wordpress.jobVacanciesPageUrl || 'https://esckolkata2003.org/job-vacancies/');
  const [username, setUsername] = useState(config?.wordpress.username || 'esc_admin');
  const [appPassword, setAppPassword] = useState(config?.wordpress.applicationPassword || '');
  const [postStatus, setPostStatus] = useState<'publish' | 'draft'>(config?.wordpress.postStatus || 'publish');
  const [autoPublish, setAutoPublish] = useState<boolean>(config?.wordpress.autoPublishOnApproval ?? true);
  const [autoSyncPage, setAutoSyncPage] = useState<boolean>(config?.wordpress.autoSyncJobVacanciesPage ?? true);
  
  // States for connection testing
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);

  // States for Job Vacancies Page sync & preview
  const [syncingPage, setSyncingPage] = useState(false);
  const [syncPageResult, setSyncPageResult] = useState<{ success: boolean; pageUrl?: string; message?: string; error?: string } | null>(null);
  const [showPagePreviewModal, setShowPagePreviewModal] = useState(false);
  const [pagePreviewHtml, setPagePreviewHtml] = useState<string>('');
  const [loadingPagePreview, setLoadingPagePreview] = useState(false);
  const [pagePreviewTab, setPagePreviewTab] = useState<'render' | 'html'>('render');
  const [copiedHtml, setCopiedHtml] = useState(false);

  const approvedExams = exams.filter(e => e.status === 'approved' || e.status === 'published');
  const publishedExams = exams.filter(e => e.status === 'published' || e.wpPostId);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection({
        siteUrl,
        username,
        applicationPassword: appPassword
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateConfig({
        wordpress: {
          siteUrl,
          apiEndpoint,
          jobVacanciesPageSlug,
          jobVacanciesPageUrl,
          username,
          applicationPassword: appPassword,
          postStatus,
          defaultCategory: 'Exams & Notifications',
          authorId: 1,
          autoPublishOnApproval: autoPublish,
          autoSyncJobVacanciesPage: autoSyncPage
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncVacanciesPage = async () => {
    setSyncingPage(true);
    setSyncPageResult(null);
    try {
      if (onSyncJobVacanciesPage) {
        const res = await onSyncJobVacanciesPage();
        setSyncPageResult(res);
      } else {
        const res = await api.syncJobVacanciesPage();
        setSyncPageResult(res);
      }
    } catch (err: any) {
      setSyncPageResult({ success: false, error: err.message });
    } finally {
      setSyncingPage(false);
    }
  };

  const handleOpenPagePreview = async () => {
    setShowPagePreviewModal(true);
    setLoadingPagePreview(true);
    try {
      const html = await api.getJobVacanciesPreviewHtml();
      setPagePreviewHtml(html);
    } catch (err: any) {
      setPagePreviewHtml(`<div style="color:red; padding:20px;">Failed to generate preview: ${err.message}</div>`);
    } finally {
      setLoadingPagePreview(false);
    }
  };

  const handleCopyPageHtml = () => {
    navigator.clipboard.writeText(pagePreviewHtml);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
            <Globe className="w-4 h-4" />
            <span>WordPress Publishing Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">ESC Kolkata (esckolkata2003.org) Integration</h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Manage single post publishing and automatic synchronization of approved notifications directly into your target page: <span className="text-blue-400 font-mono font-semibold">https://esckolkata2003.org/job-vacancies/</span>. All dates are formatted strictly as <strong className="text-amber-300">DD-MM-YYYY</strong>.
          </p>
        </div>

        <a
          href="https://esckolkata2003.org"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all border border-slate-700 shrink-0"
        >
          <span>Visit esckolkata2003.org</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Primary Highlight Card: Job Vacancies Page (https://esckolkata2003.org/job-vacancies/) */}
      <div className="bg-gradient-to-br from-blue-900/30 via-slate-900 to-slate-900 border-2 border-blue-600/40 rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Target Page Destination
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" />
                <span>Strict Date Standard: <strong>DD-MM-YYYY</strong></span>
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              <span>Job Vacancies Page: <code className="text-blue-300 font-mono text-base font-semibold">/job-vacancies/</code></span>
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              All approved and published exam notifications are compiled into a comprehensive directory table and detailed cards at{' '}
              <a 
                href={jobVacanciesPageUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 underline font-mono font-semibold inline-flex items-center gap-0.5"
              >
                <span>{jobVacanciesPageUrl}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              . Includes quick-apply links, eligibility criteria, vacancy breakdowns, and ESC student guidance notes.
            </p>

            <div className="flex items-center gap-3 pt-1 text-xs text-slate-300">
              <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
                <span className="text-slate-400">Ready to Display:</span>
                <strong className="text-emerald-400 font-bold">{approvedExams.length} Approved Notifications</strong>
              </div>
              <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
                <span className="text-slate-400">Auto-Sync on Approval:</span>
                <span className={`font-semibold ${autoSyncPage ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {autoSyncPage ? 'Enabled' : 'Manual Only'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 w-full lg:w-auto shrink-0">
            <button
              onClick={handleSyncVacanciesPage}
              disabled={syncingPage}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${syncingPage ? 'animate-spin' : ''}`} />
              <span>{syncingPage ? 'Syncing to /job-vacancies/...' : 'Sync Approved Jobs to Page Now'}</span>
            </button>

            <button
              onClick={handleOpenPagePreview}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-slate-700"
            >
              <Eye className="w-4 h-4 text-blue-400" />
              <span>Preview /job-vacancies/ Page</span>
            </button>

            <a
              href={jobVacanciesPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all border border-slate-800"
            >
              <span>Open live page</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Sync Page Feedback Message */}
        {syncPageResult && (
          <div className={`mt-4 p-3.5 rounded-xl text-xs flex items-start justify-between gap-3 ${
            syncPageResult.success
              ? 'bg-emerald-950/70 border border-emerald-600/50 text-emerald-200'
              : 'bg-rose-950/70 border border-rose-600/50 text-rose-200'
          }`}>
            <div className="flex items-start gap-2.5">
              {syncPageResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold">
                  {syncPageResult.success 
                    ? `Successfully synchronized ${approvedExams.length} approved jobs to ${jobVacanciesPageUrl}` 
                    : 'Job Vacancies Page Sync Encountered an Error'}
                </div>
                <div className="text-[11px] mt-0.5 text-slate-300">
                  {syncPageResult.message || syncPageResult.error || 'The page content has been updated with the latest approved exam notifications in strict DD-MM-YYYY format.'}
                </div>
              </div>
            </div>

            {syncPageResult.pageUrl && (
              <a
                href={syncPageResult.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
              >
                <span>View Live Page</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Connection & Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form: API Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-500" />
              <span>WordPress REST API Credentials & Targets</span>
            </h4>

            {/* Site URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                WordPress Website Base URL
              </label>
              <input
                type="text"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://esckolkata2003.org"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Job Vacancies Page Slug & Target URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Job Vacancies Page Slug
                </label>
                <input
                  type="text"
                  value={jobVacanciesPageSlug}
                  onChange={(e) => {
                    const slug = e.target.value;
                    setJobVacanciesPageSlug(slug);
                    setJobVacanciesPageUrl(`${siteUrl.replace(/\/$/, '')}/${slug}/`);
                  }}
                  placeholder="job-vacancies"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">WP Page slug to update or create</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Job Vacancies Full URL
                </label>
                <input
                  type="text"
                  value={jobVacanciesPageUrl}
                  onChange={(e) => setJobVacanciesPageUrl(e.target.value)}
                  placeholder="https://esckolkata2003.org/job-vacancies/"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Frontend page link on website</span>
              </div>
            </div>

            {/* REST API Posts Endpoint */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                REST API Posts Endpoint (for individual notifications)
              </label>
              <input
                type="text"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                placeholder="https://esckolkata2003.org/wp-json/wp/v2/posts"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Username & App Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  WordPress Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. esc_admin"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Application Password
                  </label>
                  <button
                    onClick={() => setShowHowTo(!showHowTo)}
                    className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>How to generate?</span>
                  </button>
                </div>
                <input
                  type="password"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* How to generate tooltip / guide */}
            {showHowTo && (
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 p-3.5 rounded-lg text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>How to generate a WordPress Application Password for esckolkata2003.org:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                  <li>Log in to your WordPress Admin dashboard (<span className="font-mono">https://esckolkata2003.org/wp-admin</span>).</li>
                  <li>Go to <strong>Users &rarr; Profile</strong> (or Edit User for your admin account).</li>
                  <li>Scroll down to the <strong>"Application Passwords"</strong> section.</li>
                  <li>Enter an application name (e.g. <span className="font-mono">ExamTrack App</span>) and click <strong>"Add New Application Password"</strong>.</li>
                  <li>Copy the generated 24-character password and paste it into the Application Password field above.</li>
                </ol>
              </div>
            )}

            {/* Publishing & Page Sync Automation Toggles */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
              
              {/* Auto sync /job-vacancies/ page */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Auto-Sync /job-vacancies/ Page on Approval
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Immediately update https://esckolkata2003.org/job-vacancies/ whenever an exam is approved
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSyncPage}
                    onChange={(e) => setAutoSyncPage(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Auto publish individual post */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Auto-Publish Individual Post on Approval
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Create standalone dedicated article when approved via Email, WhatsApp, or Telegram
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPublish}
                    onChange={(e) => setAutoPublish(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Published Post Status
                </label>
                <select
                  value={postStatus}
                  onChange={(e) => setPostStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                >
                  <option value="publish">Publish Immediately (Publicly Visible)</option>
                  <option value="draft">Save as Draft in WordPress (For final editorial pass)</option>
                </select>
              </div>
            </div>

            {/* Test Connection & Save Action Buttons */}
            <div className="flex items-center gap-3 pt-3">
              <button
                onClick={handleTest}
                disabled={testing}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Connecting to WP...' : 'Test Connection'}</span>
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>

              {saveSuccess && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </span>
              )}
            </div>

            {/* Test Result Message */}
            {testResult && (
              <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{testResult.success ? 'Connection Successful' : 'Connection Failed'}</div>
                  <div className="mt-0.5">{testResult.message || testResult.error}</div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Form: Page and Post Structure Highlights (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Post Template Highlights */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              <span>Standard Post & Page Structure</span>
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every post and the aggregated <code className="text-blue-500">/job-vacancies/</code> page are generated with Gutenberg-ready responsive HTML blocks:
            </p>

            <ul className="text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>ESC Kolkata Employment School Header Banner</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Strict Date Formatting: <strong>DD-MM-YYYY</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>Summary Table of Active Jobs with Apply / Notice links</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>Total Vacancy Count & Pay Scale Highlights</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>Eligibility Criteria & Age Relaxation Matrix</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>Application Fee Table by Category</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>ESC Mentoring Notes for deserving students</span>
              </li>
            </ul>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleOpenPagePreview}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-blue-200 dark:border-blue-900"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Preview /job-vacancies/ Page</span>
              </button>

              <button
                onClick={() => onPreviewWp(exams[0])}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Single Post Template</span>
              </button>
            </div>
          </div>

          {/* Published Individual Posts on esckolkata2003.org */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              <span>Live on esckolkata2003.org</span>
            </h4>

            {publishedExams.length === 0 ? (
              <p className="text-xs text-slate-500">No exams published to WordPress yet.</p>
            ) : (
              <div className="space-y-2">
                {publishedExams.map((exam) => (
                  <div key={exam.id} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-2">
                    <div className="truncate">
                      <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{exam.title}</div>
                      <div className="text-[10px] text-slate-400">
                        ID: {exam.wpPostId || 'Published'} • {exam.totalVacancies} posts • End: {formatToDDMMYYYY(exam.importantDates?.applicationEnd)}
                      </div>
                    </div>
                    {exam.wpPostUrl && (
                      <a
                        href={exam.wpPostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-400 shrink-0 font-semibold text-[11px] flex items-center gap-1"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal: Job Vacancies Page Preview */}
      {showPagePreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scaleIn">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Preview: https://esckolkata2003.org/job-vacancies/
                  </h3>
                  <p className="text-xs text-slate-500">
                    Compiled HTML for {approvedExams.length} approved job vacancies with strict DD-MM-YYYY dates
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => setPagePreviewTab('render')}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                      pagePreviewTab === 'render' 
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' 
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Visual Preview
                  </button>
                  <button
                    onClick={() => setPagePreviewTab('html')}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                      pagePreviewTab === 'html' 
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' 
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    HTML Code
                  </button>
                </div>

                <button
                  onClick={() => setShowPagePreviewModal(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 flex items-center justify-center text-lg"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950">
              {loadingPagePreview ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] space-y-2">
                  <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
                  <p className="text-xs text-slate-400">Rendering Job Vacancies page structure...</p>
                </div>
              ) : pagePreviewTab === 'render' ? (
                <div 
                  className="bg-white rounded-xl shadow-xs overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: pagePreviewHtml }} 
                />
              ) : (
                <div className="relative">
                  <button
                    onClick={handleCopyPageHtml}
                    className="absolute top-3 right-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    {copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedHtml ? 'Copied!' : 'Copy Gutenberg HTML'}</span>
                  </button>
                  <pre className="p-4 bg-slate-900 text-slate-200 font-mono text-xs rounded-xl overflow-x-auto whitespace-pre-wrap max-h-[500px]">
                    {pagePreviewHtml}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                This exact content will be pushed to the WordPress page ID corresponding to <code className="text-blue-500">job-vacancies</code>.
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPagePreviewModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    setShowPagePreviewModal(false);
                    await handleSyncVacanciesPage();
                  }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync to Live Site Now</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
