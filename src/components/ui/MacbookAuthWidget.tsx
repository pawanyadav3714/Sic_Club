import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Sparkles, ArrowRight, Lock, Mail, User, Phone, Building, Hash, Compass, Award, CheckCircle2, Eye, EyeOff, Loader2, Key } from 'lucide-react';
import { UserProfile } from '../../types';
import { setMockUser } from '../../lib/supabase';
import confetti from 'canvas-confetti';

interface MacbookAuthWidgetProps {
  onNavigate: (route: string) => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export default function MacbookAuthWidget({ onNavigate, onLoginSuccess }: MacbookAuthWidgetProps) {
  const [screenState, setScreenState] = useState<'signup' | 'signin' | 'dashboard'>('signup');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [branch, setBranch] = useState('Computer Science & Engineering');
  const [regNo, setRegNo] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [domain, setDomain] = useState('Tech / Coding');
  const [designation, setDesignation] = useState('Technical & AI Lead');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setSuccessMsg('Registration successful! Please sign in with your credentials.');
      setTimeout(() => {
        setSuccessMsg('');
        setScreenState('signin');
      }, 1500);
    }, 800);
  };

  const handleSignin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const user: UserProfile = {
        id: 'core-' + Date.now(),
        first_name: firstName || 'John',
        last_name: lastName || 'Doe',
        email: email || 'admin.core@sic.edu',
        branch: branch,
        registration_no: regNo || 'REG123456',
        session: '2024-2028',
        domain: domain,
        designation: designation,
        role: 'core_member',
        created_at: new Date().toISOString()
      };
      setMockUser(user);
      onLoginSuccess(user);
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
      setScreenState('dashboard');
    }, 800);
  };

  return (
    <div className="py-12 relative overflow-hidden flex flex-col items-center justify-center">
      {/* Container header / switcher */}
      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>MacBook Interactive Portal</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Experience Core Member Onboarding
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto text-xs sm:text-sm">
          Register your profile, sign in securely, and explore the admin dashboard directly inside the simulated MacBook display.
        </p>

        {/* State Tabs */}
        <div className="flex items-center justify-center gap-2 pt-3">
          <button
            onClick={() => setScreenState('signup')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              screenState === 'signup'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            1. Registration Form
          </button>
          <button
            onClick={() => setScreenState('signin')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              screenState === 'signin'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            2. Sign In Screen
          </button>
          <button
            onClick={() => setScreenState('dashboard')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              screenState === 'dashboard'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            3. Core Dashboard
          </button>
        </div>
      </div>

      {/* Realistic MacBook Mockup */}
      <div className="w-full max-w-5xl px-4 mx-auto relative z-20">
        {/* MacBook Screen / Lid */}
        <div className="rounded-t-[32px] bg-slate-950 border-4 border-slate-700 shadow-[0_30px_90px_-20px_rgba(56,189,248,0.4)] overflow-hidden relative">
          
          {/* macOS Top Bar / Browser Chrome */}
          <div className="h-10 bg-[#121622] border-b border-slate-800 flex items-center justify-between px-4 relative z-30">
            {/* Traffic Light Buttons */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />
              <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm" />
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
            </div>

            {/* URL Bar */}
            <div className="flex-1 max-w-md mx-4">
              <div className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 flex items-center justify-center gap-2 text-[11px] font-mono text-slate-300 shadow-inner">
                <span className="text-emerald-400">🔒</span>
                <span className="truncate">https://sic-core.edu/portal-{screenState}</span>
              </div>
            </div>

            {/* Camera Notch & Quick Switch */}
            <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-700 absolute left-1/2 -translate-x-1/2 top-3.5 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-blue-500/80 animate-pulse" />
            </div>

            <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
              macOS Sonoma
            </div>
          </div>

          {/* Screen Display Content */}
          <div className="aspect-[16/10] w-full bg-[#f8fafc] text-slate-900 relative overflow-y-auto flex flex-col">
            <AnimatePresence mode="wait">
              {/* STATE 1: CORE MEMBER REGISTRATION (SIGN UP) */}
              {screenState === 'signup' && (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 p-6 sm:p-10 flex flex-col justify-center items-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30 overflow-y-auto"
                >
                  <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-8 space-y-6">
                    <div className="text-center space-y-1 border-b border-slate-100 pb-4">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Core Member Registration</h3>
                      <p className="text-xs text-slate-500">Fill in your details to join and manage club activities.</p>
                    </div>

                    {successMsg && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl text-center">
                        {successMsg}
                      </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">First Name</label>
                          <input
                            type="text"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="John"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">Last Name</label>
                          <input
                            type="text"
                            required
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Doe"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">Branch</label>
                          <select
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option>Computer Science & Engineering</option>
                            <option>AI & Data Science</option>
                            <option>Information Technology</option>
                            <option>Electronics & Communication</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">Registration Number</label>
                          <input
                            type="text"
                            required
                            value={regNo}
                            onChange={(e) => setRegNo(e.target.value)}
                            placeholder="REG123456"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">Mobile Number</label>
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="9876543210"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">Email</label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="john.doe@example.com"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">Password</label>
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">Domain</label>
                          <select
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option>Tech / Coding</option>
                            <option>Video Editing</option>
                            <option>Event Management</option>
                            <option>Post Design & Graphics</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign Up</span>}
                        </button>
                      </div>

                      <div className="text-center pt-2 text-xs text-slate-600">
                        Already registered?{' '}
                        <button
                          type="button"
                          onClick={() => setScreenState('signin')}
                          className="text-blue-600 font-bold hover:underline cursor-pointer"
                        >
                          Sign In here
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}

              {/* STATE 2: SIGN IN SCREEN */}
              {screenState === 'signin' && (
                <motion.div
                  key="signin"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 p-6 sm:p-10 flex flex-col justify-center items-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30"
                >
                  <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 space-y-6 text-center">
                    <div className="space-y-1 border-b border-slate-100 pb-4">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Sign In</h3>
                      <p className="text-xs text-slate-500">You can sign in with your registered email.</p>
                    </div>

                    <form onSubmit={handleSignin} className="space-y-4 text-left">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">Email</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin.core@sic.edu"
                          className="w-full px-3.5 py-3 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">Password</label>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3.5 py-3 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In</span>}
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => setScreenState('signup')}
                          className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                        >
                          Need to register? <span className="text-blue-600 underline">Sign Up</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}

              {/* STATE 3: CORE MEMBER DASHBOARD */}
              {screenState === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 bg-slate-100 flex flex-col overflow-y-auto"
                >
                  {/* Dashboard Top Header */}
                  <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                        SC
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Welcome Admin/Core Member</h4>
                        <p className="text-[10px] text-slate-500 font-mono">Science & Innovation Club Control Center</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setScreenState('signin')}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>

                  {/* Dashboard Content */}
                  <div className="p-6 space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                        <div className="text-xs text-slate-500 font-medium">Profile Verification</div>
                        <div className="text-2xl font-black text-slate-900">400%</div>
                        <div className="text-[10px] text-emerald-600 font-bold">+12% this week</div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                        <div className="text-xs text-slate-500 font-medium">Peer Feedback</div>
                        <div className="text-2xl font-black text-slate-900">57%</div>
                        <div className="text-[10px] text-blue-600 font-bold">Stable performance</div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                        <div className="text-xs text-slate-500 font-medium">Task Efficiency</div>
                        <div className="text-2xl font-black text-slate-900">98%</div>
                        <div className="text-[10px] text-emerald-600 font-bold">Top tier rating</div>
                      </div>
                    </div>

                    {/* Quick Launch Button */}
                    <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-6 text-white flex items-center justify-between shadow-xl">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono tracking-widest px-2.5 py-1 rounded-full bg-purple-500/30 text-purple-200 uppercase font-bold">
                          Active Session
                        </span>
                        <h4 className="text-lg font-bold">Ready to manage club operations?</h4>
                        <p className="text-xs text-purple-200">Launch the full screen control center with database access and member management.</p>
                      </div>
                      <button
                        onClick={() => {
                          const user: UserProfile = {
                            id: 'core-' + Date.now(),
                            first_name: firstName || 'Admin',
                            last_name: lastName || 'User',
                            email: email || 'admin@sic.edu',
                            branch: branch,
                            registration_no: regNo || 'CORE001',
                            session: '2024-2028',
                            domain: domain,
                            designation: designation,
                            role: 'core_member',
                            created_at: new Date().toISOString()
                          };
                          onLoginSuccess(user);
                          onNavigate('core-dashboard');
                        }}
                        className="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-lg hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-2 shrink-0"
                      >
                        <span>Open Full Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* MacBook Hinge */}
        <div className="w-full h-3 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 shadow-lg" />

        {/* MacBook Base & Keyboard Shelf */}
        <div className="w-4/5 mx-auto h-12 bg-gradient-to-b from-slate-800 to-slate-900 rounded-b-[24px] border-t border-slate-700 shadow-2xl flex flex-col items-center justify-center relative px-4 mb-6">
          <div className="w-32 h-1 rounded-full bg-slate-700/60 mb-2" />
          <div className="w-full max-w-md h-3 grid grid-cols-12 gap-1 opacity-40">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="bg-slate-950 rounded-xs h-1" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
