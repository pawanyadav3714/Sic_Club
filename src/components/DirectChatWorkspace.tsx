import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, MembershipApplication } from '../types';
import {
  DirectMessage,
  getDirectMessagesBetween,
  getLocalDirectMessagesBetween,
  saveDirectMessage,
  getLastMessageWith,
  getAllLastMessagesForUser,
  getLocalLastMessagesMap,
  markMessagesAsDelivered,
  markMessagesAsRead,
  markUserPresence,
} from '../lib/chatStore';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Link as LinkIcon,
  Search,
  Check,
  CheckCheck,
  UserCheck,
  Crown,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Phone,
  MessageCircle,
  Smile,
  Users,
  CheckCircle2,
  UserX,
  ArrowLeft,
  MoreVertical,
  Video,
  Sparkles,
  X,
  Camera,
  Mic,
  Trash2,
  Pause,
  AlertCircle,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  Plus,
  Play,
  Square,
  Volume2,
  ChevronDown
} from 'lucide-react';
import { supabase, isSupabaseConfigured, fixProfileName } from '../lib/supabase';

interface DirectChatWorkspaceProps {
  currentUser: UserProfile;
  studentMembers: UserProfile[];
  coreCouncilList: UserProfile[];
  pendingApps?: MembershipApplication[];
  onApproveStudent?: (id: string, name: string) => void;
  onDeclineStudent?: (id: string, name: string) => void;
  isCoreUser?: boolean;
}

export default function DirectChatWorkspace({
  currentUser,
  studentMembers,
  coreCouncilList,
  pendingApps = [],
  onApproveStudent,
  onDeclineStudent,
  isCoreUser = true,
}: DirectChatWorkspaceProps) {
  // Category filter: 'all' | 'students' | 'core' | 'pending'
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'students' | 'core' | 'pending'>('all');

  // Search input
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Live member states
  const [liveCoreMembers, setLiveCoreMembers] = useState<UserProfile[]>(coreCouncilList || []);
  const [liveStudentMembers, setLiveStudentMembers] = useState<UserProfile[]>(studentMembers || []);

  const refreshLiveUsers = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data: cData, error: cErr } = await supabase.from('core_members').select('*').order('created_at', { ascending: false });
      if (!cErr && cData) {
        const fixedCore = cData.map(c => fixProfileName({ ...c, role: 'core_member' as const }));
        setLiveCoreMembers(fixedCore);
        try {
          localStorage.setItem('sic_core_members', JSON.stringify(fixedCore));
        } catch (e) {}
      }
      const { data: sData, error: sErr } = await supabase.from('student_profiles').select('*').order('created_at', { ascending: false });
      if (!sErr && sData) {
        const fixedStudents = sData.map(s => fixProfileName({
          ...s,
          role: s.status === 'rejected' ? ('rejected' as const) : ('member' as const)
        }));
        setLiveStudentMembers(fixedStudents);
        try {
          localStorage.setItem('sic_registered_users', JSON.stringify(fixedStudents));
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Realtime fetch error in chat workspace:', e);
    }
  };

  useEffect(() => {
    if (coreCouncilList && coreCouncilList.length > 0) {
      setLiveCoreMembers(coreCouncilList);
    }
  }, [coreCouncilList]);

  useEffect(() => {
    if (studentMembers && studentMembers.length > 0) {
      setLiveStudentMembers(studentMembers);
    }
  }, [studentMembers]);

  // Initial fetch and Realtime Subscription to Supabase DB tables
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    refreshLiveUsers();

    const channel = supabase
      .channel('chat-users-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'core_members' }, () => {
        refreshLiveUsers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_profiles' }, () => {
        refreshLiveUsers();
      })
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, []);

  // Combine live members strictly deduplicated and excluding the logged-in user
  const allAvailableContacts = React.useMemo(() => {
    const list: UserProfile[] = [];
    const seen = new Set<string>();

    const currentEmail = String(currentUser?.email || '').toLowerCase().trim();
    const currentId = String(currentUser?.id || '').toLowerCase().trim();
    const currentReg = String(currentUser?.registration_no || '').toLowerCase().trim();
    const currentFullName = `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.toLowerCase().trim();

    const addUnique = (u: UserProfile) => {
      if (!u) return;
      const uEmail = String(u.email || '').toLowerCase().trim();
      const uId = String(u.id || '').toLowerCase().trim();
      const uReg = String(u.registration_no || '').toLowerCase().trim();
      const uFullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().trim();

      // NEVER include the logged-in user in their own chat contact list
      if (
        (currentEmail && uEmail && currentEmail === uEmail) ||
        (currentId && uId && currentId === uId) ||
        (currentReg && uReg && currentReg === uReg) ||
        (currentFullName && uFullName && currentFullName === uFullName)
      ) {
        return;
      }

      // Filter out any legacy or irrelevant example users
      if (
        uFullName.includes('whitman') ||
        uFullName.includes('jane pearson') ||
        uFullName.includes('thomas stewart') ||
        uFullName.includes('francis whitman') ||
        uEmail.includes('whitman') ||
        uEmail.includes('pearson') ||
        uEmail.includes('stewart')
      ) {
        return;
      }

      // Deduplication keys
      if (uId && seen.has(`id:${uId}`)) return;
      if (uEmail && seen.has(`email:${uEmail}`)) return;
      if (uReg && seen.has(`reg:${uReg}`)) return;
      if (uFullName && seen.has(`name:${uFullName}`)) return;

      if (uId) seen.add(`id:${uId}`);
      if (uEmail) seen.add(`email:${uEmail}`);
      if (uReg) seen.add(`reg:${uReg}`);
      if (uFullName) seen.add(`name:${uFullName}`);

      list.push(u);
    };

    liveStudentMembers.forEach(addUnique);
    liveCoreMembers.forEach(addUnique);

    return list;
  }, [liveStudentMembers, liveCoreMembers, currentUser]);

  // Active peer & Mobile view toggle ('list' | 'chat')
  const [activePeer, setActivePeer] = useState<UserProfile | null>(() => allAvailableContacts[0] || null);

  // If activePeer was deleted from database, deselect them immediately
  useEffect(() => {
    if (activePeer) {
      const stillExists = allAvailableContacts.some(
        c => c.id === activePeer.id || (c.email && activePeer.email && c.email.toLowerCase() === activePeer.email.toLowerCase())
      );
      if (!stillExists) {
        setActivePeer(allAvailableContacts[0] || null);
        setChatMessages([]);
      }
    } else if (allAvailableContacts.length > 0 && !activePeer) {
      setActivePeer(allAvailableContacts[0]);
    }
  }, [allAvailableContacts, activePeer]);
  const [mobileViewMode, setMobileViewMode] = useState<'list' | 'chat'>('list');

  // Message Form States
  const [messageText, setMessageText] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<{
    url: string;
    name: string;
    type: 'image' | 'document' | 'voice';
  } | null>(null);

  // Link & Attachment Tray Modals
  const [showAttachmentTray, setShowAttachmentTray] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState('');
  const [linkTitleInput, setLinkTitleInput] = useState('');

  // Emoji Picker toggle
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Real Voice Note Recording & Sound Frequency Visualizer State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [frequencyBars, setFrequencyBars] = useState<number[]>(() => new Array(18).fill(16));
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [isHoldRecording, setIsHoldRecording] = useState(false);

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPlaybackProgress, setAudioPlaybackProgress] = useState<{ id: string; current: number; duration: number } | null>(null);
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null);

  // Audio Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const holdTimerRef = useRef<any>(null);
  const isPressingMicRef = useRef<boolean>(false);
  const pointerDownTimeRef = useRef<number>(0);
  const isHoldRecordingRef = useRef<boolean>(false);

  // Cleanup helper for recording
  const cleanupAudioRecording = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    setIsRecordingVoice(false);
    setIsHoldRecording(false);
    setRecordingSeconds(0);
    isHoldRecordingRef.current = false;
    setFrequencyBars(new Array(18).fill(16));
  };

  // Start real microphone recording with live frequency analysis
  const startRecording = async (isHold = false) => {
    try {
      setMicPermissionError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicPermissionError('Microphone audio recording is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      recordedChunksRef.current = [];

      // Initialize Web Audio Context and AnalyserNode for live sound frequency animation
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        try {
          const audioCtx = new AudioCtxClass();
          audioContextRef.current = audioCtx;
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }

          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64; // Generates 32 frequency bins
          analyser.smoothingTimeConstant = 0.65;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateWaveform = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            const bars: number[] = [];
            for (let i = 0; i < 18; i++) {
              const binIndex = Math.min(dataArray.length - 1, Math.floor((i / 18) * dataArray.length));
              const val = dataArray[binIndex] || 0;
              // Map 0-255 volume to 16% to 100% height
              const pct = Math.max(16, Math.min(100, Math.round((val / 255) * 100)));
              bars.push(pct);
            }
            setFrequencyBars(bars);
            animFrameRef.current = requestAnimationFrame(updateWaveform);
          };
          animFrameRef.current = requestAnimationFrame(updateWaveform);
        } catch (audioCtxErr) {
          console.warn('AudioContext visualization warning:', audioCtxErr);
        }
      }

      // Initialize MediaRecorder
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      isHoldRecordingRef.current = isHold;
      setIsHoldRecording(isHold);
      setIsRecordingVoice(true);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermissionError('Microphone permission was denied. Please allow microphone access in your browser to record voice notes.');
      } else {
        setMicPermissionError('Could not access microphone. Please check your mic connection.');
      }
      cleanupAudioRecording();
    }
  };

  // Stop recording and transmit the audio message
  const stopAndSendRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      cleanupAudioRecording();
      return;
    }

    const durationSec = Math.max(1, recordingSeconds);

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        const mime = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(recordedChunksRef.current, { type: mime });

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          if (!currentUser || !activePeer) {
            cleanupAudioRecording();
            resolve();
            return;
          }

          const isCore = currentUser.role === 'core_member' || currentUser.role === 'admin';
          const fileName = `Voice_Note_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.webm`;

          const saved = await saveDirectMessage({
            sender_id: currentUser.id,
            sender_name: `${currentUser.first_name} ${currentUser.last_name}`.trim(),
            sender_role: isCore ? 'core_member' : 'student',
            sender_avatar: currentUser.avatar_url,
            recipient_id: activePeer.id,
            recipient_name: `${activePeer.first_name} ${activePeer.last_name}`.trim(),
            content: `🎙️ Voice Note (${durationSec}s)`,
            media_url: base64Audio,
            media_name: fileName,
            media_type: 'audio',
          });

          cleanupAudioRecording();
          if (saved) {
            setChatMessages((prev) => {
              if (prev.some((m) => m.id === saved.id)) return prev;
              return [...prev, saved];
            });
            setLastMessages((prev) => ({
              ...prev,
              [activePeer.id]: saved,
            }));
            isNearBottomRef.current = true;
            setShowScrollBottomBtn(false);
            setTimeout(() => scrollToBottom('smooth'), 50);
          }
          resolve();
        };
        reader.readAsDataURL(audioBlob);
      };

      try {
        recorder.stop();
      } catch (e) {
        cleanupAudioRecording();
        resolve();
      }
    });
  };

  // Cancel and discard recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    cleanupAudioRecording();
  };

  // Audio Playback Toggle
  const togglePlayAudio = (msgId: string, url?: string) => {
    if (playingAudioId === msgId) {
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
      }
      setPlayingAudioId(null);
      setAudioPlaybackProgress(null);
    } else {
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
      }
      if (!url) return;
      const audio = new Audio(url);
      audioInstanceRef.current = audio;
      setPlayingAudioId(msgId);

      audio.ontimeupdate = () => {
        setAudioPlaybackProgress({
          id: msgId,
          current: audio.currentTime,
          duration: audio.duration || 0,
        });
      };

      audio.onended = () => {
        setPlayingAudioId(null);
        setAudioPlaybackProgress(null);
      };

      audio.onerror = () => {
        setPlayingAudioId(null);
        setAudioPlaybackProgress(null);
      };

      audio.play().catch((err) => {
        console.warn('Playback error:', err);
        setPlayingAudioId(null);
        setAudioPlaybackProgress(null);
      });
    }
  };

  // Clean up all audio resources on unmount
  useEffect(() => {
    return () => {
      cleanupAudioRecording();
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
        audioInstanceRef.current = null;
      }
    };
  }, []);

  // Phone calling & WhatsApp state
  const [showCallModal, setShowCallModal] = useState(false);
  const [tempPhoneInput, setTempPhoneInput] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  const getCleanPeerPhone = (peer: UserProfile | null) => {
    if (!peer) return '';
    try {
      // Safely check peer.phone_no, peer.phone, peer.phone_number, peer.mobile
      const rawVal = peer.phone_no ?? (peer as any).phone ?? (peer as any).phone_number ?? (peer as any).mobile;
      if (rawVal !== undefined && rawVal !== null) {
        const strVal = String(rawVal).trim();
        if (strVal && strVal !== 'undefined' && strVal !== 'null' && strVal !== 'N/A') return strVal;
      }
      const saved = localStorage.getItem(`sic_phone_${peer.id}`) || (peer.email ? localStorage.getItem(`sic_phone_${peer.email}`) : null);
      if (saved) {
        const savedStr = String(saved).trim();
        if (savedStr && savedStr !== 'undefined' && savedStr !== 'null') return savedStr;
      }
    } catch (e) {
      console.warn('Error reading peer phone:', e);
    }
    return '';
  };

  const currentPhoneClean = getCleanPeerPhone(activePeer);

  const handleInitiateCall = (_type: 'audio') => {
    if (!activePeer) return;
    const phone = getCleanPeerPhone(activePeer);
    setTempPhoneInput(phone);
    setIsEditingPhone(!phone);
    setShowCallModal(true);
  };

  const handleSavePhoneNumber = () => {
    if (!activePeer) return;
    const clean = String(tempPhoneInput || '').trim();
    if (!clean) return;
    try {
      localStorage.setItem(`sic_phone_${activePeer.id}`, clean);
      if (activePeer.email) localStorage.setItem(`sic_phone_${activePeer.email}`, clean);
    } catch (e) {}
    setIsEditingPhone(false);
  };

  const formatWhatsAppNumber = (phone: string | number | null | undefined) => {
    if (!phone) return '';
    let cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.slice(1);
    }
    return cleaned;
  };

  const formatTelNumber = (phone: string | number | null | undefined) => {
    if (!phone) return '';
    return String(phone).replace(/[^\d+]/g, '');
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (behavior: 'auto' | 'smooth' = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  };

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNear = distanceFromBottom < 100;
    isNearBottomRef.current = isNear;
    setShowScrollBottomBtn(distanceFromBottom > 160);
  };

  // Active Messages State - Instant Local Cache
  const [chatMessages, setChatMessages] = useState<DirectMessage[]>(() => {
    if (currentUser?.id && activePeer?.id) {
      return getLocalDirectMessagesBetween(currentUser.id, activePeer.id, currentUser.email, activePeer.email);
    }
    return [];
  });
  const [lastMessages, setLastMessages] = useState<Record<string, DirectMessage>>(() => {
    if (currentUser?.id) {
      return getLocalLastMessagesMap(currentUser.id, currentUser.email);
    }
    return {};
  });

  // Fast background sync for last messages across contacts
  useEffect(() => {
    if (!currentUser?.id) return;
    // 1. Immediately read cached last messages synchronously
    const cachedMap = getLocalLastMessagesMap(currentUser.id, currentUser.email);
    setLastMessages((prev) => ({ ...prev, ...cachedMap }));

    // 2. Single background request to sync recent messages across all contacts
    let isCancelled = false;
    getAllLastMessagesForUser(currentUser.id, currentUser.email).then((remoteMap) => {
      if (!isCancelled && remoteMap) {
        setLastMessages((prev) => ({ ...prev, ...remoteMap }));
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [allAvailableContacts, currentUser?.id, currentUser?.email]);

  // Default peer initialization
  useEffect(() => {
    if (!activePeer && allAvailableContacts.length > 0) {
      setActivePeer(allAvailableContacts[0]);
    }
  }, [allAvailableContacts, activePeer]);

  // Load chat history for active peer: Instant local storage cache (0ms) + background sync
  const loadMessages = async () => {
    if (!currentUser?.id || !activePeer?.id) return;

    // STEP 1: Immediately read from local storage cache synchronously!
    const localMsgs = getLocalDirectMessagesBetween(currentUser.id, activePeer.id, currentUser.email, activePeer.email);
    setChatMessages(localMsgs);

    // STEP 2: Background network fetch and non-blocking delivery/read receipts
    markMessagesAsDelivered(currentUser.id);
    if (currentUser.email) markMessagesAsDelivered(currentUser.email);
    markMessagesAsRead(currentUser.id, activePeer.id);
    if (activePeer.email) markMessagesAsRead(currentUser.id, activePeer.email);
    if (currentUser.email) markMessagesAsRead(currentUser.email, activePeer.id);

    try {
      const remoteMsgs = await getDirectMessagesBetween(currentUser.id, activePeer.id, currentUser.email, activePeer.email);
      if (remoteMsgs && remoteMsgs.length >= localMsgs.length) {
        setChatMessages(remoteMsgs);
      }
    } catch (e) {
      console.warn('Background sync error:', e);
    }
  };

  useEffect(() => {
    if (!currentUser?.id || !activePeer?.id) return;

    // Instant zero-delay load from localStorage
    const localMsgs = getLocalDirectMessagesBetween(currentUser.id, activePeer.id, currentUser.email, activePeer.email);
    setChatMessages(localMsgs);

    let isMounted = true;

    // Background delivery and read marks
    markMessagesAsDelivered(currentUser.id);
    if (currentUser.email) markMessagesAsDelivered(currentUser.email);
    markMessagesAsRead(currentUser.id, activePeer.id);
    if (activePeer.email) markMessagesAsRead(currentUser.id, activePeer.email);
    if (currentUser.email) markMessagesAsRead(currentUser.email, activePeer.id);

    // Fetch latest remote messages
    getDirectMessagesBetween(currentUser.id, activePeer.id, currentUser.email, activePeer.email).then((remoteMsgs) => {
      if (isMounted && remoteMsgs) {
        setChatMessages(remoteMsgs);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, currentUser?.email, activePeer?.id, activePeer?.email]);

  // Active presence heartbeat
  useEffect(() => {
    if (!currentUser) return;
    const heartbeat = () => {
      markUserPresence(currentUser.id);
      if (currentUser.email) markUserPresence(currentUser.email);
      markMessagesAsDelivered(currentUser.id);
      if (currentUser.email) markMessagesAsDelivered(currentUser.email);
    };
    heartbeat();
    const interval = setInterval(heartbeat, 8000);
    return () => clearInterval(interval);
  }, [currentUser?.id, currentUser?.email]);

  // Real-time sync listener (Supabase postgres_changes + BroadcastChannel + CustomEvent + Polling Fallback)
  useEffect(() => {
    if (!currentUser?.id || !activePeer?.id) return;
    const cId = currentUser.id.toLowerCase().trim();
    const pId = activePeer.id.toLowerCase().trim();
    const cEmail = (currentUser.email || '').toLowerCase().trim();
    const pEmail = (activePeer.email || '').toLowerCase().trim();

    const isMessageForThisChat = (msg: DirectMessage) => {
      const sId = (msg.sender_id || '').toLowerCase().trim();
      const rId = (msg.recipient_id || '').toLowerCase().trim();

      const fromMe = sId === cId || (cEmail && sId === cEmail);
      const toPeer = rId === pId || (pEmail && rId === pEmail);
      const fromPeer = sId === pId || (pEmail && sId === pEmail);
      const toMe = rId === cId || (cEmail && rId === cEmail);

      return (fromMe && toPeer) || (fromPeer && toMe);
    };

    // 1. Cross-tab Broadcast Channel listener (for multiple tabs on same browser/device)
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('sic_direct_chat_channel');
        bc.onmessage = (event) => {
          const msg = event.data as DirectMessage;
          if (msg && isMessageForThisChat(msg)) {
            setChatMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) {
                return prev.map((m) => (m.id === msg.id ? msg : m));
              }
              return [...prev, msg];
            });
          }
        };
      }
    } catch (e) {}

    // 2. Window CustomEvent listener
    const handleCustomMsg = (e: any) => {
      const msg = e.detail as DirectMessage;
      if (msg && isMessageForThisChat(msg)) {
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) {
            return prev.map((m) => (m.id === msg.id ? msg : m));
          }
          return [...prev, msg];
        });
      }
    };
    window.addEventListener('sic_new_direct_message', handleCustomMsg);

    // 3. Supabase Realtime Listener (cross-device/different phone)
    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel(`chat-sync-${cId}-${pId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
          const newMessage = payload.new as DirectMessage;
          if (newMessage && isMessageForThisChat(newMessage)) {
            setChatMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages' }, (payload) => {
          const updatedMessage = payload.new as DirectMessage;
          if (updatedMessage && isMessageForThisChat(updatedMessage)) {
            setChatMessages((prev) => prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg)));
          }
        })
        .subscribe();
    }

    // 4. Polling Fallback (every 3 seconds for instant multi-device responsiveness)
    const pollInterval = setInterval(() => {
      loadMessages();
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('sic_new_direct_message', handleCustomMsg);
      if (bc) {
        try {
          bc.close();
        } catch (e) {}
      }
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser?.id, currentUser?.email, activePeer?.id, activePeer?.email]);

  // When switching active conversation, jump container scroll to bottom without moving outer page
  useEffect(() => {
    isNearBottomRef.current = true;
    setShowScrollBottomBtn(false);
    const timer = setTimeout(() => {
      scrollToBottom('auto');
    }, 50);
    return () => clearTimeout(timer);
  }, [activePeer?.id]);

  // When messages arrive or update, only auto-scroll if user is already near bottom (anti-yanking)
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom('smooth');
    }
  }, [chatMessages]);

  // File Upload Handler (Converts file to Base64 data URL)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImg = file.type.startsWith('image/');
    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAttachedMedia({
          url: result,
          name: file.name,
          type: isImg ? 'image' : 'document',
        });
        setShowAttachmentTray(false);
      }
    };

    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  // Send Message Handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser || !activePeer) return;

    // Handle sending voice note if recording
    if (isRecordingVoice) {
      await stopAndSendRecording();
      return;
    }

    if (!messageText.trim() && !attachedMedia && !linkUrlInput.trim()) return;

    const isCore = currentUser.role === 'core_member' || currentUser.role === 'admin';

    const saved = await saveDirectMessage({
      sender_id: currentUser.id,
      sender_name: `${currentUser.first_name} ${currentUser.last_name}`.trim(),
      sender_role: isCore ? 'core_member' : 'student',
      sender_avatar: currentUser.avatar_url,
      recipient_id: activePeer.id,
      recipient_name: `${activePeer.first_name} ${activePeer.last_name}`.trim(),
      content: messageText.trim(),
      media_url: attachedMedia?.url,
      media_name: attachedMedia?.name,
      media_type: attachedMedia?.type === 'voice' ? 'document' : attachedMedia?.type as any,
      link_url: linkUrlInput.trim() || undefined,
      link_title: linkTitleInput.trim() || undefined,
    });

    setMessageText('');
    setAttachedMedia(null);
    setLinkUrlInput('');
    setLinkTitleInput('');
    setShowLinkModal(false);
    setShowAttachmentTray(false);
    setShowEmojiPicker(false);

    // Optimistically update active conversation & last message (0ms latency!)
    if (saved) {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === saved.id)) return prev;
        return [...prev, saved];
      });
      setLastMessages((prev) => ({
        ...prev,
        [activePeer.id]: saved,
      }));
      isNearBottomRef.current = true;
      setShowScrollBottomBtn(false);
      setTimeout(() => scrollToBottom('smooth'), 40);
    }
  };

  // Handle Microphone Button Interactions (Tap-to-Record & Hold-to-Talk)
  const handleMicPointerDown = (e: React.PointerEvent) => {
    if (messageText.trim() || attachedMedia) return;
    pointerDownTimeRef.current = Date.now();
    isPressingMicRef.current = true;

    // If already in tap-to-record mode, clicking mic finishes and sends
    if (isRecordingVoice) {
      stopAndSendRecording();
      return;
    }

    // Hold detection (300ms hold enters hold-to-talk mode)
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      if (isPressingMicRef.current && !isRecordingVoice) {
        startRecording(true);
      }
    }, 280);
  };

  const handleMicPointerUp = (e: React.PointerEvent) => {
    if (messageText.trim() || attachedMedia) return;
    isPressingMicRef.current = false;

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    const elapsed = Date.now() - pointerDownTimeRef.current;

    if (isRecordingVoice) {
      if (isHoldRecordingRef.current) {
        // Was held to talk: if held > 650ms, auto send on release!
        if (elapsed >= 650) {
          stopAndSendRecording();
        } else {
          // Keep recording in tap mode so user isn't cut off abruptly
          isHoldRecordingRef.current = false;
          setIsHoldRecording(false);
        }
      }
    } else {
      // Short tap (< 280ms) -> Start in tap-to-record mode!
      if (elapsed < 280) {
        startRecording(false);
      }
    }
  };

  // Filter contacts
  const getFilteredContacts = () => {
    let list = allAvailableContacts;
    if (selectedCategory === 'students') {
      list = list.filter((m) => m.role === 'member' || m.role === 'pending');
    } else if (selectedCategory === 'core') {
      list = list.filter((m) => m.role === 'core_member' || m.role === 'admin');
    }

    return list.filter((m) => {
      const q = (searchQuery || '').toLowerCase();
      const fullName = `${m.first_name || ''} ${m.last_name || ''}`.toLowerCase();
      const email = String(m.email || '').toLowerCase();
      const regNo = String(m.registration_no || '').toLowerCase();
      const branch = String(m.branch || '').toLowerCase();
      const domain = String(m.domain || '').toLowerCase();

      return (
        fullName.includes(q) ||
        email.includes(q) ||
        regNo.includes(q) ||
        branch.includes(q) ||
        domain.includes(q)
      );
    });
  };

  const filteredContacts = getFilteredContacts();
  const studentCount = allAvailableContacts.filter(m => m.role === 'member' || m.role === 'pending').length;
  const coreCount = allAvailableContacts.filter(m => m.role === 'core_member' || m.role === 'admin').length;

  // Emojis list
  const COMMON_EMOJIS = ['😊', '😂', '🔥', '👍', '❤️', '🙌', '🎉', '🚀', '💡', '✅', '✨', '⭐', '💯', '👏'];

  return (
    <div className="w-full h-full flex flex-col font-['Plus_Jakarta_Sans',sans-serif] bg-[#e2ebe5] text-[#111b21] overflow-hidden select-none">
      
      {/* ========================================================= */}
      {/* 1. WHATSAPP HEADER (CLAY TEAL BAR) */}
      {/* ========================================================= */}
      <div className={`clay-header text-white shrink-0 ${
        mobileViewMode === 'chat' ? 'hidden' : 'block'
      }`}>
        {/* WhatsApp Top Action Bar */}
        <div className={`px-4 py-2.5 sm:py-3 items-center justify-between ${
          mobileViewMode === 'chat' ? 'hidden' : 'flex'
        }`}>
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>WhatsApp</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-medium">
                {filteredContacts.length} {filteredContacts.length === 1 ? 'contact' : 'contacts'}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2.5 text-white">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="Camera"
            >
              <Camera className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowSearchInput(!showSearchInput)}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              type="button"
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              title="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* WhatsApp Quick Search Input Bar */}
        {showSearchInput && mobileViewMode !== 'chat' && (
          <div className="px-3 pb-2.5">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, branch, reg no, or domain..."
                className="w-full pl-9 pr-8 py-1.5 rounded-full bg-white text-slate-900 text-xs placeholder-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 text-slate-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Inputs */}
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
      <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileSelect} className="hidden" />

      {/* ========================================================= */}
      {/* 2. MAIN CHATS WORKSPACE (TWO-COLUMN DESKTOP / MOBILE SWITCHER) */}
      {/* ========================================================= */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-white relative">
          
          {/* ========================================================= */}
          {/* LEFT PANEL: WHATSAPP CONTACT LIST (OPTIMIZED DENSITY & FULL SCROLL) */}
          {/* ========================================================= */}
          <div
            className={`lg:col-span-4 border-r border-[#e9edef] flex flex-col bg-white min-h-0 h-full relative ${
              mobileViewMode === 'chat' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Category Filter Pills */}
            <div className="px-3 py-1.5 sm:py-2 bg-[#f0f2f5] border-b border-[#e9edef] flex items-center gap-1.5 overflow-x-auto shrink-0 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'all'
                    ? 'bg-[#00a884] text-white shadow-xs'
                    : 'bg-white text-[#54656f] border border-[#e9edef] hover:bg-slate-100'
                }`}
              >
                <span>All Chats</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedCategory === 'all' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {allAvailableContacts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('students')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'students'
                    ? 'bg-[#00a884] text-white shadow-xs'
                    : 'bg-white text-[#54656f] border border-[#e9edef] hover:bg-slate-100'
                }`}
              >
                <span>Students</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedCategory === 'students' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {studentCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('core')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'core'
                    ? 'bg-[#00a884] text-white shadow-xs'
                    : 'bg-white text-[#54656f] border border-[#e9edef] hover:bg-slate-100'
                }`}
              >
                <span>Core Council</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedCategory === 'core' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {coreCount}
                </span>
              </button>
            </div>

            {/* Contacts List Stream (Formatted with high density, multiple visible contacts, and full scroll) */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#f0f2f5] overscroll-contain pb-20">
              {filteredContacts.map((contact, idx) => {
                const isSelected = activePeer?.id === contact.id;
                const lastMsg = lastMessages[contact.id];

                // Branch and Domain format: "Computer Science & Engineering (Video Editor)"
                const branchName = contact.branch || 'Computer Science & Engineering';
                const domainName = contact.domain || (contact.role === 'core_member' ? 'Core Lead' : 'Member');
                const regNoDisplay = contact.registration_no ? `Reg No: ${contact.registration_no}` : (contact.role === 'core_member' ? 'Core Council' : 'SIC Member');

                // Dynamic timestamp based on actual chat history
                const timeDisplay = lastMsg
                  ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <div
                    key={`contact-${contact.id}-${idx}`}
                    onClick={() => {
                      setActivePeer(contact);
                      setMobileViewMode('chat');
                    }}
                    className={`px-3 py-2 sm:px-3.5 sm:py-2.5 flex items-center gap-2.5 sm:gap-3 cursor-pointer transition-colors relative ${
                      isSelected
                        ? 'bg-[#f0f2f5] border-l-4 border-[#00a884]'
                        : 'hover:bg-[#f5f6f6] bg-white'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-teal-600 via-indigo-600 to-purple-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center overflow-hidden shadow-xs border border-slate-100">
                        {contact.avatar_url ? (
                          <img src={contact.avatar_url} alt="User" className="w-full h-full object-cover" />
                        ) : (
                          `${contact.first_name[0]}${contact.last_name ? contact.last_name[0] : ''}`
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#00a884] border-2 border-white" />
                    </div>

                    {/* Info matching user reference image layout */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[13.5px] sm:text-sm font-bold text-[#111b21] truncate leading-tight">
                          {contact.first_name} {contact.last_name}
                        </h4>
                        {timeDisplay && (
                          <span className="text-[10.5px] sm:text-[11px] text-[#667781] font-normal shrink-0 ml-1">
                            {timeDisplay}
                          </span>
                        )}
                      </div>

                      {/* Subline 1: Branch (Domain) */}
                      <p className="text-[11px] sm:text-xs font-semibold text-[#54656f] truncate leading-tight">
                        {branchName} ({domainName})
                      </p>

                      {/* Subline 2: Real last message preview or member registration */}
                      {lastMsg ? (
                        <div className="flex items-center justify-between gap-1 text-[11px] text-[#667781] leading-tight pt-0.5">
                          <span className="truncate flex items-center gap-1 font-medium text-slate-700">
                            {lastMsg.sender_id === currentUser.id && (
                              lastMsg.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 shrink-0 text-[#38bdf8]" />
                              ) : lastMsg.status === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                              ) : (
                                <Check className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                              )
                            )}
                            <span className="truncate">
                              {lastMsg.media_name ? (lastMsg.media_name.includes('Voice') ? '🎙️ Voice note' : `📎 ${lastMsg.media_name}`) : lastMsg.content}
                            </span>
                          </span>
                          {lastMsg.sender_id !== currentUser.id && lastMsg.status !== 'read' && (
                            <span className="w-2 h-2 rounded-full bg-[#00a884] shrink-0" />
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pt-0.5">
                          <p className="text-[10px] sm:text-[11px] font-mono text-[#8696a0] truncate leading-tight">
                            {regNoDisplay}
                          </p>
                          <span className="text-[10px] text-emerald-700 font-medium">Active</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* WhatsApp Floating New Chat Action Button (Absolute overlay - zero empty wasted space) */}
            <div className="absolute bottom-4 right-4 z-20 pointer-events-none">
              <button
                type="button"
                onClick={() => setMobileViewMode('list')}
                className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-[#00a884] hover:bg-[#008f70] text-white flex items-center justify-center shadow-[0_4px_14px_rgba(0,168,132,0.45)] transition-transform active:scale-95 pointer-events-auto cursor-pointer"
                title="New Chat"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT PANEL: ACTIVE CONVERSATION SCREEN */}
          {/* ========================================================= */}
          <div
            className={`lg:col-span-8 flex flex-col min-h-0 bg-[#e2ebe5] relative ${
              mobileViewMode === 'list' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {activePeer ? (
              <>
                {/* Active Chat Conversation Top Header Bar (CLAYMORPHISM 3D) */}
                <div className="px-3.5 sm:px-5 py-3 clay-header text-white flex items-center justify-between shrink-0 z-20">
                  <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                    {/* Back Button */}
                    <button
                      type="button"
                      onClick={() => setMobileViewMode('list')}
                      className="p-2 rounded-2xl clay-icon-btn hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer shrink-0"
                      title="Back to contacts"
                    >
                      <ArrowLeft className="w-5 h-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                    </button>

                    {/* Clay Avatar Bead with initials */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full clay-avatar text-[#164e46] font-black text-sm sm:text-base flex items-center justify-center overflow-hidden border-2 border-white/70">
                        {activePeer.avatar_url ? (
                          <img src={activePeer.avatar_url} alt="Active" className="w-full h-full object-cover" />
                        ) : (
                          `${activePeer.first_name[0]}${activePeer.last_name ? activePeer.last_name[0] : ''}`
                        )}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#4ade80] border-2 border-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]" />
                    </div>

                    <div className="min-w-0 flex flex-col justify-center">
                      <h3 className="text-sm sm:text-base font-extrabold text-white truncate leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                        {activePeer.first_name} {activePeer.last_name}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        <span className="font-mono text-[11px] sm:text-xs text-emerald-100 font-semibold tracking-tight">
                          {activePeer.registration_no || (activePeer.role === 'core_member' ? 'Core Lead' : 'Reg: Member')}
                        </span>
                        {/* 3D Inflated Peach Clay Pill for Domain */}
                        <span className="text-[11px] sm:text-xs font-extrabold clay-badge-peach px-3 py-0.5 rounded-full whitespace-nowrap tracking-wide">
                          {activePeer.domain || (activePeer.role === 'core_member' ? 'Technical Lead' : 'Tech Member')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Header Action Icons: Voice Call, Menu */}
                  <div className="flex items-center gap-2 sm:gap-3 text-white">
                    <button
                      type="button"
                      onClick={() => handleInitiateCall('audio')}
                      className="p-2 rounded-2xl clay-icon-btn hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
                      title="Voice Call"
                    >
                      <Phone className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                    </button>
                    <button
                      type="button"
                      className="p-2 rounded-2xl clay-icon-btn hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
                      title="More Options"
                    >
                      <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                    </button>
                  </div>
                </div>

                {/* Claymorphism Background Chat Canvas with Tactile Dots */}
                <div
                  ref={messagesContainerRef}
                  onScroll={handleMessagesScroll}
                  className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3.5 min-h-0 relative bg-[#e2ebe5]"
                  style={{
                    backgroundImage: 'radial-gradient(#b4c6bc 1.25px, transparent 1.25px)',
                    backgroundSize: '18px 18px',
                  }}
                >
                  {/* Today Date Stamp (Clay Date Pill) */}
                  <div className="flex justify-center my-1.5">
                    <span className="px-4 py-1.5 clay-date-pill text-xs font-black uppercase tracking-wider">
                      TODAY
                    </span>
                  </div>

                  {/* Clean Empty State when no chat is done yet */}
                  {chatMessages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 px-4 text-center my-auto">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full clay-avatar text-[#164e46] font-black text-xl sm:text-2xl flex items-center justify-center border-4 border-white shadow-md mb-3 overflow-hidden">
                        {activePeer.avatar_url ? (
                          <img src={activePeer.avatar_url} alt={activePeer.first_name} className="w-full h-full object-cover" />
                        ) : (
                          `${activePeer.first_name[0]}${activePeer.last_name ? activePeer.last_name[0] : ''}`
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-slate-800">
                        {activePeer.first_name} {activePeer.last_name}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium mt-1">
                        {activePeer.branch || 'Science & Innovation Club'} {activePeer.domain ? `• ${activePeer.domain}` : ''}
                      </p>
                      {activePeer.registration_no && (
                        <span className="mt-1.5 px-3 py-0.5 rounded-full bg-slate-200/90 text-slate-700 text-[11px] font-mono font-bold">
                          Reg No: {activePeer.registration_no}
                        </span>
                      )}

                      <div className="mt-6 p-4 max-w-sm mx-auto text-center clay-card-cream rounded-2xl space-y-1">
                        <p className="text-xs font-bold text-[#111b21]">🔒 No conversation history yet</p>
                        <p className="text-[11px] text-[#667781]">
                          Messages sent here are direct and private between you and {activePeer.first_name}.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setMessageText(`Hello ${activePeer.first_name}! 👋`);
                        }}
                        className="mt-4 px-4 py-2 rounded-2xl bg-[#00a884] hover:bg-[#008f70] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                      >
                        <span>👋 Say Hello to {activePeer.first_name}</span>
                      </button>
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.sender_id === currentUser.id;
                      const msgTime = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const isVoiceNote = msg.media_type === 'audio' || msg.media_name?.includes('Voice_Note') || msg.content.includes('Voice Note');
                      const isPlaying = playingAudioId === msg.id;

                      if (isVoiceNote) {
                        const progress = isPlaying && audioPlaybackProgress?.id === msg.id && (audioPlaybackProgress?.duration || 0) > 0
                          ? (audioPlaybackProgress.current / (audioPlaybackProgress.duration || 1)) * 100
                          : 0;
                        const durationMatch = msg.content.match(/\((\d+)s\)/);
                        const displaySec = durationMatch ? `${durationMatch[1]}s` : '0:05';

                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-2`}
                          >
                            <div
                              className={`w-full max-w-[85%] sm:max-w-[70%] p-3 sm:p-3.5 rounded-2xl shadow-sm space-y-2 select-none ${
                                isMe ? 'clay-card-mint text-[#112f26]' : 'clay-card-cream text-[#1e293b]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 sm:gap-3">
                                {/* Play / Pause Circular Button */}
                                <button
                                  type="button"
                                  onClick={() => togglePlayAudio(msg.id, msg.media_url)}
                                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-md transition-transform active:scale-90 ${
                                    isMe
                                      ? 'bg-[#164e46] text-white hover:bg-[#113e38]'
                                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  }`}
                                  title={isPlaying ? 'Pause Voice Note' : 'Play Voice Note'}
                                >
                                  {isPlaying ? (
                                    <Pause className="w-5 h-5 fill-current" />
                                  ) : (
                                    <Play className="w-5 h-5 fill-current ml-0.5" />
                                  )}
                                </button>

                                {/* Waveform Visualizer & Elapsed Counter */}
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div
                                    onClick={() => togglePlayAudio(msg.id, msg.media_url)}
                                    className="flex items-center gap-0.5 sm:gap-1 h-6 cursor-pointer"
                                    title="Click to play"
                                  >
                                    {[35, 65, 45, 85, 55, 95, 75, 40, 85, 100, 65, 50, 80, 45, 60, 90, 45, 30, 70, 50].map((h, i) => {
                                      const barPercent = (i / 20) * 100;
                                      const isPassed = progress >= barPercent;
                                      return (
                                        <div
                                          key={i}
                                          className={`flex-1 rounded-full transition-all duration-150 ${
                                            isPassed
                                              ? isMe ? 'bg-[#164e46]' : 'bg-emerald-600'
                                              : isMe ? 'bg-[#164e46]/25' : 'bg-slate-400/35'
                                          }`}
                                          style={{ height: `${h}%`, minHeight: '4px' }}
                                        />
                                      );
                                    })}
                                  </div>

                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                    <span className="flex items-center gap-1 font-mono text-emerald-900">
                                      <Mic className="w-3 h-3 text-rose-500" />
                                      {isPlaying && audioPlaybackProgress?.id === msg.id
                                        ? `${Math.floor(audioPlaybackProgress.current || 0)}s`
                                        : displaySec}
                                    </span>
                                    <span className="text-[10px] text-slate-500">Voice Note</span>
                                  </div>
                                </div>
                              </div>

                              {/* Timestamp & Status Checkmark */}
                              <div className="flex items-center justify-end gap-1.5 text-[10.5px] font-bold opacity-80 pt-0.5 border-t border-black/5">
                                <span>{msgTime}</span>
                                {isMe && (
                                  <span className="inline-flex items-center ml-0.5" title={msg.status === 'read' ? 'Read' : msg.status === 'delivered' ? 'Delivered' : 'Sent'}>
                                    {msg.status === 'read' ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-[#38bdf8]" />
                                    ) : msg.status === 'delivered' ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1.5`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl space-y-1 relative text-xs sm:text-sm ${
                            isMe ? 'clay-card-mint text-[#112f26]' : 'clay-card-cream text-[#1e293b]'
                          }`}
                        >
                          {/* Attached Media Image */}
                          {msg.media_url && msg.media_type === 'image' && (
                            <div className="rounded-xl overflow-hidden max-h-56 mb-1.5 border-2 border-white/60 shadow-xs">
                              <img src={msg.media_url} alt="Attached" className="w-full h-full object-cover" />
                            </div>
                          )}

                          {/* Attached Media Document */}
                          {msg.media_url && msg.media_type === 'document' && (
                            <div className="p-2.5 rounded-xl bg-black/5 flex items-center gap-2 text-xs font-bold mb-1 border border-black/5">
                              <FileText className="w-4 h-4 text-[#164e46]" />
                              <span className="truncate">{msg.media_name || 'Document.pdf'}</span>
                            </div>
                          )}

                          {/* Attached Link URL */}
                          {msg.link_url && (
                            <a
                              href={msg.link_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-xl bg-emerald-500/10 text-emerald-900 text-xs font-bold flex items-center gap-1.5 hover:underline mb-1"
                            >
                              <LinkIcon className="w-3.5 h-3.5" />
                              <span className="truncate">{msg.link_title || msg.link_url}</span>
                            </a>
                          )}

                          {/* Message Text Body */}
                          <p className="whitespace-pre-wrap leading-snug font-medium">{msg.content}</p>

                          {/* Timestamp & Status Checkmark */}
                          <div className="flex items-center justify-end gap-1 text-[10px] font-bold opacity-80 pt-0.5">
                            <span>{msgTime}</span>
                            {isMe && (
                              <span className="inline-flex items-center ml-0.5" title={msg.status === 'read' ? 'Read' : msg.status === 'delivered' ? 'Delivered' : 'Sent'}>
                                {msg.status === 'read' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-[#38bdf8]" />
                                ) : msg.status === 'delivered' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }))}
                  <div ref={messagesEndRef} />

                  {/* Floating Scroll-to-Bottom Quick Button (When user scrolled up) */}
                  <AnimatePresence>
                    {showScrollBottomBtn && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        type="button"
                        onClick={() => {
                          isNearBottomRef.current = true;
                          setShowScrollBottomBtn(false);
                          scrollToBottom('smooth');
                        }}
                        className="fixed sm:absolute bottom-20 right-4 sm:right-6 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 text-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.2)] border border-slate-200/80 flex items-center justify-center hover:bg-white hover:text-emerald-700 active:scale-95 transition-all z-30 cursor-pointer"
                        title="Scroll to latest messages"
                      >
                        <ChevronDown className="w-5 h-5 text-emerald-800 stroke-[2.5]" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* Emoji Tray Overlay */}
                {showEmojiPicker && (
                  <div className="p-2.5 bg-[#ebe4da] border-t border-[#ded5c8] flex items-center gap-2 overflow-x-auto shrink-0 z-20">
                    {COMMON_EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => {
                          setMessageText((prev) => prev + e);
                          setShowEmojiPicker(false);
                        }}
                        className="text-lg p-1.5 hover:bg-black/5 rounded-xl transition-colors cursor-pointer"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}

                {/* Attached Media Preview Pill */}
                {attachedMedia && (
                  <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between shrink-0 text-xs text-emerald-900 font-bold">
                    <div className="flex items-center gap-2 truncate">
                      {attachedMedia.type === 'image' ? <ImageIcon className="w-4 h-4 text-[#164e46]" /> : <FileText className="w-4 h-4 text-[#164e46]" />}
                      <span className="truncate">Attached: {attachedMedia.name}</span>
                    </div>
                    <button type="button" onClick={() => setAttachedMedia(null)} className="text-slate-500 hover:text-slate-800 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {micPermissionError && (
                  <div className="px-4 py-3 bg-amber-100 text-amber-900 flex items-center gap-3 shrink-0 text-xs font-bold border-b border-amber-200">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="flex-1">
                      <p>{micPermissionError}</p>
                    </div>
                    <button onClick={() => setMicPermissionError(null)} className="text-amber-700 hover:text-amber-900 font-bold underline">
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Voice Note Recording Simulator Banner */}
                {isRecordingVoice && (
                  <div className="px-4 py-2.5 bg-rose-500 text-white flex items-center justify-between shrink-0 text-xs font-bold animate-pulse">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-white" />
                      <span>Recording Voice Note... 0:0{recordingSeconds}s</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsRecordingVoice(false)}
                      className="px-2 py-0.5 rounded bg-white text-rose-600 text-[10px] font-extrabold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* ========================================================= */}
                {/* BOTTOM INPUT TOOLBAR (CLAYMORPHISM 3D) */}
                {/* ========================================================= */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-2.5 sm:p-3.5 clay-input-bar rounded-b-[24px] sm:rounded-b-[34px] flex items-center gap-2 sm:gap-3 shrink-0 z-10"
                >
                  {/* Sunken Rounded Input Capsule */}
                  <div className="flex-1 clay-input-capsule rounded-full px-3.5 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-2.5">
                    {/* Left: Emoji Button */}
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-[#6d6356] hover:text-[#2d2822] cursor-pointer shrink-0 transition-colors"
                      title="Emojis"
                    >
                      <Smile className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>

                    {/* Input Field */}
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Message"
                      className="flex-1 text-xs sm:text-sm text-[#2d2822] placeholder-[#8c8275] bg-transparent focus:outline-none font-medium"
                    />

                    {/* Right inside capsule: Paperclip (Attachments) */}
                    <button
                      type="button"
                      onClick={() => setShowAttachmentTray(!showAttachmentTray)}
                      className="text-[#6d6356] hover:text-[#2d2822] cursor-pointer shrink-0 transition-colors"
                      title="Attach documents, photos, links"
                    >
                      <Paperclip className="w-5 h-5 sm:w-6 sm:h-6 -rotate-45" />
                    </button>

                    {/* Right inside capsule: Camera Icon */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="text-[#6d6356] hover:text-[#2d2822] cursor-pointer shrink-0 transition-colors ml-0.5"
                      title="Camera"
                    >
                      <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  </div>

                  {/* Far Right Outside Capsule: Coral Clay 3D Sphere Button */}
                  <button
                    type={messageText.trim() || attachedMedia ? 'submit' : 'button'}
                    onPointerDown={messageText.trim() || attachedMedia ? undefined : handleMicPointerDown}
                    onPointerUp={messageText.trim() || attachedMedia ? undefined : handleMicPointerUp}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full clay-btn-mic text-white flex items-center justify-center cursor-pointer shrink-0 transition-transform active:scale-95 shadow-md ${
                      isRecordingVoice ? 'animate-pulse ring-4 ring-rose-300' : ''
                    }`}
                    title={messageText.trim() || attachedMedia ? 'Send Message' : 'Voice Message'}
                  >
                    {messageText.trim() || attachedMedia ? (
                      <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
                    ) : (
                      <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
                    )}
                  </button>
                </form>

                {/* Attachment Options Popover Menu */}
                {showAttachmentTray && (
                  <div className="absolute bottom-16 right-4 z-50 p-4 rounded-2xl bg-white border border-[#e9edef] shadow-2xl space-y-3 w-64 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <p className="text-xs font-bold text-slate-800">Send Attachments</p>
                      <button type="button" onClick={() => setShowAttachmentTray(false)} className="text-slate-400 hover:text-slate-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAttachmentTray(false);
                          fileInputRef.current?.click();
                        }}
                        className="p-3 rounded-2xl bg-purple-50 text-purple-700 hover:bg-purple-100 flex flex-col items-center gap-1.5 cursor-pointer"
                      >
                        <ImageIcon className="w-5 h-5 text-purple-600" />
                        <span>Photos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAttachmentTray(false);
                          fileInputRef.current?.click();
                        }}
                        className="p-3 rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 flex flex-col items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <span>Document</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAttachmentTray(false);
                          setShowLinkModal(true);
                        }}
                        className="p-3 rounded-2xl bg-teal-50 text-teal-700 hover:bg-teal-100 flex flex-col items-center gap-1.5 cursor-pointer"
                      >
                        <LinkIcon className="w-5 h-5 text-teal-600" />
                        <span>Web Link</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center text-[#667781] space-y-3 my-auto">
                <Users className="w-12 h-12 text-[#8696a0] mx-auto" />
                <p className="text-base font-bold text-[#111b21]">WhatsApp Web for SIC Club</p>
                <p className="text-xs text-[#667781]">Select a student or core lead to start messaging.</p>
              </div>
            )}
          </div>
        </div>

      {/* MODAL: ATTACH WEB LINK / URL */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-[#e9edef] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0f2f5] pb-3">
              <h3 className="text-sm font-bold text-[#111b21] flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-[#00a884]" />
                <span>Attach Web Link / URL</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="text-[#667781] hover:text-[#111b21] cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#667781] mb-1 font-medium">Target URL</label>
                <input
                  type="url"
                  required
                  value={linkUrlInput}
                  onChange={(e) => setLinkUrlInput(e.target.value)}
                  placeholder="https://github.com/project-repo"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#f0f2f5] border border-[#e9edef] text-[#111b21] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                />
              </div>

              <div>
                <label className="block text-[#667781] mb-1 font-medium">Link Title / Label</label>
                <input
                  type="text"
                  value={linkTitleInput}
                  onChange={(e) => setLinkTitleInput(e.target.value)}
                  placeholder="e.g. Video Editing Project Portfolio"
                  className="w-full px-3.5 py-2 rounded-lg bg-[#f0f2f5] border border-[#e9edef] text-[#111b21] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="flex-1 py-2 rounded-xl bg-[#f0f2f5] text-[#111b21] font-semibold text-xs cursor-pointer hover:bg-[#eaedef]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLinkModal(false);
                  handleSendMessage();
                }}
                className="flex-1 py-2 rounded-xl bg-[#00a884] hover:bg-[#008f70] text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Attach Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DIRECT CALL & WHATSAPP CALL ACTION DIALOG */}
      <AnimatePresence>
        {showCallModal && activePeer && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm rounded-[32px] bg-gradient-to-b from-[#075e54] via-[#128c7e] to-[#075e54] p-5 sm:p-6 text-white shadow-2xl border-2 border-white/20 space-y-4 relative overflow-hidden"
            >
              {/* Top Close Button */}
              <button
                type="button"
                onClick={() => {
                  setShowCallModal(false);
                  setIsEditingPhone(false);
                }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Peer Avatar & Contact Info */}
              <div className="text-center space-y-2 pt-2">
                <div className="relative inline-block mx-auto">
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border-4 border-white/40 shadow-xl overflow-hidden bg-slate-200 mx-auto flex items-center justify-center">
                    {activePeer.avatar_url ? (
                      <img src={activePeer.avatar_url} alt={activePeer.first_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-slate-800">
                        {activePeer.first_name?.[0] || 'U'}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    {activePeer.first_name} {activePeer.last_name}
                  </h3>
                  <p className="text-xs text-emerald-200 font-bold">
                    {activePeer.domain || (activePeer.role === 'core_member' ? 'Executive Core Member' : 'Student Member')}
                  </p>
                  <p className="text-[11px] text-white/70 font-mono mt-0.5">
                    {activePeer.registration_no ? `Reg: ${activePeer.registration_no}` : activePeer.email}
                  </p>
                </div>
              </div>

              {/* Phone Number Display / Input Section */}
              <div className="bg-black/20 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-extrabold">
                    Phone / WhatsApp Contact
                  </span>
                  {currentPhoneClean && !isEditingPhone && (
                    <button
                      type="button"
                      onClick={() => setIsEditingPhone(true)}
                      className="text-[10px] text-emerald-200 hover:text-white underline cursor-pointer font-bold"
                    >
                      Change Number
                    </button>
                  )}
                </div>

                {!isEditingPhone && currentPhoneClean ? (
                  <div className="flex items-center justify-between bg-white/10 px-3.5 py-2.5 rounded-xl border border-white/15">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Phone className="w-4 h-4 text-emerald-300 shrink-0" />
                      <span className="font-mono text-sm font-bold text-white tracking-wide truncate">
                        {currentPhoneClean}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 shrink-0">
                      Active
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="tel"
                        value={tempPhoneInput}
                        onChange={(e) => setTempPhoneInput(e.target.value)}
                        placeholder="e.g. 9876543210 (10 digits)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/15 border border-white/20 text-white placeholder:text-white/50 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSavePhoneNumber}
                      className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs transition-all shadow-md cursor-pointer"
                    >
                      Save Phone Number
                    </button>
                  </div>
                )}
              </div>

              {/* Call Action Buttons */}
              <div className="space-y-2.5 pt-1">
                {/* 1. Direct Phone Call via cellular/dialer */}
                <a
                  href={currentPhoneClean ? `tel:${formatTelNumber(currentPhoneClean)}` : undefined}
                  onClick={(e) => {
                    if (!currentPhoneClean) {
                      e.preventDefault();
                      setIsEditingPhone(true);
                    }
                  }}
                  className={`w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-[4px_6px_16px_rgba(16,185,129,0.4),inset_1px_1px_3px_rgba(255,255,255,0.6)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer ${
                    !currentPhoneClean ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  <span>Call on Phone ({currentPhoneClean ? 'Cellular Call' : 'Enter Number First'})</span>
                </a>

                {/* 2. Direct WhatsApp Call / Chat */}
                <a
                  href={currentPhoneClean ? `https://wa.me/${formatWhatsAppNumber(currentPhoneClean)}` : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!currentPhoneClean) {
                      e.preventDefault();
                      setIsEditingPhone(true);
                    }
                  }}
                  className={`w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#25d366] via-[#128c7e] to-[#075e54] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-[4px_6px_16px_rgba(37,211,102,0.4),inset_1px_1px_3px_rgba(255,255,255,0.6)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border border-white/20 ${
                    !currentPhoneClean ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  <span>Call / Chat on WhatsApp</span>
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
