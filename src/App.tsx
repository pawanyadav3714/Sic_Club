import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from './types';
import { supabase, getMockUser, setMockUser, upsertCoreMemberToDatabase, upsertStudentProfileToDatabase, fetchLiveAnnouncements } from './lib/supabase';
import { fetchLiveEvents } from './lib/eventStorage';
import LandingPage from './pages/LandingPage';
import StudentAuthPage from './pages/StudentAuthPage';
import CoreAuthPage from './pages/CoreAuthPage';
import DashboardPage from './pages/DashboardPage';
import CoreDashboardPage from './pages/CoreDashboardPage';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getMockUser());
  const [currentRoute, setCurrentRoute] = useState<string>('landing');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    // Sync live events and announcements from database to purge any stale local cache
    fetchLiveEvents();
    fetchLiveAnnouncements();

    const sb = supabase;
    if (!sb) return;

    const handleSessionUser = async (sessionUser: any) => {
      const userEmail = (sessionUser.email || '').trim().toLowerCase();

      let profile: UserProfile | null = null;

      try {
        const { data: cData } = await sb.from('core_members').select('*').or(`id.eq.${sessionUser.id},email.ilike.${userEmail}`).maybeSingle();
        if (cData) {
          profile = { ...cData, role: 'core_member' };
        } else {
          const { data: sData } = await sb.from('student_profiles').select('*').or(`id.eq.${sessionUser.id},email.ilike.${userEmail}`).maybeSingle();
          if (sData) {
            profile = { ...sData, role: sData.status === 'approved' ? 'member' : 'pending' };
          }
        }
      } catch (e) {}

      if (!profile) {
        // Fallback only if mock user matches current active session
        const mockUser: UserProfile | null = getMockUser();
        if (mockUser && mockUser.email && mockUser.email.toLowerCase() === userEmail) {
          profile = mockUser;
        }
      }

      // Check if user came from Admin / Core Member Google OAuth flow
      const isCoreOAuth = localStorage.getItem('sic_core_oauth') === 'true';
      if (isCoreOAuth) {
        localStorage.removeItem('sic_core_oauth');
        
        // SECURITY FIX: Verify if the user is actually in core_members table
        const { data: coreRecord } = await sb.from('core_members')
            .select('*')
            .eq('id', sessionUser.id)
            .maybeSingle();
            
        if (!coreRecord) {
            // Not a core member! Force logout immediately.
            await sb.auth.signOut();
            setCurrentUser(null);
            setCurrentRoute('landing');
            alert('Access Denied: You are not a registered Core Member.');
            window.location.assign('/'); // Hard reload to landing page, bypassing all dashboard rendering
            return;
        }

        const coreUser: UserProfile = {
          ...coreRecord,
          role: 'core_member',
          avatar_url: sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture || '',
          created_at: coreRecord.created_at || new Date().toISOString()
        };


        try {
          await upsertCoreMemberToDatabase({
            id: coreUser.id,
            email: coreUser.email,
            first_name: coreUser.first_name,
            last_name: coreUser.last_name,
            phone_no: coreUser.phone_no || undefined,
            branch: coreUser.branch,
            session: coreUser.session,
            registration_no: coreUser.registration_no,
            domain: coreUser.domain,
            designation: coreUser.designation,
            created_at: coreUser.created_at
          });
        } catch (e) {}

        try {
          const localRegistered: UserProfile[] = JSON.parse(localStorage.getItem('sic_registered_users') || '[]');
          const idx = localRegistered.findIndex(u => u.email && u.email.toLowerCase() === coreUser.email.toLowerCase());
          if (idx >= 0) localRegistered[idx] = coreUser;
          else localRegistered.push(coreUser);
          localStorage.setItem('sic_registered_users', JSON.stringify(localRegistered));
        } catch (e) {}

        setCurrentUser(coreUser);
        setMockUser(coreUser);
        setCurrentRoute('core-dashboard');
        return;
      }

      // Check if user came from Google OAuth registration flow with pending details
      const pendingRegStr = localStorage.getItem('sic_pending_registration');
      if (pendingRegStr) {
        try {
          const regData = JSON.parse(pendingRegStr);
          localStorage.removeItem('sic_pending_registration');

          const googleProfile: UserProfile = {
            id: sessionUser.id,
            first_name: regData.first_name || sessionUser.user_metadata?.first_name || sessionUser.user_metadata?.full_name?.split(' ')[0] || sessionUser.email?.split('@')[0] || 'Student',
            last_name: regData.last_name || sessionUser.user_metadata?.last_name || sessionUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 'Member',
            email: sessionUser.email || regData.email || '',
            branch: regData.branch || 'Computer Science & Engineering',
            registration_no: regData.registration_no || 'REG2026042',
            session: regData.session || '2025-2029',
            domain: regData.domain || 'Tech / Coding',
            past_project_repo: regData.past_project_repo || '',
            avatar_url: sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture || '',
            role: 'pending',
            auth_provider: 'google',
            created_at: new Date().toISOString()
          };

          // Also persist in sic_registered_users
          try {
            const localRegistered: UserProfile[] = JSON.parse(localStorage.getItem('sic_registered_users') || '[]');
            const idx = localRegistered.findIndex(u => u.email && u.email.toLowerCase() === googleProfile.email.toLowerCase());
            if (idx >= 0) localRegistered[idx] = googleProfile;
            else localRegistered.push(googleProfile);
            localStorage.setItem('sic_registered_users', JSON.stringify(localRegistered));
          } catch (e) {}

          // Upsert to student_profiles table safely
          try {
            await upsertStudentProfileToDatabase({
              id: googleProfile.id,
              email: googleProfile.email,
              first_name: googleProfile.first_name,
              last_name: googleProfile.last_name,
              phone_no: (regData as any).phone_no || googleProfile.phone_no || undefined,
              branch: googleProfile.branch,
              session: googleProfile.session,
              registration_no: googleProfile.registration_no || ('REG' + Math.floor(1000000 + Math.random() * 9000000)),
              domain: googleProfile.domain,
              status: 'pending',
              created_at: googleProfile.created_at
            });
          } catch (err) {}

          // Insert into membership_applications
          try {
            await sb.from('membership_applications').insert([{
              user_id: sessionUser.id,
              selected_post_id: '11111111-1111-4111-a111-111111111111',
              past_project_repo: regData.past_project_repo || '',
              status: 'pending'
            }]);
          } catch (e) {}

          // Also persist in local membership applications cache so Admin Dashboard receives all details
          try {
            const storedApps: any[] = JSON.parse(localStorage.getItem('sic_membership_applications') || '[]');
            const appRecord = {
              id: 'app-' + sessionUser.id,
              user_id: sessionUser.id,
              selected_post_id: '11111111-1111-4111-a111-111111111111',
              past_project_repo: regData.past_project_repo || '',
              status: 'pending',
              created_at: googleProfile.created_at,
              user: googleProfile,
            };
            const existingAppIdx = storedApps.findIndex(
              (a: any) => a.user_id === sessionUser.id || a.user?.email?.toLowerCase() === googleProfile.email.toLowerCase()
            );
            if (existingAppIdx >= 0) storedApps[existingAppIdx] = appRecord;
            else storedApps.unshift(appRecord);
            localStorage.setItem('sic_membership_applications', JSON.stringify(storedApps));
          } catch (e) {}

          profile = googleProfile;
        } catch (parseErr) {}
      }

      // If not yet found by sessionUser.id, search by email in Supabase
      if (!profile && sessionUser.email) {
        try {
          const { data } = await sb.from('profiles').select('*').ilike('email', sessionUser.email).maybeSingle();
          if (data) profile = data;
        } catch (e) {}
      }

      // Check registered users in local storage if not found in remote
      if (!profile && sessionUser.email) {
        try {
          const localRegistered: UserProfile[] = JSON.parse(localStorage.getItem('sic_registered_users') || '[]');
          const matched = localRegistered.find(u => u.email.toLowerCase() === sessionUser.email.toLowerCase());
          if (matched) {
            profile = matched;
          }
        } catch (e) {}
      }

      const oauthIntent = localStorage.getItem('sic_oauth_intent') || 'login';
      localStorage.removeItem('sic_oauth_intent');

      // If user is NOT registered in database
      if (!profile) {
        if (oauthIntent === 'signup') {
          // New student intent to register: proceed to fill details
          const googleRegUser = {
            id: sessionUser.id,
            email: sessionUser.email || '',
            firstName: sessionUser.user_metadata?.first_name || sessionUser.user_metadata?.full_name?.split(' ')[0] || sessionUser.email?.split('@')[0] || 'Student',
            lastName: sessionUser.user_metadata?.last_name || sessionUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 'Member',
            picture: sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture || '',
          };
          sessionStorage.setItem('sic_google_reg_user', JSON.stringify(googleRegUser));
          setMockUser(null);
          setCurrentUser(null);
          setCurrentRoute('signup');
          return;
        }

        // Login intent: Email not registered! Show error and sign out
        await sb.auth.signOut();
        setMockUser(null);
        setCurrentUser(null);
        sessionStorage.setItem('sic_auth_error', 'Email not registered. Please sign up first.');
        setCurrentRoute('login');
        return;
      }

      // If user is already registered but came with signup intent:
      if (oauthIntent === 'signup') {
        sessionStorage.setItem('sic_auth_error', 'This email already exists. Please login.');
        setCurrentRoute('login');
        return;
      }

      // USER IS AN EXISTING REGISTERED USER!
      const userProfile: UserProfile = { ...profile };

      // Determine if user is an Admin or Core Council Member
      // STRICT DATABASE CHECK
      const { data: coreRecord } = await sb.from('core_members')
          .select('*')
          .eq('id', userProfile.id)
          .maybeSingle();

      if (coreRecord) {
        userProfile.role = 'core_member';
        setCurrentUser(userProfile);
        setMockUser(userProfile);
        setCurrentRoute('core-dashboard');
        return;
      }

      // Determine approval status for student members
      const approvedList: string[] = JSON.parse(localStorage.getItem('sic_approved_users') || '[]');
      const isLocallyApproved = approvedList.includes(userProfile.id) || (userProfile.email && approvedList.includes(userProfile.email.toLowerCase()));
      
      const rejectedList: string[] = JSON.parse(localStorage.getItem('sic_rejected_users') || '[]');
      const isLocallyRejected = rejectedList.includes(userProfile.id) || (userProfile.email && rejectedList.includes(userProfile.email.toLowerCase()));

      let isRemoteApproved = false;
      let isRemoteRejected = false;
      try {
        const { data: appData } = await sb
          .from('membership_applications')
          .select('status')
          .eq('user_id', userProfile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (appData) {
          if (appData.status === 'approved') isRemoteApproved = true;
          else if (appData.status === 'rejected') isRemoteRejected = true;
        }
      } catch (e) {}

      if (isLocallyApproved || isRemoteApproved) {
        userProfile.role = 'member';
      } else if (isLocallyRejected || isRemoteRejected || profile.role === 'rejected') {
        userProfile.role = 'rejected';
      } else {
        userProfile.role = 'pending';
      }

      setCurrentUser(userProfile);
      setMockUser(userProfile);
      setCurrentRoute('dashboard');
    };

    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleSessionUser(session.user);
      } else {
        const mock = getMockUser();
        if (!mock) {
          setCurrentUser(null);
        }
      }
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
        setCurrentUser(null);
        setMockUser(null);
      } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        handleSessionUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getInitials = (user: UserProfile) => {
    const f = user.first_name?.[0] || '';
    const l = user.last_name?.[0] || '';
    return (f + l).toUpperCase() || 'U';
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentRoute]);

  // Security guard for core-dashboard
  useEffect(() => {
    if (currentRoute === 'core-dashboard' && currentUser && currentUser.role !== 'core_member') {
      handleLogout();
    }
  }, [currentRoute, currentUser]);

  const handleNavigate = (route: string) => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (route === 'admin') {
      setCurrentRoute('core-auth');
    } else {
      setCurrentRoute(route);
    }
  };

  const handleLogout = async () => {
    const sb = supabase;
    if (sb) {
      try {
        await sb.auth.signOut();
      } catch (e) {}
    }
    setMockUser(null);
    setCurrentUser(null);
    localStorage.removeItem('sic_mock_user');
    localStorage.removeItem('sic_core_oauth');
    localStorage.removeItem('sic_oauth_intent');
    localStorage.removeItem('sic_pending_registration');
    sessionStorage.clear();
    setCurrentRoute('landing');
    setProfileMenuOpen(false);
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setMockUser(user);
    if (user.role === 'core_member') {
      setCurrentRoute('core-dashboard');
    } else {
      setCurrentRoute('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] relative overflow-hidden scrollbar-hide">


      {/* Main Route Switcher */}
      <div className="flex-1 w-full h-full">
        {currentRoute === 'landing' && (
          <LandingPage onNavigate={handleNavigate} currentUser={currentUser} onLogout={handleLogout} onLoginSuccess={handleLoginSuccess} />
        )}
        {(currentRoute === 'login' || currentRoute === 'signup') && (
          <StudentAuthPage onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} initialMode={currentRoute === 'signup' ? 'signup' : 'login'} />
        )}
        {(currentRoute === 'core-auth' || currentRoute === 'admin') && (
          <CoreAuthPage onNavigate={handleNavigate} onLoginSuccess={handleLoginSuccess} />
        )}
        {currentRoute === 'dashboard' && currentUser && (
          <DashboardPage currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />
        )}
        {currentRoute === 'core-dashboard' && currentUser && (
          currentUser.role === 'core_member' ? (
            <CoreDashboardPage currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />
          ) : (
            null
          )
        )}
      </div>
    </div>
  );
}
