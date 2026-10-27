import { ExamNotification, AppConfig, ActivityLog, ExamStatus, ExamLinkVerification } from '../types/exam';

export const api = {
  // Verify Apply Online & Notification PDF links
  async verifyLinks(links: {
    applyOnline?: string;
    notificationPdf?: string;
    officialWebsite?: string;
  }): Promise<ExamLinkVerification> {
    const res = await fetch('/api/verify-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(links)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to verify links');
    }
    return res.json();
  },

  // Prune unconfirmed / missing link exams from the approval queue
  async pruneQueueUnconfirmed(): Promise<{ success: boolean; prunedCount: number; prunedExams: ExamNotification[] }> {
    const res = await fetch('/api/queue/prune-unconfirmed', {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to prune unconfirmed exams');
    }
    return res.json();
  },
  // Exams
  async getExams(): Promise<ExamNotification[]> {
    const res = await fetch('/api/exams');
    if (!res.ok) throw new Error('Failed to fetch exams');
    const data = await res.json();
    return data.exams || [];
  },

  async getExam(id: string): Promise<ExamNotification> {
    const res = await fetch(`/api/exams/${id}`);
    if (!res.ok) throw new Error('Failed to fetch exam');
    const data = await res.json();
    return data.exam;
  },

  async createExam(examData: Partial<ExamNotification>): Promise<ExamNotification> {
    const res = await fetch('/api/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(examData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create exam');
    }
    const data = await res.json();
    return data.exam;
  },

  async updateExam(id: string, examData: Partial<ExamNotification>): Promise<ExamNotification> {
    const res = await fetch(`/api/exams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(examData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update exam');
    }
    const data = await res.json();
    return data.exam;
  },

  async deleteExam(id: string): Promise<boolean> {
    const res = await fetch(`/api/exams/${id}`, {
      method: 'DELETE'
    });
    return res.ok;
  },

  async updateExamStatus(
    id: string,
    status: ExamStatus,
    channel: 'web' | 'email' | 'whatsapp' | 'telegram' = 'web',
    note?: string
  ): Promise<ExamNotification> {
    const res = await fetch(`/api/exams/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, channel, note })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update status');
    }
    const data = await res.json();
    return data.exam;
  },

  async publishToWordPress(id: string): Promise<{ success: boolean; postId?: number; postUrl?: string; error?: string }> {
    const res = await fetch(`/api/exams/${id}/publish-wp`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Publishing failed' };
    }
    return data;
  },

  async dispatchNotificationAlerts(examId: string): Promise<any> {
    const res = await fetch('/api/notifications/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId })
    });
    return res.json();
  },

  // Config
  async getConfig(): Promise<AppConfig> {
    const res = await fetch('/api/config');
    const data = await res.json();
    return data.config;
  },

  async updateConfig(newConfig: Partial<AppConfig>): Promise<AppConfig> {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig)
    });
    const data = await res.json();
    return data.config;
  },

  async testWordPressConnection(credentials: {
    siteUrl: string;
    username: string;
    applicationPassword: string;
  }): Promise<{ success: boolean; authenticated?: boolean; user?: string; site?: string; error?: string; message?: string }> {
    const res = await fetch('/api/wordpress/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return res.json();
  },

  // Logs
  async getLogs(): Promise<ActivityLog[]> {
    const res = await fetch('/api/logs');
    const data = await res.json();
    return data.logs || [];
  },

  async clearLogs(): Promise<boolean> {
    const res = await fetch('/api/logs', { method: 'DELETE' });
    return res.ok;
  },

  // AI Exam Extraction
  async extractExamWithAI(rawText: string, sourceUrl?: string): Promise<{ exam: Partial<ExamNotification>; source: string }> {
    const res = await fetch('/api/ai/extract-exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText, sourceUrl })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to extract exam details');
    }
    return res.json();
  },

  // Preview WordPress HTML
  async getWordPressPreviewHtml(exam: Partial<ExamNotification>): Promise<string> {
    const res = await fetch('/api/wordpress/preview-html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exam)
    });
    const data = await res.json();
    return data.html || '';
  },

  // Sync all approved jobs to https://esckolkata2003.org/job-vacancies/
  async syncJobVacanciesPage(): Promise<{ success: boolean; pageId?: number; pageUrl?: string; error?: string; count?: number }> {
    const res = await fetch('/api/wordpress/sync-job-vacancies-page', {
      method: 'POST'
    });
    return res.json();
  },

  // Get preview of the aggregated Job Vacancies page HTML
  async getJobVacanciesPreviewHtml(): Promise<string> {
    const res = await fetch('/api/wordpress/job-vacancies-preview');
    const data = await res.json();
    return data.html || '';
  }
};
