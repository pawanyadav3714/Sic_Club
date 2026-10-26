import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Announcement, MembershipApplication, ProjectSubmission, UserRole } from '../types';
import {
  supabase,
  isSupabaseConfigured,
  getStoredAnnouncements,
  fetchLiveAnnouncements,
  getStoredCoreMembers,
  fetchLiveCoreMembers,
  fetchLiveStudentProfiles,
  fixProfileName,
  saveUserAvatar,
  setMockUser,
  upsertStudentProfileToDatabase,
  compressImage,
} from '../lib/supabase';
import {
  getStoredProjects,
  saveProjectSubmission,
} from '../lib/projectStore';
import {
  getEventRegistrations,
  getStoredEventRegistrations,
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
  AlertCircle,
  Camera
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

  // Active User State for Instant Real-Time UI Updates
  const [activeUser, setActiveUser] = useState<UserProfile>(currentUser);

  useEffect(() => {
    if (currentUser) {
      setActiveUser(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      if (e.detail) {
        setActiveUser(e.detail);
        setActiveRole(e.detail.role);
      }
    };
    window.addEventListener('sic_user_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('sic_user_profile_updated', handleProfileUpdate);
    };
  }, []);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [profileForm, setProfileForm] = useState({
    first_name: activeUser.first_name || '',
    last_name: activeUser.last_name || '',
    phone_no: activeUser.phone_no ? String(activeUser.phone_no) : '',
    branch: activeUser.branch || 'Computer Science & Engineering',
    domain: activeUser.domain || 'Tech / Coding',
    past_project_repo: activeUser.past_project_repo || '',
    avatar_url: activeUser.avatar_url || '',
  });

  useEffect(() => {
    if (activeUser) {
      setProfileForm({
        first_name: activeUser.first_name || '',
        last_name: activeUser.last_name || '',
        phone_no: activeUser.phone_no ? String(activeUser.phone_no) : '',
        branch: activeUser.branch || 'Computer Science & Engineering',
        domain: activeUser.domain || 'Tech / Coding',
        past_project_repo: activeUser.past_project_repo || '',
        avatar_url: activeUser.avatar_url || '',
      });
    }
  }, [activeUser, isEditingProfile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Please choose an image file smaller than 10MB.');
      return;
    }

    try {
      const compressedBase64 = await compressImage(file, 300, 300, 0.75);
      if (compressedBase64) {
        setProfileForm((prev) => ({
          ...prev,
          avatar_url: compressedBase64,
        }));
      }
    } catch (err) {
      console.warn('Student avatar compression error:', err);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: UserProfile = {
      ...activeUser,
      first_name: String(profileForm.first_name || '').trim(),
      last_name: String(profileForm.last_name || '').trim(),
      phone_no: String(profileForm.phone_no || '').trim(),
      branch: profileForm.branch,
      domain: profileForm.domain,
      past_project_repo: String(profileForm.past_project_repo || '').trim(),
      avatar_url: profileForm.avatar_url,
    };

    if (updatedUser.avatar_url) {
      saveUserAvatar(updatedUser.id, updatedUser.avatar_url);
      if (updatedUser.email) saveUserAvatar(updatedUser.email, updatedUser.avatar_url);
    }

    setActiveUser(updatedUser);
    
    // Save to local storage without avatar_url to prevent QuotaExceededError
    const userWithoutAvatar = { ...updatedUser, avatar_url: '' };
    setMockUser(userWithoutAvatar);

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
        avatar_url: updatedUser.avatar_url,
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


  // Local role state so status changes instantly on approval
  const [activeRole, setActiveRole] = useState<UserRole>(currentUser.role as UserRole);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string>('');

  useEffect(() => {
    setActiveRole(activeUser.role);
  }, [activeUser.role]);

  // Live status check function
  const handleCheckStatus = async () => {
    setCheckingStatus(true);
    setStatusFeedback('');

    const approvedList: string[] = JSON.parse(localStorage.getItem('sic_approved_users') || '[]');
    const isApprovedLocal = approvedList.includes(currentUser.id) || (currentUser.email && approvedList.includes(currentUser.email.toLowerCase()));

    const rejectedList: string[] = JSON.parse(localStorage.getItem('sic_rejected_users') || '[]');
    const isRejectedLocal = rejectedList.includes(currentUser.id) || (currentUser.email && rejectedList.includes(currentUser.email.toLowerCase()));

    if (isApprovedLocal) {
      currentUser.role = 'member';
      setActiveRole('member');
      setMockUser({ ...currentUser, role: 'member' });
      setCheckingStatus(false);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      return;
    }

    if (isRejectedLocal) {
      currentUser.role = 'rejected';
      setActiveRole('rejected');
      setMockUser({ ...currentUser, role: 'rejected' });
      setCheckingStatus(false);
      return;
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: prof } = await supabase.from('student_profiles').select('status').eq('id', currentUser.id).maybeSingle();
        if (prof?.status === 'approved') {
          currentUser.role = 'member';
          setActiveRole('member');
          setMockUser({ ...currentUser, role: 'member' });
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          setCheckingStatus(false);
          return;
        } else if (prof?.status === 'rejected') {
          currentUser.role = 'rejected';
          setActiveRole('rejected');
          setMockUser({ ...currentUser, role: 'rejected' });
          setCheckingStatus(false);
          return;
        }

        const { data: app } = await supabase.from('membership_applications').select('status').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (app?.status === 'approved') {
          currentUser.role = 'member';
          setActiveRole('member');
          setMockUser({ ...currentUser, role: 'member' });
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          setCheckingStatus(false);
          return;
        } else if (app?.status === 'rejected') {
          currentUser.role = 'rejected';
          setActiveRole('rejected');
          setMockUser({ ...currentUser, role: 'rejected' });
          setCheckingStatus(false);
          return;
        }
      } catch (e) {}
    }

    setCheckingStatus(false);
    setStatusFeedback('Your membership application is currently under review by a Core Member.');
  };

  const loadLiveUsers = async () => {
    // Check if current user is approved
    const approvedList: string[] = JSON.parse(localStorage.getItem('sic_approved_users') || '[]');
    if (approvedList.includes(currentUser.id) || (currentUser.email && approvedList.includes(currentUser.email.toLowerCase()))) {
      currentUser.role = 'member';
      setActiveRole('member');
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const liveCore = await fetchLiveCoreMembers();
        setStoredCoreMembers(liveCore);
        const liveStudents = await fetchLiveStudentProfiles();
        setRegisteredStudents(liveStudents);

        const myProfile = liveStudents.find(s => s.id === currentUser.id || (s.email && currentUser.email && s.email.toLowerCase() === currentUser.email.toLowerCase()));
        if (myProfile) {
          if (myProfile.status === 'approved') {
            currentUser.role = 'member';
            setActiveRole('member');
          } else if (myProfile.status === 'rejected') {
            currentUser.role = 'rejected';
            setActiveRole('rejected');
          }
        }
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
  const isApproved = activeRole === 'member' || activeRole === 'core_member' || activeRole === 'admin';

  // Display Names
  const studentFirstName = activeUser.first_name?.trim() || activeUser.email?.split('@')[0] || 'Student';
  const studentFullName = activeUser.last_name
    ? `${studentFirstName} ${activeUser.last_name.trim()}`
    : studentFirstName;
  const studentDomain = activeUser.domain || 'Tech / Coding';

  // Render Pending or Rejected Holding Screen if user is not approved
  if (activeRole === 'pending' || activeRole === 'rejected') {
    const isPending = activeRole === 'pending';
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0284c7] text-white font-['Plus_Jakarta_Sans',sans-serif] p-3 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Soft Ambient Background Orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/30 rounded-full blur-[140px] pointer-events-none" />

        {/* Top Header / Branding Bar */}
        <header className="w-full max-w-2xl flex items-center justify-between mb-4 sm:mb-6 z-20 px-1">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg">
              <div className="w-full h-full bg-[#0f172a] rounded-[14px] flex items-center justify-center font-black text-xs tracking-wider text-white">
                SIC
              </div>
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">SCIENCE AND INNOVATION CLUB</h1>
              <p className="text-[9px] sm:text-[10px] text-cyan-300 font-extrabold">STUDENT MEMBERSHIP PORTAL</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/30 border border-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </header>

        {/* Central Claymorphic Status Card */}
        <div className="w-full max-w-2xl p-5 sm:p-8 rounded-[28px] sm:rounded-[32px] bg-white/10 backdrop-blur-2xl border-2 border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-20 space-y-5 text-center relative overflow-hidden">
          
          {/* Status Badge */}
          <div className="flex justify-center">
            {isPending ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-amber-500/20 border-2 border-amber-400/60 text-amber-300 font-extrabold text-[11px] sm:text-xs uppercase tracking-wider shadow-lg animate-pulse">
                <span className="text-sm sm:text-base">⏳</span>
                <span>Application Pending Core Approval</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-rose-500/20 border-2 border-rose-400/60 text-rose-300 font-extrabold text-[11px] sm:text-xs uppercase tracking-wider shadow-lg">
                <span className="text-sm sm:text-base">❌</span>
                <span>Application Declined</span>
              </div>
            )}
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white tracking-tight">
              {isPending ? 'Membership Under Core Review' : 'Application Status Update'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-200/90 max-w-lg mx-auto font-medium leading-relaxed">
              {isPending ? (
                <>
                  Hello <strong className="text-white">{studentFullName}</strong>! Your registration application to join the Science & Innovation Club is currently queued in the Core Member review roster.
                </>
              ) : (
                <>
                  Your membership application for <strong className="text-white">{studentFullName}</strong> was reviewed and declined by the Core Council.
                </>
              )}
            </p>
          </div>

          {/* Applicant Info Box */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-900/60 border border-white/10 text-left space-y-2 text-xs text-slate-200">
            <p className="text-[10px] uppercase font-black tracking-wider text-cyan-400 pb-1 border-b border-white/10">
              Submitted Student Profile Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Student Name: </span>
                <span className="font-bold text-white">{studentFullName}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Email: </span>
                <span className="font-bold text-cyan-200">{currentUser.email}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Registration No: </span>
                <span className="font-mono font-bold text-amber-300">{currentUser.registration_no || 'Pending Assignment'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Branch & Session: </span>
                <span className="font-bold text-white">{currentUser.branch || 'CSE'} ({currentUser.session || '2025-2029'})</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Domain: </span>
                <span className="font-bold text-purple-300">{currentUser.domain || 'Tech / Coding'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Approval Status: </span>
                <span className={`font-black ${isPending ? 'text-amber-400' : 'text-rose-400'}`}>
                  {isPending ? '⏳ Waiting for Core Member' : '❌ Declined'}
                </span>
              </div>
            </div>
          </div>

          {/* Explanation Banner */}
          {isPending && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200/90 text-left space-y-1">
              <p className="font-bold text-amber-300 flex items-center gap-1.5">
                <span>🛡️</span> Manual Core Member Acceptance Required
              </p>
              <p className="leading-relaxed">
                An executive Core Member must manually review and accept your application in the Core Dashboard before full access to the Student Dashboard (Submit Project, Event Proposals, QR Pass, Chat Hub) is granted.
              </p>
            </div>
          )}

          {/* Feedback message */}
          {statusFeedback && (
            <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-400/40 text-xs text-cyan-200 font-bold">
              {statusFeedback}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              onClick={handleCheckStatus}
              disabled={checkingStatus}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${checkingStatus ? 'animate-spin' : ''}`} />
              <span>{checkingStatus ? 'Checking Status...' : 'Check Approval Status'}</span>
            </button>

            <button
              onClick={onLogout}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white/10 hover:bg-rose-600/30 border border-white/20 text-white font-extrabold text-xs transition-all cursor-pointer active:scale-95"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-['Plus_Jakarta_Sans',sans-serif] selection:bg-emerald-500 selection:text-white relative overflow-x-hidden transition-colors duration-300 ${
      activeTab === 'chat'
        ? 'bg-[#dbe4de] bg-[radial-gradient(#b8c8be_1.25px,transparent_1.25px)] [background-size:24px_24px] text-slate-800 p-1.5 sm:p-4 pb-32 sm:pb-6'
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
                  {getStoredEventRegistrations().filter((r) => r.email.toLowerCase() === currentUser.email.toLowerCase() || r.user_id === currentUser.id).length}
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
              {activeUser.avatar_url ? (
                <img
                  src={activeUser.avatar_url}
                  alt={studentFirstName}
                  className="w-8 h-8 rounded-full object-cover shadow-md shrink-0 border border-indigo-400/50"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-md shrink-0">
                  {studentFirstName[0]}
                </div>
              )}
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
                    {activeUser.avatar_url ? (
                      <img src={activeUser.avatar_url} alt={studentFirstName} className="w-full h-full object-cover" />
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
              
              {/* PENDING / REJECTED STATUS BANNER */}
              {['pending'].includes(activeRole) && (
                <div className="p-4 sm:p-5 rounded-[24px] bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-600/20 border-2 border-amber-400/50 shadow-lg text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-md animate-pulse">
                      ⏳
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-amber-950">
                        Membership Application Pending Core Member Approval
                      </h3>
                      <p className="text-xs font-semibold text-amber-900/90 leading-relaxed">
                        Welcome! Your registration to join SIC Club is submitted and awaiting manual approval by an executive Core Member.
                      </p>
                    </div>
                  </div>
                  <span className="px-3.5 py-1.5 rounded-full bg-amber-500 text-white font-black text-[11px] uppercase tracking-wider shadow-sm shrink-0 whitespace-nowrap">
                    Pending Core Approval
                  </span>
                </div>
              )}

              {currentUser.role === 'rejected' && (
                <div className="p-4 sm:p-5 rounded-[24px] bg-gradient-to-r from-rose-500/20 via-red-500/15 to-rose-600/20 border-2 border-rose-400/50 shadow-lg text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-md">
                      ❌
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-rose-950">
                        Membership Application Declined
                      </h3>
                      <p className="text-xs font-semibold text-rose-900/90 leading-relaxed">
                        Your application was reviewed and declined by the Core Committee. Contact club administration for details.
                      </p>
                    </div>
                  </div>
                  <span className="px-3.5 py-1.5 rounded-full bg-rose-600 text-white font-black text-[11px] uppercase tracking-wider shadow-sm shrink-0 whitespace-nowrap">
                    Application Declined
                  </span>
                </div>
              )}

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
                const userRegs = getStoredEventRegistrations().filter(
                  (r) => r.email.toLowerCase() === currentUser.email.toLowerCase() || r.user_id === currentUser.id
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

                return (
                  <div className="space-y-4">
                    {registeredEventList.length === 0 ? (
                      <div className="p-8 sm:p-12 rounded-[32px] bg-white/50 border border-dashed border-slate-300 text-center space-y-3">
                        <div className="w-14 h-14 rounded-3xl bg-sky-50 text-sky-600 mx-auto flex items-center justify-center font-black text-2xl">
                          🎟️
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900">No Registered Passes</h3>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-sm mx-auto">
                          Once you register for an event from the 'Event' tab, your verified digital pass will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {registeredEventList.map((pass) => (
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
                    )}
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
            <div className="w-full h-full flex-1 min-h-0 rounded-[28px] sm:rounded-[38px] overflow-hidden flex flex-col clay-container border-4 sm:border-[6px] border-[#eaf1ec] shadow-[20px_24px_48px_rgba(145,170,158,0.5),-16px_-16px_36px_rgba(255,255,255,0.95)] pb-[88px] sm:pb-0">
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
                {(() => {
                  const userRegs = getStoredEventRegistrations().filter(
                    (r) => r.email.toLowerCase() === currentUser.email.toLowerCase() || r.user_id === currentUser.id
                  );
                  const allEvents = getAllAnnouncedEvents();

                  const registeredEventList = userRegs.map(reg => {
                    const ev = allEvents.find(e => e.id === reg.event_id);
                    return {
                      id: reg.id,
                      title: ev ? ev.title : 'Club Workshop Pass',
                      time: ev ? `${new Date(ev.event_starts_at).toLocaleDateString()} | ${new Date(ev.event_starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Upcoming Schedule',
                      loc: ev ? ev.venue : 'Main Seminar Hall',
                      status: reg.status === 'confirmed' ? 'CONFIRMED PASS ✓' : `WAITLIST #${reg.waitlist_position || 1}`
                    };
                  });

                  if (registeredEventList.length === 0) {
                    return (
                      <div className="py-8 text-center space-y-2">
                        <Ticket className="w-10 h-10 text-slate-700 mx-auto opacity-20" />
                        <p className="text-xs text-slate-400 font-bold">No Active Event Passes</p>
                      </div>
                    );
                  }

                  return registeredEventList.map((ev) => (
                    <div key={ev.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800">
                          {ev.status}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">📍 {ev.loc}</span>
                      </div>
                      <h4 className="text-sm font-black text-white">{ev.title}</h4>
                      <p className="text-xs text-slate-400">📅 {ev.time}</p>
                    </div>
                  ));
                })()}
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
                {/* PROFILE PICTURE SELECTION SECTION */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <label className="block text-xs font-black uppercase text-slate-300">
                    Profile Picture / Avatar
                  </label>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Preview Circle */}
                    <div className="relative group shrink-0">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-1 shadow-xl border-2 border-indigo-500/50 flex items-center justify-center overflow-hidden">
                        {profileForm.avatar_url ? (
                          <img
                            src={profileForm.avatar_url}
                            alt="Profile Preview"
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-2xl">
                            {studentFirstName[0]}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-slate-950/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold cursor-pointer"
                        title="Change Photo"
                      >
                        <Camera className="w-6 h-6 text-white drop-shadow" />
                      </button>
                    </div>

                    {/* Actions & Preset Selection */}
                    <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
                      <p className="text-xs text-slate-300 font-semibold">
                        Select device photo or pick a 3D avatar:
                      </p>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        {/* Upload Local File Button */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Device Photo</span>
                        </button>

                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileUpload}
                        />

                        {profileForm.avatar_url && (
                          <button
                            type="button"
                            onClick={() => setProfileForm({ ...profileForm, avatar_url: '' })}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs transition-all cursor-pointer active:scale-95"
                          >
                            Remove Photo
                          </button>
                        )}
                      </div>

                      {/* Cool Preset Avatar Thumbnails */}
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Instant 3D Presets:
                        </p>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                          {[
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                            'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
                            'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
                            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
                            'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80',
                          ].map((url, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setProfileForm({ ...profileForm, avatar_url: url })}
                              className={`w-8 h-8 rounded-full overflow-hidden border-2 shrink-0 transition-transform cursor-pointer hover:scale-110 ${
                                profileForm.avatar_url === url ? 'border-purple-400 ring-2 ring-purple-500/50 scale-105' : 'border-slate-700 opacity-80 hover:opacity-100'
                              }`}
                            >
                              <img src={url} alt={`Preset ${i + 1}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Or Custom URL Input */}
                  <div className="pt-1">
                    <input
                      type="url"
                      value={profileForm.avatar_url}
                      onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })}
                      placeholder="Or paste image URL (e.g. https://...)"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>
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
      <div className="lg:hidden fixed bottom-2.5 left-3 right-3 z-40 clay-pill bg-[#eef2f9]/95 backdrop-blur-2xl border border-white py-1 px-2 flex items-center justify-around shadow-[0_12px_28px_rgba(150,165,205,0.38)] max-w-md mx-auto">
        <button
          onClick={() => setActiveTab('portal')}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-0.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'portal' 
              ? 'bg-[#dfe6f5] text-indigo-600 font-black shadow-[inset_2px_2px_4px_rgba(150,165,205,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-indigo-600" />
          <span className="text-[9px] font-bold leading-none">Portal</span>
        </button>

        <button
          onClick={() => setActiveTab('registrations')}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-0.5 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'registrations' 
              ? 'bg-[#e0f2fe] text-sky-800 font-black shadow-[inset_2px_2px_4px_rgba(56,189,248,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <Ticket className="w-4 h-4 text-sky-600" />
          <span className="text-[9px] font-bold leading-none">Event</span>
          {getStoredEventRegistrations().filter((r) => r.email.toLowerCase() === currentUser.email.toLowerCase() || r.user_id === currentUser.id).length > 0 && (
            <span className="absolute -top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-sky-500 text-white text-[8px] font-black flex items-center justify-center">
              {getStoredEventRegistrations().filter((r) => r.email.toLowerCase() === currentUser.email.toLowerCase() || r.user_id === currentUser.id).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-0.5 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'announcements' 
              ? 'bg-[#ede9fe] text-purple-800 font-black shadow-[inset_2px_2px_4px_rgba(139,92,246,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4 text-amber-500" />
          <span className="text-[9px] font-bold leading-none">Notices</span>
          {announcements.length > 0 && (
            <span className="absolute -top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center">
              {announcements.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-0.5 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'projects' 
              ? 'bg-[#e0f2fe] text-blue-800 font-black shadow-[inset_2px_2px_4px_rgba(6,182,212,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <Rocket className="w-4 h-4 text-indigo-600" />
          <span className="text-[9px] font-bold leading-none">Projects</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-0.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'chat' 
              ? 'bg-[#d1fae5] text-emerald-800 font-black shadow-[inset_2px_2px_4px_rgba(16,185,129,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <MessagesSquare className="w-4 h-4 text-emerald-600" />
          <span className="text-[9px] font-bold leading-none">Chat</span>
        </button>
      </div>

    </div>
  );
}
