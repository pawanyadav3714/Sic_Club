import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowRight, 
  Flame
} from 'lucide-react';
import { Announcement, EventProposal } from '../types';
import { getStoredAnnouncements, fetchLiveAnnouncements } from '../lib/supabase';
import { getAllAnnouncedEvents, fetchLiveEvents } from '../lib/eventStorage';

interface DynamicLobbyNoticeTickerProps {
  onSelectEvent?: (eventId: string) => void;
}

export default function DynamicLobbyNoticeTicker({ onSelectEvent }: DynamicLobbyNoticeTickerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => getStoredAnnouncements());
  const [events, setEvents] = useState<EventProposal[]>(() => getAllAnnouncedEvents());
  const [isPaused, setIsPaused] = useState(false);

  // Sync with real-time events and announcements across all tabs
  useEffect(() => {
    const loadLive = async () => {
        // Fetch from Supabase directly to populate localStorage
        await fetchLiveAnnouncements();
        await fetchLiveEvents();
        setAnnouncements(getStoredAnnouncements());
        setEvents(getAllAnnouncedEvents());
    };
    loadLive();

    const handleUpdate = () => {
      setAnnouncements(getStoredAnnouncements());
      setEvents(getAllAnnouncedEvents());
    };

    window.addEventListener('sic_announcements_updated', handleUpdate);
    window.addEventListener('sic_events_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    let bcAnn: BroadcastChannel | null = null;
    let bcEv: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bcAnn = new BroadcastChannel('sic_announcements_channel');
        bcAnn.onmessage = handleUpdate;
        bcEv = new BroadcastChannel('sic_events_channel');
        bcEv.onmessage = handleUpdate;
      }
    } catch (e) {}

    return () => {
      window.removeEventListener('sic_announcements_updated', handleUpdate);
      window.removeEventListener('sic_events_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      if (bcAnn) bcAnn.close();
      if (bcEv) bcEv.close();
    };
  }, []);

  // Format notice items - showing ONLY event type and title as requested
  const items: Array<{
    id: string;
    tag: string;
    title: string;
    targetId?: string;
  }> = [];

  // 1. Add announced events (e.g. winter Tech Fest, Hackathon 2)
  events.forEach((ev) => {
    items.push({
      id: `ev-${ev.id}`,
      tag: ev.category === 'fest_hackathon' ? 'HACKATHON' : ev.category === 'workshop' ? 'WORKSHOP' : 'EVENT',
      title: ev.title,
      targetId: ev.id,
    });
  });

  // 2. Add text announcements posted by core members
  announcements.forEach((ann) => {
    items.push({
      id: `ann-${ann.id}`,
      tag: ann.category ? ann.category.toUpperCase().replace('NOTICE', '').trim() || 'NOTICE' : 'NOTICE',
      title: ann.title,
    });
  });

  // If no events or announcements exist in database, do not show dummy items
  if (items.length === 0) {
    return null;
  }

  // Duplicate items for continuous seamless infinite loop
  const displayItems = [...items, ...items, ...items, ...items, ...items];

  const handleItemClick = (targetId?: string) => {
    if (targetId && onSelectEvent) {
      onSelectEvent(targetId);
    }
    const el = document.getElementById('events');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div 
      className="relative z-40 w-full bg-gradient-to-r from-red-700 via-rose-600 to-red-700 text-white shadow-md border-b border-red-500/40 select-none overflow-hidden h-10 sm:h-12 flex items-center p-0 m-0"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Full-width Dynamic Moving Marquee Track - zero padding & zero margin */}
      <div className="relative w-full overflow-hidden h-full flex items-center p-0 m-0">
        <motion.div
          animate={{
            x: ['0%', '-50%']
          }}
          transition={{
            duration: isPaused ? 100000 : 32,
            ease: 'linear',
            repeat: Infinity
          }}
          className="flex items-center gap-6 sm:gap-10 whitespace-nowrap p-0 m-0 pl-2"
        >
          {displayItems.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              onClick={() => handleItemClick(item.targetId)}
              className="inline-flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-black/25 px-2 py-1 rounded transition-colors group p-0 m-0"
              title="Click to view event details and register"
            >
              {/* Event Type Tag Badge */}
              <span className="px-2 sm:px-2.5 py-0.5 rounded bg-black/45 text-amber-300 border border-amber-300/40 text-xs sm:text-sm font-mono font-black tracking-wider uppercase flex items-center gap-1 shrink-0 shadow-sm">
                <Flame className="w-3 h-3 text-amber-400" />
                {item.tag}
              </span>

              {/* Title with larger text size */}
              <span className="font-black text-sm sm:text-base md:text-lg text-white group-hover:text-amber-200 transition-colors drop-shadow-md tracking-tight">
                {item.title}
              </span>

              {/* Action Link */}
              <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-mono font-black text-amber-300 uppercase tracking-wider group-hover:translate-x-0.5 transition-transform ml-1">
                <span>Register</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>

              {/* Separator */}
              <span className="text-red-300/60 font-bold ml-2 text-sm sm:text-base">✦</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
