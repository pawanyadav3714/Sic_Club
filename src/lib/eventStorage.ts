import { EventProposal, EventRegistration, EventStatus, EventCategory, Announcement } from '../types';
import { saveAnnouncement, getStoredAnnouncements, isSupabaseConfigured, supabase } from './supabase';

// Empty by default - no fake or dummy notices! Only real announcements created by core members.
export const INITIAL_EVENTS: EventProposal[] = [];

// Sample template for quick pre-fill in form if core member clicks "Use Template"
export const SAMPLE_TEMPLATE_PROPOSAL: Partial<EventProposal> = {
  title: 'Intro to Robotics Workshop',
  summary: 'Hands-on embedded robotics workshop covering microcontrollers, sensor integration, and motor actuation.',
  description: `### Scope & Schedule
1. Module 1: Embedded C & Arduino/ESP32 fundamentals.
2. Module 2: Motor drivers, PWM signals, and ultrasonic distance sensor calibration.
3. Module 3: Building an autonomous obstacle-avoiding rover on test tracks.

### Rules & Guidelines
- Participants must bring their own laptops with Arduino IDE 2.x pre-installed.
- Hardware kits will be provided on-site.
- Verified certificates will be awarded upon completion.`,
  category: 'workshop',
  venue: 'Main University Auditorium & Innovation Lab (Room 302)',
  capacity: 60,
  visibility: 'public',
  assigned_team: 'Technical Core & Robotics',
};

export const CATEGORY_LABELS: Record<string, { label: string; color: string; badgeBg: string }> = {
  workshop: { label: 'Workshop', color: '#6366f1', badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  fest_hackathon: { label: 'Fest / Hackathon', color: '#a855f7', badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  competition: { label: 'Competition', color: '#ec4899', badgeBg: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  seminar_lecture: { label: 'Seminar / Guest Lecture', color: '#06b6d4', badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  external_event: { label: 'External Event', color: '#10b981', badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  internal_meeting: { label: 'Internal Meeting', color: '#f59e0b', badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
};

export const SAMPLE_COVER_IMAGES = [
  { name: 'Robotics & Hardware', url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Hackathon & Coding', url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Drones & Aerospace', url: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Auditorium Keynote', url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Tech Innovation Lab', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&q=80' },
  { name: 'Team Strategy Meeting', url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80' },
];

const FAKE_MOCK_IDS = new Set([
  'ev-robotics-workshop-2026',
  'ev-innovision-hackathon-2026',
  'ev-drone-slam-seminar-2026',
  'ev-core-sprint-internal-2026',
]);

function broadcastEventChanges(events: EventProposal[]) {
  setTimeout(() => {
    try {
      window.dispatchEvent(new CustomEvent('sic_events_updated', { detail: events }));
    } catch (e) {}
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('sic_events_channel');
        bc.postMessage({ type: 'UPDATE', events });
        bc.close();
      }
    } catch (e) {}
  }, 0);
}

/**
 * Sync an approved/published event notice to the announcements list
 */
function syncEventToAnnouncements(event: EventProposal) {
  try {
    const annCategoryMap: Record<string, any> = {
      workshop: 'Workshop',
      fest_hackathon: 'Hackathon',
      competition: 'Event Notice',
      seminar_lecture: 'General Notice',
      external_event: 'Event Notice',
      internal_meeting: 'General Notice',
    };

    const ann: Announcement = {
      id: `ann-${event.id}`,
      title: event.title,
      content: `${event.summary}\n\n${event.description}`,
      author_id: event.submitted_by_id,
      author_name: event.submitted_by_name,
      author_role: event.submitted_by_role,
      category: annCategoryMap[event.category] || 'Event Notice',
      event_date: event.event_starts_at ? event.event_starts_at.split('T')[0] : undefined,
      event_location: event.venue,
      created_at: event.created_at || new Date().toISOString(),
    };

    saveAnnouncement(ann);
  } catch (e) {
    console.warn('Could not sync event to announcements:', e);
  }
}

/**
 * Get stored events. Purges fake initial mock notices so user sees ONLY real core-member notices.
 */
export function getStoredEvents(): EventProposal[] {
  try {
    const raw = localStorage.getItem('sic_event_proposals');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Purge hardcoded fake notices if user requested real notices
        const cleaned = parsed.filter((item) => !FAKE_MOCK_IDS.has(item.id));
        if (cleaned.length !== parsed.length) {
          localStorage.setItem('sic_event_proposals', JSON.stringify(cleaned));
        }
        return cleaned;
      }
    }
  } catch (e) {}

  return [];
}

/**
 * Save or update an event proposal.
 * If status is 'published', automatically syncs to announcements list as well.
 */
export function saveEventProposal(event: EventProposal): EventProposal[] {
  try {
    const list = getStoredEvents();
    const idx = list.findIndex(e => e.id === event.id);
    if (idx >= 0) {
      list[idx] = { ...event, updated_at: new Date().toISOString() };
    } else {
      list.unshift(event);
    }
    localStorage.setItem('sic_event_proposals', JSON.stringify(list));

    if (event.status !== 'rejected') {
      syncEventToAnnouncements(event);
    }

    // Async persist to remote Supabase if available
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          await supabase.from('events').upsert([{
            id: event.id,
            title: event.title,
            summary: event.summary,
            description: event.description,
            category: event.category,
            venue: event.venue,
            cover_image_path: event.cover_image_path,
            event_starts_at: event.event_starts_at,
            event_ends_at: event.event_ends_at,
            registration_opens_at: event.registration_opens_at,
            registration_closes_at: event.registration_closes_at,
            capacity: event.capacity,
            registered_count: event.registered_count || 0,
            waitlist_count: event.waitlist_count || 0,
            visibility: event.visibility,
            assigned_team: event.assigned_team,
            status: event.status,
            submitted_by_id: event.submitted_by_id,
            submitted_by_name: event.submitted_by_name,
            submitted_by_role: event.submitted_by_role,
            created_at: event.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        } catch (e) {}
      })();
    }

    broadcastEventChanges(list);
    return list;
  } catch (e) {
    return [event];
  }
}

/**
 * Fetch live events directly from Supabase database.
 * If Supabase is connected, remote database is the source of truth!
 */
export async function fetchLiveEvents(): Promise<EventProposal[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getStoredEvents();
  }

  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const remoteEvents = data as EventProposal[];
      try {
        localStorage.setItem('sic_event_proposals', JSON.stringify(remoteEvents));
      } catch (e) {}
      broadcastEventChanges(remoteEvents);
      return remoteEvents;
    }
  } catch (e) {
    console.warn('Could not fetch events from Supabase:', e);
  }

  return getStoredEvents();
}

/**
 * Return all announced events across proposals and announcements so that
 * any notice or event created by a core member immediately shows up on the landing page lobby
 * and student dashboard for all registered and unregistered members.
 */
export function getAllAnnouncedEvents(): EventProposal[] {
  const events = getStoredEvents();
  const announcements = getStoredAnnouncements();

  const existingTitles = new Set(events.map(e => e.title.trim().toLowerCase()));
  const existingIds = new Set(events.map(e => e.id));

  const bridged: EventProposal[] = [];

  for (const ann of announcements) {
    if (!existingIds.has(`ev-${ann.id}`) && !existingIds.has(ann.id) && !existingTitles.has(ann.title.trim().toLowerCase())) {
      const annDate = ann.event_date ? `${ann.event_date}T10:00` : new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 16);
      const annEndDate = ann.event_date ? `${ann.event_date}T17:00` : new Date(Date.now() + 86400000 * 5 + 25200000).toISOString().slice(0, 16);
      bridged.push({
        id: `ev-${ann.id}`,
        title: ann.title,
        summary: ann.content.split('\n')[0] || ann.title,
        description: ann.content,
        category: (ann.category === 'Workshop' ? 'workshop' : ann.category === 'Hackathon' ? 'fest_hackathon' : 'competition') as EventCategory,
        venue: ann.event_location || 'Main University Auditorium & Innovation Lab',
        cover_image_path: SAMPLE_COVER_IMAGES[1].url,
        event_starts_at: annDate,
        event_ends_at: annEndDate,
        registration_opens_at: new Date(ann.created_at || Date.now()).toISOString().slice(0, 16),
        registration_closes_at: annDate,
        capacity: 60,
        registered_count: 0,
        waitlist_count: 0,
        visibility: 'public',
        assigned_team: 'Technical Core & Events',
        status: 'published',
        submitted_by_id: ann.author_id || 'core-lead-admin',
        submitted_by_name: ann.author_name || 'Executive Core Member',
        submitted_by_role: ann.author_role || 'Core Member',
        created_at: ann.created_at || new Date().toISOString(),
        updated_at: ann.created_at || new Date().toISOString(),
      });
    }
  }

  // Filter out any rejected items; keep all published, approved, and announced proposals
  return [...events, ...bridged].filter(e => e.status !== 'rejected');
}

/**
 * Lead / VP / President Review & Approval action
 */
export function updateEventStatus(
  eventId: string,
  newStatus: EventStatus,
  reviewer: { id: string; name: string },
  reviewNotes?: string
): EventProposal[] {
  try {
    const list = getStoredEvents();
    const idx = list.findIndex(e => e.id === eventId);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        status: newStatus,
        reviewed_by_id: reviewer.id,
        reviewed_by_name: reviewer.name,
        review_notes: reviewNotes || (newStatus === 'published' ? 'Feasibility, schedule, and venue approved by Lead.' : undefined),
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('sic_event_proposals', JSON.stringify(list));

      if (newStatus === 'published' || newStatus === 'approved') {
        syncEventToAnnouncements(list[idx]);
      }

      broadcastEventChanges(list);
    }
    return list;
  } catch (e) {
    return getStoredEvents();
  }
}

/**
 * Delete an event proposal / notice
 */
export function deleteEventProposal(id: string): EventProposal[] {
  try {
    const list = getStoredEvents();
    const targetEvent = list.find(e => e.id === id);
    const updated = list.filter(e => e.id !== id);
    localStorage.setItem('sic_event_proposals', JSON.stringify(updated));

    // Also remove from announcements if synced or matching
    try {
      const annList = getStoredAnnouncements().filter(a => 
        a.id !== `ann-${id}` && 
        a.id !== id && 
        (!targetEvent || a.title.trim().toLowerCase() !== targetEvent.title.trim().toLowerCase())
      );
      localStorage.setItem('sic_announcements', JSON.stringify(annList));
      setTimeout(() => {
        try {
          window.dispatchEvent(new CustomEvent('sic_announcements_updated', { detail: annList }));
        } catch (e) {}
      }, 0);
    } catch (e) {}

    // Also remove associated event registrations
    try {
      const rawRegs = localStorage.getItem('sic_event_registrations');
      if (rawRegs) {
        const regs = JSON.parse(rawRegs);
        if (Array.isArray(regs)) {
          const updatedRegs = regs.filter((r: any) => r.event_id !== id);
          localStorage.setItem('sic_event_registrations', JSON.stringify(updatedRegs));
        }
      }
    } catch (e) {}

    // Async permanent delete from Supabase database tables if configured
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          await supabase.from('events').delete().eq('id', id);
        } catch (e) {}
        try {
          await supabase.from('announcements').delete().or(`id.eq.${id},id.eq.ann-${id}`);
        } catch (e) {}
        try {
          await supabase.from('event_registrations').delete().eq('event_id', id);
        } catch (e) {}
      })();
    }

    broadcastEventChanges(updated);
    return updated;
  } catch (e) {
    return [];
  }
}

/**
 * Purge any mock/fake announcements completely
 */
export function purgeFakeAnnouncements(): void {
  try {
    const raw = localStorage.getItem('sic_event_proposals');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((item) => !FAKE_MOCK_IDS.has(item.id));
        if (cleaned.length !== parsed.length) {
          localStorage.setItem('sic_event_proposals', JSON.stringify(cleaned));
          broadcastEventChanges(cleaned);
        }
      }
    }
  } catch (e) {}
}

export function getEventRegistrations(eventId?: string): EventRegistration[] {
  try {
    const raw = localStorage.getItem('sic_event_registrations');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return eventId ? parsed.filter((r) => r.event_id === eventId) : parsed;
      }
    }
  } catch (e) {}
  return [];
}

export function registerForEvent(registration: {
  event_id: string;
  name: string;
  email: string;
  phone_no?: string;
  branch?: string;
  registration_no?: string;
  user_id?: string;
}): { success: boolean; message: string; type: 'confirmed' | 'waitlist' } {
  try {
    const events = getStoredEvents();
    const event = events.find((e) => e.id === registration.event_id);
    if (!event) {
      return { success: false, message: 'Event not found or closed.', type: 'confirmed' };
    }

    const now = new Date();
    if (event.registration_opens_at && new Date(event.registration_opens_at) > now) {
      return {
        success: false,
        message: `Registration has not opened yet. Opens on ${new Date(event.registration_opens_at).toLocaleString()}`,
        type: 'confirmed'
      };
    }

    if (event.registration_closes_at && new Date(event.registration_closes_at) < now) {
      return {
        success: false,
        message: 'Registration deadline has passed. This event is no longer accepting new submissions.',
        type: 'confirmed'
      };
    }

    const allRegs = getEventRegistrations();
    const existing = allRegs.find(
      (r) => r.event_id === registration.event_id && r.email.toLowerCase() === registration.email.toLowerCase()
    );

    if (existing) {
      return {
        success: false,
        message: `You are already registered (${existing.status === 'confirmed' ? 'Confirmed Seat' : 'Waitlist Position #' + existing.waitlist_position}).`,
        type: existing.status === 'confirmed' ? 'confirmed' : 'waitlist'
      };
    }

    const currentRegsForEvent = allRegs.filter((r) => r.event_id === registration.event_id);
    const confirmedCount = currentRegsForEvent.filter((r) => r.status === 'confirmed').length;
    const isWaitlist = confirmedCount >= event.capacity;
    const waitlistCount = currentRegsForEvent.filter((r) => r.status === 'waitlisted').length;

    const newReg: EventRegistration = {
      id: `reg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      event_id: registration.event_id,
      name: registration.name,
      email: registration.email,
      phone_no: registration.phone_no,
      branch: registration.branch,
      registration_no: registration.registration_no,
      registered_at: new Date().toISOString(),
      status: isWaitlist ? 'waitlisted' : 'confirmed',
      waitlist_position: isWaitlist ? waitlistCount + 1 : undefined,
    };

    allRegs.push(newReg);
    localStorage.setItem('sic_event_registrations', JSON.stringify(allRegs));

    // Update counts on event proposal
    event.registered_count = confirmedCount + (isWaitlist ? 0 : 1);
    event.waitlist_count = waitlistCount + (isWaitlist ? 1 : 0);
    saveEventProposal(event);

    return {
      success: true,
      message: isWaitlist
        ? `Capacity of ${event.capacity} seats reached! You have been placed on the Priority Waitlist at position #${waitlistCount + 1}. You will be notified if a seat opens up.`
        : `Registration confirmed! Your seat is secured for ${event.title}.`,
      type: isWaitlist ? 'waitlist' : 'confirmed'
    };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Failed to complete registration.', type: 'confirmed' };
  }
}
