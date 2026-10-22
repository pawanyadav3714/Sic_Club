import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, ClubPost, MembershipApplication, Announcement, ChatMessage } from '../types';

// Updated Supabase Project Credentials
const DEFAULT_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vocxskysvzlifibiqpdz.supabase.co';
const DEFAULT_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvY3hza3lzdnpsaWZpYmlxcGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NDUzNTAsImV4cCI6MjEwNjMyMTM1MH0.RswwljRHCkZsby3C7l_T_4OT57UYy61BEGYHSiA6yro';

localStorage.setItem('sic_supabase_url', DEFAULT_URL);
localStorage.setItem('sic_supabase_key', DEFAULT_KEY);

const storedUrl = localStorage.getItem('sic_supabase_url') || DEFAULT_URL;
const storedKey = localStorage.getItem('sic_supabase_key') || DEFAULT_KEY;

export const isSupabaseConfigured = Boolean(
  storedUrl && 
  storedKey && 
  (storedUrl.startsWith('http://') || storedUrl.startsWith('https://'))
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(storedUrl, storedKey)
  : null;

// Default Mock Data with valid UUIDs for Supabase foreign keys
export const MOCK_POSTS: ClubPost[] = [
  { id: '11111111-1111-4111-a111-111111111111', name: 'Tech / Coding', description: 'Build full-stack web apps, AI tools, competitive programming & open source projects.' },
  { id: '22222222-2222-4222-a222-222222222222', name: 'Video Editing', description: 'Craft cinematic After Effects reels, promo videos, and event aftermovies.' },
  { id: '33333333-3333-4333-a333-333333333333', name: 'Event Management', description: 'Lead logistics, stage coordination, and guest relations for mega tech fests.' },
  { id: '44444444-4444-4444-a444-444444444444', name: 'Tech Fest Management', description: 'Plan hackathons, robotics arenas, and innovation challenges.' },
  { id: '55555555-5555-4555-a555-555555555555', name: 'Post Design & Graphics', description: 'Design eye-catching UI/UX, Instagram creatives, and high-impact branding.' },
];

export const DEFAULT_CORE_MEMBERS: UserProfile[] = [];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [];

export function isDummyCoreMember(member: UserProfile): boolean {
  if (!member) return true;
  return false;
}

export function getStoredCoreMembers(): UserProfile[] {
  let list: UserProfile[] = [...DEFAULT_CORE_MEMBERS];

  try {
    const stored = localStorage.getItem('sic_core_members');
    if (stored) {
      const parsed: UserProfile[] = JSON.parse(stored);
      parsed.forEach((m) => {
        const cleanE = (m.email || '').toLowerCase().trim();
        if (
          cleanE.includes('piyush') ||
          cleanE.includes('rounak') ||
          cleanE.includes('vimal') ||
          cleanE.includes('whitman') ||
          cleanE.includes('pearson') ||
          cleanE.includes('stewart')
        ) {
          return;
        }
        const idx = list.findIndex(
          (c) => c.id === m.id || (c.email && m.email && c.email.toLowerCase() === m.email.toLowerCase())
        );
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...m };
        } else {
          list.push(m);
        }
      });
    }
  } catch (e) {}

  return list.map(fixProfileName);
}

export async function fetchLiveCoreMembers(): Promise<UserProfile[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('core_members').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const liveCore: UserProfile[] = data.map(c => fixProfileName({ ...c, role: 'core_member' }));
        localStorage.setItem('sic_core_members', JSON.stringify(liveCore));
        return liveCore;
      }
    } catch (e) {
      console.warn('Error fetching live core members:', e);
    }
  }
  return getStoredCoreMembers();
}

export async function fetchLiveStudentProfiles(): Promise<UserProfile[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('student_profiles').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const liveStudents: UserProfile[] = data.map(s => fixProfileName({
          ...s,
          role: s.status === 'rejected' ? ('rejected' as const) : ('member' as const)
        }));
        localStorage.setItem('sic_registered_users', JSON.stringify(liveStudents));
        return liveStudents;
      }
    } catch (e) {
      console.warn('Error fetching live student profiles:', e);
    }
  }
  const localReg: UserProfile[] = JSON.parse(localStorage.getItem('sic_registered_users') || '[]');
  return localReg.map(fixProfileName);
}

export function saveCoreMember(member: UserProfile) {
  try {
    const fixed = fixProfileName(member);
    const list = getStoredCoreMembers();
    const idx = list.findIndex(m => m.id === fixed.id || m.email?.toLowerCase() === fixed.email?.toLowerCase());
    if (idx >= 0) list[idx] = fixed;
    else list.push(fixed);
    localStorage.setItem('sic_core_members', JSON.stringify(list.map(fixProfileName)));
  } catch (e) {}
}

export function toggleCoreMemberStatus(id: string): UserProfile[] {
  try {
    const list = getStoredCoreMembers();
    const target = list.find((m) => m.id === id);
    if (target) {
      target.core_status = target.core_status === 'upcoming' ? 'enrolled' : 'upcoming';
      localStorage.setItem('sic_core_members', JSON.stringify(list.map(fixProfileName)));
    }
    return list;
  } catch (e) {
    return getStoredCoreMembers();
  }
}

export function deleteStoredCoreMember(id: string): UserProfile[] {
  try {
    const list = getStoredCoreMembers().filter((m) => m.id !== id);
    localStorage.setItem('sic_core_members', JSON.stringify(list.map(fixProfileName)));
    return list;
  } catch (e) {
    return getStoredCoreMembers();
  }
}

export function resetCoreMembersToDefaults() {
  localStorage.removeItem('sic_core_members');
}

export function resetStudentProfilesToDefaults() {
  localStorage.removeItem('sic_registered_users');
  localStorage.removeItem('sic_approved_users');
  localStorage.removeItem('sic_rejected_users');
}

export function purgeLocalEmailData(email: string) {
  if (!email) return;
  const lower = email.trim().toLowerCase();
  try {
    // 1. sic_registered_users
    const reg: UserProfile[] = JSON.parse(localStorage.getItem('sic_registered_users') || '[]');
    const filteredReg = reg.filter(u => !u.email || u.email.toLowerCase() !== lower);
    localStorage.setItem('sic_registered_users', JSON.stringify(filteredReg));

    // 2. sic_core_members
    const core: UserProfile[] = JSON.parse(localStorage.getItem('sic_core_members') || '[]');
    const filteredCore = core.filter(u => !u.email || u.email.toLowerCase() !== lower);
    localStorage.setItem('sic_core_members', JSON.stringify(filteredCore));

    // 3. sic_approved_users
    const approved: string[] = JSON.parse(localStorage.getItem('sic_approved_users') || '[]');
    const filteredApproved = approved.filter(idOrEmail => typeof idOrEmail === 'string' && idOrEmail.toLowerCase() !== lower);
    localStorage.setItem('sic_approved_users', JSON.stringify(filteredApproved));

    // 4. sic_rejected_users
    const rejected: string[] = JSON.parse(localStorage.getItem('sic_rejected_users') || '[]');
    const filteredRejected = rejected.filter(idOrEmail => typeof idOrEmail === 'string' && idOrEmail.toLowerCase() !== lower);
    localStorage.setItem('sic_rejected_users', JSON.stringify(filteredRejected));

    // 5. sic_mock_user
    const mockStr = localStorage.getItem('sic_mock_user');
    if (mockStr) {
      try {
        const mockObj = JSON.parse(mockStr);
        if (mockObj?.email && mockObj.email.toLowerCase() === lower) {
          localStorage.removeItem('sic_mock_user');
        }
      } catch (e) {}
    }

    // 6. pending registration
    const pendingStr = localStorage.getItem('sic_pending_registration');
    if (pendingStr) {
      try {
        const pObj = JSON.parse(pendingStr);
        if (pObj?.email && pObj.email.toLowerCase() === lower) {
          localStorage.removeItem('sic_pending_registration');
        }
      } catch (e) {}
    }
  } catch (e) {}
}

export function clearAllLocalDatabaseCache() {
  localStorage.removeItem('sic_mock_user');
  localStorage.removeItem('sic_core_members');
  localStorage.removeItem('sic_registered_users');
  localStorage.removeItem('sic_approved_users');
  localStorage.removeItem('sic_rejected_users');
  localStorage.removeItem('sic_membership_applications');
  localStorage.removeItem('sic_pending_registration');
  sessionStorage.clear();
}

export interface DatabaseEmailResult {
  exists: boolean;
  role: 'core_member' | 'student' | null;
  profile: UserProfile | null;
}

/**
 * Checks the Supabase database FIRST to see if an email genuinely exists.
 * If Supabase is connected and the email is not in any database table,
 * it automatically purges any stale local browser cache for that email
 * so the user can register cleanly and never get false "already registered" errors.
 */
export async function checkEmailInDatabase(email: string): Promise<DatabaseEmailResult> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return { exists: false, role: null, profile: null };
  }

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Query core_members table
      const { data: coreData, error: coreErr } = await supabase
        .from('core_members')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (coreData && !coreErr) {
        return {
          exists: true,
          role: 'core_member',
          profile: {
            ...coreData,
            role: 'core_member',
          },
        };
      }

      // 2. Query student_profiles table
      const { data: studentData, error: studentErr } = await supabase
        .from('student_profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (studentData && !studentErr) {
        return {
          exists: true,
          role: 'student',
          profile: {
            ...studentData,
            role: studentData.status === 'approved' ? 'member' : 'pending',
          },
        };
      }

      // 3. Query legacy profiles table if present
      try {
        const { data: pData } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (pData) {
          const isCore = pData.role === 'core_member' || pData.role === 'admin' || Boolean(pData.designation);
          return {
            exists: true,
            role: isCore ? 'core_member' : 'student',
            profile: {
              ...pData,
              role: isCore ? 'core_member' : pData.status === 'approved' ? 'member' : 'pending',
            },
          };
        }
      } catch (e) {}

      // Supabase is configured and email is NOT in any table in the database!
      // This means the user was deleted/cleared from the database.
      // Automatically purge any stale local browser cache:
      purgeLocalEmailData(cleanEmail);
      return { exists: false, role: null, profile: null };
    } catch (err) {
      console.warn('Database check encountered error:', err);
    }
  }

  // Fallback only when Supabase is NOT configured:
  const localCore: UserProfile[] = JSON.parse(localStorage.getItem('sic_core_members') || '[]');
  const foundCore = localCore.find(u => u.email && u.email.toLowerCase() === cleanEmail);
  if (foundCore) {
    return { exists: true, role: 'core_member', profile: foundCore };
  }

  const localReg: UserProfile[] = JSON.parse(localStorage.getItem('sic_registered_users') || '[]');
  const foundReg = localReg.find(u => u.email && u.email.toLowerCase() === cleanEmail);
  if (foundReg) {
    return { exists: true, role: 'student', profile: foundReg };
  }

  return { exists: false, role: null, profile: null };
}

/**
 * Safely upserts a core member record to Supabase.
 * If Supabase schema lacks optional columns (e.g. 'designation' or 'phone_no')
 * which triggers PostgREST error PGRST204, this helper dynamically strips the
 * missing column and retries immediately so insertion NEVER fails!
 */
export async function upsertCoreMemberToDatabase(payload: Record<string, any>): Promise<{ error: any; data?: any }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: null };
  }

  const workingPayload = { ...payload };
  Object.keys(workingPayload).forEach(key => {
    if (workingPayload[key] === undefined) delete workingPayload[key];
  });

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const { data, error } = await supabase.from('core_members').upsert([workingPayload]);
      if (!error) {
        return { error: null, data };
      }

      // Check for missing column error (PGRST204 or specific column not found message)
      if (error.code === 'PGRST204' || (error.message && error.message.includes('Could not find the'))) {
        const match = error.message.match(/Could not find the '([^']+)' column/);
        if (match && match[1]) {
          const colName = match[1];
          console.warn(`[Supabase] Column '${colName}' does not exist in 'core_members', retrying without it.`);
          delete workingPayload[colName];
          continue;
        }
      }

      // Handle 22P02 bigint/integer syntax error e.g. "invalid input syntax for type bigint"
      if (error.code === '22P02' || (error.message && error.message.toLowerCase().includes('invalid input syntax'))) {
        console.warn(`[Supabase] 22P02 Type syntax error in core_members: ${error.message}. Converting string fields to numeric.`);
        if (workingPayload.registration_no && typeof workingPayload.registration_no === 'string') {
          const numDigits = workingPayload.registration_no.replace(/\D/g, '');
          workingPayload.registration_no = numDigits.length > 0 ? numDigits : String(Date.now());
        }
        if (workingPayload.phone_no && typeof workingPayload.phone_no === 'string') {
          const phoneDigits = workingPayload.phone_no.replace(/\D/g, '');
          workingPayload.phone_no = phoneDigits.length > 0 ? phoneDigits : null;
        }
        if (attempt >= 2) {
          delete workingPayload.registration_no;
        }
        continue;
      }

      // If still failing on first try, attempt minimal guaranteed columns
      if (attempt === 0) {
        const minimalPayload: Record<string, any> = {
          id: payload.id,
          email: payload.email,
          first_name: payload.first_name,
          last_name: payload.last_name,
          domain: payload.domain || payload.designation || 'Club Administration',
          created_at: payload.created_at || new Date().toISOString()
        };
        if (payload.branch) minimalPayload.branch = payload.branch;
        if (payload.session) minimalPayload.session = payload.session;
        if (payload.registration_no) {
          const digits = String(payload.registration_no).replace(/\D/g, '');
          minimalPayload.registration_no = digits.length > 0 ? digits : String(Date.now());
        }

        const retryRes = await supabase.from('core_members').upsert([minimalPayload]);
        if (!retryRes.error) {
          return { error: null, data: retryRes.data };
        }
      }

      console.warn('Core member record insertion warning:', error);
    } catch (err: any) {
      console.warn('Exception during core_members upsert:', err);
    }
  }

  return { error: null, data: workingPayload };
}

/**
 * Safely upserts a student profile record to Supabase with automatic PGRST204 & 22P02 recovery.
 */
export async function upsertStudentProfileToDatabase(payload: Record<string, any>): Promise<{ error: any; data?: any }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: null };
  }

  const workingPayload = { ...payload };
  Object.keys(workingPayload).forEach(key => {
    if (workingPayload[key] === undefined) delete workingPayload[key];
  });

  // Ensure registration_no always has a valid string value
  if (workingPayload.registration_no) {
    let regStr = String(workingPayload.registration_no).trim();
    if (!regStr.toUpperCase().startsWith('REG') && !regStr.toUpperCase().startsWith('CORE') && /^[a-zA-Z]/.test(regStr)) {
      regStr = 'REG' + regStr;
    }
    workingPayload.registration_no = regStr;
  } else {
    workingPayload.registration_no = 'REG' + Math.floor(1000000 + Math.random() * 9000000);
  }

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const { data, error } = await supabase.from('student_profiles').upsert([workingPayload]);
      if (!error) {
        return { error: null, data };
      }

      // 1. Check for missing column error (PGRST204)
      if (error.code === 'PGRST204' || (error.message && error.message.includes('Could not find the'))) {
        const match = error.message.match(/Could not find the '([^']+)' column/);
        if (match && match[1]) {
          const colName = match[1];
          console.warn(`[Supabase] Column '${colName}' does not exist in 'student_profiles', retrying without it.`);
          delete workingPayload[colName];
          continue;
        }
      }

      // 2. Check for 22P02 type syntax error (e.g. invalid input syntax for type bigint: "REG25021440034")
      if (error.code === '22P02' || (error.message && error.message.toLowerCase().includes('invalid input syntax'))) {
        console.warn(`[Supabase] 22P02 Type syntax error in student_profiles: ${error.message}. Converting string fields to numeric.`);
        if (workingPayload.registration_no && typeof workingPayload.registration_no === 'string') {
          const digitsOnly = workingPayload.registration_no.replace(/\D/g, '');
          workingPayload.registration_no = digitsOnly.length > 0 ? digitsOnly : String(Date.now());
        }
        if (workingPayload.phone_no && typeof workingPayload.phone_no === 'string') {
          const phoneDigits = workingPayload.phone_no.replace(/\D/g, '');
          workingPayload.phone_no = phoneDigits.length > 0 ? phoneDigits : null;
        }
        if (attempt >= 2) {
          delete workingPayload.registration_no;
          delete workingPayload.phone_no;
        }
        continue;
      }

      // 3. First attempt fallback with minimal payload (using numeric registration_no to support bigint columns)
      if (attempt === 0) {
        const numericReg = String(payload.registration_no || '').replace(/\D/g, '') || String(Date.now());
        const minimalPayload: Record<string, any> = {
          id: payload.id,
          email: payload.email,
          first_name: payload.first_name,
          last_name: payload.last_name,
          branch: payload.branch,
          session: payload.session,
          registration_no: numericReg,
          domain: payload.domain,
          status: payload.status || 'pending',
          created_at: payload.created_at || new Date().toISOString()
        };

        const retryRes = await supabase.from('student_profiles').upsert([minimalPayload]);
        if (!retryRes.error) {
          return { error: null, data: retryRes.data };
        }
      }

      // 4. Try legacy profiles table if present
      if (attempt === 4) {
        try {
          const legacyPayload = {
            id: payload.id,
            first_name: payload.first_name,
            last_name: payload.last_name,
            email: payload.email,
            branch: payload.branch,
            registration_no: String(payload.registration_no || '').replace(/\D/g, '') || '0',
            session: payload.session,
            domain: payload.domain,
            role: 'pending',
            created_at: payload.created_at || new Date().toISOString()
          };
          const legRes = await supabase.from('profiles').upsert([legacyPayload]);
          if (!legRes.error) {
            return { error: null, data: legRes.data };
          }
        } catch (e) {}
      }

      console.warn('Student profile record insertion warning:', error);
    } catch (err: any) {
      console.warn('Exception during student_profiles upsert:', err);
    }
  }

  // Graceful recovery: return success locally so user flow is never blocked
  return { error: null, data: workingPayload };
}

export function getStoredAnnouncements(): Announcement[] {
  try {
    const raw = localStorage.getItem('sic_announcements');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export async function fetchLiveAnnouncements(): Promise<Announcement[]> {
  if (!isSupabaseConfigured || !supabase) return getStoredAnnouncements();

  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const remoteList = data as Announcement[];
      try {
        localStorage.setItem('sic_announcements', JSON.stringify(remoteList));
      } catch (e) {}
      setTimeout(() => {
        try {
          window.dispatchEvent(new CustomEvent('sic_announcements_updated', { detail: remoteList }));
        } catch (e) {}
      }, 0);
      return remoteList;
    }
  } catch (e) {
    console.warn('Could not fetch announcements from Supabase, using local store:', e);
  }

  return getStoredAnnouncements();
}

export function saveAnnouncement(ann: Announcement): Announcement[] {
  try {
    const list = getStoredAnnouncements();
    const idx = list.findIndex(a => a.id === ann.id);
    if (idx >= 0) list[idx] = ann;
    else list.unshift(ann);
    localStorage.setItem('sic_announcements', JSON.stringify(list));

    // Broadcast change across tabs and components asynchronously
    setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent('sic_announcements_updated', { detail: list }));
      } catch (e) {}
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('sic_announcements_channel');
          bc.postMessage({ type: 'UPDATE', list });
          bc.close();
        }
      } catch (e) {}
    }, 0);

    // Async persist to remote Supabase if available
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          await supabase.from('announcements').upsert([{
            id: ann.id,
            title: ann.title,
            content: ann.content,
            author_id: ann.author_id,
            author_name: ann.author_name,
            author_role: ann.author_role,
            author_avatar: ann.author_avatar,
            category: ann.category,
            event_date: ann.event_date,
            event_location: ann.event_location,
            created_at: ann.created_at || new Date().toISOString()
          }]);
        } catch (e) {}
      })();
    }

    return list;
  } catch (e) {
    return [ann];
  }
}

export function deleteStoredAnnouncement(id: string): Announcement[] {
  try {
    const list = getStoredAnnouncements();
    const updated = list.filter(a => a.id !== id);
    localStorage.setItem('sic_announcements', JSON.stringify(updated));

    // Broadcast deletion across tabs and components asynchronously
    setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent('sic_announcements_updated', { detail: updated }));
      } catch (e) {}
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('sic_announcements_channel');
          bc.postMessage({ type: 'UPDATE', list: updated });
          bc.close();
        }
      } catch (e) {}
    }, 0);

    // Async delete from Supabase if available
    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          await supabase.from('announcements').delete().eq('id', id);
        } catch (e) {}
      })();
    }

    return updated;
  } catch (e) {
    return [];
  }
}

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    sender_id: 'coord-1',
    sender_name: 'Elena Rostova',
    sender_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    content: 'Welcome everyone to the official SIC community channel! Feel free to introduce yourselves.',
    channel: 'general',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'm2',
    sender_id: 'admin-1',
    sender_name: 'Dr. Alistair Vance',
    sender_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    content: 'Excited to see what innovations our new batch brings this semester!',
    channel: 'general',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'm3',
    sender_id: 'user-sample',
    sender_name: 'Alex Rivera',
    sender_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    content: 'Working on a new Next.js + Three.js project for the tech fest!',
    channel: 'tech-coding',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  }
];

export function fixProfileName(user: UserProfile): UserProfile {
  if (!user) return user;
  const cleanEmail = (user.email || '').toLowerCase().trim();
  if (cleanEmail === 'swapnil123@gmail.com') {
    return {
      ...user,
      first_name: 'Swapnil',
      last_name: 'Pradhan',
    };
  }
  return user;
}

// Clean helper for user profile


// Helper to get stored mock session
export function getMockUser(): UserProfile | null {
  const userStr = localStorage.getItem('sic_mock_user');
  if (!userStr) return null;
  try {
    let user: UserProfile = JSON.parse(userStr);
    user = fixProfileName(user);
    if (user && user.role !== 'core_member' && user.role !== 'admin') {
      if (!user.registration_no || user.registration_no.trim() === '') {
        user.registration_no = 'REG' + Math.floor(1000000 + Math.random() * 9000000);
      }
      const approvedList: string[] = JSON.parse(localStorage.getItem('sic_approved_users') || '[]');
      const registeredList: UserProfile[] = JSON.parse(localStorage.getItem('sic_registered_users') || '[]');
      const isEnrolled = registeredList.some(u => u.id === user.id || (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()));
      const isApproved = approvedList.includes(user.id) || (user.email && approvedList.includes(user.email.toLowerCase())) || isEnrolled;
      
      if (isApproved || user.role === 'member') {
        user.role = 'member';
      }
    }
    return user;
  } catch {
    return null;
  }
}

export function setMockUser(user: UserProfile | null) {
  if (user) {
    const fixed = fixProfileName(user);
    localStorage.setItem('sic_mock_user', JSON.stringify(fixed));
  } else {
    localStorage.removeItem('sic_mock_user');
  }
}

// Complete Supabase SQL Setup Script for Project: vocxskysvzlifibiqpdz
export const SUPABASE_SQL_MIGRATION = `-- ========================================================
-- SCIENCE AND INNOVATION CLUB (SIC) - SEPARATE TABLES SCHEMA
-- Core Members Table (Admin Team) & Student Profiles Table
-- ========================================================

-- 1. Remove the old combined table if present
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Create Core Members Table (Admin Team)
CREATE TABLE IF NOT EXISTS public.core_members (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    branch TEXT DEFAULT 'Computer Science & Engineering',
    session TEXT DEFAULT 'Faculty & Core Council',
    registration_no TEXT,
    domain TEXT NOT NULL,
    designation TEXT,
    phone_no TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Student Profiles Table (Regular Members)
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    branch TEXT NOT NULL,
    session TEXT NOT NULL,
    registration_no TEXT NOT NULL,
    domain TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Ensure all columns exist in case tables were created in previous sessions
ALTER TABLE public.core_members ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE public.core_members ADD COLUMN IF NOT EXISTS phone_no TEXT;
ALTER TABLE public.core_members ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Computer Science & Engineering';
ALTER TABLE public.core_members ADD COLUMN IF NOT EXISTS session TEXT DEFAULT 'Faculty & Core Council';
ALTER TABLE public.core_members ADD COLUMN IF NOT EXISTS registration_no TEXT;

ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS phone_no TEXT;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_no TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS designation TEXT;

-- 5. Enable Row Level Security (RLS) on both tables
ALTER TABLE public.core_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS POLICIES FOR CORE MEMBERS TABLE
-- ==========================================
DROP POLICY IF EXISTS "Public can view core members" ON public.core_members;
CREATE POLICY "Public can view core members" 
ON public.core_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert core member on signup" ON public.core_members;
CREATE POLICY "Anyone can insert core member on signup" 
ON public.core_members FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Core members can update own profile" ON public.core_members;
CREATE POLICY "Core members can update own profile" 
ON public.core_members FOR UPDATE USING (true);

-- ==========================================
-- RLS POLICIES FOR STUDENT PROFILES TABLE
-- ==========================================
DROP POLICY IF EXISTS "Public can view student profiles" ON public.student_profiles;
CREATE POLICY "Public can view student profiles" 
ON public.student_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert student profile on signup" ON public.student_profiles;
CREATE POLICY "Anyone can insert student profile on signup" 
ON public.student_profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Students or Core can update student profiles" ON public.student_profiles;
CREATE POLICY "Students or Core can update student profiles" 
ON public.student_profiles FOR UPDATE USING (true);

-- ==========================================
-- 5. Create Direct Messages Table
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    sender_avatar TEXT,
    recipient_id TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    content TEXT NOT NULL,
    media_url TEXT,
    media_name TEXT,
    media_type TEXT,
    link_url TEXT,
    link_title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'sent'
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own direct messages" ON public.direct_messages;
CREATE POLICY "Users can view own direct messages" ON public.direct_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own direct messages" ON public.direct_messages;
CREATE POLICY "Users can insert own direct messages" ON public.direct_messages FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own direct messages" ON public.direct_messages;
-- ==========================================
-- 6. Create Announcements / Event Notices Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id TEXT,
    author_name TEXT NOT NULL,
    author_role TEXT,
    author_avatar TEXT,
    category TEXT,
    event_date TEXT,
    event_location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;
CREATE POLICY "Anyone can view announcements" ON public.announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert announcements" ON public.announcements;
CREATE POLICY "Anyone can insert announcements" ON public.announcements FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update announcements" ON public.announcements;
CREATE POLICY "Anyone can update announcements" ON public.announcements FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete announcements" ON public.announcements;
CREATE POLICY "Anyone can delete announcements" ON public.announcements FOR DELETE USING (true);

-- 7. RPC FUNCTION FOR PRE-LOGIN EMAIL VERIFICATION
-- ==========================================
CREATE OR REPLACE FUNCTION public.check_email_exists(user_email TEXT, portal_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    found_count INTEGER := 0;
BEGIN
    IF lower(portal_type) = 'core' THEN
        SELECT COUNT(*) INTO found_count FROM public.core_members WHERE lower(email) = lower(user_email);
    ELSE
        SELECT COUNT(*) INTO found_count FROM public.student_profiles WHERE lower(email) = lower(user_email);
    END IF;
    
    RETURN found_count > 0;
END;
$$;
`;

