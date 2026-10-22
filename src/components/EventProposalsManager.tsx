import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  AlertCircle,
  Eye,
  PlusCircle,
  Sparkles,
  Trash2,
  Check,
  X,
  Share2,
  Upload,
  Globe,
  Lock,
  Layers,
  ChevronRight,
  ShieldCheck,
  Info,
  Bell
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EventProposal, EventCategory, EventStatus, EventVisibility, UserProfile } from '../types';
import {
  getStoredEvents,
  saveEventProposal,
  updateEventStatus,
  deleteEventProposal,
  CATEGORY_LABELS,
  SAMPLE_COVER_IMAGES,
  SAMPLE_TEMPLATE_PROPOSAL,
  purgeFakeAnnouncements,
  fetchLiveEvents
} from '../lib/eventStorage';

interface EventProposalsManagerProps {
  currentUser: UserProfile;
  showNotification: (msg: string, type: 'success' | 'danger' | 'info') => void;
  onViewPublicEvents?: () => void;
}

export default function EventProposalsManager({
  currentUser,
  showNotification,
  onViewPublicEvents
}: EventProposalsManagerProps) {
  const [events, setEvents] = useState<EventProposal[]>(() => getStoredEvents());
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'published' | 'form'>('form');
  const [selectedEventForModal, setSelectedEventForModal] = useState<EventProposal | null>(null);
  const [reviewNotesInput, setReviewNotesInput] = useState('');
  const [showReviewModal, setShowReviewModal] = useState<EventProposal | null>(null);
  const [directPublishAsLead, setDirectPublishAsLead] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync listener across tabs & storage updates
  useEffect(() => {
    fetchLiveEvents().then((live) => setEvents(live));

    const handleEventsUpdate = (e: any) => {
      if (e.detail) setEvents(e.detail);
      else setEvents(getStoredEvents());
    };
    window.addEventListener('sic_events_updated', handleEventsUpdate);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('sic_events_channel');
        bc.onmessage = (msg) => {
          if (msg.data?.events) setEvents(msg.data.events);
        };
      }
    } catch (e) {}

    return () => {
      window.removeEventListener('sic_events_updated', handleEventsUpdate);
      if (bc) bc.close();
    };
  }, []);

  // Check if current user has Lead / Review authority (VP, President, Lead, Admin)
  const isLeadOrAdmin =
    currentUser.role === 'admin' ||
    currentUser.role === 'coordinator' ||
    (currentUser.designation &&
      (currentUser.designation.toLowerCase().includes('lead') ||
        currentUser.designation.toLowerCase().includes('president') ||
        currentUser.designation.toLowerCase().includes('vice') ||
        currentUser.designation.toLowerCase().includes('advisor') ||
        currentUser.designation.toLowerCase().includes('council')));

  // 1. Form state - Basic Info
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('workshop');
  const [venue, setVenue] = useState('Main University Auditorium & Innovation Lab');
  const [coverImagePath, setCoverImagePath] = useState(SAMPLE_COVER_IMAGES[0].url);
  const [customCoverInput, setCustomCoverInput] = useState('');

  // 2. Form state - Timings & Deadlines (Schedule)
  const [eventStartsAt, setEventStartsAt] = useState('2026-11-20T10:00');
  const [eventEndsAt, setEventEndsAt] = useState('2026-11-20T17:00');
  const [registrationOpensAt, setRegistrationOpensAt] = useState('2026-10-25T09:00');
  const [registrationClosesAt, setRegistrationClosesAt] = useState('2026-11-18T23:59');

  // 3. Form state - Logistics & Audience Control
  const [capacity, setCapacity] = useState(60);
  const [visibility, setVisibility] = useState<EventVisibility>('public');
  const [assignedTeam, setAssignedTeam] = useState('Technical Core & Robotics');

  // File upload reader for custom cover banner
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size should be under 5MB.', 'danger');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setCoverImagePath(reader.result);
          showNotification('Banner image uploaded successfully!', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit new event proposal
  const handleSubmitProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim() || !description.trim() || !venue.trim()) {
      showNotification('Please fill all required event details.', 'danger');
      return;
    }

    if (new Date(eventEndsAt) <= new Date(eventStartsAt)) {
      showNotification('Event end time must be after the start time.', 'danger');
      return;
    }

    if (new Date(registrationClosesAt) <= new Date(registrationOpensAt)) {
      showNotification('Registration deadline must be after registration opening date.', 'danger');
      return;
    }

    const finalCover = customCoverInput.trim() || coverImagePath;

    const isDirectPublish = isLeadOrAdmin && directPublishAsLead;

    const newProposal: EventProposal = {
      id: 'ev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      title: title.trim(),
      summary: summary.trim(),
      description: description.trim(),
      category,
      venue: venue.trim(),
      cover_image_path: finalCover,
      event_starts_at: eventStartsAt,
      event_ends_at: eventEndsAt,
      registration_opens_at: registrationOpensAt,
      registration_closes_at: registrationClosesAt,
      capacity: Number(capacity) || 60,
      registered_count: 0,
      waitlist_count: 0,
      visibility,
      assigned_team: assignedTeam,
      status: isDirectPublish ? 'published' : 'pending_review',
      submitted_by_id: currentUser.id,
      submitted_by_name: `${currentUser.first_name} ${currentUser.last_name}`,
      submitted_by_role: currentUser.designation || 'Executive Core Member',
      submitted_by_avatar: currentUser.avatar_url,
      reviewed_by_id: isDirectPublish ? currentUser.id : undefined,
      reviewed_by_name: isDirectPublish ? `${currentUser.first_name} ${currentUser.last_name} (${currentUser.designation || 'Lead'})` : undefined,
      reviewed_at: isDirectPublish ? new Date().toISOString() : undefined,
      review_notes: isDirectPublish ? 'Verified & Published directly by Lead authority.' : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = saveEventProposal(newProposal);
    setEvents(updated);
    setActiveFilter(isDirectPublish ? 'published' : 'pending');

    // Reset form
    setTitle('');
    setSummary('');
    setDescription('');
    setCustomCoverInput('');

    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    showNotification(
      isDirectPublish
        ? `Event notice "${newProposal.title}" officially APPROVED & PUBLISHED! Live on public website and member portal.`
        : `Event notice proposal "${newProposal.title}" submitted! Status: "pending_review". Assigned Lead iski feasibility check karke approve karenge, tabhi public website par show hoga.`,
      'success'
    );
  };

  // Approval actions by Leads
  const handleApproveAndPublish = (event: EventProposal) => {
    const reviewerName = `${currentUser.first_name} ${currentUser.last_name} (${currentUser.designation || 'Lead Reviewer'})`;
    const updated = updateEventStatus(
      event.id,
      'published',
      { id: currentUser.id, name: reviewerName },
      'Feasibility, schedule, and venue verified. Approved for public portal & website.'
    );
    setEvents(updated);
    setShowReviewModal(null);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    showNotification(
      `Event "${event.title}" officially APPROVED & PUBLISHED! It is now live on the public website.`,
      'success'
    );
  };

  const handleRejectOrRequestChanges = (event: EventProposal, action: 'changes_requested' | 'rejected') => {
    const reviewerName = `${currentUser.first_name} ${currentUser.last_name} (${currentUser.designation || 'Lead Reviewer'})`;
    const updated = updateEventStatus(
      event.id,
      action,
      { id: currentUser.id, name: reviewerName },
      reviewNotesInput.trim() || 'Schedule conflict or venue unavailability. Please revise and resubmit.'
    );
    setEvents(updated);
    setShowReviewModal(null);
    setReviewNotesInput('');
    showNotification(
      `Event "${event.title}" status updated to ${action === 'changes_requested' ? 'Changes Requested' : 'Rejected'}.`,
      'info'
    );
  };

  const handleDelete = (id: string, eventTitle: string) => {
    setDeleteConfirmTarget({ id, title: eventTitle });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    setIsDeleting(true);
    try {
      const updated = deleteEventProposal(deleteConfirmTarget.id);
      setEvents(updated);
      showNotification(`Event "${deleteConfirmTarget.title}" permanently deleted from database and portals.`, 'success');
      setDeleteConfirmTarget(null);
    } catch (e) {
      showNotification('Failed to delete event. Please try again.', 'danger');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered lists
  const pendingEvents = events.filter((e) => e.status === 'pending_review');
  const publishedEvents = events.filter((e) => e.status === 'published' || e.status === 'approved');

  const displayedEvents =
    activeFilter === 'pending'
      ? pendingEvents
      : activeFilter === 'published'
      ? publishedEvents
      : events;

  return (
    <div className="space-y-6">
      {/* Top Banner / Status Overview Card */}
      <div className="p-5 sm:p-7 rounded-[26px] sm:rounded-[36px] bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] border-2 sm:border-4 border-white shadow-[10px_16px_32px_rgba(160,175,205,0.4),-8px_-8px_24px_rgba(255,255,255,0.95)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#0f172a] tracking-tight">
                Event Management
              </h2>
              {isLeadOrAdmin && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 text-[10px] font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Lead Authority Active
                </span>
              )}
            </div>
          </div>

          {/* Quick Counter Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3.5 py-2 rounded-2xl bg-white/90 border border-white shadow-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <div>
                <p className="text-[10px] font-mono text-slate-500 font-bold uppercase">Pending Review</p>
                <p className="text-sm font-black text-amber-600">{pendingEvents.length}</p>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-white/90 border border-white shadow-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <div>
                <p className="text-[10px] font-mono text-slate-500 font-bold uppercase">Published Live</p>
                <p className="text-sm font-black text-emerald-600">{publishedEvents.length}</p>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-2xl bg-white/90 border border-white shadow-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <div>
                <p className="text-[10px] font-mono text-slate-500 font-bold uppercase">Total Proposals</p>
                <p className="text-sm font-black text-indigo-600">{events.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-300/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white/80 text-slate-700 hover:bg-white shadow-sm'
              }`}
            >
              <span>All Events</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 text-white font-mono">
                {events.length}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('pending')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-white/80 text-slate-700 hover:bg-white shadow-sm'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Pending Review</span>
              {pendingEvents.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-mono font-bold animate-pulse">
                  {pendingEvents.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFilter(activeFilter === 'form' ? 'all' : 'form')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{activeFilter === 'form' ? 'View Proposals Feed' : '+ Publish Event Notice'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: NEW EVENT PROPOSAL FORM (MATCHING ALL REQUIREMENTS FROM USER REQUEST) */}
      {activeFilter === 'form' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 sm:p-8 rounded-[28px] sm:rounded-[38px] bg-white border-2 sm:border-4 border-white shadow-[12px_18px_36px_rgba(165,180,215,0.45),-10px_-10px_28px_rgba(255,255,255,0.98)] space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-700 shadow-inner">
                  <Bell className="w-5 h-5 text-purple-600" />
                </div>
                <span>Publish Official Event Notice & Proposal</span>
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Post official notices with full schedule, rules, guidelines, capacity limits and approval workflow.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Close Form
              </button>
            </div>
          </div>

          {/* Optional Lead Authority Toggle */}
          {isLeadOrAdmin && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600 text-white">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                    Lead Authority Direct Publishing
                  </p>
                  <p className="text-[11px] text-indigo-700 font-medium">
                    {directPublishAsLead
                      ? 'Status will be "published" immediately — goes live on landing page & student portal.'
                      : 'Status will be "pending_review" — submit for peer review & scheduling verification.'}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={directPublishAsLead}
                  onChange={(e) => setDirectPublishAsLead(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-2 text-xs font-bold text-slate-800">
                  {directPublishAsLead ? 'Publish Instantly' : 'Submit for Review'}
                </span>
              </label>
            </div>
          )}

          <form onSubmit={handleSubmitProposal} className="space-y-8">
            {/* SECTION 1: Event Basic Information */}
            <div className="p-4 sm:p-6 rounded-[22px] bg-gradient-to-br from-indigo-50/50 via-slate-50 to-purple-50/40 border border-indigo-100/80 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h4 className="text-sm sm:text-base font-black text-indigo-950 uppercase tracking-wide">
                  Event Basic Information
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-mono uppercase font-black text-slate-700 mb-1.5">
                    Title <span className="text-rose-500">*</span> (Event ka naam)
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Intro to Robotics Workshop & Rover Navigation"
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                  />
                </div>

                {/* Event Type / Category */}
                <div>
                  <label className="block text-[11px] font-mono uppercase font-black text-slate-700 mb-1.5">
                    Event Type / Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner cursor-pointer"
                  >
                    <option value="workshop">Workshop (Hands-on Technical)</option>
                    <option value="fest_hackathon">Fest / Hackathon (Major Flagship)</option>
                    <option value="competition">Competition (Coding / Robotics)</option>
                    <option value="seminar_lecture">Seminar / Guest Lecture</option>
                    <option value="external_event">External Event (Inter-College)</option>
                    <option value="internal_meeting">Internal Meeting (Core Team)</option>
                  </select>
                </div>

                {/* Venue */}
                <div>
                  <label className="block text-[11px] font-mono uppercase font-black text-slate-700 mb-1.5">
                    Venue <span className="text-rose-500">*</span> (Event kahan hone wala hai)
                  </label>
                  <input
                    type="text"
                    required
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Main University Auditorium ya Innovation Lab"
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                  />
                </div>

                {/* Summary (Overview) */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-mono uppercase font-black text-slate-700 mb-1.5">
                    Summary <span className="text-rose-500">*</span> (Event ka ek chhota overview)
                  </label>
                  <input
                    type="text"
                    required
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="e.g. A comprehensive 1-day crash course covering microcontrollers, sensor integration and rover test tracks."
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-sm font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                  />
                </div>

                {/* Description (Detailed Plan) */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-mono uppercase font-black text-slate-700 mb-1.5">
                    Description & Plan <span className="text-rose-500">*</span> (Poora detailed plan jisme rules, schedule aur guidelines shamil hon)
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide full schedule, rules, guidelines, eligibility criteria, software prerequisites..."
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-medium placeholder:text-slate-400 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                  />
                </div>

                {/* Cover Image */}
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-[11px] font-mono uppercase font-black text-slate-700">
                    Cover Image (Banner ya poster image upload / select karein)
                  </label>

                  {/* Preset Banner Selector */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {SAMPLE_COVER_IMAGES.map((img) => (
                      <button
                        type="button"
                        key={img.name}
                        onClick={() => {
                          setCoverImagePath(img.url);
                          setCustomCoverInput('');
                        }}
                        className={`group relative rounded-xl overflow-hidden aspect-video border-2 transition-all cursor-pointer ${
                          coverImagePath === img.url && !customCoverInput
                            ? 'border-indigo-600 ring-2 ring-indigo-500/50 scale-102 shadow-md'
                            : 'border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                          <span className="text-[9px] font-bold text-white leading-tight truncate">{img.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Custom upload or URL */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                    <label className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 cursor-pointer flex items-center justify-center gap-2 transition-colors shrink-0">
                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Upload Banner Poster</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>

                    <input
                      type="url"
                      value={customCoverInput}
                      onChange={(e) => {
                        setCustomCoverInput(e.target.value);
                        if (e.target.value.trim()) setCoverImagePath(e.target.value.trim());
                      }}
                      placeholder="Or paste external image URL (https://...)"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Timings & Deadlines (Schedule) */}
            <div className="p-4 sm:p-6 rounded-[22px] bg-gradient-to-br from-purple-50/50 via-slate-50 to-pink-50/40 border border-purple-100/80 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-purple-100">
                <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h4 className="text-sm sm:text-base font-black text-purple-950 uppercase tracking-wide">
                  Timings & Deadlines (Schedule)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Event Starts At */}
                <div>
                  <label className="block text-[11px] font-mono uppercase font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    <span>Event Starts At <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={eventStartsAt}
                    onChange={(e) => setEventStartsAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
                  />
                </div>

                {/* Event Ends At */}
                <div>
                  <label className="block text-[11px] font-mono uppercase font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    <span>Event Ends At <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={eventEndsAt}
                    onChange={(e) => setEventEndsAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
                  />
                </div>

                {/* Registration Opens At */}
                <div>
                  <label className="block text-[11px] font-mono uppercase font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Reg. Opens At <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={registrationOpensAt}
                    onChange={(e) => setRegistrationOpensAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
                  />
                </div>

                {/* Registration Closes At (Deadline) */}
                <div>
                  <label className="block text-[11px] font-mono uppercase font-black text-rose-700 mb-1.5 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Reg. Closes (Deadline) <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={registrationClosesAt}
                    onChange={(e) => setRegistrationClosesAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-rose-50/50 border border-rose-300 text-rose-950 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-inner"
                  />
                  <p className="text-[10px] text-rose-600 font-semibold mt-1">
                    Automatic registration cutoff deadline
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 3: Logistics & Audience Control */}
            <div className="p-4 sm:p-6 rounded-[22px] bg-gradient-to-br from-emerald-50/50 via-slate-50 to-teal-50/40 border border-emerald-100/80 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-emerald-100">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <h4 className="text-sm sm:text-base font-black text-emerald-950 uppercase tracking-wide">
                  Logistics & Audience Control
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Capacity */}
                <div>
                  <label className="block text-[11px] font-mono uppercase font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Capacity (Seats Limit) <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={1000}
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                  />
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    Capacity full hone par registrations waitlist mein chale jayenge.
                  </p>
                </div>

                {/* Visibility */}
                <div>
                  <label className="block text-[11px] font-mono uppercase font-black text-slate-700 mb-1.5">
                    Visibility <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVisibility('public')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        visibility === 'public'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Public</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility('members')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        visibility === 'members'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Members Only</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold mt-1">
                    {visibility === 'public' ? 'Open to all college students' : 'Only approved internal club members'}
                  </p>
                </div>

                {/* Assigned Team */}
                <div>
                  <label className="block text-[11px] font-mono uppercase font-black text-slate-700 mb-1.5">
                    Assigned Organizing Team <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={assignedTeam}
                    onChange={(e) => setAssignedTeam(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner cursor-pointer"
                  >
                    <option value="Technical Core & Robotics">Technical Core & Robotics</option>
                    <option value="Event Operations & Logistics">Event Operations & Logistics</option>
                    <option value="Graphic & UI/UX Design">Graphic & UI/UX Design</option>
                    <option value="Video Editing & Media VFX">Video Editing & Media VFX</option>
                    <option value="Full-Stack Web Development">Full-Stack Web Development</option>
                    <option value="AI & Machine Learning Research">AI & Machine Learning Research</option>
                    <option value="Core Council Administration">Core Council Administration</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Submitter & Approval Notice */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-amber-900">
                <p className="font-bold">
                  Important Approval Notice:
                </p>
                <p>
                  Jab aap ye form submit karenge, event sidhe live nahi hoga. Pehle iska status <span className="font-mono font-bold bg-amber-200/80 px-1 py-0.5 rounded">pending_review</span> mein jayega. Fir Assigned Lead ya higher authority (VP/President) iski feasibility, schedule aur venue check karke isko approve karenge. Approval milne ke baad hi ye officially <strong>published</strong> hoga aur public website par show hoga.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-indigo-500/30 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Submit Event Proposal for Review</span>
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* VIEW 2: EVENT PROPOSALS FEED & REVIEW CARDS */}
      {activeFilter !== 'form' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <h3 className="text-base sm:text-lg font-black text-slate-900 font-mono flex items-center gap-2">
              <span>
                {activeFilter === 'pending'
                  ? 'Pending Review Proposals'
                  : activeFilter === 'published'
                  ? 'Officially Published Events'
                  : 'All Event Proposals & Active Schedules'}{' '}
                ({displayedEvents.length})
              </span>
            </h3>
            <span className="text-[11px] sm:text-xs text-slate-500 font-semibold">
              Live Pipeline Sync
            </span>
          </div>

          {displayedEvents.length === 0 ? (
            <div className="p-8 sm:p-14 rounded-[28px] bg-white border border-slate-200 text-center space-y-3 shadow-sm">
              <div className="w-14 h-14 rounded-3xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center font-black text-2xl border border-indigo-100">
                📅
              </div>
              <h4 className="text-base sm:text-lg font-black text-slate-900">No Events Found in this Filter</h4>
              <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-sm mx-auto">
                {activeFilter === 'pending'
                  ? 'All event proposals have been reviewed and approved.'
                  : 'Propose a new event to populate the schedule and approval pipeline.'}
              </p>
              <button
                onClick={() => setActiveFilter('form')}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm hover:bg-indigo-500 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Proposal</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {displayedEvents.map((ev) => {
                const catMeta = CATEGORY_LABELS[ev.category] || CATEGORY_LABELS.workshop;
                const isPending = ev.status === 'pending_review';
                const isLive = ev.status === 'published' || ev.status === 'approved';
                const isDeadlinePassed = new Date() > new Date(ev.registration_closes_at);
                const percentFull = Math.min(100, Math.round((ev.registered_count / (ev.capacity || 1)) * 100));

                return (
                  <div
                    key={ev.id}
                    className={`rounded-[26px] sm:rounded-[32px] bg-white border-2 transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-[6px_10px_24px_rgba(160,175,205,0.35),-4px_-4px_16px_rgba(255,255,255,0.9)] hover:-translate-y-0.5 ${
                      isPending
                        ? 'border-amber-300 ring-2 ring-amber-400/20'
                        : isLive
                        ? 'border-emerald-200'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Top Banner Image with Inset Badges */}
                    <div className="relative aspect-[16/8] sm:aspect-[16/7] w-full overflow-hidden bg-slate-900">
                      <img
                        src={ev.cover_image_path || SAMPLE_COVER_IMAGES[0].url}
                        alt={ev.title}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-black/40" />

                      {/* Top Badges */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5">
                          {isPending && (
                            <span className="px-3 py-1 rounded-full bg-amber-500/90 text-white font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-md backdrop-blur-md flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                              PENDING REVIEW
                            </span>
                          )}
                          {isLive && (
                            <span className="px-3 py-1 rounded-full bg-emerald-500/95 text-white font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-md backdrop-blur-md flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              PUBLISHED & LIVE
                            </span>
                          )}
                          {ev.status === 'changes_requested' && (
                            <span className="px-3 py-1 rounded-full bg-rose-500/90 text-white font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-md backdrop-blur-md">
                              CHANGES REQUESTED
                            </span>
                          )}
                        </div>

                        {/* Visibility & Category */}
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] sm:text-[10px] font-bold border uppercase backdrop-blur-md ${catMeta.badgeBg}`}>
                            {catMeta.label}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-black/60 text-white font-mono text-[9px] sm:text-[10px] font-semibold border border-white/20 backdrop-blur-md">
                            {ev.visibility === 'public' ? 'Public' : 'Members'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Banner Info */}
                      <div className="absolute bottom-2.5 inset-x-3 text-white">
                        <p className="text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                          {ev.assigned_team}
                        </p>
                        <h4 className="text-base sm:text-xl font-black text-white leading-tight drop-shadow truncate">
                          {ev.title}
                        </h4>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-4 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        {/* Summary */}
                        <p className="text-xs sm:text-sm text-slate-700 font-semibold line-clamp-2 leading-relaxed">
                          {ev.summary}
                        </p>

                        {/* Venue & Timing Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">Venue</span>
                              <span className="font-bold text-slate-800 text-xs block truncate">{ev.venue}</span>
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2">
                            <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase block">Event Schedule</span>
                              <span className="font-bold text-slate-800 text-xs block truncate">
                                {new Date(ev.event_starts_at).toLocaleDateString()} {new Date(ev.event_starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Registration Deadline & Capacity Tray */}
                        <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <span className="flex items-center gap-1.5 text-indigo-900">
                              <Users className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Capacity & Seats: {ev.registered_count} / {ev.capacity}</span>
                            </span>
                            {ev.waitlist_count > 0 && (
                              <span className="text-amber-700 text-[11px] font-mono">
                                ({ev.waitlist_count} on Waitlist)
                              </span>
                            )}
                          </div>

                          {/* Progress bar */}
                          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                percentFull >= 100
                                  ? 'bg-rose-500'
                                  : percentFull >= 75
                                  ? 'bg-amber-500'
                                  : 'bg-indigo-600'
                              }`}
                              style={{ width: `${percentFull}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono font-semibold">
                            <span>Opens: {new Date(ev.registration_opens_at).toLocaleDateString()}</span>
                            <span className={isDeadlinePassed ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                              Deadline: {new Date(ev.registration_closes_at).toLocaleDateString()}
                              {isDeadlinePassed ? ' (Closed)' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Submitter & Reviewer Metadata */}
                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                              {ev.submitted_by_name ? ev.submitted_by_name[0] : 'C'}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-slate-900 block truncate">
                                Proposed by: {ev.submitted_by_name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium block truncate">
                                {ev.submitted_by_role}
                              </span>
                            </div>
                          </div>

                          {ev.reviewed_by_name && (
                            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 font-bold">
                              Verified: {ev.reviewed_by_name}
                            </span>
                          )}
                        </div>

                        {ev.review_notes && (
                          <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-medium italic">
                            "{ev.review_notes}"
                          </div>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <button
                          onClick={() => setSelectedEventForModal(ev)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>View Full Plan</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {/* If current user is Lead/Admin and event is pending_review */}
                          {isPending && isLeadOrAdmin && (
                            <button
                              onClick={() => setShowReviewModal(ev)}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Review & Approve</span>
                            </button>
                          )}

                          {isLive && onViewPublicEvents && (
                            <button
                              onClick={onViewPublicEvents}
                              className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1 border border-emerald-200 transition-colors cursor-pointer"
                            >
                              <Globe className="w-3 h-3 text-emerald-600" />
                              <span>Live on Website</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(ev.id, ev.title);
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 transition-all cursor-pointer flex items-center justify-center active:scale-90 shadow-sm"
                            title="Permanently delete this event"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </button>
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

      {/* MODAL 1: VIEW FULL EVENT PLAN & GUIDELINES */}
      <AnimatePresence>
        {selectedEventForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white rounded-[32px] overflow-hidden shadow-2xl border-4 border-white max-h-[90vh] flex flex-col"
            >
              {/* Header Image */}
              <div className="relative aspect-[16/6] w-full overflow-hidden bg-slate-900 shrink-0">
                <img
                  src={selectedEventForModal.cover_image_path || SAMPLE_COVER_IMAGES[0].url}
                  alt={selectedEventForModal.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                <button
                  onClick={() => setSelectedEventForModal(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 inset-x-4 text-white">
                  <span className="text-[10px] font-mono text-cyan-300 uppercase font-bold">
                    {selectedEventForModal.assigned_team}
                  </span>
                  <h3 className="text-xl font-black">{selectedEventForModal.title}</h3>
                </div>
              </div>

              {/* Scrollable details */}
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Event Summary</span>
                  <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                    {selectedEventForModal.summary}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-mono uppercase text-slate-700 font-black">
                    Full Plan, Rules & Guidelines
                  </span>
                  <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-normal">
                    {selectedEventForModal.description}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Venue</span>
                    <span className="font-bold text-slate-900">{selectedEventForModal.venue}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Capacity</span>
                    <span className="font-bold text-slate-900">{selectedEventForModal.capacity} Seats Limit</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">Audience</span>
                    <span className="font-bold text-slate-900 capitalize">{selectedEventForModal.visibility}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setSelectedEventForModal(null)}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: LEAD APPROVAL & FEASIBILITY REVIEW */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-[32px] p-6 space-y-5 shadow-2xl border-4 border-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shadow-inner">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Lead Feasibility & Approval</h3>
                    <p className="text-xs text-slate-500 font-semibold">Verify schedule, capacity, and venue</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowReviewModal(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <p className="text-slate-500 font-mono uppercase font-bold text-[10px]">Event Details to Verify</p>
                <h4 className="text-sm font-black text-slate-900">{showReviewModal.title}</h4>
                <p className="text-slate-700"><strong>Venue:</strong> {showReviewModal.venue}</p>
                <p className="text-slate-700">
                  <strong>Schedule:</strong> {new Date(showReviewModal.event_starts_at).toLocaleString()} to {new Date(showReviewModal.event_ends_at).toLocaleString()}
                </p>
                <p className="text-slate-700"><strong>Capacity:</strong> {showReviewModal.capacity} Seats | <strong>Team:</strong> {showReviewModal.assigned_team}</p>
                <p className="text-slate-700"><strong>Proposed By:</strong> {showReviewModal.submitted_by_name} ({showReviewModal.submitted_by_role})</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase font-black text-slate-700">
                  Review Notes & Feedback (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reviewNotesInput}
                  onChange={(e) => setReviewNotesInput(e.target.value)}
                  placeholder="e.g. Auditorium confirmed. Approved for immediate public publication."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleApproveAndPublish(showReviewModal)}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>Approve & Officially Publish Live</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleRejectOrRequestChanges(showReviewModal, 'changes_requested')}
                    className="py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 cursor-pointer transition-colors"
                  >
                    Request Changes
                  </button>
                  <button
                    onClick={() => handleRejectOrRequestChanges(showReviewModal, 'rejected')}
                    className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 cursor-pointer transition-colors"
                  >
                    Decline / Reject
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: PERMANENT DELETE CONFIRMATION DIALOG */}
      <AnimatePresence>
        {deleteConfirmTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              className="w-full max-w-md bg-white rounded-[28px] p-6 space-y-5 shadow-2xl border-4 border-rose-100 text-slate-900 relative"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0">
                  <Trash2 className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    Permanently Delete Event?
                  </h3>
                  <p className="text-xs text-rose-600 font-mono font-bold uppercase tracking-wider">
                    Database Permanent Removal
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <p className="text-xs font-bold text-slate-800">
                  "{deleteConfirmTarget.title}"
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                  Are you sure you want to permanently delete this event? It will be removed from:
                </p>
                <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-0.5 font-medium">
                  <li>Supabase PostgreSQL database</li>
                  <li>Lobby top dynamic alert notice ticker</li>
                  <li>Upcoming club events & workshops feed</li>
                  <li>All student registrations & waitlist records</li>
                </ul>
                <p className="text-[11px] font-bold text-rose-600 pt-1">
                  ⚠️ This action is permanent and cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteConfirmTarget(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
