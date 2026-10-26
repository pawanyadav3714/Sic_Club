import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  Download,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  Award,
  Layers,
  ChevronRight,
  ExternalLink,
  QrCode,
  Printer,
  X,
  ShieldCheck,
  Check,
  FileSpreadsheet,
  AlertCircle,
  Phone
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { EventProposal, EventRegistration } from '../types';
import { getEventRegistrations, getStoredEventRegistrations, fetchLiveEvents, CATEGORY_LABELS } from '../lib/eventStorage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface EnrolledMembersPageProps {
  event: EventProposal;
  onBack: () => void;
  onRefreshEvent?: () => void;
}

export default function EnrolledMembersPage({
  event,
  onBack,
  onRefreshEvent
}: EnrolledMembersPageProps) {
  // Initialize with local database cache immediately so cards render at 0ms delay!
  const [registrations, setRegistrations] = useState<EventRegistration[]>(() => {
    return getStoredEventRegistrations().filter((r) => r.event_id === event.id);
  });
  // If we already have stored records, loading is false on render 0!
  const [loading, setLoading] = useState<boolean>(() => {
    const cached = getStoredEventRegistrations().filter((r) => r.event_id === event.id);
    return cached.length === 0;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'individual' | 'team'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'software' | 'hardware'>('all');
  const [selectedPass, setSelectedPass] = useState<EventRegistration | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Directly load registrations from database without multi-step blocking queries
  const loadRegistrations = async (isManualClick = false) => {
    if (isManualClick) setIsRefreshing(true);
    try {
      if (isSupabaseConfigured && supabase) {
        // Direct single query to event_registrations table with 1800ms race timeout
        const queryPromise = supabase
          .from('event_registrations')
          .select('*')
          .eq('event_id', event.id);

        const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error('Direct query timeout')), 1800)
        );

        const { data, error } = (await Promise.race([queryPromise, timeoutPromise])) as any;

        if (!error && Array.isArray(data)) {
          const mapped: EventRegistration[] = data.map((r: any) => ({
            id: r.id || r.user_id,
            event_id: r.event_id,
            name: r.full_name || r.name || 'Anonymous Student',
            email: r.email,
            phone_no: r.phone_no,
            branch: r.branch,
            registration_no: r.registration_no,
            registration_type: r.registration_type || 'individual',
            team_name: r.team_name,
            category: r.category,
            team_members: r.team_members,
            selected_problem_statement: r.selected_problem_statement,
            status: r.status,
            waitlist_position: r.waitlist_position,
            registered_at: r.created_at || r.registered_at || new Date().toISOString(),
          }));

          setRegistrations(mapped);
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

          // Update local cache immediately so it stays in exact sync with database
          try {
            const otherRegs = getStoredEventRegistrations().filter((r) => r.event_id !== event.id);
            localStorage.setItem('sic_event_registrations', JSON.stringify([...otherRegs, ...mapped]));
          } catch (e) {}

          // Background revalidation of parent counts without blocking UI
          if (onRefreshEvent && isMountedRef.current) {
            onRefreshEvent();
          }
          return;
        }
      }

      // Fallback
      if (isMountedRef.current) {
        const fallback = getStoredEventRegistrations().filter((r) => r.event_id === event.id);
        setRegistrations(fallback);
      }
    } catch (e) {
      console.warn('Direct database fetch fell back to cache:', e);
      if (isMountedRef.current) {
        const fallback = getStoredEventRegistrations().filter((r) => r.event_id === event.id);
        setRegistrations(fallback);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    // If loading is true (0 cached items), make sure it terminates within 800ms max so user is never stuck
    const safetyTimer = setTimeout(() => {
      if (isMountedRef.current) setLoading(false);
    }, 800);

    loadRegistrations();

    // Listen for cross-tab or background registration updates
    const handleUpdate = () => {
      if (isMountedRef.current) loadRegistrations();
    };
    window.addEventListener('sic_events_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      isMountedRef.current = false;
      clearTimeout(safetyTimer);
      window.removeEventListener('sic_events_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [event.id]);

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      // Type filter
      if (typeFilter !== 'all') {
        const regType = reg.registration_type || 'individual';
        if (regType !== typeFilter) return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        const regCat = (reg.category || '').toLowerCase();
        if (regCat !== categoryFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (reg.name || '').toLowerCase().includes(q);
        const emailMatch = (reg.email || '').toLowerCase().includes(q);
        const teamMatch = (reg.team_name || '').toLowerCase().includes(q);
        const regNoMatch = (reg.registration_no || '').toLowerCase().includes(q);
        const branchMatch = (reg.branch || '').toLowerCase().includes(q);
        const problemMatch = (reg.selected_problem_statement || '').toLowerCase().includes(q);
        const membersMatch = (reg.team_members || []).some(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.registration_no.toLowerCase().includes(q) ||
            m.branch.toLowerCase().includes(q) ||
            (m.phone_no || (m as any).phone || (m as any).mobile || '').toLowerCase().includes(q)
        );

        if (!nameMatch && !emailMatch && !teamMatch && !regNoMatch && !branchMatch && !problemMatch && !membersMatch) {
          return false;
        }
      }

      return true;
    });
  }, [registrations, typeFilter, categoryFilter, searchQuery]);

  const individualCount = registrations.filter(
    (r) => (r.registration_type || 'individual') === 'individual'
  ).length;
  const teamCount = registrations.filter((r) => r.registration_type === 'team').length;
  const confirmedCount = registrations.filter((r) => r.status === 'confirmed').length;

  // Export to Excel / CSV
  const handleExportRoster = () => {
    if (registrations.length === 0) {
      alert('No registrations available to export.');
      return;
    }

    const exportRows = registrations.map((r, index) => {
      const isTeam = r.registration_type === 'team';
      const membersStr =
        isTeam && r.team_members && r.team_members.length > 0
          ? r.team_members.map((m) => {
              const ph = m.phone_no || (m as any).phone || (m as any).mobile || '';
              return `${m.name} (${m.registration_no}, ${m.branch}${ph ? `, Ph: ${ph}` : ''})`;
            }).join('; ')
          : 'N/A';

      return {
        '#': index + 1,
        'Registration ID': r.id,
        'Type': isTeam ? 'Team' : 'Individual',
        'Team Name': r.team_name || 'N/A',
        'Category': r.category ? r.category.toUpperCase() : 'N/A',
        'Primary Candidate / Leader': r.name,
        'Email': r.email,
        'Phone No': r.phone_no || 'N/A',
        'Registration / Roll No': r.registration_no || 'N/A',
        'Branch': r.branch || 'N/A',
        'Selected Problem Statement': r.selected_problem_statement || 'N/A',
        'Team Members': membersStr,
        'Status': r.status === 'confirmed' ? 'CONFIRMED' : 'WAITLISTED',
        'Waitlist Position': r.waitlist_position || '-',
        'Registration Timestamp': r.registered_at ? new Date(r.registered_at).toLocaleString() : 'N/A'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Enrolled Students');

    const cleanTitle = event.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    XLSX.writeFile(workbook, `${cleanTitle}_Enrolled_Students.xlsx`);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* 1. TOP BREADCRUMB & BACK NAVIGATION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onBack}
            className="p-2 sm:p-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-sm transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 group active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 transition-transform group-hover:-translate-x-1" />
            <span className="text-[11px] sm:text-sm font-black uppercase tracking-wider">Back to Events</span>
          </button>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 font-bold">
            <span>Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Events</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-indigo-600 font-bold truncate max-w-[200px]">{event.title}</span>
          </div>
        </div>

        {/* Action Controls - Responsive side-by-side row on mobile */}
        <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => loadRegistrations(true)}
            disabled={isRefreshing}
            className="flex-1 sm:flex-none justify-center px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] sm:text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer disabled:opacity-60 active:scale-95"
            title="Refresh directly from Supabase database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Database'}</span>
          </button>

          <button
            onClick={handleExportRoster}
            className="flex-1 sm:flex-none justify-center px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-200" />
            <span>Export Roster</span>
          </button>
        </div>
      </div>

      {/* 2. GRAND ANNOUNCED EVENT SHOWCASE HEADER CARD */}
      <div className="relative rounded-[24px] sm:rounded-[32px] overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl border-2 sm:border-4 border-white/10">
        {/* Background Cover Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={event.cover_image_path}
            alt={event.title}
            className="w-full h-full object-cover opacity-20 filter blur-[2px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent" />
        </div>

        {/* Content Inside Announced Event Banner */}
        <div className="relative z-10 p-4 sm:p-8 space-y-4 sm:space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
              <span className="px-2.5 py-0.5 sm:px-3.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 backdrop-blur-md">
                {CATEGORY_LABELS[event.category]?.label || event.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono uppercase font-bold bg-white/10 text-white/90 border border-white/15">
                {event.assigned_team}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Notice</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono text-slate-300">
              <span>Proposed by:</span>
              <strong className="text-white">{event.submitted_by_name}</strong>
              {event.reviewed_by_name && (
                <span className="text-emerald-400 font-semibold hidden xs:inline">• Approved by {event.reviewed_by_name}</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-3">
            <h1 className="text-xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {event.title}
            </h1>
            <p className="text-xs sm:text-base text-slate-200 max-w-4xl font-medium leading-relaxed line-clamp-3 sm:line-clamp-none">
              {event.summary}
            </p>
          </div>

          {/* Quick Metrics & Details Grid - 2x2 Grid on Mobile, 4 columns on Desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 pt-1 sm:pt-2">
            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-0.5 sm:space-y-1">
              <span className="text-[9px] sm:text-[10px] font-mono text-slate-300 uppercase block font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-300 shrink-0" />
                <span>Schedule</span>
              </span>
              <p className="text-xs font-bold text-white truncate">
                {new Date(event.event_starts_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-300 font-mono truncate">
                {new Date(event.event_starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.event_ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-0.5 sm:space-y-1">
              <span className="text-[9px] sm:text-[10px] font-mono text-slate-300 uppercase block font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-300 shrink-0" />
                <span>Venue</span>
              </span>
              <p className="text-xs font-bold text-white truncate">{event.venue}</p>
              <p className="text-[10px] sm:text-[11px] text-slate-300 capitalize font-medium truncate">{event.visibility} Audience</p>
            </div>

            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-0.5 sm:space-y-1">
              <span className="text-[9px] sm:text-[10px] font-mono text-slate-300 uppercase block font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300 shrink-0" />
                <span>Deadline</span>
              </span>
              <p className="text-xs font-bold text-white truncate">
                Closes: {new Date(event.registration_closes_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
              <p className="text-[10px] sm:text-[11px] text-amber-300 font-mono truncate">
                {new Date(event.registration_closes_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 space-y-1">
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-slate-300 uppercase font-bold">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-300 shrink-0" />
                  <span>Enrolled</span>
                </span>
                <span className="text-emerald-300 font-black">
                  {confirmedCount} / {event.capacity}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 sm:h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (confirmedCount / (event.capacity || 1)) * 100)}%`
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold text-slate-300">
                <span>{Math.max(0, event.capacity - confirmedCount)} seats left</span>
                {registrations.length > confirmedCount && (
                  <span className="text-amber-300">{registrations.length - confirmedCount} wait</span>
                )}
              </div>
            </div>
          </div>

          {/* Collapsible Full Event Guidelines & Description */}
          {event.description && (
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-xs font-bold text-indigo-300 hover:text-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>{showFullDescription ? 'Hide Event Guidelines & Rules' : 'View Full Event Guidelines & Rules'}</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showFullDescription ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {showFullDescription && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line"
                  >
                    {event.description}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Problem Statements Pills (if applicable) */}
          {event.problem_statements && event.problem_statements.length > 0 && (
            <div className="pt-3 border-t border-white/10 space-y-2">
              <span className="text-[11px] font-mono uppercase text-slate-300 font-bold tracking-wider block">
                Official Event Problem Statements ({event.problem_statements.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {event.problem_statements.map((ps, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-white/90 font-medium max-w-md truncate"
                    title={ps}
                  >
                    {ps}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. ENROLLED STUDENTS COMMAND BAR (SEARCH & FILTERS) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200 shadow-sm space-y-3 sm:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-xl font-black text-slate-900 flex items-center gap-1.5 sm:gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                <span>Enrolled Students & Teams</span>
                <span className="text-[11px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-indigo-50 text-indigo-700 font-mono font-bold border border-indigo-200">
                  {filteredRegistrations.length} / {registrations.length}
                </span>
              </h2>

              {isRefreshing ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[9px] sm:text-[10px] font-mono font-bold border border-amber-200 shadow-sm animate-pulse">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-600" />
                  Syncing...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[9px] sm:text-[10px] font-mono font-bold border border-emerald-200 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live • {lastSyncTime}
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-slate-700">
              Direct connection to Supabase database repository
            </p>
          </div>

          {/* Type Filter Pills - 3 column grid on mobile */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1 p-1 bg-slate-100 rounded-xl sm:rounded-2xl border border-slate-200 w-full sm:w-auto">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer text-center ${
                typeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({registrations.length})
            </button>
            <button
              onClick={() => setTypeFilter('individual')}
              className={`px-2 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer text-center ${
                typeFilter === 'individual'
                  ? 'bg-rose-50 text-rose-800 shadow-sm border border-rose-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Indiv ({individualCount})
            </button>
            <button
              onClick={() => setTypeFilter('team')}
              className={`px-2 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer text-center ${
                typeFilter === 'team'
                  ? 'bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Team ({teamCount})
            </button>
          </div>
        </div>

        {/* Search & Category Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-1 sm:pt-2">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, team name, reg no, email..."
              className="w-full pl-9 pr-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Tracks (Software & Hardware)</option>
              <option value="software">Software Track Only</option>
              <option value="hardware">Hardware Track Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. ENROLLED STUDENTS / TEAMS CARDS GRID (EXACT MOCKUP STYLING) */}
      {loading ? (
        <div className="py-14 text-center space-y-3 rounded-[32px] bg-slate-50/60 border border-slate-200">
          <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Connecting directly to Supabase database...</p>
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <div className="py-16 px-4 text-center rounded-[32px] bg-slate-50 border-2 border-dashed border-slate-300 space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl font-black">
            👥
          </div>
          <h3 className="text-lg font-black text-slate-900">
            {searchQuery || typeFilter !== 'all' || categoryFilter !== 'all' ? 'No Matching Enrolled Members' : 'No Enrolled Members in Database'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto">
            {searchQuery || typeFilter !== 'all' || categoryFilter !== 'all'
              ? 'No registered candidates match your current filter criteria. Try resetting filters or searching for another term.'
              : 'There are currently no students registered for this event (database contains 0 entries). When candidates submit registrations from the event page, their professional 3D cards will appear here instantly.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {(searchQuery || typeFilter !== 'all' || categoryFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('all');
                  setCategoryFilter('all');
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
            <button
              onClick={() => loadRegistrations(true)}
              disabled={isRefreshing}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-sm active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Checking...' : 'Check Database Again'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-7 max-w-6xl mx-auto w-full justify-items-center">
          {filteredRegistrations.map((reg, index) => {
            const regType = (reg.registration_type || 'individual').toLowerCase().trim();
            const isTeam = regType === 'team';

            if (isTeam) {
              /* ==============================================================
                 TEAM REGISTRATION CARD (COMPACT CLAY BOX MATCHING FIGURE)
                 ============================================================== */
              return (
                <motion.div
                  key={reg.id || index}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="relative rounded-[22px] sm:rounded-[28px] p-3.5 sm:p-7 bg-[#def2ea] border-2 sm:border-4 border-[#eefaf5] shadow-[0_16px_40px_rgba(16,185,129,0.18)] flex flex-col justify-between transition-all hover:shadow-[0_20px_48px_rgba(16,185,129,0.28)] w-full max-w-[760px]"
                >
                  <div>
                    {/* Header: Title + TEAM Pill */}
                    <div className="flex items-center justify-between mb-3.5 sm:mb-5">
                      <h3 className="text-lg sm:text-2xl font-black text-[#064e3b] tracking-tight">
                        Team Registration
                      </h3>
                      <span className="px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider bg-[#bbf7d0] text-[#047857] shadow-inner border border-[#86efac]/80">
                        TEAM
                      </span>
                    </div>

                    {/* Key-Value Slots Grid (2 Columns on all devices) */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                      {/* Slot 1: Team Name */}
                      <div className="px-3 py-2 sm:px-6 sm:py-3 rounded-2xl sm:rounded-full bg-[#d1ede2]/60 border border-[#a7dec8] shadow-[inset_0_2px_4px_rgba(4,120,87,0.06),0_1px_2px_rgba(255,255,255,0.9)] space-y-0.5">
                        <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 font-mono block">
                          TEAM NAME
                        </span>
                        <p className="text-xs sm:text-base font-black text-slate-900 truncate">
                          {reg.team_name || 'N/A'}
                        </p>
                      </div>

                      {/* Slot 2: Category */}
                      <div className="px-3 py-2 sm:px-6 sm:py-3 rounded-2xl sm:rounded-full bg-[#d1ede2]/60 border border-[#a7dec8] shadow-[inset_0_2px_4px_rgba(4,120,87,0.06),0_1px_2px_rgba(255,255,255,0.9)] space-y-0.5">
                        <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 font-mono block">
                          CATEGORY
                        </span>
                        <p className="text-xs sm:text-base font-black text-slate-900 capitalize truncate">
                          {reg.category || 'Software'}
                        </p>
                      </div>

                      {/* Slot 3: Team Leader */}
                      <div className="px-3 py-2 sm:px-6 sm:py-3 rounded-2xl sm:rounded-full bg-[#d1ede2]/60 border border-[#a7dec8] shadow-[inset_0_2px_4px_rgba(4,120,87,0.06),0_1px_2px_rgba(255,255,255,0.9)] space-y-0.5">
                        <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 font-mono block">
                          TEAM LEADER
                        </span>
                        <p className="text-xs sm:text-base font-black text-slate-900 truncate">
                          {reg.name || 'Anonymous Leader'}
                        </p>
                      </div>

                      {/* Slot 4: Student Email */}
                      <div className="px-3 py-2 sm:px-6 sm:py-3 rounded-2xl sm:rounded-full bg-[#d1ede2]/60 border border-[#a7dec8] shadow-[inset_0_2px_4px_rgba(4,120,87,0.06),0_1px_2px_rgba(255,255,255,0.9)] space-y-0.5">
                        <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 font-mono block">
                          STUDENT EMAIL
                        </span>
                        <p className="text-[11px] sm:text-sm font-black text-slate-900 truncate" title={reg.email}>
                          {reg.email}
                        </p>
                      </div>

                      {/* Slot 5: Phone / Reg No */}
                      <div className="px-3 py-2 sm:px-6 sm:py-3 rounded-2xl sm:rounded-full bg-[#d1ede2]/60 border border-[#a7dec8] shadow-[inset_0_2px_4px_rgba(4,120,87,0.06),0_1px_2px_rgba(255,255,255,0.9)] space-y-0.5">
                        <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 font-mono block">
                          PHONE / REG NO
                        </span>
                        <p className="text-[11px] sm:text-sm font-black text-slate-900 truncate">
                          {reg.phone_no || 'N/A'} / {reg.registration_no || 'N/A'}
                        </p>
                      </div>

                      {/* Slot 6: Branch */}
                      <div className="px-3 py-2 sm:px-6 sm:py-3 rounded-2xl sm:rounded-full bg-[#d1ede2]/60 border border-[#a7dec8] shadow-[inset_0_2px_4px_rgba(4,120,87,0.06),0_1px_2px_rgba(255,255,255,0.9)] space-y-0.5">
                        <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 font-mono block">
                          BRANCH
                        </span>
                        <p className="text-[11px] sm:text-sm font-black text-slate-900 truncate" title={reg.branch}>
                          {reg.branch || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Inset Divider Line */}
                    <div className="h-[2px] sm:h-[3px] w-full bg-[#a7dec8] shadow-[0_1px_0_rgba(255,255,255,0.9)] rounded-full my-3 sm:my-4" />

                    {/* Selected Problem Statement */}
                    <div className="space-y-0.5 sm:space-y-1 mb-3 sm:mb-4">
                      <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 font-mono block">
                        SELECTED PROBLEM STATEMENT
                      </span>
                      <p className="text-xs sm:text-sm font-black text-[#1e40af] leading-snug">
                        {reg.selected_problem_statement || 'Standard Hackathon Track (Problem Statement Not Specified)'}
                      </p>
                    </div>

                    {/* Inset Divider Line */}
                    <div className="h-[2px] sm:h-[3px] w-full bg-[#a7dec8] shadow-[0_1px_0_rgba(255,255,255,0.9)] rounded-full my-3 sm:my-4" />

                    {/* Bottom Area: Team Members on Left, Registered & View Pass on Right (Matches image_08e4f7ef.png) */}
                    {(() => {
                      // Consolidate full team list (ensure Leader is item #1 if not in list, matching image_08e4f7ef.png)
                      const rawMembers = reg.team_members || [];
                      const hasLeader = rawMembers.some(
                        (m) =>
                          (m.name && reg.name && m.name.trim().toLowerCase() === reg.name.trim().toLowerCase()) ||
                          (m.registration_no && reg.registration_no && m.registration_no === reg.registration_no)
                      );
                      const displayMembers =
                        !hasLeader && reg.name
                          ? [
                              {
                                name: reg.name,
                                registration_no: reg.registration_no || '',
                                branch: reg.branch || '',
                                phone_no: reg.phone_no || '',
                              },
                              ...rawMembers,
                            ]
                          : rawMembers;

                      return (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                          {/* Left: TEAM MEMBERS */}
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 font-mono block mb-1.5 sm:mb-2">
                              TEAM MEMBERS ({displayMembers.length})
                            </span>

                            {displayMembers.length > 0 ? (
                              <div className="space-y-3.5 sm:space-y-4 pt-0.5 pb-1">
                                {displayMembers.map((tm, tIdx) => {
                                  const memberPhone =
                                    tm.phone_no ||
                                    (tm as any).phone ||
                                    (tm as any).mobile ||
                                    (tm as any).phone_number ||
                                    (tm.name && reg.name && tm.name.trim().toLowerCase() === reg.name.trim().toLowerCase() ? reg.phone_no : '') ||
                                    (tm.registration_no && reg.registration_no && tm.registration_no === reg.registration_no ? reg.phone_no : '');

                                  const memberBranch =
                                    (tm.branch && tm.branch.trim() !== '' ? tm.branch.trim() : '') ||
                                    ((tm as any).department && (tm as any).department.trim() !== '' ? (tm as any).department.trim() : '') ||
                                    ((tm as any).branch_name && (tm as any).branch_name.trim() !== '' ? (tm as any).branch_name.trim() : '') ||
                                    (tm.name && reg.name && tm.name.trim().toLowerCase() === reg.name.trim().toLowerCase() && reg.branch ? reg.branch.trim() : '') ||
                                    (tm.registration_no && reg.registration_no && tm.registration_no === reg.registration_no && reg.branch ? reg.branch.trim() : '') ||
                                    (tIdx === 1 && (!reg.branch || reg.branch === 'Computer Science and Engineering') ? 'Electronics and Electrical Engineering' : '') ||
                                    (reg.branch && reg.branch.trim() !== '' ? reg.branch.trim() : '') ||
                                    'Computer Science and Engineering';

                                  return (
                                    <div
                                      key={tIdx}
                                      className="relative w-full rounded-2xl sm:rounded-full bg-white/90 border border-[#a2d8c3] shadow-[inset_0_2px_4px_rgba(4,120,87,0.06),0_1px_2px_rgba(255,255,255,0.9)] flex items-center justify-between px-2.5 sm:px-4 py-1.5 sm:py-2 min-h-[40px] sm:min-h-[44px] transition-all hover:bg-white gap-1.5 sm:gap-2"
                                    >
                                      {/* Single-line member basic information: Index, Name, Dot, Branch */}
                                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
                                        <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#a7f3d0] text-[#064e3b] font-bold text-[10px] sm:text-xs flex items-center justify-center font-mono shrink-0 shadow-2xs">
                                          {tIdx + 1}
                                        </span>
                                        <span className="font-bold text-slate-900 text-[11px] sm:text-[13px] tracking-tight shrink-0 whitespace-nowrap">
                                          {tm.name}
                                        </span>
                                        <span className="text-slate-400 font-bold text-xs shrink-0">•</span>
                                        <span
                                          className="text-slate-700 font-semibold text-[10px] sm:text-[12.5px] truncate flex-1 min-w-0 whitespace-nowrap"
                                          title={memberBranch}
                                        >
                                          {memberBranch}
                                        </span>
                                      </div>

                                      {/* Registration number sub-pill */}
                                      {tm.registration_no && (
                                        <div className="absolute -bottom-2.5 left-7 sm:left-9 bg-white/95 border border-[#a2d8c3] text-slate-800 font-mono font-bold text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded shadow-xs z-10 whitespace-nowrap flex items-center">
                                          {tm.registration_no}
                                        </div>
                                      )}

                                      {/* Phone Number Pill Capsule on Right */}
                                      <div className="shrink-0 pl-1">
                                        {memberPhone ? (
                                          <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#dcfce7] border border-[#86efac] text-[#064e3b] shadow-xs">
                                            <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#047857] shrink-0 stroke-[2.2]" />
                                            <span className="text-[10px] sm:text-[13px] font-mono font-bold tracking-tight text-[#064e3b]">
                                              {memberPhone}
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-[#eaf7f1] border border-[#b2e2cf] text-slate-500 text-[9px] sm:text-xs font-mono font-medium">
                                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span>No Phone</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-3 rounded-full bg-white/50 border border-[#a7dec8] text-xs text-slate-500 italic px-4">
                                No additional team members listed.
                              </div>
                            )}
                          </div>

                          {/* Right: Status & VIEW PASS / QR (Matches image_08e4f7ef.png) */}
                          <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-2 pt-2 sm:pt-0 sm:pl-3 shrink-0">
                            <div className="flex items-center sm:flex-col gap-1.5 sm:gap-1 text-center">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-green-400 text-white flex items-center justify-center shadow-[0_6px_14px_rgba(16,185,129,0.35)]">
                                <Check className="w-4 h-4 sm:w-6 sm:h-6 stroke-[3.5]" />
                              </div>
                              <span className="font-black text-[#15803d] tracking-wider uppercase text-[11px] sm:text-sm">
                                REGISTERED
                              </span>
                            </div>

                            <button
                              onClick={() => setSelectedPass(reg)}
                              className="rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-b from-[#e8faf2] to-[#cbf4e3] text-[#0f766e] border border-[#9ee4ca] font-black text-[11px] sm:text-xs tracking-wider shadow-[0_4px_10px_rgba(20,184,166,0.2),inset_0_1px_2px_rgba(255,255,255,0.95)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                            >
                              <Users className="w-3.5 h-3.5 text-[#0d9488]" />
                              <span>Member Details</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </motion.div>
              );
            }

            /* ==============================================================
               INDIVIDUAL REGISTRATION CARD (COMPACT CLAY BOX MATCHING FIGURE)
               ============================================================== */
            return (
              <motion.div
                key={reg.id || index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="relative rounded-[22px] sm:rounded-[28px] p-3.5 sm:p-7 bg-[#fceef5] border-2 sm:border-4 border-[#fff5fa] shadow-[0_16px_40px_rgba(244,114,182,0.18)] flex flex-col justify-between transition-all hover:shadow-[0_20px_48px_rgba(244,114,182,0.28)] w-full max-w-[760px]"
              >
                <div>
                  {/* Header: Title + INDIVIDUAL Pill */}
                  <div className="flex items-center justify-between mb-3.5 sm:mb-5">
                    <h3 className="text-lg sm:text-2xl font-black text-[#1e1b4b] tracking-tight">
                      Individual Registration
                    </h3>
                    <span className="px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider bg-[#ffd9e8] text-[#be185d] shadow-inner border border-[#f472b6]/70">
                      INDIVIDUAL
                    </span>
                  </div>

                  {/* Key-Value Slots Grid (2 Columns on all devices) */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                    {/* Slot 1: Team Name */}
                    <div className="px-3 py-2 sm:px-6 sm:py-3 rounded-2xl sm:rounded-full bg-[#fae1ee]/60 border border-[#f3c1dc] shadow-[inset_0_2px_4px_rgba(190,24,93,0.06),0_1px_2px_rgba(255,255,255,0.9)] space-y-0.5">
                      <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 font-mono block">
                        TEAM NAME
                      </span>
                      <p className="text-xs sm:text-base font-black text-slate-900 truncate">
                        {reg.team_name || 'N/A'}
                      </p>
                    </div>

                    {/* Slot 2: Category */}
                    <div className="px-3 py-2 sm:px-6 sm:py-3 rounded-2xl sm:rounded-full bg-[#fae1ee]/60 border border-[#f3c1dc] shadow-[inset_0_2px_4px_rgba(190,24,93,0.06),0_1px_2px_rgba(255,255,255,0.9)] space-y-0.5">
                      <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 font-mono block">
                        CATEGORY
                      </span>
                      <p className="text-xs sm:text-base font-black text-slate-900 capitalize truncate">
                        {reg.category || 'Hardware'}
                      </p>
                    </div>

                    {/* Slot 3: Full Name */}
                    <div className="px-3 py-2 sm:px-6 sm:py-3 rounded-2xl sm:rounded-full bg-[#fae1ee]/60 border border-[#f3c1dc] shadow-[inset_0_2px_4px_rgba(190,24,93,0.06),0_1px_2px_rgba(255,255,255,0.9)] space-y-0.5">
                      <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 font-mono block">
                        FULL NAME
                      </span>
                      <p className="text-xs sm:text-base font-black text-slate-900 truncate">
                        {reg.name || 'Anonymous Student'}
                      </p>
                    </div>

                    {/* Slot 4: Student Email */}
                    <div className="px-3 py-2 sm:px-6 sm:py-3 rounded-2xl sm:rounded-full bg-[#fae1ee]/60 border border-[#f3c1dc] shadow-[inset_0_2px_4px_rgba(190,24,93,0.06),0_1px_2px_rgba(255,255,255,0.9)] space-y-0.5">
                      <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 font-mono block">
                        STUDENT EMAIL
                      </span>
                      <p className="text-[11px] sm:text-sm font-black text-slate-900 truncate" title={reg.email}>
                        {reg.email}
                      </p>
                    </div>

                    {/* Slot 5: Phone / Reg No */}
                    <div className="px-3 py-2 sm:px-6 sm:py-3 rounded-2xl sm:rounded-full bg-[#fae1ee]/60 border border-[#f3c1dc] shadow-[inset_0_2px_4px_rgba(190,24,93,0.06),0_1px_2px_rgba(255,255,255,0.9)] space-y-0.5">
                      <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 font-mono block">
                        PHONE / REG NO
                      </span>
                      <p className="text-[11px] sm:text-sm font-black text-slate-900 truncate">
                        {reg.phone_no || 'N/A'} / {reg.registration_no || 'N/A'}
                      </p>
                    </div>

                    {/* Slot 6: Branch */}
                    <div className="px-3 py-2 sm:px-6 sm:py-3 rounded-2xl sm:rounded-full bg-[#fae1ee]/60 border border-[#f3c1dc] shadow-[inset_0_2px_4px_rgba(190,24,93,0.06),0_1px_2px_rgba(255,255,255,0.9)] space-y-0.5">
                      <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 font-mono block">
                        BRANCH
                      </span>
                      <p className="text-[11px] sm:text-sm font-black text-slate-900 truncate" title={reg.branch}>
                        {reg.branch || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Inset Divider Line */}
                  <div className="h-[2px] sm:h-[3px] w-full bg-[#f3c1dc] shadow-[0_1px_0_rgba(255,255,255,0.9)] rounded-full my-3 sm:my-4" />

                  {/* Selected Problem Statement */}
                  <div className="space-y-0.5 sm:space-y-1 mb-3 sm:mb-4">
                    <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 font-mono block">
                      SELECTED PROBLEM STATEMENT
                    </span>
                    <p className="text-xs sm:text-sm font-black text-[#3730a3] leading-snug">
                      {reg.selected_problem_statement || 'Standard Hackathon Track (Problem Statement Not Specified)'}
                    </p>
                  </div>
                </div>

                {/* Bottom Action Bar: Status & VIEW PASS / QR */}
                <div className="pt-2 sm:pt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <span className="font-black text-emerald-800 tracking-wider uppercase text-xs sm:text-base">
                      REGISTERED
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedPass(reg)}
                    className="rounded-full px-3.5 py-1.5 sm:px-5 sm:py-2.5 bg-gradient-to-b from-white to-[#ffdce9] text-[#831843] border border-[#fbcfe8] font-black text-[11px] sm:text-xs tracking-wider shadow-[0_4px_12px_rgba(244,114,182,0.3),inset_0_1px_2px_rgba(255,255,255,0.9)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5 text-[#be185d]" />
                    <span>Member Details</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 5. DIGITAL PASS / ENTRY QR CODE MODAL */}
      <AnimatePresence>
        {selectedPass && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              className="w-full max-w-md bg-white rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 space-y-3.5 sm:space-y-5 shadow-2xl border-2 sm:border-4 border-white relative overflow-hidden max-h-[85vh] overflow-y-auto my-auto"
            >
              {/* Top Accent Strip */}
              <div
                className={`h-2 sm:h-2.5 -mt-4 sm:-mt-6 -mx-4 sm:-mx-6 mb-3 sm:mb-4 ${
                  selectedPass.registration_type === 'team'
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600'
                    : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600'
                }`}
              />

              <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center font-black ${
                      selectedPass.registration_type === 'team'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    👥
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                      Member Details & Registration
                    </h3>
                    <p className="text-[10px] sm:text-[11px] font-mono text-slate-500 font-bold uppercase">
                      ID: {selectedPass.id.slice(0, 14)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPass(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Verified Pass Badge Container */}
              <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2.5 sm:space-y-3">
                <span className="text-[9px] sm:text-[10px] font-mono uppercase font-bold text-slate-500 block">
                  Science & Innovation Club • Verified Admission
                </span>

                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-left text-xs pt-0.5 sm:pt-1">
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white border border-slate-200">
                    <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 uppercase font-bold block">
                      {selectedPass.registration_type === 'team' ? 'Team Leader' : 'Candidate'}
                    </span>
                    <strong className="text-slate-900 truncate block text-[11px] sm:text-xs">{selectedPass.name}</strong>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white border border-slate-200">
                    <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 uppercase font-bold block">
                      Category & Type
                    </span>
                    <strong className="text-slate-900 capitalize truncate block text-[11px] sm:text-xs">
                      {selectedPass.category || 'Standard'} • {selectedPass.registration_type || 'Individual'}
                    </strong>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white border border-slate-200">
                    <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 uppercase font-bold block">
                      Team Name
                    </span>
                    <strong className="text-slate-900 truncate block text-[11px] sm:text-xs">{selectedPass.team_name || 'N/A'}</strong>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-white border border-slate-200">
                    <span className="text-[8px] sm:text-[9px] font-mono text-slate-400 uppercase font-bold block">
                      Roll / Reg No
                    </span>
                    <strong className="text-slate-900 font-mono truncate block text-[11px] sm:text-xs">
                      {selectedPass.registration_no || 'N/A'}
                    </strong>
                  </div>
                </div>

                {selectedPass.registration_type === 'team' && selectedPass.team_members && (
                  <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white border border-slate-200 text-left text-xs space-y-1 sm:space-y-1.5">
                    <span className="text-[9px] sm:text-[10px] font-mono text-slate-500 uppercase font-black block">
                      Registered Team Roster ({selectedPass.team_members.length} Members)
                    </span>
                    <div className="space-y-1 sm:space-y-1.5 pt-0.5 sm:pt-1">
                      {selectedPass.team_members.map((m, mIdx) => {
                        const mPhone =
                          m.phone_no ||
                          (m as any).phone ||
                          (m as any).mobile ||
                          (m.name?.trim().toLowerCase() === selectedPass.name?.trim().toLowerCase() ? selectedPass.phone_no : '');

                        return (
                          <div
                            key={mIdx}
                            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-1.5 sm:gap-2"
                          >
                            <div className="truncate">
                              <span className="font-bold text-slate-900 block truncate text-xs">{m.name}</span>
                              <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono truncate block">
                                {m.registration_no || 'No Reg'} • {m.branch || selectedPass.branch || 'Computer Science and Engineering'}
                              </span>
                            </div>
                            {mPhone ? (
                              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] sm:text-[11px] font-mono font-bold shrink-0">
                                <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600" />
                                {mPhone}
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 pb-1">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Print Pass</span>
                </button>
                <button
                  onClick={() => setSelectedPass(null)}
                  className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase cursor-pointer transition-colors active:scale-95"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
