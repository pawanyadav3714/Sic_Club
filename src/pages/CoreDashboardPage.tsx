import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, MembershipApplication, Announcement, EventProposal, EventCategory } from '../types';
import {
  supabase,
  isSupabaseConfigured,
  SUPABASE_SQL_MIGRATION,
  INITIAL_ANNOUNCEMENTS,
  getStoredCoreMembers,
  saveCoreMember,
  getStoredAnnouncements,
  fetchLiveAnnouncements,
  saveAnnouncement,
  deleteStoredAnnouncement,
  deleteStoredCoreMember,
  setMockUser,
  getMockUser,
  fixProfileName,
  resetStudentProfilesToDefaults
} from '../lib/supabase';
import DirectChatWorkspace from '../components/DirectChatWorkspace';
import EventProposalsManager from '../components/EventProposalsManager';
import { getStoredEvents, saveEventProposal } from '../lib/eventStorage';
import { markMessagesAsDelivered, markUserPresence } from '../lib/chatStore';
import {
  ShieldAlert,
  Users,
  Bell,
  Database,
  Search,
  Filter,
  ExternalLink,
  Sparkles,
  Copy,
  Check,
  Clock,
  UserCheck,
  UserX,
  RotateCcw,
  Layers,
  Hash,
  BookOpen,
  Calendar,
  Mail,
  Github,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  LogOut,
  ArrowRight,
  Crown,
  MapPin,
  Calendar as CalendarIcon,
  Tag,
  Trash2,
  Award,
  UserPlus,
  Activity,
  AlertTriangle,
  Zap,
  Radio,
  FileText,
  PieChart,
  Terminal,
  Shield,
  Sliders,
  XCircle,
  CheckCircle,
  User,
  Phone,
  MessageSquare,
  MessagesSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CoreDashboardPageProps {
  currentUser: UserProfile;
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

const DOMAINS_LIST = [
  'All Domains',
  'Tech / Coding',
  'Video Editing',
  'Event Management',
  'Tech Fest Management',
  'Post Design & Graphics',
  'Research & Innovation',
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

export default function CoreDashboardPage({ currentUser, onNavigate, onLogout }: CoreDashboardPageProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'applications' | 'members' | 'rejected' | 'events' | 'announcements' | 'council' | 'sql' | 'chat'>('dashboard');
  const [applications, setApplications] = useState<MembershipApplication[]>([]);
  const [approvedMembers, setApprovedMembers] = useState<UserProfile[]>([]);
  const [rejectedStudents, setRejectedStudents] = useState<UserProfile[]>([]);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => getStoredAnnouncements());
  const [eventProposals, setEventProposals] = useState(() => getStoredEvents());
  
  // Multi-Core Council Management
  const [activeCoreUser, setActiveCoreUser] = useState<UserProfile>(() => fixProfileName(currentUser));
  const [coreCouncilList, setCoreCouncilList] = useState<UserProfile[]>(() => {
    const list = getStoredCoreMembers().map(fixProfileName);
    if (currentUser && (currentUser.role === 'core_member' || currentUser.role === 'admin')) {
      if (!list.some(c => c.id === currentUser.id || (c.email && currentUser.email && c.email.toLowerCase() === currentUser.email.toLowerCase()))) {
        list.unshift(fixProfileName(currentUser));
      }
    }
    return list;
  });

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomainFilter, setSelectedDomainFilter] = useState('All Domains');
  const [isExcelView, setIsExcelView] = useState(false);

  // Announcements form
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [annCategory, setAnnCategory] = useState<'Event Notice' | 'Workshop' | 'Hackathon' | 'Recruitment' | 'General Notice'>('Event Notice');
  const [eventDate, setEventDate] = useState('2026-11-20');
  const [eventLocation, setEventLocation] = useState('Main University Auditorium & Innovation Lab');
  const [copiedSql, setCopiedSql] = useState(false);

  // Profile & Notices Modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutPopover, setShowLogoutPopover] = useState(false);

  // Add Core Member Form Modal
  const [showAddCoreModal, setShowAddCoreModal] = useState(false);
  const [newCoreFirst, setNewCoreFirst] = useState('');
  const [newCoreLast, setNewCoreLast] = useState('');
  const [newCoreEmail, setNewCoreEmail] = useState('');
  const [newCoreDesignation, setNewCoreDesignation] = useState('Technical & AI Lead');

  // Action status toast
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'danger' | 'info' } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync activeCoreUser and presence heartbeat
  useEffect(() => {
    if (currentUser) {
      setActiveCoreUser(currentUser);
      const heartbeat = () => {
        markUserPresence(currentUser.id);
        if (currentUser.email) markUserPresence(currentUser.email);
        markMessagesAsDelivered(currentUser.id);
        if (currentUser.email) markMessagesAsDelivered(currentUser.email);
      };
      heartbeat();
      const interval = setInterval(heartbeat, 8000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Supabase Realtime Subscription & Multi-Tab Broadcast Listener
  useEffect(() => {
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

    const handleNoticeUpdate = (e: any) => {
      if (e.detail) {
        setAnnouncements(e.detail);
      } else {
        setAnnouncements(getStoredAnnouncements());
      }
    };

    window.addEventListener('sic_announcements_updated', handleNoticeUpdate);
    window.addEventListener('storage', handleNoticeUpdate);

    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('schema-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'student_profiles' }, () => {
          loadData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'core_members' }, () => {
          loadData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
          loadData();
        })
        .subscribe();
    }

    return () => {
      window.removeEventListener('sic_announcements_updated', handleNoticeUpdate);
      window.removeEventListener('storage', handleNoticeUpdate);
      if (bc) bc.close();
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Event Proposals sync listener
  useEffect(() => {
    const handleEventsSync = (e: any) => {
      if (e?.detail) setEventProposals(e.detail);
      else setEventProposals(getStoredEvents());
    };
    window.addEventListener('sic_events_updated', handleEventsSync);
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('sic_events_channel');
        bc.onmessage = (msg) => {
          if (msg.data?.events) setEventProposals(msg.data.events);
        };
      }
    } catch (e) {}
    return () => {
      window.removeEventListener('sic_events_updated', handleEventsSync);
      if (bc) bc.close();
    };
  }, []);

  const showNotification = (message: string, type: 'success' | 'danger' | 'info' = 'success') => {
    setActionFeedback({ message, type });
    setTimeout(() => {
      setActionFeedback(null);
    }, 4500);
  };

  const exportCouncilToExcel = () => {
    // ... existing ...
  };

  const exportStudentMembersToExcel = () => {
    const data = approvedMembers.map(m => ({
      'Name': `${m.first_name} ${m.last_name}`,
      'Email': m.email,
      'REG': m.registration_no || 'N/A',
      'Domain': m.domain || 'N/A',
      'Branch': m.branch || 'N/A',
      'Session': m.session || 'N/A',
      'Mobile': m.phone_no || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Members');
    XLSX.writeFile(workbook, 'Student_Members.xlsx');
  };

  // Load all student details, pending requests, accepted members, and declined applications
  const loadData = async () => {
    setIsRefreshing(true);

    // Auto-clean any legacy core member applications from local cache
    try {
      const rawApps: MembershipApplication[] = JSON.parse(localStorage.getItem('sic_membership_applications') || '[]');
      const storedCoreList = getStoredCoreMembers();
      const cEmails = new Set(storedCoreList.map((c) => c.email ? c.email.toLowerCase() : '').filter(Boolean));
      const cIds = new Set(storedCoreList.map((c) => c.id).filter(Boolean));

      const cleanApps = rawApps.filter((app) => {
        const u = app.user;
        if (u?.role === 'core_member' || u?.role === 'admin') return false;
        if (u?.email && cEmails.has(u.email.toLowerCase())) return false;
        if (app.user_id && cIds.has(app.user_id)) return false;
        return true;
      });
      if (cleanApps.length !== rawApps.length) {
        localStorage.setItem('sic_membership_applications', JSON.stringify(cleanApps));
      }
    } catch (e) {}

    const approvedList: string[] = JSON.parse(localStorage.getItem('sic_approved_users') || '[]');
    const rejectedList: string[] = JSON.parse(localStorage.getItem('sic_rejected_users') || '[]');

    let allProfilesList: UserProfile[] = [];
    let pendingApps: MembershipApplication[] = [];
    let membersList: UserProfile[] = [];
    let declinedList: UserProfile[] = [];
    let liveCoreList: UserProfile[] = [];

    // 1. Fetch remote Supabase records if connected (PRIMARY SOURCE OF TRUTH)
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: studentData, error: sErr } = await supabase.from('student_profiles').select('*').order('created_at', { ascending: false });
        if (!sErr && studentData) {
          allProfilesList = studentData.map(s => fixProfileName({
            ...s,
            role: s.status === 'rejected' ? ('rejected' as const) : ('member' as const)
          }));
          try {
            localStorage.setItem('sic_registered_users', JSON.stringify(allProfilesList));
          } catch (e) {}
        }
      } catch (e) {
        console.warn('Error fetching student profiles:', e);
      }

      try {
        const { data: coreData, error: cErr } = await supabase.from('core_members').select('*').order('created_at', { ascending: false });
        if (!cErr && coreData) {
          liveCoreList = coreData.map(c => fixProfileName({ ...c, role: 'core_member' as const }));
          try {
            localStorage.setItem('sic_core_members', JSON.stringify(liveCoreList));
          } catch (e) {}
        }
      } catch (e) {
        console.warn('Error fetching core members:', e);
      }

      try {
        const { data: appsData, error: aErr } = await supabase
          .from('membership_applications')
          .select('*')
          .order('created_at', { ascending: false });

        if (!aErr && appsData && appsData.length > 0) {
          appsData.forEach((app) => {
            const matchedUser = allProfilesList.find(p => p.id === app.user_id || (p.email && app.email && p.email.toLowerCase() === app.email.toLowerCase()));
            const isCore = liveCoreList.some(c => c.id === app.user_id || (c.email && app.email && c.email.toLowerCase() === app.email.toLowerCase()));
            if (app.status === 'pending' && !isCore) {
              pendingApps.push({
                ...app,
                user: matchedUser || app.user
              });
            }
          });
        }
      } catch (e) {
        console.warn('Error fetching membership applications:', e);
      }
    } else {
      // Local fallback only if Supabase is completely unconfigured
      liveCoreList = getStoredCoreMembers();
      try {
        const localRegistered: UserProfile[] = JSON.parse(localStorage.getItem('sic_registered_users') || '[]');
        allProfilesList = localRegistered;
      } catch (e) {}
    }

    const coreMemberEmails = new Set(liveCoreList.map((c) => c.email ? c.email.toLowerCase() : '').filter(Boolean));
    const coreMemberIds = new Set(liveCoreList.map((c) => c.id).filter(Boolean));

    const checkIsCore = (u?: UserProfile, uid?: string) => {
      if (!u && !uid) return false;
      if (u?.role === 'core_member' || u?.role === 'admin') return true;
      if (u?.email && coreMemberEmails.has(u.email.toLowerCase())) return true;
      if (u?.id && coreMemberIds.has(u.id)) return true;
      if (uid && coreMemberIds.has(uid)) return true;
      return false;
    };

    // Categorize all registered non-core profiles into Approved, Rejected, or Pending
    allProfilesList.forEach((prof) => {
      if (checkIsCore(prof, prof.id)) return;

      const isApproved =
        prof.status === 'approved' ||
        approvedList.includes(prof.id) ||
        (prof.email && approvedList.includes(prof.email.toLowerCase()));

      const isRejected =
        prof.status === 'rejected' ||
        prof.role === 'rejected' ||
        rejectedList.includes(prof.id) ||
        (prof.email && rejectedList.includes(prof.email.toLowerCase()));

      if (isApproved && !isRejected) {
        if (!membersList.some((m) => m.id === prof.id || (m.email && prof.email && m.email.toLowerCase() === prof.email.toLowerCase()))) {
          membersList.push(prof);
        }
      } else if (isRejected) {
        if (!declinedList.some((d) => d.id === prof.id || (d.email && prof.email && d.email.toLowerCase() === prof.email.toLowerCase()))) {
          declinedList.push(prof);
        }
      } else {
        // Pending
        const inPending = pendingApps.some(
          (a) => a.user_id === prof.id || (a.user?.email && prof.email && a.user.email.toLowerCase() === prof.email.toLowerCase())
        );
        if (!inPending) {
          pendingApps.push({
            id: 'app-' + prof.id,
            user_id: prof.id,
            selected_post_id: '11111111-1111-4111-a111-111111111111',
            past_project_repo: prof.past_project_repo,
            status: 'pending',
            created_at: prof.created_at,
            user: prof,
          });
        }
      }
    });

    const studentPendingApps = pendingApps.filter((a) => !checkIsCore(a.user, a.user_id));

    const uniqueByField = <T extends { id?: string; email?: string; user_id?: string }>(arr: T[]): T[] => {
      const seen = new Set<string>();
      return arr.filter((item) => {
        if (!item) return false;
        const key = (item.id || item.user_id || item.email || '').toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    setAllProfiles(uniqueByField(allProfilesList.map(fixProfileName)));
    setApplications(uniqueByField(studentPendingApps.map(a => ({ ...a, user: a.user ? fixProfileName(a.user) : undefined }))));
    setApprovedMembers(uniqueByField(membersList.map(fixProfileName)));
    setRejectedStudents(uniqueByField(declinedList.map(fixProfileName)));
    setCoreCouncilList(uniqueByField(liveCoreList.map(fixProfileName)));
    try {
      const liveNotices = await fetchLiveAnnouncements();
      if (liveNotices) setAnnouncements(liveNotices);
    } catch (e) {}
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  // ADMIN ACTION: Accept student as a member
  const handleApprove = async (userId: string, studentName?: string) => {
    const targetApp = applications.find((a) => a.user_id === userId);
    const targetUser = targetApp?.user || allProfiles.find((p) => p.id === userId);
    const userEmail = targetUser?.email?.toLowerCase();
    const displayName = studentName || (targetUser ? `${targetUser.first_name} ${targetUser.last_name}` : 'Student');

    // 1. Update localStorage approved list
    const approvedList: string[] = JSON.parse(localStorage.getItem('sic_approved_users') || '[]');
    if (!approvedList.includes(userId)) approvedList.push(userId);
    if (userEmail && !approvedList.includes(userEmail)) approvedList.push(userEmail);
    localStorage.setItem('sic_approved_users', JSON.stringify(approvedList));

    // 2. Remove from localStorage rejected list if previously there
    const rejectedList: string[] = JSON.parse(localStorage.getItem('sic_rejected_users') || '[]');
    const updatedRejected = rejectedList.filter((id) => id !== userId && id !== userEmail);
    localStorage.setItem('sic_rejected_users', JSON.stringify(updatedRejected));

    // 3. Update local applications cache & registered users
    const storedApps: MembershipApplication[] = JSON.parse(localStorage.getItem('sic_membership_applications') || '[]');
    const updatedApps = storedApps.map((a) => (a.user_id === userId || (a.user?.email && userEmail && a.user.email.toLowerCase() === userEmail) ? { ...a, status: 'approved' as const } : a));
    localStorage.setItem('sic_membership_applications', JSON.stringify(updatedApps));

    try {
      const registeredUsers: UserProfile[] = JSON.parse(localStorage.getItem('sic_registered_users') || '[]');
      const regIdx = registeredUsers.findIndex(u => u.id === userId || (u.email && userEmail && u.email.toLowerCase() === userEmail));
      if (regIdx >= 0) {
        registeredUsers[regIdx] = { ...registeredUsers[regIdx], status: 'approved', role: 'member' };
        localStorage.setItem('sic_registered_users', JSON.stringify(registeredUsers));
      }
    } catch (e) {}

    const mock = getMockUser();
    if (mock && (mock.id === userId || (mock.email && userEmail && mock.email.toLowerCase() === userEmail))) {
      setMockUser({ ...mock, role: 'member' });
    }

    // 4. Update Supabase if available
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('membership_applications').update({ status: 'approved' }).eq('user_id', userId);
        await supabase.from('student_profiles').update({ status: 'approved' }).eq('id', userId);
      } catch (e) {}
    }

    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    showNotification(`Accepted ${displayName} into SIC Club Member Roster!`, 'success');
    loadData();
  };

  // ADMIN ACTION: Decline student application
  const handleDecline = async (userId: string, studentName?: string) => {
    const targetApp = applications.find((a) => a.user_id === userId);
    const targetUser = targetApp?.user || allProfiles.find((p) => p.id === userId);
    const userEmail = targetUser?.email?.toLowerCase();
    const displayName = studentName || (targetUser ? `${targetUser.first_name} ${targetUser.last_name}` : 'Student');

    // 1. Update localStorage rejected list
    const rejectedList: string[] = JSON.parse(localStorage.getItem('sic_rejected_users') || '[]');
    if (!rejectedList.includes(userId)) rejectedList.push(userId);
    if (userEmail && !rejectedList.includes(userEmail)) rejectedList.push(userEmail);
    localStorage.setItem('sic_rejected_users', JSON.stringify(rejectedList));

    // 2. Remove from approved list
    const approvedList: string[] = JSON.parse(localStorage.getItem('sic_approved_users') || '[]');
    const updatedApproved = approvedList.filter((id) => id !== userId && id !== userEmail);
    localStorage.setItem('sic_approved_users', JSON.stringify(updatedApproved));

    // 3. Update local applications cache & registered users
    const storedApps: MembershipApplication[] = JSON.parse(localStorage.getItem('sic_membership_applications') || '[]');
    const updatedApps = storedApps.map((a) => (a.user_id === userId || (a.user?.email && userEmail && a.user.email.toLowerCase() === userEmail) ? { ...a, status: 'rejected' as const } : a));
    localStorage.setItem('sic_membership_applications', JSON.stringify(updatedApps));

    try {
      const registeredUsers: UserProfile[] = JSON.parse(localStorage.getItem('sic_registered_users') || '[]');
      const regIdx = registeredUsers.findIndex(u => u.id === userId || (u.email && userEmail && u.email.toLowerCase() === userEmail));
      if (regIdx >= 0) {
        registeredUsers[regIdx] = { ...registeredUsers[regIdx], status: 'rejected', role: 'rejected' };
        localStorage.setItem('sic_registered_users', JSON.stringify(registeredUsers));
      }
    } catch (e) {}

    const mock = getMockUser();
    if (mock && (mock.id === userId || (mock.email && userEmail && mock.email.toLowerCase() === userEmail))) {
      setMockUser({ ...mock, role: 'rejected' });
    }

    // 4. Update Supabase if available
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('membership_applications').update({ status: 'rejected' }).eq('user_id', userId);
        await supabase.from('student_profiles').update({ status: 'rejected' }).eq('id', userId);
      } catch (e) {}
    }

    showNotification(`Declined application for ${displayName}. Updated in Admin Registry.`, 'danger');
    loadData();
  };

  // ADMIN ACTION: Delete student profile & remove from Active Club Roster
  const handleDeleteStudent = async (userId: string, studentName?: string) => {
    const targetUser = approvedMembers.find((m) => m.id === userId) || allProfiles.find((p) => p.id === userId);
    const emailLower = targetUser?.email?.toLowerCase();
    const displayName = studentName || (targetUser ? `${targetUser.first_name} ${targetUser.last_name}` : 'Student');

    // 1. Remove from approved list
    const approvedList: string[] = JSON.parse(localStorage.getItem('sic_approved_users') || '[]');
    const updatedApproved = approvedList.filter(
      (id) => id !== userId && (!emailLower || id !== emailLower)
    );
    localStorage.setItem('sic_approved_users', JSON.stringify(updatedApproved));

    // 2. Remove from rejected list
    const rejectedList: string[] = JSON.parse(localStorage.getItem('sic_rejected_users') || '[]');
    const updatedRejected = rejectedList.filter(
      (id) => id !== userId && (!emailLower || id !== emailLower)
    );
    localStorage.setItem('sic_rejected_users', JSON.stringify(updatedRejected));

    // 3. Remove from registered users
    const registeredUsers: UserProfile[] = JSON.parse(localStorage.getItem('sic_registered_users') || '[]');
    const updatedRegistered = registeredUsers.filter(
      (u) => u.id !== userId && (!emailLower || u.email?.toLowerCase() !== emailLower)
    );
    localStorage.setItem('sic_registered_users', JSON.stringify(updatedRegistered));

    // 4. Remove from membership applications
    const storedApps: MembershipApplication[] = JSON.parse(localStorage.getItem('sic_membership_applications') || '[]');
    const updatedApps = storedApps.filter(
      (a) => a.user_id !== userId && (!emailLower || a.user?.email?.toLowerCase() !== emailLower)
    );
    localStorage.setItem('sic_membership_applications', JSON.stringify(updatedApps));

    // 5. If current mock session belongs to deleted user, clear mock session
    const mock = getMockUser();
    if (mock && (mock.id === userId || (mock.email && emailLower && mock.email.toLowerCase() === emailLower))) {
      localStorage.removeItem('sic_mock_user');
    }

    // 6. Delete from Supabase if connected
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('membership_applications').delete().eq('user_id', userId);
      } catch (e) {}
      try {
        await supabase.from('student_profiles').delete().eq('id', userId);
      } catch (e) {}
    }

    showNotification(`Deleted profile for ${displayName}. They must re-register & await approval to rejoin.`, 'danger');
    loadData();
  };

  // ADMIN ACTION: Clear all registered student and core member emails & database records
  const handleClearAllDatabaseRecords = async () => {
    if (!window.confirm('Are you sure you want to clear all registered student and core member emails, applications, and database records? This will allow fresh registrations without email conflicts.')) {
      return;
    }
    try {
      localStorage.removeItem('sic_registered_users');
      localStorage.removeItem('sic_core_members');
      localStorage.removeItem('sic_membership_applications');
      localStorage.removeItem('sic_approved_users');
      localStorage.removeItem('sic_rejected_users');
      localStorage.removeItem('sic_mock_user');
      localStorage.removeItem('sic_pending_registration');

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('student_profiles').delete().neq('id', 'none');
          await supabase.from('membership_applications').delete().neq('id', 'none');
        } catch (e) {}
      }

      showNotification('All student and core member registered emails and database records have been cleared!', 'success');
      loadData();
    } catch (e: any) {
      showNotification('Error clearing database records: ' + (e.message || 'Unknown error'), 'danger');
    }
  };

  // ADMIN ACTION: Post new event notice / announcement
  const handlePostNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const authorProfile = activeCoreUser;

    const notice: Announcement = {
      id: 'ann-' + Date.now().toString(36),
      title: newTitle.trim(),
      content: newContent.trim(),
      author_id: authorProfile.id,
      author_name: `${authorProfile.first_name} ${authorProfile.last_name}`,
      author_role: authorProfile.designation || 'Executive Core Member',
      author_avatar: authorProfile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120',
      category: annCategory,
      event_date: eventDate,
      event_location: eventLocation,
      created_at: new Date().toISOString(),
    };

    const updated = saveAnnouncement(notice);
    setAnnouncements(updated);

    // Also automatically register an active event proposal with full registration capabilities
    const annCategoryMap: Record<string, EventCategory> = {
      'Workshop': 'workshop',
      'Hackathon': 'fest_hackathon',
      'Event Notice': 'competition',
      'General Notice': 'seminar_lecture',
      'Recruitment': 'internal_meeting',
    };

    const newEvent: EventProposal = {
      id: 'ev-' + notice.id,
      title: notice.title,
      summary: notice.content.split('\n')[0] || notice.title,
      description: notice.content,
      category: annCategoryMap[notice.category || 'Event Notice'] || 'workshop',
      venue: notice.event_location || 'Main University Auditorium & Innovation Lab',
      cover_image_path: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
      event_starts_at: notice.event_date ? `${notice.event_date}T10:00` : new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 16),
      event_ends_at: notice.event_date ? `${notice.event_date}T17:00` : new Date(Date.now() + 86400000 * 5 + 25200000).toISOString().slice(0, 16),
      registration_opens_at: new Date().toISOString().slice(0, 16),
      registration_closes_at: notice.event_date ? `${notice.event_date}T09:00` : new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 16),
      capacity: 60,
      registered_count: 0,
      waitlist_count: 0,
      visibility: 'public',
      assigned_team: 'Organizing Core Team',
      status: 'published',
      submitted_by_id: authorProfile.id,
      submitted_by_name: `${authorProfile.first_name} ${authorProfile.last_name}`,
      submitted_by_role: authorProfile.designation || 'Executive Core Member',
      reviewed_by_id: authorProfile.id,
      reviewed_by_name: `${authorProfile.first_name} ${authorProfile.last_name}`,
      reviewed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveEventProposal(newEvent);

    setNewTitle('');
    setNewContent('');

    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    showNotification(`Notice "${notice.title}" officially announced and published to lobby & student portals!`, 'success');
  };

  // ADMIN ACTION: Delete notice
  const handleDeleteNotice = (id: string) => {
    const updated = deleteStoredAnnouncement(id);
    setAnnouncements(updated);
    showNotification('Event Notice removed from public feed.', 'info');
  };

  // ADMIN ACTION: Add new core lead member
  const handleAddCoreMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoreFirst.trim() || !newCoreLast.trim() || !newCoreEmail.trim()) return;

    const cleanEmail = newCoreEmail.trim().toLowerCase();
    const newCore: UserProfile = {
      id: 'core-' + cleanEmail.split('@')[0] + '-' + Date.now().toString(36),
      first_name: newCoreFirst.trim(),
      last_name: newCoreLast.trim(),
      email: cleanEmail,
      branch: 'Computer Science & Engineering',
      registration_no: Math.floor(10000000000 + Math.random() * 90000000000).toString(),
      session: 'Faculty & Core Council',
      domain: newCoreDesignation || 'Club Administration',
      designation: newCoreDesignation,
      role: 'core_member',
      created_at: new Date().toISOString(),
    };

    saveCoreMember(newCore);
    setCoreCouncilList(getStoredCoreMembers());
    setNewCoreFirst('');
    setNewCoreLast('');
    setNewCoreEmail('');
    setShowAddCoreModal(false);

    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    showNotification(`Core Member ${newCore.first_name} ${newCore.last_name} added to Core Council!`, 'success');
  };

  // Filtered lists
  const filteredApps = applications.filter((app) => {
    const u = app.user;
    if (!u) return true;
    const matchesSearch =
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.registration_no && String(u.registration_no).toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDomain = selectedDomainFilter === 'All Domains' || u.domain === selectedDomainFilter;
    return matchesSearch && matchesDomain;
  });

  const filteredMembers = approvedMembers.filter((m) => {
    const matchesSearch =
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.registration_no && String(m.registration_no).toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDomain = selectedDomainFilter === 'All Domains' || m.domain === selectedDomainFilter;
    return matchesSearch && matchesDomain;
  });

  return (
    <div className={`min-h-screen bg-gradient-to-br from-[#e6edf5] via-[#f2f4f8] to-[#e0f2fe] text-slate-800 flex font-['Plus_Jakarta_Sans',sans-serif] relative overflow-x-hidden selection:bg-purple-500 selection:text-slate-900 ${
      activeTab === 'chat' ? 'p-1.5 sm:p-4 pb-20 sm:pb-6' : 'p-2 sm:p-4 pb-28'
    }`}>
      {/* Glassmorphism Background Ambient Mesh Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-fuchsia-600/25 rounded-full blur-[130px]" />
        <div className="absolute -bottom-32 left-1/4 w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[140px]" />
        <div className="absolute top-2/3 left-10 w-80 h-80 bg-purple-600/20 rounded-full blur-[110px]" />
      </div>

      {/* Action Notification Toast */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl backdrop-blur-2xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-bold max-w-md ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-400/50 text-emerald-900 shadow-emerald-950/50'
                : actionFeedback.type === 'danger'
                ? 'bg-rose-950/80 border border-rose-400/50 text-rose-200 shadow-rose-950/50'
                : 'bg-indigo-950/80 border border-indigo-400/50 text-indigo-200 shadow-indigo-950/50'
            }`}
          >
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            ) : actionFeedback.type === 'danger' ? (
              <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-indigo-900 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR (GLASSMORPHISM SIDEBAR) */}
      <aside className="w-56 shrink-0 glass-panel rounded-[28px] flex flex-col justify-between hidden md:flex min-h-[96vh] sticky top-4 z-30 select-none p-4 mr-4">
        <div className="space-y-6">
          {/* Top Brand Glass Shield Logo */}
          <div className="flex justify-center pb-4 border-b border-white/10">
            <div className="w-16 h-16 rounded-3xl glass-card flex items-center justify-center relative p-1.5 shadow-[0_0_20px_rgba(168,85,247,0.35)] border border-white/30">
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 border border-white/50 flex items-center justify-center text-slate-900 font-black text-sm tracking-wider shadow-inner">
                S I C
              </div>
            </div>
          </div>

          {/* Sidebar Navigation Options */}
          <div className="space-y-2.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full px-3.5 py-3 rounded-2xl font-extrabold text-xs flex items-center justify-between cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'glass-nav-btn-active'
                  : 'glass-nav-btn text-slate-700 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Activity className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-slate-900' : 'text-purple-400'}`} />
                <span>Sic Dashboard</span>
              </div>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                activeTab === 'dashboard' ? 'bg-white/30 text-slate-900' : 'glass-badge text-cyan-800'
              }`}>LIVE</span>
            </button>


            <button
              onClick={() => setActiveTab('members')}
              className={`w-full px-3.5 py-3 rounded-2xl font-extrabold text-xs flex items-center justify-between cursor-pointer ${
                activeTab === 'members'
                  ? 'glass-nav-btn-active'
                  : 'glass-nav-btn text-slate-700 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className={`w-4 h-4 ${activeTab === 'members' ? 'text-slate-900' : 'text-emerald-400'}`} />
                <span>Members</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-900 border border-emerald-400/40">
                {approvedMembers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('events')}
              className={`w-full px-3.5 py-3 rounded-2xl font-extrabold text-xs flex items-center justify-between cursor-pointer transition-all ${
                activeTab === 'events' || activeTab === 'announcements'
                  ? 'glass-nav-btn-active bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 text-white shadow-lg'
                  : 'glass-nav-btn text-slate-700 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bell className={`w-4 h-4 ${activeTab === 'events' || activeTab === 'announcements' ? 'text-white' : 'text-purple-600'}`} />
                <span>Publish Event Notices</span>
              </div>
              <div className="flex items-center gap-1">
                {eventProposals.filter((p) => p.status === 'pending_review').length > 0 && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-500 text-white animate-pulse">
                    {eventProposals.filter((p) => p.status === 'pending_review').length}
                  </span>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'events' || activeTab === 'announcements' ? 'bg-white/20 text-white' : 'bg-purple-500/20 text-purple-700 border border-purple-400/40'
                }`}>
                  {eventProposals.length}
                </span>
              </div>
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
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            </div>

          {/* Sidebar Section 2: COUNCIL & ACCESS */}
          <div className="space-y-2 pt-3 border-t border-white/10">
            <p className="text-[10px] font-extrabold tracking-widest text-slate-600 uppercase px-3 mb-1">
              COUNCIL & ACCESS
            </p>

            <button
              onClick={() => setActiveTab('council')}
              className={`w-full px-3.5 py-3 rounded-2xl font-extrabold text-xs flex items-center justify-between cursor-pointer ${
                activeTab === 'council'
                  ? 'glass-nav-btn-active'
                  : 'glass-nav-btn text-slate-700 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Crown className={`w-4 h-4 ${activeTab === 'council' ? 'text-slate-900' : 'text-cyan-400'}`} />
                <span>Core-members</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-200 border border-cyan-400/40">
                {coreCouncilList.length}
              </span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer Glass User Card (Navigates to Council Roster) */}
        <div className="p-2.5 rounded-2xl glass-pill flex items-center justify-between">
          <button
            onClick={() => setActiveTab('council')}
            className="flex items-center gap-2 truncate text-left cursor-pointer hover:opacity-80 transition-opacity"
            title="Open Core-members"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-md border border-white/30 shrink-0 relative">
              {activeCoreUser.first_name ? `${activeCoreUser.first_name[0]}${activeCoreUser.last_name ? activeCoreUser.last_name[0] : ''}` : 'SP'}
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-900 truncate">{activeCoreUser.first_name} {activeCoreUser.last_name}</p>
              <p className="text-[10px] text-purple-200 font-semibold truncate">{activeCoreUser.designation || 'Core Council'}</p>
            </div>
          </button>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-xl text-slate-600 hover:text-rose-400 transition-colors shrink-0"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* MAIN BODY AREA */}
      <main className={`flex-1 min-w-0 flex flex-col z-10 ${
        activeTab === 'chat' ? 'space-y-0 h-[calc(100dvh-82px)] sm:h-[calc(100vh-48px)]' : 'space-y-5'
      }`}>
        {/* TOP HEADER BAR (EXACT CLAYMORPHISM MATCHING REFERENCE IMAGE) - ONLY VISIBLE ON DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <header className="px-8 py-6 rounded-[32px] bg-[#f0f4f8] clay-box border border-white flex items-center justify-between sticky top-4 z-20 shadow-[0_20px_50px_rgba(165,180,210,0.45)]">
            <div className="flex items-center gap-4">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-teal-400 via-cyan-500 to-indigo-600 shadow-[0_0_20px_#2dd4bf] shrink-0" />
              <h1 className="text-sm sm:text-base md:text-lg font-black text-[#1e293b] tracking-tight uppercase">
                SCIENCE AND INNOVATION CLUB
              </h1>
            </div>

            <div className="flex items-center gap-6">
              {/* Utility Capsule: Date & Time matching reference */}
              <div className="hidden sm:flex px-5 py-2.5 rounded-full bg-white/90 text-[#0f766e] font-black text-xs items-center gap-3 shadow-[inset_2px_2px_5px_rgba(180,195,225,0.4),inset_-2px_-2px_5px_rgba(255,255,255,0.9)] border border-white">
                <CalendarIcon className="w-4 h-4 text-[#0f766e]" />
                <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '')}</span>
                <span className="text-[#0f766e] font-black">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC</span>
              </div>

              {/* Profile Avatar 3D Clay Button with Lightweight Logout Popover */}
              <div className="relative">
                <button
                  onClick={() => setShowLogoutPopover(!showLogoutPopover)}
                  className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#6366f1] via-[#8b5cf6] to-[#a855f7] text-white font-black text-lg flex items-center justify-center shadow-[0_10px_25px_rgba(99,102,241,0.5),inset_2px_2px_4px_rgba(255,255,255,0.6),inset_-2px_-2px_6px_rgba(0,0,0,0.3)] border-4 border-[#f0f4f8] cursor-pointer hover:scale-105 active:scale-95 transition-all"
                  title="Profile Menu"
                >
                  <span>{activeCoreUser.first_name ? activeCoreUser.first_name[0] : 'S'}</span>
                </button>

                {/* Lightweight Floated Logout Popover */}
                <AnimatePresence>
                  {showLogoutPopover && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-16 w-48 p-2 rounded-2xl bg-[#1e293b] text-white shadow-2xl border border-white/20 z-50 backdrop-blur-xl"
                    >
                      <div className="px-3 py-2 border-b border-white/10 mb-1">
                        <p className="text-xs font-black truncate">{activeCoreUser.first_name} {activeCoreUser.last_name}</p>
                        <p className="text-[10px] text-cyan-400 truncate">{activeCoreUser.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowLogoutPopover(false);
                          onLogout();
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-400" />
                        <span>Log Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>
        )}



        {/* BODY CONTAINER CONTENT */}
        <div className="space-y-6 flex-1">
          {/* TAB 1: SOC OVERVIEW DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">

              {/* OPERATIONAL STATUS / STATS OVERVIEW CARDS GRID (5 BOXES) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2 font-mono">
                    <Activity className="w-4 h-4 text-cyan-600" />
                    <span>Operational Status & Metrics Overview</span>
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-white/60 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/40">
                    Live Sync Active
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {/* Card 1: AWAITING TRIAGE */}
                  <div
                    onClick={() => setActiveTab('applications')}
                    className="p-5 rounded-[28px] bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#d97706] border-2 border-[#fef08a] shadow-[10px_14px_28px_rgba(217,119,6,0.48),-8px_-8px_20px_rgba(255,255,255,0.95),inset_3px_3px_6px_rgba(255,255,255,0.9),inset_-3px_-4px_8px_rgba(120,53,15,0.4)] space-y-3 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[12px_16px_32px_rgba(217,119,6,0.58)] active:translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase font-black tracking-wider text-[#451a03]">AWAITING TRIAGE</span>
                      <div className="p-2.5 rounded-2xl bg-amber-950/20 text-[#451a03] shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.85),inset_-1.5px_-1.5px_3px_rgba(120,53,15,0.4)] border border-amber-400/60">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-3xl sm:text-4xl font-black text-[#451a03] font-mono tracking-tight drop-shadow-sm">{applications.length}</p>
                      <p className="text-[10px] text-[#451a03]/90 font-mono font-black flex items-center gap-1">
                        <span>requires decision</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </p>
                    </div>
                  </div>

                  {/* Card 2: ACTIVE MEMBERS */}
                  <div
                    onClick={() => setActiveTab('members')}
                    className="p-5 rounded-[28px] bg-gradient-to-br from-[#34d399] via-[#059669] to-[#047857] border-2 border-[#6ee7b7] shadow-[10px_14px_28px_rgba(4,120,87,0.48),-8px_-8px_20px_rgba(255,255,255,0.95),inset_3px_3px_6px_rgba(255,255,255,0.9),inset_-3px_-4px_8px_rgba(2,44,34,0.4)] space-y-3 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[12px_16px_32px_rgba(4,120,87,0.58)] active:translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase font-black tracking-wider text-emerald-950">ACTIVE MEMBERS</span>
                      <div className="p-2.5 rounded-2xl bg-emerald-950/20 text-emerald-950 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.85),inset_-1.5px_-1.5px_3px_rgba(2,44,34,0.4)] border border-emerald-300/60">
                        <Zap className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-3xl sm:text-4xl font-black text-emerald-950 font-mono tracking-tight drop-shadow-sm">{approvedMembers.length}</p>
                      <p className="text-[10px] text-emerald-950/90 font-mono font-black flex items-center gap-1">
                        <span>accepted in roster</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </p>
                    </div>
                  </div>

                  {/* Card 3: DECLINED REQS */}
                  <div
                    onClick={() => setActiveTab('rejected')}
                    className="p-5 rounded-[28px] bg-gradient-to-br from-[#fb7185] via-[#e11d48] to-[#9f1239] border-2 border-[#fda4af] shadow-[10px_14px_28px_rgba(159,18,57,0.48),-8px_-8px_20px_rgba(255,255,255,0.95),inset_3px_3px_6px_rgba(255,255,255,0.9),inset_-3px_-4px_8px_rgba(76,5,25,0.4)] space-y-3 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[12px_16px_32px_rgba(159,18,57,0.58)] active:translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase font-black tracking-wider text-rose-950">DECLINED REQS</span>
                      <div className="p-2.5 rounded-2xl bg-rose-950/20 text-rose-950 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.85),inset_-1.5px_-1.5px_3px_rgba(76,5,25,0.4)] border border-rose-300/60">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-3xl sm:text-4xl font-black text-rose-950 font-mono tracking-tight drop-shadow-sm">{rejectedStudents.length}</p>
                      <p className="text-[10px] text-rose-950/90 font-mono font-black flex items-center gap-1">
                        <span>archived decisions</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </p>
                    </div>
                  </div>

                  {/* Card 4: EVENT PIPELINE & PROPOSALS */}
                  <div
                    onClick={() => setActiveTab('events')}
                    className="p-5 rounded-[28px] bg-gradient-to-br from-[#c084fc] via-[#9333ea] to-[#6b21a8] border-2 border-[#d8b4fe] shadow-[10px_14px_28px_rgba(107,33,168,0.48),-8px_-8px_20px_rgba(255,255,255,0.95),inset_3px_3px_6px_rgba(255,255,255,0.9),inset_-3px_-4px_8px_rgba(59,7,100,0.4)] space-y-3 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[12px_16px_32px_rgba(107,33,168,0.58)] active:translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase font-black tracking-wider text-purple-950">EVENT PIPELINE</span>
                      <div className="p-2.5 rounded-2xl bg-purple-950/20 text-purple-950 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.85),inset_-1.5px_-1.5px_3px_rgba(59,7,100,0.4)] border border-purple-300/60">
                        <Calendar className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl sm:text-4xl font-black text-purple-950 font-mono tracking-tight drop-shadow-sm">{eventProposals.length}</p>
                        {eventProposals.filter((p) => p.status === 'pending_review').length > 0 && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 shadow-sm animate-pulse">
                            {eventProposals.filter((p) => p.status === 'pending_review').length} pending
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-purple-950/90 font-mono font-black flex items-center gap-1">
                        <span>proposals & approval flow</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </p>
                    </div>
                  </div>

                  {/* Card 5: CORE LEADS */}
                  <div
                    onClick={() => setActiveTab('council')}
                    className="p-5 rounded-[28px] bg-gradient-to-br from-[#38bdf8] via-[#0284c7] to-[#0369a1] border-2 border-[#7dd3fc] shadow-[10px_14px_28px_rgba(3,105,161,0.48),-8px_-8px_20px_rgba(255,255,255,0.95),inset_3px_3px_6px_rgba(255,255,255,0.9),inset_-3px_-4px_8px_rgba(8,47,73,0.4)] space-y-3 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[12px_16px_32px_rgba(3,105,161,0.58)] active:translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase font-black tracking-wider text-sky-950">CORE LEADS</span>
                      <div className="p-2.5 rounded-2xl bg-sky-950/20 text-sky-950 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.85),inset_-1.5px_-1.5px_3px_rgba(8,47,73,0.4)] border border-sky-300/60">
                        <Radio className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-3xl sm:text-4xl font-black text-sky-950 font-mono tracking-tight drop-shadow-sm">{coreCouncilList.length}/{coreCouncilList.length}</p>
                      <p className="text-[10px] text-sky-950/90 font-mono font-black flex items-center gap-1">
                        <span>council active</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Events Timeline Chart (2/3 width) */}
                <div className="lg:col-span-2 p-6 rounded-[28px] glass-panel text-slate-900 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Events Timeline — Last 24h</h2>
                      <p className="text-xs text-slate-700">Real-time candidate registration and application spikes</p>
                    </div>
                    <span className="text-[10px] font-extrabold px-3 py-1 rounded-full glass-badge text-cyan-800">
                      320 Peak
                    </span>
                  </div>

                  {/* Smooth Extruded Vector SVG Curve */}
                  <div className="w-full h-56 relative flex items-end pt-4">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGlowGlass" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                        </linearGradient>
                        <filter id="glow3dGlass">
                          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#38bdf8" floodOpacity="0.8" />
                        </filter>
                      </defs>

                      {/* Area Fill */}
                      <path
                        d="M0,130 Q80,130 140,125 T250,110 T320,30 T400,20 T480,70 L500,80 L500,150 L0,150 Z"
                        fill="url(#chartGlowGlass)"
                      />

                      {/* Extruded 3D Stroke Line */}
                      <path
                        d="M0,130 Q80,130 140,125 T250,110 T320,30 T400,20 T480,70 L500,80"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="4"
                        strokeLinecap="round"
                        filter="url(#glow3dGlass)"
                      />

                      {/* Horizontal Gridlines */}
                      <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.1)" strokeDasharray="3,3" />
                      <line x1="0" y1="70" x2="500" y2="70" stroke="rgba(255,255,255,0.1)" strokeDasharray="3,3" />
                      <line x1="0" y1="110" x2="500" y2="110" stroke="rgba(255,255,255,0.1)" strokeDasharray="3,3" />
                    </svg>

                    {/* Chart X-Axis Labels */}
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] font-bold text-slate-600 pt-2 border-t border-white/10">
                      <span>14h</span>
                      <span>17h</span>
                      <span>20h</span>
                      <span>23h</span>
                      <span>02h</span>
                      <span>05h</span>
                      <span>08h</span>
                      <span>11h</span>
                    </div>
                  </div>
                </div>

                {/* 2. Domain Breakdown Donut Chart (1/3 width) */}
                <div className="p-6 rounded-[28px] glass-panel text-slate-900 space-y-4 flex flex-col justify-between">
                  <div>
                    <h2 className="text-sm font-black text-slate-900 tracking-tight">Domain Breakdown (24h)</h2>
                    <p className="text-xs text-slate-700">Applicant distribution across club domains</p>
                  </div>

                  {/* 3D Volumetric Glass Donut Ring */}
                  <div className="relative w-44 h-44 mx-auto my-2 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="4.5"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="4.5"
                        strokeDasharray="65, 100"
                        strokeLinecap="round"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="4.5"
                        strokeDasharray="20, 100"
                        strokeDashoffset="-65"
                        strokeLinecap="round"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="4.5"
                        strokeDasharray="15, 100"
                        strokeDashoffset="-85"
                        strokeLinecap="round"
                      />
                    </svg>
                    
                    {/* Central Glass Sphere Backdrop */}
                    <div className="absolute w-20 h-20 rounded-full glass-card flex flex-col items-center justify-center text-center shadow-[0_0_20px_rgba(255,255,255,0.2)] border border-white/40">
                      <span className="text-[10px] font-extrabold text-slate-700 uppercase block">TOTAL</span>
                      <span className="text-2xl font-black text-slate-900 leading-none">{applications.length + approvedMembers.length}</span>
                    </div>
                  </div>

                  {/* Donut Legend */}
                  <div className="space-y-2 text-xs font-bold pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]" />
                        <span>Tech / Coding</span>
                      </div>
                      <span className="font-extrabold text-slate-900">65%</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]" />
                        <span>AI & Robotics</span>
                      </div>
                      <span className="font-extrabold text-slate-900">20%</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#a855f7] shadow-[0_0_8px_#a855f7]" />
                        <span>Events & Media</span>
                      </div>
                      <span className="font-extrabold text-slate-900">15%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* QUICK RECENT CANDIDATE TRIAGE TABLE */}
              <div className="p-6 rounded-[28px] glass-panel space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-500" />
                      <span>Pending Applications ({applications.length})</span>
                    </h2>
                    <p className="text-xs text-slate-700">Students who registered and are awaiting decision</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('applications')}
                    className="px-4 py-2 rounded-2xl glass-button-active text-slate-900 text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 shadow-lg"
                  >
                    <span>View All Applications</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {applications.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl glass-card space-y-2 border border-white/20">
                    <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                    <p className="text-sm font-black text-slate-900">All Candidate Applications Cleared!</p>
                    <p className="text-xs text-slate-700">No pending requests awaiting decision in the queue.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {applications.slice(0, 3).map((app) => {
                      const u = app.user;
                      if (!u) return null;
                      return (
                        <div
                          key={app.id}
                          className="p-6 rounded-[28px] bg-[#f8fafc]/90 border-2 border-white/90 shadow-[10px_10px_25px_rgba(165,180,210,0.35),-6px_-6px_20px_rgba(255,255,255,0.9),inset_1px_1px_3px_rgba(255,255,255,0.8)] space-y-4 flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-[14px_14px_35px_rgba(165,180,210,0.5),-8px_-8px_25px_rgba(255,255,255,1)]"
                        >
                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between">
                              <span className="px-3.5 py-1 rounded-full text-[10px] font-mono font-black uppercase bg-[#fef3c7] text-amber-900 border border-amber-300 shadow-[inset_1.5px_1.5px_3px_rgba(255,255,255,0.9),0_4px_10px_rgba(245,158,11,0.2)] flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                AWAITING DECISION
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 bg-white/80 px-2.5 py-1 rounded-full border border-white shadow-sm">
                                {new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </span>
                            </div>

                            <div className="flex items-center gap-3.5 pt-1">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white font-black text-base flex items-center justify-center shrink-0 shadow-[0_8px_18px_rgba(99,102,241,0.35),inset_2px_2px_4px_rgba(255,255,255,0.6)] border-2 border-white">
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt="Candidate" className="w-full h-full object-cover rounded-[14px]" />
                                ) : (
                                  `${u.first_name[0]}${u.last_name[0]}`
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-base font-black text-slate-900 truncate tracking-tight">{u.first_name} {u.last_name}</p>
                                <p className="text-xs font-bold text-cyan-800 truncate">{u.email}</p>
                              </div>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#eaf0f8] to-[#dfa8fb]/20 border border-white/80 shadow-[inset_2px_2px_5px_rgba(165,180,210,0.35),inset_-2px_-2px_5px_rgba(255,255,255,0.9)] space-y-2 text-xs font-bold">
                              <div className="flex justify-between items-center bg-white/70 px-3 py-1.5 rounded-xl border border-white shadow-sm">
                                <span className="text-slate-500 font-mono text-[10px] uppercase">Reg No</span>
                                <span className="text-indigo-950 font-extrabold font-mono">{u.registration_no || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center bg-white/70 px-3 py-1.5 rounded-xl border border-white shadow-sm">
                                <span className="text-slate-500 font-mono text-[10px] uppercase">Domain</span>
                                <span className="text-purple-900 font-extrabold">{u.domain || 'Tech / Coding'}</span>
                              </div>
                              {u.branch && (
                                <div className="flex justify-between items-center bg-white/70 px-3 py-1.5 rounded-xl border border-white shadow-sm">
                                  <span className="text-slate-500 font-mono text-[10px] uppercase">Branch</span>
                                  <span className="text-slate-900 font-extrabold truncate max-w-[140px]">{u.branch}</span>
                                </div>
                              )}
                              {u.phone_no && (
                                <div className="flex justify-between items-center bg-white/70 px-3 py-1.5 rounded-xl border border-white shadow-sm">
                                  <span className="text-slate-500 font-mono text-[10px] uppercase">Mobile</span>
                                  <span className="text-emerald-700 font-extrabold font-mono">📱 {u.phone_no}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 pt-2 border-t border-slate-200/80">
                            <button
                              onClick={() => handleApprove(u.id, `${u.first_name} ${u.last_name}`)}
                              className="flex-1 py-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_8px_20px_rgba(16,185,129,0.35),inset_2px_2px_4px_rgba(255,255,255,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-white"
                            >
                              <CheckCircle2 className="w-4 h-4 text-slate-950" />
                              <span>Accept Member</span>
                            </button>
                            <button
                              onClick={() => handleDecline(u.id, `${u.first_name} ${u.last_name}`)}
                              className="py-2.5 px-3.5 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white font-black text-xs shadow-[0_6px_16px_rgba(244,63,94,0.35),inset_2px_2px_4px_rgba(255,255,255,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-white"
                              title="Decline Candidate"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CANDIDATE APPLICATION & WHATSAPP CHAT COMMUNICATION WORKSPACE */}
          {activeTab === 'applications' && (
            <div className="space-y-6">
              <DirectChatWorkspace
                currentUser={currentUser}
                studentMembers={approvedMembers}
                coreCouncilList={coreCouncilList}
                pendingApps={applications}
                onApproveStudent={handleApprove}
                onDeclineStudent={handleDecline}
                isCoreUser={true}
              />
            </div>
          )}

          {/* TAB 3: ACTIVE ACCEPTED MEMBERS DIRECTORY (CLAYMORPHISM STYLE) */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              {/* Header Title & Controls matching user image */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                    <span>Accepted Student Members Directory ({filteredMembers.length})</span>
                  </h2>
                  <p className="text-xs font-bold text-slate-700">Official enrolled student members (Core Council maintained separately)</p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => setIsExcelView(!isExcelView)}
                    className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                      isExcelView 
                        ? 'bg-[#d1fae5] text-emerald-900 shadow-[inset_2px_2px_5px_rgba(16,185,129,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]' 
                        : 'clay-pill bg-white/80 text-slate-800'
                    }`}
                  >
                    {isExcelView ? 'Grid View' : 'Excel View'}
                  </button>
                  <button
                    onClick={exportStudentMembersToExcel}
                    className="px-4 py-2 bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-900 border border-white/80 text-xs font-black rounded-full transition-all shadow-[0_8px_20px_rgba(16,185,129,0.35)] cursor-pointer"
                  >
                    Export to Excel
                  </button>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search roster..."
                      className="pl-10 pr-4 py-2.5 rounded-full bg-white/90 border border-white shadow-[inset_2px_2px_5px_rgba(180,195,225,0.4)] text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {filteredMembers.length === 0 ? (
                <div className="p-12 text-center rounded-[28px] bg-white/90 border border-white shadow-[0_12px_30px_rgba(165,180,210,0.3)] space-y-3">
                  <Users className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-sm font-black text-slate-900">No Members Found</p>
                  <p className="text-xs font-bold text-slate-600">Accept candidate applications to build the official club roster.</p>
                </div>
              ) : isExcelView ? (
                <div className="overflow-x-auto rounded-[28px] bg-white/95 border border-white shadow-[0_15px_35px_rgba(165,180,210,0.35)] p-4">
                  <table className="w-full text-left text-xs text-slate-900 font-bold">
                    <thead className="bg-slate-100/80 text-slate-900 font-black border-b border-slate-200">
                      <tr>
                        <th className="p-3">Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">REG</th>
                        <th className="p-3">Domain</th>
                        <th className="p-3">Branch</th>
                        <th className="p-3">Session</th>
                        <th className="p-3">Mobile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((m, idx) => (
                        <tr key={`member-row-${m.id}-${idx}`} className="border-t border-slate-200 hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-black text-slate-900">{m.first_name} {m.last_name}</td>
                          <td className="p-3 font-bold text-indigo-700">{m.email}</td>
                          <td className="p-3 font-bold text-slate-800">{m.registration_no || 'N/A'}</td>
                          <td className="p-3 font-bold text-slate-800">{m.domain || 'N/A'}</td>
                          <td className="p-3 font-bold text-slate-800">{m.branch || 'N/A'}</td>
                          <td className="p-3 font-bold text-slate-800">{m.session || 'N/A'}</td>
                          <td className="p-3 font-bold text-slate-800">{m.phone_no || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMembers.map((m, idx) => (
                    <div 
                      key={`member-card-${m.id}-${idx}`} 
                      className="p-6 rounded-[28px] bg-white/90 border border-white shadow-[0_12px_32px_rgba(170,185,215,0.35)] space-y-3 transition-all hover:shadow-[0_16px_40px_rgba(170,185,215,0.5)]"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          {/* Claymorphic Rounded Square Avatar Box */}
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-[2px] shrink-0 shadow-[0_6px_16px_rgba(16,185,129,0.3)] border border-white">
                            <div className="w-full h-full rounded-[14px] bg-[#0d1527] overflow-hidden flex items-center justify-center font-black text-white text-base shadow-[inset_2px_2px_4px_rgba(0,0,0,0.5)]">
                              {m.avatar_url ? (
                                <img src={m.avatar_url} alt="Member" className="w-full h-full object-cover" />
                              ) : (
                                `${m.first_name[0]}${m.last_name[0]}`
                              )}
                            </div>
                          </div>

                          <div className="min-w-0 space-y-0.5">
                            <h3 className="text-base font-black text-slate-900 truncate">{m.first_name} {m.last_name}</h3>
                            <p className="text-xs font-bold text-cyan-800 truncate">{m.email}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold text-slate-700 pt-1">
                              <span>REG: <strong className="text-slate-900">{m.registration_no || 'N/A'}</strong></span>
                              <span>•</span>
                              <span className="text-slate-900">{m.branch || m.domain || 'Electronics & IoT'}</span>
                              {m.phone_no && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-700 font-black flex items-center gap-1">
                                    <span>📱</span> {m.phone_no}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Active Badge */}
                        <div className="self-start sm:self-center">
                          <span className="px-3.5 py-1.5 rounded-full text-[11px] font-mono font-black uppercase bg-[#d1fae5] text-emerald-800 border border-emerald-300 shadow-[inset_1px_1px_3px_rgba(16,185,129,0.25)]">
                            ACTIVE
                          </span>
                        </div>
                      </div>

                      {/* Bottom Access info line exactly like reference image */}
                      <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>Access: Approved Member</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: EVENT NOTICES, PROPOSALS & APPROVAL PIPELINE (ALL 3 FORM SECTIONS & LEAD REVIEW) */}
          {(activeTab === 'events' || activeTab === 'announcements') && (
            <div className="mb-20 sm:mb-6">
              <EventProposalsManager
                currentUser={activeCoreUser}
                showNotification={showNotification}
                onViewPublicEvents={() => onNavigate('landing')}
              />
            </div>
          )}
          {/* TAB 5: MULTI-CORE COUNCIL ROSTER (EXACT DARK CLAYMORPHISM MATCHING REFERENCE IMAGE) */}
          {activeTab === 'council' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-indigo-600" />
                    <span>SIC Core Council Members ({coreCouncilList.length})</span>
                  </h2>
                  <p className="text-xs font-bold text-slate-700">Multiple core members with independent profile details and notice posting access</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsExcelView(!isExcelView)}
                    className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                      isExcelView 
                        ? 'bg-[#d1fae5] text-emerald-900 shadow-[inset_2px_2px_5px_rgba(16,185,129,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]' 
                        : 'clay-pill bg-white/80 text-slate-800'
                    }`}
                  >
                    {isExcelView ? 'Grid View' : 'Excel View'}
                  </button>
                  <button 
                    onClick={exportCouncilToExcel}
                    className="px-4 py-2 bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-900 border border-white/80 text-xs font-black rounded-full transition-all shadow-[0_8px_20px_rgba(16,185,129,0.35)] cursor-pointer"
                  >
                    Export to Excel
                  </button>
                </div>
              </div>

              {isExcelView ? (
                <div className="overflow-x-auto rounded-[28px] bg-white/95 border border-white shadow-[0_15px_35px_rgba(165,180,210,0.35)] p-4">
                  <table className="w-full text-left text-xs text-slate-900 font-bold">
                    <thead className="bg-slate-100/80 text-slate-900 font-black border-b border-slate-200">
                      <tr>
                        <th className="p-3">Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">REG</th>
                        <th className="p-3">Domain</th>
                        <th className="p-3">Branch</th>
                        <th className="p-3">Session</th>
                        <th className="p-3">Mobile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coreCouncilList.map((c, idx) => (
                        <tr key={`core-row-${c.id}-${idx}`} className="border-t border-slate-200 hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-black text-slate-900">{c.first_name} {c.last_name}</td>
                          <td className="p-3 font-bold text-indigo-700">{c.email}</td>
                          <td className="p-3 font-bold text-slate-800">{c.registration_no || 'N/A'}</td>
                          <td className="p-3 font-bold text-slate-800">{c.domain || 'N/A'}</td>
                          <td className="p-3 font-bold text-slate-800">{c.branch || 'N/A'}</td>
                          <td className="p-3 font-bold text-slate-800">{c.session || 'N/A'}</td>
                          <td className="p-3 font-bold text-slate-800">{c.phone_no || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {coreCouncilList.map((c, idx) => {
                    const isActive = activeCoreUser.id === c.id;
                    return (
                      <div
                        key={`core-card-${c.id}-${idx}`}
                        className="p-4 rounded-[24px] bg-[#1b2234] text-slate-100 border border-white/10 shadow-[0_12px_30px_rgba(15,23,42,0.6)] space-y-3 relative overflow-hidden transition-all hover:shadow-[0_16px_40px_rgba(15,23,42,0.8)]"
                      >
                        {/* Header: Avatar and Name */}
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-[2px] shrink-0 shadow-[0_4px_12px_rgba(99,102,241,0.4)] border border-white/30">
                            <div className="w-full h-full rounded-[10px] bg-[#0f172a] overflow-hidden flex items-center justify-center font-black text-white text-xs shadow-[inset_2px_2px_4px_rgba(0,0,0,0.6)]">
                              {c.avatar_url ? (
                                <img src={c.avatar_url} alt="Core" className="w-full h-full object-cover" />
                              ) : (
                                `${c.first_name[0]}${c.last_name[0]}`
                              )}
                            </div>
                          </div>
                          <div className="min-w-0 space-y-0">
                            <h3 className="text-sm font-black text-white tracking-tight truncate">{c.first_name} {c.last_name}</h3>
                            <p className="text-[11px] font-bold text-cyan-400 truncate">{c.designation || 'Core Council Member'}</p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">{c.email}</p>
                          </div>
                        </div>

                        {/* Compact Claymorphic 3D Fields Grid */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          {/* First Name */}
                          <div className="p-2.5 rounded-[16px] bg-gradient-to-br from-[#d9e4f5] to-[#c7d6ee] text-slate-900 border border-white/90 shadow-[4px_4px_10px_rgba(10,15,25,0.3),-2px_-2px_8px_rgba(255,255,255,0.15),inset_1px_1px_3px_rgba(255,255,255,0.8)] flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-900 shadow-inner">
                              <User className="w-3 h-3" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] font-mono font-black uppercase text-slate-600">First</p>
                              <p className="font-black text-slate-900 truncate">{c.first_name}</p>
                            </div>
                          </div>

                          {/* Last Name */}
                          <div className="p-2.5 rounded-[16px] bg-gradient-to-br from-[#e8d9f5] to-[#d6c7ee] text-slate-900 border border-white/90 shadow-[4px_4px_10px_rgba(10,15,25,0.3),-2px_-2px_8px_rgba(255,255,255,0.15),inset_1px_1px_3px_rgba(255,255,255,0.8)] flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-purple-500/20 text-purple-900 shadow-inner">
                              <User className="w-3 h-3" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] font-mono font-black uppercase text-slate-600">Last</p>
                              <p className="font-black text-slate-900 truncate">{c.last_name}</p>
                            </div>
                          </div>

                          {/* Department / Branch (Full Span) */}
                          <div className="p-2.5 rounded-[16px] bg-gradient-to-br from-[#e0e7ff] to-[#c7d2fe] text-slate-900 border border-white/90 shadow-[4px_4px_10px_rgba(10,15,25,0.3),-2px_-2px_8px_rgba(255,255,255,0.15),inset_1px_1px_3px_rgba(255,255,255,0.8)] flex items-center gap-2 col-span-full">
                            <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-900 shadow-inner">
                              <BookOpen className="w-3 h-3" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] font-mono font-black uppercase text-slate-600">Department / Branch</p>
                              <p className="font-black text-slate-900 truncate">{c.branch || 'CSE'}</p>
                            </div>
                          </div>

                          {/* Registration No */}
                          <div className="p-2.5 rounded-[16px] bg-gradient-to-br from-[#d9f5ed] to-[#c7eee2] text-slate-900 border border-white/90 shadow-[4px_4px_10px_rgba(10,15,25,0.3),-2px_-2px_8px_rgba(255,255,255,0.15),inset_1px_1px_3px_rgba(255,255,255,0.8)] flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-teal-500/20 text-teal-900 shadow-inner">
                              <Hash className="w-3 h-3" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] font-mono font-black uppercase text-slate-600">Reg No</p>
                              <p className="font-black text-slate-900 truncate">{c.registration_no || 'N/A'}</p>
                            </div>
                          </div>

                          {/* Session */}
                          <div className="p-2.5 rounded-[16px] bg-gradient-to-br from-[#d9f2f5] to-[#c7e5ee] text-slate-900 border border-white/90 shadow-[4px_4px_10px_rgba(10,15,25,0.3),-2px_-2px_8px_rgba(255,255,255,0.15),inset_1px_1px_3px_rgba(255,255,255,0.8)] flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-900 shadow-inner">
                              <Calendar className="w-3 h-3" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] font-mono font-black uppercase text-slate-600">Session</p>
                              <p className="font-black text-slate-900 truncate">{c.session || '2024-2028'}</p>
                            </div>
                          </div>

                          {/* Phone */}
                          <div className="p-2.5 rounded-[16px] bg-gradient-to-br from-[#fef3c7] to-[#fde68a] text-slate-900 border border-white/90 shadow-[4px_4px_10px_rgba(10,15,25,0.3),-2px_-2px_8px_rgba(255,255,255,0.15),inset_1px_1px_3px_rgba(255,255,255,0.8)] flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-amber-500/20 text-amber-900 shadow-inner">
                              <Phone className="w-3 h-3" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] font-mono font-black uppercase text-slate-600">Phone</p>
                              <p className="font-black text-slate-900 truncate">{c.phone_no || 'N/A'}</p>
                            </div>
                          </div>

                          {/* Domain */}
                          <div className="p-2.5 rounded-[16px] bg-gradient-to-br from-[#ffe4e6] to-[#fecdd3] text-slate-900 border border-white/90 shadow-[4px_4px_10px_rgba(10,15,25,0.3),-2px_-2px_8px_rgba(255,255,255,0.15),inset_1px_1px_3px_rgba(255,255,255,0.8)] flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-rose-500/20 text-rose-900 shadow-inner">
                              <Tag className="w-3 h-3" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] font-mono font-black uppercase text-slate-600">Domain</p>
                              <p className="font-black text-slate-900 truncate">{c.domain || 'Tech'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}



          {/* TAB 6: DECLINED APPLICATIONS ARCHIVE */}
          {activeTab === 'rejected' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-mono flex items-center gap-2">
                    <UserX className="w-5 h-5 text-rose-400" />
                    <span>Declined Applications Archive ({rejectedStudents.length})</span>
                  </h2>
                  <p className="text-xs text-slate-700">Applications reviewed and declined by the Core Coordinator</p>
                </div>
              </div>

              {rejectedStudents.length === 0 ? (
                <div className="p-12 text-center rounded-2xl glass-card border border-white/20 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-900">No Declined Applications</p>
                  <p className="text-xs text-slate-700">No student requests have been declined.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rejectedStudents.map((r) => (
                    <div
                      key={r.id}
                      className="p-5 rounded-2xl glass-card space-y-4 hover:border-rose-400/40 transition-all opacity-85 hover:opacity-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/20 flex items-center justify-center font-bold text-slate-900 text-sm shrink-0">
                          {r.first_name[0]}{r.last_name[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 truncate">{r.first_name} {r.last_name}</p>
                          <p className="text-xs text-rose-300 truncate">{r.email}</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/40 border border-white/10 font-mono text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Reg No:</span>
                          <span className="text-slate-800 font-bold">{r.registration_no || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Domain:</span>
                          <span className="text-purple-900 font-bold">{r.domain || 'Tech'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleApprove(r.id, `${r.first_name} ${r.last_name}`)}
                        className="w-full py-2 px-3 rounded-xl glass-button text-slate-800 hover:text-slate-900 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-cyan-800" />
                        <span>Re-Evaluate & Accept</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: DATABASE & SQL SCHEMA SCHEMA TOOLS */}
          {activeTab === 'sql' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl glass-panel space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span>PostgreSQL Database & Schema Blueprint</span>
                    </h2>
                    <p className="text-xs text-slate-700">Copy or execute SQL DDL for remote PostgreSQL or Supabase instances</p>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(SUPABASE_SQL_MIGRATION);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2500);
                      showNotification('SQL Migration script copied to clipboard!', 'success');
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/50 text-emerald-100 border border-emerald-400/50 font-bold text-xs transition-all cursor-pointer flex items-center gap-2 shadow-lg"
                  >
                    {copiedSql ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL Script'}</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 font-mono text-xs text-emerald-300 overflow-x-auto max-h-96 leading-relaxed">
                  <pre>{SUPABASE_SQL_MIGRATION}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: WHATSAPP CHAT INLINE VIEW (CLAYMORPHISM 3D CARD) */}
          {activeTab === 'chat' && (
            <div className="w-full h-full flex-1 min-h-0 rounded-[28px] sm:rounded-[38px] overflow-hidden flex flex-col clay-container border-4 sm:border-[6px] border-[#eaf1ec] shadow-[20px_24px_48px_rgba(145,170,158,0.5),-16px_-16px_36px_rgba(255,255,255,0.95)]">
              <DirectChatWorkspace
                currentUser={currentUser}
                studentMembers={approvedMembers}
                coreCouncilList={coreCouncilList}
                pendingApps={applications}
                isCoreUser={true}
              />
            </div>
          )}
        </div>
      </main>

      {/* MODAL: ADD CORE MEMBER COUNCIL FORM */}
      {showAddCoreModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xl flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-7 rounded-3xl glass-panel space-y-5 relative shadow-2xl border border-white/30"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Crown className="w-5 h-5 text-indigo-400" />
                <span>Add Core Council Member</span>
              </h3>
              <button
                onClick={() => setShowAddCoreModal(false)}
                className="text-slate-600 hover:text-slate-900 p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCoreMember} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={newCoreFirst}
                    onChange={(e) => setNewCoreFirst(e.target.value)}
                    placeholder="e.g. Aarav"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newCoreLast}
                    onChange={(e) => setNewCoreLast(e.target.value)}
                    placeholder="e.g. Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-700 mb-1">Official Core Email</label>
                <input
                  type="email"
                  required
                  value={newCoreEmail}
                  onChange={(e) => setNewCoreEmail(e.target.value)}
                  placeholder="aarav.tech@sic.edu"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-700 mb-1">Council Designation</label>
                <select
                  value={newCoreDesignation}
                  onChange={(e) => setNewCoreDesignation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs cursor-pointer"
                >
                  {DESIGNATIONS_LIST.map((d) => (
                    <option key={d} value={d} className="bg-slate-900 text-slate-900">{d}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCoreModal(false)}
                  className="w-full py-3 px-4 rounded-xl glass-button text-slate-700 hover:text-slate-900 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl glass-button-active text-slate-900 font-bold text-xs transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add to Council</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* MODAL: CORE USER PROFILE & NOTICES OVERLAY */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-lg p-6 sm:p-8 rounded-3xl glass-panel space-y-6 relative shadow-2xl border border-white/30"
          >
            {/* Header / Close button */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-slate-900 font-black text-base flex items-center justify-center glass-badge shadow-lg border border-white/40">
                  {activeCoreUser.first_name ? `${activeCoreUser.first_name[0]}${activeCoreUser.last_name ? activeCoreUser.last_name[0] : ''}` : 'SP'}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{activeCoreUser.first_name} {activeCoreUser.last_name}</h3>
                  <p className="text-xs text-cyan-800 font-medium">{activeCoreUser.designation || 'Core Council Member'}</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-slate-600 hover:text-slate-900 p-1.5 rounded-xl glass-button cursor-pointer"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Profile Quick Info Cards */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/40 border border-white/10 space-y-1">
                <p className="text-slate-600 text-[10px] font-mono uppercase">Official Email</p>
                <p className="text-slate-900 font-bold truncate">{activeCoreUser.email || 'core@sic.edu'}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/40 border border-white/10 space-y-1">
                <p className="text-slate-600 text-[10px] font-mono uppercase">Registration No.</p>
                <p className="text-slate-900 font-bold">{activeCoreUser.registration_no || 'N/A'}</p>
              </div>
            </div>

            {/* Live Announcements / Event Notices Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black tracking-widest text-indigo-900 uppercase flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-rose-400" />
                  <span>Recent Event Notices ({announcements.length})</span>
                </h4>
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    setActiveTab('announcements');
                  }}
                  className="text-[11px] font-bold text-cyan-800 hover:underline cursor-pointer"
                >
                  View All &rarr;
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {announcements.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-4 glass-card rounded-xl">No active event notices published.</p>
                ) : (
                  announcements.slice(0, 3).map((ann) => (
                    <div key={ann.id} className="p-3 rounded-xl glass-card text-xs space-y-1 hover:border-purple-400/40 transition-all">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-purple-900 font-bold uppercase">{ann.category || 'Event Notice'}</span>
                        <span className="text-slate-600">{new Date(ann.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="font-extrabold text-slate-900">{ann.title}</p>
                      <p className="text-[11px] text-slate-700 line-clamp-2">{ann.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setActiveTab('council');
                }}
                className="py-2.5 px-4 rounded-xl glass-button text-slate-800 hover:text-slate-900 font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4 text-cyan-400" />
                <span>Core-members</span>
              </button>
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  onLogout();
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 border border-rose-400/50 text-rose-200 font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Log Out</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 3D CLAYMORPHISM FLOATING BOTTOM NAVIGATION BAR (MATCHING REFERENCE IMAGE) */}
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-40 clay-pill bg-[#eef2f9]/95 backdrop-blur-2xl border border-white p-2.5 flex items-center justify-around shadow-[0_15px_35px_rgba(150,165,205,0.45)]">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'dashboard' 
              ? 'bg-[#dfe6f5] text-cyan-600 font-black shadow-[inset_2px_2px_5px_rgba(150,165,205,0.5),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <Activity className="w-5 h-5 text-cyan-500" />
          <span className="text-[10px]">Dashboard</span>
        </button>



        <button
          onClick={() => setActiveTab('members')}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'members' 
              ? 'bg-[#d1fae5] text-emerald-800 font-black shadow-[inset_2px_2px_5px_rgba(16,185,129,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <Users className="w-5 h-5 text-emerald-600" />
          <span className="text-[10px]">Members</span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all cursor-pointer relative ${
            activeTab === 'announcements' 
              ? 'bg-[#ede9fe] text-purple-800 font-black shadow-[inset_2px_2px_5px_rgba(139,92,246,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <Bell className="w-5 h-5 text-purple-600" />
          <span className="text-[10px]">Notices</span>
          {announcements.length > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-md">
              {announcements.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('council')}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'council' 
              ? 'bg-[#e0f2fe] text-cyan-800 font-black shadow-[inset_2px_2px_5px_rgba(6,182,212,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <Crown className="w-5 h-5 text-cyan-600" />
          <span className="text-[10px]">Core</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'chat' 
              ? 'bg-[#d1fae5] text-emerald-800 font-black shadow-[inset_2px_2px_5px_rgba(16,185,129,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <MessagesSquare className="w-5 h-5 text-emerald-600" />
          <span className="text-[10px]">Chat</span>
        </button>
      </div>
    </div>
  );
}
