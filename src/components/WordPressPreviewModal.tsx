import React, { useState, useEffect } from 'react';
import { X, Globe, Copy, Check, ExternalLink, Code } from 'lucide-react';
import { ExamNotification } from '../types/exam';
import { api } from '../services/api';

interface WordPressPreviewModalProps {
  exam: ExamNotification | null;
  onClose: () => void;
  onPublishDirectly?: (exam: ExamNotification) => Promise<any>;
}

export const WordPressPreviewModal: React.FC<WordPressPreviewModalProps> = ({
  exam,
  onClose,
  onPublishDirectly
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (exam) {
      setLoading(true);
      api.getWordPressPreviewHtml(exam)
        .then(html => setHtmlContent(html))
        .catch(err => setHtmlContent(`<p style="color:red">Failed to generate preview: ${err.message}</p>`))
        .finally(() => setLoading(false));
    }
  }, [exam]);

  if (!exam) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(htmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublish = async () => {
    if (onPublishDirectly) {
      setPublishing(true);
      try {
        await onPublishDirectly(exam);
      } finally {
        setPublishing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-500" />
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">WordPress Live Article Preview</h3>
              <p className="text-xs text-slate-500">Target: <span className="font-mono">https://esckolkata2003.org</span></p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab('visual')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  activeTab === 'visual' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                Rendered Post
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1 rounded font-medium transition-colors flex items-center gap-1 ${
                  activeTab === 'code' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                <Code className="w-3 h-3" />
                <span>HTML Code</span>
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Copy HTML"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Preview Container */}
        <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-xs text-slate-400">
              Generating WordPress post preview...
            </div>
          ) : activeTab === 'visual' ? (
            <div 
              className="prose prose-sm max-w-none text-slate-800"
              dangerouslySetInnerHTML={{ __html: htmlContent }} 
            />
          ) : (
            <pre className="text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap overflow-x-auto bg-slate-50 dark:bg-slate-950 p-4 rounded-lg">
              {htmlContent}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Post title: <strong>{exam.title}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              Close
            </button>

            {onPublishDirectly && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{publishing ? 'Publishing to WP...' : 'Publish to WordPress'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
