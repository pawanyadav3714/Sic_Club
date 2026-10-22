import React, { useState, useEffect } from 'react';
import { UserProfile, ClubPost } from '../types';
import { MOCK_POSTS, setMockUser, supabase, isSupabaseConfigured } from '../lib/supabase';
import { Atom, CheckCircle, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface OnboardingPageProps {
  currentUser: UserProfile;
  onComplete: (updatedUser: UserProfile) => void;
}

export default function OnboardingPage({ currentUser, onComplete }: OnboardingPageProps) {
  const [branch, setBranch] = useState(currentUser.branch || 'Computer Science & Engineering');
  const [regNo, setRegNo] = useState(currentUser.registration_no || 'REG2026042');
  const [session, setSession] = useState(currentUser.session || '2025-2029');
  const [posts, setPosts] = useState<ClubPost[]>(MOCK_POSTS);
  const [selectedPostId, setSelectedPostId] = useState(MOCK_POSTS[0].id);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadPosts() {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.from('club_posts').select('*');
        if (!error && data && data.length > 0) {
          setPosts(data);
          setSelectedPostId(data[0].id);
        } else if (!error && (!data || data.length === 0)) {
          // Seed posts into Supabase if empty
          const { data: inserted } = await supabase
            .from('club_posts')
            .insert(MOCK_POSTS.map(p => ({ id: p.id, name: p.name, description: p.description })))
            .select();
          if (inserted && inserted.length > 0) {
            setPosts(inserted);
            setSelectedPostId(inserted[0].id);
          }
        }
      }
    }
    loadPosts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const updated: UserProfile = {
        ...currentUser,
        branch,
        registration_no: regNo,
        session,
        role: 'pending',
      };

      if (isSupabaseConfigured && supabase) {
        // 1. Upsert profile in Supabase `profiles` table
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([updated]);

        if (profileError) {
          throw new Error('Profile save failed: ' + profileError.message);
        }

        // 2. Insert membership application in Supabase `membership_applications` table
        const { error: appError } = await supabase
          .from('membership_applications')
          .insert([
            {
              user_id: currentUser.id,
              selected_post_id: selectedPostId,
              status: 'pending',
            },
          ]);

        if (appError) {
          throw new Error('Application submit failed: ' + appError.message);
        }
      }

      setLoading(false);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setMockUser(updated);
      onComplete(updated);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Failed to submit application.');
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-3 sm:px-4 py-8 sm:py-16 bg-[#030712] relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-xl shadow-2xl relative z-10 space-y-6 sm:space-y-8">
        <div className="text-center space-y-1.5 sm:space-y-2">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-[2px] mx-auto shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#030712] rounded-[10px] sm:rounded-[14px] flex items-center justify-center">
              <Atom className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-100">Student Onboarding</h2>
          <p className="text-[11px] sm:text-xs text-slate-400">Complete your academic profile and select your preferred club department</p>
        </div>

        {errorMsg && (
          <div className="p-2.5 sm:p-3 rounded-xl bg-red-950/50 border border-red-500/30 text-red-400 text-xs text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1 sm:mb-1.5 uppercase">Branch / Department</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                <option value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</option>
                <option value="Electronics & Communication">Electronics & Communication</option>
                <option value="Mechanical & Mechatronics">Mechanical & Mechatronics</option>
                <option value="Electrical Engineering">Electrical Engineering</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1 sm:mb-1.5 uppercase">Registration Number</label>
              <input
                type="text"
                required
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                placeholder="REG2026042"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1 sm:mb-1.5 uppercase">Session Batch</label>
            <input
              type="text"
              required
              value={session}
              onChange={(e) => setSession(e.target.value)}
              placeholder="2025-2029"
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-2 sm:mb-3 uppercase">Select Target Club Department / Role</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {posts.map((post) => {
                const isSelected = selectedPostId === post.id;
                return (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPostId(post.id)}
                    className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500 text-slate-100 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-800/40 border-slate-700/80 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <span className="font-bold text-xs sm:text-sm">{post.name}</span>
                      {isSelected && <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />}
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 leading-relaxed">{post.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 sm:py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-slate-950 font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{loading ? 'Submitting...' : 'Submit Application for Review'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
