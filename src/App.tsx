/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ExamDirectory } from './components/ExamDirectory';
import { ApprovalQueue } from './components/ApprovalQueue';
import { NotificationChannelsView } from './components/NotificationChannelsView';
import { WordPressEngineView } from './components/WordPressEngineView';
import { AuditLogsView } from './components/AuditLogsView';
import { ExamDetailModal } from './components/ExamDetailModal';
import { AddExamModal } from './components/AddExamModal';
import { AiExtractorModal } from './components/AiExtractorModal';
import { WordPressPreviewModal } from './components/WordPressPreviewModal';
import { ExamNotification, AppConfig, ActivityLog } from './types/exam';
import { api } from './services/api';
import { CheckCircle2, AlertCircle, Info, ExternalLink, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'directory' | 'approvals' | 'channels' | 'wordpress' | 'ai' | 'logs'>('directory');
  const [exams, setExams] = useState<ExamNotification[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Selections
  const [selectedExam, setSelectedExam] = useState<ExamNotification | null>(null);
  const [previewExam, setPreviewExam] = useState<ExamNotification | null>(null);
  const [editingExam, setEditingExam] = useState<Partial<ExamNotification> | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; url?: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', url?: string) => {
    setToast({ message, type, url });
    setTimeout(() => setToast(null), 6000);
  };

  // Fetch initial state
  const fetchData = useCallback(async () => {
    try {
      const [fetchedExams, fetchedConfig, fetchedLogs] = await Promise.all([
        api.getExams(),
        api.getConfig(),
        api.getLogs()
      ]);
      setExams(fetchedExams);
      setConfig(fetchedConfig);
      setLogs(fetchedLogs);
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      showToast('Could not reach backend server: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll updates every 15s so remote email/whatsapp/telegram actions reflect in real-time
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle Approve
  const handleApprove = async (id: string, channel: 'web' | 'email' | 'whatsapp' | 'telegram' = 'web', note?: string) => {
    try {
      const updated = await api.updateExamStatus(id, 'approved', channel, note);
      await fetchData();
      if (updated.status === 'published' && updated.wpPostUrl) {
        showToast(`Approved & Published to esckolkata2003.org!`, 'success', updated.wpPostUrl);
      } else {
        showToast(`Notification approved!`, 'success');
      }
      if (selectedExam?.id === id) {
        setSelectedExam(updated);
      }
    } catch (err: any) {
      showToast('Approval failed: ' + err.message, 'error');
    }
  };

  // Handle Reject
  const handleReject = async (id: string, channel: 'web' | 'email' | 'whatsapp' | 'telegram' = 'web', note?: string) => {
    try {
      await api.updateExamStatus(id, 'rejected', channel, note);
      await fetchData();
      showToast('Notification rejected and archived.', 'info');
      if (selectedExam?.id === id) {
        setSelectedExam(null);
      }
    } catch (err: any) {
      showToast('Rejection failed: ' + err.message, 'error');
    }
  };

  // Handle Publish to WordPress
  const handlePublishToWp = async (exam: ExamNotification) => {
    try {
      const res = await api.publishToWordPress(exam.id);
      await fetchData();
      if (res.success && res.postUrl) {
        showToast('Successfully published live to esckolkata2003.org!', 'success', res.postUrl);
      } else {
        showToast(`WordPress Notice: ${res.error || 'Connection error'}. Please verify Application Password in WordPress tab.`, 'error');
      }
    } catch (err: any) {
      showToast(`Error publishing to WordPress: ${err.message}`, 'error');
    }
  };

  // Handle Sync all approved jobs to https://esckolkata2003.org/job-vacancies/
  const handleSyncJobVacanciesPage = async () => {
    try {
      const res = await api.syncJobVacanciesPage();
      await fetchData();
      if (res.success && res.pageUrl) {
        showToast(`Successfully synced approved jobs to ${res.pageUrl}`, 'success', res.pageUrl);
      } else {
        showToast(`Sync Notice: ${res.error || 'Check WordPress settings'}. Saved in ready state.`, 'info');
      }
      return res;
    } catch (err: any) {
      showToast('Error syncing Job Vacancies page: ' + err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  // Handle Dispatch Alerts
  const handleDispatchAlerts = async (exam: ExamNotification) => {
    try {
      const res = await api.dispatchNotificationAlerts(exam.id);
      await fetchData();
      showToast('Alerts dispatched to Admin Email, WhatsApp, and Telegram!', 'success');
      return res;
    } catch (err: any) {
      showToast('Failed to dispatch alert: ' + err.message, 'error');
    }
  };

  // Handle Save Exam (Add/Edit)
  const handleSaveExam = async (examData: Partial<ExamNotification>) => {
    try {
      if (examData.id && exams.some(e => e.id === examData.id)) {
        await api.updateExam(examData.id, examData);
        showToast('Exam notification updated successfully!', 'success');
      } else {
        await api.createExam(examData);
        showToast('New exam notification queued for approval! Alerts sent to admin.', 'success');
      }
      await fetchData();
      setEditingExam(null);
      setIsAddModalOpen(false);
    } catch (err: any) {
      showToast('Failed to save exam: ' + err.message, 'error');
    }
  };

  // Handle Delete Exam
  const handleDeleteExam = async (id: string) => {
    if (confirm('Are you sure you want to delete this notification?')) {
      try {
        await api.deleteExam(id);
        await fetchData();
        showToast('Notification deleted.', 'info');
        setSelectedExam(null);
      } catch (err: any) {
        showToast('Failed to delete: ' + err.message, 'error');
      }
    }
  };

  // Handle Update Config
  const handleUpdateConfig = async (newCfg: Partial<AppConfig>) => {
    try {
      const updated = await api.updateConfig(newCfg);
      setConfig(updated);
      showToast('Configuration updated!', 'success');
    } catch (err: any) {
      showToast('Failed to update settings: ' + err.message, 'error');
    }
  };

  // Handle Test WP
  const handleTestWordPress = async (creds: { siteUrl: string; username: string; applicationPassword: string }) => {
    return api.testWordPressConnection(creds);
  };

  // Handle AI Extract result
  const handleAiExtracted = (extractedExam: Partial<ExamNotification>) => {
    setEditingExam(extractedExam);
    setIsAddModalOpen(true);
    showToast('AI parsed notification successfully! Review details and save.', 'success');
  };

  // Clear activity logs
  const handleClearLogs = async () => {
    await api.clearLogs();
    setLogs([]);
    showToast('Audit logs cleared.', 'info');
  };

  const pendingCount = exams.filter(e => e.status === 'pending_approval').length;
  const wpConnected = Boolean(config?.wordpress.siteUrl);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col selection:bg-blue-500 selection:text-white">
      
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        config={config}
        onOpenAddModal={() => { setEditingExam(null); setIsAddModalOpen(true); }}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        wpConnected={wpConnected}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-xs text-slate-400">Loading ExamTrack ESC engine...</p>
          </div>
        ) : (
          <>
            {activeTab === 'directory' && (
              <ExamDirectory
                exams={exams}
                onSelectExam={(exam) => setSelectedExam(exam)}
                onApproveExam={(exam) => handleApprove(exam.id, 'web')}
                onPublishToWp={handlePublishToWp}
                onPreviewWp={(exam) => setPreviewExam(exam)}
                onDispatchAlerts={handleDispatchAlerts}
              />
            )}

            {activeTab === 'approvals' && (
              <ApprovalQueue
                exams={exams}
                config={config}
                onApprove={handleApprove}
                onReject={handleReject}
                onPreviewWp={(exam) => setPreviewExam(exam)}
                onSelectExam={(exam) => setSelectedExam(exam)}
                onDispatchAlerts={handleDispatchAlerts}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'channels' && (
              <NotificationChannelsView
                config={config}
                onUpdateConfig={handleUpdateConfig}
                pendingExams={exams.filter(e => e.status === 'pending_approval')}
                onDispatchAlerts={handleDispatchAlerts}
              />
            )}

            {activeTab === 'wordpress' && (
              <WordPressEngineView
                config={config}
                onUpdateConfig={handleUpdateConfig}
                onTestConnection={handleTestWordPress}
                exams={exams}
                onPublishToWp={handlePublishToWp}
                onPreviewWp={(exam) => setPreviewExam(exam)}
                onSyncJobVacanciesPage={handleSyncJobVacanciesPage}
              />
            )}

            {activeTab === 'logs' && (
              <AuditLogsView
                logs={logs}
                onClearLogs={handleClearLogs}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <ExamDetailModal
        exam={selectedExam}
        onClose={() => setSelectedExam(null)}
        onApprove={(id) => handleApprove(id, 'web')}
        onReject={(id) => handleReject(id, 'web')}
        onPublishToWp={handlePublishToWp}
        onPreviewWp={(exam) => setPreviewExam(exam)}
        onEdit={(exam) => { setSelectedExam(null); setEditingExam(exam); setIsAddModalOpen(true); }}
        onDelete={handleDeleteExam}
        onRefresh={fetchData}
      />

      <AddExamModal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setEditingExam(null); }}
        onSave={handleSaveExam}
        initialData={editingExam}
      />

      <AiExtractorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onExtracted={handleAiExtracted}
        onExtractApi={api.extractExamWithAI}
      />

      <WordPressPreviewModal
        exam={previewExam}
        onClose={() => setPreviewExam(null)}
        onPublishDirectly={handlePublishToWp}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-2xl flex items-start gap-3 animate-fadeIn">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs space-y-1">
            <p className="font-medium text-slate-100">{toast.message}</p>
            {toast.url && (
              <a
                href={toast.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Open Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white text-xs shrink-0"
          >
            &times;
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-300">ExamTrack ESC Kolkata</span> — Modeled for Educational Support Council (2003)
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <a href="https://esckolkata2003.org" target="_blank" rel="noreferrer" className="hover:text-blue-400 transition-colors">
              esckolkata2003.org
            </a>
            <span>•</span>
            <button onClick={() => setActiveTab('channels')} className="hover:text-blue-400 transition-colors">
              Approval Channels
            </button>
            <span>•</span>
            <button onClick={() => setActiveTab('wordpress')} className="hover:text-blue-400 transition-colors">
              WP Engine
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
