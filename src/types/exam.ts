export type ExamCategory =
  | 'UPSC'
  | 'SSC'
  | 'Banking'
  | 'Railways'
  | 'State PSC'
  | 'Defense'
  | 'Teaching'
  | 'Police'
  | 'Engineering'
  | 'PSU'
  | 'Other';

export type ExamStatus = 'draft' | 'pending_approval' | 'approved' | 'published' | 'rejected';

export type ApprovalChannel = 'web' | 'email' | 'whatsapp' | 'telegram' | null;

export interface SingleLinkCheck {
  url: string;
  valid: boolean;
  status: 'verified' | 'warning' | 'error' | 'unchecked';
  statusCode?: number;
  message: string;
  isPdf?: boolean;
  contentType?: string;
  checkedAt?: string;
  verifiedBy?: 'auto' | 'manual';
}

export interface ExamLinkVerification {
  verified: boolean;
  applyOnline: SingleLinkCheck;
  notificationPdf: SingleLinkCheck;
  officialWebsite?: SingleLinkCheck;
  checkedAt?: string;
}

export interface ExamNotification {
  id: string;
  title: string;
  organization: string;
  postName: string;
  category: ExamCategory;
  status: ExamStatus;
  totalVacancies: number | string;
  salaryRange: string;
  importantDates: {
    applicationStart: string;
    applicationEnd: string;
    feeLastDate?: string;
    admitCardDate?: string;
    examDate?: string;
    resultDate?: string;
  };
  eligibility: {
    minQualification: string;
    ageLimit: string;
    experience?: string;
  };
  applicationFee: {
    generalOBC: string;
    scStPwd: string;
    paymentMode?: string;
  };
  selectionProcess: string[];
  syllabusHighlights?: string;
  vacancyDetails?: Array<{ post: string; count: string; qualification?: string }>;
  links: {
    officialWebsite: string;
    notificationPdf: string;
    applyOnline: string;
  };
  linkVerification?: ExamLinkVerification;
  summary: string;
  escGuidanceNotes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  approvalChannel?: ApprovalChannel;
  approvedAt?: string | null;
  publishedAt?: string | null;
  wpPostId?: number | null;
  wpPostUrl?: string | null;
  wpPublishStatus?: 'publish' | 'draft' | 'pending';
  queueRemovalReason?: string;
  removedFromQueueAt?: string;
}

export interface AppConfig {
  wordpress: {
    siteUrl: string;
    apiEndpoint: string;
    jobVacanciesPageSlug: string;
    jobVacanciesPageUrl: string;
    username: string;
    applicationPassword: string;
    postStatus: 'publish' | 'draft';
    defaultCategory: string;
    authorId: number;
    autoPublishOnApproval: boolean;
    autoSyncJobVacanciesPage: boolean;
  };
  adminEmail: {
    email: string;
    enabled: boolean;
    notifyOnNewNotification: boolean;
  };
  adminWhatsApp: {
    phoneNumber: string;
    enabled: boolean;
    notifyOnNewNotification: boolean;
  };
  adminTelegram: {
    botToken: string;
    chatId: string;
    enabled: boolean;
    notifyOnNewNotification: boolean;
  };
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'approval' | 'rejection' | 'wordpress_publish' | 'notification_sent' | 'ai_extract' | 'queue_prune';
  channel?: 'web' | 'email' | 'whatsapp' | 'telegram';
  title: string;
  details: string;
  status: 'success' | 'warning' | 'error' | 'info';
  examId?: string;
  extraUrl?: string;
}
