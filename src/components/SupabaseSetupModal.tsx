import React, { useState } from 'react';
import { Database, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupabaseSetupModal({ isOpen, onClose }: SupabaseSetupModalProps) {
  const [url, setUrl] = useState(localStorage.getItem('sic_supabase_url') || '');
  const [key, setKey] = useState(localStorage.getItem('sic_supabase_key') || '');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('sic_supabase_url', url.trim());
    localStorage.setItem('sic_supabase_key', key.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      window.location.reload();
    }, 1200);
  };

  const handleClear = () => {
    localStorage.removeItem('sic_supabase_url');
    localStorage.removeItem('sic_supabase_key');
    setUrl('');
    setKey('');
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-cyan-500/30 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-100">Supabase Connection</h3>
            <p className="text-xs text-slate-400">Connect your Supabase PostgreSQL backend & Auth</p>
          </div>
        </div>

        {isSupabaseConfigured ? (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-sm">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <div>
              <div className="font-semibold">Supabase is Active</div>
              <div className="text-xs text-emerald-300/80">Connected to your project instance.</div>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-200">Running in Local Mock Mode</div>
              <p className="mt-1 text-amber-300/80">
                You are currently using the built-in local persistence and pre-seeded mock database. To connect real Supabase, provide your Project URL and Anon API key below.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">Supabase Project URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzproject.supabase.co"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 uppercase">Supabase Anon Key</label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsIn..."
              className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {saved && (
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl text-center text-xs font-semibold animate-pulse">
              Settings saved! Reloading application...
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                ['sic_registered_users', 'sic_pending_registration', 'sic_approved_users', 'sic_rejected_users', 'sic_membership_applications', 'sic_mock_user'].forEach(k => localStorage.removeItem(k));
                alert('All local registration cache cleared successfully!');
                window.location.reload();
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-950/50 hover:bg-purple-900/50 text-purple-300 text-xs font-bold transition-all border border-purple-500/30"
            >
              Clear All Local Registrations Cache
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {isSupabaseConfigured && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-2.5 rounded-xl bg-red-950/50 hover:bg-red-900/50 text-red-400 text-xs font-semibold transition-all"
                >
                  Disconnect
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-semibold text-xs shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
