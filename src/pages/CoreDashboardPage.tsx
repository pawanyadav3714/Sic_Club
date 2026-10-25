import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, MembershipApplication, Announcement, EventProposal, EventCategory, EventRegistration } from '../types';
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
  saveUserAvatar,
  upsertCoreMemberToDatabase,
  compressImage,
  resetStudentProfilesToDefaults
} from '../lib/supabase';
import DirectChatWorkspace from '../components/DirectChatWorkspace';
import EventProposalsManager from '../components/EventProposalsManager';
import { getStoredEvents, saveEventProposal, getStoredEventRegistrations, getEventRegistrations, updateEventRegistration, CATEGORY_LABELS } from '../lib/eventStorage';
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
  ArrowLeft,
  CheckCheck,
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
  MessagesSquare,
  Camera,
  FileSpreadsheet,
  TrendingUp,
  ChevronDown,
  Edit3,
  Plus,
  GraduationCap,
  Settings,
  X
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
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>(() => getStoredEventRegistrations());
  const [selectedChartEventId, setSelectedChartEventId] = useState<string>('');
  const [chartViewMode, setChartViewMode] = useState<'graph' | 'excel' | 'ps'>('graph');
  const [psReadingMode, setPsReadingMode] = useState<'live' | 'benchmark'>('live');
  const [donutMetricMode, setDonutMetricMode] = useState<'teams' | 'students'>('teams');
  const [hoveredSliceIdx, setHoveredSliceIdx] = useState<number | null>(null);
  const [showEditPsModal, setShowEditPsModal] = useState(false);
  const [editPsList, setEditPsList] = useState<string[]>([]);
  

  
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

    const handleProfileUpdate = () => {
      loadData();
    };

    window.addEventListener('sic_announcements_updated', handleNoticeUpdate);
    window.addEventListener('sic_user_profile_updated', handleProfileUpdate);
    window.addEventListener('storage', handleNoticeUpdate);
    window.addEventListener('storage', handleProfileUpdate);

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
      window.removeEventListener('sic_user_profile_updated', handleProfileUpdate);
      window.removeEventListener('storage', handleNoticeUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
      if (bc) bc.close();
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Event Proposals & Registrations sync listener
  useEffect(() => {
    // Initial fetch from database
    getEventRegistrations().then((regs) => {
      if (regs && Array.isArray(regs)) setEventRegistrations(regs);
    });

    // Clean up any legacy dummy problem statements in stored proposals and registrations
    try {
      const OFFICIAL_5_PS = [
        'Smart Campus & EdTech (Software)',
        'Agritech & IoT Integration (Hardware)',
        'Disaster Management & Autonomous Systems (Hardware/AI)',
        'Healthcare & Accessibility (Software/App)',
        'Sustainability & Smart City (Software/Data)',
      ];

      const rawEvents = localStorage.getItem('sic_event_proposals');
      if (rawEvents) {
        const events = JSON.parse(rawEvents);
        if (Array.isArray(events) && events.length > 0) {
          let updatedAny = false;
          const cleaned = events.map((ev: any) => {
            const hasLegacy = Array.isArray(ev.problem_statements) && ev.problem_statements.some((s: string) =>
              s.toLowerCase().includes('college management') ||
              s.toLowerCase().includes('library management') ||
              s.toLowerCase().includes('hospital management') ||
              s.toLowerCase().includes('smart campus automation') ||
              s.toLowerCase().includes('hostel & mess')
            );
            if (hasLegacy || !ev.problem_statements || ev.problem_statements.length === 0) {
              updatedAny = true;
              return {
                ...ev,
                problem_statements: OFFICIAL_5_PS,
              };
            }
            return ev;
          });
          if (updatedAny) {
            localStorage.setItem('sic_event_proposals', JSON.stringify(cleaned));
            setEventProposals(cleaned);
          }
        }
      }

      const rawRegs = localStorage.getItem('sic_event_registrations');
      if (rawRegs) {
        const regs = JSON.parse(rawRegs);
        if (Array.isArray(regs) && regs.length > 0) {
          let updatedRegsAny = false;
          const cleanedRegs = regs.map((r: any, idx: number) => {
            const isLegacy = !r.selected_problem_statement ||
              r.selected_problem_statement.toLowerCase().includes('college management') ||
              r.selected_problem_statement.toLowerCase().includes('library management') ||
              r.selected_problem_statement.toLowerCase().includes('hospital management') ||
              r.selected_problem_statement.toLowerCase().includes('smart campus automation') ||
              r.selected_problem_statement.toLowerCase().includes('hostel & mess');
            const hasNoTeam = !r.team_name || r.team_name.trim() === '' || r.team_name.trim() === '-';
            let nextTeam = r.team_name;
            if (hasNoTeam && r.name) {
              updatedRegsAny = true;
              nextTeam = `Team ${r.name.split(' ')[0]}`;
            }

            if (isLegacy || (hasNoTeam && r.name)) {
              updatedRegsAny = true;
              const targetPS = isLegacy
                ? (idx === 0
                  ? 'Smart Campus & EdTech (Software)'
                  : idx === 1
                  ? 'Agritech & IoT Integration (Hardware)'
                  : (OFFICIAL_5_PS[idx % OFFICIAL_5_PS.length]))
                : r.selected_problem_statement;
              return {
                ...r,
                selected_problem_statement: targetPS,
                team_name: nextTeam,
              };
            }
            return r;
          });
          if (updatedRegsAny) {
            localStorage.setItem('sic_event_registrations', JSON.stringify(cleanedRegs));
            setEventRegistrations(cleanedRegs);
          }
        }
      }
    } catch (e) {}

    const handleEventsSync = (e: any) => {
      if (e?.detail) setEventProposals(e.detail);
      else setEventProposals(getStoredEvents());
      setEventRegistrations(getStoredEventRegistrations());
    };
    window.addEventListener('sic_events_updated', handleEventsSync);
    window.addEventListener('storage', handleEventsSync);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('sic_events_channel');
        bc.onmessage = (msg) => {
          if (msg.data?.events) {
            setEventProposals(msg.data.events);
            setEventRegistrations(getStoredEventRegistrations());
          }
        };
      }
    } catch (e) {}
    return () => {
      window.removeEventListener('sic_events_updated', handleEventsSync);
      window.removeEventListener('storage', handleEventsSync);
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

  const exportPendingApplicationsToExcel = () => {
    if (applications.length === 0) {
      showNotification('No pending applications to export.', 'info');
      return;
    }
    const data = applications.map((app, idx) => {
      const u = app.user;
      return {
        '#': idx + 1,
        'Name': u ? `${u.first_name} ${u.last_name}` : 'Unknown',
        'Email': u?.email || 'N/A',
        'Roll / Reg No': u?.registration_no || 'N/A',
        'Domain': u?.domain || 'N/A',
        'Branch': u?.branch || 'N/A',
        'Session': u?.session || 'N/A',
        'Mobile': u?.phone_no || 'N/A',
        'Applied Date': app.created_at ? new Date(app.created_at).toLocaleString() : 'N/A',
        'Status': 'PENDING APPROVAL',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pending Applications');
    XLSX.writeFile(workbook, 'SIC_Pending_Applications.xlsx');
    showNotification('Pending applications roster exported to Excel (.xlsx)', 'success');
  };

  const handleApproveAllPending = async () => {
    if (applications.length === 0) return;
    const confirmApprove = window.confirm(
      `Are you sure you want to approve all ${applications.length} pending student applications and admit them to the club?`
    );
    if (!confirmApprove) return;

    const appsToApprove = [...applications];
    for (const app of appsToApprove) {
      if (app.user) {
        await handleApprove(app.user.id, `${app.user.first_name} ${app.user.last_name}`);
      }
    }
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
    showNotification(`Successfully approved all ${appsToApprove.length} pending candidate applications!`, 'success');
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
      problem_statements: [
        'Smart Campus & EdTech (Software)',
        'Agritech & IoT Integration (Hardware)',
        'Disaster Management & Autonomous Systems (Hardware/AI)',
        'Healthcare & Accessibility (Software/App)',
        'Sustainability & Smart City (Software/Data)',
      ],
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

  // ADMIN ACTION: Upload/Change Profile Photo
  const handleCoreProfileAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showNotification('Please choose an image under 10MB.', 'danger');
      return;
    }

    try {
      // Compress image file to a lightweight Base64 string (~20KB)
      const compressedBase64 = await compressImage(file, 300, 300, 0.75);
      if (!compressedBase64) return;

      saveUserAvatar(activeCoreUser.id, compressedBase64);
      if (activeCoreUser.email) saveUserAvatar(activeCoreUser.email, compressedBase64);

      const updatedUser: UserProfile = {
        ...activeCoreUser,
        avatar_url: compressedBase64,
      };

      setActiveCoreUser(updatedUser);
      saveCoreMember(updatedUser);
      setMockUser(updatedUser);

      // Update core Council roster list state
      setCoreCouncilList(prev => prev.map(c => 
        (c.id === updatedUser.id || (c.email && updatedUser.email && c.email.toLowerCase() === updatedUser.email.toLowerCase()))
          ? updatedUser
          : c
      ));

      try {
        await upsertCoreMemberToDatabase({
          id: updatedUser.id,
          email: updatedUser.email,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          phone_no: updatedUser.phone_no,
          branch: updatedUser.branch,
          session: updatedUser.session,
          registration_no: updatedUser.registration_no,
          domain: updatedUser.domain || updatedUser.designation || 'Club Administration',
          designation: updatedUser.designation,
          avatar_url: compressedBase64,
          role: 'core_member',
          created_at: updatedUser.created_at,
        });
      } catch (err) {}

      window.dispatchEvent(new CustomEvent('sic_user_profile_updated', { detail: updatedUser }));
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      showNotification('Profile photo updated and permanently saved!', 'success');
    } catch (err) {
      console.warn('Image processing error:', err);
    }
    if (e.target) e.target.value = '';
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

  // -------------------------------------------------------------------------
  // ACTUAL ANNOUNCED EVENT & ENROLLED STUDENTS ANALYTICS (REAL DATABASE FEED)
  // -------------------------------------------------------------------------
  const publishedEvents = eventProposals.filter((e) => e.status === 'published' || e.status === 'approved');
  const activeEventsList = publishedEvents.length > 0 ? publishedEvents : eventProposals;
  const currentChartEvent = activeEventsList.find((e) => e.id === selectedChartEventId) || activeEventsList[0] || null;

  const currentEventRegs = React.useMemo(() => {
    if (!currentChartEvent) return [];
    const directMatches = eventRegistrations.filter((r) => r.event_id === currentChartEvent.id);
    if (directMatches.length > 0) return directMatches;
    if (activeEventsList.length <= 1 && eventRegistrations.length > 0) {
      return eventRegistrations;
    }
    return directMatches;
  }, [currentChartEvent, eventRegistrations, activeEventsList]);

  const totalEnrolledStudents = React.useMemo(() => {
    return currentEventRegs.reduce((sum, r) => {
      if (r.registration_type === 'team' && Array.isArray(r.team_members) && r.team_members.length > 0) {
        const hasLeader = r.team_members.some((m) => m.name && r.name && m.name.toLowerCase() === r.name.toLowerCase());
        return sum + r.team_members.length + (hasLeader ? 0 : 1);
      }
      return sum + 1;
    }, 0);
  }, [currentEventRegs]);

  const confirmedSeatsCount = currentEventRegs.filter((r) => r.status === 'confirmed').length;
  const waitlistedSeatsCount = currentEventRegs.filter((r) => r.status === 'waitlisted').length;

  const timelineData = React.useMemo(() => {
    const sorted = [...currentEventRegs].sort(
      (a, b) => new Date(a.registered_at || 0).getTime() - new Date(b.registered_at || 0).getTime()
    );

    const now = Date.now();
    let minTime = sorted.length > 0 ? new Date(sorted[0].registered_at || now).getTime() : now - 24 * 3600 * 1000;
    let maxTime = sorted.length > 0 ? Math.max(new Date(sorted[sorted.length - 1].registered_at || now).getTime(), now) : now;

    if (maxTime - minTime < 8 * 3600 * 1000) {
      minTime = maxTime - 24 * 3600 * 1000;
    }

    const intervals = 7;
    const step = (maxTime - minTime) / (intervals - 1);
    const pts = [];

    for (let i = 0; i < intervals; i++) {
      const targetTime = minTime + i * step;
      const eligibleRegs = sorted.filter((r) => new Date(r.registered_at || 0).getTime() <= targetTime);
      const studentCount = eligibleRegs.reduce((sum, r) => {
        if (r.registration_type === 'team' && Array.isArray(r.team_members) && r.team_members.length > 0) {
          const hasLeader = r.team_members.some((m) => m.name && r.name && m.name.toLowerCase() === r.name.toLowerCase());
          return sum + r.team_members.length + (hasLeader ? 0 : 1);
        }
        return sum + 1;
      }, 0);

      const d = new Date(targetTime);
      const label =
        maxTime - minTime > 36 * 3600 * 1000
          ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : `${String(d.getHours()).padStart(2, '0')}:00`;

      pts.push({
        index: i,
        time: targetTime,
        label,
        count: studentCount,
      });
    }

    const maxVal = Math.max(...pts.map((p) => p.count), 1);
    const coords = pts.map((p, i) => {
      const x = (i / (intervals - 1)) * 500;
      const y = 130 - (p.count / maxVal) * 100;
      return { ...p, x, y };
    });

    let strokePath = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const mx = (p0.x + p1.x) / 2;
      strokePath += ` C ${mx},${p0.y} ${mx},${p1.y} ${p1.x},${p1.y}`;
    }

    const areaPath = `${strokePath} L 500,150 L 0,150 Z`;

    return {
      pts: coords,
      strokePath,
      areaPath,
      peakCount: Math.max(...pts.map((p) => p.count), 0),
    };
  }, [currentEventRegs]);

  // Helper to extract problem statements from event description text if present
  const extractPSFromText = (text?: string): string[] => {
    if (!text) return [];
    const lines = text.split('\n');
    const extracted: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(/^(?:(?:\d+[\.\)]|\-|\*|PS\s*\d+:?)\s*)([A-Za-z0-9\s&/\-_]+)$/i);
      if (
        match &&
        match[1] &&
        match[1].trim().length > 3 &&
        !match[1].toLowerCase().startsWith('module') &&
        !match[1].toLowerCase().startsWith('step') &&
        !match[1].toLowerCase().startsWith('rule')
      ) {
        extracted.push(match[1].trim());
      }
    }
    return extracted;
  };

  const getShortLabel = (full: string) => {
    if (!full) return '';
    const trimmed = full.trim();
    if (trimmed.includes('Smart Campus')) return 'Smart Campus';
    if (trimmed.includes('Agritech')) return 'Agritech IoT';
    if (trimmed.includes('Disaster')) return 'Disaster Mgmt';
    if (trimmed.includes('Healthcare')) return 'Healthcare AI';
    if (trimmed.includes('Sustainability') || trimmed.includes('Smart City')) return 'Smart City';

    const clean = trimmed
      .replace(/Management/gi, 'Mgmt')
      .replace(/Automation/gi, 'Auto')
      .replace(/System(s)?/gi, 'Sys')
      .replace(/Autonomous/gi, 'Auto')
      .replace(/\(Software\)/gi, '')
      .replace(/\(Hardware\)/gi, '')
      .replace(/\(Hardware\/AI\)/gi, '')
      .replace(/\(Software\/App\)/gi, '')
      .replace(/\(Software\/Data\)/gi, '')
      .trim();
    return clean.length <= 15 ? clean : clean.slice(0, 14) + '..';
  };

  const DEFAULT_ANNOUNCED_PROBLEM_STATEMENTS = React.useMemo(() => [
    'Smart Campus & EdTech (Software)',
    'Agritech & IoT Integration (Hardware)',
    'Disaster Management & Autonomous Systems (Hardware/AI)',
    'Healthcare & Accessibility (Software/App)',
    'Sustainability & Smart City (Software/Data)',
  ], []);

  const PS_COLOR_PALETTE = React.useMemo(() => [
    { color: '#db2777', accentColor: '#ec4899' }, // Magenta / Pink
    { color: '#ea580c', accentColor: '#f97316' }, // Orange / Coral
    { color: '#4f46e5', accentColor: '#6366f1' }, // Deep Indigo / Purple (Disaster Mgmt)
    { color: '#0284c7', accentColor: '#38bdf8' }, // Ocean Blue / Cyan
    { color: '#16a34a', accentColor: '#22c55e' }, // Emerald / Green
    { color: '#8b5cf6', accentColor: '#a78bfa' }, // Purple
    { color: '#0d9488', accentColor: '#2dd4bf' }, // Teal
    { color: '#d97706', accentColor: '#fbbf24' }, // Amber
  ], []);

  // Geometric helper for SVG Donut Arc Wedges
  const polarToCartesian = (cx: number, cy: number, radius: number, angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180.0;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  };

  const generateDonutArcPath = (
    cx: number,
    cy: number,
    rInner: number,
    rOuter: number,
    startDeg: number,
    endDeg: number
  ) => {
    const sweep = Math.max(0.1, endDeg - startDeg);
    const actualEnd = startDeg + Math.min(sweep, 359.99);

    const startOuter = polarToCartesian(cx, cy, rOuter, startDeg);
    const endOuter = polarToCartesian(cx, cy, rOuter, actualEnd);
    const endInner = polarToCartesian(cx, cy, rInner, actualEnd);
    const startInner = polarToCartesian(cx, cy, rInner, startDeg);

    const largeArcFlag = sweep > 180 ? 1 : 0;

    return [
      `M ${startOuter.x.toFixed(2)} ${startOuter.y.toFixed(2)}`,
      `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${endOuter.x.toFixed(2)} ${endOuter.y.toFixed(2)}`,
      `L ${endInner.x.toFixed(2)} ${endInner.y.toFixed(2)}`,
      `A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
      'Z',
    ].join(' ');
  };

  // Determine the active announced problem statements dynamically for the selected event
  const officialTitles = React.useMemo(() => {
    let result = DEFAULT_ANNOUNCED_PROBLEM_STATEMENTS;

    if (currentChartEvent) {
      if (Array.isArray(currentChartEvent.problem_statements) && currentChartEvent.problem_statements.length > 0) {
        const cleaned = currentChartEvent.problem_statements.filter((s) => s && s.trim().length > 0);
        const hasOldDummy = cleaned.some(
          (s) =>
            s.toLowerCase().includes('college management') ||
            s.toLowerCase().includes('library management') ||
            s.toLowerCase().includes('hospital management') ||
            s.toLowerCase().includes('smart campus automation') ||
            s.toLowerCase().includes('hostel & mess')
        );
        if (!hasOldDummy && cleaned.length > 0) {
          result = cleaned;
        }
      } else {
        const fromDesc = extractPSFromText(currentChartEvent.description);
        if (fromDesc.length >= 2) {
          result = fromDesc;
        }
      }
    }

    // Sanitize to prevent duplicate numbering like "1. 1. Smart Campus"
    return result
      .map((t) => t.replace(/^\d+[\.\)\s\-]+/, '').trim())
      .filter(Boolean);
  }, [currentChartEvent, DEFAULT_ANNOUNCED_PROBLEM_STATEMENTS]);

  // Problem Statement Analytics (Real Data from the Event Announcement)
  const psStats = React.useMemo(() => {
    const cleanStr = (s?: string) => (s || '').replace(/^\d+[\.\)\s\-]+/, '').trim();

    // Initialize stats entry for every announced official problem statement
    const entriesList = officialTitles.map((title, idx) => {
      const palette = PS_COLOR_PALETTE[idx % PS_COLOR_PALETTE.length];
      const cleanTitle = cleanStr(title);
      return {
        trackNumber: idx + 1,
        label: cleanTitle,
        students: 0,
        candidates: 0,
        teams: 0,
        solo: 0,
        effectiveTeams: 0,
        color: palette.color,
        accentColor: palette.accentColor,
      };
    });

    currentEventRegs.forEach((r, regIdx) => {
      const studentPS = cleanStr(r.selected_problem_statement);

      // Find best match in list
      let matchIdx = entriesList.findIndex(
        (item) => item.label.toLowerCase() === studentPS.toLowerCase()
      );

      if (matchIdx === -1 && studentPS) {
        matchIdx = entriesList.findIndex(
          (item) =>
            item.label.toLowerCase().includes(studentPS.toLowerCase()) ||
            studentPS.toLowerCase().includes(item.label.toLowerCase())
        );
      }

      // If student has dummy/unmatched PS or was registered earlier, distribute deterministically among announced tracks
      if (matchIdx === -1 && entriesList.length > 0) {
        matchIdx = regIdx % entriesList.length;
      }

      if (matchIdx >= 0) {
        entriesList[matchIdx].candidates += 1;

        const isTeam = r.registration_type === 'team';
        if (isTeam) {
          entriesList[matchIdx].teams += 1;
        } else {
          entriesList[matchIdx].solo += 1;
        }

        let memberCount = 1;
        if (r.registration_type === 'team' && Array.isArray(r.team_members) && r.team_members.length > 0) {
          const hasLeader = r.team_members.some((m) => m.name && r.name && m.name.toLowerCase() === r.name.toLowerCase());
          memberCount = r.team_members.length + (hasLeader ? 0 : 1);
        }
        entriesList[matchIdx].students += memberCount;
      }
    });

    const anyExplicitTeams = entriesList.some((e) => e.teams > 0);
    entriesList.forEach((e) => {
      e.effectiveTeams = anyExplicitTeams ? e.teams : e.candidates;
    });

    const maxStudents = Math.max(...entriesList.map((e) => e.students), 1);
    const maxCandidates = Math.max(...entriesList.map((e) => e.candidates), 1);
    const maxTeams = Math.max(...entriesList.map((e) => e.effectiveTeams), 1);
    const globalMax = Math.max(maxStudents, maxCandidates, maxTeams);
    const totalStudentsInPS = entriesList.reduce((sum, item) => sum + item.students, 0);
    const totalCandidatesInPS = entriesList.reduce((sum, item) => sum + item.candidates, 0);
    const totalTeamsInPS = entriesList.reduce((sum, item) => sum + item.effectiveTeams, 0);

    return {
      entries: entriesList,
      maxVal: globalMax,
      maxStudents,
      maxCandidates,
      maxTeams,
      totalStudents: totalStudentsInPS,
      totalCandidates: totalCandidatesInPS,
      totalTeams: totalTeamsInPS,
      officialTitles,
    };
  }, [currentEventRegs, officialTitles, PS_COLOR_PALETTE]);

  // Event total participating teams & candidate breakdown
  const eventTeamBreakdown = React.useMemo(() => {
    let explicitTeams = 0;
    let soloEntries = 0;
    currentEventRegs.forEach((r) => {
      const isTeam = r.registration_type === 'team';
      if (isTeam) explicitTeams += 1;
      else soloEntries += 1;
    });
    const teamsTotal = explicitTeams > 0 ? explicitTeams : currentEventRegs.length;
    return {
      explicitTeams,
      soloEntries,
      teamsTotal,
      hasExplicitTeams: explicitTeams > 0,
    };
  }, [currentEventRegs]);

  const psTotalTeamsDisplay = React.useMemo(() => {
    if (psReadingMode === 'benchmark') {
      return 8; // Benchmark 8 Teams
    }
    return eventTeamBreakdown.teamsTotal;
  }, [psReadingMode, eventTeamBreakdown]);

  // Problem Statement Donut Distribution (Exact N-Partition Circular Puzzle)
  const psDonutSegments = React.useMemo(() => {
    const isBenchmark = psReadingMode === 'benchmark';
    const benchmarkDistribution = [12, 8, 6, 4, 2, 2, 1, 1];
    const benchmarkTeamsDistribution = [3, 2, 2, 1, 1, 1, 1, 1];

    const baseList = officialTitles.map((rawTitle, idx) => {
      const title = rawTitle.replace(/^\d+[\.\)\s\-]+/, '').trim();
      const palette = PS_COLOR_PALETTE[idx % PS_COLOR_PALETTE.length];
      const entry = psStats.entries.find((e) => e.label.toLowerCase() === title.toLowerCase());

      const count = isBenchmark
        ? (benchmarkDistribution[idx] || 3)
        : (entry ? entry.students : 0);

      const candidatesCount = isBenchmark
        ? (benchmarkTeamsDistribution[idx] || 1)
        : (entry ? entry.candidates : 0);

      const teamsCount = isBenchmark
        ? (benchmarkTeamsDistribution[idx] || 1)
        : (entry ? entry.effectiveTeams : 0);

      return {
        id: `ps-${idx + 1}`,
        label: title,
        full: title,
        short: getShortLabel(title),
        count,
        candidatesCount,
        teamsCount,
        color: palette.color,
        accentColor: palette.accentColor,
        idx,
      };
    });

    const totalStudentsSum = baseList.reduce((sum, item) => sum + item.count, 0);
    const totalTeamsSum = baseList.reduce((sum, item) => sum + item.teamsCount, 0);
    const activeMetricSum = donutMetricMode === 'teams' ? totalTeamsSum : totalStudentsSum;

    // SVG Geometry Configuration
    const cx = 180;
    const cy = 180;
    const rOuter = 138;
    const rInner = 86;
    const rMid = (rOuter + rInner) / 2; // 112px

    const numPartitions = baseList.length;
    const gapDeg = numPartitions > 6 ? 2.5 : 4.0;
    const totalGaps = numPartitions * gapDeg;
    const usableDeg = 360 - totalGaps;

    // Minimum baseline angle for zero-metric slices so the partition is visible
    const minSliceDeg = 14;

    // Allocate degrees proportional to metric
    let currentAngle = 0;

    return baseList.map((item) => {
      const itemMetric = donutMetricMode === 'teams' ? item.teamsCount : item.count;
      let sweep = 0;
      if (activeMetricSum === 0) {
        sweep = usableDeg / numPartitions;
      } else if (itemMetric === 0) {
        sweep = minSliceDeg;
      } else {
        const zeroCountItems = baseList.filter((b) => (donutMetricMode === 'teams' ? b.teamsCount : b.count) === 0).length;
        const reservedForZeros = zeroCountItems * minSliceDeg;
        const remainingBudget = Math.max(usableDeg - reservedForZeros, 20);
        const nonZeroSum = baseList
          .filter((b) => (donutMetricMode === 'teams' ? b.teamsCount : b.count) > 0)
          .reduce((s, b) => s + (donutMetricMode === 'teams' ? b.teamsCount : b.count), 0);
        sweep = (itemMetric / (nonZeroSum || 1)) * remainingBudget;
      }

      const startAngle = currentAngle + gapDeg / 2;
      const endAngle = startAngle + sweep;
      currentAngle = endAngle + gapDeg / 2;

      const thetaMid = (startAngle + endAngle) / 2;
      const midPos = polarToCartesian(cx, cy, rMid, thetaMid);

      // Orientation for upright readable text inside the arc
      let textRot = thetaMid;
      if (thetaMid > 90 && thetaMid < 270) {
        textRot += 180;
      }

      const path = generateDonutArcPath(cx, cy, rInner, rOuter, startAngle, endAngle);
      const studentPercent = totalStudentsSum > 0 ? Math.round((item.count / totalStudentsSum) * 100) : 0;
      const teamPercent = totalTeamsSum > 0 ? Math.round((item.teamsCount / totalTeamsSum) * 100) : 0;
      const percent = donutMetricMode === 'teams' ? teamPercent : studentPercent;

      return {
        ...item,
        path,
        startAngle,
        endAngle,
        thetaMid,
        midX: midPos.x,
        midY: midPos.y,
        textRot,
        percent,
        studentPercent,
        teamPercent,
      };
    });
  }, [psReadingMode, officialTitles, psStats, PS_COLOR_PALETTE, donutMetricMode]);

  const psTotalDisplay = React.useMemo(() => {
    if (psReadingMode === 'benchmark') {
      return 32;
    }
    return totalEnrolledStudents;
  }, [psReadingMode, totalEnrolledStudents]);



  const handleExportExcelChart = () => {
    if (!currentChartEvent) return;
    const exportRows = currentEventRegs.map((r, idx) => {
      let membersStr = 'N/A';
      if (r.registration_type === 'team' && Array.isArray(r.team_members) && r.team_members.length > 0) {
        membersStr = r.team_members
          .map((m, mIdx) => `${mIdx + 1}. ${m.name} (${m.registration_no || 'No Reg'}) [${m.branch || 'Branch'}]`)
          .join('; ');
      }
      const exportedTeamName = r.team_name && r.team_name !== '-'
        ? r.team_name
        : (r.name ? `Team ${r.name.split(' ')[0]}` : '-');

      return {
        '#': idx + 1,
        'Event Title': currentChartEvent.title,
        'Category / Track': (r.category || currentChartEvent.category || '').toUpperCase(),
        'Registration Type': (r.registration_type || 'individual').toUpperCase(),
        'Team Name': exportedTeamName,
        'Candidate / Team Leader': r.name,
        'Email Address': r.email,
        'Phone Number': r.phone_no || '-',
        'Roll / Registration No': r.registration_no || '-',
        'Branch': r.branch || '-',
        'Selected Problem Statement': r.selected_problem_statement || '-',
        'Team Roster': membersStr,
        'Admission Status': (r.status || 'confirmed').toUpperCase(),
        'Registration Time': r.registered_at ? new Date(r.registered_at).toLocaleString() : '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(
      exportRows.length > 0 ? exportRows : [{ Note: 'No registered students yet for this announced event.' }]
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Enrolled Students');
    const safeTitle = currentChartEvent.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    XLSX.writeFile(workbook, `${safeTitle}_Enrolled_Students.xlsx`);
    showNotification(`Excel roster exported for ${currentChartEvent.title}`);
  };

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
              onClick={() => setActiveTab('applications')}
              className={`w-full px-3.5 py-3 rounded-2xl font-extrabold text-xs flex items-center justify-between cursor-pointer transition-all ${
                activeTab === 'applications'
                  ? 'glass-nav-btn-active bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-400/50 text-slate-900 shadow-md'
                  : 'glass-nav-btn text-slate-700 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className={`w-4 h-4 ${activeTab === 'applications' ? 'text-amber-600' : 'text-amber-500'}`} />
                <span>Pending Approvals</span>
              </div>
              <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                applications.length > 0
                  ? 'bg-amber-500 text-white animate-pulse shadow-xs'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {applications.length}
              </span>
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
            {activeCoreUser.avatar_url ? (
              <img
                src={activeCoreUser.avatar_url}
                alt={activeCoreUser.first_name}
                className="w-8 h-8 rounded-full object-cover shadow-md border border-white/30 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-md border border-white/30 shrink-0 relative">
                {activeCoreUser.first_name ? `${activeCoreUser.first_name[0]}${activeCoreUser.last_name ? activeCoreUser.last_name[0] : ''}` : 'SP'}
              </div>
            )}
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
      <main className={`flex-1 min-w-0 flex flex-col ${
        activeTab === 'chat' ? 'space-y-0 h-[calc(100dvh-82px)] sm:h-[calc(100vh-48px)]' : 'space-y-5 pb-32 sm:pb-8'
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
                  className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#6366f1] via-[#8b5cf6] to-[#a855f7] text-white font-black text-lg flex items-center justify-center shadow-[0_10px_25px_rgba(99,102,241,0.5),inset_2px_2px_4px_rgba(255,255,255,0.6),inset_-2px_-2px_6px_rgba(0,0,0,0.3)] border-4 border-[#f0f4f8] cursor-pointer hover:scale-105 active:scale-95 transition-all overflow-hidden shrink-0"
                  title="Profile Menu"
                >
                  {activeCoreUser.avatar_url ? (
                    <img src={activeCoreUser.avatar_url} alt={activeCoreUser.first_name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{activeCoreUser.first_name ? activeCoreUser.first_name[0] : 'S'}</span>
                  )}
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
                      <div className="px-3 py-2 border-b border-white/10 mb-1 flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center overflow-hidden shrink-0 border border-white/30">
                          {activeCoreUser.avatar_url ? (
                            <img src={activeCoreUser.avatar_url} alt={activeCoreUser.first_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-black">{activeCoreUser.first_name ? activeCoreUser.first_name[0] : 'S'}</span>
                          )}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-black truncate">{activeCoreUser.first_name} {activeCoreUser.last_name}</p>
                          <p className="text-[10px] text-cyan-400 truncate">{activeCoreUser.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowLogoutPopover(false);
                          setShowProfileModal(true);
                        }}
                        className="w-full py-2 px-3 rounded-xl hover:bg-white/10 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer mb-1"
                      >
                        <Camera className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Edit Profile & Photo</span>
                      </button>
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

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                  {/* Card 1: AWAITING TRIAGE */}
                  <div
                    onClick={() => setActiveTab('applications')}
                    className="p-4 sm:p-5 rounded-[28px] bg-gradient-to-br from-[#fde047] via-[#f59e0b] to-[#d97706] border-2 border-[#fef08a] shadow-[8px_12px_24px_rgba(217,119,6,0.35),-6px_-6px_16px_rgba(255,255,255,0.9),inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-3px_6px_rgba(120,53,15,0.3)] space-y-3 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[10px_14px_28px_rgba(217,119,6,0.45)] active:translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] sm:text-[10px] xl:text-[11px] font-mono uppercase font-black tracking-wider text-[#451a03]">AWAITING TRIAGE</span>
                      <div className="p-2 sm:p-2.5 rounded-2xl bg-amber-950/15 text-[#451a03] border border-amber-400/50 shadow-sm">
                        <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-2xl sm:text-3xl xl:text-4xl font-black text-[#451a03] font-mono tracking-tight leading-none">{applications.length}</p>
                      <p className="text-[9px] sm:text-[10px] text-[#451a03]/80 font-mono font-black flex items-center gap-1">
                        <span>requires decision</span>
                        <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-1 transition-transform" />
                      </p>
                    </div>
                  </div>

                  {/* Card 2: ACTIVE MEMBERS */}
                  <div
                    onClick={() => setActiveTab('members')}
                    className="p-4 sm:p-5 rounded-[28px] bg-gradient-to-br from-[#34d399] via-[#059669] to-[#047857] border-2 border-[#6ee7b7] shadow-[8px_12px_24px_rgba(4,120,87,0.35),-6px_-6px_16px_rgba(255,255,255,0.9),inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-3px_6px_rgba(2,44,34,0.3)] space-y-3 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[10px_14px_28px_rgba(4,120,87,0.45)] active:translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] sm:text-[10px] xl:text-[11px] font-mono uppercase font-black tracking-wider text-emerald-950">ACTIVE MEMBERS</span>
                      <div className="p-2 sm:p-2.5 rounded-2xl bg-emerald-950/15 text-emerald-950 border border-emerald-300/50 shadow-sm">
                        <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-2xl sm:text-3xl xl:text-4xl font-black text-emerald-950 font-mono tracking-tight leading-none">{approvedMembers.length}</p>
                      <p className="text-[9px] sm:text-[10px] text-emerald-950/80 font-mono font-black flex items-center gap-1">
                        <span>accepted in roster</span>
                        <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-1 transition-transform" />
                      </p>
                    </div>
                  </div>

                  {/* Card 3: DECLINED REQS */}
                  <div
                    onClick={() => setActiveTab('rejected')}
                    className="p-4 sm:p-5 rounded-[28px] bg-gradient-to-br from-[#fb7185] via-[#e11d48] to-[#9f1239] border-2 border-[#fda4af] shadow-[8px_12px_24px_rgba(159,18,57,0.35),-6px_-6px_16px_rgba(255,255,255,0.9),inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-3px_6px_rgba(76,5,25,0.3)] space-y-3 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[10px_14px_28px_rgba(159,18,57,0.45)] active:translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] sm:text-[10px] xl:text-[11px] font-mono uppercase font-black tracking-wider text-rose-950">DECLINED REQS</span>
                      <div className="p-2 sm:p-2.5 rounded-2xl bg-rose-950/15 text-rose-950 border border-rose-300/50 shadow-sm">
                        <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
                    className="p-4 sm:p-5 rounded-[28px] bg-gradient-to-br from-[#c084fc] via-[#9333ea] to-[#6b21a8] border-2 border-[#d8b4fe] shadow-[8px_12px_24px_rgba(107,33,168,0.35),-6px_-6px_16px_rgba(255,255,255,0.9),inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-3px_6px_rgba(59,7,100,0.3)] space-y-3 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[10px_14px_28px_rgba(107,33,168,0.45)] active:translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] sm:text-[10px] xl:text-[11px] font-mono uppercase font-black tracking-wider text-purple-950">EVENT PIPELINE</span>
                      <div className="p-2 sm:p-2.5 rounded-2xl bg-purple-950/15 text-purple-950 border border-purple-300/50 shadow-sm">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-2xl sm:text-3xl xl:text-4xl font-black text-purple-950 font-mono tracking-tight leading-none">{eventProposals.length}</p>
                        {eventProposals.filter((p) => p.status === 'pending_review').length > 0 && (
                          <span className="text-[8px] xl:text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 shadow-sm animate-pulse">
                            {eventProposals.filter((p) => p.status === 'pending_review').length}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-purple-950/80 font-mono font-black flex items-center gap-1">
                        <span>proposals & flow</span>
                        <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-1 transition-transform" />
                      </p>
                    </div>
                  </div>

                  {/* Card 5: CORE LEADS */}
                  <div
                    onClick={() => setActiveTab('council')}
                    className="p-4 sm:p-5 rounded-[28px] bg-gradient-to-br from-[#38bdf8] via-[#0284c7] to-[#0369a1] border-2 border-[#7dd3fc] shadow-[8px_12px_24px_rgba(3,105,161,0.35),-6px_-6px_16px_rgba(255,255,255,0.9),inset_2px_2px_4px_rgba(255,255,255,0.8),inset_-2px_-3px_6px_rgba(8,47,73,0.3)] space-y-3 relative overflow-hidden group hover:-translate-y-1 hover:shadow-[10px_14px_28px_rgba(3,105,161,0.45)] active:translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] sm:text-[10px] xl:text-[11px] font-mono uppercase font-black tracking-wider text-sky-950">CORE LEADS</span>
                      <div className="p-2 sm:p-2.5 rounded-2xl bg-sky-950/15 text-sky-950 border border-sky-300/50 shadow-sm">
                        <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-2xl sm:text-3xl xl:text-4xl font-black text-sky-950 font-mono tracking-tight leading-none">{coreCouncilList.length}</p>
                      <p className="text-[9px] sm:text-[10px] text-sky-950/80 font-mono font-black flex items-center gap-1">
                        <span>council active</span>
                        <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-1 transition-transform" />
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. ACTUAL ANNOUNCED EVENT: REAL REGISTRATION VS TIME GRAPH & EXCEL ROSTER */}
                <div className="lg:col-span-2 clay-card-3d p-6 sm:p-7 text-slate-900 space-y-5">
                  {/* Top Header: Announced Event Name, Track Pill & Action Controls */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-slate-200/60">
                    <div className="space-y-3 min-w-0 flex-1">
                      {currentChartEvent ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-wider bg-[#ede9fe] text-[#6d28d9] border border-white shadow-[2px_3px_6px_rgba(160,175,205,0.25)]">
                            {CATEGORY_LABELS[currentChartEvent.category]?.label || currentChartEvent.category}
                          </span>
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dcfce7] text-[#15803d] border border-white shadow-[2px_3px_6px_rgba(160,175,205,0.25)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-mono font-black uppercase tracking-tight">Live Event</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e2e8f0] text-[#475569] border border-white shadow-[2px_3px_6px_rgba(160,175,205,0.25)]">
                            <Users className="w-3 h-3 text-slate-500" />
                            <span className="text-[10px] font-mono font-black uppercase tracking-tight">
                              Cap: {confirmedSeatsCount}/{currentChartEvent.capacity}
                            </span>
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-1">
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-[1.15]">
                          {currentChartEvent ? currentChartEvent.title : 'No Live Event Announced Yet'}
                        </h2>
                        <p className="text-xs sm:text-[13px] text-slate-600 font-semibold leading-relaxed flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          {currentChartEvent ? (
                            <>
                              <span className="opacity-80">Registration analytics & roster</span>
                              <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-300" />
                              <span className="text-slate-900 font-bold">
                                {totalEnrolledStudents} Students enrolled
                              </span>
                              <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-300" />
                              <span className="text-[11px] bg-[#ede9fe] text-[#6d28d9] px-2.5 py-0.5 rounded-lg border border-indigo-200/50 font-black">
                                {confirmedSeatsCount} confirmed{waitlistedSeatsCount > 0 ? ` • ${waitlistedSeatsCount} WL` : ''}
                              </span>
                            </>
                          ) : (
                            'Publish an event to automatically chart live student enrollments.'
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right Controls: Event Switcher + View Toggles + Export */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 shrink-0 self-stretch lg:self-center">
                      <div className="flex items-center gap-2 flex-1 md:flex-none">
                        {activeEventsList.length > 1 && (
                          <div className="relative flex-1 md:flex-none">
                            <select
                              value={currentChartEvent?.id || ''}
                              onChange={(e) => setSelectedChartEventId(e.target.value)}
                              className="clay-pill-raised w-full md:w-[190px] pl-3.5 pr-8 py-2 text-xs font-black text-slate-800 appearance-none cursor-pointer focus:outline-none transition-all"
                            >
                              {activeEventsList.map((ev) => (
                                <option key={ev.id} value={ev.id}>
                                  {ev.title}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        )}
                        
                        <button
                          onClick={handleExportExcelChart}
                          disabled={!currentChartEvent || currentEventRegs.length === 0}
                          className="clay-btn-export px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 transition-all shrink-0"
                          title="Export roster to Excel"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                          <span>EXPORT</span>
                        </button>
                      </div>

                      {/* View mode toggle: Graph vs Metrics vs Excel */}
                      <div className="clay-pill-inset p-1 flex items-center gap-1 overflow-x-auto no-scrollbar">
                        {[
                          { id: 'graph', label: 'Graph', icon: TrendingUp },
                          { id: 'ps', label: 'Metrics', icon: PieChart },
                          { id: 'excel', label: 'Excel', icon: FileSpreadsheet }
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => setChartViewMode(mode.id as any)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                              chartViewMode === mode.id
                                ? 'clay-pill-raised text-indigo-700 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            <mode.icon className="w-3.5 h-3.5" />
                            <span>{mode.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Body Content based on chartViewMode */}
                  {chartViewMode === 'graph' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-600">
                        <span className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-cyan-600" />
                          <span className="font-sans font-black text-slate-800">Student Enrollment Velocity vs Time</span>
                        </span>
                        <span className="clay-pill-inset text-[11px] font-black px-3.5 py-1 text-cyan-800 flex items-center gap-1.5 bg-cyan-50/50">
                          <Users className="w-3 h-3 text-cyan-600" />
                          <span>{totalEnrolledStudents} Enrolled • Peak {timelineData.peakCount}</span>
                        </span>
                      </div>

                      {/* Smooth Vector SVG Curve with 3D Tubular Extrusion */}
                      <div className="w-full h-56 relative flex flex-col justify-end pt-4">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                          <defs>
                            {/* Subtle area gradient */}
                            <linearGradient id="clayAreaGlow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.22" />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                            </linearGradient>

                            {/* 3D Tubular Pipe Body Gradient */}
                            <linearGradient id="tubeGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#06b6d4" />
                              <stop offset="45%" stopColor="#0284c7" />
                              <stop offset="100%" stopColor="#4f46e5" />
                            </linearGradient>

                            {/* 3D Sphere Node Radial Gradient */}
                            <radialGradient id="nodeSphereGlow" cx="35%" cy="35%" r="65%">
                              <stop offset="0%" stopColor="#38bdf8" />
                              <stop offset="40%" stopColor="#0284c7" />
                              <stop offset="100%" stopColor="#1e3a8a" />
                            </radialGradient>

                            {/* 3D Curve Drop Shadow */}
                            <filter id="tube3dShadow" x="-10%" y="-20%" width="120%" height="160%">
                              <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#0284c7" floodOpacity="0.35" />
                            </filter>
                          </defs>

                          {/* Horizontal Gridlines */}
                          <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(148,163,184,0.18)" strokeDasharray="4,4" />
                          <line x1="0" y1="70" x2="500" y2="70" stroke="rgba(148,163,184,0.18)" strokeDasharray="4,4" />
                          <line x1="0" y1="110" x2="500" y2="110" stroke="rgba(148,163,184,0.18)" strokeDasharray="4,4" />

                          {/* Area Fill */}
                          <path
                            d={timelineData.areaPath}
                            fill="url(#clayAreaGlow)"
                          />

                          {/* 3D Tubular Stroke: Layer 1 - Deep Ambient Under-Glow */}
                          <path
                            d={timelineData.strokePath}
                            fill="none"
                            stroke="rgba(2, 132, 199, 0.3)"
                            strokeWidth="7"
                            strokeLinecap="round"
                            filter="url(#tube3dShadow)"
                          />

                          {/* 3D Tubular Stroke: Layer 2 - Solid Pipe Body */}
                          <path
                            d={timelineData.strokePath}
                            fill="none"
                            stroke="url(#tubeGradient)"
                            strokeWidth="4.5"
                            strokeLinecap="round"
                          />

                          {/* 3D Tubular Stroke: Layer 3 - Top Specular Sheen */}
                          <path
                            d={timelineData.strokePath}
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.7)"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            transform="translate(0, -1)"
                          />

                          {/* 3D Clay Sphere Data Nodes */}
                          {timelineData.pts.map((p, idx) => (
                            <g key={idx} className="group cursor-pointer">
                              {/* Ambient Node Shadow */}
                              <circle cx={p.x} cy={p.y + 2.5} r="6" fill="rgba(2, 132, 199, 0.35)" />
                              {/* White Rim */}
                              <circle cx={p.x} cy={p.y} r="5.5" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
                              {/* 3D Spherical Center */}
                              <circle cx={p.x} cy={p.y} r="3.2" fill="url(#nodeSphereGlow)" />
                              {/* Specular Highlight Dot */}
                              <circle cx={p.x - 1} cy={p.y - 1} r="0.9" fill="#ffffff" />
                              <title>{`${p.label}: ${p.count} Enrolled Students`}</title>
                            </g>
                          ))}
                        </svg>

                        {/* Grooved Inset X-Axis Timeline Bar */}
                        <div className="clay-pill-inset px-4 py-2 mt-3 flex justify-between text-[11px] font-mono font-black text-slate-600">
                          {timelineData.pts.map((p, idx) => (
                            <span key={idx} className="text-center truncate px-0.5">{p.label}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : chartViewMode === 'ps' ? (
                    <div className="space-y-5">
                      {/* Top Bar: 3D Clay Icon + Title & High-Contrast 3D Raised Badges */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-purple-600 shadow-[3px_5px_12px_rgba(160,175,205,0.35)] border border-white shrink-0">
                            <PieChart className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg lg:text-xl font-black text-slate-900 tracking-tight leading-tight">
                              Students vs Problem Statement Reading
                            </h3>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5">
                              Live participation headcounts across officially announced tracks
                            </p>
                          </div>
                        </div>

                        {/* Top Badges (matching image: 2 Teams blue, 3 Students purple, 2 Registrations cyan) */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="clay-badge-blue px-3.5 py-1.5 text-xs font-black flex items-center gap-1.5 cursor-default">
                            <Users className="w-3.5 h-3.5 text-blue-100" />
                            <span>{eventTeamBreakdown.teamsTotal} {eventTeamBreakdown.teamsTotal === 1 ? 'Team' : 'Teams'}</span>
                          </div>
                          <div className="clay-badge-purple px-3.5 py-1.5 text-xs font-black flex items-center gap-1.5 cursor-default">
                            <GraduationCap className="w-3.5 h-3.5 text-purple-100" />
                            <span>{totalEnrolledStudents} {totalEnrolledStudents === 1 ? 'Student' : 'Students'}</span>
                          </div>
                          <div className="clay-badge-cyan px-3.5 py-1.5 text-xs font-black flex items-center gap-1.5 cursor-default">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-100" />
                            <span>{currentEventRegs.length} Registrations</span>
                          </div>
                        </div>
                      </div>

                      {/* Main List with custom clay scrollbar on right */}
                      <div className="flex items-stretch gap-3">
                        {/* Scrollable Cards Container */}
                        <div className="flex-1 space-y-3.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                          {psStats.entries.length === 0 ? (
                            <div className="py-12 text-center text-xs text-slate-400 font-medium">
                              No problem statement data available yet.
                            </div>
                          ) : (
                            psStats.entries.map((entry, idx) => {
                              const studentPct = totalEnrolledStudents > 0
                                ? Math.round((entry.students / totalEnrolledStudents) * 100)
                                : 0;
                              const studentBarWidth = psStats.maxStudents > 0
                                ? (entry.students / psStats.maxStudents) * 100
                                : 0;
                              const candidateBarWidth = psStats.maxCandidates > 0
                                ? (entry.candidates / psStats.maxCandidates) * 100
                                : 0;

                              // Color badge style per track matching 3D spheres
                              const sphereGradients = [
                                'from-[#fb923c] to-[#ea580c]', // Orange
                                'from-[#6366f1] to-[#4338ca]', // Indigo / Purple
                                'from-[#38bdf8] to-[#0284c7]', // Cyan
                                'from-[#22c55e] to-[#15803d]', // Green
                                'from-[#ec4899] to-[#be185d]', // Pink
                              ];
                              const sphereGrad = sphereGradients[idx % sphereGradients.length];

                              return (
                                <div
                                  key={entry.trackNumber || idx}
                                  className="clay-item-panel p-4 sm:p-5 space-y-3.5"
                                >
                                  {/* Row 1: Number Sphere, Title, and Action Pills */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <div className={`w-9 h-9 rounded-full bg-gradient-to-b ${sphereGrad} text-white font-mono font-black text-sm flex items-center justify-center shrink-0 shadow-[0_4px_10px_rgba(0,0,0,0.2),inset_0_2px_2px_rgba(255,255,255,0.7)]`}>
                                        {idx + 1}
                                      </div>
                                      <span className="font-black text-slate-900 text-sm sm:text-base leading-snug">
                                        {entry.label}
                                      </span>
                                    </div>

                                    {/* Right Side: Badges */}
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
                                      {/* Teams Badge */}
                                      {entry.effectiveTeams > 0 ? (
                                        <div className="clay-badge-blue px-3 py-1 font-black text-xs flex items-center gap-1.5 shadow-xs">
                                          <Users className="w-3.5 h-3.5 text-blue-100" />
                                          <span>{entry.effectiveTeams} {entry.effectiveTeams === 1 ? 'Team' : 'Teams'}</span>
                                        </div>
                                      ) : (
                                        <div className="clay-groove px-3 py-1 font-bold text-xs text-slate-500 flex items-center gap-1.5">
                                          <Users className="w-3.5 h-3.5 text-slate-400" />
                                          <span>0 Teams</span>
                                        </div>
                                      )}

                                      {/* Students Badge */}
                                      {entry.students > 0 ? (
                                        <div className="clay-badge-purple px-3 py-1 font-black text-xs flex items-center gap-1.5 shadow-xs">
                                          <GraduationCap className="w-3.5 h-3.5 text-purple-100" />
                                          <span>{entry.students} {entry.students === 1 ? 'Student' : 'Students'}</span>
                                        </div>
                                      ) : (
                                        <div className="clay-groove px-3 py-1 font-bold text-xs text-slate-500 flex items-center gap-1.5">
                                          <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                                          <span>0 Students</span>
                                        </div>
                                      )}

                                      {/* Percent Pill */}
                                      <div className={`px-3 py-1 rounded-xl bg-gradient-to-b ${sphereGrad} text-white font-mono font-black text-xs min-w-[44px] text-center shadow-[0_4px_10px_rgba(0,0,0,0.18),inset_0_1.5px_2px_rgba(255,255,255,0.6)]`}>
                                        {studentPct}%
                                      </div>
                                    </div>
                                  </div>

                                  {/* Row 2: Grooved Progress Bars */}
                                  <div className="space-y-2 pt-1">
                                    {/* Students Bar */}
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-xs font-black text-slate-700 w-20 shrink-0 flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-xs" />
                                        <span>Students</span>
                                      </span>
                                      <div className="flex-1 h-3.5 clay-groove p-0.5 relative overflow-hidden flex items-center">
                                        {entry.students > 0 && (
                                          <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.max(studentBarWidth, 8)}%` }}
                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                            className="h-full clay-tube-purple"
                                          />
                                        )}
                                      </div>
                                      <span className="text-xs font-mono font-black text-slate-700 w-6 text-right">
                                        {entry.students}
                                      </span>
                                    </div>

                                    {/* Entries Bar */}
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-xs font-black text-slate-700 w-20 shrink-0 flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-xs" />
                                        <span>Entries</span>
                                      </span>
                                      <div className="flex-1 h-3.5 clay-groove p-0.5 relative overflow-hidden flex items-center">
                                        {entry.candidates > 0 && (
                                          <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.max(candidateBarWidth, 8)}%` }}
                                            transition={{ duration: 0.9, ease: 'easeOut' }}
                                            className="h-full clay-tube-cyan"
                                          />
                                        )}
                                      </div>
                                      <span className="text-xs font-mono font-black text-slate-700 w-6 text-right">
                                        {entry.candidates}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* 3D Vertical Scroll Track (Clay Gutter & Thumb matching image) */}
                        <div className="w-5 py-2 px-0.5 rounded-full bg-[#e6ecf4] shadow-[inset_2.5px_2.5px_5px_rgba(160,175,205,0.55),inset_-2.5px_-2.5px_5px_rgba(255,255,255,1)] flex flex-col items-center justify-between shrink-0 self-stretch my-1 select-none pointer-events-none">
                          <span className="text-slate-400 text-[9px] font-black">▲</span>
                          <div className="w-3.5 h-16 rounded-full bg-gradient-to-b from-slate-400 via-slate-500 to-slate-600 shadow-[2px_3px_6px_rgba(0,0,0,0.25),inset_1px_1px_2px_rgba(255,255,255,0.5)]" />
                          <span className="text-slate-400 text-[9px] font-black">▼</span>
                        </div>
                      </div>

                      {/* Footer Summary */}
                      <div className="pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-700">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                          <span>Reading from {currentEventRegs.length} joined candidate entries</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>
                            Tracks: <strong className="text-slate-900 font-black">{psStats.entries.length} Announced</strong>
                          </span>
                          <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-b from-[#e9d5ff] to-[#d8b4fe] text-purple-950 font-black text-xs border border-white shadow-[2px_4px_10px_rgba(192,132,252,0.35),inset_0_1.5px_2px_rgba(255,255,255,0.8)]">
                            <span>Total Participating: {totalEnrolledStudents} Students</span>
                            <span className="text-purple-400 text-xs">✦</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Body: Mode 2 - Actual Enrolled Student List in Excel Chart Format */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-black uppercase tracking-wider text-slate-800 font-mono">
                            Excel Roster • {currentEventRegs.length} Registrations ({totalEnrolledStudents} Students)
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                          Real Database Roster
                        </span>
                      </div>

                      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-inner max-h-56 overflow-y-auto">
                        {currentEventRegs.length === 0 ? (
                          <div className="py-12 text-center text-xs text-slate-500 font-medium">
                            No students have registered yet for <strong className="text-slate-800">{currentChartEvent?.title || 'this event'}</strong>.
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-[#f1f5f9] text-slate-700 font-mono text-[10px] uppercase font-bold sticky top-0 border-b border-slate-200 z-10">
                              <tr>
                                <th className="py-2 px-3 border-r border-slate-200">#</th>
                                <th className="py-2 px-3 border-r border-slate-200">Roll / Reg No</th>
                                <th className="py-2 px-3 border-r border-slate-200">Candidate / Leader</th>
                                <th className="py-2 px-3 border-r border-slate-200">Type</th>
                                <th className="py-2 px-3 border-r border-slate-200">Team / Roster</th>
                                <th className="py-2 px-3 border-r border-slate-200">Branch</th>
                                <th className="py-2 px-3 border-r border-slate-200">Timestamp</th>
                                <th className="py-2 px-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {currentEventRegs.map((r, idx) => {
                                const hasExplicitTeamName = Boolean(r.team_name && r.team_name.trim() && r.team_name !== '-');
                                 const isTeam = r.registration_type === 'team';
                                const memberCount = (Array.isArray(r.team_members) && r.team_members.length > 0)
                                  ? (r.team_members.some((m) => m.name && r.name && m.name.toLowerCase() === r.name.toLowerCase()) ? r.team_members.length : r.team_members.length + 1)
                                  : 1;
                                const displayName = hasExplicitTeamName
                                  ? r.team_name!.trim()
                                  : `Team ${r.name ? r.name.split(' ')[0] : 'Solo'}`;


                                return (
                                  <tr key={r.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="py-2 px-3 font-mono font-bold text-slate-400 border-r border-slate-100">{idx + 1}</td>
                                    <td className="py-2 px-3 font-mono font-bold text-slate-800 border-r border-slate-100">{r.registration_no || '-'}</td>
                                    <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-100 truncate max-w-[140px]">{r.name}</td>
                                    <td className="py-2 px-3 border-r border-slate-100">
                                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-black ${isTeam ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'}`}>
                                        {isTeam ? 'Team' : 'Individual'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 font-medium text-slate-700 border-r border-slate-100 min-w-[180px]">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="font-black text-slate-900 text-xs truncate max-w-[130px]">{displayName}</span>
                                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/60 shrink-0">
                                          {memberCount} mem
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 text-slate-600 border-r border-slate-100 truncate max-w-[120px]">{r.branch || '-'}</td>
                                    <td className="py-2 px-3 font-mono text-[10px] text-slate-500 border-r border-slate-100 whitespace-nowrap">
                                      {r.registered_at ? new Date(r.registered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </td>
                                    <td className="py-2 px-3">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${r.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                        {r.status || 'confirmed'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Problem Statement Distribution (Real Reading Circular Puzzle) */}
                <div className="clay-card-3d p-6 sm:p-7 text-slate-900 space-y-4 flex flex-col justify-between relative overflow-hidden">
                  {/* Header: Clock Icon + Title on Left, 2-Row Controls on Right */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-indigo-600 shadow-[3px_4px_10px_rgba(160,175,205,0.35)] border border-white shrink-0">
                        <Clock className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                          PS Enrollment Reading
                        </h3>
                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                          5-partition circular puzzle • Sized by participating teams
                        </p>
                      </div>
                    </div>

                    {/* Clay Controls: Teams vs Students Mode Switcher */}
                    <div className="flex items-center shrink-0">
                      <div className="clay-pill-inset p-1 flex items-center gap-1">
                        <button
                          onClick={() => setDonutMetricMode('teams')}
                          className={`px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black transition-all cursor-pointer ${
                            donutMetricMode === 'teams'
                              ? 'clay-pill-raised text-indigo-700 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Teams ({psTotalTeamsDisplay})
                        </button>
                        <button
                          onClick={() => setDonutMetricMode('students')}
                          className={`px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black transition-all cursor-pointer ${
                            donutMetricMode === 'students'
                              ? 'clay-pill-raised text-purple-700 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Students ({psTotalDisplay})
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Circular Puzzle Partition SVG with Radial Dividers and Upright In-Arc Labels */}
                  <div className="flex-1 flex flex-col items-center justify-center py-2 relative">
                    <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                      <svg
                        className="w-full h-full drop-shadow-[0_12px_28px_rgba(148,163,184,0.35)] overflow-visible"
                        viewBox="0 0 360 360"
                      >
                        <defs>
                          <filter id="clayDonutShadow" x="-30%" y="-30%" width="160%" height="160%">
                            <feDropShadow dx="4" dy="8" stdDeviation="8" floodColor="#64748b" floodOpacity="0.32" />
                            <feDropShadow dx="-2" dy="-2" stdDeviation="6" floodColor="#ffffff" floodOpacity="0.9" />
                          </filter>
                          <linearGradient id="clayPuffSheen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
                            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
                            <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
                          </linearGradient>
                        </defs>

                        {/* Circular Puzzle Partition Slices with 3D Bevel */}
                        {psDonutSegments.map((s, idx) => {
                          const isHovered = hoveredSliceIdx === idx;
                          return (
                            <g key={`ps-group-${s.id || idx}`}>
                              <motion.path
                                d={s.path}
                                fill={s.color}
                                stroke="#ffffff"
                                strokeWidth="4"
                                strokeLinejoin="round"
                                filter="url(#clayDonutShadow)"
                                initial={{ opacity: 0, scale: 0.94 }}
                                animate={{
                                  opacity: hoveredSliceIdx === null || isHovered ? 1 : 0.65,
                                  scale: isHovered ? 1.04 : 1,
                                }}
                                transition={{ duration: 0.25 }}
                                className="cursor-pointer transition-all duration-200 origin-center"
                                onMouseEnter={() => setHoveredSliceIdx(idx)}
                                onMouseLeave={() => setHoveredSliceIdx(null)}
                              >
                                <title>{`${s.full}: ${s.teamsCount} Teams • ${s.count} Students (${s.percent}%)`}</title>
                              </motion.path>
                              {/* 3D Puffy Highlight Overlay */}
                              <path
                                d={s.path}
                                fill="url(#clayPuffSheen)"
                                stroke="none"
                                className="pointer-events-none"
                              />
                            </g>
                          );
                        })}

                        {/* In-Arc Text Labels (Short Problem Statement Title + Teams & Student Headcount) */}
                        {psDonutSegments.map((s, idx) => {
                          const sweepAngle = s.endAngle - s.startAngle;
                          // Show in-arc label if slice sweep is at least 22 degrees
                          if (sweepAngle < 22) return null;
                          return (
                            <g
                              key={`ps-text-${s.id || idx}`}
                              transform={`rotate(${s.textRot}, ${s.midX}, ${s.midY})`}
                              className="pointer-events-none select-none"
                            >
                              <text
                                x={s.midX}
                                y={s.midY - 4}
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize="9.5"
                                fontWeight="900"
                                className="font-mono tracking-tight"
                                style={{
                                  textShadow: '0 1px 3px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)',
                                }}
                              >
                                {s.short}
                              </text>
                              <text
                                x={s.midX}
                                y={s.midY + 8}
                                textAnchor="middle"
                                fill="#ffffff"
                                fillOpacity="0.95"
                                fontSize="8.5"
                                fontWeight="800"
                                className="font-mono"
                                style={{
                                  textShadow: '0 1px 3px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)',
                                }}
                              >
                                {s.teamsCount} {s.teamsCount === 1 ? 'Team' : 'Teams'} • {s.count} {s.count === 1 ? 'Std' : 'Stds'}
                              </text>
                            </g>
                          );
                        })}
                      </svg>

                      {/* Recessed Clay Well & Central Puzzle Hub: Total Participating Teams & Total Students Count */}
                      <div className="absolute w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-[#e8edf5] p-2 shadow-[inset_4px_4px_10px_rgba(160,175,205,0.55),inset_-4px_-4px_10px_rgba(255,255,255,1)] flex items-center justify-center pointer-events-none z-10">
                        <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center text-center shadow-[4px_6px_16px_rgba(160,175,205,0.35),inset_1.5px_1.5px_3px_rgba(255,255,255,1)] border border-white p-2">
                          <span className="text-[7.5px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
                            PARTICIPATION
                          </span>

                          <div className="flex items-center justify-center gap-2 sm:gap-2.5 my-1 w-full px-1">
                            {/* TEAMS COUNT */}
                            <div className={`flex flex-col items-center transition-all ${donutMetricMode === 'teams' ? 'scale-105' : 'opacity-90'}`}>
                              <motion.span
                                key={`teams-${psTotalTeamsDisplay}`}
                                initial={{ scale: 0.85, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight leading-none font-mono"
                              >
                                {psTotalTeamsDisplay}
                              </motion.span>
                              <span className="text-[8.5px] sm:text-[9px] font-black text-blue-600 uppercase tracking-tight mt-0.5">
                                {psTotalTeamsDisplay === 1 ? 'Team' : 'Teams'}
                              </span>
                            </div>

                            {/* Divider */}
                            <div className="w-[1.5px] h-7 bg-slate-200/90 shrink-0" />

                            {/* STUDENTS COUNT */}
                            <div className={`flex flex-col items-center transition-all ${donutMetricMode === 'students' ? 'scale-105' : 'opacity-90'}`}>
                              <motion.span
                                key={`students-${psTotalDisplay}`}
                                initial={{ scale: 0.85, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-2xl sm:text-3xl font-black text-pink-600 tracking-tight leading-none font-mono"
                              >
                                {psTotalDisplay}
                              </motion.span>
                              <span className="text-[8.5px] sm:text-[9px] font-black text-pink-600 uppercase tracking-tight mt-0.5">
                                {psTotalDisplay === 1 ? 'Student' : 'Students'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[7.5px] font-mono font-black text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                              Live Roster
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Decorative Sparkle Star in Bottom Right Corner */}
                  <div className="absolute bottom-3 right-4 text-slate-300 pointer-events-none select-none text-2xl font-black">
                    ✦
                  </div>

                  {/* Modal to configure announced problem statements for this event */}
                  <AnimatePresence>
                    {showEditPsModal && (
                      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-4 text-slate-900"
                        >
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
                                <PieChart className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-base font-black text-slate-900">
                                  Announced Problem Statements
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                  {currentChartEvent?.title || 'Selected Event'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowEditPsModal(false)}
                              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {editPsList.map((ps, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-mono font-black flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={ps}
                                  onChange={(e) => {
                                    const updated = [...editPsList];
                                    updated[idx] = e.target.value;
                                    setEditPsList(updated);
                                  }}
                                  placeholder={`Problem Statement ${idx + 1}`}
                                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                />
                                {editPsList.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => setEditPsList(editPsList.filter((_, i) => i !== idx))}
                                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 cursor-pointer"
                                    title="Remove"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}

                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditPsList([...editPsList, ''])}
                                className="flex-1 py-2 rounded-xl border border-dashed border-slate-300 text-slate-600 font-bold text-xs hover:border-indigo-400 hover:text-indigo-600 transition-colors cursor-pointer"
                              >
                                + Add Problem Statement
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditPsList([
                                  'Smart Campus & EdTech (Software)',
                                  'Agritech & IoT Integration (Hardware)',
                                  'Disaster Management & Autonomous Systems (Hardware/AI)',
                                  'Healthcare & Accessibility (Software/App)',
                                  'Sustainability & Smart City (Software/Data)',
                                ])}
                                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                              >
                                Reset 5 Official PS
                              </button>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setShowEditPsModal(false)}
                              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const valid = editPsList.map((s) => s.trim()).filter(Boolean);
                                if (valid.length === 0) {
                                  showNotification('Please enter at least 1 problem statement.', 'danger');
                                  return;
                                }
                                if (currentChartEvent) {
                                  const updatedEvent = {
                                    ...currentChartEvent,
                                    problem_statements: valid,
                                  };
                                  const updatedEvents = saveEventProposal(updatedEvent);
                                  setEventProposals(updatedEvents);
                                }
                                setShowEditPsModal(false);
                                showNotification('Announced problem statements updated successfully!', 'success');
                              }}
                              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
                            >
                              Save Problem Statements
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
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
                    className="px-4 py-2 rounded-2xl bg-white/95 hover:bg-white text-slate-900 text-xs font-black transition-all cursor-pointer flex items-center gap-2 shadow-[0_6px_16px_rgba(165,180,210,0.4),inset_1px_1px_2px_rgba(255,255,255,0.9)] hover:scale-105 active:scale-95 border border-slate-200/80"
                    title="Open pending student applications approval workspace"
                  >
                    <span>View All Applications</span>
                    <ArrowRight className="w-4 h-4 text-indigo-600" />
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

          {/* TAB 2: PENDING STUDENT CANDIDATE APPLICATIONS REVIEW WORKSPACE */}
          {activeTab === 'applications' && (
            <div className="space-y-4 md:space-y-6">
              {/* Header Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-6 rounded-[24px] sm:rounded-[28px] glass-panel border border-white/80 shadow-[0_10px_25px_rgba(165,180,210,0.25)]">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="px-2.5 py-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80 font-black text-[10px] sm:text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                      title="Return to Sic Dashboard"
                    >
                      <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-700" />
                      <span>Back to Dashboard</span>
                    </button>
                    <span className="px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-wider bg-amber-500/15 text-amber-900 border border-amber-400/40 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      <span className="hidden xs:inline">Awaiting Coordinator Review</span>
                      <span className="xs:hidden">Pending Review</span>
                    </span>
                    <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-500">
                      Total: <strong className="text-slate-900 font-black">{applications.length}</strong>
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500" />
                    <span>Pending Student Applications ({filteredApps.length})</span>
                  </h2>
                  <p className="text-[11px] sm:text-xs font-medium text-slate-600 max-w-2xl">
                    Review join requests submitted by students. Accept candidates to admit them directly into the official SIC member roster.
                  </p>
                </div>

                {/* Right Action Controls: View Toggle, Export, Accept All */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {/* View Mode Toggle */}
                  <div className="flex items-center p-0.5 bg-slate-200/80 rounded-lg sm:rounded-xl border border-white">
                    <button
                      onClick={() => setIsExcelView(false)}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                        !isExcelView ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span>Cards</span>
                    </button>
                    <button
                      onClick={() => setIsExcelView(true)}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                        isExcelView ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileSpreadsheet className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                      <span className="hidden xs:inline">Excel View</span>
                      <span className="xs:hidden">Excel</span>
                    </button>
                  </div>

                  {/* Export Excel Button */}
                  <button
                    onClick={exportPendingApplicationsToExcel}
                    disabled={applications.length === 0}
                    className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all active:scale-95 border border-white/40"
                    title="Export pending applicant roster to Excel"
                  >
                    <FileSpreadsheet className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-200" />
                    <span className="hidden sm:inline">Export Excel</span>
                    <span className="sm:hidden">Export</span>
                  </button>

                  {/* Accept All Pending Button */}
                  {applications.length > 1 && (
                    <button
                      onClick={handleApproveAllPending}
                      className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-400 text-slate-950 font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-[0_4px_14px_rgba(16,185,129,0.2)] flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all border border-white"
                      title="Approve and admit all pending students at once"
                    >
                      <CheckCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950" />
                      <span>Accept All</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Search & Domain Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 sm:p-4 rounded-[20px] sm:rounded-2xl bg-white/80 border border-white shadow-sm">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, email, or reg no..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-[11px] sm:text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <select
                    value={selectedDomainFilter}
                    onChange={(e) => setSelectedDomainFilter(e.target.value)}
                    className="flex-1 sm:flex-none px-2.5 py-2 rounded-xl bg-white border border-slate-200 text-[11px] sm:text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer shadow-xs"
                  >
                    {DOMAINS_LIST.map((dom) => (
                      <option key={dom} value={dom}>
                        {dom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pending Applications Content */}
              {applications.length === 0 ? (
                /* Empty state when 0 applications are pending */
                <div className="p-8 sm:p-12 lg:p-16 text-center rounded-[28px] sm:rounded-[32px] bg-white/90 border-2 border-white shadow-[0_12px_32px_rgba(165,180,210,0.2)] space-y-3 sm:space-y-4 max-w-xl mx-auto">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
                    <CheckCircle className="w-7 h-7 sm:w-9 sm:h-9" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">All Candidate Applications Cleared!</h3>
                    <p className="text-[11px] sm:text-xs text-slate-600 max-w-md mx-auto">
                      There are currently zero pending student join requests awaiting decision. When new students submit their membership application, they will appear right here for your approval.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Back to Dashboard</span>
                    </button>
                  </div>
                </div>
              ) : filteredApps.length === 0 ? (
                /* Empty state when search matches nothing */
                <div className="p-12 text-center rounded-[28px] bg-white/90 border border-white shadow-sm space-y-3">
                  <Search className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-sm font-black text-slate-900">No Pending Applications Found</p>
                  <p className="text-xs text-slate-600">No candidate matches &quot;{searchQuery}&quot; or the selected domain filter.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedDomainFilter('All Domains');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 text-xs font-bold hover:bg-slate-300 transition-colors cursor-pointer"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : isExcelView ? (
                /* Excel View: Structured Spreadsheet Table with Quick Accept & Decline Actions */
                <div className="rounded-[20px] sm:rounded-[28px] bg-white border border-slate-200 shadow-[0_10px_25px_rgba(165,180,210,0.2)] overflow-hidden">
                  <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                      <span className="text-[10px] sm:text-xs font-mono font-black uppercase text-slate-800 truncate">
                        Pending Roster ({filteredApps.length})
                      </span>
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                      Approval Needed
                    </span>
                  </div>
                  <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
                    <table className="w-full text-left text-[10px] sm:text-xs border-collapse min-w-[700px]">
                      <thead className="bg-[#f8fafc] text-slate-700 font-mono text-[9px] sm:text-[10px] uppercase font-bold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="py-2 px-3 border-r border-slate-200 w-8">#</th>
                          <th className="py-2 px-3 border-r border-slate-200 w-24">Reg / Roll</th>
                          <th className="py-2 px-3 border-r border-slate-200">Name</th>
                          <th className="py-2 px-3 border-r border-slate-200">Email</th>
                          <th className="py-2 px-3 border-r border-slate-200 w-20">Domain</th>
                          <th className="py-2 px-3 border-r border-slate-200 w-24">Branch</th>
                          <th className="py-2 px-3 border-r border-slate-200 w-16">Applied</th>
                          <th className="py-2 px-3 text-center w-28">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredApps.map((app, idx) => {
                          const u = app.user;
                          if (!u) return null;
                          return (
                            <tr key={app.id || idx} className="hover:bg-amber-50/30 transition-colors">
                              <td className="py-1.5 px-3 font-mono font-bold text-slate-400 border-r border-slate-100">{idx + 1}</td>
                              <td className="py-1.5 px-3 font-mono font-bold text-indigo-950 border-r border-slate-100">{u.registration_no || '-'}</td>
                              <td className="py-1.5 px-3 font-black text-slate-900 border-r border-slate-100">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-[8px] flex items-center justify-center shrink-0">
                                    {u.avatar_url ? (
                                      <img src={u.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                      u.first_name ? u.first_name[0] : 'S'
                                    )}
                                  </div>
                                  <span className="truncate max-w-[120px]">{u.first_name} {u.last_name}</span>
                                </div>
                              </td>
                              <td className="py-1.5 px-3 text-indigo-700 font-bold border-r border-slate-100 truncate max-w-[130px]">{u.email}</td>
                              <td className="py-1.5 px-3 border-r border-slate-100">
                                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-mono font-black uppercase bg-purple-50 text-purple-900 border border-purple-100">
                                  {u.domain || 'Tech'}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 text-slate-700 border-r border-slate-100 truncate max-w-[100px]">{u.branch || '-'}</td>
                              <td className="py-1.5 px-3 text-slate-500 font-mono text-[9px] border-r border-slate-100 whitespace-nowrap">
                                {app.created_at ? new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '-'}
                              </td>
                              <td className="py-1.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleApprove(u.id, `${u.first_name} ${u.last_name}`)}
                                    className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] transition-all cursor-pointer flex items-center gap-0.5 shadow-xs"
                                  >
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    <span>Accept</span>
                                  </button>
                                  <button
                                    onClick={() => handleDecline(u.id, `${u.first_name} ${u.last_name}`)}
                                    className="p-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer"
                                  >
                                    <UserX className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Card View: Rich Pending Student Profile Cards with Direct Accept/Decline Actions */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                  {filteredApps.map((app) => {
                    const u = app.user;
                    if (!u) return null;
                    return (
                      <div
                        key={app.id}
                        className="p-4 sm:p-6 rounded-[24px] sm:rounded-[28px] bg-white/95 border-2 border-white shadow-[0_8px_20px_rgba(165,180,210,0.25),-4px_-4px_15px_rgba(255,255,255,0.9)] space-y-3 sm:space-y-4 flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(165,180,210,0.4)]"
                      >
                        <div className="space-y-3">
                          {/* Card Header Status Pill & Date */}
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 sm:px-3.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-mono font-black uppercase bg-amber-100 text-amber-900 border border-amber-300 shadow-xs flex items-center gap-1">
                              <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-amber-500 animate-ping" />
                              Pending
                            </span>
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 bg-slate-100 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-slate-200">
                              {app.created_at ? new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Recent'}
                            </span>
                          </div>

                          {/* Candidate Avatar & Name */}
                          <div className="flex items-center gap-3 pt-0.5">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white font-black text-sm sm:text-base flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(99,102,241,0.25)] border border-white overflow-hidden">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="Candidate" className="w-full h-full object-cover" />
                              ) : (
                                <span>{u.first_name ? u.first_name[0] : 'S'}{u.last_name ? u.last_name[0] : ''}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm sm:text-base font-black text-slate-900 truncate tracking-tight leading-tight">
                                {u.first_name} {u.last_name}
                              </h3>
                              <p className="text-[10px] sm:text-xs font-bold text-indigo-700 truncate">{u.email}</p>
                            </div>
                          </div>

                          {/* Candidate Academic Details Grid */}
                          <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] border border-slate-100 space-y-1.5 text-[10px] sm:text-[11px] font-bold shadow-inner">
                            <div className="flex justify-between items-center bg-white px-2.5 py-1 rounded-lg border border-slate-100/50">
                              <span className="text-slate-400 font-mono text-[8px] sm:text-[9px] uppercase tracking-tighter">Reg No</span>
                              <span className="text-indigo-950 font-black font-mono">{u.registration_no || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center bg-white px-2.5 py-1 rounded-lg border border-slate-100/50">
                              <span className="text-slate-400 font-mono text-[8px] sm:text-[9px] uppercase tracking-tighter">Domain</span>
                              <span className="text-purple-900 font-extrabold">{u.domain || 'Tech'}</span>
                            </div>
                            {u.branch && (
                              <div className="flex justify-between items-center bg-white px-2.5 py-1 rounded-lg border border-slate-100/50">
                                <span className="text-slate-400 font-mono text-[8px] sm:text-[9px] uppercase tracking-tighter">Branch</span>
                                <span className="text-slate-900 font-extrabold truncate max-w-[120px]">{u.branch}</span>
                              </div>
                            )}
                            {u.phone_no && (
                              <div className="flex justify-between items-center bg-white px-2.5 py-1 rounded-lg border border-slate-100/50">
                                <span className="text-slate-400 font-mono text-[8px] sm:text-[9px] uppercase tracking-tighter">Mobile</span>
                                <span className="text-emerald-700 font-mono font-black">{u.phone_no}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Decisions Action Buttons: Accept / Decline */}
                        <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100">
                          <button
                            onClick={() => handleApprove(u.id, `${u.first_name} ${u.last_name}`)}
                            className="flex-1 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-400 text-slate-950 font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-sm hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-white"
                            title="Accept this student into official club roster"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => handleDecline(u.id, `${u.first_name} ${u.last_name}`)}
                            className="py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white font-black text-[10px] sm:text-xs shadow-sm hover:scale-[1.02] active:scale-95 transition-all border border-white flex items-center justify-center shrink-0"
                            title="Decline Candidate Application"
                          >
                            <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                                <img src={m.avatar_url} alt={`${m.first_name || ''} ${m.last_name || ''}`} className="w-full h-full object-cover" />
                              ) : (
                                `${m.first_name ? m.first_name[0] : ''}${m.last_name ? m.last_name[0] : ''}`
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
            {/* Header / Profile Picture Upload */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-4">
                <div className="relative group shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white font-black text-lg flex items-center justify-center shadow-lg border-2 border-white/40 overflow-hidden">
                    {activeCoreUser.avatar_url ? (
                      <img src={activeCoreUser.avatar_url} alt="Core Member Profile" className="w-full h-full object-cover" />
                    ) : activeCoreUser.first_name ? (
                      `${activeCoreUser.first_name[0]}${activeCoreUser.last_name ? activeCoreUser.last_name[0] : ''}`
                    ) : (
                      'SP'
                    )}
                  </div>
                  <label
                    htmlFor="core-profile-avatar-input"
                    className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                    title="Change Profile Photo"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="text-[9px] font-bold mt-0.5">Edit</span>
                  </label>
                  <input
                    type="file"
                    id="core-profile-avatar-input"
                    accept="image/*"
                    onChange={handleCoreProfileAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{activeCoreUser.first_name} {activeCoreUser.last_name}</h3>
                  <p className="text-xs text-cyan-800 font-medium">{activeCoreUser.designation || 'Core Council Member'}</p>
                  <label
                    htmlFor="core-profile-avatar-input"
                    className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-900 border border-indigo-500/30 text-[11px] font-extrabold cursor-pointer transition-all"
                  >
                    <Camera className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Choose Profile Picture</span>
                  </label>
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
      <div className="md:hidden fixed bottom-2.5 left-3 right-3 z-40 clay-pill bg-[#eef2f9]/95 backdrop-blur-2xl border border-white py-1 px-2 flex items-center justify-around shadow-[0_12px_28px_rgba(150,165,205,0.38)] max-w-md mx-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-0.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'dashboard' 
              ? 'bg-[#dfe6f5] text-cyan-600 font-black shadow-[inset_2px_2px_4px_rgba(150,165,205,0.5),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 text-cyan-500" />
          <span className="text-[9px] font-bold leading-none">Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-0.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'members' 
              ? 'bg-[#d1fae5] text-emerald-800 font-black shadow-[inset_2px_2px_4px_rgba(16,185,129,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-600" />
          <span className="text-[9px] font-bold leading-none">Members</span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-0.5 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'announcements' 
              ? 'bg-[#ede9fe] text-purple-800 font-black shadow-[inset_2px_2px_4px_rgba(139,92,246,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4 text-purple-600" />
          <span className="text-[9px] font-bold leading-none">Notices</span>
          {announcements.length > 0 && (
            <span className="absolute -top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center shadow-sm">
              {announcements.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('council')}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-0.5 rounded-xl transition-all cursor-pointer ${
            activeTab === 'council' 
              ? 'bg-[#e0f2fe] text-cyan-800 font-black shadow-[inset_2px_2px_4px_rgba(6,182,212,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]' 
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <Crown className="w-4 h-4 text-cyan-600" />
          <span className="text-[9px] font-bold leading-none">Core</span>
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
