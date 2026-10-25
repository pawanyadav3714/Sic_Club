import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  X,
  Ticket,
  ChevronRight,
  ShieldCheck,
  Building,
  Mail,
  User,
  Phone,
  Bell,
  Radio
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EventProposal, EventRegistration, Announcement } from '../types';
import {
  getAllAnnouncedEvents,
  registerForEvent,
  getEventRegistrations,
  CATEGORY_LABELS,
  fetchLiveEvents
} from '../lib/eventStorage';
import { getStoredAnnouncements, fetchLiveAnnouncements } from '../lib/supabase';

interface PublicEventsSectionProps {
  onNavigateAuth?: () => void;
}

export default function PublicEventsSection({ onNavigateAuth }: PublicEventsSectionProps) {
  const [events, setEvents] = useState<EventProposal[]>(() => getAllAnnouncedEvents());
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => getStoredAnnouncements());
  const [activeView, setActiveView] = useState<'events' | 'notices'>('events');

  const [selectedEvent, setSelectedEvent] = useState<EventProposal | null>(null);
  const [showRegModal, setShowRegModal] = useState<EventProposal | null>(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (showRegModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showRegModal]);

  const [regForm, setRegForm] = useState<{
    name: string;
    email: string;
    phone_no: string;
    branch: string;
    registration_no: string;
    registration_type: 'individual' | 'team';
    team_name: string;
    category: 'software' | 'hardware';
    team_members: { name: string; registration_no: string; branch: string; phone_no: string }[];
    selected_problem_statement?: string;
  }>({
    name: '',
    email: '',
    phone_no: '',
    branch: 'Computer Science and Engineering',
    registration_no: '',
    registration_type: 'individual',
    team_name: '',
    category: 'software',
    team_members: [],
    selected_problem_statement: '',
  });
  const [regResult, setRegResult] = useState<{
    success: boolean;
    message: string;
    type: 'confirmed' | 'waitlist';
  } | null>(null);

  // Sync listener across tabs & updates with live database
  useEffect(() => {
    // Immediately check Supabase database for live events and announcements
    fetchLiveEvents().then((live) => {
      setEvents(live);
    });
    fetchLiveAnnouncements().then((liveAnn) => {
      setAnnouncements(liveAnn);
    });

    const refresh = () => {
      setEvents(getAllAnnouncedEvents());
      setAnnouncements(getStoredAnnouncements());
    };

    window.addEventListener('sic_events_updated', refresh);
    window.addEventListener('sic_announcements_updated', refresh);
    window.addEventListener('storage', refresh);

    let bc1: BroadcastChannel | null = null;
    let bc2: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc1 = new BroadcastChannel('sic_events_channel');
        bc1.onmessage = refresh;
        bc2 = new BroadcastChannel('sic_announcements_channel');
        bc2.onmessage = refresh;
      }
    } catch (e) {}

    return () => {
      window.removeEventListener('sic_events_updated', refresh);
      window.removeEventListener('sic_announcements_updated', refresh);
      window.removeEventListener('storage', refresh);
      if (bc1) bc1.close();
      if (bc2) bc2.close();
    };
  }, []);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRegModal) return;

    if (!regForm.name.trim() || !regForm.email.trim()) {
      alert('Please enter your name and email.');
      return;
    }

    const result = await registerForEvent({
      event_id: showRegModal.id,
      name: regForm.name.trim(),
      email: regForm.email.trim(),
      phone_no: regForm.phone_no.trim() || undefined,
      branch: regForm.branch,
      registration_no: regForm.registration_no.trim() || undefined,
      registration_type: regForm.registration_type,
      team_name: regForm.team_name?.trim() || undefined,
      category: regForm.category || undefined,
      team_members: regForm.registration_type === 'team' ? regForm.team_members : undefined,
      selected_problem_statement: regForm.selected_problem_statement,
    });

    setRegResult(result);
    if (result.success) {
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    }
  };

  return (
    <section id="events" className="relative z-10 py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 sm:space-y-12">
      {/* Section Header with Glowing Pill */}
      <div className="text-center space-y-3 sm:space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(6,182,212,0.25)]"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>OFFICIALLY APPROVED & PUBLISHED EVENTS</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight"
        >
          Upcoming Club Events & Workshops
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-slate-400 max-w-2xl mx-auto text-xs sm:text-base leading-relaxed"
        >
          Explore hands-on technical workshops, national hackathons, and guest lectures curated by the Science and Innovation Club.
        </motion.p>
      </div>

      {/* Lobby Tab Switcher: Events & Workshops vs Official Club Notices */}
      <div className="flex items-center justify-center">
        <div className="p-1.5 rounded-2xl bg-[#0c101d]/90 border border-[#1e273a] backdrop-blur-xl flex items-center gap-1.5 shadow-lg">
          <button
            onClick={() => setActiveView('events')}
            className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeView === 'events'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Announced Events & Workshops</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
              activeView === 'events' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {events.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('notices')}
            className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeView === 'notices'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Official Club Notices</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
              activeView === 'notices' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {announcements.length}
            </span>
          </button>
        </div>
      </div>

      {/* FEED SELECTION: NOTICES OR EVENTS */}
      {activeView === 'notices' ? (
        announcements.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 sm:p-14 rounded-[28px] sm:rounded-[36px] bg-[#0c101d]/90 border border-[#1e273a] text-center max-w-2xl mx-auto space-y-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400 mx-auto flex items-center justify-center font-black text-2xl shadow-inner">
              <Bell className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                No Club Notices Published Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Official notices published by executive council members will be synced here in real time.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {announcements.map((ann, idx) => (
              <motion.div
                key={ann.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="p-5 sm:p-7 rounded-[26px] bg-[#0c101d]/90 border border-[#1e273a] hover:border-purple-500/40 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4 group transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-bold uppercase">
                      {ann.category || 'Event Notice'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(ann.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                    {ann.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line font-normal">
                    {ann.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                      {ann.author_name ? ann.author_name[0] : 'S'}
                    </div>
                    <span className="text-xs font-semibold text-slate-300">{ann.author_name}</span>
                  </div>

                  {ann.event_location && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[220px]">{ann.event_location}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )
      ) : events.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-8 sm:p-14 rounded-[28px] sm:rounded-[36px] bg-[#0c101d]/90 border border-[#1e273a] text-center max-w-2xl mx-auto space-y-4 shadow-2xl backdrop-blur-xl"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-400 mx-auto flex items-center justify-center font-black text-2xl shadow-inner">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              No Live Published Event Notices Right Now
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              When a Core Member submits an event notice and it gets reviewed and approved by Assigned Leads, the live registration form, capacity tracker, and full schedule will be displayed here in real time.
            </p>
          </div>
          {onNavigateAuth && (
            <div className="pt-2">
              <button
                onClick={onNavigateAuth}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-cyan-500/30 transition-all cursor-pointer"
              >
                Core Member Sign In & Propose Event
              </button>
            </div>
          )}
        </motion.div>
      ) : (
        /* Events Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {events.map((ev, idx) => {
          const catMeta = CATEGORY_LABELS[ev.category] || CATEGORY_LABELS.workshop;
          const isDeadlinePassed = new Date() > new Date(ev.registration_closes_at);
          const isNotOpenYet = new Date() < new Date(ev.registration_opens_at);
          const isFull = ev.registered_count >= ev.capacity;
          const percentFull = Math.min(100, Math.round((ev.registered_count / (ev.capacity || 1)) * 100));

          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              whileHover={{ y: -4, borderColor: 'rgba(56, 189, 248, 0.45)' }}
              className="rounded-[24px] sm:rounded-[30px] bg-[#0c101d]/90 border border-[#1e273a] hover:border-cyan-500/40 backdrop-blur-xl shadow-xl flex flex-col justify-between overflow-hidden group transition-all duration-300"
            >
              {/* Cover Banner */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
                <img
                  src={ev.cover_image_path}
                  alt={ev.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c101d] via-[#0c101d]/40 to-black/30" />

                {/* Category & Status Badges */}
                <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold uppercase border backdrop-blur-md ${catMeta.badgeBg}`}>
                    {catMeta.label}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {ev.visibility === 'members' && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/30 border border-purple-500/50 text-purple-200 text-[9px] font-mono font-bold uppercase backdrop-blur-md">
                        Members Only
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold uppercase backdrop-blur-md flex items-center gap-1 ${
                      ev.status === 'published' || ev.status === 'approved'
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                    }`}>
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span>{ev.status === 'published' || ev.status === 'approved' ? 'Official' : 'Live Notice'}</span>
                    </span>
                  </div>
                </div>

                {/* Organizing Team Tag */}
                <div className="absolute bottom-2 left-3 right-3">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block truncate">
                    {ev.assigned_team}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <h3 className="text-base sm:text-xl font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug line-clamp-2">
                    {ev.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 leading-relaxed">
                    {ev.summary}
                  </p>

                  {/* Venue & Time Pill List */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{ev.venue}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>
                        {new Date(ev.event_starts_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(ev.event_starts_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Capacity Bar & Deadline Alert */}
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 font-semibold">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Users className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Seats</span>
                      </span>
                      <span>
                        {ev.registered_count} / {ev.capacity} filled
                        {isFull && ' (Waitlist Open)'}
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFull ? 'bg-amber-500' : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
                        }`}
                        style={{ width: `${percentFull}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400">
                        Reg. Closes: {new Date(ev.registration_closes_at).toLocaleDateString()}
                      </span>
                      {isDeadlinePassed ? (
                        <span className="text-rose-400 font-bold uppercase">Closed</span>
                      ) : isNotOpenYet ? (
                        <span className="text-cyan-400 font-bold">Opens Soon</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">Open Now</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedEvent(ev)}
                    className="text-xs font-bold text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    View Schedule & Rules
                  </button>

                  {isDeadlinePassed ? (
                    <button
                      disabled
                      className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-500 text-xs font-bold cursor-not-allowed"
                    >
                      Registration Closed
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setShowRegModal(ev);
                        setRegResult(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{isFull ? 'Join Waitlist' : 'Register Now'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      )}

      {/* MODAL 1: VIEW FULL DETAILS & SCHEDULE */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#0c101d] text-white rounded-[32px] overflow-hidden shadow-2xl border border-cyan-500/30 max-h-[90vh] flex flex-col"
            >
              <div className="relative aspect-[16/7] w-full overflow-hidden bg-slate-900 shrink-0">
                <img src={selectedEvent.cover_image_path} alt={selectedEvent.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c101d] via-[#0c101d]/50 to-transparent" />
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 inset-x-5">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider">
                    {selectedEvent.assigned_team}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black">{selectedEvent.title}</h3>
                </div>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Event Summary</span>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                    {selectedEvent.summary}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase text-cyan-300 font-bold">Detailed Rules & Schedule</span>
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line font-normal">
                    {selectedEvent.description}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Venue</span>
                    <span className="font-bold text-white">{selectedEvent.venue}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Capacity</span>
                    <span className="font-bold text-white">{selectedEvent.capacity} Total Seats</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Approved By</span>
                    <span className="font-bold text-emerald-400">{selectedEvent.reviewed_by_name || 'SIC Club Executive Lead'}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>

                <button
                  onClick={() => {
                    setShowRegModal(selectedEvent);
                    setSelectedEvent(null);
                    setRegResult(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider shadow-md cursor-pointer"
                >
                  Proceed to Register
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: INTERACTIVE EVENT REGISTRATION MODAL */}
      <AnimatePresence>
        {showRegModal && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0c101d] text-white rounded-[32px] p-6 mt-10 mb-10 space-y-5 shadow-2xl border border-cyan-500/40 relative"
            >
              <button
                onClick={() => setShowRegModal(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">Event Registration Form</h3>
                  <p className="text-xs text-slate-400 truncate max-w-xs">{showRegModal.title}</p>
                </div>
              </div>

              {regResult ? (
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center space-y-3">
                  <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center font-bold text-2xl ${
                    regResult.type === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {regResult.type === 'confirmed' ? '🎟️' : '⏳'}
                  </div>

                  <h4 className="text-base font-black text-white">
                    {regResult.type === 'confirmed' ? 'Registration Confirmed!' : 'Added to Waitlist'}
                  </h4>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                    {regResult.message}
                  </p>

                  <div className="pt-2">
                    <button
                      onClick={() => setShowRegModal(null)}
                      className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-2">Registration Type <span className="text-rose-400">*</span></label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                        <input type="radio" checked={regForm.registration_type === 'individual'} onChange={() => setRegForm({...regForm, registration_type: 'individual'})} />
                        Individual
                      </label>
                      <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                        <input type="radio" checked={regForm.registration_type === 'team'} onChange={() => setRegForm({...regForm, registration_type: 'team'})} />
                        Team
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1">Team Name</label>
                    <input type="text" value={regForm.team_name} onChange={(e) => setRegForm({...regForm, team_name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-cyan-400" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1">Category</label>
                    <select value={regForm.category} onChange={(e) => setRegForm({...regForm, category: e.target.value as 'software' | 'hardware'})} className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-cyan-400">
                      <option value="software">Software</option>
                      <option value="hardware">Hardware</option>
                    </select>
                  </div>

                  {regForm.registration_type === 'team' && (
                    <div className="space-y-4 pt-2 border-t border-slate-800">
                      <div className="space-y-2">
                        <label className="block text-[11px] font-mono uppercase font-bold text-slate-400">Team Members</label>
                        {regForm.team_members?.map((member, idx) => (
                          <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 gap-2">
                             <input placeholder="Name" className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs" value={member.name} onChange={(e) => { const tm = [...regForm.team_members!]; tm[idx].name = e.target.value; setRegForm({...regForm, team_members: tm}); }} />
                             <input placeholder="Reg No" className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs" value={member.registration_no} onChange={(e) => { const tm = [...regForm.team_members!]; tm[idx].registration_no = e.target.value; setRegForm({...regForm, team_members: tm}); }} />
                             <select className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs" value={member.branch} onChange={(e) => { const tm = [...regForm.team_members!]; tm[idx].branch = e.target.value; setRegForm({...regForm, team_members: tm}); }}>
                                <option value="">Branch</option>
                                <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                                <option value="Electronics and Electrical Engineering">Electronics and Electrical Engineering</option>
                                <option value="Mechanical Engineering">Mechanical Engineering</option>
                                <option value="Civil Engineering">Civil Engineering</option>
                             </select>
                             <input placeholder="Phone" className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs" value={member.phone_no} onChange={(e) => { const tm = [...regForm.team_members!]; tm[idx].phone_no = e.target.value; setRegForm({...regForm, team_members: tm}); }} />
                          </div>
                        ))}
                        <button type="button" onClick={() => setRegForm({...regForm, team_members: [...(regForm.team_members || []), { name: '', registration_no: '', branch: '', phone_no: '' }]})} className="w-full py-2 rounded-xl border border-dashed border-slate-700 text-slate-400 text-xs font-bold">+ Add Member</button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1">
                      {regForm.registration_type === 'team' ? 'Team Leader Name' : 'Full Name'} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={regForm.name}
                      onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className={`w-full px-4 py-2.5 rounded-xl border border-slate-700 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-cyan-400 ${regForm.registration_type === 'team' ? 'bg-indigo-950/30 border-indigo-500/50' : 'bg-slate-900'}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1">
                      Student Email Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      placeholder="e.g. rahul@university.edu"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={regForm.phone_no}
                        onChange={(e) => setRegForm({ ...regForm, phone_no: e.target.value })}
                        placeholder="+91 9876543210"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1">
                        Registration / Roll No.
                      </label>
                      <input
                        type="text"
                        value={regForm.registration_no}
                        onChange={(e) => setRegForm({ ...regForm, registration_no: e.target.value })}
                        placeholder="220102030"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1">
                      Branch / Department
                    </label>
                    <select
                      value={regForm.branch}
                      onChange={(e) => setRegForm({ ...regForm, branch: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                      <option value="Electronics and Electrical Engineering">Electronics and Electrical Engineering</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                    </select>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>
                      Seats limit: <strong>{showRegModal.capacity}</strong>. If capacity fills, incoming submissions are automatically placed on the priority waitlist.
                    </span>
                  </div>

                  {/* Problem Statement Selection (5 Official Problem Statements) */}
                  {(() => {
                    const psOptions = (showRegModal.problem_statements && showRegModal.problem_statements.length > 0)
                      ? showRegModal.problem_statements
                      : [
                          'Smart Campus & EdTech (Software)',
                          'Agritech & IoT Integration (Hardware)',
                          'Disaster Management & Autonomous Systems (Hardware/AI)',
                          'Healthcare & Accessibility (Software/App)',
                          'Sustainability & Smart City (Software/Data)',
                        ];
                    return (
                      <div>
                        <label className="block text-[11px] font-mono uppercase font-bold text-slate-400 mb-1">
                          Select Problem Statement <span className="text-rose-400">*</span>
                        </label>
                        <select
                          required
                          value={regForm.selected_problem_statement || ''}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-cyan-400 cursor-pointer"
                          onChange={(e) => setRegForm({...regForm, selected_problem_statement: e.target.value})}
                        >
                          <option value="">-- Choose Problem Statement --</option>
                          {psOptions.map((ps, idx) => (
                            <option key={idx} value={ps}>{idx + 1}. {ps}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowRegModal(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer transition-all active:scale-95"
                    >
                      Confirm Registration
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
