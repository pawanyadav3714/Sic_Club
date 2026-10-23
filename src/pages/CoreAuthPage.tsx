import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { Shield, Lock, Mail, User, Eye, EyeOff, ArrowRight, Loader2, Key, Award, Phone, Building, Calendar, Hash, Compass, Power, Sparkles, CheckCircle2, Cpu, Check, Maximize2, Minimize2, Laptop, ShieldCheck, Zap, Radio, ChevronLeft, ChevronRight, RotateCw, Globe } from 'lucide-react';
import { UserProfile } from '../types';
import { setMockUser, supabase, isSupabaseConfigured, getStoredCoreMembers, saveCoreMember, DEFAULT_CORE_MEMBERS, checkEmailInDatabase, purgeLocalEmailData, upsertCoreMemberToDatabase, getOAuthRedirectUrl } from '../lib/supabase';
import confetti from 'canvas-confetti';
import { Keyboard } from '../components/ui/keyboard';

interface CoreAuthPageProps {
  onNavigate: (route: string) => void;
  onLoginSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'signup';
}

const BRANCH_LIST = [
  'Computer Science & Engineering',
  'Electronics & Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
];

const SESSION_LIST = [
  '2025-2029',
  '2024-2028',
  '2023-2027',
  '2022-2026',
  'Faculty & Core Council',
];

const DOMAINS_LIST = [
  'Tech / Coding',
  'Video Editing',
  'Event Management',
  'Tech Fest Management',
  'Post Design & Graphics',
  'Research & Innovation',
  'Club Administration',
];

export default function CoreAuthPage({ onNavigate, onLoginSuccess, initialMode = 'login' }: CoreAuthPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  
  // Available core members for quick switch/login
  const [coreMembersList, setCoreMembersList] = useState<UserProfile[]>(() => getStoredCoreMembers());
  
  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [branch, setBranch] = useState('Computer Science & Engineering');
  const [sessionBatch, setSessionBatch] = useState('2024-2028');
  const [domain, setDomain] = useState('Tech / Coding');
  const [phoneNo, setPhoneNo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [designation, setDesignation] = useState('Technical & AI Lead');
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Input Refs for switching focus on Enter
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const regNoRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const passcodeRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const cinemaMode = true;

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const scale = useTransform(scrollYProgress, [0, 0.45, 0.9], [0.75, 1.0, 1.02]);
  const rotateX = useTransform(scrollYProgress, [0, 0.45, 0.9], [20, 0, 0]);
  const translateY = useTransform(scrollYProgress, [0, 0.45, 0.9], [50, 0, -10]);

  // Helper to determine if an input is filled
  const isFilled = (val?: string) => Boolean(val && val.trim().length > 0);
  React.useEffect(() => {
    const savedError = sessionStorage.getItem('sic_auth_error');
    if (savedError) {
      setErrorMsg(savedError);
      setMode('login');
      sessionStorage.removeItem('sic_auth_error');
    }
  }, []);

  // Handle Admin / Core Member Email & Password Login / Signup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail || !password) {
        throw new Error('Please provide your email and password.');
      }

      // 1. FIRST CHECK THE DATABASE (Supabase is single source of truth)
      const dbCheck = await checkEmailInDatabase(cleanEmail);

      if (mode === 'signup') {
        // --- SIGN UP FLOW ---
        if (!firstName.trim() || !lastName.trim()) {
          throw new Error('Please enter your first and last name.');
        }

        if (!password || password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        if (!registrationNo.trim()) {
          throw new Error('Please enter your college registration or roll number.');
        }

        if (!branch.trim()) {
          throw new Error('Please select or enter your academic branch.');
        }

        if (!sessionBatch.trim()) {
          throw new Error('Please select your academic session batch.');
        }

        if (!domain.trim()) {
          throw new Error('Please select your core domain.');
        }

        const cleanPasscode = passcode.trim().toLowerCase();
        if (!cleanPasscode || cleanPasscode !== 'sic-core.in') {
          throw new Error('You are not a core member.');
        }

        // If explicitly registered in database already
        if (dbCheck.exists) {
          if (dbCheck.role === 'core_member') {
            throw new Error('This core email is already registered. Please sign in.');
          } else {
            throw new Error('This email is already registered as a student. Please sign in via the Student Portal.');
          }
        }

        // Email does NOT exist in database -> ALLOW REGISTRATION!
        let userUuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'core-' + cleanEmail.split('@')[0] + '-' + Date.now().toString(36);

        if (isSupabaseConfigured && supabase) {
          const coreMetadata = {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            phone: phoneNo.trim() || undefined,
            phone_no: phoneNo.trim() || undefined,
            phone_number: phoneNo.trim() || undefined,
            registration_no: registrationNo.trim(),
            branch: branch.trim(),
            session: sessionBatch.trim(),
            domain: domain.trim(),
            designation: designation,
            provider_type: 'email',
            account_type: 'core_member',
            role: 'core_member',
          };

          try {
            const { data: signUpData, error: sErr } = await supabase.auth.signUp({
              email: cleanEmail,
              password: password,
              phone: phoneNo.trim() || undefined,
              options: {
                data: coreMetadata,
              },
            });

            if (signUpData?.user?.id) {
              userUuid = signUpData.user.id;
            } else if (sErr) {
              // If the email is in auth.users (e.g. from tests before database reset), authenticate to get ID
              try {
                const { data: signInData } = await supabase.auth.signInWithPassword({
                  email: cleanEmail,
                  password: password,
                });
                if (signInData?.user?.id) {
                  userUuid = signInData.user.id;
                  try {
                    await supabase.auth.updateUser({
                      data: coreMetadata,
                    });
                  } catch (uErr) {}
                }
              } catch (signInErr) {}
            }
          } catch (authErr) {
            console.warn('Auth signup notice:', authErr);
          }

          // Safely Insert or Upsert into public.core_members table in Supabase
          // Every column from the core_members schema is populated directly from form inputs
          const { error: dbErr } = await upsertCoreMemberToDatabase({
            id: userUuid,
            email: cleanEmail,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            branch: branch.trim(),
            session: sessionBatch.trim(),
            registration_no: registrationNo.trim(),
            domain: domain.trim(),
            designation: designation,
            phone_no: phoneNo.trim() || undefined,
            created_at: new Date().toISOString()
          });

          if (dbErr) {
            console.warn('Core member database sync notice:', dbErr);
          }
        }

        const newCoreUser: UserProfile = {
          id: userUuid,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: cleanEmail,
          phone_no: phoneNo.trim() || undefined,
          branch: branch.trim(),
          registration_no: registrationNo.trim(),
          session: sessionBatch.trim(),
          domain: domain.trim(),
          designation: designation,
          role: 'core_member',
          created_at: new Date().toISOString()
        };

        saveCoreMember(newCoreUser);

        // Trigger full MacBook screen neon border fireworks animation
        setIsSubmittedSuccess(true);
        confetti({ particleCount: 180, spread: 100, origin: { y: 0.5 } });

        setTimeout(() => {
          setLoading(false);
          setMockUser(newCoreUser);
          onLoginSuccess(newCoreUser);
        }, 2000);

      } else {
        // --- LOG IN FLOW ---
        // 1. Strictly check if email is registered in the database
        if (!dbCheck.exists) {
          throw new Error('Email not registered. Please sign up first.');
        }

        // Cross-portal check: If student account exists but not in core_members
        if (dbCheck.role !== 'core_member') {
          throw new Error('Unauthorized account type for this portal. Please sign in via Student Portal.');
        }

        let authenticatedUser: UserProfile = dbCheck.profile || {
          id: 'core-admin-' + cleanEmail.split('@')[0],
          first_name: 'Core',
          last_name: 'Member',
          email: cleanEmail,
          role: 'core_member',
          branch: 'Executive Core',
          registration_no: 'CORE-EXEC',
          session: 'Core Board',
          domain: 'Club Administration',
          created_at: new Date().toISOString()
        };

        if (isSupabaseConfigured && supabase) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: password
          });

          if (signInErr) {
            // Check if auth.users was cleared while core_members row exists
            let recovered = false;
            try {
              const { data: sUpData } = await supabase.auth.signUp({
                email: cleanEmail,
                password: password,
              });
              if (sUpData?.user?.id) {
                authenticatedUser.id = sUpData.user.id;
                recovered = true;
              }
            } catch (e) {}

            if (!recovered) {
              if (
                signInErr.message?.toLowerCase().includes('invalid login credentials') ||
                signInErr.message?.toLowerCase().includes('invalid password')
              ) {
                throw new Error('Incorrect password. Please verify credentials.');
              }
              throw new Error(signInErr.message || 'Authentication failed. Please check credentials.');
            }
          } else if (signInData?.user) {
            authenticatedUser.id = signInData.user.id;
          }
        }

        saveCoreMember(authenticatedUser);

        setLoading(false);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setMockUser(authenticatedUser);
        onLoginSuccess(authenticatedUser);
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    }
  };



  // Google OAuth for Core Member / Admin
  const handleGoogleAuth = async () => {
    setLoadingGoogle(true);
    setErrorMsg('');

    try {
      if (mode === 'signup') {
        const cleanPasscode = passcode.trim().toLowerCase();
        if (!cleanPasscode || !['sic-core.in', 'core-council-sic'].includes(cleanPasscode)) {
          throw new Error('You are not a core member.');
        }
      } else {
        // --- LOG IN FLOW ---
        // Pre-check for email existence in DB
        if (email.trim()) {
           const dbCheck = await checkEmailInDatabase(email.trim().toLowerCase());
           if (!dbCheck.exists) {
             throw new Error('Email not registered. Please sign up first.');
           }
           if (dbCheck.role !== 'core_member') {
             throw new Error('Unauthorized account type for this portal. Please sign in via Student Portal.');
           }
        }
      }

      localStorage.setItem('sic_core_oauth', 'true');
      localStorage.setItem('sic_oauth_intent', mode);

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: getOAuthRedirectUrl(),
            queryParams: {
              prompt: 'select_account',
            },
          },
        });
        if (error) throw error;
      } else {
        // Mock fallback if Supabase credentials are not populated
        throw new Error('Supabase configuration missing. Cannot authenticate.');
      }
    } catch (err: any) {
      setLoadingGoogle(false);
      setErrorMsg(err.message || 'Google authentication error. Try again.');
      // Direct redirect on error to prevent any intermediate UI rendering
      alert(err.message || 'Authentication error.');
      window.location.assign('/'); 
    }
  };

  // Calculate filled count for real-time progress
  const filledFieldsCount = [
    isFilled(firstName),
    isFilled(lastName),
    isFilled(registrationNo),
    isFilled(phoneNo),
    isFilled(branch),
    isFilled(sessionBatch),
    isFilled(domain),
    isFilled(designation),
    isFilled(email),
    isFilled(password),
    isFilled(passcode)
  ].filter(Boolean).length;

  return (
    <div ref={containerRef} className="min-h-[100dvh] w-full flex flex-col items-center justify-start p-2 sm:p-6 lg:p-10 bg-[#030611] relative overflow-y-auto overflow-x-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background Ambient Cosmic & Office Lighting */}
      <div className="absolute top-1/4 left-1/4 w-[650px] h-[650px] bg-cyan-600/10 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[650px] h-[650px] bg-fuchsia-600/10 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[900px] h-[350px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Right Desktop Controls (Power, Mode, and Back buttons) */}
      <div className="fixed top-3 right-3 sm:top-6 sm:right-8 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0e1322]/90 border border-[#222a40] hover:border-slate-500 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md"
          title="Back to Landing Page"
        >
          <Power className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 hover:text-rose-400 transition-colors" />
        </button>
      </div>

      {/* SUCCESS OVERLAY NOTIFICATION */}
      <AnimatePresence>
        {isSubmittedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-6 sm:top-8 z-50 px-5 py-3 sm:px-8 sm:py-4 rounded-full bg-gradient-to-r from-cyan-500/95 via-indigo-600/95 to-fuchsia-600/95 text-white font-black text-xs sm:text-base shadow-[0_0_50px_rgba(0,240,255,1)] border border-white/40 flex items-center gap-2.5 backdrop-blur-xl animate-bounce tracking-wide"
          >
            <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-300 animate-spin shrink-0" />
            <span>🎉 CORE COUNCIL VERIFIED & ENROLLED!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MACBOOK PRO LAPTOP CONTAINER (LANDSCAPE WIDESCREEN RATIO) */}
      <div className="w-full max-w-7xl transition-all duration-500 relative z-10 flex flex-col items-center my-auto">
        {/* 1. UPPER DISPLAY LID / BEZEL */}
        <div
          className={`w-full relative bg-[#1e2229] border-2 sm:border-[8px] lg:border-[10px] border-slate-700 shadow-[0_40px_100px_rgba(0,0,0,0.95)] overflow-hidden ${
            cinemaMode ? 'rounded-t-[20px] sm:rounded-t-[36px]' : 'rounded-[16px] sm:rounded-[28px]'
          }`}
        >
          {/* Chrome Browser Top Bar */}
          <div className="h-8 sm:h-10 bg-[#eef1f6] border-b border-slate-300 flex items-center justify-between px-2.5 sm:px-3 relative z-30 select-none">
            {/* Window Controls & Navigation */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500" />
              </div>
              <div className="hidden sm:flex items-center gap-2 text-slate-500 ml-2">
                <ChevronLeft className="w-4 h-4 cursor-pointer hover:text-slate-800" />
                <ChevronRight className="w-4 h-4 cursor-pointer hover:text-slate-800 opacity-50" />
                <RotateCw className="w-3.5 h-3.5 cursor-pointer hover:text-slate-800" />
              </div>
            </div>

            {/* URL Bar */}
            <div className="flex-1 max-w-xs sm:max-w-md mx-2 sm:mx-4">
              <div className="w-full bg-white border border-slate-300 rounded-full px-2.5 sm:px-4 py-0.5 sm:py-1 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-sans text-slate-700 shadow-sm">
                <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">sicclub.in/core-enrollment</span>
              </div>
            </div>

            {/* Right Chrome Icons */}
            <div className="flex items-center gap-2 sm:gap-3 text-slate-600">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600 text-white font-bold text-[9px] sm:text-[10px] flex items-center justify-center shadow-inner">
                C
              </div>
            </div>
          </div>

          {/* 2. THE MACBOOK SCREEN (WITH ENTIRE PERIMETER ANIMATED NEON LASER BORDER) */}
          <div className="relative rounded-[12px] sm:rounded-[14px] overflow-hidden bg-[#060913] p-1.5 sm:p-2.5">
            {/* CONTINUOUS LASER BEAM RUNNING ALONG THE ENTIRE SCREEN PERIMETER */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-[12px] z-30 overflow-visible">
              <defs>
                <linearGradient id="macLaserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity="1" />
                  <stop offset="25%" stopColor="#ec4899" stopOpacity="1" />
                  <stop offset="50%" stopColor="#a855f7" stopOpacity="1" />
                  <stop offset="75%" stopColor="#38bdf8" stopOpacity="1" />
                  <stop offset="100%" stopColor="#00f0ff" stopOpacity="1" />
                </linearGradient>
                <filter id="macLaserGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation={isSubmittedSuccess ? "6" : "3.5"} result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <rect
                x="2"
                y="2"
                width="calc(100% - 4px)"
                height="calc(100% - 4px)"
                rx="12"
                fill="none"
                stroke="url(#macLaserGrad)"
                strokeWidth={isSubmittedSuccess ? "5" : "2.5"}
                filter="url(#macLaserGlow)"
                strokeDasharray={isSubmittedSuccess ? "260 100" : "160 80"}
                className="animate-laser-flow"
              />
            </svg>

            {/* FULL-PERIMETER GLOW ON ENTIRE MACBOOK SCREEN */}
            <div
              className={`absolute inset-1 sm:inset-2 pointer-events-none rounded-[10px] sm:rounded-[12px] z-25 transition-all duration-500 border-[1.5px] border-cyan-500/50`}
            >
              {/* Corner Laser Sparks & Particle Crosshairs */}
              {/* Top-Left Spark */}
              <div className="absolute -top-3.5 -left-3.5 w-9 h-9 pointer-events-none flex items-center justify-center">
                <div className="w-3.5 h-3.5 bg-cyan-300 rounded-full blur-[1px] animate-spark-flare" />
                <div className="absolute w-16 h-[2px] bg-gradient-to-r from-cyan-400 to-transparent blur-[1px]" />
                <div className="absolute h-16 w-[2px] bg-gradient-to-b from-cyan-400 to-transparent blur-[1px]" />
              </div>

              {/* Top-Right Spark */}
              <div className="absolute -top-3.5 -right-3.5 w-9 h-9 pointer-events-none flex items-center justify-center">
                <div className="w-3.5 h-3.5 bg-fuchsia-300 rounded-full blur-[1px] animate-spark-flare [animation-delay:300ms]" />
                <div className="absolute w-16 h-[2px] bg-gradient-to-l from-fuchsia-400 to-transparent blur-[1px]" />
                <div className="absolute h-16 w-[2px] bg-gradient-to-b from-fuchsia-400 to-transparent blur-[1px]" />
              </div>

              {/* Bottom-Left Spark */}
              <div className="absolute -bottom-3.5 -left-3.5 w-9 h-9 pointer-events-none flex items-center justify-center">
                <div className="w-3.5 h-3.5 bg-blue-300 rounded-full blur-[1px] animate-spark-flare [animation-delay:600ms]" />
                <div className="absolute w-16 h-[2px] bg-gradient-to-r from-blue-400 to-transparent blur-[1px]" />
                <div className="absolute h-16 w-[2px] bg-gradient-to-t from-blue-400 to-transparent blur-[1px]" />
              </div>

              {/* Bottom-Right Spark */}
              <div className="absolute -bottom-3.5 -right-3.5 w-9 h-9 pointer-events-none flex items-center justify-center">
                <div className="w-3.5 h-3.5 bg-pink-300 rounded-full blur-[1px] animate-spark-flare [animation-delay:900ms]" />
                <div className="absolute w-16 h-[2px] bg-gradient-to-l from-pink-400 to-transparent blur-[1px]" />
                <div className="absolute h-16 w-[2px] bg-gradient-to-t from-pink-400 to-transparent blur-[1px]" />
              </div>

              {/* Laser Edge Rays */}
              <div className="absolute top-1/4 -left-4 w-8 h-[2px] bg-cyan-400 blur-[1px] shadow-[0_0_12px_#00f0ff] animate-pulse" />
              <div className="absolute top-2/3 -left-4 w-10 h-[2px] bg-blue-400 blur-[1px] shadow-[0_0_12px_#38bdf8] animate-pulse [animation-delay:500ms]" />
              <div className="absolute top-1/3 -right-4 w-10 h-[2px] bg-pink-400 blur-[1px] shadow-[0_0_12px_#f43f5e] animate-pulse [animation-delay:200ms]" />
              <div className="absolute top-3/4 -right-4 w-8 h-[2px] bg-fuchsia-400 blur-[1px] shadow-[0_0_12px_#d946ef] animate-pulse [animation-delay:700ms]" />
            </div>

            {/* SCREEN INNER CONTENT: DEEP COSMIC SPACE + GLASS HUD PORTAL IN LANDSCAPE */}
            <div className="relative w-full h-full flex flex-col justify-center items-center overflow-hidden p-2 sm:p-4 m-0">
              {/* Cosmic Star Particles and Gradient Backing */}
              <div className="absolute inset-0 bg-radial from-slate-900/60 via-[#070b17] to-[#04060e] pointer-events-none" />

              {/* TOP HUD BAR IN LANDSCAPE */}
              <div className="flex items-center justify-between relative z-10 mb-2 sm:mb-0 w-full">
                <button
                  type="button"
                  onClick={() => onNavigate('landing')}
                  className="text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1.5 cursor-pointer bg-slate-900/60 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-slate-800"
                >
                  <span>← Exit</span>
                </button>
              </div>

              {/* Title and Subtitle */}
              <div className="text-center space-y-0.5 sm:space-y-1 relative z-10 mb-2 sm:mb-4">
                <h1 className="text-base sm:text-xl md:text-2xl font-extrabold text-white tracking-tight">
                  {mode === 'signup' ? 'Core Council Executive Enrollment' : 'Core Council Sign In'}
                </h1>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="relative z-10 p-2.5 sm:p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs text-center font-medium flex flex-col items-center gap-1 mb-3 sm:mb-4 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                  <span>{errorMsg}</span>
                  {errorMsg.toLowerCase().includes('already registered') && mode === 'signup' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMsg('');
                      }}
                      className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 underline underline-offset-2 cursor-pointer transition-colors"
                    >
                      Go to Sign In →
                    </button>
                  )}
                </div>
              )}

              {/* SIGNUP MODE: 3-COLUMN EXPANSIVE LANDSCAPE LAYOUT */}
              {mode === 'signup' ? (
                <form onSubmit={handleSubmit} className="relative z-10 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 items-start">
                    
                    {/* COLUMN 1: Personal & Academic */}
                    <div className="space-y-2.5 sm:space-y-3 bg-[#0a0e1a]/85 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-[#1b2234] shadow-xl backdrop-blur-md">
                      <div className="pb-1 border-b border-slate-800">
                        <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span>Personal & Academic</span>
                        </span>
                      </div>

                      {/* First Name */}
                      <div className="relative">
                        <User className={`absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isFilled(firstName) ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.9)]' : 'text-slate-500'}`} />
                        <input
                          ref={firstNameRef}
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lastNameRef.current?.focus(); } }}
                          placeholder="First Name"
                          className={`w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none font-medium transition-all duration-300 ${isFilled(firstName) ? 'border-cyan-400 bg-cyan-950/25 text-white shadow-[0_0_15px_rgba(6,182,212,0.65)] ring-1 ring-cyan-400/50' : 'border-[#1e2638] bg-[#070a13]/90 text-slate-300 hover:border-slate-600 focus:border-cyan-400'}`}
                        />
                      </div>

                      {/* Last Name */}
                      <div className="relative">
                        <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isFilled(lastName) ? 'text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.9)]' : 'text-slate-500'}`} />
                        <input
                          ref={lastNameRef}
                          type="text"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); regNoRef.current?.focus(); } }}
                          placeholder="Last Name"
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none font-medium transition-all duration-300 ${isFilled(lastName) ? 'border-fuchsia-400 bg-fuchsia-950/25 text-white shadow-[0_0_15px_rgba(217,70,239,0.65)] ring-1 ring-fuchsia-400/50' : 'border-[#1e2638] bg-[#070a13]/90 text-slate-300 hover:border-slate-600 focus:border-fuchsia-400'}`}
                        />
                      </div>

                      {/* Registration / Roll No */}
                      <div className="relative">
                        <Hash className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isFilled(registrationNo) ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.9)]' : 'text-slate-500'}`} />
                        <input
                          ref={regNoRef}
                          type="text"
                          required
                          value={registrationNo}
                          onChange={(e) => setRegistrationNo(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); emailRef.current?.focus(); } }}
                          placeholder="Registration / Roll No"
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none font-medium transition-all duration-300 ${isFilled(registrationNo) ? 'border-cyan-400 bg-cyan-950/25 text-white shadow-[0_0_15px_rgba(6,182,212,0.65)] ring-1 ring-cyan-400/50' : 'border-[#1e2638] bg-[#070a13]/90 text-slate-300 hover:border-slate-600 focus:border-cyan-400'}`}
                        />
                      </div>

                      {/* Phone Number */}
                      <div className="relative">
                        <Phone className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isFilled(phoneNo) ? 'text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.9)]' : 'text-slate-500'}`} />
                        <input
                          type="tel"
                          value={phoneNo}
                          onChange={(e) => setPhoneNo(e.target.value)}
                          placeholder="Phone Number (+91)"
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none font-medium transition-all duration-300 ${isFilled(phoneNo) ? 'border-fuchsia-400 bg-fuchsia-950/25 text-white shadow-[0_0_15px_rgba(217,70,239,0.65)] ring-1 ring-fuchsia-400/50' : 'border-[#1e2638] bg-[#070a13]/90 text-slate-300 hover:border-slate-600 focus:border-fuchsia-400'}`}
                        />
                      </div>

                      {/* Branch */}
                      <div className="relative">
                        <Building className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${isFilled(branch) ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.9)]' : 'text-slate-500'}`} />
                        <select
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          className={`w-full pl-10 pr-8 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none font-medium appearance-none cursor-pointer transition-all duration-300 ${isFilled(branch) ? 'border-indigo-400 bg-indigo-950/25 text-white shadow-[0_0_16px_rgba(99,102,241,0.65)] ring-1 ring-indigo-400/50' : 'border-[#1e2638] bg-[#070a13]/90 text-slate-300 hover:border-slate-600 focus:border-indigo-400'}`}
                        >
                          {BRANCH_LIST.map((b) => (
                            <option key={b} value={b} className="bg-slate-950 text-slate-100">{b}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* COLUMN 2: Council & Role */}
                    <div className="space-y-3 bg-[#0a0e1a]/80 p-4 rounded-2xl border border-[#1b2234] shadow-xl backdrop-blur-md">
                      <div className="pb-1 border-b border-slate-800">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400 font-bold flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5" />
                          <span>Council & Role</span>
                        </span>
                      </div>

                      {/* Session / Batch */}
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Session / Batch</label>
                        <div className="relative">
                          <Calendar className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${isFilled(sessionBatch) ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.9)]' : 'text-slate-500'}`} />
                          <select
                            value={sessionBatch}
                            onChange={(e) => setSessionBatch(e.target.value)}
                            className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none font-medium appearance-none cursor-pointer transition-all duration-300 ${isFilled(sessionBatch) ? 'border-cyan-400 bg-cyan-950/25 text-white shadow-[0_0_15px_rgba(6,182,212,0.65)] ring-1 ring-cyan-400/50' : 'border-[#1e2638] bg-[#070a13]/90 text-slate-300 hover:border-slate-600 focus:border-cyan-400'}`}
                          >
                            {SESSION_LIST.map((s) => (
                              <option key={s} value={s} className="bg-slate-950 text-slate-100">{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Domain / Spec */}
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Domain / Spec</label>
                        <div className="relative">
                          <Compass className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${isFilled(domain) ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'text-slate-500'}`} />
                          <select
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none font-medium appearance-none cursor-pointer transition-all duration-300 ${isFilled(domain) ? 'border-emerald-400 bg-emerald-950/25 text-white shadow-[0_0_15px_rgba(52,211,153,0.65)] ring-1 ring-emerald-400/50' : 'border-[#1e2638] bg-[#070a13]/90 text-slate-300 hover:border-slate-600 focus:border-emerald-400'}`}
                          >
                            {DOMAINS_LIST.map((d) => (
                              <option key={d} value={d} className="bg-slate-950 text-slate-100">{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>



                      {/* Core Passcode */}
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Core Passcode</label>
                        <div className="relative">
                          <Key className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isFilled(passcode) ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]' : 'text-slate-500'}`} />
                          <input
                            ref={passcodeRef}
                            type="text"
                            required
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            placeholder="sic-core.in"
                            className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none font-mono transition-all duration-300 ${isFilled(passcode) ? 'border-rose-400 bg-rose-950/25 text-white shadow-[0_0_15px_rgba(244,63,94,0.65)] ring-1 ring-rose-400/50' : 'border-[#1e2638] bg-[#070a13]/90 text-slate-300 hover:border-slate-600 focus:border-rose-400'}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* COLUMN 3: Access & Authentication */}
                    <div className="space-y-3 bg-[#0a0e1a]/80 p-4 rounded-2xl border border-[#1b2234] shadow-xl backdrop-blur-md flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="pb-1 border-b border-slate-800">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" />
                            <span>Access & Authentication</span>
                          </span>
                        </div>

                        {/* Email */}
                        <div className="relative">
                          <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isFilled(email) ? 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]' : 'text-slate-500'}`} />
                          <input
                            ref={emailRef}
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email Address"
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none font-medium transition-all duration-300 ${isFilled(email) ? 'border-sky-400 bg-sky-950/25 text-white shadow-[0_0_15px_rgba(56,189,248,0.65)] ring-1 ring-sky-400/50' : 'border-[#1e2638] bg-[#070a13]/90 text-slate-300 hover:border-slate-600 focus:border-sky-400'}`}
                          />
                        </div>

                        {/* Password */}
                        <div className="relative">
                          <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isFilled(password) ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.9)]' : 'text-slate-500'}`} />
                          <input
                            ref={passwordRef}
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none font-medium transition-all duration-300 ${isFilled(password) ? 'border-purple-400 bg-purple-950/25 text-white shadow-[0_0_15px_rgba(192,132,252,0.65)] ring-1 ring-purple-400/50' : 'border-[#1e2638] bg-[#070a13]/90 text-slate-300 hover:border-slate-600 focus:border-purple-400'}`}
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer">
                            {showPassword ? <EyeOff className="w-4 h-4 text-purple-400" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Confirm Password */}
                        <div className="relative">
                          <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isFilled(confirmPassword) ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.9)]' : 'text-slate-500'}`} />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm Password"
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none font-medium transition-all duration-300 ${isFilled(confirmPassword) ? 'border-purple-400 bg-purple-950/25 text-white shadow-[0_0_15px_rgba(192,132,252,0.65)] ring-1 ring-purple-400/50' : 'border-[#1e2638] bg-[#070a13]/90 text-slate-300 hover:border-slate-600 focus:border-purple-400'}`}
                          />
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-2 sm:pt-3">
                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={loading || isSubmittedSuccess}
                          className={`w-full py-2.5 sm:py-3 px-4 rounded-xl text-white font-bold text-xs sm:text-sm tracking-wide transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer ${
                            isSubmittedSuccess
                              ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-[0_0_40px_rgba(16,185,129,0.9)] animate-pulse'
                              : 'bg-gradient-to-r from-[#4361ee] via-[#7209b7] to-[#f72585] shadow-[0_0_25px_rgba(114,9,183,0.7)] hover:shadow-[0_0_35px_rgba(247,37,133,0.9)]'
                          }`}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-white" />
                              <span>Enrolling...</span>
                            </>
                          ) : isSubmittedSuccess ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
                              <span>ENROLLED!</span>
                            </>
                          ) : (
                            <>
                              <span>Sign Up as Core Member</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>



                        {/* Sign In Toggle */}
                        <div className="text-center text-[11px] text-slate-400 pt-1">
                          Already have an account?{' '}
                          <button
                            type="button"
                            onClick={() => { setMode('login'); setErrorMsg(''); }}
                            className="text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer underline"
                          >
                            Sign In
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                </form>
              ) : (
                /* LOGIN MODE: CENTERED HIGH-TECH HUD IN LANDSCAPE */
                <div className="w-full max-w-2xl mx-auto space-y-4 relative z-10">
                  {/* Google OAuth direct button */}
                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={loadingGoogle}
                    className="w-full py-3.5 px-5 rounded-2xl bg-[#0e1322] hover:bg-[#141b2f] border border-[#20293d] hover:border-cyan-500/50 text-slate-200 font-bold text-sm transition-all flex items-center justify-center gap-3 cursor-pointer shadow-lg active:scale-[0.99] group"
                  >
                    {loadingGoogle ? (
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                    ) : (
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    )}
                    <span className="group-hover:text-cyan-300 transition-colors">Continue with Google (Core Auth)</span>
                  </button>

                  <div className="relative my-3 flex items-center justify-center">
                    <div className="border-t border-[#1e2638] w-full" />
                    <span className="bg-[#060913] px-3 text-[10px] font-mono tracking-widest text-slate-500 uppercase shrink-0">
                      OR SIGN IN WITH EMAIL
                    </span>
                    <div className="border-t border-[#1e2638] w-full" />
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    {/* Email Input with Sky Blue Border Light */}
                    <div className="relative">
                      <Mail
                        className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                          isFilled(email) ? 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]' : 'text-slate-500'
                        }`}
                      />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ADMIN / CORE EMAIL"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:outline-none font-medium transition-all duration-300 ${
                          isFilled(email)
                            ? 'border-sky-400 bg-sky-950/25 text-white shadow-[0_0_18px_rgba(56,189,248,0.7),inset_0_0_10px_rgba(56,189,248,0.2)] ring-1 ring-sky-400/60'
                            : 'border-[#1e2638] bg-[#070a13]/90 text-slate-300 hover:border-slate-600 focus:border-sky-400'
                        }`}
                      />
                    </div>

                    {/* Password Input with Purple Border Light */}
                    <div className="relative">
                      <Lock
                        className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                          isFilled(password) ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.9)]' : 'text-slate-500'
                        }`}
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="SECURITY PASSWORD"
                        className={`w-full pl-10 pr-11 py-3 rounded-xl border text-sm focus:outline-none font-medium transition-all duration-300 ${
                          isFilled(password)
                            ? 'border-purple-400 bg-purple-950/25 text-white shadow-[0_0_18px_rgba(192,132,252,0.7),inset_0_0_10px_rgba(192,132,252,0.2)] ring-1 ring-purple-400/60'
                            : 'border-[#1e2638] bg-[#070a13]/90 text-slate-300 hover:border-slate-600 focus:border-purple-400'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 text-purple-400" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Submit Button with Sonic Waves */}
                    <div className="relative flex items-center justify-center pt-2">
                      <div className="absolute inset-y-0 -left-4 -right-4 flex items-center justify-between pointer-events-none opacity-85">
                        <div className="flex items-center -space-x-2">
                          <span className="w-4 h-10 rounded-full border border-indigo-400/40 animate-sonic-wave" />
                          <span className="w-6 h-12 rounded-full border border-purple-500/50 animate-sonic-wave [animation-delay:200ms]" />
                          <span className="w-8 h-14 rounded-full border border-cyan-400/60 animate-sonic-wave [animation-delay:400ms]" />
                        </div>
                        <div className="flex items-center -space-x-2 rotate-180">
                          <span className="w-4 h-10 rounded-full border border-indigo-400/40 animate-sonic-wave" />
                          <span className="w-6 h-12 rounded-full border border-purple-500/50 animate-sonic-wave [animation-delay:200ms]" />
                          <span className="w-8 h-14 rounded-full border border-fuchsia-400/60 animate-sonic-wave [animation-delay:400ms]" />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="relative z-10 w-full py-2.5 sm:py-3.5 px-5 rounded-xl sm:rounded-full text-white font-bold text-xs sm:text-sm tracking-wide bg-gradient-to-r from-[#4361ee] via-[#7209b7] to-[#f72585] shadow-[0_0_25px_rgba(114,9,183,0.7)] hover:shadow-[0_0_40px_rgba(247,37,133,0.95)] transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Authenticating Core Credentials...</span>
                          </>
                        ) : (
                          <>
                            <span>Sign In to Core Council Portal</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Switch to Sign Up */}
                  <div className="pt-2 sm:pt-3 text-center text-xs text-slate-400">
                    <p>
                      New Core Member?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signup');
                          setErrorMsg('');
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors cursor-pointer"
                      >
                        Create Core Member Account (Sign Up) →
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* MacBook Hinge */}
        <div className="w-full h-2.5 sm:h-3 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 shadow-lg mt-1.5 sm:mt-2" />

        {/* MacBook Base & Keyboard Shelf */}
        <div className="w-4/5 mx-auto h-9 sm:h-14 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 rounded-b-[20px] sm:rounded-b-[32px] border-t border-slate-700 shadow-2xl flex flex-col items-center justify-between relative px-3 sm:px-4 pb-1.5 sm:pb-2 mb-4 sm:mb-6">
          <div className="w-16 sm:w-24 h-1 rounded-full bg-slate-700/60 mt-1" />
          <span className="text-[9px] sm:text-[10px] font-sans tracking-widest text-slate-400 font-semibold">MacBook Air</span>
          <div className="w-full max-w-md h-2 sm:h-3 grid grid-cols-12 gap-1 opacity-40">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="bg-slate-950 rounded-xs h-1" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
