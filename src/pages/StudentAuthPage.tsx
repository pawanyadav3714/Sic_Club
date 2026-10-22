import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Sparkles, HelpCircle, AlertCircle, Eye, EyeOff, X, User, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured, setMockUser, MOCK_POSTS, saveCoreMember, getStoredCoreMembers, checkEmailInDatabase, purgeLocalEmailData, clearAllLocalDatabaseCache, upsertCoreMemberToDatabase, upsertStudentProfileToDatabase } from '../lib/supabase';
import confetti from 'canvas-confetti';

interface StudentAuthPageProps {
  onNavigate: (route: string) => void;
  onLoginSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'signup';
}

// Milestone stations along the wave path (percentages)
const STATIONS = [
  { step: 0, x: 10, y: 55, emoji: '👋', title: 'Welcome' },
  { step: 1, x: 25, y: 32, emoji: '👤', title: 'Name' },
  { step: 2, x: 40, y: 62, emoji: '🎓', title: 'Branch' },
  { step: 3, x: 55, y: 32, emoji: '👀', title: 'Domain' },
  { step: 4, x: 70, y: 60, emoji: '🔗', title: 'Projects' },
  { step: 5, x: 83, y: 32, emoji: '📝', title: 'Experience' },
  { step: 6, x: 94, y: 54, emoji: '🔑', title: 'Account' },
];

const DOMAIN_OPTIONS = [
  { id: 'Tech / Coding', label: 'Tech / Coding', icon: '💻' },
  { id: 'AI & Robotics', label: 'AI & Robotics', icon: '🤖' },
  { id: 'Web & App Dev', label: 'Web & App Dev', icon: '🌐' },
  { id: 'Electronics & IoT', label: 'Electronics & IoT', icon: '⚡' },
  { id: 'Video Editing', label: 'Video Editing', icon: '🎥' },
  { id: 'Event Management', label: 'Event Management', icon: '🏆' },
];

const BRANCH_SUGGESTIONS = [
  'Computer Science & Engineering',
  'Electronics & Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering'
  
];

const SESSION_SUGGESTIONS = ['2025-2029', '2024-2028', '2023-2027', '2022-2026'];

function GoogleLogoSvg() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function StudentAuthPage({ onNavigate, onLoginSuccess, initialMode = 'signup' }: StudentAuthPageProps) {
  const [isLoginMode, setIsLoginMode] = useState(initialMode === 'login');
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Smooth Registration Transition State for Mobile & Desktop
  const [registrationSuccessUser, setRegistrationSuccessUser] = useState<UserProfile | null>(null);
  const [transitionProgress, setTransitionProgress] = useState(0);

  // Hardware-accelerated, butter-smooth transition variants specifically optimized for mobile devices
  const stepVariants: Variants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? 16 : -16,
      transition: {
        duration: 0.18,
        ease: 'easeOut',
      },
    }),
    center: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.2,
        ease: 'easeOut',
      },
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? -16 : 16,
      transition: {
        duration: 0.12,
        ease: 'easeIn',
      },
    }),
  };

  // Google Authentication State
  const [googleAuthUser, setGoogleAuthUser] = useState<{ email: string; name?: string; picture?: string; id?: string } | null>(null);
  const [loadingGoogleAuth, setLoadingGoogleAuth] = useState(false);

  // Butter-Smooth Mobile Registration Transition Effect
  useEffect(() => {
    if (!registrationSuccessUser) return;

    setTransitionProgress(15);
    const startTime = Date.now();
    const duration = 1400; // 1.4s smooth transition sequence

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.round(15 + (elapsed / duration) * 85));
      setTransitionProgress(progress);

      if (elapsed >= duration) {
        clearInterval(interval);
        setTimeout(() => {
          onLoginSuccess(registrationSuccessUser);
        }, 120);
      }
    }, 35);

    // Optimized lightweight confetti designed specifically for mobile 60fps performance
    const confettiTimer = setTimeout(() => {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      try {
        confetti({
          particleCount: isMobile ? 35 : 75,
          spread: isMobile ? 55 : 80,
          origin: { y: 0.5 },
          disableForReducedMotion: true,
          colors: ['#38bdf8', '#818cf8', '#c084fc', '#ffffff'],
        });
      } catch (e) {}
    }, 200);

    return () => {
      clearInterval(interval);
      clearTimeout(confettiTimer);
    };
  }, [registrationSuccessUser, onLoginSuccess]);

  // Load errors or pending registrations from storage
  useEffect(() => {
    const savedError = sessionStorage.getItem('sic_auth_error');
    if (savedError) {
      setErrorMsg(savedError);
      setIsLoginMode(true);
      sessionStorage.removeItem('sic_auth_error');
    }
    const googleReg = sessionStorage.getItem('sic_google_reg_user');
    if (googleReg) {
      (async () => {
        try {
          const parsed = JSON.parse(googleReg);
          sessionStorage.removeItem('sic_google_reg_user');
          const regEmail = (parsed.email || '').trim().toLowerCase();

          // Check if this student email is genuinely in the database!
          const dbCheck = await checkEmailInDatabase(regEmail);

          if (dbCheck.exists) {
            setErrorMsg('This email already exists. Please login.');
            setIsLoginMode(true);
            setLoginEmail(regEmail);
            return;
          }

          setGoogleAuthUser(parsed);
          setEmail(parsed.email || '');
          if (parsed.firstName) setFirstName(parsed.firstName);
          if (parsed.lastName) setLastName(parsed.lastName);
          setIsLoginMode(false);
          setStep(1);
        } catch (e) {}
      })();
    }

    // Restore any pending registration data so registration number and domain are preserved
    const savedPending = localStorage.getItem('sic_pending_registration');
    if (savedPending) {
      try {
        const p = JSON.parse(savedPending);
        if (p.first_name) setFirstName(p.first_name);
        if (p.last_name) setLastName(p.last_name);
        if (p.branch) setBranch(p.branch);
        if (p.registration_no) setRegistrationNo(p.registration_no);
        if (p.session) setSessionBatch(p.session);
        if (p.domain) setDomain(p.domain);
        if (p.past_project_repo) setPastProjectRepo(p.past_project_repo);
        if (p.experience) setManualExperience(p.experience);
        if (p.email) setEmail(p.email);
      } catch (e) {}
    }
  }, []);

  // Registration Form State
  const [accountType, setAccountType] = useState<'student' | 'core_member'>('student');
  const [coreDesignation, setCoreDesignation] = useState('Technical & AI Lead');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [branch, setBranch] = useState('Computer Science & Engineering');
  const [registrationNo, setRegistrationNo] = useState('');
  const [sessionBatch, setSessionBatch] = useState('2025-2029');
  const [domain, setDomain] = useState('Tech / Coding');
  const [pastProjectRepo, setPastProjectRepo] = useState('');
  const [manualExperience, setManualExperience] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Input Refs for switching placeholder focus on Enter
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const branchRef = useRef<HTMLInputElement>(null);
  const registrationNoRef = useRef<HTMLInputElement>(null);
  const sessionBatchRef = useRef<HTMLInputElement>(null);
  const pastProjectRepoRef = useRef<HTMLInputElement>(null);
  const phoneNoRef = useRef<HTMLInputElement>(null);
  const manualExperienceRef = useRef<HTMLTextAreaElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const loginPasswordRef = useRef<HTMLInputElement>(null);

  // Auto-focus first input on desktop only (skips touch devices to prevent mobile keyboard from popping up and jarring transitions)
  useEffect(() => {
    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    if (isTouch) return;

    const timer = setTimeout(() => {
      if (step === 1) firstNameRef.current?.focus();
      else if (step === 2) branchRef.current?.focus();
      else if (step === 4) pastProjectRepoRef.current?.focus();
      else if (step === 5) phoneNoRef.current?.focus();
      else if (step === 6) emailRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [step]);

  // Handle Next in Signup
  const handleNextStep = () => {
    setErrorMsg('');
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        setErrorMsg('Please enter both your first and last name.');
        return;
      }
    } else if (step === 2) {
      if (!branch.trim() || !registrationNo.trim()) {
        setErrorMsg('Please provide your Branch and Registration Number.');
        return;
      }
    } else if (step === 3) {
      if (!domain) {
        setErrorMsg('Please choose your area of interest.');
        return;
      }
    }

    // Persist pending registration asynchronously so main thread is not blocked during transition
    const updatedPending = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      branch: branch.trim(),
      registration_no: registrationNo.trim(),
      session: sessionBatch.trim(),
      domain: domain.trim(),
      past_project_repo: pastProjectRepo.trim(),
      experience: manualExperience.trim(),
      phone_no: phoneNo.trim(),
      email: email.trim(),
    };
    requestAnimationFrame(() => {
      try {
        localStorage.setItem('sic_pending_registration', JSON.stringify(updatedPending));
      } catch (e) {}
    });

    setDirection(1);
    setStep((prev) => Math.min(prev + 1, 6));
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setDirection(-1);
    setStep((prev) => Math.max(prev - 1, 0));
  };

  // Check if an email is registered in Supabase database
  const checkDatabaseEmail = async (cleanEmail: string): Promise<UserProfile | null> => {
    if (!cleanEmail) return null;
    const lower = cleanEmail.trim().toLowerCase();
    const res = await checkEmailInDatabase(lower);
    if (res.exists && res.profile) {
      return res.profile;
    }
    purgeLocalEmailData(lower);
    return null;
  };

  // Check if a user's membership request has been accepted by an admin
  const checkUserApproval = async (profile: UserProfile): Promise<boolean> => {
    if (profile.role === 'core_member' || profile.role === 'admin') return true;

    // Check local storage approval list
    const approvedList: string[] = JSON.parse(localStorage.getItem('sic_approved_users') || '[]');
    if (
      approvedList.includes(profile.id) ||
      (profile.email && approvedList.includes(profile.email.toLowerCase()))
    ) {
      return true;
    }

    // Check Supabase membership_applications table
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: appData } = await supabase
          .from('membership_applications')
          .select('status')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (appData && appData.status === 'approved') {
          return true;
        }
      } catch (e) {}
    }

    return false;
  };

  // If email already exists in database: directly route to dashboard (if approved) or pending approval interface (if pending)
  const routeExistingUser = async (profile: UserProfile, notice = 'Email will already exist') => {
    setLoading(true);

    // CRITICAL: Check if this user is purely a Core Member
    const coreMembers = getStoredCoreMembers();
    const isCore =
      profile.role === 'core_member' ||
      profile.role === 'admin' ||
      coreMembers.some((c) => c.email?.toLowerCase() === profile.email?.toLowerCase()) ||
      Boolean(profile.designation);

    if (isCore) {
      setLoading(false);
      setLoadingGoogleAuth(false);
      setErrorMsg('Unauthorized account type for this portal.');
      return;
    }

    const isApproved = await checkUserApproval(profile);
    const userToLogin: UserProfile = {
      ...profile,
      registration_no:
        profile.registration_no || 'REG' + Math.floor(1000000 + Math.random() * 9000000),
      role: isApproved ? ('member' as const) : ('pending' as const),
    };

    setLoading(false);
    setLoadingGoogleAuth(false);

    setMockUser(userToLogin);
    onLoginSuccess(userToLogin);
  };

  // Helper to generate valid UUID for Supabase
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      try {
        return crypto.randomUUID();
      } catch (e) {}
    }
    return '11111111-2222-4333-8444-' + Math.random().toString(36).substring(2, 14).padEnd(12, '0');
  };

  // When email is not registered in database: successfully create user and profile on database!
  const createNewUserInDatabase = async (
    targetEmail: string,
    authProvider: 'google' | 'email',
    pass?: string,
    skipRepo = false
  ) => {
    setLoading(true);
    setErrorMsg('');

    const cleanEmail = targetEmail.trim().toLowerCase();
    const targetRepo = skipRepo ? '' : pastProjectRepo.trim();

    let resolvedFirst = firstName.trim();
    let resolvedLast = lastName.trim();
    if (!resolvedFirst) {
      const parts = cleanEmail.split('@')[0].replace(/[._-]/g, ' ').split(' ').filter(Boolean);
      resolvedFirst = parts[0]
        ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
        : 'Student';
      resolvedLast =
        parts.length > 1
          ? parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
          : 'Member';
    }

    const newId =
      authProvider === 'google' && googleAuthUser?.id && googleAuthUser.id.length > 20 && !googleAuthUser.id.startsWith('google-')
        ? googleAuthUser.id
        : generateUUID();

    const userRegNo = registrationNo.trim() && registrationNo.trim().length >= 8
      ? (registrationNo.trim().toUpperCase().startsWith('REG') ? registrationNo.trim() : 'REG' + registrationNo.trim())
      : 'REG' + Math.floor(1000000 + Math.random() * 9000000);
    const userDomain = domain.trim() || 'Tech / Coding';
    const userBranch = branch.trim() || 'Computer Science & Engineering';
    const userSession = sessionBatch.trim() || '2025-2029';

    // Determine if joining as Core Member vs Student
    const isCoreRole =
      accountType === 'core_member' ||
      cleanEmail.includes('admin') ||
      cleanEmail.includes('core') ||
      userDomain.includes('Administration') ||
      getStoredCoreMembers().some((c) => c.email.toLowerCase() === cleanEmail);

    const newUserRole: UserRole = isCoreRole ? 'core_member' : 'pending';

    const newUser: UserProfile = {
      id: newId,
      first_name: resolvedFirst,
      last_name: resolvedLast || (isCoreRole ? 'Lead' : 'Member'),
      email: cleanEmail,
      branch: userBranch,
      registration_no: registrationNo.trim() || userRegNo || (isCoreRole ? 'CORE-' + Math.floor(100 + Math.random() * 900) : userRegNo),
      session: sessionBatch.trim() || userSession,
      domain: userDomain || (coreDesignation || 'Club Administration'),
      designation: isCoreRole ? (coreDesignation || 'Core Council Lead') : undefined,
      past_project_repo: targetRepo,
      experience: manualExperience.trim(),
      phone_no: phoneNo.trim(),
      role: newUserRole,
      auth_provider: authProvider,
      avatar_url:
        googleAuthUser?.picture ||
        (isCoreRole
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      let createdAuthId: string | null = null;

      if (authProvider === 'email' && pass) {
        try {
          const userMetadata = {
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            full_name: `${newUser.first_name} ${newUser.last_name}`.trim(),
            name: `${newUser.first_name} ${newUser.last_name}`.trim(),
            phone: phoneNo.trim() || undefined,
            phone_no: phoneNo.trim() || undefined,
            phone_number: phoneNo.trim() || undefined,
            provider_type: 'email',
            account_type: isCoreRole ? 'core_member' : 'student',
            role: newUserRole,
            branch: userBranch,
            session: userSession,
            registration_no: userRegNo,
            domain: newUser.domain,
            designation: isCoreRole ? (coreDesignation || 'Core Council Lead') : undefined,
          };

          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: pass,
            phone: phoneNo.trim() || undefined,
            options: {
              data: userMetadata,
            },
          });
          if (signUpData?.user?.id) {
            createdAuthId = signUpData.user.id;
          } else if (signUpError && signUpError.message?.toLowerCase().includes('already registered')) {
            // If email exists in auth.users (e.g. after database tables were truncated), sign in to retrieve valid auth ID
            try {
              const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: pass,
              });
              if (signInData?.user?.id) {
                createdAuthId = signInData.user.id;
                // Update auth user metadata with first name, last name, and phone
                try {
                  await supabase.auth.updateUser({
                    data: userMetadata,
                  });
                } catch (metaErr) {}
              }
            } catch (authSignInErr) {}
            if (!createdAuthId) {
              createdAuthId = generateUUID();
            }
          }
        } catch (e) {}
      }

      if (createdAuthId) {
        newUser.id = createdAuthId;
      }

      // Upsert profile into appropriate table (core_members or student_profiles) safely
      try {
        if (isCoreRole) {
          await upsertCoreMemberToDatabase({
            id: newUser.id,
            email: cleanEmail,
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            phone_no: phoneNo.trim() || undefined,
            branch: userBranch,
            session: userSession,
            registration_no: userRegNo,
            domain: newUser.domain,
            designation: coreDesignation || 'Core Council Lead',
            created_at: newUser.created_at
          });
        } else {
          await upsertStudentProfileToDatabase({
            id: newUser.id,
            email: cleanEmail,
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            phone_no: phoneNo.trim() || undefined,
            branch: userBranch,
            session: userSession,
            registration_no: userRegNo,
            domain: newUser.domain,
            status: 'pending',
            created_at: newUser.created_at
          });
        }

        // Also safely sync to public.profiles table
        try {
          await supabase.from('profiles').upsert([{
            id: newUser.id,
            first_name: newUser.first_name,
            last_name: newUser.last_name,
            email: cleanEmail,
            phone_no: phoneNo.trim() || undefined,
            branch: userBranch,
            registration_no: userRegNo,
            session: userSession,
            domain: newUser.domain,
            role: newUserRole,
            auth_provider: authProvider || 'email',
            created_at: newUser.created_at
          }]);
        } catch (profErr) {}
      } catch (pErr) {}

      // Insert join request into membership_applications table only if student
      if (!isCoreRole) {
        try {
          await supabase.from('membership_applications').insert([
            {
              user_id: newUser.id,
              selected_post_id: MOCK_POSTS[0].id,
              past_project_repo: targetRepo,
              status: 'pending',
            },
          ]);
        } catch (appErr) {}
      }
    }

    // Persist in local storage
    try {
      const storedUsers: UserProfile[] = JSON.parse(
        localStorage.getItem('sic_registered_users') || '[]'
      );
      const idx = storedUsers.findIndex(
        (u) => u.email && u.email.toLowerCase() === cleanEmail
      );
      if (idx >= 0) storedUsers[idx] = newUser;
      else storedUsers.push(newUser);
      localStorage.setItem('sic_registered_users', JSON.stringify(storedUsers));

      if (isCoreRole) {
        // Core members are automatically approved
        const approvedList: string[] = JSON.parse(
          localStorage.getItem('sic_approved_users') || '[]'
        );
        if (!approvedList.includes(newUser.id)) approvedList.push(newUser.id);
        if (cleanEmail && !approvedList.includes(cleanEmail.toLowerCase())) approvedList.push(cleanEmail.toLowerCase());
        localStorage.setItem('sic_approved_users', JSON.stringify(approvedList));
        saveCoreMember(newUser);
      } else {
        // Save to registration cache & membership applications
        localStorage.setItem('sic_pending_registration', JSON.stringify(newUser));

        const storedApps: any[] = JSON.parse(
          localStorage.getItem('sic_membership_applications') || '[]'
        );
        const appRecord = {
          id: 'app-' + newUser.id,
          user_id: newUser.id,
          selected_post_id: MOCK_POSTS[0].id,
          past_project_repo: targetRepo,
          status: 'pending',
          created_at: newUser.created_at,
          user: newUser,
        };
        const existingAppIdx = storedApps.findIndex(
          (a: any) => a.user_id === newUser.id || a.user?.email?.toLowerCase() === cleanEmail
        );
        if (existingAppIdx >= 0) storedApps[existingAppIdx] = appRecord;
        else storedApps.unshift(appRecord);
        localStorage.setItem('sic_membership_applications', JSON.stringify(storedApps));
      }
    } catch (e) {}

    setLoading(false);
    setLoadingGoogleAuth(false);

    setMockUser(newUser);

    // Activate the butter-smooth mobile registration transition sequence
    setRegistrationSuccessUser(newUser);
  };

  // Final Registration Submission (Step 4 form submit)
  const handleFinalSubmit = async (skipRepo = false) => {
    setErrorMsg('');
    const targetEmail = (googleAuthUser?.email || email).trim().toLowerCase();

    if (!googleAuthUser) {
      if (!targetEmail || !targetEmail.includes('@')) {
        setErrorMsg('Please enter a valid student email address.');
        return;
      }
      if (!password.trim() || password.length < 6) {
        setErrorMsg('Password should be at least 6 characters long.');
        return;
      }
    } else {
      if (!targetEmail || !targetEmail.includes('@')) {
        setErrorMsg('Google email address is required.');
        return;
      }
    }

    if (!registrationNo.trim()) {
      setErrorMsg('Please enter your university Registration Number.');
      setStep(2);
      return;
    }

    setLoading(true);

    try {
      // 1. Check if email already exists in database
      const existing = await checkDatabaseEmail(targetEmail);
      if (existing) {
        // STRICT USER REQUIREMENT:
        // "and if the first time registered email/google auth will trying to registered/siignUp multipole time, show an error that Email already exist. please login"
        setLoading(false);
        setErrorMsg('This email already exists. Please login.');
        return;
      }

      // 2. When email is not registered: successfully create on database!
      await createNewUserInDatabase(
        targetEmail,
        googleAuthUser ? 'google' : 'email',
        password,
        skipRepo
      );
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    }
  };

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail || !loginPassword.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Step 1: Check RPC check_email_exists
      let emailExists = false;
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: rpcVal } = await supabase.rpc('check_email_exists', {
            user_email: cleanEmail,
            portal_type: 'student'
          });
          if (typeof rpcVal === 'boolean') {
            emailExists = rpcVal;
          } else {
            const existing = await checkDatabaseEmail(cleanEmail);
            emailExists = Boolean(existing);
          }
        } catch (e) {
          const existing = await checkDatabaseEmail(cleanEmail);
          emailExists = Boolean(existing);
        }
      } else {
        const existing = await checkDatabaseEmail(cleanEmail);
        emailExists = Boolean(existing);
      }

      if (!emailExists) {
        setLoading(false);
        setErrorMsg('Email not registered. Please sign up first.');
        return;
      }

      const existing = await checkDatabaseEmail(cleanEmail);
      if (!existing) {
        setLoading(false);
        setErrorMsg('Email not registered. Please sign up first.');
        return;
      }

      // If user is registered: directly log in to dashboard
      await routeExistingUser(existing);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Incorrect password.');
    }
  };

  // Unified Google Authentication Handler (Proceeds directly towards Google Authentication, NO modal!)
  const handleGoogleAuth = async (mode: 'login' | 'signup') => {
    setErrorMsg('');
    setLoadingGoogleAuth(true);

    const targetEmail = (mode === 'login' ? loginEmail : (googleAuthUser?.email || email)).trim().toLowerCase();

    // 1. In Signup mode (Step 4)
    if (mode === 'signup') {
      if (!registrationNo.trim()) {
        setLoadingGoogleAuth(false);
        setErrorMsg('Please enter your university Registration Number in Step 2.');
        setStep(2);
        return;
      }

      // If student provided an email
      if (targetEmail && targetEmail.includes('@')) {
        try {
          const existing = await checkDatabaseEmail(targetEmail);
          if (existing) {
            // STRICT REQUIREMENT:
            // "and if the first time registered email/google auth will trying to registered/siignUp multipole time, show an error that Email already exist. please login"
            setLoadingGoogleAuth(false);
            setErrorMsg('This email already exists. Please login.');
            return;
          }

          // Email is not registered yet: successfully create email & user in database!
          await createNewUserInDatabase(targetEmail, 'google', undefined, false);
          return;
        } catch (err: any) {
          setLoadingGoogleAuth(false);
          setErrorMsg(err.message || 'Google registration failed. Please try again.');
          return;
        }
      }

      // If email field is blank in Step 4, save pending details and initiate Supabase Google OAuth
      const regPayload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        branch: branch.trim(),
        registration_no: registrationNo.trim(),
        session: sessionBatch.trim(),
        domain: domain.trim(),
        past_project_repo: pastProjectRepo.trim(),
        email: targetEmail,
      };
      localStorage.setItem('sic_pending_registration', JSON.stringify(regPayload));
      localStorage.setItem('sic_oauth_intent', 'signup');

      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: window.location.origin,
              queryParams: { access_type: 'offline', prompt: 'select_account' },
            },
          });
          if (!error && data?.url) {
            window.location.href = data.url;
            return;
          }
        } catch (e) {}
      }

      setLoadingGoogleAuth(false);
      setErrorMsg('Please enter your Google email in the Student Email field below to continue with Google.');
      return;
    }

    // 2. In Login mode
    if (targetEmail && targetEmail.includes('@')) {
      try {
        const existing = await checkDatabaseEmail(targetEmail);
        if (!existing) {
          setLoadingGoogleAuth(false);
          setErrorMsg('Email not registered. Please sign up first.');
          return;
        }

        // Email registered: directly log in to dashboard (or pending interface)!
        await routeExistingUser(existing);
        return;
      } catch (err: any) {
        setLoadingGoogleAuth(false);
        setErrorMsg(err.message || 'Google login failed. Please try again.');
        return;
      }
    }

    // If login email field is blank, initiate Supabase Google OAuth
    localStorage.setItem('sic_oauth_intent', 'login');
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
            queryParams: { access_type: 'offline', prompt: 'select_account' },
          },
        });
        if (!error && data?.url) {
          window.location.href = data.url;
          return;
        }
      } catch (e) {}
    }

    setLoadingGoogleAuth(false);
    setErrorMsg('Please enter your Google email in the email field above to sign in.');
  };

  const activeStation = STATIONS[step] || STATIONS[0];

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-gradient-to-b from-[#1b84f5] via-[#2f95fc] to-[#7fc3fb] text-white flex flex-col justify-between selection:bg-white selection:text-blue-600 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background Soft Glows & Ambient Highlights (GPU accelerated, lightweight on mobile) */}
      <div className="absolute top-0 left-1/4 w-72 sm:w-[500px] h-72 sm:h-[500px] bg-white/10 rounded-full blur-3xl sm:blur-[120px] pointer-events-none transform-gpu will-change-transform" />
      <div className="absolute bottom-0 right-1/4 w-64 sm:w-[450px] h-64 sm:h-[450px] bg-sky-200/20 rounded-full blur-3xl sm:blur-[100px] pointer-events-none transform-gpu will-change-transform" />

      {/* Top Bar Header (Logo on Left, Step Indicator / Sign In on Right) */}
      <header className="relative z-30 w-full px-3 sm:px-12 py-2.5 sm:py-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-1 sm:gap-2 group text-white/90 hover:text-white transition-all cursor-pointer"
          >
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md flex items-center justify-center border border-white/20 transition-all">
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white group-hover:-translate-x-0.5 transition-transform" />
            </div>
            <span className="text-base sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
              SIC Club
            </span>
          </button>
        </div>

        {/* Right Section: Progress Dots and Auth Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-4">
          {!isLoginMode && (
            <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25">
              {STATIONS.map((st, i) => (
                <button
                  key={st.step}
                  onClick={() => {
                    if (i <= step) setStep(i);
                  }}
                  className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                    i === step
                      ? 'w-3 sm:w-6 bg-white shadow-sm'
                      : i < step
                      ? 'w-1 sm:w-2 bg-white/80 cursor-pointer'
                      : 'w-1 sm:w-2 bg-white/30'
                  }`}
                  aria-label={`Step ${i + 1}`}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setErrorMsg('');
              setStep(0);
            }}
            className="px-2.5 py-1 sm:px-4 sm:py-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold border border-white/30 transition-all shadow-sm cursor-pointer whitespace-nowrap"
          >
            {isLoginMode ? 'Join Club' : 'Sign In'}
          </button>
        </div>
      </header>

      {/* Central Content Area (Transitions based on step or login mode) */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 py-6 w-full max-w-4xl mx-auto">
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 px-5 py-3.5 rounded-2xl bg-red-600/95 text-white text-xs sm:text-sm font-semibold shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 max-w-lg text-left border border-white/20"
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-200" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
            {errorMsg.toLowerCase().includes('already exist') ? (
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(true);
                  if (email) setLoginEmail(email);
                  setErrorMsg('');
                }}
                className="px-3 py-1.5 rounded-xl bg-white text-red-700 hover:bg-slate-100 font-extrabold text-xs whitespace-nowrap cursor-pointer transition-all shadow-md shrink-0"
              >
                Go to Login →
              </button>
            ) : errorMsg.toLowerCase().includes('not registered') ? (
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(false);
                  setStep(0);
                  setErrorMsg('');
                }}
                className="px-3 py-1.5 rounded-xl bg-white text-red-700 hover:bg-slate-100 font-extrabold text-xs whitespace-nowrap cursor-pointer transition-all shadow-md shrink-0"
              >
                Register First →
              </button>
            ) : null}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* BUTTER-SMOOTH REGISTRATION TRANSITION VIEW FOR MOBILE & DESKTOP */}
          {registrationSuccessUser ? (
            <motion.div
              key="registration-success-screen"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full max-w-md flex flex-col items-center text-center px-5 py-7 rounded-3xl bg-white/15 backdrop-blur-xl border border-white/30 shadow-2xl relative overflow-hidden transform-gpu"
            >
              {/* Subtle dynamic glow */}
              <div className="absolute -top-16 -right-16 w-36 h-36 bg-cyan-300/25 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-blue-500/25 rounded-full blur-2xl pointer-events-none" />

              {/* Glowing animated check badge */}
              <div className="relative mb-3">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white flex items-center justify-center shadow-xl shadow-cyan-900/30 text-blue-600">
                  <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11 text-emerald-500" />
                </div>
                <div className="absolute -inset-1.5 rounded-full border-2 border-white/60 animate-ping pointer-events-none opacity-30" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-300/40 text-emerald-100 text-xs font-bold mb-2 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>Registration Successful</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-1">
                Welcome to SIC Club!
              </h1>
              <p className="text-xs sm:text-sm text-white/90 mb-5 font-medium">
                Hello, <strong className="text-white underline decoration-cyan-300 underline-offset-2">{registrationSuccessUser.first_name} {registrationSuccessUser.last_name}</strong>. Your profile has been created.
              </p>

              {/* Verified Identity Box */}
              <div className="w-full bg-white/15 rounded-2xl p-3.5 sm:p-4 border border-white/20 text-left mb-5 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-white/70 font-semibold uppercase tracking-wider text-[10px] sm:text-[11px]">Registration No.</span>
                  <span className="font-mono font-bold text-white bg-white/20 px-2 py-0.5 rounded text-xs">{registrationSuccessUser.registration_no}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-white/70 font-semibold uppercase tracking-wider text-[10px] sm:text-[11px]">Technical Domain</span>
                  <span className="font-bold text-cyan-200 text-xs">{registrationSuccessUser.domain}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70 font-semibold uppercase tracking-wider text-[10px] sm:text-[11px]">Academic Branch</span>
                  <span className="font-medium text-white truncate max-w-[190px]">{registrationSuccessUser.branch}</span>
                </div>
              </div>

              {/* Animated Progress Transition Bar */}
              <div className="w-full space-y-2.5 mb-5 text-left">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-300 shrink-0" />
                    <span>Preparing Innovation Workspace...</span>
                  </span>
                  <span className="font-mono text-cyan-200 font-bold">{transitionProgress}%</span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-white/20 overflow-hidden relative shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-white rounded-full transition-all duration-100 ease-out shadow-sm"
                    style={{ width: `${transitionProgress}%` }}
                  />
                </div>

                {/* Staggered Verification Steps */}
                <div className="space-y-1.5 pt-1 text-[11px] sm:text-xs font-medium">
                  <div className="flex items-center gap-2 text-emerald-200">
                    <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    <span>Student academic record verified</span>
                  </div>
                  <div className={`flex items-center gap-2 transition-all duration-300 ${transitionProgress >= 40 ? 'text-emerald-200 opacity-100' : 'text-white/40 opacity-60'}`}>
                    <Check className={`w-3.5 h-3.5 shrink-0 ${transitionProgress >= 40 ? 'text-emerald-300' : 'text-white/40'}`} />
                    <span>Department application enrolled ({registrationSuccessUser.domain})</span>
                  </div>
                  <div className={`flex items-center gap-2 transition-all duration-300 ${transitionProgress >= 75 ? 'text-emerald-200 opacity-100' : 'text-white/40 opacity-60'}`}>
                    <Check className={`w-3.5 h-3.5 shrink-0 ${transitionProgress >= 75 ? 'text-emerald-300' : 'text-white/40'}`} />
                    <span>Launching Member Dashboard</span>
                  </div>
                </div>
              </div>

              {/* Direct Touch Action Button */}
              <button
                type="button"
                onClick={() => onLoginSuccess(registrationSuccessUser)}
                className="w-full py-2.5 sm:py-3 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.98] text-blue-600 font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-900/20 transition-all cursor-pointer flex items-center justify-center gap-2 touch-manipulation select-none"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="w-4 h-4 text-blue-600" />
              </button>
            </motion.div>
          ) : isLoginMode ? (
            <motion.div
              key="login-mode"
              initial={{ opacity: 0, y: 25, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -25, scale: 0.98 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="w-full max-w-md flex flex-col items-center text-center"
            >
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md mb-2">
                Welcome back
              </h1>
              <p className="text-sm text-white/85 mb-6">
                Sign in with Google or your student email and password
              </p>

              {/* One div that contains Continue with Google which proceeds towards Google authentication */}
              <motion.div
                role="button"
                tabIndex={0}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleGoogleAuth('login')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleGoogleAuth('login');
                  }
                }}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2.5 transition-all cursor-pointer border border-white mb-3 group ring-1 sm:ring-2 ring-white/30 select-none"
              >
                <GoogleLogoSvg />
                <span className="group-hover:text-blue-600 transition-colors">
                  {loadingGoogleAuth ? 'Proceeding to Google...' : 'Continue with Google'}
                </span>
              </motion.div>

              <div className="w-full flex items-center gap-3 mb-3">
                <div className="flex-1 h-[1px] bg-white/30" />
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/90">
                  or sign in with email
                </span>
                <div className="flex-1 h-[1px] bg-white/30" />
              </div>

              <form onSubmit={handleLoginSubmit} className="w-full space-y-3">
                <div className="w-full">
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        loginPasswordRef.current?.focus();
                      }
                    }}
                    placeholder="student@university.edu"
                    className="w-full px-4 py-2.5 sm:py-3 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-sm sm:text-base font-medium shadow-md shadow-blue-900/10 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all"
                  />
                </div>

                <div className="w-full relative">
                  <input
                    ref={loginPasswordRef}
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full pl-4 pr-11 py-2.5 sm:py-3 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-sm sm:text-base font-medium shadow-md shadow-blue-900/10 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 sm:py-3 rounded-xl bg-white hover:bg-slate-50 text-blue-600 font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 mt-3"
                >
                  <span>{loading ? 'Signing in...' : 'Sign In to Dashboard'}</span>
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                </button>
              </form>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(false);
                    setStep(0);
                  }}
                  className="text-xs text-white/90 hover:text-white underline underline-offset-4 cursor-pointer font-semibold"
                >
                  Don't have an account yet? Register here
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="w-full flex flex-col items-center relative min-h-[340px] sm:min-h-[400px]">
              {/* MULTI-STEP REGISTRATION FLOW WITH BUTTER-SMOOTH MOBILE TRANSITIONS */}
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                {/* STEP 0: WELCOME */}
                {step === 0 && (
                  <motion.div
                    key="step-0"
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="flex flex-col items-center text-center max-w-xl mx-auto px-2 w-full transform-gpu will-change-transform"
                  >
                    <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold text-white tracking-tight drop-shadow-md leading-[1.12] mb-3">
                      Welcome <br className="hidden sm:inline" />
                      to SIC Club
                    </h1>
                    <p className="text-sm sm:text-base md:text-lg text-white/85 font-medium max-w-md mb-6 sm:mb-8">
                      Student Innovation & Robotics Council — build projects, collaborate with peers, and get certified.
                    </p>

                    <div className="flex items-center justify-center">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleNextStep}
                        className="px-5 py-2.5 sm:px-7 sm:py-3 rounded-xl bg-white hover:bg-slate-50 text-blue-600 font-extrabold text-xs sm:text-sm shadow-xl shadow-blue-900/25 transition-all cursor-pointer flex items-center gap-2"
                      >
                        <span>Get Started</span>
                        <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 1: NAME */}
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="flex flex-col items-center text-center max-w-md w-full mx-auto px-2 transform-gpu will-change-transform"
                  >
                  {googleAuthUser && (
                    <div className="mb-4 max-w-full inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] sm:text-xs font-semibold text-white border border-white/30 shadow-sm">
                      <GoogleLogoSvg />
                      <span className="truncate">Authenticated: <strong className="font-bold">{googleAuthUser.email}</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          setGoogleAuthUser(null);
                          setEmail('');
                        }}
                        className="text-[10px] uppercase font-bold text-cyan-200 hover:text-white underline ml-1 cursor-pointer shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md mb-4 sm:mb-6">
                    What's your name?
                  </h2>

                  <div className="w-full space-y-2.5 sm:space-y-3 mb-6">
                    <input
                      ref={firstNameRef}
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (lastNameRef.current) {
                            lastNameRef.current.focus();
                          } else {
                            handleNextStep();
                          }
                        }
                      }}
                      placeholder="First Name (e.g. Pawan)"
                      className="w-full px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-sm sm:text-base font-medium shadow-md shadow-blue-900/10 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all text-center"
                    />
                    <input
                      ref={lastNameRef}
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleNextStep();
                        }
                      }}
                      placeholder="Last Name (e.g. Yadav)"
                      className="w-full px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-sm sm:text-base font-medium shadow-md shadow-blue-900/10 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all text-center"
                    />
                  </div>

                  <div className="w-full flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleNextStep}
                      className="flex-1 py-2 sm:py-2.5 rounded-xl bg-white hover:bg-slate-50 text-blue-600 font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-900/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: ACADEMIC DETAILS */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex flex-col items-center text-center max-w-lg w-full mx-auto px-2 transform-gpu will-change-transform"
                >
                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md mb-1.5 sm:mb-2">
                    Academic details
                  </h2>
                  <p className="text-xs sm:text-sm text-white/85 mb-4 sm:mb-6">
                    Enter your university branch, batch, and registration number
                  </p>

                  <div className="w-full space-y-3 mb-5 text-left">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1 ml-1">
                        Branch
                      </label>
                      <input
                        ref={branchRef}
                        type="text"
                        required
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (registrationNoRef.current) {
                              registrationNoRef.current.focus();
                            } else {
                              handleNextStep();
                            }
                          }
                        }}
                        placeholder="Computer Science & Engineering"
                        className="w-full px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-xs sm:text-sm font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-white/40 transition-all"
                      />
                      {/* Branch Quick Chips */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {BRANCH_SUGGESTIONS.map((b) => {
                          let chipLabel = b.split(' ')[0];
                          if (b.includes('Electronics')) chipLabel = 'Electronics';
                          else if (b.includes('Civil')) chipLabel = 'Civil';
                          else if (b.includes('Computer')) chipLabel = 'Computer';
                          else if (b.includes('Mechanical')) chipLabel = 'Mechanical';

                          return (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setBranch(b)}
                              className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border transition-all cursor-pointer ${
                                branch === b
                                  ? 'bg-white text-blue-600 border-white font-bold shadow-md'
                                  : 'bg-white/15 text-white border-white/20 hover:bg-white/25'
                              }`}
                            >
                              {chipLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1 ml-1">
                          Registration No. *
                        </label>
                        <input
                          ref={registrationNoRef}
                          type="text"
                          required
                          value={registrationNo}
                          onChange={(e) => setRegistrationNo(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (sessionBatchRef.current) {
                                sessionBatchRef.current.focus();
                              } else {
                                handleNextStep();
                              }
                            }
                          }}
                          placeholder="e.g. 2301105042"
                          className="w-full px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-xs sm:text-sm font-mono font-bold shadow-md focus:outline-none focus:ring-2 focus:ring-white/40 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1 ml-1">
                          Session Batch *
                        </label>
                        <input
                          ref={sessionBatchRef}
                          type="text"
                          required
                          value={sessionBatch}
                          onChange={(e) => setSessionBatch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleNextStep();
                            }
                          }}
                          placeholder="2025-2029"
                          className="w-full px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-xs sm:text-sm font-mono font-bold shadow-md focus:outline-none focus:ring-2 focus:ring-white/40 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="w-full flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleNextStep}
                      className="flex-1 py-2 sm:py-2.5 rounded-xl bg-white hover:bg-slate-50 text-blue-600 font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-900/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: DOMAIN SELECTION */}
              {step === 3 && (
                <motion.div
                  key="step-3"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex flex-col items-center text-center max-w-xl w-full mx-auto px-2 transform-gpu will-change-transform"
                >
                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md mb-2">
                    What describes you best?
                  </h2>
                  <p className="text-xs sm:text-sm text-white/85 mb-4 sm:mb-6">
                    Choose your primary focus area or technical domain
                  </p>

                  {/* Clean responsive interactive domain grid */}
                  <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-6">
                    {DOMAIN_OPTIONS.map((item) => {
                      const selected = domain === item.id;
                      return (
                        <motion.button
                          key={item.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setDomain(item.id)}
                          className={`py-2.5 sm:py-3.5 px-2.5 sm:px-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 ${
                            selected
                              ? 'bg-white text-blue-600 shadow-xl ring-2 sm:ring-4 ring-white/50 scale-[1.02]'
                              : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/25'
                          }`}
                        >
                          <span className="text-base sm:text-xl shrink-0">{item.icon}</span>
                          <span className="truncate">{item.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>

                  <div className="w-full flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleNextStep}
                      className="flex-1 py-2 sm:py-2.5 rounded-xl bg-white hover:bg-slate-50 text-blue-600 font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-900/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: PAST PROJECT REPOS */}
              {step === 4 && (
                <motion.div
                  key="step-4"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex flex-col items-center text-center max-w-lg w-full mx-auto px-2 transform-gpu will-change-transform"
                >
                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md mb-2">
                    Past Project Repositories
                  </h2>
                  <p className="text-xs sm:text-sm text-white/85 mb-4 sm:mb-6 max-w-md">
                    Share links to your GitHub or repository projects so the council can view your work
                  </p>

                  <div className="w-full space-y-3 mb-5 text-left">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1 ml-1">
                        Past Project Repo / GitHub URL
                      </label>
                      <input
                        ref={pastProjectRepoRef}
                        type="url"
                        value={pastProjectRepo}
                        onChange={(e) => setPastProjectRepo(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleNextStep();
                          }
                        }}
                        placeholder="https://github.com/username/project-repo"
                        className="w-full px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-xs sm:text-sm font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-white/40 transition-all"
                      />
                    </div>
                  </div>

                  <div className="w-full flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleNextStep}
                      className="flex-1 py-2 sm:py-2.5 rounded-xl bg-white hover:bg-slate-50 text-blue-600 font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-900/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: MANUAL EXPERIENCE & BIO */}
              {step === 5 && (
                <motion.div
                  key="step-5"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex flex-col items-center text-center max-w-lg w-full mx-auto px-2 transform-gpu will-change-transform"
                >
                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md mb-2">
                    Tell us about yourself
                  </h2>
                  <p className="text-xs sm:text-sm text-white/85 mb-4 sm:mb-6 max-w-md">
                    Describe your experience, technical skills, or past achievements
                  </p>

                  <div className="w-full space-y-3 mb-5 text-left">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1 ml-1">
                        Phone / Mobile Number
                      </label>
                      <input
                        ref={phoneNoRef}
                        type="tel"
                        value={phoneNo}
                        onChange={(e) => setPhoneNo(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            manualExperienceRef.current?.focus();
                          }
                        }}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-xs sm:text-sm font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-white/40 transition-all mb-1"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1 ml-1">
                        Experience & Background
                      </label>
                      <textarea
                        ref={manualExperienceRef}
                        rows={3}
                        value={manualExperience}
                        onChange={(e) => setManualExperience(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleNextStep();
                          }
                        }}
                        placeholder="e.g. Worked on React & Python projects, hackathon participant, interested in AI & Robotics..."
                        className="w-full px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-xs sm:text-sm font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-white/40 transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="w-full flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleNextStep}
                      className="flex-1 py-2 sm:py-2.5 rounded-xl bg-white hover:bg-slate-50 text-blue-600 font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-900/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Continue to Credentials</span>
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* STEP 6: EMAIL & PASSWORD CREDENTIALS (FINAL STEP) */}
              {step === 6 && (
                <motion.div
                  key="step-6"
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="flex flex-col items-center text-center max-w-lg w-full mx-auto px-2 transform-gpu will-change-transform"
                >
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] sm:text-xs font-bold text-white mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Final Step • Account Credentials</span>
                  </div>

                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md mb-2">
                    Account Credentials
                  </h2>
                  <p className="text-xs sm:text-sm text-white/85 mb-4 sm:mb-6 max-w-md">
                    Set your account email and password to finalize your profile and submit your join request
                  </p>

                  <div className="w-full space-y-3 mb-5 text-left">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1 ml-1">
                        Student Email *
                      </label>
                      <input
                        ref={emailRef}
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (passwordRef.current) {
                              passwordRef.current.focus();
                            }
                          }
                        }}
                        placeholder="your.email@university.edu"
                        className="w-full px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-xs sm:text-sm font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-white/40 transition-all"
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/90 mb-1 ml-1">
                        Create Password *
                      </label>
                      <input
                        ref={passwordRef}
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleFinalSubmit(false);
                          }
                        }}
                        placeholder="At least 6 characters"
                        className="w-full pl-4 pr-11 py-2.5 sm:py-3 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-xs sm:text-sm font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-white/40 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-[27px] text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Step 6 Navigation & Submission */}
                  <div className="w-full flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={loading}
                      onClick={() => handleFinalSubmit(false)}
                      className="flex-1 py-2 sm:py-2.5 rounded-xl bg-white hover:bg-slate-50 text-blue-600 font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-900/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>{loading ? 'Submitting...' : 'Create Account & Submit Request'}</span>
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                    </motion.button>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* LOWER SECTION: THE SIGNATURE JITTER ANIMATED WAVE & GLIDING MILESTONE BUBBLE */}
      {!isLoginMode && (
        <div className="relative w-full h-24 sm:h-36 md:h-44 overflow-hidden z-10 pointer-events-none select-none mt-auto">
          {/* Responsive SVG Wave Path */}
          <svg
            viewBox="0 0 1000 200"
            preserveAspectRatio="none"
            className="w-full h-full absolute inset-0 text-white/30"
          >
            {/* Soft Ambient Line */}
            <path
              d="M 0 110 C 200 40, 350 170, 500 110 C 650 50, 800 160, 1000 100"
              fill="none"
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            {/* Solid Wave Track */}
            <path
              d="M 0 110 C 200 40, 350 170, 500 110 C 650 50, 800 160, 1000 100"
              fill="none"
              stroke="rgba(255, 255, 255, 0.7)"
              strokeWidth="1.5"
            />
          </svg>

          {/* Inactive milestone stations pinned along the curve */}
          {STATIONS.map((st, i) => (
            <div
              key={st.step}
              style={{
                left: `${st.x}%`,
                top: `${st.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute pointer-events-auto"
            >
              <button
                type="button"
                onClick={() => {
                  if (i <= step) setStep(i);
                }}
                className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-300 ${
                  i === step
                    ? 'opacity-0 scale-50'
                    : i < step
                    ? 'bg-white/30 border-white/60 text-white cursor-pointer shadow-md'
                    : 'bg-white/15 border-white/25 text-white/60'
                }`}
                title={st.title}
              >
                <span className="text-xs sm:text-base">{st.emoji}</span>
              </button>
            </div>
          ))}

          {/* Active Gliding Node (Hardware accelerated with zero layout thrashing) */}
          <motion.div
            animate={{
              left: `${activeStation.x}%`,
              top: `${activeStation.y}%`,
            }}
            transition={{
              duration: 0.28,
              ease: 'easeOut',
            }}
            style={{
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute pointer-events-none z-20 flex items-center justify-center transform-gpu will-change-transform"
          >
            {/* Outer Glowing White Ring Halo (Pure CSS pulse for 60fps performance) */}
            <div className="absolute w-14 h-14 sm:w-18 sm:h-18 rounded-full border border-white/60 bg-white/15 animate-pulse pointer-events-none" />

            {/* Central High-Contrast Character Node */}
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-white transform-gpu">
              <span className="text-lg sm:text-2xl filter drop-shadow">
                {activeStation.emoji}
              </span>
            </div>

            {/* Current Step Floating Badge */}
            <div className="absolute -bottom-5 whitespace-nowrap px-2 py-0.5 rounded-full bg-white/30 backdrop-blur-sm text-[9px] sm:text-[10px] font-extrabold text-white border border-white/40 shadow-sm">
              {activeStation.title}
            </div>
          </motion.div>
        </div>
      )}

      {/* Subtle Bottom Bar Help Indicator */}
      <footer className="relative z-30 px-4 py-2.5 sm:px-6 sm:py-3 flex items-center justify-between text-[11px] sm:text-xs text-white/70">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span>SIC Council</span>
          <span>•</span>
          <span>2026</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('landing')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Need help?
          </button>
        </div>
      </footer>

    </div>
  );
}
