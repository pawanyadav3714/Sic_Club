import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  Globe, 
  Shield, 
  Lock, 
  Key, 
  ShieldCheck, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Zap, 
  Building,
  User,
  Hash,
  Phone,
  Calendar,
  Compass,
  Award,
  Mail,
  Terminal
} from 'lucide-react';
import { UserProfile } from '../../types';
import { 
  setMockUser, 
  saveCoreMember, 
  getStoredCoreMembers, 
  supabase, 
  isSupabaseConfigured,
  DEFAULT_CORE_MEMBERS,
  checkEmailInDatabase,
  getOAuthRedirectUrl
} from '../../lib/supabase';
import confetti from 'canvas-confetti';
import { Keyboard } from './keyboard';
import { SmoothInput } from './SmoothInput';
import { playKeyClickSound, setMuted } from '../../utils/keyboardAudio';

interface MacbookScrollSectionProps {
  onNavigate: (route: string) => void;
  onLoginSuccess: (user: UserProfile) => void;
}

type ScreenMode = 'terminal' | 'signup' | 'signin' | 'admin' | 'dashboard';

const BRANCH_LIST = [
  'Computer Science & Engineering',
  'Electronics & Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Information Technology',
  'AI & Data Science',
  'Other Engineering Branch',
];

const SESSION_LIST = [
  '2025–2029',
  '2024–2028',
  '2023–2027',
  '2022–2026',
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

const DESIGNATIONS_LIST = [
  'Technical & AI Lead',
  'Events & Operations Lead',
  'Creative & Media Lead',
  'Tech Fest Management Lead',
  'Club President / Vice President',
  'Faculty Advisor & Mentor',
  'Research & Project Lead',
];

export default function MacbookScrollSection({ onNavigate, onLoginSuccess }: MacbookScrollSectionProps) {
  const [screenState, setScreenState] = useState<ScreenMode>('terminal');
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  // Terminal state for terminal-first interaction (matching user's video)
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<Array<{ type: 'input' | 'output' | 'success' | 'system' | 'error'; text: string }>>([]);
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const terminalScrollRef = useRef<HTMLDivElement>(null);



  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      playKeyClickSound('enter');
      executeTerminalCommand();
      return;
    }
    if (e.key === 'Backspace') {
      playKeyClickSound('backspace');
      return;
    }
    if (e.key === ' ') {
      playKeyClickSound('space');
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      playKeyClickSound('default');
    }
  };

  const handleOnScreenKeyPress = (keyLabel: string) => {
    if (screenState !== 'terminal') return;
    const lower = keyLabel.toLowerCase();
    if (lower === 'return' || lower === 'enter') {
      executeTerminalCommand();
    } else if (lower === 'del' || lower === 'backspace') {
      setTerminalInput((prev) => prev.slice(0, -1));
    } else if (lower === 'space') {
      setTerminalInput((prev) => prev + ' ');
    } else if (lower.length === 1) {
      setTerminalInput((prev) => prev + lower);
    }
  };

  const executeTerminalCommand = (cmdToRun?: string) => {
    const raw = (cmdToRun !== undefined ? cmdToRun : terminalInput).trim();
    if (!raw && cmdToRun === undefined) return;

    const commandText = raw || 'npx sic-core.in';
    setTerminalHistory((prev) => [...prev, { type: 'input', text: `Manus-Macbook:~$ ${commandText}` }]);
    setTerminalInput('');

    const lower = commandText.toLowerCase();

    if (
      lower === 'sic-core.in' ||
      lower === './sic-core.in' ||
      lower === 'run sic-core.in' ||
      lower === 'npx sic-core.in' ||
      lower === 'npx sic-core' ||
      lower === 'sic-core'
    ) {
      setIsExecutingCommand(true);
      setTimeout(() => {
        setTerminalHistory((prev) => [
          ...prev,
          { type: 'system', text: 'Initializing core portal...' },
        ]);
      }, 200);

      setTimeout(() => {
        setTerminalHistory((prev) => [
          ...prev,
          { type: 'success', text: '✓ Preflight checks passed.' },
          { type: 'success', text: '✓ Handshake verified with SIC Security Gateway.' },
        ]);
      }, 550);

      setTimeout(() => {
        setTerminalHistory((prev) => [
          ...prev,
          { type: 'system', text: '✓ Core Council permissions authorized (Level 4).' },
          { type: 'success', text: '🚀 Launching Core Council Sign-In Portal...' },
        ]);
      }, 950);

      setTimeout(() => {
        setIsExecutingCommand(false);
        setScreenState('signin');
      }, 1500);
      return;
    }

    if (lower === 'clear') {
      setTerminalHistory([]);
      return;
    }

    if (lower === 'help') {
      setTerminalHistory((prev) => [
        ...prev,
        { type: 'output', text: 'Available commands:' },
        { type: 'output', text: '  sic-core.in    Launch the Core Council Executive Portal' },
        { type: 'output', text: '  status         Inspect Council Gateway connectivity' },
        { type: 'output', text: '  ls             List workspace repository files' },
        { type: 'output', text: '  whoami         Display current shell identity' },
        { type: 'output', text: '  clear          Clear the terminal screen' },
      ]);
      return;
    }

    if (lower === 'status') {
      setTerminalHistory((prev) => [
        ...prev,
        { type: 'success', text: '● SIC Core Services: ONLINE [Latency: 1.2ms]' },
        { type: 'output', text: '  Encryption: AES-256-GCM / Quantum TLS 1.3' },
        { type: 'output', text: '  Auth Gateway: READY (awaiting: sic-core.in)' },
      ]);
      return;
    }

    if (lower === 'ls') {
      setTerminalHistory((prev) => [
        ...prev,
        { type: 'output', text: 'council_blueprint.json   core_gateway.sh   sic-core.in*   README.md' },
      ]);
      return;
    }

    if (lower === 'whoami') {
      setTerminalHistory((prev) => [
        ...prev,
        { type: 'output', text: 'core-candidate@sic.edu (Role: Core Council Member)' },
      ]);
      return;
    }

    // Default command not found
    setTerminalHistory((prev) => [
      ...prev,
      { type: 'error', text: `bash: command not found: ${commandText}` },
      { type: 'output', text: 'Run "sic-core.in" to launch the Core Council Portal.' },
    ]);
  };

  // Form states matching the exact dynamic screenshot
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [branch, setBranch] = useState('Computer Science & Engineering');
  const [sessionBatch, setSessionBatch] = useState('2024–2028');
  const [domain, setDomain] = useState('Tech / Coding');
  const [designation, setDesignation] = useState('Technical & AI Lead');
  const [passcode, setPasscode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Admin Portal state
  const [adminEmail, setAdminEmail] = useState('pawanyadav3714@gmail.com');
  const [adminPasscode, setAdminPasscode] = useState('SIC-CORE-2025');
  const [adminDomain, setAdminDomain] = useState('Tech / Coding');
  const [showAdminPasscode, setShowAdminPasscode] = useState(false);

  // Helper to determine if an input is filled
  const isFilled = (val?: string) => Boolean(val && val.trim().length > 0);

  // Verified fields count (defaults match user screenshot showing 4 / 11 verified)
  const filledFieldsCount = [
    firstName,
    lastName,
    registrationNo,
    phoneNo,
    branch,
    sessionBatch,
    domain,
    designation,
    passcode,
    email,
    password,
  ].filter(isFilled).length;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  // Scroll zoom dynamics - hardware accelerated & flat 2D on mobile for lag-free 60fps scrolling
  const scale = useTransform(scrollYProgress, [0, 0.45, 0.9], [isMobile ? 0.95 : 0.8, 1.0, 1.02]);
  const rotateX = useTransform(scrollYProgress, [0, 0.45, 0.9], [isMobile ? 0 : 20, 0, 0]);
  const translateY = useTransform(scrollYProgress, [0, 0.45, 0.9], [isMobile ? 15 : 50, 0, -10]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('Please enter your first and last name.');
      return;
    }
    if (!password || password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const cleanEmail = (email || `${firstName.toLowerCase().replace(/\s+/g, '')}@sic.edu`).trim().toLowerCase();

    setLoading(true);
    const user: UserProfile = {
      id: 'core-' + Date.now(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: cleanEmail,
      branch,
      registration_no: registrationNo || 'REG-CORE-' + Math.floor(1000 + Math.random() * 9000),
      session: sessionBatch,
      domain,
      designation,
      role: 'core_member',
      created_at: new Date().toISOString()
    };

    // 1. Save locally in core members database
    saveCoreMember(user);

    // 2. Also register in registered users list
    try {
      const regList: UserProfile[] = JSON.parse(localStorage.getItem('sic_registered_users') || '[]');
      const existingIdx = regList.findIndex(u => u.email?.toLowerCase() === cleanEmail);
      if (existingIdx >= 0) {
        regList[existingIdx] = user;
      } else {
        regList.push(user);
      }
      localStorage.setItem('sic_registered_users', JSON.stringify(regList));
    } catch {}

    // 3. Sync to Supabase database if configured
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: cleanEmail,
          branch: user.branch,
          registration_no: user.registration_no,
          session: user.session,
          domain: user.domain,
          designation: user.designation,
          role: 'core_member',
          created_at: user.created_at
        });
      } catch (err) {
        console.warn('Supabase sync warning:', err);
      }
    }

    setTimeout(() => {
      setLoading(false);
      setIsSubmittedSuccess(true);
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 } });
      setSuccessMsg('Enrollment Verified! Welcome to the Core Council.');
      
      setMockUser(user);
      onLoginSuccess(user);

      setTimeout(() => {
        setIsSubmittedSuccess(false);
        setScreenState('dashboard');
      }, 1400);
    }, 700);
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const targetEmail = email.trim().toLowerCase();

    if (!targetEmail) {
      setErrorMsg('Please enter your registered Core Email.');
      return;
    }

    setLoading(true);

    // 1. Check local Core Council database and registered users
    const localCoreMembers = getStoredCoreMembers();
    let registeredUsers: UserProfile[] = [];
    try {
      registeredUsers = JSON.parse(localStorage.getItem('sic_registered_users') || '[]');
    } catch {}

    let matchedUser: UserProfile | undefined = 
      localCoreMembers.find(m => m.email?.toLowerCase() === targetEmail) ||
      registeredUsers.find(u => u.email?.toLowerCase() === targetEmail) ||
      DEFAULT_CORE_MEMBERS.find(d => d.email?.toLowerCase() === targetEmail);

    // 2. Also check remote Supabase database if configured
    if (!matchedUser && supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', targetEmail)
          .maybeSingle();

        if (data && !error) {
          matchedUser = data as UserProfile;
        }
      } catch (err) {
        console.warn('Database lookup warning:', err);
      }
    }

    // 3. Database check: If not registered, block access and display error
    if (!matchedUser) {
      setTimeout(() => {
        setLoading(false);
        setErrorMsg('Email not registered. Please sign up as a Core Member first.');
      }, 500);
      return;
    }

    // 4. Authorized: allow sign in!
    setTimeout(() => {
      setLoading(false);
      setMockUser(matchedUser);
      onLoginSuccess(matchedUser);
      confetti({ particleCount: 130, spread: 100, origin: { y: 0.6 } });
      setScreenState('dashboard');
    }, 600);
  };

  const handleGoogleAuth = async () => {
    setLoadingGoogle(true);
    setErrorMsg('');

    try {
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

      localStorage.setItem('sic_core_oauth', 'true');
      localStorage.setItem('sic_oauth_intent', 'login');

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
        throw new Error('Supabase configuration missing. Cannot authenticate.');
      }
    } catch (err: any) {
      setLoadingGoogle(false);
      setErrorMsg(err.message || 'Google authentication error. Try again.');
      alert(err.message || 'Authentication error.');
      window.location.assign('/');
    }
  };

  const handleAdminLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      setLoading(false);
      const user: UserProfile = {
        id: 'admin-' + Date.now(),
        first_name: 'Pawan',
        last_name: 'Yadav (Admin)',
        email: adminEmail || 'pawanyadav3714@gmail.com',
        branch: 'Computer Science & Engineering',
        registration_no: 'SIC-ADMIN-01',
        session: '2024–2028',
        domain: adminDomain || 'Tech / Coding',
        designation: 'Executive Council Administrator',
        role: 'core_member',
        created_at: new Date().toISOString()
      };
      setMockUser(user);
      onLoginSuccess(user);
      confetti({ particleCount: 140, spread: 100, origin: { y: 0.6 } });
      setScreenState('dashboard');
    }, 700);
  };

  return (
    <div ref={containerRef} className="py-6 sm:py-16 relative overflow-hidden flex flex-col items-center justify-center perspective-[1400px] bg-gradient-to-b from-[#030712] via-[#070b19] to-[#030712]">

      {/* 3D Scroll-Driven Zoom MacBook Mockup */}
      <motion.div
        style={{
          scale,
          rotateX: isMobile ? 0 : rotateX,
          y: translateY,
          transformStyle: isMobile ? 'flat' : 'preserve-3d',
        }}
        className="w-full max-w-6xl px-2 sm:px-4 mx-auto relative z-20 transform-gpu will-change-transform"
      >
        {/* MacBook Screen / Lid */}
        <div className="rounded-t-[34px] sm:rounded-t-[38px] bg-[#1a1e27] border-[6px] sm:border-[10px] border-[#222834] shadow-[0_40px_120px_rgba(0,0,0,0.98)] overflow-hidden relative">
          
          {/* Chrome Browser Top Bar (Matching reference image exactly) */}
          <div className="h-10 bg-[#eef1f6] border-b border-slate-300 flex items-center justify-between px-3 relative z-35 select-none">
            {/* Window Controls & Navigation */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
              </div>
              <div className="flex items-center gap-2 text-slate-500 ml-2">
                <ChevronLeft className="w-4 h-4 cursor-pointer hover:text-slate-800" />
                <ChevronRight className="w-4 h-4 cursor-pointer hover:text-slate-800 opacity-50" />
                <RotateCw className="w-3.5 h-3.5 cursor-pointer hover:text-slate-800" />
              </div>
            </div>

            {/* Dynamic URL Bar matching reference image */}
            <div className="flex-1 max-w-md mx-4">
              <div className="w-full bg-white border border-slate-300 rounded-full px-4 py-1 flex items-center gap-2 text-[11px] font-sans text-slate-700 shadow-sm">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate font-mono">
                  {screenState === 'terminal' && 'terminal.sic.edu — bash (~/sic-core.in)'}
                  {screenState === 'signup' && 'coretrackclub.com/core/executive-registration'}
                  {screenState === 'signin' && 'coretrackclub.com/core/executive-signin'}
                  {screenState === 'admin' && 'coretrackclub.com/admin/executive-portal'}
                  {screenState === 'dashboard' && 'coretrackclub.com/admin/core-control-center'}
                </span>
              </div>
            </div>

            {/* Right Chrome Icons */}
            <div className="flex items-center gap-2 text-slate-600">
              <div className="w-6 h-6 rounded-full bg-[#1a73e8] text-white font-bold text-[11px] flex items-center justify-center shadow-inner">
                C
              </div>
            </div>
          </div>

          {/* Screen Display Content with Perimeter Glowing Laser Border */}
          <div className="w-full bg-[#060913] text-white relative overflow-hidden flex flex-col p-2 sm:p-4">
            
            {/* CONTINUOUS LASER BEAM RUNNING ALONG ENTIRE SCREEN PERIMETER */}
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
                filter={isMobile ? undefined : "url(#macLaserGlow)"}
                strokeDasharray={isSubmittedSuccess ? "260 100" : "160 80"}
                className="animate-laser-flow"
              />
            </svg>

            {/* FULL-PERIMETER CORNER SPARKS & CROSSHAIRS */}
            <div className="absolute inset-1 sm:inset-2 pointer-events-none rounded-[10px] sm:rounded-[12px] z-25 transition-all duration-500 border-[1.5px] border-cyan-500/40">
              {/* Top-Left Spark */}
              <div className="absolute -top-3.5 -left-3.5 w-8 h-8 pointer-events-none flex items-center justify-center">
                <div className="w-3 h-3 bg-cyan-300 rounded-full blur-[1px] animate-spark-flare" />
                <div className="absolute w-12 h-[2px] bg-gradient-to-r from-cyan-400 to-transparent blur-[1px]" />
                <div className="absolute h-12 w-[2px] bg-gradient-to-b from-cyan-400 to-transparent blur-[1px]" />
              </div>

              {/* Top-Right Spark */}
              <div className="absolute -top-3.5 -right-3.5 w-8 h-8 pointer-events-none flex items-center justify-center">
                <div className="w-3 h-3 bg-fuchsia-300 rounded-full blur-[1px] animate-spark-flare [animation-delay:300ms]" />
                <div className="absolute w-12 h-[2px] bg-gradient-to-l from-fuchsia-400 to-transparent blur-[1px]" />
                <div className="absolute h-12 w-[2px] bg-gradient-to-b from-fuchsia-400 to-transparent blur-[1px]" />
              </div>

              {/* Bottom-Left Spark */}
              <div className="absolute -bottom-3.5 -left-3.5 w-8 h-8 pointer-events-none flex items-center justify-center">
                <div className="w-3 h-3 bg-blue-300 rounded-full blur-[1px] animate-spark-flare [animation-delay:600ms]" />
                <div className="absolute w-12 h-[2px] bg-gradient-to-r from-blue-400 to-transparent blur-[1px]" />
                <div className="absolute h-12 w-[2px] bg-gradient-to-t from-blue-400 to-transparent blur-[1px]" />
              </div>

              {/* Bottom-Right Spark */}
              <div className="absolute -bottom-3.5 -right-3.5 w-8 h-8 pointer-events-none flex items-center justify-center">
                <div className="w-3 h-3 bg-pink-300 rounded-full blur-[1px] animate-spark-flare [animation-delay:900ms]" />
                <div className="absolute w-12 h-[2px] bg-gradient-to-l from-pink-400 to-transparent blur-[1px]" />
                <div className="absolute h-12 w-[2px] bg-gradient-to-t from-pink-400 to-transparent blur-[1px]" />
              </div>

              {/* Laser Edge Rays */}
              <div className="absolute top-1/4 -left-3 w-6 h-[2px] bg-cyan-400 blur-[1px] shadow-[0_0_12px_#00f0ff] animate-pulse" />
              <div className="absolute top-2/3 -left-3 w-8 h-[2px] bg-blue-400 blur-[1px] shadow-[0_0_12px_#38bdf8] animate-pulse [animation-delay:500ms]" />
              <div className="absolute top-1/3 -right-3 w-8 h-[2px] bg-pink-400 blur-[1px] shadow-[0_0_12px_#f43f5e] animate-pulse [animation-delay:200ms]" />
              <div className="absolute top-3/4 -right-3 w-6 h-[2px] bg-fuchsia-400 blur-[1px] shadow-[0_0_12px_#d946ef] animate-pulse [animation-delay:700ms]" />
            </div>

            {/* SCREEN INNER BODY */}
            <div className="relative w-full h-full flex flex-col justify-start items-center overflow-y-auto px-2 sm:px-4 py-3 z-10">
              <AnimatePresence mode="wait">
                
                {/* STATE 0: INTERACTIVE BASH TERMINAL (EXECUTES sic-core.in TO BOOT PORTAL) */}
                {screenState === 'terminal' && (
                  <motion.div
                    key="terminal"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full flex flex-col justify-center items-center py-2 sm:py-4 px-1"
                  >
                    {/* Realistic macOS Bash Terminal Window (Matching User's Video) */}
                    <div 
                      onClick={() => terminalInputRef.current?.focus()}
                      className="w-full max-w-2xl bg-[#111216]/95 rounded-xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col text-left font-mono my-auto backdrop-blur-xl transition-all min-h-[190px] sm:min-h-[380px]"
                    >
                      {/* Window Title Bar */}
                      <div className="bg-[#1a1c23] px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800/80 select-none">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block border border-[#e0443e]" />
                          <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block border border-[#dea123]" />
                          <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block border border-[#1aab29]" />
                        </div>
                        <div className="text-[11px] sm:text-xs text-slate-300 font-medium tracking-wide flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Manus-Macbook — bash</span>
                        </div>
                        <div className="w-12 text-right">
                          <span className="text-[10px] text-slate-500 font-mono">zsh</span>
                        </div>
                      </div>

                      {/* Terminal Screen Body */}
                      <div className="p-2.5 sm:p-6 flex-1 flex flex-col justify-start overflow-y-auto space-y-1.5 sm:space-y-2.5 font-mono text-xs sm:text-[15px] text-slate-100 antialiased tracking-normal select-text [text-rendering:optimizeLegibility]">
                        <div className="space-y-2 font-mono">
                          {terminalHistory.map((line, idx) => (
                            <div key={idx} className="leading-relaxed">
                              {line.type === 'input' && (
                                <div className="text-white flex items-center gap-1.5 text-sm sm:text-[15px] font-medium">
                                  <span className="text-[#38bdf8] font-bold">Manus-Macbook</span>
                                  <span className="text-slate-400 font-semibold">:</span>
                                  <span className="text-slate-100 font-bold">~</span>
                                  <span className="text-[#facc15] font-black">$ </span>
                                  <span className="text-white font-semibold">{line.text.replace('Manus-Macbook:~$ ', '')}</span>
                                </div>
                              )}
                              {line.type === 'system' && (
                                <p className="text-slate-300 text-xs sm:text-[14px] font-medium">{line.text}</p>
                              )}
                              {line.type === 'output' && (
                                <p className="text-slate-200 text-xs sm:text-[14px] font-medium">{line.text}</p>
                              )}
                              {line.type === 'success' && (
                                <p className="text-emerald-400 font-bold text-xs sm:text-[14px] flex items-center gap-1.5">
                                  <span>{line.text}</span>
                                </p>
                              )}
                              {line.type === 'error' && (
                                <p className="text-rose-400 font-bold text-xs sm:text-[14px]">{line.text}</p>
                              )}
                            </div>
                          ))}

                          {/* Active Prompt & Interactive Input Line with Ultra-Crisp Sharp Typography */}
                          {!isExecutingCommand && (
                            <div className="flex items-center gap-1.5 pt-1">
                              <span className="text-[#38bdf8] font-bold text-sm sm:text-[15px] tracking-tight">Manus-Macbook</span>
                              <span className="text-slate-400 font-semibold text-sm sm:text-[15px]">:</span>
                              <span className="text-slate-100 font-bold text-sm sm:text-[15px]">~</span>
                              <span className="text-[#facc15] font-black text-sm sm:text-[15px]">$ </span>
                              <div className="relative flex-1 flex items-center">
                                <input
                                  ref={terminalInputRef}
                                  type="text"
                                  value={terminalInput}
                                  onChange={(e) => {
                                    setTerminalInput(e.target.value);
                                    playKeyClickSound('default');
                                  }}
                                  onKeyDown={handleTerminalKeyDown}
                                  placeholder="npx sic-core.in"
                                  className="w-full bg-transparent text-white font-mono text-sm sm:text-[15px] font-semibold focus:outline-none placeholder:text-slate-500/90 border-none p-0 tracking-normal antialiased"
                                  style={{ caretColor: '#38bdf8' }}
                                />
                                <span className="inline-block w-2.5 h-5 bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.9)] animate-pulse ml-0.5 shrink-0" />
                              </div>
                            </div>
                          )}

                          {isExecutingCommand && (
                            <div className="flex items-center gap-2 pt-2 text-[#38bdf8] font-mono text-sm sm:text-[15px] font-bold">
                              <Loader2 className="w-4 h-4 animate-spin text-[#38bdf8]" />
                              <span>Initializing core portal...</span>
                            </div>
                          )}
                          <div ref={terminalScrollRef} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STATE 1: CORE MEMBER REGISTRATION */}
                {screenState === 'signup' && (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25 }}
                    className="w-full flex flex-col space-y-3"
                  >
                    {/* Top HUD Bar (← Terminal | Verified Meter | Core Portal) */}
                    <div className="flex items-center justify-between w-full pb-1">
                      <button
                        type="button"
                        onClick={() => setScreenState('terminal')}
                        className="text-[11px] font-mono text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1.5 cursor-pointer bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800"
                      >
                        <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                        <span>← Terminal</span>
                      </button>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-[#0b0f1c] px-3 py-1 rounded-full border border-cyan-500/30">
                          <span className="text-[10px] font-mono text-cyan-400 font-bold">
                            {filledFieldsCount} / 11 VERIFIED
                          </span>
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-all duration-300"
                              style={{ width: `${(filledFieldsCount / 11) * 100}%` }}
                            />
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Core Portal</span>
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="text-center pt-0 pb-1">
                      <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                        Core Council Executive Enrollment
                      </h1>
                    </div>

                    {/* Success or Error Alert */}
                    {successMsg && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs text-center font-medium shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        {successMsg}
                      </div>
                    )}
                    {errorMsg && (
                      <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs text-center font-medium shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                        {errorMsg}
                      </div>
                    )}

                    {/* 3-COLUMN EXPANSIVE CYBER HUD LAYOUT (EXACTLY MATCHING USER'S IMAGE) */}
                    <form onSubmit={handleSignup} className="w-full">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-start">
                        
                        {/* COLUMN 1: PERSONAL & ACADEMIC */}
                        <div className="space-y-2.5 bg-[#0a0e1a]/80 p-3.5 rounded-2xl border border-[#1b2234] shadow-xl backdrop-blur-md">
                          <div className="pb-1 border-b border-slate-800">
                            <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" />
                              <span>Personal & Academic</span>
                            </span>
                          </div>

                          {/* First Name */}
                          <SmoothInput
                            type="text"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="First Name"
                            isFilled={isFilled(firstName)}
                            accentColor="cyan"
                            icon={<User className={`w-4 h-4 transition-colors ${isFilled(firstName) ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.9)]' : 'text-slate-500'}`} />}
                          />

                          {/* Last Name */}
                          <SmoothInput
                            type="text"
                            required
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Last Name"
                            isFilled={isFilled(lastName)}
                            accentColor="fuchsia"
                            icon={<User className={`w-4 h-4 transition-colors ${isFilled(lastName) ? 'text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.9)]' : 'text-slate-500'}`} />}
                          />

                          {/* Registration / Roll No */}
                          <SmoothInput
                            type="text"
                            required
                            value={registrationNo}
                            onChange={(e) => setRegistrationNo(e.target.value)}
                            placeholder="Registration / Roll No"
                            isFilled={isFilled(registrationNo)}
                            accentColor="cyan"
                            icon={<Hash className={`w-4 h-4 transition-colors ${isFilled(registrationNo) ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.9)]' : 'text-slate-500'}`} />}
                          />

                          {/* Phone Number */}
                          <SmoothInput
                            type="tel"
                            value={phoneNo}
                            onChange={(e) => setPhoneNo(e.target.value)}
                            placeholder="Phone Number (+91)"
                            isFilled={isFilled(phoneNo)}
                            accentColor="fuchsia"
                            icon={<Phone className={`w-4 h-4 transition-colors ${isFilled(phoneNo) ? 'text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.9)]' : 'text-slate-500'}`} />}
                          />

                          {/* Branch Selector with Neon Border */}
                          <div className="relative">
                            <Building className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${isFilled(branch) ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.9)]' : 'text-slate-500'}`} />
                            <select
                              value={branch}
                              onChange={(e) => setBranch(e.target.value)}
                              className={`w-full pl-10 pr-6 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none font-medium appearance-none cursor-pointer transition-all duration-300 ${isFilled(branch) ? 'border-indigo-400 bg-indigo-950/25 text-white shadow-[0_0_16px_rgba(99,102,241,0.65)] ring-1 ring-indigo-400/50' : 'border-[#1e2638] bg-[#070a13]/90 text-slate-300 hover:border-slate-600 focus:border-indigo-400'}`}
                            >
                              {BRANCH_LIST.map((b) => (
                                <option key={b} value={b} className="bg-slate-950 text-slate-100">{b}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* COLUMN 2: COUNCIL & ROLE */}
                        <div className="space-y-2.5 bg-[#0a0e1a]/80 p-3.5 rounded-2xl border border-[#1b2234] shadow-xl backdrop-blur-md">
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
                                className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none font-medium appearance-none cursor-pointer transition-all duration-300 ${isFilled(sessionBatch) ? 'border-cyan-400 bg-cyan-950/25 text-white shadow-[0_0_15px_rgba(6,182,212,0.65)] ring-1 ring-cyan-400/50' : 'border-[#1e2638] bg-[#070a13]/90 text-slate-300 hover:border-slate-600 focus:border-cyan-400'}`}
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
                                className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none font-medium appearance-none cursor-pointer transition-all duration-300 ${isFilled(domain) ? 'border-emerald-400 bg-emerald-950/25 text-white shadow-[0_0_15px_rgba(52,211,153,0.65)] ring-1 ring-emerald-400/50' : 'border-[#1e2638] bg-[#070a13]/90 text-slate-300 hover:border-slate-600 focus:border-emerald-400'}`}
                              >
                                {DOMAINS_LIST.map((d) => (
                                  <option key={d} value={d} className="bg-slate-950 text-slate-100">{d}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Designation */}
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Designation</label>
                            <div className="relative">
                              <Award className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${isFilled(designation) ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.9)]' : 'text-slate-500'}`} />
                              <select
                                value={designation}
                                onChange={(e) => setDesignation(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none font-medium appearance-none cursor-pointer transition-all duration-300 ${isFilled(designation) ? 'border-purple-400 bg-purple-950/25 text-white shadow-[0_0_15px_rgba(168,85,247,0.65)] ring-1 ring-purple-400/50' : 'border-[#1e2638] bg-[#070a13]/90 text-slate-300 hover:border-slate-600 focus:border-purple-400'}`}
                              >
                                {DESIGNATIONS_LIST.map((d) => (
                                  <option key={d} value={d} className="bg-slate-950 text-slate-100">{d}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Core Passcode */}
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Core Passcode</label>
                            <SmoothInput
                              type="text"
                              value={passcode}
                              onChange={(e) => setPasscode(e.target.value)}
                              placeholder="sic-core.in"
                              isFilled={isFilled(passcode)}
                              accentColor="fuchsia"
                              className="font-mono"
                              icon={<Key className={`w-4 h-4 transition-colors ${isFilled(passcode) ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]' : 'text-slate-500'}`} />}
                            />
                          </div>
                        </div>

                        {/* COLUMN 3: ACCESS & AUTHENTICATION */}
                        <div className="space-y-2.5 bg-[#0a0e1a]/80 p-3.5 rounded-2xl border border-[#1b2234] shadow-xl backdrop-blur-md flex flex-col justify-between">
                          <div className="space-y-2.5">
                            <div className="pb-1 border-b border-slate-800">
                              <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5" />
                                <span>Access & Authentication</span>
                              </span>
                            </div>

                            {/* Email */}
                            <SmoothInput
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="Email Address"
                              isFilled={isFilled(email)}
                              accentColor="cyan"
                              icon={<Mail className={`w-4 h-4 transition-colors ${isFilled(email) ? 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]' : 'text-slate-500'}`} />}
                            />

                            {/* Password */}
                            <SmoothInput
                              type={showPassword ? 'text' : 'password'}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Password"
                              isFilled={isFilled(password)}
                              accentColor="purple"
                              icon={<Lock className={`w-4 h-4 transition-colors ${isFilled(password) ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.9)]' : 'text-slate-500'}`} />}
                              rightElement={
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-white cursor-pointer">
                                  {showPassword ? <EyeOff className="w-3.5 h-3.5 text-purple-400" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              }
                            />

                            {/* Confirm Password */}
                            <SmoothInput
                              type={showPassword ? 'text' : 'password'}
                              required
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm Password"
                              isFilled={isFilled(confirmPassword)}
                              accentColor="purple"
                              icon={<Lock className={`w-4 h-4 transition-colors ${isFilled(confirmPassword) ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.9)]' : 'text-slate-500'}`} />}
                            />
                          </div>

                          <div className="space-y-2 pt-2">
                            {/* Submit Button with Vibrant Neon Gradient */}
                            <button
                              type="submit"
                              disabled={loading || isSubmittedSuccess}
                              className={`w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs sm:text-sm tracking-wide transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer ${
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
                            <div className="text-center text-[10px] sm:text-[11px] text-slate-400 pt-0.5">
                              Already registered as Core Member?{' '}
                              <button
                                type="button"
                                onClick={() => setScreenState('signin')}
                                className="text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer underline"
                              >
                                Core Member Sign In
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    </form>
                  </motion.div>
                )}

                {/* STATE 2: SIGN IN SCREEN (Exact Reference Design) */}
                {screenState === 'signin' && (
                  <motion.div
                    key="signin"
                    initial={{ opacity: 0, scale: 0.98, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="w-full max-w-md my-auto p-6 sm:p-8 bg-[#070b14]/95 rounded-2xl border border-slate-800 shadow-2xl shadow-cyan-950/40 space-y-4 text-center backdrop-blur-2xl relative"
                  >
                    {/* Header */}
                    <div className="relative z-10 pt-1 pb-1">
                      <h3 className="text-2xl sm:text-[26px] font-black text-white tracking-tight">
                        Core Council Sign In
                      </h3>
                    </div>

                    {/* Google Sign In */}
                    <div className="relative z-10">
                      <button
                        type="button"
                        onClick={handleGoogleAuth}
                        disabled={loadingGoogle || loading}
                        className="w-full py-3 px-4 rounded-xl bg-[#0b101d] hover:bg-[#101728] border border-slate-800 hover:border-slate-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer active:scale-[0.99]"
                      >
                        {loadingGoogle ? (
                          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                        ) : (
                          <>
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                            <span>Continue with Google (Core Auth)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 relative z-10 py-1">
                      <div className="h-px flex-1 bg-slate-800/80" />
                      <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-slate-500">
                        OR SIGN IN WITH EMAIL
                      </span>
                      <div className="h-px flex-1 bg-slate-800/80" />
                    </div>

                    {/* Error Alert Banner */}
                    {errorMsg && (
                      <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-500/70 text-rose-200 text-xs font-semibold flex items-center gap-2.5 shadow-[0_0_20px_rgba(244,63,94,0.35)] text-left">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                        <span className="flex-1">{errorMsg}</span>
                      </div>
                    )}

                    {/* Form Fields */}
                    <form onSubmit={handleSignin} className="space-y-3.5 text-left relative z-10">
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value.toLowerCase());
                            if (errorMsg) setErrorMsg('');
                          }}
                          placeholder="ADMIN / CORE EMAIL"
                          className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-800 bg-[#070b15]/90 text-white placeholder:text-slate-500 text-xs sm:text-[13px] tracking-wide font-medium focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all lowercase placeholder:uppercase"
                        />
                      </div>

                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="SECURITY PASSWORD"
                          className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-800 bg-[#070b15]/90 text-white placeholder-slate-400 text-xs sm:text-[13px] tracking-wide font-medium focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#2563eb] via-[#8b5cf6] to-[#ec4899] hover:from-[#1d4ed8] hover:via-[#7c3aed] hover:to-[#db2777] text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99] mt-2"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <>
                            <span>Sign In to Core Council Portal</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      {/* Footer Switcher */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                        <span className="text-xs text-slate-400">
                          New Core Member?{' '}
                          <button
                            type="button"
                            onClick={() => setScreenState('signup')}
                            className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline cursor-pointer inline-flex items-center gap-0.5 ml-1"
                          >
                            <span>SignUp</span>
                            <span>→</span>
                          </button>
                        </span>
                        <button
                          type="button"
                          onClick={() => setScreenState('terminal')}
                          className="text-[11px] font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 cursor-pointer bg-slate-900/80 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-800 transition-colors"
                        >
                          <Terminal className="w-3 h-3 text-cyan-400" />
                          <span>Exit to Terminal</span>
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* STATE 3: ADMIN PORTAL */}
                {screenState === 'admin' && (
                  <motion.div
                    key="admin"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25 }}
                    className="w-full max-w-lg my-auto bg-slate-900/95 rounded-2xl shadow-2xl border border-purple-500/40 p-6 sm:p-8 space-y-4 backdrop-blur-xl relative"
                  >
                    <div className="text-center space-y-1.5 pb-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-mono tracking-widest uppercase">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                        <span>Core Council Admin Clearance</span>
                      </div>
                      <h3 className="text-2xl font-black text-white tracking-tight">Executive Admin Portal</h3>
                      <p className="text-xs text-slate-400">
                        Authenticate with your council credentials to manage club operations.
                      </p>
                    </div>

                    {/* Quick Demo Admin Login */}
                    <button
                      type="button"
                      onClick={() => handleAdminLogin()}
                      disabled={loading}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4 text-yellow-300" />
                      <span>One-Click Instant Admin Access (Demo Lead)</span>
                    </button>

                    <form onSubmit={handleAdminLogin} className="space-y-3 pt-1">
                      <div>
                        <input
                          type="email"
                          required
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="admin@sic.edu"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-700 bg-slate-800/90 text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder:text-slate-500 shadow-inner"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                          value={adminDomain}
                          onChange={(e) => setAdminDomain(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none shadow-inner"
                        >
                          <option>Tech / Coding</option>
                          <option>Video Editing</option>
                          <option>Event Management</option>
                          <option>Post Design & Graphics</option>
                          <option>Faculty Advisor / Lead</option>
                        </select>

                        <div className="relative">
                          <input
                            type={showAdminPasscode ? 'text' : 'password'}
                            required
                            value={adminPasscode}
                            onChange={(e) => setAdminPasscode(e.target.value)}
                            placeholder="SIC-CORE-2025"
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-700 bg-slate-800/90 text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder:text-slate-500 shadow-inner pr-8"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPasscode(!showAdminPasscode)}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                          >
                            {showAdminPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In to Admin Portal</span>}
                      </button>

                      <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                        <button
                          type="button"
                          onClick={() => setScreenState('signup')}
                          className="hover:text-cyan-400 underline cursor-pointer text-cyan-400/90 font-medium"
                        >
                          ← Core Registration
                        </button>
                        <button
                          type="button"
                          onClick={() => setScreenState('signin')}
                          className="hover:text-purple-300 underline cursor-pointer text-purple-400 font-medium"
                        >
                          Core Member Sign In →
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* STATE 4: DASHBOARD / ADMIN CONTROL CENTER */}
                {screenState === 'dashboard' && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25 }}
                    className="w-full flex-1 flex flex-col bg-slate-900/95 rounded-2xl border border-cyan-500/30 overflow-hidden"
                  >
                    <div className="bg-[#0b0f1a] border-b border-slate-800 px-5 py-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                          SIC
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Core Council Control Desk</h4>
                          <p className="text-[10px] text-cyan-400 font-mono">Science & Innovation Club Control Center</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setScreenState('signup')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        New Enrollment
                      </button>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-[#0e1322] p-3.5 rounded-xl border border-slate-800 space-y-1">
                          <div className="text-[11px] text-slate-400 font-medium">Core Member Roster</div>
                          <div className="text-2xl font-black text-white">142 Active</div>
                          <div className="text-[10px] text-emerald-400 font-bold">+18 verified this week</div>
                        </div>
                        <div className="bg-[#0e1322] p-3.5 rounded-xl border border-slate-800 space-y-1">
                          <div className="text-[11px] text-slate-400 font-medium">Council Clearance</div>
                          <div className="text-2xl font-black text-white">Level 1</div>
                          <div className="text-[10px] text-purple-400 font-bold">Executive Authority</div>
                        </div>
                        <div className="bg-[#0e1322] p-3.5 rounded-xl border border-slate-800 space-y-1">
                          <div className="text-[11px] text-slate-400 font-medium">Database Synced</div>
                          <div className="text-2xl font-black text-cyan-400">Online</div>
                          <div className="text-[10px] text-cyan-400 font-bold">Real-time persistence</div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 border border-purple-500/30 rounded-2xl p-5 text-white flex items-center justify-between shadow-xl">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono tracking-widest px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 uppercase font-bold">
                            Active Council Clearance
                          </span>
                          <h4 className="text-base font-bold">Open Full Screen Operations Desk</h4>
                          <p className="text-xs text-purple-200">Manage all domain applicants, projects, and permissions.</p>
                        </div>
                        <button
                          onClick={() => {
                            const user: UserProfile = {
                              id: 'admin-' + Date.now(),
                              first_name: firstName || 'Pawan',
                              last_name: lastName || 'Admin',
                              email: email || adminEmail || 'pawanyadav3714@gmail.com',
                              branch,
                              registration_no: registrationNo || 'SIC-ADMIN-01',
                              session: sessionBatch,
                              domain,
                              designation,
                              role: 'core_member',
                              created_at: new Date().toISOString()
                            };
                            onLoginSuccess(user);
                            onNavigate('core-dashboard');
                          }}
                          className="px-4 py-2 rounded-xl bg-white text-slate-950 font-bold text-xs shadow-lg hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-2 shrink-0"
                        >
                          <span>Launch Full Desk</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* MacBook Hinge */}
        <div className="w-full h-3 sm:h-4 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 shadow-lg" />

        {/* MacBook Keyboard & Mouse Trackpad Base */}
        <div className="w-full relative mt-0 z-20 flex flex-col items-center overflow-hidden">
          <div 
            className="w-full max-w-4xl px-1 sm:px-2 origin-top transition-transform duration-500 overflow-hidden py-0.5 flex justify-center h-[140px] sm:h-auto"
            style={{
              transform: isMobile ? 'none' : 'perspective(1200px) rotateX(15deg)',
              transformOrigin: 'top center',
            }}
          >
            <div className={isMobile ? 'min-w-[480px] transform scale-[0.48] origin-top my-0' : 'w-full'}>
              <Keyboard enableSound={true} onKeyPress={handleOnScreenKeyPress} />
            </div>
          </div>



          {/* Ambient Desk Reflection Glow */}
          <div className="w-3/4 mx-auto h-4 bg-gradient-to-r from-cyan-500/20 via-purple-500/25 to-pink-500/20 blur-[18px] rounded-full pointer-events-none -mt-2" />
        </div>
      </motion.div>
    </div>
  );
}
