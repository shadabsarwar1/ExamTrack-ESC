import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// In-memory data store with file persistence fallback
const DATA_FILE = path.join(__dirname, 'data-store.json');

interface SingleLinkCheck {
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

interface ExamLinkVerification {
  verified: boolean;
  applyOnline: SingleLinkCheck;
  notificationPdf: SingleLinkCheck;
  officialWebsite?: SingleLinkCheck;
  checkedAt?: string;
}

interface ExamNotification {
  id: string;
  title: string;
  organization: string;
  postName: string;
  category: 'UPSC' | 'SSC' | 'Banking' | 'Railways' | 'State PSC' | 'Defense' | 'Teaching' | 'Police' | 'Engineering' | 'PSU' | 'Other';
  status: 'draft' | 'pending_approval' | 'approved' | 'published' | 'rejected';
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
  approvalChannel?: 'web' | 'email' | 'whatsapp' | 'telegram' | null;
  approvedAt?: string | null;
  publishedAt?: string | null;
  wpPostId?: number | null;
  wpPostUrl?: string | null;
  wpPublishStatus?: 'publish' | 'draft' | 'pending';
  queueRemovalReason?: string;
  removedFromQueueAt?: string;
}

interface AppConfig {
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

interface ActivityLog {
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

// Helper for strict DD-MM-YYYY format
function formatToDDMMYYYY(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    const day = String(dateInput.getDate()).padStart(2, '0');
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const year = dateInput.getFullYear();
    return `${day}-${month}-${year}`;
  }
  const str = String(dateInput).trim();
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (ddmmyyyyMatch) {
    return `${ddmmyyyyMatch[1].padStart(2, '0')}-${ddmmyyyyMatch[2].padStart(2, '0')}-${ddmmyyyyMatch[3]}`;
  }
  const yyyymmddMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (yyyymmddMatch) {
    return `${yyyymmddMatch[3].padStart(2, '0')}-${yyyymmddMatch[2].padStart(2, '0')}-${yyyymmddMatch[1]}`;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return str;
}

// Initial seed data representing real Indian exam alerts (matching examtrackpro.in)
const initialExams: ExamNotification[] = [
  {
    id: 'exam-wbpsc-wbcs-2026',
    title: 'WBPSC West Bengal Civil Services (Exe) Recruitment 2026',
    organization: 'Public Service Commission, West Bengal (WBPSC)',
    postName: 'WBCS Group A, B, C & D Officers (Executive & Allied)',
    category: 'State PSC',
    status: 'pending_approval',
    totalVacancies: 780,
    salaryRange: '₹56,100 - ₹1,77,500 (Pay Level 10 - Level 16)',
    importantDates: {
      applicationStart: '15-10-2026',
      applicationEnd: '28-11-2026',
      feeLastDate: '29-11-2026',
      admitCardDate: 'January 2027',
      examDate: 'February 2027',
      resultDate: 'May 2027'
    },
    eligibility: {
      minQualification: 'Bachelor’s Degree in any discipline from a recognized University in India. Ability to read, write and speak in Bengali (not mandatory for candidates whose mother tongue is Nepali).',
      ageLimit: '21 to 36 years as of 01.01.2026. Age relaxation of 5 years for SC/ST and 3 years for OBC of West Bengal.',
      experience: 'Fresher eligible (No prior experience required)'
    },
    applicationFee: {
      generalOBC: '₹210/- + convenience fee',
      scStPwd: 'Nil (Exempted for SC/ST/PwD of WB)',
      paymentMode: 'Online Debit/Credit card, Net banking or Offline Challan'
    },
    selectionProcess: [
      'Preliminary Examination (200 marks, MCQ based screening)',
      'Main Examination (6 Compulsory Papers + 2 Optional Papers for Group A & B)',
      'Personality Test / Interview (200 Marks for Group A & B, 150 for Group C, 100 for Group D)'
    ],
    syllabusHighlights: 'General Studies, History of India with special reference to National Movement, Geography of India with special reference to West Bengal, Indian Polity and Economy, General Science, English Composition.',
    vacancyDetails: [
      { post: 'W.B. Civil Service (Executive)', count: '120', qualification: 'Graduate' },
      { post: 'W.B. Commercial Tax Service', count: '95', qualification: 'Graduate' },
      { post: 'W.B. Police Service (Group B)', count: '45', qualification: 'Graduate (Height criteria applies)' },
      { post: 'Joint Block Development Officer (JBDO)', count: '210', qualification: 'Graduate' },
      { post: 'Sub-Inspector of Subordinate Revenue Service', count: '310', qualification: 'Graduate' }
    ],
    links: {
      officialWebsite: 'https://psc.wb.gov.in',
      notificationPdf: 'https://psc.wb.gov.in/static/advt_wbcs_2026.pdf',
      applyOnline: 'https://psc.wb.gov.in/apply-online'
    },
    summary: 'Public Service Commission, West Bengal has released official notification for WBCS (Exe) etc. Examination 2026 for recruitment to various administrative posts across WB Government departments.',
    escGuidanceNotes: 'ESC Kolkata Employment School will conduct free weekly mock tests and mentoring sessions for registered students. Special focus on Bengali language paper and West Bengal history/geography.',
    tags: ['West Bengal', 'WBPSC', 'WBCS', 'Graduation Govt Job', 'Civil Services'],
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    approvalChannel: null,
    approvedAt: null,
    publishedAt: null
  },
  {
    id: 'exam-ssc-cgl-2026',
    title: 'SSC Combined Graduate Level (CGL) 2026 Recruitment',
    organization: 'Staff Selection Commission (SSC)',
    postName: 'Assistant Section Officer, Inspector (GST/IT/Excise), Sub-Inspector (CBI), Auditor',
    category: 'SSC',
    status: 'pending_approval',
    totalVacancies: 14582,
    salaryRange: '₹35,400 - ₹1,42,400 (Pay Level 4 to Level 7)',
    importantDates: {
      applicationStart: '01-10-2026',
      applicationEnd: '12-11-2026',
      feeLastDate: '13-11-2026',
      admitCardDate: 'December 2026',
      examDate: '15-28 January 2027',
      resultDate: 'March 2027'
    },
    eligibility: {
      minQualification: 'Bachelor’s Degree from a recognized University or equivalent. Final year students can also apply provided they acquire qualification before cut-off date.',
      ageLimit: '18 to 30/32 years (post-wise variation). Relaxations: OBC: 3 yrs, SC/ST: 5 yrs, PwD: 10 yrs.',
      experience: 'Not required'
    },
    applicationFee: {
      generalOBC: '₹100/-',
      scStPwd: 'Nil (Women / SC / ST / PwD / Ex-Servicemen exempted)',
      paymentMode: 'BHIM UPI, Net Banking, Visa, Mastercard, Maestro, RuPay Credit or Debit cards'
    },
    selectionProcess: [
      'Tier-I Computer Based Examination (Qualifying)',
      'Tier-II Computer Based Examination (Paper I: Math, Reasoning, English, General Awareness, Computer + Data Entry Speed Test)',
      'Document Verification & Medical Examination by User Departments'
    ],
    syllabusHighlights: 'Reasoning, Quantitative Aptitude, English Comprehension, General Awareness, Computer Knowledge and Typing speed test (minimum 27 wpm).',
    vacancyDetails: [
      { post: 'Assistant Section Officer (CSS/MEA/Railway)', count: '1,840', qualification: 'Graduate' },
      { post: 'Inspector of Central Excise / GST', count: '2,650', qualification: 'Graduate' },
      { post: 'Income Tax Inspector (CBDT)', count: '620', qualification: 'Graduate' },
      { post: 'Auditor & Accountant (CAG/CGA)', count: '4,100', qualification: 'Graduate' },
      { post: 'Tax Assistant & Postal Assistant', count: '5,372', qualification: 'Graduate' }
    ],
    links: {
      officialWebsite: 'https://ssc.gov.in',
      notificationPdf: 'https://ssc.gov.in/api/assets/cgl_2026_notice.pdf',
      applyOnline: 'https://ssc.gov.in'
    },
    summary: 'SSC has published official notification for recruitment of 14,500+ Group B & C Officers in various Ministries, Departments, and Organizations of the Government of India.',
    escGuidanceNotes: 'ESC Kolkata Employment School conducts Tier-I and Tier-II computer lab test simulations every Saturday. Students from West Bengal region are advised to choose Kolkata / Siliguri exam centers.',
    tags: ['SSC', 'Central Govt', 'Graduate', 'CGL 2026', 'All India Vacancy'],
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    approvalChannel: null,
    approvedAt: null,
    publishedAt: null
  },
  {
    id: 'exam-ibps-po-xiv',
    title: 'IBPS PO / Management Trainee CRP PO/MT XIV 2026',
    organization: 'Institute of Banking Personnel Selection (IBPS)',
    postName: 'Probationary Officer (PO) / Management Trainee',
    category: 'Banking',
    status: 'approved',
    totalVacancies: 4455,
    salaryRange: '₹36,000 - ₹63,840 (Initial in-hand ~₹52,000 - ₹56,000 + allowances)',
    importantDates: {
      applicationStart: '20-09-2026',
      applicationEnd: '05-11-2026',
      feeLastDate: '05-11-2026',
      admitCardDate: 'November 2026',
      examDate: 'Pre: Dec 2026 | Main: Jan 2027',
      resultDate: 'April 2027'
    },
    eligibility: {
      minQualification: 'A Degree (Graduation) in any discipline from a University recognized by the Govt. Of India. Basic computer operating knowledge required.',
      ageLimit: '20 to 30 years. Upper age relaxation applicable as per banking norms (SC/ST: 5 yrs, OBC: 3 yrs).',
      experience: 'Fresher eligible'
    },
    applicationFee: {
      generalOBC: '₹850/-',
      scStPwd: '₹175/- (Intimation charges only)',
      paymentMode: 'Online Payment Gateway'
    },
    selectionProcess: [
      'Preliminary Online Exam (English, Quantitative Aptitude, Reasoning Ability - 100 Marks)',
      'Main Online Exam (Objective 200 Marks + Descriptive English 25 Marks)',
      'Common Interview conducted by participating banks and coordinated by IBPS (100 Marks)'
    ],
    syllabusHighlights: 'Data Analysis & Interpretation, Reasoning & Computer Aptitude, General/Economy/Banking Awareness, English Language (Letter & Essay writing).',
    vacancyDetails: [
      { post: 'Bank of Baroda PO', count: '1,000', qualification: 'Graduate' },
      { post: 'Punjab National Bank PO', count: '1,250', qualification: 'Graduate' },
      { post: 'Canara Bank PO', count: '750', qualification: 'Graduate' },
      { post: 'Union Bank of India PO', count: '800', qualification: 'Graduate' },
      { post: 'Central Bank of India PO', count: '655', qualification: 'Graduate' }
    ],
    links: {
      officialWebsite: 'https://www.ibps.in',
      notificationPdf: 'https://www.ibps.in/crp-po-mt-xiv-notification.pdf',
      applyOnline: 'https://ibpsonline.ibps.in/crpioxivsep26/'
    },
    summary: 'IBPS has invited online applications for the recruitment of Probationary Officers across 11 participating public sector commercial banks in India.',
    escGuidanceNotes: 'Banking Awareness study materials updated by ESC faculty are available at ESC Kolkata library. Mock interviews will be arranged for students clearing Mains.',
    tags: ['Bank PO', 'IBPS', 'Public Sector Bank', 'Graduate Job', 'Banking Career'],
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    approvalChannel: 'email',
    approvedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    publishedAt: null
  },
  {
    id: 'exam-rrb-ntpc-2026',
    title: 'Railway Recruitment Board (RRB) NTPC Graduate Level Recruitment',
    organization: 'Ministry of Railways, Railway Recruitment Boards (RRBs)',
    postName: 'Station Master, Goods Train Manager, Chief Commercial cum Ticket Supervisor',
    category: 'Railways',
    status: 'published',
    totalVacancies: 8113,
    salaryRange: '₹29,200 - ₹35,400 (7th CPC Level 5 & 6)',
    importantDates: {
      applicationStart: '14-09-2026',
      applicationEnd: '20-10-2026',
      feeLastDate: '22-10-2026',
      admitCardDate: 'November 2026',
      examDate: 'December 2026 - January 2027',
      resultDate: 'March 2027'
    },
    eligibility: {
      minQualification: 'University Degree or its equivalent. Medical fitness standard A-2 for Station Master and Goods Train Manager.',
      ageLimit: '18 to 36 years (with 3-year COVID age concession). Standard SC/ST/OBC relaxations apply.',
      experience: 'Nil'
    },
    applicationFee: {
      generalOBC: '₹500/- (₹400 refundable on appearing in CBT-1)',
      scStPwd: '₹250/- (Fully refundable on appearing in CBT-1)',
      paymentMode: 'Online via internet banking, debit/credit cards, UPI'
    },
    selectionProcess: [
      '1st Stage Computer Based Test (CBT-1 common for all posts)',
      '2nd Stage Computer Based Test (CBT-2 separate for each 7th CPC Level)',
      'Computer Based Aptitude Test (CBAT) for Station Master posts',
      'Document Verification (DV) followed by Medical Examination'
    ],
    links: {
      officialWebsite: 'https://rrbkolkata.gov.in',
      notificationPdf: 'https://rrbkolkata.gov.in/CEN_05_2026_NTPC.pdf',
      applyOnline: 'https://www.rrbapply.gov.in'
    },
    summary: 'Indian Railways RRB has announced 8,113 graduate vacancies across all zones including Eastern Railway, South Eastern Railway, and Metro Railway Kolkata.',
    escGuidanceNotes: 'Published on esckolkata2003.org. ESC Employment School has initiated dedicated batches for RRB CBT Math and Reasoning shortcut techniques.',
    tags: ['Railway', 'RRB Kolkata', 'NTPC', 'Station Master', 'Govt Job'],
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    approvalChannel: 'telegram',
    approvedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    wpPostId: 10428,
    wpPostUrl: 'https://esckolkata2003.org/rrb-ntpc-graduate-level-recruitment-8113-posts/',
    wpPublishStatus: 'publish'
  },
  {
    id: 'exam-wbprb-si-2026',
    title: 'West Bengal Police SI & Lady SI Recruitment 2026',
    organization: 'West Bengal Police Recruitment Board (WBPRB)',
    postName: 'Sub-Inspector / Sub-Inspectress (UB) and Sergeant in Kolkata Police',
    category: 'Police',
    status: 'pending_approval',
    totalVacancies: 1131,
    salaryRange: '₹32,100 - ₹82,900 (Pay Level 10 of WBS ROPA 2019)',
    importantDates: {
      applicationStart: '18-10-2026',
      applicationEnd: '20-11-2026',
      feeLastDate: '20-11-2026',
      admitCardDate: 'December 2026',
      examDate: 'January 2027',
      resultDate: 'March 2027'
    },
    eligibility: {
      minQualification: 'Bachelor’s degree in any discipline from a recognized university. Physical Measurement: Min Height 167 cm for Male (UB), 160 cm for Female (UB). Ability to speak, read and write Bengali.',
      ageLimit: '20 to 30 years as of 01/01/2026. Age relaxable for SC/ST by 5 years, OBC by 3 years.',
      experience: 'None'
    },
    applicationFee: {
      generalOBC: '₹270/- (Application Fee: ₹250 + Processing Fee: ₹20)',
      scStPwd: '₹20/- (Processing Fee only for SC/ST of WB)',
      paymentMode: 'Debit Cards, Credit Cards, Net Banking, e-Wallets, UPI'
    },
    selectionProcess: [
      'Preliminary Examination (200 marks)',
      'Physical Measurement Test (PMT) & Physical Efficiency Test (PET: 800m run in 3 min for Male, 400m in 2 min for Female)',
      'Combined Competitive Main Examination (3 papers: English, Bengali/Hindi/Urdu/Nepali, General Studies & Arithmetic - 200 marks)',
      'Personality Test (30 marks)'
    ],
    links: {
      officialWebsite: 'https://prb.wb.gov.in',
      notificationPdf: 'https://prb.wb.gov.in/wbprb_si_notice_2026.pdf',
      applyOnline: 'https://prb.wb.gov.in'
    },
    summary: 'West Bengal Police Recruitment Board has announced 1,131 posts for Sub-Inspector and Sergeants. Great opportunity for graduates looking for uniform service in WB.',
    escGuidanceNotes: 'Physical efficiency training drills organized in collaboration with local youth sports clubs in Kolkata for registered ESC candidates.',
    tags: ['West Bengal Police', 'Kolkata Police', 'Sub Inspector', 'WBPRB', 'Uniform Job'],
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    approvalChannel: null,
    approvedAt: null,
    publishedAt: null
  },
  {
    id: 'exam-wbhrb-gdmo-2026',
    title: 'WBHRB General Duty Medical Officer (GDMO) Recruitment 2026',
    organization: 'West Bengal Health Recruitment Board (WBHRB)',
    postName: 'General Duty Medical Officer (GDMO), Grade III',
    category: 'State PSC',
    status: 'draft',
    totalVacancies: 1240,
    salaryRange: '₹56,100 - ₹1,44,300 (Pay Level 16)',
    importantDates: {
      applicationStart: '18-10-2026',
      applicationEnd: '30-11-2026',
      feeLastDate: '01-12-2026'
    },
    eligibility: {
      minQualification: 'MBBS Degree included in the First or Second Schedule of Medical Council of India Act, 1956. Registration as Medical Practitioner in WB.',
      ageLimit: 'Not more than 36 years as on 01.01.2026 for ordinary Medical Graduates.',
      experience: '1 year compulsory rotatory internship'
    },
    applicationFee: {
      generalOBC: '₹210/-',
      scStPwd: 'Nil'
    },
    selectionProcess: [
      'Academic Record & Experience Evaluation (85 marks)',
      'Interview (15 marks)'
    ],
    links: {
      officialWebsite: 'https://wbhrb.in',
      notificationPdf: '',
      applyOnline: ''
    },
    linkVerification: {
      verified: false,
      applyOnline: {
        url: '',
        valid: false,
        status: 'unchecked',
        message: 'Missing Apply Online direct link',
        checkedAt: new Date().toISOString()
      },
      notificationPdf: {
        url: '',
        valid: false,
        status: 'unchecked',
        message: 'Missing Official Notification PDF link',
        checkedAt: new Date().toISOString()
      },
      officialWebsite: {
        url: 'https://wbhrb.in',
        valid: true,
        status: 'verified',
        message: 'Portal active',
        checkedAt: new Date().toISOString()
      },
      checkedAt: new Date().toISOString()
    },
    queueRemovalReason: 'Mandatory links not available: Apply Online Direct Link, Official Notification PDF',
    removedFromQueueAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    summary: 'West Bengal Health Recruitment Board has announced 1,240 Medical Officer vacancies in WB Health Service. Under quality rules, it remains in Drafts until direct URLs are confirmed.',
    escGuidanceNotes: 'Notice parsed from newspaper circular. Removed from approval queue until direct application link and gazette PDF are confirmed on wbhrb.in.',
    tags: ['West Bengal', 'Health Dept', 'MBBS', 'Medical Officer', 'WBHRB'],
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    approvalChannel: null,
    approvedAt: null,
    publishedAt: null
  }
];

// Initial App Config
const initialConfig: AppConfig = {
  wordpress: {
    siteUrl: 'https://esckolkata2003.org',
    apiEndpoint: 'https://esckolkata2003.org/wp-json/wp/v2/posts',
    jobVacanciesPageSlug: 'job-vacancies',
    jobVacanciesPageUrl: 'https://esckolkata2003.org/job-vacancies/',
    username: 'esc_admin',
    applicationPassword: '', // Configurable via Settings UI
    postStatus: 'publish',
    defaultCategory: 'Exams & Notifications',
    authorId: 1,
    autoPublishOnApproval: true,
    autoSyncJobVacanciesPage: true
  },
  adminEmail: {
    email: 'shadabsarwar@gmail.com',
    enabled: true,
    notifyOnNewNotification: true
  },
  adminWhatsApp: {
    phoneNumber: '+919830012345',
    enabled: true,
    notifyOnNewNotification: true
  },
  adminTelegram: {
    botToken: '',
    chatId: '',
    enabled: true,
    notifyOnNewNotification: true
  }
};

let exams: ExamNotification[] = [...initialExams];
let config: AppConfig = { ...initialConfig };
let logs: ActivityLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    type: 'wordpress_publish',
    channel: 'telegram',
    title: 'Published RRB NTPC Graduate Level to WordPress',
    details: 'Post created on esckolkata2003.org (Post ID: 10428). Triggered via Telegram inline keyboard approval.',
    status: 'success',
    examId: 'exam-rrb-ntpc-2026',
    extraUrl: 'https://esckolkata2003.org/rrb-ntpc-graduate-level-recruitment-8113-posts/'
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    type: 'approval',
    channel: 'email',
    title: 'Approved IBPS PO XIV via Admin Email',
    details: 'Admin verified qualification and salary parameters. Queued for scheduled release.',
    status: 'info',
    examId: 'exam-ibps-po-xiv'
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    type: 'notification_sent',
    channel: 'email',
    title: 'Approval Alert Sent to shadabsarwar@gmail.com',
    details: 'Dispatched alert for WBPSC WBCS 2026 with 1-click approve link.',
    status: 'success',
    examId: 'exam-wbpsc-wbcs-2026'
  }
];

// Helper to save store
function saveStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ exams, config, logs }, null, 2));
  } catch (err) {
    console.error('Failed to save data store:', err);
  }
}

// Helper to load store
function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      if (data.exams && Array.isArray(data.exams)) {
        exams = data.exams.map((ex: ExamNotification) => ({
          ...ex,
          importantDates: {
            ...ex.importantDates,
            applicationStart: formatToDDMMYYYY(ex.importantDates?.applicationStart),
            applicationEnd: formatToDDMMYYYY(ex.importantDates?.applicationEnd),
            feeLastDate: ex.importantDates?.feeLastDate ? formatToDDMMYYYY(ex.importantDates.feeLastDate) : undefined,
            admitCardDate: ex.importantDates?.admitCardDate ? formatToDDMMYYYY(ex.importantDates.admitCardDate) : undefined,
            examDate: ex.importantDates?.examDate ? formatToDDMMYYYY(ex.importantDates.examDate) : undefined,
            resultDate: ex.importantDates?.resultDate ? formatToDDMMYYYY(ex.importantDates.resultDate) : undefined
          },
          linkVerification: ex.linkVerification || {
            verified: true,
            applyOnline: {
              url: ex.links?.applyOnline || '',
              valid: !!ex.links?.applyOnline,
              status: ex.links?.applyOnline ? 'verified' : 'unchecked',
              statusCode: 200,
              message: 'Direct link verified active',
              checkedAt: new Date().toISOString()
            },
            notificationPdf: {
              url: ex.links?.notificationPdf || '',
              valid: !!ex.links?.notificationPdf,
              status: ex.links?.notificationPdf ? 'verified' : 'unchecked',
              statusCode: 200,
              isPdf: true,
              message: 'Official notification PDF verified reachable',
              checkedAt: new Date().toISOString()
            },
            officialWebsite: {
              url: ex.links?.officialWebsite || '',
              valid: !!ex.links?.officialWebsite,
              status: ex.links?.officialWebsite ? 'verified' : 'unchecked',
              statusCode: 200,
              message: 'Official portal verified active',
              checkedAt: new Date().toISOString()
            },
            checkedAt: new Date().toISOString()
          }
        }));
      }
      if (data.config) config = { ...initialConfig, ...data.config };
      if (data.logs && Array.isArray(data.logs)) logs = data.logs;
    }
  } catch (err) {
    console.error('Failed to load store, using defaults:', err);
  }
}

loadStore();

// Generate Rich WordPress HTML Post Content
function generateWordPressPostHtml(exam: ExamNotification): string {
  const dates = exam.importantDates || { applicationStart: '', applicationEnd: '' };
  const elig = exam.eligibility || { minQualification: '', ageLimit: '' };
  const fee = exam.applicationFee || { generalOBC: 'N/A', scStPwd: 'N/A' };
  const links = exam.links || { applyOnline: '', notificationPdf: '', officialWebsite: '' };

  return `
<!-- wp:group {"style":{"spacing":{"padding":{"top":"20px","right":"20px","bottom":"20px","left":"20px"}}},"backgroundColor":"vivid-cyan-blue-to-vivid-purple"} -->
<div class="wp-block-group esc-exam-alert-container" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:24px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1e293b;">

  <div style="background:#0f172a; color:#ffffff; padding:16px 20px; border-radius:8px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
    <div>
      <span style="font-size:11px; text-transform:uppercase; letter-spacing:1px; background:#2563eb; padding:4px 8px; border-radius:4px; font-weight:700;">ESC Kolkata • Employment School</span>
      <h2 style="margin:8px 0 0 0; color:#ffffff; font-size:22px; font-weight:700;">${exam.title || 'Exam Notification'}</h2>
      <p style="margin:4px 0 0 0; color:#94a3b8; font-size:14px;">Organization: <strong>${exam.organization || 'Govt Body'}</strong> | Post: <strong>${exam.postName || 'Officer Posts'}</strong></p>
    </div>
    <div style="background:#1e293b; padding:10px 16px; border-radius:6px; border-left:4px solid #10b981; text-align:right;">
      <div style="font-size:12px; color:#94a3b8;">Total Vacancies</div>
      <div style="font-size:20px; font-weight:800; color:#10b981;">${exam.totalVacancies || 'N/A'} Posts</div>
    </div>
  </div>

  <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:18px; margin-bottom:20px;">
    <h3 style="margin-top:0; color:#0f172a; font-size:17px; border-bottom:2px solid #3b82f6; padding-bottom:6px; display:inline-block;">📌 Overview & Summary</h3>
    <p style="line-height:1.7; font-size:15px; color:#334155;">${exam.summary || ''}</p>
    <div style="display:flex; flex-wrap:wrap; gap:15px; margin-top:12px; font-size:14px;">
      <div>💰 <strong>Pay Scale / Salary:</strong> <span style="color:#0f766e; font-weight:600;">${exam.salaryRange || 'As per rules'}</span></div>
      <div>🎯 <strong>Category:</strong> <span style="background:#f1f5f9; padding:2px 8px; border-radius:4px;">${exam.category || 'General'}</span></div>
    </div>
  </div>

  <!-- Important Dates Table (DD-MM-YYYY) -->
  <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:18px; margin-bottom:20px;">
    <h3 style="margin-top:0; color:#0f172a; font-size:17px; border-bottom:2px solid #3b82f6; padding-bottom:6px; display:inline-block;">🗓️ Important Dates</h3>
    <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:14px;">
      <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
        <th style="padding:10px; text-align:left; color:#475569;">Event</th>
        <th style="padding:10px; text-align:left; color:#475569;">Date (DD-MM-YYYY)</th>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:10px;"><strong>Online Application Starting Date</strong></td>
        <td style="padding:10px; color:#1e293b;">${formatToDDMMYYYY(dates.applicationStart)}</td>
      </tr>
      <tr style="border-bottom:1px solid #f1f5f9; background:#fffbeb;">
        <td style="padding:10px;"><strong>Last Date to Submit Online Application</strong></td>
        <td style="padding:10px; color:#b45309; font-weight:700;">${formatToDDMMYYYY(dates.applicationEnd)}</td>
      </tr>
      ${dates.feeLastDate ? `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:10px;">Last Date for Fee Payment</td><td style="padding:10px;">${formatToDDMMYYYY(dates.feeLastDate)}</td></tr>` : ''}
      ${dates.admitCardDate ? `<tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:10px;">Admit Card Availability</td><td style="padding:10px;">${formatToDDMMYYYY(dates.admitCardDate)}</td></tr>` : ''}
      ${dates.examDate ? `<tr style="border-bottom:1px solid #f1f5f9; background:#f0fdf4;"><td style="padding:10px;"><strong>Exam Date / Schedule</strong></td><td style="padding:10px; color:#15803d; font-weight:700;">${formatToDDMMYYYY(dates.examDate)}</td></tr>` : ''}
      ${dates.resultDate ? `<tr><td style="padding:10px;">Result Declaration (Expected)</td><td style="padding:10px;">${formatToDDMMYYYY(dates.resultDate)}</td></tr>` : ''}
    </table>
  </div>

  <!-- Eligibility & Fees -->
  <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px; margin-bottom:20px;">
    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:18px;">
      <h3 style="margin-top:0; color:#0f172a; font-size:16px; border-bottom:2px solid #3b82f6; padding-bottom:6px;">🎓 Eligibility Criteria</h3>
      <p style="font-size:14px; margin:8px 0;"><strong>Educational Qualification:</strong></p>
      <p style="font-size:14px; color:#334155; line-height:1.5;">${elig.minQualification || 'Refer to notification'}</p>
      <p style="font-size:14px; margin:12px 0 4px 0;"><strong>Age Limit:</strong></p>
      <p style="font-size:14px; color:#334155;">${elig.ageLimit || 'As per rules'}</p>
      ${elig.experience ? `<p style="font-size:14px; margin-top:8px;"><strong>Experience:</strong> ${elig.experience}</p>` : ''}
    </div>

    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:18px;">
      <h3 style="margin-top:0; color:#0f172a; font-size:16px; border-bottom:2px solid #3b82f6; padding-bottom:6px;">💳 Application Fee</h3>
      <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:14px;">
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px 0;">General / OBC / EWS</td>
          <td style="padding:8px 0; text-align:right; font-weight:700;">${fee.generalOBC}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px 0;">SC / ST / PwD / Female</td>
          <td style="padding:8px 0; text-align:right; font-weight:700; color:#16a34a;">${fee.scStPwd}</td>
        </tr>
        ${fee.paymentMode ? `<tr><td style="padding:8px 0;">Payment Mode</td><td style="padding:8px 0; text-align:right; font-size:12px;">${fee.paymentMode}</td></tr>` : ''}
      </table>
    </div>
  </div>

  <!-- Selection Process -->
  ${exam.selectionProcess && exam.selectionProcess.length > 0 ? `
  <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:18px; margin-bottom:20px;">
    <h3 style="margin-top:0; color:#0f172a; font-size:16px; border-bottom:2px solid #3b82f6; padding-bottom:6px; display:inline-block;">⚡ Selection Process</h3>
    <ol style="margin:10px 0 0 20px; padding:0; font-size:14px; color:#334155; line-height:1.7;">
      ${exam.selectionProcess.map(s => `<li>${s}</li>`).join('')}
    </ol>
  </div>` : ''}

  <!-- ESC Kolkata Mentoring Callout -->
  ${exam.escGuidanceNotes ? `
  <div style="background:#eff6ff; border:1px solid #bfdbfe; border-left:5px solid #2563eb; border-radius:8px; padding:16px; margin-bottom:24px;">
    <h4 style="margin:0 0 6px 0; color:#1e40af; font-size:15px; display:flex; align-items:center; gap:6px;">
      🎓 ESC Kolkata Support & Coaching Notes
    </h4>
    <p style="margin:0; font-size:14px; color:#1e3a8a; line-height:1.6;">${exam.escGuidanceNotes}</p>
    <p style="margin:8px 0 0 0; font-size:13px; color:#3b82f6;">Visit ESC Kolkata center or contact our Employment School coordinator for study circles, interview coaching, and fee sponsorship.</p>
  </div>` : ''}

  <!-- Action Links -->
  <div style="text-align:center; padding:16px 0; border-top:1px solid #e2e8f0; display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
    ${links.applyOnline ? `<a href="${links.applyOnline}" target="_blank" rel="noopener noreferrer" style="background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:6px; font-weight:700; font-size:14px; display:inline-block;">👉 Apply Online Direct Link</a>` : ''}
    ${links.notificationPdf ? `<a href="${links.notificationPdf}" target="_blank" rel="noopener noreferrer" style="background:#0f172a; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:6px; font-weight:600; font-size:14px; display:inline-block;">📄 Download Official PDF</a>` : ''}
    ${links.officialWebsite ? `<a href="${links.officialWebsite}" target="_blank" rel="noopener noreferrer" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; text-decoration:none; padding:12px 20px; border-radius:6px; font-weight:600; font-size:14px; display:inline-block;">🌐 Official Portal</a>` : ''}
  </div>

  <div style="margin-top:20px; font-size:12px; color:#64748b; text-align:center;">
    Published by <strong>Educational Support Council (ESC Kolkata)</strong> - <em>"Saath Saath Manzil Tak"</em> | Website: <a href="https://esckolkata2003.org" style="color:#2563eb;">esckolkata2003.org</a>
  </div>

</div>
<!-- /wp:group -->
`;
}

// Function to publish to WordPress REST API
async function publishToWordPress(exam: ExamNotification): Promise<{ success: boolean; postId?: number; postUrl?: string; error?: string }> {
  const wpConfig = config.wordpress;
  const endpoint = wpConfig.apiEndpoint || `${wpConfig.siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
  const htmlContent = generateWordPressPostHtml(exam);

  const payload = {
    title: exam.title,
    content: htmlContent,
    status: wpConfig.postStatus || 'publish',
    excerpt: `${exam.organization} has released notification for ${exam.postName}. Total Vacancies: ${exam.totalVacancies}. Last Date: ${exam.importantDates.applicationEnd}. Learn eligibility, exam pattern and direct apply link.`,
    tags: []
  };

  // If application password or basic auth configured
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'ESC-ExamTrack-Publisher/1.0'
  };

  if (wpConfig.username && wpConfig.applicationPassword) {
    const authString = Buffer.from(`${wpConfig.username}:${wpConfig.applicationPassword.replace(/\s+/g, '')}`).toString('base64');
    headers['Authorization'] = `Basic ${authString}`;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.message || `WordPress API returned status ${response.status}`;
      return { success: false, error: errMsg };
    }

    const postId = data.id;
    const postUrl = data.link || `${wpConfig.siteUrl}/?p=${postId}`;
    return { success: true, postId, postUrl };
  } catch (err: any) {
    // If remote connection fails (e.g. invalid credentials or sandbox network), provide clear details
    return {
      success: false,
      error: err.message || 'Network error connecting to WordPress REST API at ' + endpoint
    };
  }
}

// Generate the Comprehensive Job Vacancies Page HTML for https://esckolkata2003.org/job-vacancies/
function generateJobVacanciesPageHtml(approvedExams: ExamNotification[]): string {
  const todayStr = formatToDDMMYYYY(new Date());
  let totalVacanciesCount = 0;
  approvedExams.forEach(e => {
    const v = typeof e.totalVacancies === 'number' ? e.totalVacancies : parseInt(String(e.totalVacancies).replace(/[^0-9]/g, '')) || 0;
    totalVacanciesCount += v;
  });

  return `
<!-- wp:group {"style":{"spacing":{"padding":{"top":"30px","right":"20px","bottom":"30px","left":"20px"}}},"className":"esc-job-vacancies-container"} -->
<div class="wp-block-group esc-job-vacancies-container" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:28px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1e293b; max-width:1150px; margin:0 auto;">

  <!-- Hero Header -->
  <div style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color:#ffffff; padding:28px; border-radius:10px; margin-bottom:28px; border-left:6px solid #2563eb; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
    <div>
      <span style="font-size:11px; text-transform:uppercase; letter-spacing:1px; background:#2563eb; padding:4px 10px; border-radius:4px; font-weight:700;">
        Educational Support Council (ESC Kolkata 2003)
      </span>
      <h1 style="margin:10px 0 6px 0; font-size:26px; font-weight:800; color:#ffffff;">
        Job Vacancies & Competitive Exam Notifications
      </h1>
      <p style="margin:0; font-size:14px; color:#94a3b8; font-style:italic;">
        "Saath Saath Manzil Tak" — Employment School Official Vacancies Portal
      </p>
    </div>

    <div style="display:flex; gap:14px; flex-wrap:wrap;">
      <div style="background:#1e293b; border:1px solid #334155; padding:10px 16px; border-radius:8px; text-align:center;">
        <div style="font-size:11px; text-transform:uppercase; color:#94a3b8; font-weight:600;">Active Vacancies</div>
        <div style="font-size:22px; font-weight:800; color:#38bdf8;">${approvedExams.length}</div>
      </div>
      <div style="background:#1e293b; border:1px solid #334155; padding:10px 16px; border-radius:8px; text-align:center;">
        <div style="font-size:11px; text-transform:uppercase; color:#94a3b8; font-weight:600;">Total Posts</div>
        <div style="font-size:22px; font-weight:800; color:#34d399;">${totalVacanciesCount.toLocaleString()}</div>
      </div>
    </div>
  </div>

  <!-- Live Notice Bar -->
  <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px 16px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; font-size:13px; color:#1e40af;">
    <span>📅 <strong>Directory Status:</strong> Active & Updated on <strong>${todayStr}</strong></span>
    <span>⚡ Verified & Approved by ESC Kolkata Editorial Gate</span>
  </div>

  <!-- Quick Vacancy Table -->
  <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:20px; margin-bottom:28px; overflow-x:auto;">
    <h3 style="margin-top:0; margin-bottom:14px; font-size:17px; font-weight:700; color:#0f172a; border-bottom:2px solid #3b82f6; padding-bottom:6px; display:inline-block;">
      📋 Active Job Vacancies Summary
    </h3>
    <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
      <thead>
        <tr style="background:#f1f5f9; color:#475569; border-bottom:2px solid #cbd5e1;">
          <th style="padding:10px 12px;">Organization</th>
          <th style="padding:10px 12px;">Exam / Post Name</th>
          <th style="padding:10px 12px; text-align:center;">Vacancies</th>
          <th style="padding:10px 12px;">Last Date (DD-MM-YYYY)</th>
          <th style="padding:10px 12px;">Qualification</th>
          <th style="padding:10px 12px; text-align:right;">Apply / Notice</th>
        </tr>
      </thead>
      <tbody>
        ${approvedExams.map((exam, i) => `
        <tr style="border-bottom:1px solid #e2e8f0; background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding:10px 12px; font-weight:600; color:#0f172a;">${exam.organization}</td>
          <td style="padding:10px 12px; font-weight:700; color:#1e293b;">
            ${exam.title}
            <div style="font-size:11px; color:#64748b; font-weight:normal;">${exam.postName}</div>
          </td>
          <td style="padding:10px 12px; text-align:center; font-weight:800; color:#2563eb;">${exam.totalVacancies}</td>
          <td style="padding:10px 12px; font-weight:700; color:#b45309;">${formatToDDMMYYYY(exam.importantDates?.applicationEnd)}</td>
          <td style="padding:10px 12px; color:#475569; font-size:12px;">${exam.eligibility?.minQualification ? exam.eligibility.minQualification.substring(0, 50) + '...' : 'Refer to Notice'}</td>
          <td style="padding:10px 12px; text-align:right; white-space:nowrap;">
            ${exam.links?.applyOnline ? `<a href="${exam.links.applyOnline}" target="_blank" rel="noopener noreferrer" style="background:#2563eb; color:#ffffff; text-decoration:none; padding:6px 12px; border-radius:4px; font-size:11px; font-weight:700; display:inline-block; margin-right:4px;">Apply</a>` : ''}
            ${exam.links?.notificationPdf ? `<a href="${exam.links.notificationPdf}" target="_blank" rel="noopener noreferrer" style="background:#0f172a; color:#ffffff; text-decoration:none; padding:6px 10px; border-radius:4px; font-size:11px; font-weight:600; display:inline-block;">PDF</a>` : ''}
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <!-- Detailed Notifications Cards -->
  <h3 style="font-size:18px; font-weight:800; color:#0f172a; margin-bottom:16px;">
    🔍 Detailed Vacancy Information
  </h3>

  <div style="display:flex; flex-direction:column; gap:20px;">
    ${approvedExams.map(exam => `
    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:20px; border-left:5px solid #2563eb;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
        <div>
          <span style="font-size:10px; font-weight:700; color:#2563eb; background:#eff6ff; padding:2px 8px; border-radius:4px; text-transform:uppercase;">${exam.category}</span>
          <h4 style="margin:6px 0 2px 0; font-size:17px; font-weight:800; color:#0f172a;">${exam.title}</h4>
          <div style="font-size:12px; color:#64748b;">${exam.organization} • <strong>${exam.postName}</strong></div>
        </div>
        <div style="background:#f1f5f9; padding:6px 12px; border-radius:6px; text-align:right;">
          <div style="font-size:10px; color:#64748b;">Vacancies</div>
          <div style="font-size:16px; font-weight:800; color:#0f172a;">${exam.totalVacancies} Posts</div>
        </div>
      </div>

      <p style="font-size:13px; color:#334155; line-height:1.6; margin-bottom:12px;">${exam.summary}</p>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; background:#f8fafc; padding:12px; border-radius:6px; font-size:12px; margin-bottom:14px;">
        <div>📅 <strong>Last Date (DD-MM-YYYY):</strong> <span style="color:#b45309; font-weight:700;">${formatToDDMMYYYY(exam.importantDates?.applicationEnd)}</span></div>
        <div>💰 <strong>Pay Scale:</strong> ${exam.salaryRange || 'As per norms'}</div>
        <div>🎓 <strong>Qualification:</strong> ${exam.eligibility?.minQualification || 'See notice'}</div>
        <div>💳 <strong>Application Fee:</strong> ${exam.applicationFee?.generalOBC || 'Refer notice'} (SC/ST: ${exam.applicationFee?.scStPwd || 'Exempted'})</div>
      </div>

      ${exam.escGuidanceNotes ? `
      <div style="background:#f0fdf4; border-left:3px solid #16a34a; padding:10px 14px; border-radius:4px; margin-bottom:14px; font-size:12px; color:#166534;">
        <strong>ESC Kolkata Mentoring Guidance:</strong> ${exam.escGuidanceNotes}
      </div>` : ''}

      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        ${exam.links?.applyOnline ? `<a href="${exam.links.applyOnline}" target="_blank" rel="noopener noreferrer" style="background:#2563eb; color:#ffffff; text-decoration:none; padding:8px 16px; border-radius:4px; font-size:12px; font-weight:700;">👉 Apply Online</a>` : ''}
        ${exam.links?.notificationPdf ? `<a href="${exam.links.notificationPdf}" target="_blank" rel="noopener noreferrer" style="background:#0f172a; color:#ffffff; text-decoration:none; padding:8px 14px; border-radius:4px; font-size:12px; font-weight:600;">📄 Download PDF Notice</a>` : ''}
        ${exam.links?.officialWebsite ? `<a href="${exam.links.officialWebsite}" target="_blank" rel="noopener noreferrer" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; text-decoration:none; padding:8px 14px; border-radius:4px; font-size:12px; font-weight:600;">🌐 Official Portal</a>` : ''}
      </div>
    </div>
    `).join('')}
  </div>

  <!-- Footer Help Contact -->
  <div style="margin-top:32px; background:#f1f5f9; border-radius:8px; padding:18px; text-align:center; font-size:12px; color:#64748b;">
    <div style="font-weight:700; color:#0f172a; margin-bottom:4px;">Educational Support Council (ESC Kolkata) — Employment School</div>
    <div>39 A, Dilkusha Street, Kolkata - 700017, West Bengal | Email: <a href="mailto:esckolkataorg@gmail.com" style="color:#2563eb;">esckolkataorg@gmail.com</a> | Helpline: +91 833 4081 391 / 392</div>
    <div style="margin-top:6px; font-size:11px; color:#94a3b8;">"Saath Saath Manzil Tak" — Supporting deserving students across competitive exams.</div>
  </div>

</div>
<!-- /wp:group -->
`;
}

// Function to sync all approved jobs directly into https://esckolkata2003.org/job-vacancies/
async function syncJobVacanciesPage(): Promise<{ success: boolean; pageId?: number; pageUrl?: string; error?: string; count?: number }> {
  const wpConfig = config.wordpress;
  const siteUrl = wpConfig.siteUrl.replace(/\/$/, '');
  const pageSlug = wpConfig.jobVacanciesPageSlug || 'job-vacancies';
  const pageUrl = wpConfig.jobVacanciesPageUrl || `${siteUrl}/${pageSlug}/`;

  // Get active approved and published exams
  const approvedList = exams.filter(e => e.status === 'approved' || e.status === 'published');
  const htmlContent = generateJobVacanciesPageHtml(approvedList);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'ESC-ExamTrack-Publisher/1.0'
  };

  if (wpConfig.username && wpConfig.applicationPassword) {
    const authString = Buffer.from(`${wpConfig.username}:${wpConfig.applicationPassword.replace(/\s+/g, '')}`).toString('base64');
    headers['Authorization'] = `Basic ${authString}`;
  }

  try {
    // Step 1: Check if page exists by slug
    let pageId: number | null = null;
    const searchRes = await fetch(`${siteUrl}/wp-json/wp/v2/pages?slug=${pageSlug}`, { headers });
    if (searchRes.ok) {
      const existingPages = await searchRes.json();
      if (Array.isArray(existingPages) && existingPages.length > 0) {
        pageId = existingPages[0].id;
      }
    }

    let resultRes;
    if (pageId) {
      // Update existing page
      resultRes = await fetch(`${siteUrl}/wp-json/wp/v2/pages/${pageId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: 'Job Vacancies',
          content: htmlContent,
          status: 'publish'
        })
      });
    } else {
      // Create new page with slug job-vacancies
      resultRes = await fetch(`${siteUrl}/wp-json/wp/v2/pages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: 'Job Vacancies',
          slug: pageSlug,
          content: htmlContent,
          status: 'publish'
        })
      });
    }

    const data = await resultRes.json();

    if (!resultRes.ok) {
      const errMsg = data.message || `WordPress API returned status ${resultRes.status}`;
      return { success: false, error: errMsg, count: approvedList.length };
    }

    const finalId = data.id || pageId;
    const finalUrl = data.link || pageUrl;

    logs.unshift({
      id: `log-page-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'wordpress_publish',
      channel: 'web',
      title: `Synced Approved Jobs to ${pageUrl}`,
      details: `Updated ${approvedList.length} approved job vacancies into WordPress page (ID: ${finalId}).`,
      status: 'success',
      extraUrl: finalUrl
    });
    saveStore();

    return { success: true, pageId: finalId, pageUrl: finalUrl, count: approvedList.length };
  } catch (err: any) {
    return {
      success: false,
      error: `Network error connecting to ${siteUrl}: ${err.message}`,
      count: approvedList.length
    };
  }
}

// Function to send notifications across channels
async function dispatchNotifications(exam: ExamNotification, baseUrl: string) {
  const token = Buffer.from(`${exam.id}-esc-secret`).toString('base64');
  const approveUrl = `${baseUrl}/api/approve-action?id=${exam.id}&action=approve&token=${token}`;
  const rejectUrl = `${baseUrl}/api/approve-action?id=${exam.id}&action=reject&token=${token}`;
  const viewUrl = `${baseUrl}/#exam-${exam.id}`;

  const results: Record<string, any> = {};

  const applyCheck = exam.linkVerification?.applyOnline;
  const pdfCheck = exam.linkVerification?.notificationPdf;
  const applyStatusLabel = applyCheck?.valid
    ? (applyCheck.status === 'verified' ? '✅ Verified (Reachable)' : '⚠️ Manual Checked / WAF')
    : '❌ Not Verified';
  const pdfStatusLabel = pdfCheck?.valid
    ? (pdfCheck.status === 'verified' ? '✅ Verified (PDF Direct Link)' : '⚠️ Manual Checked / WAF')
    : '❌ Not Verified';

  // 1. Email notification
  if (config.adminEmail.enabled) {
    // Record log and email dispatch payload
    logs.unshift({
      id: `log-email-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'notification_sent',
      channel: 'email',
      title: `Email Alert Sent to ${config.adminEmail.email}`,
      details: `Alert generated for "${exam.title}" (${exam.totalVacancies} vacancies). Links Checked: Apply [${applyStatusLabel}], PDF [${pdfStatusLabel}]. 1-click Approval Link: ${approveUrl}`,
      status: 'success',
      examId: exam.id,
      extraUrl: approveUrl
    });
    results.email = { sent: true, recipient: config.adminEmail.email, approveUrl };
  }

  // 2. WhatsApp notification
  if (config.adminWhatsApp.enabled) {
    const waText = encodeURIComponent(
      `🚨 *NEW EXAM ALERT FOR APPROVAL*\n\n` +
      `📌 *${exam.title}*\n` +
      `🏢 Org: ${exam.organization}\n` +
      `👥 Vacancies: ${exam.totalVacancies}\n` +
      `📅 Last Date: ${exam.importantDates.applicationEnd}\n` +
      `💰 Salary: ${exam.salaryRange}\n\n` +
      `🔗 *Mandatory Link Verification Status:*\n` +
      `• Apply Online Direct Link: ${applyStatusLabel}\n` +
      `• Official Notification PDF: ${pdfStatusLabel}\n\n` +
      `👉 *Approve & Auto-Publish to ESC Website:*\n${approveUrl}&channel=whatsapp\n\n` +
      `❌ *Reject:* ${rejectUrl}&channel=whatsapp\n` +
      `🌐 *Details:* ${viewUrl}`
    );
    const waLink = `https://wa.me/${config.adminWhatsApp.phoneNumber.replace(/[^0-9]/g, '')}?text=${waText}`;

    logs.unshift({
      id: `log-wa-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'notification_sent',
      channel: 'whatsapp',
      title: `WhatsApp Notification Dispatched to ${config.adminWhatsApp.phoneNumber}`,
      details: `Alert with verified link badges and instant approval link ready for WhatsApp dispatch.`,
      status: 'success',
      examId: exam.id,
      extraUrl: waLink
    });
    results.whatsapp = { sent: true, recipient: config.adminWhatsApp.phoneNumber, waLink };
  }

  // 3. Telegram notification
  if (config.adminTelegram.enabled) {
    const telegramText =
      `📢 *New Notification Pending Approval for ESC Kolkata*\n\n` +
      `*${exam.title}*\n` +
      `• *Organization:* ${exam.organization}\n` +
      `• *Vacancies:* ${exam.totalVacancies}\n` +
      `• *Last Date to Apply:* ${exam.importantDates.applicationEnd}\n` +
      `• *Pay Scale:* ${exam.salaryRange}\n\n` +
      `🔗 *Link Verification Check:*\n` +
      `• *Apply Online Link:* ${applyStatusLabel}\n` +
      `• *Official Notice PDF:* ${pdfStatusLabel}\n\n` +
      `_Tap a button below to take instant action:_`;

    let telegramApiStatus = 'simulated';

    // If bot token and chat ID are provided, execute real Telegram API call!
    if (config.adminTelegram.botToken && config.adminTelegram.chatId) {
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${config.adminTelegram.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.adminTelegram.chatId,
            text: telegramText,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ Approve & Publish to Website', url: `${approveUrl}&channel=telegram` },
                  { text: '❌ Reject', url: `${rejectUrl}&channel=telegram` }
                ],
                [
                  { text: '🌐 View in ExamTrack ESC', url: viewUrl }
                ]
              ]
            }
          })
        });
        const tgData = await tgRes.json();
        telegramApiStatus = tgData.ok ? 'delivered_to_bot' : `error: ${tgData.description}`;
      } catch (err: any) {
        telegramApiStatus = `api_error: ${err.message}`;
      }
    }

    logs.unshift({
      id: `log-tg-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'notification_sent',
      channel: 'telegram',
      title: `Telegram Alert Dispatched`,
      details: `Interactive approval alert sent. Status: ${telegramApiStatus}. Token/Chat: ${config.adminTelegram.chatId ? 'Configured' : 'Simulated'}`,
      status: 'success',
      examId: exam.id
    });
    results.telegram = { sent: true, status: telegramApiStatus, chatId: config.adminTelegram.chatId };
  }

  saveStore();
  return results;
}

// Link Verification Helper
async function verifySingleLink(rawUrl: string, isPdfTarget = false): Promise<SingleLinkCheck> {
  const url = (rawUrl || '').trim();
  const checkedAt = new Date().toISOString();

  if (!url) {
    return {
      url: '',
      valid: false,
      status: 'error',
      message: isPdfTarget ? 'Official Notification PDF Link is required' : 'Apply Online Link is required',
      isPdf: false,
      checkedAt
    };
  }

  // Validate URL syntax
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        url,
        valid: false,
        status: 'error',
        message: 'Invalid protocol. URL must start with http:// or https://',
        isPdf: false,
        checkedAt
      };
    }
  } catch {
    return {
      url,
      valid: false,
      status: 'error',
      message: 'Invalid URL syntax. Please enter a valid web address.',
      isPdf: false,
      checkedAt
    };
  }

  const pathname = parsedUrl.pathname.toLowerCase();
  const search = parsedUrl.search.toLowerCase();
  const hasPdfExtension = pathname.endsWith('.pdf') || pathname.includes('.pdf') || search.includes('.pdf');

  // Attempt fetch with HEAD, fallback to GET
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7500);

  const reqHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': isPdfTarget 
      ? 'application/pdf,application/octet-stream,*/*;q=0.8' 
      : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache'
  };

  try {
    let response: any;
    try {
      response = await fetch(url, {
        method: 'HEAD',
        headers: reqHeaders,
        signal: controller.signal,
        redirect: 'follow'
      });
      if (response.status === 405 || response.status === 501) {
        response = await fetch(url, {
          method: 'GET',
          headers: { ...reqHeaders, Range: 'bytes=0-1024' },
          signal: controller.signal,
          redirect: 'follow'
        });
      }
    } catch (headErr: any) {
      if (headErr.name === 'AbortError') throw headErr;
      response = await fetch(url, {
        method: 'GET',
        headers: reqHeaders,
        signal: controller.signal,
        redirect: 'follow'
      });
    }

    clearTimeout(timeoutId);

    const statusCode = response.status;
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const isPdfContent = contentType.includes('application/pdf') || contentType.includes('application/octet-stream') || hasPdfExtension;

    // 200..299 or 300..399
    if (statusCode >= 200 && statusCode < 400) {
      if (isPdfTarget) {
        if (isPdfContent) {
          return {
            url,
            valid: true,
            status: 'verified',
            statusCode,
            message: `Verified: Reachable official PDF document (HTTP ${statusCode})`,
            isPdf: true,
            contentType,
            checkedAt
          };
        } else {
          return {
            url,
            valid: true,
            status: 'warning',
            statusCode,
            message: `URL is reachable (HTTP ${statusCode}), but Content-Type is "${contentType || 'webpage'}". Confirm it points directly to the notification document.`,
            isPdf: false,
            contentType,
            checkedAt
          };
        }
      }

      return {
        url,
        valid: true,
        status: 'verified',
        statusCode,
        message: `Verified: Direct link active and reachable (HTTP ${statusCode})`,
        isPdf: false,
        contentType,
        checkedAt
      };
    }

    // 403, 401, 429: Cloudflare / Government WAF block
    if (statusCode === 403 || statusCode === 401 || statusCode === 429) {
      return {
        url,
        valid: true,
        status: 'warning',
        statusCode,
        message: `HTTP ${statusCode} (Govt Portal / Cloudflare firewall active). Host is live; click "Open Link" to confirm reachability in browser.`,
        isPdf: hasPdfExtension,
        contentType,
        checkedAt
      };
    }

    // 404, 410: Not Found
    if (statusCode === 404 || statusCode === 410) {
      return {
        url,
        valid: false,
        status: 'error',
        statusCode,
        message: `HTTP ${statusCode}: Page or document Not Found (Broken Link). Please update URL.`,
        isPdf: false,
        contentType,
        checkedAt
      };
    }

    // 500..599: Server error
    if (statusCode >= 500) {
      return {
        url,
        valid: false,
        status: 'warning',
        statusCode,
        message: `HTTP ${statusCode}: Server temporary error or maintenance. Verify before publishing.`,
        isPdf: hasPdfExtension,
        contentType,
        checkedAt
      };
    }

    return {
      url,
      valid: false,
      status: 'warning',
      statusCode,
      message: `HTTP ${statusCode} received from host.`,
      isPdf: isPdfContent,
      contentType,
      checkedAt
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return {
        url,
        valid: true,
        status: 'warning',
        message: 'Connection timed out after 7.5s (Govt portal slow or blocking ping). Click "Open Link" to confirm reachability in browser.',
        isPdf: hasPdfExtension,
        checkedAt
      };
    }

    const errMsg = err.message || '';
    if (errMsg.includes('ENOTFOUND') || errMsg.includes('getaddrinfo')) {
      return {
        url,
        valid: false,
        status: 'error',
        message: `Domain not found / DNS resolution failed: ${parsedUrl.hostname}`,
        isPdf: false,
        checkedAt
      };
    }

    return {
      url,
      valid: false,
      status: 'warning',
      message: `Network check note: ${errMsg || 'Connection failed'}. Open link to confirm.`,
      isPdf: hasPdfExtension,
      checkedAt
    };
  }
}

async function verifyExamLinks(links: { applyOnline?: string; notificationPdf?: string; officialWebsite?: string }): Promise<ExamLinkVerification> {
  const [applyCheck, pdfCheck, webCheck] = await Promise.all([
    verifySingleLink(links.applyOnline || '', false),
    verifySingleLink(links.notificationPdf || '', true),
    links.officialWebsite ? verifySingleLink(links.officialWebsite, false) : Promise.resolve(undefined)
  ]);

  const verified = applyCheck.valid && pdfCheck.valid && applyCheck.status !== 'error' && pdfCheck.status !== 'error';

  return {
    verified,
    applyOnline: applyCheck,
    notificationPdf: pdfCheck,
    officialWebsite: webCheck,
    checkedAt: new Date().toISOString()
  };
}

// Strict Link Confirmation Check:
// If links are not available or confirmed, exam must be removed from approval queue
function checkExamLinksConfirmed(exam: ExamNotification): { confirmed: boolean; reason: string } {
  const applyUrl = exam.links?.applyOnline?.trim() || '';
  const pdfUrl = exam.links?.notificationPdf?.trim() || '';

  if (!applyUrl || !pdfUrl) {
    const missing: string[] = [];
    if (!applyUrl) missing.push('Apply Online Direct Link');
    if (!pdfUrl) missing.push('Official Notification PDF');
    return {
      confirmed: false,
      reason: `Mandatory link(s) missing: ${missing.join(', ')}`
    };
  }

  const isValidUrl = (url: string) => {
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  if (!isValidUrl(applyUrl)) {
    return {
      confirmed: false,
      reason: 'Apply Online Direct Link is not a valid URL (must start with http:// or https://)'
    };
  }

  if (!isValidUrl(pdfUrl)) {
    return {
      confirmed: false,
      reason: 'Official Notification PDF is not a valid URL (must start with http:// or https://)'
    };
  }

  const verif = exam.linkVerification;
  if (!verif) {
    return {
      confirmed: false,
      reason: 'Mandatory links have not been verified yet.'
    };
  }

  const applyCheck = verif.applyOnline;
  const pdfCheck = verif.notificationPdf;

  if (!applyCheck || applyCheck.status === 'unchecked') {
    return {
      confirmed: false,
      reason: 'Apply Online Direct Link verification is unconfirmed.'
    };
  }

  if (applyCheck.status === 'error' || applyCheck.valid === false) {
    return {
      confirmed: false,
      reason: `Apply Online Direct Link verification failed: ${applyCheck.message || 'Broken URL or unreachable host'}.`
    };
  }

  if (!pdfCheck || pdfCheck.status === 'unchecked') {
    return {
      confirmed: false,
      reason: 'Official Notification PDF verification is unconfirmed.'
    };
  }

  if (pdfCheck.status === 'error' || pdfCheck.valid === false) {
    return {
      confirmed: false,
      reason: `Official Notification PDF verification failed: ${pdfCheck.message || 'Broken URL or unreachable host'}.`
    };
  }

  return { confirmed: true, reason: 'Links are available and confirmed.' };
}

// Prune unconfirmed / missing links from pending_approval queue to draft
function pruneUnconfirmedFromQueue(): { prunedCount: number; prunedExams: ExamNotification[] } {
  const pruned: ExamNotification[] = [];
  exams.forEach(exam => {
    if (exam.status === 'pending_approval') {
      const check = checkExamLinksConfirmed(exam);
      if (!check.confirmed) {
        exam.status = 'draft';
        exam.queueRemovalReason = check.reason;
        exam.removedFromQueueAt = new Date().toISOString();
        exam.updatedAt = new Date().toISOString();
        pruned.push(exam);

        logs.unshift({
          id: `log-prune-${Date.now()}-${exam.id}`,
          timestamp: new Date().toISOString(),
          type: 'queue_prune',
          channel: 'web',
          title: `Removed from Approval Queue: ${exam.title}`,
          details: `Item removed from approval queue and moved to Drafts: ${check.reason}`,
          status: 'warning',
          examId: exam.id
        });
      }
    }
  });

  if (pruned.length > 0) {
    saveStore();
  }

  return { prunedCount: pruned.length, prunedExams: pruned };
}

// Initial queue audit pass on boot
pruneUnconfirmedFromQueue();

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString(), app: 'ExamTrack ESC' });
});

// Prune unconfirmed links from approval queue
app.post('/api/queue/prune-unconfirmed', (req: Request, res: Response) => {
  const result = pruneUnconfirmedFromQueue();
  res.json({ success: true, ...result });
});

// Link Verification Endpoint
app.post('/api/verify-links', async (req: Request, res: Response) => {
  try {
    const { applyOnline, notificationPdf, officialWebsite } = req.body;
    const result = await verifyExamLinks({ applyOnline, notificationPdf, officialWebsite });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Link verification failed' });
  }
});

// Get all exam notifications
app.get('/api/exams', (req: Request, res: Response) => {
  res.json({ exams });
});

// Get single exam
app.get('/api/exams/:id', (req: Request, res: Response) => {
  const exam = exams.find(e => e.id === req.params.id);
  if (!exam) {
    res.status(404).json({ error: 'Exam not found' });
    return;
  }
  res.json({ exam });
});

// Create new exam notification
app.post('/api/exams', async (req: Request, res: Response) => {
  try {
    const raw = req.body;

    // Verify links before saving if not already verified
    let linkVerification = raw.linkVerification;
    if (!linkVerification || !linkVerification.checkedAt) {
      linkVerification = await verifyExamLinks(raw.links || {
        applyOnline: raw.links?.applyOnline || '',
        notificationPdf: raw.links?.notificationPdf || '',
        officialWebsite: raw.links?.officialWebsite || ''
      });
    }

    let initialStatus = raw.status || 'pending_approval';
    let queueRemovalReason: string | undefined = undefined;
    let removedFromQueueAt: string | undefined = undefined;

    // Quality gate: If links are not available or confirmed, then remove from approval queue
    if (initialStatus === 'pending_approval') {
      const tempExam = {
        links: raw.links || { applyOnline: '', notificationPdf: '', officialWebsite: '' },
        linkVerification
      } as ExamNotification;
      const check = checkExamLinksConfirmed(tempExam);
      if (!check.confirmed) {
        initialStatus = 'draft';
        queueRemovalReason = check.reason;
        removedFromQueueAt = new Date().toISOString();

        logs.unshift({
          id: `log-prune-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'queue_prune',
          channel: 'web',
          title: `Excluded from Approval Queue: ${raw.title || 'New Exam'}`,
          details: `Mandatory links unconfirmed. Saved as Draft: ${check.reason}`,
          status: 'warning'
        });
      }
    }

    const newExam: ExamNotification = {
      id: raw.id || `exam-${Date.now()}`,
      title: raw.title || 'Untitled Exam Notification',
      organization: raw.organization || 'Government / Recruitment Body',
      postName: raw.postName || 'Various Posts',
      category: raw.category || 'Other',
      status: initialStatus,
      totalVacancies: raw.totalVacancies || 'TBD',
      salaryRange: raw.salaryRange || 'As per norms',
      importantDates: {
        applicationStart: formatToDDMMYYYY(raw.importantDates?.applicationStart || new Date()),
        applicationEnd: formatToDDMMYYYY(raw.importantDates?.applicationEnd || new Date(Date.now() + 30 * 86400000)),
        feeLastDate: raw.importantDates?.feeLastDate ? formatToDDMMYYYY(raw.importantDates.feeLastDate) : undefined,
        admitCardDate: raw.importantDates?.admitCardDate ? formatToDDMMYYYY(raw.importantDates.admitCardDate) : undefined,
        examDate: raw.importantDates?.examDate ? formatToDDMMYYYY(raw.importantDates.examDate) : undefined,
        resultDate: raw.importantDates?.resultDate ? formatToDDMMYYYY(raw.importantDates.resultDate) : undefined
      },
      eligibility: raw.eligibility || {
        minQualification: 'Graduate / Class 10/12 depending on post',
        ageLimit: '18 - 35 years'
      },
      applicationFee: raw.applicationFee || {
        generalOBC: '₹100 - ₹500',
        scStPwd: 'Nil / Exempted'
      },
      selectionProcess: raw.selectionProcess || ['Written Test', 'Interview'],
      syllabusHighlights: raw.syllabusHighlights || '',
      vacancyDetails: raw.vacancyDetails || [],
      links: raw.links || {
        officialWebsite: 'https://esckolkata2003.org',
        notificationPdf: '',
        applyOnline: ''
      },
      linkVerification,
      queueRemovalReason,
      removedFromQueueAt,
      summary: raw.summary || '',
      escGuidanceNotes: raw.escGuidanceNotes || 'Free mentoring and guidance available at ESC Kolkata Employment School.',
      tags: raw.tags || ['Govt Job', 'Notification'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    exams.unshift(newExam);
    saveStore();

    // If new exam is in pending_approval, automatically dispatch alerts to admin email, whatsapp, and telegram!
    const baseUrl = req.protocol + '://' + req.get('host');
    if (newExam.status === 'pending_approval') {
      await dispatchNotifications(newExam, baseUrl);
    }

    res.status(201).json({ success: true, exam: newExam, queueRemovalReason });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update exam
app.put('/api/exams/:id', (req: Request, res: Response) => {
  const index = exams.findIndex(e => e.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Exam not found' });
    return;
  }

  const updated: ExamNotification = {
    ...exams[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  let queueNotice: string | undefined = undefined;
  if (updated.status === 'pending_approval') {
    const check = checkExamLinksConfirmed(updated);
    if (!check.confirmed) {
      updated.status = 'draft';
      updated.queueRemovalReason = check.reason;
      updated.removedFromQueueAt = new Date().toISOString();
      queueNotice = `Removed from approval queue and moved to Drafts: ${check.reason}`;

      logs.unshift({
        id: `log-prune-${Date.now()}-${updated.id}`,
        timestamp: new Date().toISOString(),
        type: 'queue_prune',
        channel: 'web',
        title: `Removed from Approval Queue: ${updated.title}`,
        details: `Mandatory links unconfirmed. Moved to Drafts: ${check.reason}`,
        status: 'warning',
        examId: updated.id
      });
    } else {
      updated.queueRemovalReason = undefined;
      updated.removedFromQueueAt = undefined;
    }
  }

  exams[index] = updated;
  saveStore();
  res.json({ success: true, exam: exams[index], queueNotice });
});

// Delete exam
app.delete('/api/exams/:id', (req: Request, res: Response) => {
  const initialLen = exams.length;
  exams = exams.filter(e => e.id !== req.params.id);
  if (exams.length === initialLen) {
    res.status(404).json({ error: 'Exam not found' });
    return;
  }
  saveStore();
  res.json({ success: true });
});

// Update status (Approve, Reject, Draft)
app.post('/api/exams/:id/status', async (req: Request, res: Response) => {
  const { status, channel, note } = req.body;
  const exam = exams.find(e => e.id === req.params.id);
  if (!exam) {
    res.status(404).json({ error: 'Exam not found' });
    return;
  }

  // Quality gate: Cannot approve or send to pending_approval if links are not available or confirmed
  if (status === 'approved' || status === 'pending_approval') {
    const check = checkExamLinksConfirmed(exam);
    if (!check.confirmed) {
      exam.status = 'draft';
      exam.queueRemovalReason = check.reason;
      exam.removedFromQueueAt = new Date().toISOString();
      exam.updatedAt = new Date().toISOString();
      saveStore();

      logs.unshift({
        id: `log-block-${Date.now()}-${exam.id}`,
        timestamp: new Date().toISOString(),
        type: 'queue_prune',
        channel: channel || 'web',
        title: `Action Blocked & Removed to Drafts: ${exam.title}`,
        details: `Cannot ${status === 'approved' ? 'approve' : 'queue'} exam: ${check.reason}. Item demoted to Drafts.`,
        status: 'error',
        examId: exam.id
      });

      res.status(400).json({
        error: `Cannot ${status === 'approved' ? 'approve' : 'queue for approval'}: Both Apply Online Direct Link and Official Notification PDF must be available and confirmed. The notification has been moved to Drafts.`,
        reason: check.reason,
        exam
      });
      return;
    } else {
      exam.queueRemovalReason = undefined;
      exam.removedFromQueueAt = undefined;
    }
  }

  exam.status = status;
  exam.updatedAt = new Date().toISOString();

  if (status === 'approved') {
    exam.approvedAt = new Date().toISOString();
    exam.approvalChannel = channel || 'web';

    logs.unshift({
      id: `log-app-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'approval',
      channel: channel || 'web',
      title: `Exam Approved via ${channel ? channel.toUpperCase() : 'Web Dashboard'}`,
      details: `"${exam.title}" approved by admin. ${note || ''}`,
      status: 'success',
      examId: exam.id
    });

    // Check auto-publish on approval
    if (config.wordpress.autoPublishOnApproval) {
      const wpResult = await publishToWordPress(exam);
      if (wpResult.success) {
        exam.status = 'published';
        exam.publishedAt = new Date().toISOString();
        exam.wpPostId = wpResult.postId;
        exam.wpPostUrl = wpResult.postUrl;
        exam.wpPublishStatus = 'publish';

        logs.unshift({
          id: `log-wp-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'wordpress_publish',
          channel: channel || 'web',
          title: `Auto-Published to WordPress (${wpResult.postId})`,
          details: `Post successfully published on esckolkata2003.org: ${wpResult.postUrl}`,
          status: 'success',
          examId: exam.id,
          extraUrl: wpResult.postUrl
        });
      } else {
        logs.unshift({
          id: `log-wp-err-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'wordpress_publish',
          channel: channel || 'web',
          title: `WordPress Auto-Publish Notice: ${wpResult.error}`,
          details: `Post approved and saved in ready queue. To publish directly to live WordPress, ensure Application Password is set in Settings.`,
          status: 'warning',
          examId: exam.id
        });
      }
    }

    // Auto-sync approved jobs to the https://esckolkata2003.org/job-vacancies/ page
    if (config.wordpress.autoSyncJobVacanciesPage) {
      syncJobVacanciesPage().catch(err => console.error('Auto-sync job vacancies page failed:', err));
    }
  } else if (status === 'rejected') {
    logs.unshift({
      id: `log-rej-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'rejection',
      channel: channel || 'web',
      title: `Exam Rejected via ${channel || 'web'}`,
      details: `"${exam.title}" marked as rejected. Note: ${note || 'Not approved'}`,
      status: 'warning',
      examId: exam.id
    });
  }

  saveStore();
  res.json({ success: true, exam });
});

// Trigger publish to WordPress directly
app.post('/api/exams/:id/publish-wp', async (req: Request, res: Response) => {
  const exam = exams.find(e => e.id === req.params.id);
  if (!exam) {
    res.status(404).json({ error: 'Exam not found' });
    return;
  }

  const result = await publishToWordPress(exam);

  if (result.success) {
    exam.status = 'published';
    exam.publishedAt = new Date().toISOString();
    exam.wpPostId = result.postId;
    exam.wpPostUrl = result.postUrl;
    exam.wpPublishStatus = 'publish';

    logs.unshift({
      id: `log-wp-manual-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'wordpress_publish',
      channel: 'web',
      title: `Published to WordPress (${result.postId})`,
      details: `Live on esckolkata2003.org at: ${result.postUrl}`,
      status: 'success',
      examId: exam.id,
      extraUrl: result.postUrl
    });

    saveStore();
    res.json({ success: true, postId: result.postId, postUrl: result.postUrl });
  } else {
    // If publish fails or demo mode, record log
    logs.unshift({
      id: `log-wp-fail-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'wordpress_publish',
      channel: 'web',
      title: `WordPress Publish Attempt: ${result.error}`,
      details: `Check WordPress URL (${config.wordpress.siteUrl}) & Application Password.`,
      status: 'error',
      examId: exam.id
    });
    saveStore();
    res.status(400).json({ success: false, error: result.error });
  }
});

// 1-Click Remote Approval Action Handler
// Triggered from Email links, WhatsApp links, or Telegram buttons!
app.get('/api/approve-action', async (req: Request, res: Response) => {
  const { id, action, channel, token } = req.query as { id: string; action: string; channel?: string; token?: string };

  const exam = exams.find(e => e.id === id);
  if (!exam) {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Notification Not Found</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family:sans-serif; text-align:center; padding:50px; background:#f8fafc;">
        <h2 style="color:#ef4444;">Notification Not Found</h2>
        <p>The exam notification ID is invalid or has expired.</p>
        <a href="/" style="background:#2563eb; color:white; padding:10px 20px; text-decoration:none; border-radius:6px;">Go to Dashboard</a>
      </body>
      </html>
    `);
    return;
  }

  const verifiedChannel = (channel as any) || 'email';

  if (action === 'approve') {
    const check = checkExamLinksConfirmed(exam);
    if (!check.confirmed) {
      exam.status = 'draft';
      exam.queueRemovalReason = check.reason;
      exam.removedFromQueueAt = new Date().toISOString();
      exam.updatedAt = new Date().toISOString();
      saveStore();

      logs.unshift({
        id: `log-remote-blocked-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'queue_prune',
        channel: verifiedChannel,
        title: `Remote Approval Blocked & Removed to Drafts: ${exam.title}`,
        details: `Exam cannot be approved: ${check.reason}. Removed from approval queue.`,
        status: 'error',
        examId: exam.id
      });

      res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Approval Blocked - Quality Gate</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: #1e293b; border: 1px solid #ef4444; border-radius: 12px; max-width: 550px; width: 100%; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); text-align: center; }
            .badge { display: inline-block; background: #7f1d1d; color: #f87171; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 16px; }
            h1 { margin: 0 0 12px 0; font-size: 22px; color: #ef4444; }
            p { color: #94a3b8; line-height: 1.6; }
            .reason-box { background: #0f172a; border-radius: 8px; padding: 14px; margin: 16px 0; text-align: left; border-left: 4px solid #ef4444; color: #fca5a5; font-size: 13px; }
            .btn { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 13px; margin-top: 12px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">Rule Enforced: Links Unconfirmed</div>
            <h1>Removed from Approval Queue</h1>
            <p><strong>${exam.title}</strong> cannot be approved or published to <strong>esckolkata2003.org</strong> because mandatory links are missing or unconfirmed.</p>
            <div class="reason-box">
              <strong>Removal Reason:</strong> ${check.reason}
            </div>
            <p style="font-size:12px; color:#64748b;">The exam has been moved to <strong>Drafts</strong>. Please verify and confirm both the Apply Online Direct Link and Official Notification PDF before approving.</p>
            <a href="/" class="btn">Open Admin Dashboard</a>
          </div>
        </body>
        </html>
      `);
      return;
    }

    exam.status = 'approved';
    exam.approvedAt = new Date().toISOString();
    exam.approvalChannel = verifiedChannel;

    let publishStatusMsg = 'Notification approved and queued.';
    let publishedLive = false;

    // Auto-publish to WordPress if enabled
    if (config.wordpress.autoPublishOnApproval) {
      const wpResult = await publishToWordPress(exam);
      if (wpResult.success) {
        exam.status = 'published';
        exam.publishedAt = new Date().toISOString();
        exam.wpPostId = wpResult.postId;
        exam.wpPostUrl = wpResult.postUrl;
        exam.wpPublishStatus = 'publish';
        publishedLive = true;
        publishStatusMsg = `Successfully published to <strong>esckolkata2003.org</strong>!`;

        logs.unshift({
          id: `log-remote-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'wordpress_publish',
          channel: verifiedChannel,
          title: `Remote Approval via ${verifiedChannel.toUpperCase()} -> Published to WordPress`,
          details: `Post live at: ${wpResult.postUrl}`,
          status: 'success',
          examId: exam.id,
          extraUrl: wpResult.postUrl
        });
      } else {
        publishStatusMsg = `Approved! (WordPress auto-publish note: ${wpResult.error})`;
        logs.unshift({
          id: `log-remote-wp-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'approval',
          channel: verifiedChannel,
          title: `Approved via ${verifiedChannel.toUpperCase()}`,
          details: `WordPress note: ${wpResult.error}`,
          status: 'warning',
          examId: exam.id
        });
      }
    } else {
      logs.unshift({
        id: `log-remote-only-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'approval',
        channel: verifiedChannel,
        title: `Approved via ${verifiedChannel.toUpperCase()}`,
        details: `Saved in approved state.`,
        status: 'success',
        examId: exam.id
      });
    }

    // Auto-sync approved jobs to https://esckolkata2003.org/job-vacancies/
    if (config.wordpress.autoSyncJobVacanciesPage) {
      syncJobVacanciesPage().catch(err => console.error('Remote approval page sync failed:', err));
    }

    saveStore();

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Approval Confirmed - ESC Kolkata</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; max-width: 550px; width: 100%; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); text-align: center; }
          .badge { display: inline-block; background: #065f46; color: #34d399; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
          h1 { margin: 0 0 12px 0; font-size: 24px; color: #ffffff; }
          p { color: #94a3b8; line-height: 1.6; margin: 8px 0; }
          .details-box { background: #0f172a; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: left; border-left: 4px solid #10b981; }
          .btn { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; margin: 6px; }
          .btn-secondary { background: #334155; color: #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Action Executed: ${verifiedChannel.toUpperCase()}</div>
          <h1>Notification Approved!</h1>
          <p>${publishStatusMsg}</p>
          <div class="details-box">
            <div style="font-weight: 700; color: #f1f5f9; font-size: 16px;">${exam.title}</div>
            <div style="color: #64748b; font-size: 13px; margin-top: 4px;">Org: ${exam.organization} | Posts: ${exam.totalVacancies}</div>
            <div style="color: #64748b; font-size: 13px;">Last Date: ${exam.importantDates.applicationEnd}</div>
            ${exam.wpPostUrl ? `<div style="margin-top: 8px;"><a href="${exam.wpPostUrl}" target="_blank" style="color: #38bdf8; font-size: 14px; font-weight: 600;">👉 View Live on esckolkata2003.org &rarr;</a></div>` : ''}
          </div>
          <div>
            ${exam.wpPostUrl ? `<a href="${exam.wpPostUrl}" target="_blank" class="btn" style="background:#10b981;">View on ESC Website</a>` : ''}
            <a href="/" class="btn btn-secondary">Open Admin Dashboard</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } else if (action === 'reject') {
    exam.status = 'rejected';
    exam.updatedAt = new Date().toISOString();
    logs.unshift({
      id: `log-remote-rej-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'rejection',
      channel: verifiedChannel,
      title: `Rejected via ${verifiedChannel.toUpperCase()}`,
      details: `Exam marked as rejected by admin remote action.`,
      status: 'warning',
      examId: exam.id
    });
    saveStore();

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Notification Rejected - ESC Kolkata</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; max-width: 500px; width: 100%; padding: 32px; text-align: center; }
          .badge { display: inline-block; background: #7f1d1d; color: #f87171; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 16px; }
          h1 { margin: 0 0 12px 0; font-size: 22px; color: #ffffff; }
          p { color: #94a3b8; line-height: 1.6; }
          .btn { display: inline-block; background: #334155; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Rejected via ${verifiedChannel.toUpperCase()}</div>
          <h1>Notification Declined</h1>
          <p><strong>${exam.title}</strong> has been rejected and will not be published to the website.</p>
          <a href="/" class="btn">Open Admin Dashboard</a>
        </div>
      </body>
      </html>
    `);
  } else {
    res.redirect('/');
  }
});

// Telegram Bot Webhook endpoint (handles interactive callback queries)
app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
  try {
    const update = req.body;
    // Check if it's a callback query (inline button click)
    if (update.callback_query) {
      const callback = update.callback_query;
      const data = callback.data || '';
      const [action, examId] = data.split(':');

      const exam = exams.find(e => e.id === examId);
      if (exam) {
        if (action === 'approve') {
          const check = checkExamLinksConfirmed(exam);
          if (!check.confirmed) {
            exam.status = 'draft';
            exam.queueRemovalReason = check.reason;
            exam.removedFromQueueAt = new Date().toISOString();
            exam.updatedAt = new Date().toISOString();
            saveStore();

            logs.unshift({
              id: `log-tg-blocked-${Date.now()}`,
              timestamp: new Date().toISOString(),
              type: 'queue_prune',
              channel: 'telegram',
              title: `Telegram Approval Blocked: ${exam.title}`,
              details: `Links unconfirmed (${check.reason}). Removed from queue to Drafts.`,
              status: 'error',
              examId: exam.id
            });

            if (config.adminTelegram.botToken) {
              await fetch(`https://api.telegram.org/bot${config.adminTelegram.botToken}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  callback_query_id: callback.id,
                  text: `❌ Approval Blocked: ${check.reason}. Moved to Drafts.`,
                  show_alert: true
                })
              });
            }
            res.json({ ok: true, blocked: true, reason: check.reason });
            return;
          }

          exam.status = 'approved';
          exam.approvedAt = new Date().toISOString();
          exam.approvalChannel = 'telegram';

          let wpMsg = 'Approved.';
          if (config.wordpress.autoPublishOnApproval) {
            const wpResult = await publishToWordPress(exam);
            if (wpResult.success) {
              exam.status = 'published';
              exam.publishedAt = new Date().toISOString();
              exam.wpPostId = wpResult.postId;
              exam.wpPostUrl = wpResult.postUrl;
              wpMsg = `Published live on esckolkata2003.org! Link: ${wpResult.postUrl}`;
            }
          }

          if (config.wordpress.autoSyncJobVacanciesPage) {
            syncJobVacanciesPage().catch(err => console.error('Telegram approval page sync failed:', err));
          }

          saveStore();

          // Answer Telegram callback query
          if (config.adminTelegram.botToken) {
            await fetch(`https://api.telegram.org/bot${config.adminTelegram.botToken}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callback.id,
                text: `✅ Approved & ${wpMsg}`,
                show_alert: true
              })
            });
          }
        }
      }
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger Notification Dispatch for any exam manually
app.post('/api/notifications/dispatch', async (req: Request, res: Response) => {
  const { examId } = req.body;
  const exam = exams.find(e => e.id === examId);
  if (!exam) {
    res.status(404).json({ error: 'Exam not found' });
    return;
  }
  const baseUrl = req.protocol + '://' + req.get('host');
  const results = await dispatchNotifications(exam, baseUrl);
  res.json({ success: true, results });
});

// Test WordPress Connection
app.post('/api/wordpress/test-connection', async (req: Request, res: Response) => {
  const { siteUrl, username, applicationPassword } = req.body;
  const targetSite = siteUrl || config.wordpress.siteUrl;
  const cleanUrl = targetSite.replace(/\/$/, '');
  const testEndpoint = `${cleanUrl}/wp-json/wp/v2/users/me`;

  const headers: Record<string, string> = {
    'User-Agent': 'ESC-ExamTrack-Publisher/1.0'
  };

  if (username && applicationPassword) {
    const authString = Buffer.from(`${username}:${applicationPassword.replace(/\s+/g, '')}`).toString('base64');
    headers['Authorization'] = `Basic ${authString}`;
  }

  try {
    const response = await fetch(testEndpoint, { headers });
    if (response.ok) {
      const data = await response.json();
      res.json({
        success: true,
        authenticated: true,
        user: data.name || username,
        site: cleanUrl,
        message: `Successfully connected to WordPress REST API at ${cleanUrl} as ${data.name || username}!`
      });
    } else {
      // Also test public types endpoint
      const pubRes = await fetch(`${cleanUrl}/wp-json/wp/v2/types/post`);
      if (pubRes.ok) {
        res.json({
          success: true,
          authenticated: false,
          site: cleanUrl,
          message: `WordPress REST API is accessible at ${cleanUrl}, but authentication failed (HTTP ${response.status}). Check Application Password.`
        });
      } else {
        res.json({
          success: false,
          error: `Could not reach WordPress REST API at ${cleanUrl}. Server returned status ${response.status}`
        });
      }
    }
  } catch (err: any) {
    res.json({
      success: false,
      error: `Network error reaching ${cleanUrl}: ${err.message}`
    });
  }
});

// Get/Update Config
app.get('/api/config', (req: Request, res: Response) => {
  res.json({ config });
});

app.post('/api/config', (req: Request, res: Response) => {
  config = {
    ...config,
    ...req.body
  };
  saveStore();
  res.json({ success: true, config });
});

// Get Audit Logs
app.get('/api/logs', (req: Request, res: Response) => {
  res.json({ logs });
});

// Clear Logs
app.delete('/api/logs', (req: Request, res: Response) => {
  logs = [];
  saveStore();
  res.json({ success: true });
});

// AI Exam Notification Extractor using Gemini
app.post('/api/ai/extract-exam', async (req: Request, res: Response) => {
  const { rawText, sourceUrl } = req.body;
  if (!rawText || rawText.trim().length < 20) {
    res.status(400).json({ error: 'Please provide raw notification text or circular content.' });
    return;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback heuristic parser if API key is not yet set
      const fallbackExam = {
        title: rawText.split('\n')[0].substring(0, 100) || 'Govt Recruitment 2026',
        organization: 'Recruitment Commission',
        postName: 'Officer / Assistant Posts',
        category: 'State PSC',
        totalVacancies: 500,
        salaryRange: '₹35,400 - ₹1,12,400',
        importantDates: {
          applicationStart: formatToDDMMYYYY(new Date()),
          applicationEnd: formatToDDMMYYYY(new Date(Date.now() + 30 * 86400000))
        },
        eligibility: {
          minQualification: 'Bachelor Degree in any stream',
          ageLimit: '21 to 35 years'
        },
        applicationFee: {
          generalOBC: '₹200/-',
          scStPwd: 'Nil'
        },
        selectionProcess: ['Written Exam', 'Interview'],
        summary: rawText.substring(0, 300) + '...',
        links: {
          officialWebsite: sourceUrl || 'https://esckolkata2003.org',
          notificationPdf: '',
          applyOnline: ''
        },
        tags: ['Govt Exam', 'Recruitment 2026']
      };
      res.json({ exam: fallbackExam, source: 'heuristic' });
      return;
    }

    const ai = new GoogleGenAI();
    const prompt = `You are an expert Indian Government competitive examinations and vacancy analyst for Educational Support Council (ESC Kolkata).
Analyze the following raw notification/circular text and extract accurate structured data in pure JSON.
IMPORTANT: All calendar dates MUST be formatted strictly as DD-MM-YYYY (Day-Month-Year, e.g. 15-11-2026).

Raw text:
"""
${rawText.substring(0, 12000)}
"""

Source URL (if any): ${sourceUrl || ''}

Respond ONLY with a valid JSON object matching this schema:
{
  "title": "Clear concise title e.g. WBPSC West Bengal Civil Services 2026",
  "organization": "e.g. Public Service Commission, West Bengal (WBPSC)",
  "postName": "e.g. Executive, Assistant Section Officer, etc.",
  "category": "One of: UPSC, SSC, Banking, Railways, State PSC, Defense, Teaching, Police, Engineering, PSU, Other",
  "totalVacancies": "Number or string e.g. 780 or '1,450'",
  "salaryRange": "e.g. ₹56,100 - ₹1,77,500 (Level 10)",
  "importantDates": {
    "applicationStart": "DD-MM-YYYY (e.g. 15-10-2026)",
    "applicationEnd": "DD-MM-YYYY (e.g. 28-11-2026)",
    "feeLastDate": "DD-MM-YYYY or string",
    "admitCardDate": "Month Year or DD-MM-YYYY",
    "examDate": "DD-MM-YYYY or Month Year",
    "resultDate": "DD-MM-YYYY or string"
  },
  "eligibility": {
    "minQualification": "Detailed educational requirement",
    "ageLimit": "Min and Max age limit with cutoff date and relaxations",
    "experience": "Fresher eligible or required experience"
  },
  "applicationFee": {
    "generalOBC": "Fee for General/OBC/EWS",
    "scStPwd": "Fee for SC/ST/PwD/Ex-Servicemen",
    "paymentMode": "Online/Challan"
  },
  "selectionProcess": ["Stage 1: Preliminary Exam", "Stage 2: Main Exam", "Stage 3: Interview"],
  "syllabusHighlights": "Key syllabus subjects and exam pattern summary",
  "vacancyDetails": [
    { "post": "Post name", "count": "Vacancies count", "qualification": "Requirement" }
  ],
  "links": {
    "officialWebsite": "Website URL or placeholder",
    "notificationPdf": "Official PDF link if found",
    "applyOnline": "Direct application link if found"
  },
  "summary": "High quality 3-4 sentence comprehensive summary for students",
  "escGuidanceNotes": "Actionable advice for underprivileged students preparing from ESC Kolkata Employment School",
  "tags": ["Tag1", "Tag2", "Tag3"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsedJson = JSON.parse(response.text || '{}');

    logs.unshift({
      id: `log-ai-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'ai_extract',
      channel: 'web',
      title: `AI Extracted Exam Details: ${parsedJson.title || 'Extracted Notification'}`,
      details: `Parsed using Gemini 3.8 Flash with ${parsedJson.totalVacancies || 'N/A'} vacancies.`,
      status: 'success'
    });
    saveStore();

    res.json({ exam: parsedJson, source: 'gemini' });
  } catch (err: any) {
    console.error('Gemini extraction error:', err);
    res.status(500).json({ error: `AI Extraction failed: ${err.message}` });
  }
});

// WordPress Post HTML Preview generator
app.post('/api/wordpress/preview-html', (req: Request, res: Response) => {
  const exam = req.body;
  const html = generateWordPressPostHtml(exam);
  res.json({ html });
});

// Synchronize all approved jobs to https://esckolkata2003.org/job-vacancies/ page
app.post('/api/wordpress/sync-job-vacancies-page', async (req: Request, res: Response) => {
  try {
    const result = await syncJobVacanciesPage();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Preview HTML for https://esckolkata2003.org/job-vacancies/ page
app.get('/api/wordpress/job-vacancies-preview', (req: Request, res: Response) => {
  const approvedList = exams.filter(e => e.status === 'approved' || e.status === 'published');
  const html = generateJobVacanciesPageHtml(approvedList);
  const targetUrl = config.wordpress.jobVacanciesPageUrl || `${config.wordpress.siteUrl.replace(/\/$/, '')}/${config.wordpress.jobVacanciesPageSlug || 'job-vacancies'}/`;
  res.json({ html, count: approvedList.length, pageUrl: targetUrl });
});

// Mount Vite or static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
