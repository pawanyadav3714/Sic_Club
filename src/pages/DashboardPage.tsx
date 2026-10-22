import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Announcement, MembershipApplication, ProjectSubmission } from '../types';
import {
  supabase,
  isSupabaseConfigured,
  getStoredAnnouncements,
  fetchLiveAnnouncements,
  getStoredCoreMembers,
  fetchLiveCoreMembers,
  fetchLiveStudentProfiles,
  fixProfileName,
  setMockUser,
  upsertStudentProfileToDatabase,
} from '../lib/supabase';
import {
  getStoredProjects,
  saveProjectSubmission,
} from '../lib/projectStore';
import {
  getEventRegistrations,
  getAllAnnouncedEvents,
} from '../lib/eventStorage';
import { markMessagesAsDelivered, markUserPresence } from '../lib/chatStore';
import DirectChatWorkspace from '../components/DirectChatWorkspace';
import MemberEventsView from '../components/MemberEventsView';
import {
  Shield,
  ShieldCheck,
  LayoutDashboard,
  User,
  Calendar,
  Bell,
  MessageSquare,
  Rocket,
  FileText,
  QrCode,
  Ticket,
  MessagesSquare,
  Sparkles,
  ExternalLink,
  Github,
  Laptop,
  Phone,
  Clock,
  ChevronRight,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  LogOut,
  Edit3,
  Paperclip,
  Send,
  Smile,
  X,
  Upload,
  Layers,
  MapPin,
  Check,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DashboardPageProps {
  currentUser: UserProfile;
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

export default function DashboardPage({ currentUser, onNavigate, onLogout }: DashboardPageProps) {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<
    'portal' | 'profile' | 'registrations' | 'announcements' | 'projects' | 'chat'
  >('portal');

  // Time & Date Capsule State
  const [currentDateTime, setCurrentDateTime] = useState<string>('');

  useEffect(() => {
    const heartbeat = () => {
      markUserPresence(currentUser.id);
      if (currentUser.email) markUserPresence(currentUser.email);
      markMessagesAsDelivered(currentUser.id);
      if (currentUser.email) markMessagesAsDelivered(currentUser.email);
    };
    heartbeat();
    const interval = setInterval(heartbeat, 8000);
    return () => clearInterval(interval);
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      };
      setCurrentDateTime(now.toLocaleDateString('en-US', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Announcements state & Real-time Sync
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => getStoredAnnouncements());

  useEffect(() => {
    const syncAnnouncements = async () => {
      const live = await fetchLiveAnnouncements();
      setAnnouncements(live);
    };
    syncAnnouncements();

    const handleNoticeUpdate = (e: any) => {
      if (e.detail) {
        setAnnouncements(e.detail);
      } else {
        setAnnouncements(getStoredAnnouncements());
      }
    };

    window.addEventListener('sic_announcements_updated', handleNoticeUpdate);
    window.addEventListener('storage', handleNoticeUpdate);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('sic_announcements_channel');
        bc.onmessage = (event) => {
          if (event.data?.list) {
            setAnnouncements(event.data.list);
          }
        };
      }
    } catch (e) {}

    const interval = setInterval(syncAnnouncements, 8000);

    return () => {
      window.removeEventListener('sic_announcements_updated', handleNoticeUpdate);
      window.removeEventListener('storage', handleNoticeUpdate);
      clearInterval(interval);
      if (bc) bc.close();
    };
  }, []);

  // Projects State
  const [projects, setProjects] = useState<ProjectSubmission[]>(() => getStoredProjects());

  // Real-time project updates sync
  useEffect(() => {
    const handleProjectUpdate = () => {
      setProjects(getStoredProjects());
    };
    window.addEventListener('sic_project_updated', handleProjectUpdate);
    window.addEventListener('storage', handleProjectUpdate);
    return () => {
      window.removeEventListener('sic_project_updated', handleProjectUpdate);
      window.removeEventListener('storage', handleProjectUpdate);
    };
  }, []);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: currentUser.first_name || '',
    last_name: currentUser.last_name || '',
    phone_no: currentUser.phone_no ? String(currentUser.phone_no) : '',
    branch: currentUser.branch || 'Computer Science & Engineering',
    domain: currentUser.domain || 'Tech / Coding',
    past_project_repo: currentUser.past_project_repo || '',
  });

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: UserProfile = {
      ...currentUser,
      first_name: String(profileForm.first_name || '').trim(),
      last_name: String(profileForm.last_name || '').trim(),
      phone_no: String(profileForm.phone_no || '').trim(),
      branch: profileForm.branch,
      domain: profileForm.domain,
      past_project_repo: String(profileForm.past_project_repo || '').trim(),
    };

    setMockUser(updatedUser);

    // Save to local registered users cache
    try {
      const localRegistered: UserProfile[] = JSON.parse(localStorage.getItem('sic_registered_users') || '[]');
      const idx = localRegistered.findIndex(u => u.id === updatedUser.id || (u.email && updatedUser.email && u.email.toLowerCase() === updatedUser.email.toLowerCase()));
      if (idx >= 0) localRegistered[idx] = updatedUser;
      else localRegistered.push(updatedUser);
      localStorage.setItem('sic_registered_users', JSON.stringify(localRegistered));
    } catch (err) {}

    // Upsert to remote Supabase if available
    try {
      await upsertStudentProfileToDatabase({
        id: updatedUser.id,
        email: updatedUser.email,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        phone_no: updatedUser.phone_no,
        branch: updatedUser.branch,
        session: updatedUser.session,
        registration_no: updatedUser.registration_no,
        domain: updatedUser.domain,
        status: updatedUser.role === 'member' ? 'approved' : 'pending',
        created_at: updatedUser.created_at,
      });
    } catch (err) {}

    window.dispatchEvent(new CustomEvent('sic_user_profile_updated', { detail: updatedUser }));
    setIsEditingProfile(false);
    confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
  };

  // Submit Project Modal State
  const [showSubmitProjectModal, setShowSubmitProjectModal] = useState(false);
  const [projTitle, setProjTitle] = useState('');
  const [projDescription, setProjDescription] = useState('');
  const [projCategory, setProjCategory] = useState('Hardware & IoT');
  const [projDomain, setProjDomain] = useState(currentUser.domain || 'Tech / Coding');
  const [projRepoUrl, setProjRepoUrl] = useState('');
  const [projDemoUrl, setProjDemoUrl] = useState('');

  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projTitle.trim() || !projDescription.trim()) return;

    const authorName = currentUser.last_name
      ? `${currentUser.first_name} ${currentUser.last_name}`
      : currentUser.first_name;

    saveProjectSubmission({
      user_id: currentUser.id,
      author_name: authorName,
      author_email: currentUser.email,
      author_avatar: currentUser.avatar_url,
      domain: projDomain,
      title: projTitle.trim(),
      description: projDescription.trim(),
      repo_url: projRepoUrl.trim() || undefined,
      live_demo_url: projDemoUrl.trim() || undefined,
      status: 'In-Review',
      category: projCategory,
      tags: [projCategory, projDomain, 'Student Project'],
    });

    setProjTitle('');
    setProjDescription('');
    setProjRepoUrl('');
    setProjDemoUrl('');
    setShowSubmitProjectModal(false);
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
  };

  // Event Proposals Modal State
  const [showEventProposalModal, setShowEventProposalModal] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalObjective, setProposalObjective] = useState('');
  const [proposalAttendees, setProposalAttendees] = useState('50-100 Students');
  const [proposalDocName, setProposalDocName] = useState('');
  const [proposalSubmitted, setProposalSubmitted] = useState(false);

  const handleEventProposalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalTitle.trim() || !proposalObjective.trim()) return;
    setProposalSubmitted(true);
    setTimeout(() => {
      setProposalSubmitted(false);
      setShowEventProposalModal(false);
      setProposalTitle('');
      setProposalObjective('');
      setProposalDocName('');
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    }, 1500);
  };

  // QR Check-in Pass Modal State
  const [showQRModal, setShowQRModal] = useState(false);

  // Registrations Pass Modal State
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [registeredEvents, setRegisteredEvents] = useState<number[]>([1, 2]);

  // Notifications Modal
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showLogoutPopover, setShowLogoutPopover] = useState(false);

  // Student Core Members List & Realtime Sync with Supabase
  const [storedCoreMembers, setStoredCoreMembers] = useState<UserProfile[]>(() => getStoredCoreMembers());
  const [registeredStudents, setRegisteredStudents] = useState<UserProfile[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('sic_registered_users') || '[]');
    } catch {
      return [];
    }
  });

  const loadLiveUsers = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        const liveCore = await fetchLiveCoreMembers();
        setStoredCoreMembers(liveCore);
        const liveStudents = await fetchLiveStudentProfiles();
        setRegisteredStudents(liveStudents);
      } catch (e) {
        console.warn('DashboardPage loadLiveUsers error:', e);
      }
    } else {
      setStoredCoreMembers(getStoredCoreMembers());
      try {
        const localReg = JSON.parse(localStorage.getItem('sic_registered_users') || '[]');
        setRegisteredStudents(localReg);
      } catch {}
    }
  };

  useEffect(() => {
    loadLiveUsers();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('student-dashboard-users-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'core_members' }, () => {
          loadLiveUsers();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'student_profiles' }, () => {
          loadLiveUsers();
        })
        .subscribe();

      return () => {
        supabase?.removeChannel(channel);
      };
    }
  }, []);

  // Check Approval & Pending Logic
  const isApproved = currentUser.role === 'member' || currentUser.role === 'core_member' || currentUser.role === 'admin';

  // Display Names
  const studentFirstName = currentUser.first_name?.trim() || currentUser.email?.split('@')[0] || 'Student';
  const studentFullName = currentUser.last_name
    ? `${studentFirstName} ${currentUser.last_name.trim()}`
    : studentFirstName;
  const studentDomain = currentUser.domain || 'Tech / Coding';

  return (
    <div className={`min-h-screen font-['Plus_Jakarta_Sans',sans-serif] selection:bg-emerald-500 selection:text-white relative overflow-x-hidden transition-colors duration-300 ${
      activeTab === 'chat'
        ? 'bg-[#dbe4de] bg-[radial-gradient(#b8c8be_1.25px,transparent_1.25px)] [background-size:24px_24px] text-slate-800 p-1.5 sm:p-4 pb-20 sm:pb-6'
        : 'bg-gradient-to-br from-[#eef2ff] via-[#f5f3ff] to-[#f0fdf4] text-slate-800 p-3 sm:p-5 lg:p-6 pb-28'
    }`}>
      
      {/* Outer Flex Canvas Container */}
      <div className={`max-w-[1700px] mx-auto flex flex-col md:flex-row gap-4 sm:gap-6 relative z-10 ${
        activeTab === 'chat' ? 'h-[calc(100dvh-82px)] sm:h-[calc(100vh-48px)]' : 'min-h-[94vh]'
      }`}>

        {/* ========================================================= */}
        {/* 1. LEFT SIDEBAR (OFFICIAL WEBSITE LAYOUT) */}
        {/* ========================================================= */}
        <aside className="w-60 shrink-0 glass-panel rounded-[28px] flex flex-col justify-between hidden md:flex min-h-[94vh] sticky top-4 z-30 select-none p-4">
          <div className="space-y-6">
            {/* Top Brand Shield Logo */}
            <div className="flex justify-center pb-4 border-b border-white/10">
              <div className="w-16 h-16 rounded-3xl glass-card flex items-center justify-center relative p-1.5 shadow-[0_0_20px_rgba(168,85,247,0.35)] border border-white/30">
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 border border-white/50 flex items-center justify-center text-white font-black text-sm tracking-wider shadow-inner">
                  S I C
                </div>
              </div>
            </div>

            {/* Sidebar Navigation Options */}
            <div className="space-y-2.5">
              <button
                onClick={() => setActiveTab('portal')}
                className={`w-full px-3.5 py-3 rounded-2xl font-extrabold text-xs flex items-center justify-between cursor-pointer transition-all ${
                  activeTab === 'portal'
                    ? 'glass-nav-btn-active bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'glass-nav-btn text-slate-700 hover:text-slate-900 bg-white/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className={`w-4 h-4 ${activeTab === 'portal' ? 'text-white' : 'text-indigo-600'}`} />
                  <span>Member Portal</span>
                </div>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm animate-pulse">LIVE</span>
              </button>

              <button
                onClick={() => setActiveTab('registrations')}
                className={`w-full px-3.5 py-3 rounded-2xl font-extrabold text-xs flex items-center justify-between cursor-pointer transition-all ${
                  activeTab === 'registrations'
                    ? 'glass-nav-btn-active bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'glass-nav-btn text-slate-700 hover:text-slate-900 bg-white/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Ticket className={`w-4 h-4 ${activeTab === 'registrations' ? 'text-white' : 'text-sky-600'}`} />
                  <span>Event</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                  {getEventRegistrations().filter(r => r.email.toLowerCase() === currentUser.email.toLowerCase() || r.user_id === currentUser.id).length}
                </span>
              </button>





              <button
                onClick={() => setActiveTab('announcements')}
                className={`w-full px-3.5 py-3 rounded-2xl font-extrabold text-xs flex items-center justify-between cursor-pointer transition-all ${
                  activeTab === 'announcements'
                    ? 'glass-nav-btn-active bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'glass-nav-btn text-slate-700 hover:text-slate-900 bg-white/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Bell className={`w-4 h-4 ${activeTab === 'announcements' ? 'text-white' : 'text-amber-500'}`} />
                  <span>Announcements</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {announcements.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('projects')}
                className={`w-full px-3.5 py-3 rounded-2xl font-extrabold text-xs flex items-center justify-between cursor-pointer transition-all ${
                  activeTab === 'projects'
                    ? 'glass-nav-btn-active bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'glass-nav-btn text-slate-700 hover:text-slate-900 bg-white/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Rocket className={`w-4 h-4 ${activeTab === 'projects' ? 'text-white' : 'text-indigo-600'}`} />
                  <span>Projects</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {projects.length}
                </span>
              </button>


              <button
                onClick={() => setActiveTab('chat')}
                className={`w-full px-3.5 py-3 rounded-2xl font-extrabold text-xs flex items-center justify-between cursor-pointer transition-all ${
                  activeTab === 'chat'
                    ? 'glass-nav-btn-active bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                    : 'glass-nav-btn text-slate-700 hover:text-slate-900 bg-white/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MessagesSquare className={`w-4 h-4 ${activeTab === 'chat' ? 'text-white' : 'text-emerald-600'}`} />
                  <span>SIC Chat Hub</span>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              </button>
            </div>
          </div>

          {/* Bottom Profile Pill Footer */}
          <div className="p-2.5 rounded-2xl glass-pill flex items-center justify-between bg-white/60">
            <button
              onClick={() => setIsEditingProfile(true)}
              className="flex items-center gap-2 truncate text-left cursor-pointer hover:opacity-80 transition-opacity"
              title="Edit Profile"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-md shrink-0">
                {studentFirstName[0]}
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-slate-900 truncate">{studentFullName}</p>
                <p className="text-[10px] text-indigo-600 font-semibold truncate">{studentDomain}</p>
              </div>
            </button>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-xl text-slate-600 hover:text-rose-600 transition-colors shrink-0"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* 2. MAIN CONTENT AREA */}
        {/* ========================================================= */}
        <main className={`flex-1 min-w-0 flex flex-col z-10 ${
          activeTab === 'chat' ? 'space-y-0 h-full' : 'space-y-5'
        }`}>
          
          {/* SINGLE CLEAN HEADER BAR (ONLY SHOWN IN DASHBOARD / PORTAL TAB) */}
          {activeTab === 'portal' && (
            <header className="px-3.5 py-2.5 sm:px-8 sm:py-5 rounded-[22px] sm:rounded-[32px] bg-[#f0f4f8] clay-box border border-white flex items-center justify-between sticky top-2 sm:top-4 z-20 shadow-[0_12px_32px_rgba(165,180,210,0.35)]">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-gradient-to-tr from-teal-400 via-cyan-500 to-indigo-600 shadow-[0_0_12px_#2dd4bf] shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-xs sm:text-base md:text-lg font-black text-[#1e293b] tracking-tight uppercase truncate">
                    SCIENCE AND INNOVATION CLUB
                  </h1>
                  <p className="text-[10px] sm:text-xs font-extrabold text-indigo-600 truncate">
                    {studentFullName} • <span className="text-purple-600 font-bold">{studentDomain}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-5 shrink-0">
                {/* Utility Capsule: Date & Time matching reference image */}
                <div className="hidden md:flex px-4 py-2 rounded-full bg-white/90 text-[#0f766e] font-black text-xs items-center gap-2.5 shadow-[inset_2px_2px_5px_rgba(180,195,225,0.4),inset_-2px_-2px_5px_rgba(255,255,255,0.9)] border border-white shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-[#0f766e]" />
                  <span>{currentDateTime || '18 Oct 2026'}</span>
                  <span className="text-[#0f766e] font-black">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC</span>
                </div>

                {/* Claymorphic Notification Bell Icon */}
                <button
                  onClick={() => setShowNotificationsModal(true)}
                  className="relative p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/90 border border-white shadow-[3px_4px_10px_rgba(163,177,198,0.3),-2px_-2px_8px_rgba(255,255,255,0.95)] hover:bg-slate-50 text-emerald-700 transition-all cursor-pointer active:scale-95 flex items-center justify-center shrink-0"
                  title="View Notifications & Messages"
                >
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                  {announcements.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-rose-500 text-white font-black text-[8px] sm:text-[9px] flex items-center justify-center border border-white shadow-md animate-pulse">
                      {announcements.length}
                    </span>
                  )}
                </button>

                {/* Claymorphic Profile Avatar 3D Button with Smooth Logout Popup */}
                <div className="relative">
                  <button
                    onClick={() => setShowLogoutPopover(!showLogoutPopover)}
                    className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#6366f1] via-[#8b5cf6] to-[#a855f7] text-white font-black text-xs sm:text-base flex items-center justify-center shadow-[0_6px_16px_rgba(99,102,241,0.4),inset_2px_2px_4px_rgba(255,255,255,0.6),inset_-2px_-2px_6px_rgba(0,0,0,0.3)] border-2 sm:border-4 border-[#f0f4f8] cursor-pointer hover:scale-105 active:scale-95 transition-all overflow-hidden shrink-0"
                    title="Profile & Account Menu"
                  >
                    {currentUser.avatar_url ? (
                      <img src={currentUser.avatar_url} alt={studentFirstName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{studentFirstName[0]}</span>
                    )}
                  </button>

                  {/* Smooth Transition Logout Popover */}
                  <AnimatePresence>
                    {showLogoutPopover && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute right-0 top-12 sm:top-16 w-52 sm:w-56 p-2.5 sm:p-3 rounded-2xl bg-[#1e293b] text-white shadow-2xl border border-white/20 z-50 backdrop-blur-xl space-y-2"
                      >
                        <div className="px-2 py-1.5 border-b border-white/10">
                          <p className="text-xs font-black truncate">{studentFullName}</p>
                          <p className="text-[10px] text-cyan-400 truncate">{currentUser.email}</p>
                          <p className="text-[9px] text-slate-400 font-semibold truncate mt-0.5">{currentUser.registration_no || 'STUDENT MEMBER'}</p>
                        </div>

                        <button
                          onClick={() => {
                            setShowLogoutPopover(false);
                            setIsEditingProfile(true);
                          }}
                          className="w-full py-1.5 px-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5 text-indigo-300" />
                          <span>Edit Profile</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowLogoutPopover(false);
                            onLogout();
                          }}
                          className="w-full py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
                        >
                          <LogOut className="w-3.5 h-3.5 text-white" />
                          <span>Log Out</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </header>
          )}

          {/* ========================================================= */}
          {/* TAB CONTENT SWITCHER */}
          {/* ========================================================= */}
          {activeTab === 'portal' && (
            <div className="space-y-6">
              
              {/* QUICK UTILITIES GRID (5 Squishy 3D Square Buttons) */}
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 px-1">
                  Quick Actions & Utilities
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {/* Button 1: Submit Project (Deep Blue, Rocket) */}
                  <motion.button
                    whileHover={{ y: -5, scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowSubmitProjectModal(true)}
                    className="p-3.5 sm:p-5 rounded-[22px] sm:rounded-[28px] bg-gradient-to-br from-[#1d4ed8] via-[#1e40af] to-[#1e3a8a] text-white shadow-[8px_12px_24px_rgba(29,78,216,0.5),-6px_-6px_16px_rgba(255,255,255,0.8),inset_2px_2px_5px_rgba(255,255,255,0.35),inset_-3px_-5px_10px_rgba(0,0,0,0.5)] border-2 border-[#3b82f6] flex flex-col items-center justify-center gap-2 sm:gap-3 text-center cursor-pointer transition-all duration-200 group relative overflow-hidden"
                  >
                    <div className="w-10 h-10 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl bg-[#2563eb] border border-[#60a5fa]/60 flex items-center justify-center shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3),inset_-2px_-3px_6px_rgba(0,0,0,0.4)] group-hover:rotate-12 transition-transform shrink-0">
                      <Rocket className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow" />
                    </div>
                    <div>
                      <h3 className="text-[11px] sm:text-xs font-black text-white tracking-wide">Submit Project</h3>
                      <p className="text-[9px] sm:text-[10px] text-blue-200 font-bold mt-0.5">Showcase Ideas</p>
                    </div>
                  </motion.button>

                  {/* Button 2: Event Proposals (Deep Purple, Document) */}
                  <motion.button
                    whileHover={{ y: -5, scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowEventProposalModal(true)}
                    className="p-3.5 sm:p-5 rounded-[22px] sm:rounded-[28px] bg-gradient-to-br from-[#7e22ce] via-[#6b21a8] to-[#581c87] text-white shadow-[8px_12px_24px_rgba(126,34,206,0.5),-6px_-6px_16px_rgba(255,255,255,0.8),inset_2px_2px_5px_rgba(255,255,255,0.35),inset_-3px_-5px_10px_rgba(0,0,0,0.5)] border-2 border-[#a855f7] flex flex-col items-center justify-center gap-2 sm:gap-3 text-center cursor-pointer transition-all duration-200 group relative overflow-hidden"
                  >
                    <div className="w-10 h-10 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl bg-[#9333ea] border border-[#c084fc]/60 flex items-center justify-center shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3),inset_-2px_-3px_6px_rgba(0,0,0,0.4)] group-hover:rotate-12 transition-transform shrink-0">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow" />
                    </div>
                    <div>
                      <h3 className="text-[11px] sm:text-xs font-black text-white tracking-wide">Event Proposals</h3>
                      <p className="text-[9px] sm:text-[10px] text-purple-200 font-bold mt-0.5">Pitch Workshops</p>
                    </div>
                  </motion.button>

                  {/* Button 3: QR Check-in (Deep Emerald, QR Icon) */}
                  <motion.button
                    whileHover={{ y: -5, scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowQRModal(true)}
                    className="p-3.5 sm:p-5 rounded-[22px] sm:rounded-[28px] bg-gradient-to-br from-[#047857] via-[#065f46] to-[#064e3b] text-white shadow-[8px_12px_24px_rgba(4,120,87,0.5),-6px_-6px_16px_rgba(255,255,255,0.8),inset_2px_2px_5px_rgba(255,255,255,0.35),inset_-3px_-5px_10px_rgba(0,0,0,0.5)] border-2 border-[#10b981] flex flex-col items-center justify-center gap-2 sm:gap-3 text-center cursor-pointer transition-all duration-200 group relative overflow-hidden"
                  >
                    <div className="w-10 h-10 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl bg-[#059669] border border-[#34d399]/60 flex items-center justify-center shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3),inset_-2px_-3px_6px_rgba(0,0,0,0.4)] group-hover:rotate-12 transition-transform shrink-0">
                      <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow" />
                    </div>
                    <div>
                      <h3 className="text-[11px] sm:text-xs font-black text-white tracking-wide">QR Check-in</h3>
                      <p className="text-[9px] sm:text-[10px] text-emerald-200 font-bold mt-0.5">Event Entry Pass</p>
                    </div>
                  </motion.button>

                  {/* Button 4: SIC CHAT HUB (Deep Indigo, Chat Bubbles) */}
                  <motion.button
                    whileHover={{ y: -5, scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab('chat')}
                    className="p-3.5 sm:p-5 rounded-[22px] sm:rounded-[28px] bg-gradient-to-br from-[#4338ca] via-[#3730a3] to-[#312e81] text-white shadow-[8px_12px_24px_rgba(67,56,202,0.5),-6px_-6px_16px_rgba(255,255,255,0.8),inset_2px_2px_5px_rgba(255,255,255,0.35),inset_-3px_-5px_10px_rgba(0,0,0,0.5)] border-2 border-[#6366f1] flex flex-col items-center justify-center gap-2 sm:gap-3 text-center cursor-pointer transition-all duration-200 group relative overflow-hidden"
                  >
                    <div className="w-10 h-10 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl bg-[#4f46e5] border border-[#818cf8]/60 flex items-center justify-center shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3),inset_-2px_-3px_6px_rgba(0,0,0,0.4)] group-hover:rotate-12 transition-transform shrink-0">
                      <MessagesSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow" />
                    </div>
                    <div>
                      <h3 className="text-[11px] sm:text-xs font-black text-white tracking-wide">SIC CHAT HUB</h3>
                      <p className="text-[9px] sm:text-[10px] text-indigo-200 font-bold mt-0.5">Core Council Chat</p>
                    </div>
                  </motion.button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: EVENTS & ANNOUNCEMENTS FULL VIEW */}
          {activeTab === 'announcements' && (
            <MemberEventsView currentUser={currentUser} announcements={announcements} />
          )}

          {/* TAB: REGISTERED EVENTS PASSES VIEW */}
          {activeTab === 'registrations' && (
            <div className="p-3.5 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-gradient-to-br from-[#ffffff] via-[#f8fafc] to-[#f1f5f9] border-2 border-white shadow-[12px_16px_32px_rgba(160,175,210,0.38),-10px_-10px_25px_rgba(255,255,255,0.98),inset_3px_3px_6px_rgba(255,255,255,0.95)] space-y-4 sm:space-y-6 mb-20 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-[4px_4px_10px_rgba(56,189,248,0.35)] border border-sky-300 shrink-0">
                    <Ticket className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">Registered Event Passes</h2>
                    <p className="text-xs text-slate-500 font-bold">Your confirmed workshop passes & event registrations (Landing Page & Portal)</p>
                  </div>
                </div>
              </div>

              {/* Guidelines banner */}
              <div className="p-4 rounded-2xl bg-sky-50/95 border border-sky-200 text-xs text-slate-700 font-medium space-y-1 shadow-sm">
                <p className="font-bold text-sky-950 flex items-center gap-1.5">
                  <span>🎟️</span> Event Registration Status & Membership Passes
                </p>
                <p className="leading-relaxed">
                  Yahan aapke sabhi registered events aur workshops ke passes show hote hain. Chahe aapne landing page se register kiya ho ya portal se, sabhi active event registrations yahan track ki ja sakti hain.
                </p>
              </div>

              {(() => {
                const userRegs = getEventRegistrations().filter(
                  r => r.email.toLowerCase() === currentUser.email.toLowerCase() || r.user_id === currentUser.id
                );
                const allEvents = getAllAnnouncedEvents();

                const registeredEventList = userRegs.map(reg => {
                  const ev = allEvents.find(e => e.id === reg.event_id);
                  return {
                    id: reg.id,
                    title: ev ? ev.title : 'Club Workshop Pass',
                    time: ev ? `${new Date(ev.event_starts_at).toLocaleDateString()} | ${new Date(ev.event_starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Upcoming Schedule',
                    loc: ev ? ev.venue : 'Main Seminar Hall',
                    status: reg.status === 'confirmed' ? 'CONFIRMED PASS ✓' : `WAITLIST #${reg.waitlist_position || 1}`,
                    summary: ev ? ev.summary : 'Science & Innovation Club official registered event pass.'
                  };
                });

                const displayList = registeredEventList.length > 0 ? registeredEventList : [
                  { id: 'def-1', title: 'Upcoming Club Workshop', time: 'Apr 2026 | 12:30 pm', loc: 'Main Seminar Hall', status: 'CONFIRMED PASS ✓', summary: 'Introduction to Robotics & Microcontrollers.' },
                  { id: 'def-2', title: 'AI & Machine Learning Bootcamp', time: '21 May 2026 | 1:30 pm', loc: 'Computer Lab 3', status: 'CONFIRMED PASS ✓', summary: 'Deep learning & neural networks fundamentals.' }
                ];

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayList.map((pass) => (
                      <div
                        key={pass.id}
                        className="p-5 rounded-[28px] bg-gradient-to-br from-white via-slate-50 to-sky-50/40 border-2 border-white shadow-[8px_12px_20px_rgba(150,165,205,0.35),-6px_-6px_14px_rgba(255,255,255,0.95),inset_2px_2px_4px_rgba(255,255,255,0.8)] space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                              {pass.status}
                            </span>
                            <span className="text-xs font-bold text-slate-600">📍 {pass.loc}</span>
                          </div>

                          <h3 className="text-base font-black text-slate-900 leading-snug">{pass.title}</h3>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">{pass.summary}</p>
                        </div>

                        <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-bold text-slate-500">
                          <span>📅 {pass.time}</span>
                          <span className="text-sky-600 font-extrabold">Verified Pass</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 3: PROJECTS SHOWCASE FULL VIEW (100% CLAYMORPHISM & RESPONSIVE) */}
          {activeTab === 'projects' && (
            <div className="p-3.5 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-gradient-to-br from-[#ffffff] via-[#f8fafc] to-[#f1f5f9] border-2 border-white shadow-[12px_16px_32px_rgba(160,175,210,0.38),-10px_-10px_25px_rgba(255,255,255,0.98),inset_3px_3px_6px_rgba(255,255,255,0.95)] space-y-4 sm:space-y-6 mb-20 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-[4px_4px_10px_rgba(59,130,246,0.35)] border border-blue-300 shrink-0">
                    <Rocket className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">Student Projects Showcase</h2>
                    <p className="text-xs text-slate-500 font-bold">Hardware, AI, and Software innovations created by SIC members</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowSubmitProjectModal(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-[4px_6px_12px_rgba(59,130,246,0.3)] border border-blue-300 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Submit New Project</span>
                </button>
              </div>

              {/* Student Task/Project Submission Guidelines & Live Status Info */}
              <div className="p-4 rounded-2xl bg-indigo-50/95 border border-indigo-200 text-xs text-slate-700 font-medium space-y-1 shadow-sm">
                <p className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <span>💡</span> Task & Project Submission Guidelines
                </p>
                <p className="leading-relaxed">
                  Yahan se student apne naye projects/tasks submit kar sakta hai (Title, hardware/software details, repo/demo links ke sath). Iske sath hi, pehle se submitted projects ka live status (Draft, In-Review, Published) bhi track kiya ja sakta hai jo admin ke action par automatically update hota hai.
                </p>
              </div>

              {projects.length === 0 ? (
                <div className="p-8 rounded-[24px] bg-slate-50/80 border border-dashed border-slate-300 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 mx-auto flex items-center justify-center font-black text-xl">
                    💡
                  </div>
                  <p className="text-sm font-black text-slate-800">No Projects Submitted Yet</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">Click 'Submit New Project' above to pitch your prototype or research project.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-5 rounded-[28px] bg-gradient-to-br from-white via-slate-50 to-indigo-50/40 border-2 border-white shadow-[8px_12px_20px_rgba(150,165,205,0.35),-6px_-6px_14px_rgba(255,255,255,0.95),inset_2px_2px_4px_rgba(255,255,255,0.8)] space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                            {proj.category || proj.domain}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 ${
                              proj.status === 'Published' || proj.status === 'Approved'
                                ? 'bg-emerald-500 text-white border border-emerald-300 shadow-[2px_3px_8px_rgba(16,185,129,0.3)]'
                                : proj.status === 'In-Review'
                                ? 'bg-amber-400 text-amber-950 border border-amber-300 shadow-[2px_3px_8px_rgba(245,158,11,0.3)]'
                                : 'bg-rose-500 text-white border border-rose-300'
                            }`}
                          >
                            {proj.status === 'In-Review' && <span className="w-1.5 h-1.5 rounded-full bg-amber-950 animate-ping" />}
                            {proj.status}
                          </span>
                        </div>

                        <h3 className="text-base font-black text-slate-900 leading-snug">{proj.title}</h3>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{proj.description}</p>
                      </div>

                      <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span>Author: {proj.author_name}</span>
                        {proj.repo_url && (
                          <a
                            href={proj.repo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1"
                          >
                            <Github className="w-3.5 h-3.5" />
                            <span>Repository</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: WHATSAPP CHAT INLINE VIEW (CLAYMORPHISM 3D CARD) */}
          {activeTab === 'chat' && (
            <div className="w-full h-full flex-1 min-h-0 rounded-[28px] sm:rounded-[38px] overflow-hidden flex flex-col clay-container border-4 sm:border-[6px] border-[#eaf1ec] shadow-[20px_24px_48px_rgba(145,170,158,0.5),-16px_-16px_36px_rgba(255,255,255,0.95)]">
              <DirectChatWorkspace
                currentUser={currentUser}
                studentMembers={registeredStudents}
                coreCouncilList={storedCoreMembers}
                isCoreUser={false}
              />
            </div>
          )}

        </main>
      </div>

      {/* ========================================================= */}
      {/* MODALS SECTION */}
      {/* ========================================================= */}

      {/* 1. SUBMIT PROJECT MODAL */}
      <AnimatePresence>
        {showSubmitProjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-xl p-6 sm:p-8 rounded-[32px] bg-slate-900 border border-slate-800 text-white shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-black border border-indigo-500/40">
                    <Rocket className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Submit Project Payload</h2>
                    <p className="text-xs text-slate-400 font-medium">Appears directly in Core Admin's Projects Queue</p>
                  </div>
                </div>
                <button onClick={() => setShowSubmitProjectModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleProjectSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">Project Title</label>
                  <input
                    type="text"
                    required
                    value={projTitle}
                    onChange={(e) => setProjTitle(e.target.value)}
                    placeholder="e.g. Low-Cost Smart Irrigation System"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-300 mb-1">Category</label>
                    <select
                      value={projCategory}
                      onChange={(e) => setProjCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="Hardware & IoT">Hardware & IoT</option>
                      <option value="AI & Computer Vision">AI & Computer Vision</option>
                      <option value="Web & App Development">Web & App Development</option>
                      <option value="Robotics & Embedded">Robotics & Embedded</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-300 mb-1">Domain</label>
                    <input
                      type="text"
                      value={projDomain}
                      onChange={(e) => setProjDomain(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">Description & Objective</label>
                  <textarea
                    required
                    rows={3}
                    value={projDescription}
                    onChange={(e) => setProjDescription(e.target.value)}
                    placeholder="Explain the problem statement, hardware components, or software architecture..."
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-300 mb-1">GitHub Repo URL</label>
                    <input
                      type="url"
                      value={projRepoUrl}
                      onChange={(e) => setProjRepoUrl(e.target.value)}
                      placeholder="https://github.com/user/project"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-300 mb-1">Live Demo / Video URL</label>
                    <input
                      type="url"
                      value={projDemoUrl}
                      onChange={(e) => setProjDemoUrl(e.target.value)}
                      placeholder="https://demo.sic.edu"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSubmitProjectModal(false)}
                    className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    Submit Project
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. EVENT PROPOSALS MODAL */}
      <AnimatePresence>
        {showEventProposalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-xl p-6 sm:p-8 rounded-[32px] bg-slate-900 border border-slate-800 text-white shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600/30 text-purple-400 flex items-center justify-center font-black border border-purple-500/40">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Submit Event Proposal</h2>
                    <p className="text-xs text-slate-400 font-medium">Propose workshops or competitions for faculty approval</p>
                  </div>
                </div>
                <button onClick={() => setShowEventProposalModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {proposalSubmitted ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                    <Check className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-white">Proposal Submitted!</h3>
                  <p className="text-xs text-slate-400">Faculty & Core Leads will review your proposal shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleEventProposalSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-300 mb-1">Event / Workshop Name</label>
                    <input
                      type="text"
                      required
                      value={proposalTitle}
                      onChange={(e) => setProposalTitle(e.target.value)}
                      placeholder="e.g. Hands-on Robotics & Drone Design Workshop"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-purple-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-300 mb-1">Objectives & Prerequisites</label>
                    <textarea
                      required
                      rows={3}
                      value={proposalObjective}
                      onChange={(e) => setProposalObjective(e.target.value)}
                      placeholder="Detail the target audience, learning outcomes, hardware required..."
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-300 mb-1">Expected Attendees</label>
                      <input
                        type="text"
                        value={proposalAttendees}
                        onChange={(e) => setProposalAttendees(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-slate-300 mb-1">Proposal PDF Document Name</label>
                      <input
                        type="text"
                        value={proposalDocName}
                        onChange={(e) => setProposalDocName(e.target.value)}
                        placeholder="e.g. Drone_Workshop_Proposal.pdf"
                        className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowEventProposalModal(false)}
                      className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs uppercase"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase shadow-lg shadow-purple-600/30 cursor-pointer"
                    >
                      Submit Proposal
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. QR CHECK-IN PASS MODAL */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm p-6 rounded-[32px] bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-950 text-white border border-emerald-500/50 shadow-2xl text-center space-y-5"
            >
              <div className="flex justify-end">
                <button onClick={() => setShowQRModal(false)} className="p-1 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  OFFICIAL MEMBER PASS
                </span>
                <h3 className="text-xl font-black text-white pt-1">{studentFullName}</h3>
                <p className="text-xs text-emerald-200 font-mono">{currentUser.registration_no || 'REG2026042'}</p>
              </div>

              {/* 3D Simulated QR Box */}
              <div className="w-48 h-48 mx-auto p-4 rounded-[28px] bg-white text-slate-900 shadow-2xl border-4 border-emerald-400 flex flex-col items-center justify-center gap-2 relative group">
                <QrCode className="w-32 h-32 text-slate-950" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">SCAN AT ENTRY</span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-200 font-medium">
                Present this QR code at workshop check-in counters for instant verification.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. MY REGISTRATIONS PASSES MODAL */}
      <AnimatePresence>
        {showRegistrationsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md p-6 rounded-[32px] bg-slate-900 border border-slate-800 text-white shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Ticket className="w-5 h-5 text-sky-400" />
                  <h3 className="text-base font-black text-white">Registered Event Passes</h3>
                </div>
                <button onClick={() => setShowRegistrationsModal(false)} className="p-1 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { id: 1, title: 'Upcoming Club Workshop', time: 'Apr 2024 | 12:30 pm', loc: 'Main Seminar Hall' },
                  { id: 2, title: 'AI & Machine Learning Bootcamp', time: '21 May 23 | 1:30 pm', loc: 'Computer Lab 3' },
                ].map((ev) => (
                  <div key={ev.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800">
                        CONFIRMED PASS ✓
                      </span>
                      <span className="text-xs text-slate-400 font-bold">📍 {ev.loc}</span>
                    </div>
                    <h4 className="text-sm font-black text-white">{ev.title}</h4>
                    <p className="text-xs text-slate-400">📅 {ev.time}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. EDIT MY PROFILE MODAL */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg p-6 sm:p-8 rounded-[32px] bg-slate-900 border border-slate-800 text-white shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600/30 text-purple-400 flex items-center justify-center font-black border border-purple-500/40">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Edit Global Member Profile</h2>
                    <p className="text-xs text-slate-400 font-medium">Instantly updates in Core Admin Roster & Chat headers</p>
                  </div>
                </div>
                <button onClick={() => setIsEditingProfile(false)} className="p-2 rounded-xl text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-300 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={profileForm.first_name}
                      onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-300 mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={profileForm.last_name}
                      onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-300 mb-1">Mobile Phone</label>
                    <input
                      type="tel"
                      value={profileForm.phone_no}
                      onChange={(e) => setProfileForm({ ...profileForm, phone_no: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-300 mb-1">Domain</label>
                    <select
                      value={profileForm.domain}
                      onChange={(e) => setProfileForm({ ...profileForm, domain: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none font-medium"
                    >
                      <option value="Tech / Coding">Tech / Coding</option>
                      <option value="Video Editing">Video Editing</option>
                      <option value="Event Management">Event Management</option>
                      <option value="Tech Fest Management">Tech Fest Management</option>
                      <option value="Post Design & Graphics">Post Design & Graphics</option>
                      <option value="Research & Innovation">Research & Innovation</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">Branch</label>
                  <input
                    type="text"
                    value={profileForm.branch}
                    onChange={(e) => setProfileForm({ ...profileForm, branch: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">GitHub Portfolio Repo</label>
                  <input
                    type="url"
                    value={profileForm.past_project_repo}
                    onChange={(e) => setProfileForm({ ...profileForm, past_project_repo: e.target.value })}
                    placeholder="https://github.com/username/project"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none font-medium"
                  />
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase shadow-lg shadow-purple-600/30 cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* 7. NOTIFICATIONS MODAL */}
      <AnimatePresence>
        {showNotificationsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md p-6 rounded-[32px] bg-white border border-slate-200 text-slate-900 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-black text-slate-900">Recent Notifications</h3>
                </div>
                <button onClick={() => setShowNotificationsModal(false)} className="p-1 rounded-xl text-slate-400 hover:text-slate-800 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <p className="text-xs font-black text-slate-900">{ann.title}</p>
                    <p className="text-[11px] text-slate-600">{ann.content}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3D CLAYMORPHISM FLOATING BOTTOM NAVIGATION BAR FOR STUDENTS (MOBILE/PORTRAIT) */}
      <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40 clay-pill bg-[#eef2f9]/95 backdrop-blur-2xl border border-white p-2 flex items-center justify-around shadow-[0_15px_35px_rgba(150,165,205,0.45)] flex">
        <button
          onClick={() => setActiveTab('portal')}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'portal' 
              ? 'bg-[#dfe6f5] text-indigo-600 font-black shadow-[inset_2px_2px_5px_rgba(150,165,205,0.5),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-indigo-600" />
          <span className="text-[9px]">Portal</span>
        </button>



        <button
          onClick={() => setActiveTab('registrations')}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'registrations' 
              ? 'bg-[#e0f2fe] text-sky-800 font-black shadow-[inset_2px_2px_5px_rgba(56,189,248,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <Ticket className="w-4 h-4 text-sky-600" />
          <span className="text-[9px]">Event</span>
          {getEventRegistrations().filter(r => r.email.toLowerCase() === currentUser.email.toLowerCase() || r.user_id === currentUser.id).length > 0 && (
            <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-sky-500 text-white text-[8px] font-black flex items-center justify-center">
              {getEventRegistrations().filter(r => r.email.toLowerCase() === currentUser.email.toLowerCase() || r.user_id === currentUser.id).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'announcements' 
              ? 'bg-[#ede9fe] text-purple-800 font-black shadow-[inset_2px_2px_5px_rgba(139,92,246,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4 text-amber-500" />
          <span className="text-[9px]">Notices</span>
          {announcements.length > 0 && (
            <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center">
              {announcements.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'projects' 
              ? 'bg-[#e0f2fe] text-blue-800 font-black shadow-[inset_2px_2px_5px_rgba(6,182,212,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <Rocket className="w-4 h-4 text-indigo-600" />
          <span className="text-[9px]">Projects</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'chat' 
              ? 'bg-[#d1fae5] text-emerald-800 font-black shadow-[inset_2px_2px_5px_rgba(16,185,129,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <MessagesSquare className="w-4 h-4 text-emerald-600" />
          <span className="text-[9px]">Chat</span>
        </button>
      </div>

    </div>
  );
}
