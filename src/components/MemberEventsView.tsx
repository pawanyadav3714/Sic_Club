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
  Ticket,
  ChevronRight,
  Layers,
  Bell,
  Check,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EventProposal, UserProfile, Announcement } from '../types';
import {
  getAllAnnouncedEvents,
  registerForEvent,
  getEventRegistrations,
  CATEGORY_LABELS,
  fetchLiveEvents
} from '../lib/eventStorage';

interface MemberEventsViewProps {
  currentUser: UserProfile;
  announcements: Announcement[];
}

export default function MemberEventsView({ currentUser, announcements }: MemberEventsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'events' | 'notices'>('events');
  const [events, setEvents] = useState<EventProposal[]>(() => getAllAnnouncedEvents());
  const [selectedEvent, setSelectedEvent] = useState<EventProposal | null>(null);
  const [regResult, setRegResult] = useState<{ message: string; type: 'confirmed' | 'waitlist' } | null>(null);

  useEffect(() => {
    fetchLiveEvents().then((live) => setEvents(live));

    const refresh = () => {
      setEvents(getAllAnnouncedEvents());
    };

    window.addEventListener('sic_events_updated', refresh);
    window.addEventListener('sic_announcements_updated', refresh);
    window.addEventListener('storage', refresh);
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('sic_events_channel');
        bc.onmessage = refresh;
      }
    } catch (e) {}

    return () => {
      window.removeEventListener('sic_events_updated', refresh);
      window.removeEventListener('sic_announcements_updated', refresh);
      window.removeEventListener('storage', refresh);
      if (bc) bc.close();
    };
  }, []);

  const handleMemberRegister = async (event: EventProposal) => {
    const res = await registerForEvent({
      event_id: event.id,
      user_id: currentUser.id,
      name: `${currentUser.first_name} ${currentUser.last_name}`,
      email: currentUser.email,
      phone_no: currentUser.phone_no,
      branch: currentUser.branch,
      registration_no: currentUser.registration_no,
    });

    if (res.success) {
      confetti({ particleCount: 90, spread: 60, origin: { y: 0.6 } });
    }
    setRegResult({ message: res.message, type: res.type });
  };

  return (
    <div className="space-y-6 mb-20 sm:mb-6">
      {/* Subtab Navigation Pill Bar */}
      <div className="p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl bg-slate-200/80 backdrop-blur-md border border-white flex items-center justify-between gap-2 shadow-inner">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('events')}
            className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'events'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Announced Events & Workshops</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
              activeSubTab === 'events' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-800'
            }`}>
              {events.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('notices')}
            className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'notices'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Club Notices Feed</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
              activeSubTab === 'notices' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-800'
            }`}>
              {announcements.length}
            </span>
          </button>
        </div>

        <span className="hidden md:inline text-[11px] font-mono text-slate-600 font-bold px-3">
          Official SIC Portal Sync
        </span>
      </div>

      {/* FEED 1: APPROVED CLUB EVENTS */}
      {activeSubTab === 'events' && (
        <div className="space-y-6">
          {events.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-[32px] bg-white border border-slate-200 text-center space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center font-black text-2xl">
                📅
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">No Announced Events Right Now</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-sm mx-auto">
                Once event proposals are announced by Core Members, they will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((ev) => {
                const catMeta = CATEGORY_LABELS[ev.category] || CATEGORY_LABELS.workshop;
                const isDeadlinePassed = new Date() > new Date(ev.registration_closes_at);
                const isFull = ev.registered_count >= ev.capacity;
                const percentFull = Math.min(100, Math.round((ev.registered_count / (ev.capacity || 1)) * 100));

                return (
                  <div
                    key={ev.id}
                    className="rounded-[24px] sm:rounded-[28px] bg-white border-2 border-slate-100 overflow-hidden shadow-[6px_10px_24px_rgba(160,175,205,0.25)] flex flex-col justify-between hover:-translate-y-0.5 transition-all"
                  >
                    {/* Cover Image */}
                    <div className="relative aspect-[16/8] w-full bg-slate-900">
                      <img src={ev.cover_image_path} alt={ev.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${catMeta.badgeBg}`}>
                          {catMeta.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-white text-[9px] font-mono font-bold uppercase ${
                          ev.status === 'published' || ev.status === 'approved' ? 'bg-emerald-500/90' : 'bg-amber-500/90'
                        }`}>
                          {ev.status === 'published' || ev.status === 'approved' ? 'Official' : 'Announced'}
                        </span>
                      </div>
                      <div className="absolute bottom-2 left-2.5 right-2.5 text-white">
                        <p className="text-[9px] font-mono text-cyan-300 font-bold uppercase truncate">
                          {ev.assigned_team}
                        </p>
                        <h4 className="text-sm sm:text-base font-black truncate">{ev.title}</h4>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <p className="text-xs text-slate-600 line-clamp-2 font-medium">{ev.summary}</p>

                        <div className="space-y-1 text-[11px] text-slate-700 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="truncate">{ev.venue}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>{new Date(ev.event_starts_at).toLocaleDateString()} at {new Date(ev.event_starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>

                        {/* Capacity */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                          <div className="flex justify-between text-[10px] font-mono text-slate-600 font-bold">
                            <span>Seats: {ev.registered_count} / {ev.capacity}</span>
                            <span>{percentFull}% Full</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${percentFull}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => setSelectedEvent(ev)}
                          className="text-xs text-slate-600 hover:text-indigo-600 font-bold cursor-pointer"
                        >
                          View Plan
                        </button>

                        {isDeadlinePassed ? (
                          <span className="text-[10px] font-mono font-bold text-rose-600 uppercase">
                            Registration Closed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMemberRegister(ev)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Ticket className="w-3.5 h-3.5" />
                            <span>{isFull ? 'Waitlist' : 'RSVP / Register'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FEED 2: CLUB NOTICES FEED */}
      {activeSubTab === 'notices' && (
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="p-8 rounded-[28px] bg-white border border-slate-200 text-center space-y-2">
              <h3 className="text-base font-bold text-slate-800">No Announcements Available</h3>
              <p className="text-xs text-slate-500">Official broadcasts from the Core Council will be listed here.</p>
            </div>
          ) : (
            announcements.map((ann) => (
              <div
                key={ann.id}
                className="p-5 rounded-[24px] bg-white border-2 border-slate-100 shadow-[6px_10px_20px_rgba(160,175,205,0.2)] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-mono text-[10px] font-bold uppercase">
                    {ann.category || 'EVENT NOTICE'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">
                    {new Date(ann.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-900">{ann.title}</h3>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                  {ann.content}
                </p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <img
                      src={ann.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
                      alt={ann.author_name}
                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                    />
                    <span className="font-bold text-slate-800">{ann.author_name}</span>
                  </div>
                  {ann.event_location && (
                    <span className="text-[11px] font-semibold text-cyan-700">Venue: {ann.event_location}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* POPUP: REGISTRATION RESULT ALERT */}
      <AnimatePresence>
        {regResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-[28px] p-6 space-y-4 shadow-2xl border-4 border-white text-center"
            >
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center font-bold text-2xl bg-indigo-50 text-indigo-600">
                {regResult.type === 'confirmed' ? '🎉' : '⏳'}
              </div>
              <h3 className="text-lg font-black text-slate-900">
                {regResult.type === 'confirmed' ? 'Registration Confirmed!' : 'Waitlist Status'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                {regResult.message}
              </p>
              <button
                onClick={() => setRegResult(null)}
                className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: VIEW FULL PLAN */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-white rounded-[32px] overflow-hidden shadow-2xl border-4 border-white max-h-[85vh] flex flex-col"
            >
              <div className="relative aspect-[16/6] w-full bg-slate-900 shrink-0">
                <img src={selectedEvent.cover_image_path} alt={selectedEvent.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="absolute top-4 right-4 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 inset-x-4 text-white">
                  <span className="text-[10px] font-mono text-cyan-300 uppercase font-bold">{selectedEvent.assigned_team}</span>
                  <h3 className="text-lg font-black">{selectedEvent.title}</h3>
                </div>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Summary</span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">{selectedEvent.summary}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-mono uppercase text-slate-800 font-black block">Rules & Detailed Schedule</span>
                  <div className="p-4 rounded-xl bg-slate-100 text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                    {selectedEvent.description}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Venue</span>
                    <span className="font-bold text-slate-900">{selectedEvent.venue}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Capacity</span>
                    <span className="font-bold text-slate-900">{selectedEvent.capacity} Seats Limit</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
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
