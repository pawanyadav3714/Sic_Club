import { UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

export interface DirectMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'core_member' | 'student';
  sender_avatar?: string;
  recipient_id: string;
  recipient_name: string;
  content: string;
  media_url?: string;
  media_name?: string;
  media_type?: 'image' | 'document' | 'video' | 'audio';
  link_url?: string;
  link_title?: string;
  created_at: string;
  status?: 'sent' | 'delivered' | 'read';
}

const PRESENCE_KEY = 'sic_users_presence_map';

export function markUserPresence(userIdOrEmail?: string) {
  if (!userIdOrEmail) return;
  const key = String(userIdOrEmail).toLowerCase().trim();
  try {
    const raw = localStorage.getItem(PRESENCE_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    map[key] = Date.now();
    localStorage.setItem(PRESENCE_KEY, JSON.stringify(map));
  } catch (e) {}
}

export function isUserOnline(userIdOrEmail?: string): boolean {
  if (!userIdOrEmail) return false;
  const key = String(userIdOrEmail).toLowerCase().trim();
  try {
    const raw = localStorage.getItem(PRESENCE_KEY);
    if (!raw) return false;
    const map: Record<string, number> = JSON.parse(raw);
    const lastActive = map[key];
    if (!lastActive) return false;
    return Date.now() - lastActive < 45000;
  } catch (e) {
    return false;
  }
}

const LOCAL_MSGS_KEY = 'sic_direct_messages_store';

function getLocalStoredMessages(): DirectMessage[] {
  try {
    const raw = localStorage.getItem(LOCAL_MSGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalStoredMessage(msg: DirectMessage) {
  try {
    const list = getLocalStoredMessages();
    const idx = list.findIndex((m) => m.id === msg.id);
    if (idx >= 0) {
      list[idx] = msg;
    } else {
      list.push(msg);
    }
    localStorage.setItem(LOCAL_MSGS_KEY, JSON.stringify(list));

    // Also update dedicated conversation cache
    const sId = String(msg.sender_id || '').toLowerCase().trim();
    const rId = String(msg.recipient_id || '').toLowerCase().trim();
    const pairKey = [sId, rId].sort().join('_');
    const convRaw = localStorage.getItem(`sic_chat_conv_${pairKey}`);
    const convList: DirectMessage[] = convRaw ? JSON.parse(convRaw) : [];
    const cIdx = convList.findIndex((m) => m.id === msg.id);
    if (cIdx >= 0) {
      convList[cIdx] = msg;
    } else {
      convList.push(msg);
    }
    convList.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    localStorage.setItem(`sic_chat_conv_${pairKey}`, JSON.stringify(convList));
  } catch (e) {}
}

export function broadcastChatMessage(msg: DirectMessage) {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('sic_direct_chat_channel');
      bc.postMessage(msg);
      bc.close();
    }
  } catch (e) {}
  try {
    window.dispatchEvent(new CustomEvent('sic_new_direct_message', { detail: msg }));
  } catch (e) {}
}

export function getConversationKey(u1: string, u2: string): string {
  const p1 = String(u1 || '').toLowerCase().trim();
  const p2 = String(u2 || '').toLowerCase().trim();
  return [p1, p2].sort().join('_');
}

export function getLocalDirectMessagesBetween(
  user1Id: string,
  user2Id: string,
  user1Email?: string,
  user2Email?: string
): DirectMessage[] {
  const u1 = String(user1Id || '').toLowerCase().trim();
  const u2 = String(user2Id || '').toLowerCase().trim();
  const e1 = String(user1Email || '').toLowerCase().trim();
  const e2 = String(user2Email || '').toLowerCase().trim();

  // 1. Try dedicated conversation cache first (instant O(1) response)
  const pairKey = getConversationKey(u1, u2);
  try {
    const raw = localStorage.getItem(`sic_chat_conv_${pairKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}

  // Also try email pair key if different
  if (e1 || e2) {
    const emailPairKey = getConversationKey(e1 || u1, e2 || u2);
    try {
      const raw = localStorage.getItem(`sic_chat_conv_${emailPairKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
  }

  // 2. Fall back to scanning the global local messages store
  const all = getLocalStoredMessages();
  const isMatch = (msg: DirectMessage) => {
    const sId = String(msg.sender_id || '').toLowerCase().trim();
    const rId = String(msg.recipient_id || '').toLowerCase().trim();

    const fromU1 = sId === u1 || (e1 && sId === e1);
    const toU2 = rId === u2 || (e2 && rId === e2);
    const fromU2 = sId === u2 || (e2 && sId === e2);
    const toU1 = rId === u1 || (e1 && rId === e1);

    return (fromU1 && toU2) || (fromU2 && toU1);
  };

  const filtered = all.filter(isMatch);
  filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (filtered.length > 0) {
    try {
      localStorage.setItem(`sic_chat_conv_${pairKey}`, JSON.stringify(filtered));
    } catch (e) {}
  }

  return filtered;
}

export function getLocalLastMessagesMap(userId: string, userEmail?: string): Record<string, DirectMessage> {
  const uId = String(userId || '').toLowerCase().trim();
  const uEmail = String(userEmail || '').toLowerCase().trim();
  const map: Record<string, DirectMessage> = {};

  const all = getLocalStoredMessages();
  for (const m of all) {
    const sId = String(m.sender_id || '').toLowerCase().trim();
    const rId = String(m.recipient_id || '').toLowerCase().trim();

    const other = (sId === uId || (uEmail && sId === uEmail)) ? rId : ((rId === uId || (uEmail && rId === uEmail)) ? sId : null);
    if (other) {
      const curr = map[other];
      if (!curr || new Date(m.created_at).getTime() > new Date(curr.created_at).getTime()) {
        map[other] = m;
      }
    }
  }

  return map;
}

export async function getAllLastMessagesForUser(userId: string, userEmail?: string): Promise<Record<string, DirectMessage>> {
  // Start with local storage cache immediately
  const map = getLocalLastMessagesMap(userId, userEmail);

  if (!isSupabaseConfigured || !supabase) return map;

  const uId = String(userId || '').toLowerCase().trim();
  const uEmail = String(userEmail || '').toLowerCase().trim();

  try {
    const orFilter = uEmail 
      ? `sender_id.eq.${uId},recipient_id.eq.${uId},sender_id.eq.${uEmail},recipient_id.eq.${uEmail}`
      : `sender_id.eq.${uId},recipient_id.eq.${uId}`;

    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(orFilter)
      .order('created_at', { ascending: false })
      .limit(300);

    if (!error && data && Array.isArray(data)) {
      for (const m of data as DirectMessage[]) {
        saveLocalStoredMessage(m);
        const sId = String(m.sender_id || '').toLowerCase().trim();
        const rId = String(m.recipient_id || '').toLowerCase().trim();

        const other = (sId === uId || (uEmail && sId === uEmail)) ? rId : ((rId === uId || (uEmail && rId === uEmail)) ? sId : null);
        if (other) {
          const curr = map[other];
          if (!curr || new Date(m.created_at).getTime() > new Date(curr.created_at).getTime()) {
            map[other] = m;
          }
        }
      }
    }
  } catch (e) {
    console.warn('Background last messages fetch error:', e);
  }

  return map;
}

export async function getAllDirectMessages(): Promise<DirectMessage[]> {
  const local = getLocalStoredMessages();
  if (!isSupabaseConfigured || !supabase) return local;
  try {
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) {
      // Sync local cache
      data.forEach((m: DirectMessage) => saveLocalStoredMessage(m));
      return data as DirectMessage[];
    }
  } catch (e: any) {
    console.warn('Failed to fetch messages from remote, using local:', e.message || e);
  }
  return local;
}

export async function getDirectMessagesBetween(
  user1Id: string,
  user2Id: string,
  user1Email?: string,
  user2Email?: string
): Promise<DirectMessage[]> {
  const u1 = String(user1Id || '').toLowerCase().trim();
  const u2 = String(user2Id || '').toLowerCase().trim();
  const e1 = String(user1Email || '').toLowerCase().trim();
  const e2 = String(user2Email || '').toLowerCase().trim();

  // Instant local messages
  const localMessages = getLocalDirectMessagesBetween(user1Id, user2Id, user1Email, user2Email);
  let remoteMessages: DirectMessage[] = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const orConditions = [
        `and(sender_id.eq.${u1},recipient_id.eq.${u2})`,
        `and(sender_id.eq.${u2},recipient_id.eq.${u1})`
      ];
      if (e1 && e2) {
        orConditions.push(`and(sender_id.eq.${e1},recipient_id.eq.${e2})`);
        orConditions.push(`and(sender_id.eq.${e2},recipient_id.eq.${e1})`);
      }
      if (e1 && !e2) {
        orConditions.push(`and(sender_id.eq.${e1},recipient_id.eq.${u2})`);
        orConditions.push(`and(sender_id.eq.${u2},recipient_id.eq.${e1})`);
      }
      if (!e1 && e2) {
        orConditions.push(`and(sender_id.eq.${u1},recipient_id.eq.${e2})`);
        orConditions.push(`and(sender_id.eq.${e2},recipient_id.eq.${u1})`);
      }

      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(orConditions.join(','))
        .order('created_at', { ascending: true });

      if (!error && data) {
        remoteMessages = data as DirectMessage[];
      }
    } catch (e: any) {
      console.warn('Failed to fetch messages between users from remote:', e.message || e);
    }
  }

  const combinedMap = new Map<string, DirectMessage>();
  localMessages.forEach((m) => combinedMap.set(m.id, m));
  remoteMessages.forEach((m) => {
    combinedMap.set(m.id, m);
    saveLocalStoredMessage(m);
  });

  const all = Array.from(combinedMap.values());
  all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Save to per-conversation cache
  const pairKey = getConversationKey(u1, u2);
  try {
    localStorage.setItem(`sic_chat_conv_${pairKey}`, JSON.stringify(all));
  } catch (e) {}

  return all;
}

export async function saveDirectMessage(msg: Omit<DirectMessage, 'id' | 'created_at'>): Promise<DirectMessage> {
  const recipientOnline = isUserOnline(msg.recipient_id);
  const newMsg: DirectMessage = {
    ...msg,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    status: recipientOnline ? 'delivered' : 'sent',
  };

  // Immediate local save & broadcast for zero-latency UI
  saveLocalStoredMessage(newMsg);
  broadcastChatMessage(newMsg);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('direct_messages').insert([newMsg]).select().single();
      if (!error && data) {
        saveLocalStoredMessage(data);
        return data as DirectMessage;
      }
    } catch (e) {
      console.warn('Remote save failed, message persisted in local store:', e);
    }
  }

  return newMsg;
}

export async function markMessagesAsDelivered(userIdOrEmail?: string) {
  if (!userIdOrEmail) return;
  const target = String(userIdOrEmail).toLowerCase().trim();
  markUserPresence(target);

  // Update local cache
  const local = getLocalStoredMessages();
  let changed = false;
  local.forEach((m) => {
    if (m.recipient_id.toLowerCase().trim() === target && m.status === 'sent') {
      m.status = 'delivered';
      changed = true;
    }
  });
  if (changed) {
    try {
      localStorage.setItem(LOCAL_MSGS_KEY, JSON.stringify(local));
    } catch (e) {}
  }

  if (!isSupabaseConfigured || !supabase) return;

  try {
    await supabase
      .from('direct_messages')
      .update({ status: 'delivered' })
      .eq('recipient_id', target)
      .eq('status', 'sent');
  } catch (e) {
    console.warn('Failed to update delivery status', e);
  }
}

export async function markMessagesAsRead(currentUserIdOrEmail?: string, peerIdOrEmail?: string) {
  if (!currentUserIdOrEmail || !peerIdOrEmail) return;
  const cId = String(currentUserIdOrEmail).toLowerCase().trim();
  const pId = String(peerIdOrEmail).toLowerCase().trim();

  markUserPresence(cId);

  // Update local cache
  const local = getLocalStoredMessages();
  let changed = false;
  local.forEach((m) => {
    const s = m.sender_id.toLowerCase().trim();
    const r = m.recipient_id.toLowerCase().trim();
    if (s === pId && r === cId && m.status !== 'read') {
      m.status = 'read';
      changed = true;
    }
  });
  if (changed) {
    try {
      localStorage.setItem(LOCAL_MSGS_KEY, JSON.stringify(local));
    } catch (e) {}
  }

  if (!isSupabaseConfigured || !supabase) return;

  try {
    await supabase
      .from('direct_messages')
      .update({ status: 'read' })
      .eq('sender_id', pId)
      .eq('recipient_id', cId)
      .neq('status', 'read');
  } catch (e) {
    console.warn('Failed to update read status', e);
  }
}

export async function getLastMessageWith(user1Id: string, user2Id: string): Promise<DirectMessage | null> {
  const msgs = await getDirectMessagesBetween(user1Id, user2Id);
  return msgs.length > 0 ? msgs[msgs.length - 1] : null;
}

