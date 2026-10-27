import React from 'react';
import { 
  Bell, 
  Send, 
  Globe, 
  Plus, 
  Sparkles, 
  Settings, 
  History, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  ExternalLink 
} from 'lucide-react';
import { AppConfig, ExamNotification } from '../types/exam';

interface HeaderProps {
  activeTab: 'directory' | 'approvals' | 'channels' | 'wordpress' | 'ai' | 'logs';
  setActiveTab: (tab: 'directory' | 'approvals' | 'channels' | 'wordpress' | 'ai' | 'logs') => void;
  pendingCount: number;
  config: AppConfig | null;
  onOpenAddModal: () => void;
  onOpenAiModal: () => void;
  wpConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  config,
  onOpenAddModal,
  onOpenAiModal,
  wpConnected
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      {/* Top Banner with ESC Identity */}
      <div className="bg-slate-950 border-b border-slate-800/80 px-4 sm:px-8 py-1.5 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-amber-400">Educational Support Council (ESC) Kolkata</span>
          <span className="text-slate-600">•</span>
          <span className="italic text-slate-300">"Saath Saath Manzil Tak" (Est. 2003)</span>
          <span className="text-slate-600 hidden md:inline">•</span>
          <span className="hidden md:inline text-slate-400">Employment School Exam Alert System</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-xs">
          <a 
            href="https://esckolkata2003.org/job-vacancies/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium transition-colors bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60"
            title="Target Page: https://esckolkata2003.org/job-vacancies/"
          >
            <Globe className="w-3 h-3 text-emerald-400" />
            <span>/job-vacancies/</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <a 
            href={config?.wordpress.siteUrl || "https://esckolkata2003.org"} 
            target="_blank" 
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>esckolkata2003.org</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${wpConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
            <span className={wpConnected ? 'text-emerald-400' : 'text-amber-300'}>
              {wpConnected ? 'WordPress API Ready' : 'WP Setup Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('directory')}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white shadow-inner text-lg tracking-wider">
              ET
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">ExamTrack</span>
                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono font-medium">ESC Pro</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">Live Exam Tracker & Auto-Publisher</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'directory'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Exam Directory
            </button>

            <button
              onClick={() => setActiveTab('approvals')}
              className={`relative px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'approvals'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>Approval Queue</span>
              {pendingCount > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('channels')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'channels'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Send className="w-3.5 h-3.5 text-blue-400" />
              <span>Email • WA • Telegram</span>
            </button>

            <button
              onClick={() => setActiveTab('wordpress')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'wordpress'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>WordPress Engine</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>Logs</span>
            </button>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAiModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm border border-indigo-500/40"
              title="Extract structured exam notice using Gemini AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">AI Notice Parser</span>
              <span className="sm:hidden">AI</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Notification</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {/* Mobile secondary tab bar */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-800 text-xs no-scrollbar">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3 py-1.5 rounded whitespace-nowrap ${activeTab === 'directory' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            Directory
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-3 py-1.5 rounded whitespace-nowrap flex items-center gap-1 ${activeTab === 'approvals' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            Approvals ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('channels')}
            className={`px-3 py-1.5 rounded whitespace-nowrap ${activeTab === 'channels' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            Email/WA/Telegram
          </button>
          <button
            onClick={() => setActiveTab('wordpress')}
            className={`px-3 py-1.5 rounded whitespace-nowrap ${activeTab === 'wordpress' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            WordPress
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded whitespace-nowrap ${activeTab === 'logs' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
          >
            Logs
          </button>
        </div>
      </div>
    </header>
  );
};
