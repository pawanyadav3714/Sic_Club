import React, { useState } from 'react';
import { Code, X, Copy, Check } from 'lucide-react';
import { SUPABASE_SQL_MIGRATION } from '../lib/supabase';

interface SQLMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SQLMigrationModal({ isOpen, onClose }: SQLMigrationModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_MIGRATION);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-purple-500/30 w-full max-w-3xl rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between mb-6 pr-12">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Code className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-100">Supabase SQL Schema Migration</h3>
              <p className="text-xs text-slate-400">Complete SQL setup script for Profiles, Posts, Applications, Announcements & Chat</p>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy Script'}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto rounded-2xl bg-[#020408] border border-slate-800 p-4 font-mono text-xs text-purple-300 leading-relaxed">
          <pre className="whitespace-pre-wrap">{SUPABASE_SQL_MIGRATION}</pre>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
