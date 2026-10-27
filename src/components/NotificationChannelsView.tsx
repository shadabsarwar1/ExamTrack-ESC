import React, { useState } from 'react';
import { 
  Mail, 
  Send, 
  Smartphone, 
  CheckCircle2, 
  ShieldCheck, 
  ExternalLink, 
  Copy, 
  Check, 
  Bot, 
  Settings2, 
  RefreshCw,
  BellRing,
  ArrowRight
} from 'lucide-react';
import { AppConfig, ExamNotification } from '../types/exam';
import { formatToDDMMYYYY } from '../utils/date';

interface NotificationChannelsViewProps {
  config: AppConfig | null;
  onUpdateConfig: (newConfig: Partial<AppConfig>) => Promise<void>;
  pendingExams: ExamNotification[];
  onDispatchAlerts: (exam: ExamNotification) => Promise<any>;
}

export const NotificationChannelsView: React.FC<NotificationChannelsViewProps> = ({
  config,
  onUpdateConfig,
  pendingExams,
  onDispatchAlerts
}) => {
  const [email, setEmail] = useState(config?.adminEmail.email || 'shadabsarwar@gmail.com');
  const [emailEnabled, setEmailEnabled] = useState(config?.adminEmail.enabled ?? true);

  const [phone, setPhone] = useState(config?.adminWhatsApp.phoneNumber || '+919830012345');
  const [waEnabled, setWaEnabled] = useState(config?.adminWhatsApp.enabled ?? true);

  const [botToken, setBotToken] = useState(config?.adminTelegram.botToken || '');
  const [chatId, setChatId] = useState(config?.adminTelegram.chatId || '');
  const [tgEnabled, setTgEnabled] = useState(config?.adminTelegram.enabled ?? true);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [activePreviewChannel, setActivePreviewChannel] = useState<'email' | 'whatsapp' | 'telegram'>('email');
  const [copiedLink, setCopiedLink] = useState(false);

  const sampleExam = pendingExams[0] || {
    id: 'exam-wbpsc-wbcs-2026',
    title: 'WBPSC West Bengal Civil Services (Exe) Recruitment 2026',
    organization: 'Public Service Commission, West Bengal (WBPSC)',
    postName: 'WBCS Group A, B, C & D Officers',
    totalVacancies: 780,
    salaryRange: '₹56,100 - ₹1,77,500',
    importantDates: { applicationStart: '15-10-2026', applicationEnd: '28-11-2026' },
    category: 'State PSC'
  } as ExamNotification;

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-q2vkuqqyp2v2wutbyh7bqv-639446796713.asia-east1.run.app';
  const sampleToken = 'ZXhhbS13YnBzYy13YmNzLTIwMjYtZXNjLXNlY3JldA==';
  const sampleApproveUrl = `${currentHost}/api/approve-action?id=${sampleExam.id}&action=approve&token=${sampleToken}&channel=${activePreviewChannel}`;
  const sampleRejectUrl = `${currentHost}/api/approve-action?id=${sampleExam.id}&action=reject&token=${sampleToken}&channel=${activePreviewChannel}`;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateConfig({
        adminEmail: {
          email,
          enabled: emailEnabled,
          notifyOnNewNotification: true
        },
        adminWhatsApp: {
          phoneNumber: phone,
          enabled: waEnabled,
          notifyOnNewNotification: true
        },
        adminTelegram: {
          botToken,
          chatId,
          enabled: tgEnabled,
          notifyOnNewNotification: true
        }
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerTest = async () => {
    setDispatchStatus('Sending test notification across all enabled channels...');
    try {
      await onDispatchAlerts(sampleExam);
      setDispatchStatus('Test alerts successfully dispatched to Email, WhatsApp, and Telegram!');
      setTimeout(() => setDispatchStatus(null), 5000);
    } catch (err: any) {
      setDispatchStatus(`Error: ${err.message}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1">
            <BellRing className="w-4 h-4 text-amber-400" />
            <span>Multi-Channel Remote Approval Gateway</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Email, WhatsApp & Telegram Setup</h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Configure how you receive updates when new competitive exam notifications are found.
            Approve notifications directly from your Email, WhatsApp, or Telegram with a single tap to publish them immediately on <strong>esckolkata2003.org</strong>.
          </p>
        </div>

        <button
          onClick={handleTriggerTest}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-sm shrink-0"
        >
          <Send className="w-4 h-4" />
          <span>Dispatch Test Alerts</span>
        </button>
      </div>

      {dispatchStatus && (
        <div className="bg-blue-900/60 border border-blue-500/50 text-blue-100 px-4 py-3 rounded-xl text-xs flex items-center justify-between animate-fadeIn">
          <span>{dispatchStatus}</span>
          <button onClick={() => setDispatchStatus(null)} className="text-blue-300 hover:text-white">&times;</button>
        </div>
      )}

      {/* Main Grid: Settings & Live Interactive Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Channel Settings Form */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Channel 1: Admin Email */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/80 flex items-center justify-center text-blue-600">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Admin Email Notifications</h4>
                  <p className="text-xs text-slate-500">Receive rich HTML alerts with 1-click approve button</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Admin Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. shadabsarwar@gmail.com"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Default: <span className="font-mono text-blue-500">shadabsarwar@gmail.com</span>
              </p>
            </div>
          </div>

          {/* Channel 2: Admin WhatsApp */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-600">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Admin WhatsApp Alerts</h4>
                  <p className="text-xs text-slate-500">Click-to-chat & instant 1-tap mobile approval link</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={waEnabled}
                  onChange={(e) => setWaEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Admin WhatsApp Phone Number (with Country Code)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98300 XXXXX"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Format: <span className="font-mono">+91XXXXXXXXXX</span> for India
              </p>
            </div>
          </div>

          {/* Channel 3: Admin Telegram Bot */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/80 flex items-center justify-center text-sky-500">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Admin Telegram Interactive Bot</h4>
                  <p className="text-xs text-slate-500">Inline Keyboard buttons for instant 1-tap Approve & Reject</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={tgEnabled}
                  onChange={(e) => setTgEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Telegram Bot Token (Optional)
                </label>
                <input
                  type="password"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="e.g. 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Obtained from <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-500 underline">@BotFather</a>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Admin Telegram Chat ID (Optional)
                </label>
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="e.g. 987654321"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Get your Chat ID via <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-sky-500 underline">@userinfobot</a>
                </p>
              </div>
            </div>

            <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 p-3 rounded-lg text-xs text-sky-800 dark:text-sky-300">
              💡 <em>Note: If you leave Bot Token empty, the application runs in simulation mode with webhooks ready. When you add a Bot Token and Chat ID, live messages are pushed straight to your Telegram phone app!</em>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-sm"
            >
              <Settings2 className="w-4 h-4" />
              <span>{saving ? 'Saving Channels...' : 'Save Channel Preferences'}</span>
            </button>
            {saveSuccess && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" />
                <span>Saved successfully!</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Live Interactive Channel Preview Simulator */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Live Channel Preview
              </span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActivePreviewChannel('email')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    activePreviewChannel === 'email' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Email
                </button>
                <button
                  onClick={() => setActivePreviewChannel('whatsapp')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    activePreviewChannel === 'whatsapp' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => setActivePreviewChannel('telegram')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    activePreviewChannel === 'telegram' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Telegram
                </button>
              </div>
            </div>

            {/* PREVIEW CONTAINER */}
            {activePreviewChannel === 'email' ? (
              /* Email Inbox Simulator */
              <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 text-slate-200 text-xs space-y-3 font-sans">
                <div className="border-b border-slate-800 pb-2">
                  <div className="text-[11px] text-slate-400">To: <span className="text-white">{email}</span></div>
                  <div className="text-[11px] text-slate-400">Subject: <span className="text-amber-400 font-semibold">[ESC Alert] Approve Notification: {sampleExam.title}</span></div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <div className="text-[10px] text-blue-400 font-bold uppercase">Educational Support Council (ESC Kolkata)</div>
                    <div className="text-sm font-bold text-white mt-1">{sampleExam.title}</div>
                    <div className="text-slate-400 text-[11px] mt-1">
                      Organization: {sampleExam.organization}<br />
                      Total Vacancies: <strong className="text-emerald-400">{sampleExam.totalVacancies} Posts</strong><br />
                      Last Date to Apply: <strong>{formatToDDMMYYYY(sampleExam.importantDates.applicationEnd)}</strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300">
                    Click the button below to confirm. It will automatically publish the announcement live to <strong>esckolkata2003.org</strong>.
                  </p>

                  <div className="pt-2 flex flex-col gap-2">
                    <a
                      href={sampleApproveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs transition-colors block"
                    >
                      ✅ Approve & Publish to esckolkata2003.org
                    </a>
                    <a
                      href={sampleRejectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-center py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] block"
                    >
                      ❌ Reject Notification
                    </a>
                  </div>
                </div>
              </div>
            ) : activePreviewChannel === 'whatsapp' ? (
              /* WhatsApp Chat Bubble Simulator */
              <div className="bg-[#0b141a] rounded-lg border border-slate-800 p-4 text-xs font-sans space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-[10px]">
                    ESC
                  </div>
                  <span className="text-white font-semibold text-xs">ESC Exam Alert Bot</span>
                  <span className="text-[10px] text-slate-500 ml-auto">Just now</span>
                </div>

                <div className="bg-[#1f2c34] text-slate-100 p-3 rounded-lg rounded-tl-none border border-emerald-950 space-y-2 text-xs leading-relaxed">
                  <div>🚨 <strong>NEW EXAM NOTIFICATION FOR APPROVAL</strong></div>
                  <div>📌 <strong>{sampleExam.title}</strong></div>
                  <div className="text-slate-300 text-[11px]">
                    🏢 Org: {sampleExam.organization}<br />
                    👥 Vacancies: <strong>{sampleExam.totalVacancies} Posts</strong><br />
                    📅 Last Date: {formatToDDMMYYYY(sampleExam.importantDates.applicationEnd)}<br />
                    💰 Salary: {sampleExam.salaryRange}
                  </div>
                  <div className="pt-1 border-t border-slate-700/60">
                    <a
                      href={sampleApproveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 font-bold block hover:underline"
                    >
                      👉 Tap to Approve & Publish to Website &rarr;
                    </a>
                  </div>
                </div>

                {/* Direct WhatsApp open button */}
                <a
                  href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Approval link for ${sampleExam.title}: ${sampleApproveUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs text-center flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Open Alert in WhatsApp</span>
                </a>
              </div>
            ) : (
              /* Telegram Chat & Inline Keyboard Simulator */
              <div className="bg-[#17212b] rounded-lg border border-slate-800 p-4 text-xs font-sans space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                  <div className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center font-bold text-white text-[10px]">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-white font-semibold text-xs">@ESCExamTrackBot</span>
                    <span className="text-[10px] text-slate-400 block">bot</span>
                  </div>
                </div>

                <div className="bg-[#242f3d] text-slate-100 p-3 rounded-lg space-y-2 text-xs leading-relaxed">
                  <div>📢 <strong>New Notification Pending Approval for ESC Kolkata</strong></div>
                  <div className="text-sky-300 font-semibold">{sampleExam.title}</div>
                  <div className="text-slate-300 text-[11px]">
                    • <strong>Organization:</strong> {sampleExam.organization}<br />
                    • <strong>Vacancies:</strong> {sampleExam.totalVacancies}<br />
                    • <strong>Last Date:</strong> {formatToDDMMYYYY(sampleExam.importantDates.applicationEnd)}<br />
                    • <strong>Pay Scale:</strong> {sampleExam.salaryRange}
                  </div>
                  <div className="text-[10px] text-slate-400 italic">
                    Tap a button below to trigger automated action:
                  </div>
                </div>

                {/* Telegram Inline Keyboard Simulation */}
                <div className="space-y-1.5">
                  <a
                    href={sampleApproveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 bg-[#2b5278] hover:bg-[#346696] text-white font-bold rounded text-xs text-center flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>✅ Approve & Publish to Website</span>
                  </a>
                  <a
                    href={sampleRejectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-1.5 bg-[#242f3d] hover:bg-[#2b5278] text-rose-300 font-medium rounded text-[11px] text-center flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>❌ Reject</span>
                  </a>
                </div>
              </div>
            )}

            {/* Direct Action Link Copy */}
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
              <span className="block font-semibold text-slate-300">Generated 1-Click Remote Approval URL:</span>
              <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded border border-slate-800">
                <input
                  type="text"
                  readOnly
                  value={sampleApproveUrl}
                  className="bg-transparent text-slate-300 font-mono text-[10px] flex-1 focus:outline-none truncate"
                />
                <button
                  onClick={() => copyToClipboard(sampleApproveUrl)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] shrink-0"
                >
                  {copiedLink ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
