import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  Volume2,
  RefreshCw,
  Copy,
  Check,
  X,
  Plus,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  Palette,
  Upload,
  Image as ImageIcon,
  Wifi,
  WifiOff,
  Users,
  Zap,
  Send,
  ArrowDownCircle,
  ChevronDown
} from 'lucide-react';

import studentsWavingImg from './assets/images/students_waving_1791251366893.jpg';
import studentsCelebratingImg from './assets/images/students_celebrating_1791251379726.jpg';

export interface RoomConfig {
  id: string;
  name: string;
  token: string;
  isActive: boolean;
}

interface AppSettings {
  pin: string;
  bannerText: string;
  footerLeft: string;
  footerRight: string;
  theme: 'light' | 'dark';
  soundEnabled: boolean;
  tokenScale: 'small' | 'medium' | 'large';
  bgPreset: string;
  customBgColor: string;
  bgPattern: 'dots' | 'none';
  bgImageUrl?: string | null;
  bgImageFit?: 'cover' | 'contain';
  bgImageOpacity?: number;
  cloudSyncEnabled?: boolean;
  cloudSyncUrl?: string;
  cloudSyncApiKey?: string;
}

export interface BackgroundPreset {
  id: string;
  name: string;
  bgColor: string;
  textColor: string;
  isDark: boolean;
  description: string;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: 'cream', name: 'Krem SMADAPAS', bgColor: '#FDFBF7', textColor: '#0f172a', isDark: false, description: 'Sesuai referensi resmi (#FDFBF7)' },
  { id: 'white', name: 'Putih Bersih', bgColor: '#FFFFFF', textColor: '#0f172a', isDark: false, description: 'Terang jernih maksimal proyektor' },
  { id: 'blue', name: 'Biru Akademik', bgColor: '#F0F5FA', textColor: '#0f172a', isDark: false, description: 'Nuansa biru sekolah teduh' },
  { id: 'mint', name: 'Hijau Sejuk', bgColor: '#F2F8F4', textColor: '#0f172a', isDark: false, description: 'Segar dan nyaman di mata' },
  { id: 'yellow-pastel', name: 'Kuning Pastel', bgColor: '#FEFCE8', textColor: '#0f172a', isDark: false, description: 'Cerah, hangat, dan kontras' },
  { id: 'peach', name: 'Pasir Hangat', bgColor: '#FAF6EE', textColor: '#0f172a', isDark: false, description: 'Tekstur kertas klasik' },
  { id: 'dark-navy', name: 'Midnight Navy', bgColor: '#0F172A', textColor: '#F8FAFC', isDark: true, description: 'Mode gelap elegan untuk aula' },
  { id: 'dark-slate', name: 'Deep Charcoal', bgColor: '#181E2A', textColor: '#F8FAFC', isDark: true, description: 'Kontras tinggi bebas silau' },
  { id: 'dark-emerald', name: 'Emerald Night', bgColor: '#062C22', textColor: '#F8FAFC', isDark: true, description: 'Gelap berwibawa khas hijau' },
];

function isColorDark(hexColor: string): boolean {
  if (!hexColor || !hexColor.startsWith('#')) return false;
  const hex = hexColor.replace('#', '');
  if (hex.length !== 6 && hex.length !== 3) return false;
  const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16) || 0;
  const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(2, 4), 16) || 0;
  const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(4, 6), 16) || 0;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
}

// Client-side image compression for fast localStorage persistence
function compressAndReadImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1920;
        const maxHeight = 1080;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Gagal memproses gambar'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

const DEFAULT_ROOMS: RoomConfig[] = [
  { id: 'aula-2', name: 'AULA 2', token: 'ZMQOUL', isActive: true },
  { id: 'aula-1', name: 'AULA 1', token: 'OVBOWK', isActive: true },
  { id: 'multimedia', name: 'MULTIMEDIA', token: 'KTR7LP', isActive: false },
];

const DEFAULT_SETTINGS: AppSettings = {
  pin: '1234',
  bannerText: 'TOKEN',
  footerLeft: 'TIM TKA',
  footerRight: 'SMADAPAS 2026',
  theme: 'light',
  soundEnabled: true,
  tokenScale: 'small',
  bgPreset: 'cream',
  customBgColor: '#FDFBF7',
  bgPattern: 'dots',
  bgImageUrl: null,
  bgImageFit: 'cover',
  bgImageOpacity: 0.85,
  cloudSyncEnabled: false,
  cloudSyncUrl: '',
  cloudSyncApiKey: '',
};

function getTokenSizeClasses(scale: 'small' | 'medium' | 'large' = 'small', count: number) {
  if (count >= 3) {
    if (scale === 'small') return 'text-2xl sm:text-3xl md:text-4xl lg:text-[3rem]';
    if (scale === 'medium') return 'text-3xl sm:text-4xl md:text-5xl lg:text-[3.75rem]';
    return 'text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem]';
  }
  if (scale === 'small') {
    return 'text-3xl sm:text-4xl md:text-5xl lg:text-[3.75rem] xl:text-[4.25rem]';
  }
  if (scale === 'medium') {
    return 'text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5rem]';
  }
  return 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[6rem]';
}

function getRoomNameClasses(scale: 'small' | 'medium' | 'large' = 'small', count: number) {
  if (count >= 3) {
    return 'text-base sm:text-lg md:text-xl lg:text-2xl font-black uppercase tracking-wider';
  }
  if (scale === 'small') {
    return 'text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black uppercase tracking-wider';
  }
  if (scale === 'medium') {
    return 'text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-wider';
  }
  return 'text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-wider';
}

function generateRandomToken(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing O/0, I/1
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Native Web Audio chime (no external audio file required)
function playToneNotification() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tone 1: E5 (659.25Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Tone 2: A5 (880Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.18);
    gain2.gain.setValueAtTime(0, now + 0.18);
    gain2.gain.linearRampToValueAtTime(0.25, now + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.8);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

export default function App() {
  // Load settings and rooms from localStorage
  const [rooms, setRooms] = useState<RoomConfig[]>(() => {
    try {
      const saved = localStorage.getItem('smadapas_token_rooms');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback to default
    }
    return DEFAULT_ROOMS;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('smadapas_token_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // fallback to default
    }
    return DEFAULT_SETTINGS;
  });

  // UI state
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isQuickPaletteOpen, setIsQuickPaletteOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [confettiActive, setConfettiActive] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Live ticking clock for exam room presentation
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}:${seconds} WIB`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const triggerConfetti = () => {
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 2400);
  };

  // Temporary editable state inside admin panel
  const [tempRooms, setTempRooms] = useState<RoomConfig[]>(rooms);
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  const [newPin, setNewPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);

  // Multi-device real-time sync state
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [connectedDevices, setConnectedDevices] = useState<number>(1);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isSyncMenuOpen, setIsSyncMenuOpen] = useState<boolean>(false);
  const clientIdRef = useRef<string>('client-' + Math.random().toString(36).substring(2, 9));
  const isRemoteSyncingRef = useRef<boolean>(false);
  const hasInitialLoadedRef = useRef<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastUpdatedRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // References keeping current live state accessible across async closures without stale capture
  const roomsRef = useRef<RoomConfig[]>(rooms);
  roomsRef.current = rooms;
  const settingsRef = useRef<AppSettings>(settings);
  settingsRef.current = settings;

  // Tracks rooms that recently updated tokens for flash highlight animation
  const [recentlyUpdatedTokens, setRecentlyUpdatedTokens] = useState<Record<string, number>>({});

  const markRoomTokenUpdated = (roomId: string) => {
    setRecentlyUpdatedTokens((prev) => ({
      ...prev,
      [roomId]: Date.now(),
    }));
    setTimeout(() => {
      setRecentlyUpdatedTokens((prev) => {
        const next = { ...prev };
        delete next[roomId];
        return next;
      });
    }, 4500);
  };

  // Cloud Sync Testing State
  const [cloudTestState, setCloudTestState] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    message: string;
  }>({
    status: 'idle',
    message: '',
  });

  const handleTestCloudConnection = async () => {
    const targetUrl = tempSettings.cloudSyncUrl?.trim() || '/api/state';
    setCloudTestState({ status: 'testing', message: 'Sedang menghubungi endpoint...' });
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (tempSettings.cloudSyncApiKey?.trim()) {
        headers['Authorization'] = `Bearer ${tempSettings.cloudSyncApiKey.trim()}`;
        headers['X-Master-Key'] = tempSettings.cloudSyncApiKey.trim();
      }

      const res = await fetch(targetUrl, {
        method: 'GET',
        headers,
      });

      if (res.ok) {
        setCloudTestState({
          status: 'success',
          message: `Koneksi Berhasil! (HTTP ${res.status}) - Cloud Sync siap digunakan.`,
        });
        showToast('Koneksi Cloud Sync Berhasil!');
      } else {
        setCloudTestState({
          status: 'error',
          message: `Gagal terhubung: HTTP ${res.status} ${res.statusText}`,
        });
      }
    } catch {
      setCloudTestState({
        status: 'error',
        message: 'Gagal terhubung: Periksa URL atau koneksi internet.',
      });
    }
  };

  // PUSH SYNC: Explicitly broadcasts current/specified tokens to ALL other devices (Projector, Laptops, Mobile)
  const handlePushSyncToServer = async (
    targetRooms?: RoomConfig[],
    targetSettings?: AppSettings,
    notifyMessage = '✅ Token berhasil disinkronkan ke perangkat lain!'
  ) => {
    setIsSyncing(true);
    const roomsToSync = targetRooms || roomsRef.current;
    const settingsToSync = targetSettings || settingsRef.current;
    const now = Date.now();
    lastUpdatedRef.current = now;

    // Cache locally
    try {
      localStorage.setItem('smadapas_token_rooms', JSON.stringify(roomsToSync));
      localStorage.setItem('smadapas_token_settings', JSON.stringify(settingsToSync));
      lastPolledRoomsStr.current = JSON.stringify(roomsToSync);
      lastPolledSettingsStr.current = JSON.stringify(settingsToSync);
    } catch {}

    // 1. WebSocket broadcast to all connected devices instantly (< 50ms)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(
          JSON.stringify({
            type: 'update_state',
            rooms: roomsToSync,
            settings: settingsToSync,
            lastUpdated: now,
            source: clientIdRef.current,
          })
        );
      } catch (e) {
        console.error('Failed to send WS message:', e);
      }
    }

    // 2. BroadcastChannel for instant local cross-tab sync in same browser
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'update_state',
          rooms: roomsToSync,
          settings: settingsToSync,
          lastUpdated: now,
          source: clientIdRef.current,
        });
      } catch {}
    }

    // 3. HTTP REST POST with persistence to disk & server-side broadcast
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rooms: roomsToSync,
          settings: settingsToSync,
          lastUpdated: now,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (typeof json.connectedDevices === 'number') {
          setConnectedDevices(Math.max(1, json.connectedDevices));
        }
        showToast(notifyMessage);
        triggerConfetti();
      } else {
        showToast('⚠️ Gagal menyimpan ke server');
      }
    } catch {
      showToast('⚠️ Gagal menghubungi server');
    }

    // 4. External Cloud Sync (if configured)
    if (settingsToSync.cloudSyncEnabled && settingsToSync.cloudSyncUrl?.trim()) {
      try {
        const cloudHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (settingsToSync.cloudSyncApiKey?.trim()) {
          cloudHeaders['Authorization'] = `Bearer ${settingsToSync.cloudSyncApiKey.trim()}`;
          cloudHeaders['X-Master-Key'] = settingsToSync.cloudSyncApiKey.trim();
        }
        fetch(settingsToSync.cloudSyncUrl.trim(), {
          method: 'POST',
          headers: cloudHeaders,
          body: JSON.stringify({
            rooms: roomsToSync,
            settings: settingsToSync,
            lastUpdated: now,
          }),
        }).catch(() => {});
      } catch {}
    }

    setIsSyncing(false);
  };

  // Alias for backward compatibility with settings/color pickers
  const syncStateToServer = (updatedRooms: RoomConfig[], updatedSettings: AppSettings) => {
    handlePushSyncToServer(updatedRooms, updatedSettings, 'Pengaturan disinkronkan ke semua perangkat');
  };

  // Sync rooms and settings to localStorage
  useEffect(() => {
    localStorage.setItem('smadapas_token_rooms', JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem('smadapas_token_settings', JSON.stringify(settings));
  }, [settings]);

  // Apply state coming from other connected devices or tabs
  const applyRemoteState = (
    remoteRooms: RoomConfig[],
    remoteSettings: AppSettings,
    isInit = false
  ) => {
    isRemoteSyncingRef.current = true;

    // Check if any room token actually changed compared to current active state
    let tokenChanged = false;
    let changedRoomName = '';
    const currentActiveRooms = roomsRef.current;

    for (const r of remoteRooms) {
      const existing = currentActiveRooms.find((x) => x.id === r.id);
      if (existing && existing.token !== r.token && r.isActive) {
        tokenChanged = true;
        changedRoomName = r.name;
        markRoomTokenUpdated(r.id);
      }
    }

    setRooms(remoteRooms);
    setSettings(remoteSettings);
    setTempRooms(remoteRooms);
    setTempSettings(remoteSettings);
    setLastUpdated(Date.now());

    try {
      localStorage.setItem('smadapas_token_rooms', JSON.stringify(remoteRooms));
      localStorage.setItem('smadapas_token_settings', JSON.stringify(remoteSettings));
      lastPolledRoomsStr.current = JSON.stringify(remoteRooms);
      lastPolledSettingsStr.current = JSON.stringify(remoteSettings);
    } catch {}

    if (tokenChanged && !isInit) {
      triggerConfetti();
      if (remoteSettings.soundEnabled) {
        playToneNotification();
      }
      showToast(`⚡ Token ${changedRoomName || 'Ujian'} diperbarui dari perangkat lain!`);
    } else if (!isInit) {
      showToast('⚡ Tampilan disinkronkan dengan perangkat lain');
    }

    setTimeout(() => {
      isRemoteSyncingRef.current = false;
    }, 400);
  };

  // Polling tracker references
  const lastPolledRoomsStr = useRef<string>(JSON.stringify(rooms));
  const lastPolledSettingsStr = useRef<string>(JSON.stringify(settings));

  // Fetch server state with options (silent, force)
  const fetchServerState = async (options?: { force?: boolean; silent?: boolean }) => {
    const force = options?.force ?? false;
    const silent = options?.silent ?? true;

    setIsSyncing(true);
    try {
      const res = await fetch('/api/state?t=' + Date.now());
      if (res.ok) {
        const json = await res.json();
        if (typeof json.connectedDevices === 'number') {
          setConnectedDevices(Math.max(1, json.connectedDevices));
        }
        if (json.state && Array.isArray(json.state.rooms)) {
          const remoteRoomsStr = JSON.stringify(json.state.rooms);
          const remoteSettingsStr = JSON.stringify(json.state.settings);
          const localRoomsStr = JSON.stringify(roomsRef.current);
          const localSettingsStr = JSON.stringify(settingsRef.current);

          const hasDataDifference = remoteRoomsStr !== localRoomsStr || remoteSettingsStr !== localSettingsStr;
          const isNewer = (json.state.lastUpdated || 0) > lastUpdatedRef.current;

          if (force || isNewer || hasDataDifference || !hasInitialLoadedRef.current) {
            hasInitialLoadedRef.current = true;
            lastUpdatedRef.current = json.state.lastUpdated || Date.now();
            applyRemoteState(json.state.rooms, json.state.settings, !hasDataDifference && !isNewer);
            if (!silent) {
              showToast('✅ Data token disinkronkan dari server!');
            }
          } else if (!silent) {
            showToast('✅ Data sudah versi terbaru');
          }
        }
      } else if (!silent) {
        showToast('⚠️ Gagal menghubungi server sinkronisasi');
      }
    } catch {
      if (!silent) showToast('⚠️ Gagal melakukan sinkronisasi');
    } finally {
      setIsSyncing(false);
    }
  };

  // PULL SYNC: Explicitly pull latest tokens from server (for presenter/projector)
  const handlePullSyncFromServer = async () => {
    await fetchServerState({ force: true, silent: false });
  };

  // 2. window.addEventListener('storage') - Instant cross-tab sync when localStorage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'smadapas_token_rooms' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          applyRemoteState(parsed, settings, false);
        } catch {}
      } else if (e.key === 'smadapas_token_settings' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          applyRemoteState(rooms, parsed, false);
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [rooms, settings]);

  // 3. Real-time WebSocket + Polling Lifecycle
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;
    let isUnmounted = false;

    // Immediately fetch authoritative server state on mount
    fetchServerState({ force: false, silent: true });

    const connectWs = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isUnmounted) return;
          setConnectionStatus('connected');
          ws?.send(JSON.stringify({ type: 'get_state' }));
          fetchServerState({ force: false, silent: true });
        };

        ws.onmessage = (event) => {
          if (isUnmounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'init' && data.state) {
              lastUpdatedRef.current = data.state.lastUpdated || Date.now();
              applyRemoteState(data.state.rooms, data.state.settings, true);
              if (typeof data.connectedDevices === 'number') {
                setConnectedDevices(Math.max(1, data.connectedDevices));
              }
            } else if (data.type === 'state_updated' && data.state) {
              lastUpdatedRef.current = data.state.lastUpdated || Date.now();
              applyRemoteState(data.state.rooms, data.state.settings, false);
            } else if (data.type === 'presence' && typeof data.connectedDevices === 'number') {
              setConnectedDevices(Math.max(1, data.connectedDevices));
            }
          } catch (e) {
            console.error('Error handling WS event:', e);
          }
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          setConnectionStatus('connecting');
          reconnectTimer = setTimeout(connectWs, 2000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        setConnectionStatus('connecting');
        reconnectTimer = setTimeout(connectWs, 2500);
      }
    };

    connectWs();

    // BroadcastChannel for instant same-browser cross-tab sync
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('smadapas_token_sync_channel');
        broadcastChannelRef.current = bc;
        bc.onmessage = (ev) => {
          if (ev.data && ev.data.rooms && ev.data.settings) {
            if (ev.data.source !== clientIdRef.current) {
              applyRemoteState(ev.data.rooms, ev.data.settings, false);
            }
          }
        };
      }
    } catch {}

    // Polling fallback every 1 second (1000ms) to guarantee cross-device sync even if WS drops
    const pollInterval = setInterval(() => {
      fetchServerState({ force: false, silent: true });

      // If custom cloud sync is enabled, poll it as well
      if (settings.cloudSyncEnabled && settings.cloudSyncUrl?.trim()) {
        try {
          const cloudHeaders: Record<string, string> = {};
          if (settings.cloudSyncApiKey?.trim()) {
            cloudHeaders['Authorization'] = `Bearer ${settings.cloudSyncApiKey.trim()}`;
            cloudHeaders['X-Master-Key'] = settings.cloudSyncApiKey.trim();
          }
          fetch(settings.cloudSyncUrl.trim(), { headers: cloudHeaders })
            .then((r) => r.json())
            .then((cloudJson) => {
              const cloudData = cloudJson.record || cloudJson.data || cloudJson;
              if (cloudData.lastUpdated && cloudData.lastUpdated > lastUpdatedRef.current) {
                lastUpdatedRef.current = cloudData.lastUpdated;
                applyRemoteState(cloudData.rooms, cloudData.settings, false);
              }
            })
            .catch(() => {});
        } catch {}
      }
    }, 1000);

    return () => {
      isUnmounted = true;
      clearTimeout(reconnectTimer);
      clearInterval(pollInterval);
      if (ws) ws.close();
      if (broadcastChannelRef.current) broadcastChannelRef.current.close();
    };
  }, [settings.cloudSyncEnabled, settings.cloudSyncUrl, settings.cloudSyncApiKey]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen not supported or blocked by browser permissions
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  // INSTANT Background Color and Theme Switcher:
  // When user clicks ANY preset or custom color, it immediately changes color on screen!
  const applyBackgroundColor = (presetId: string, customColor?: string) => {
    let isTargetDark = false;
    let targetColor = '';

    if (presetId === 'custom') {
      targetColor = customColor || tempSettings.customBgColor || settings.customBgColor || '#FDFBF7';
      isTargetDark = isColorDark(targetColor);
    } else {
      const p = BACKGROUND_PRESETS.find((x) => x.id === presetId) || BACKGROUND_PRESETS[0];
      targetColor = p.bgColor;
      isTargetDark = p.isDark;
    }

    const updatedSettings: AppSettings = {
      ...settings,
      ...tempSettings,
      bgPreset: presetId,
      customBgColor: customColor ?? tempSettings.customBgColor ?? settings.customBgColor ?? '#FDFBF7',
      theme: isTargetDark ? 'dark' : 'light',
    };

    // Update both temporary modal state and active live settings immediately
    setTempSettings(updatedSettings);
    setSettings(updatedSettings);
    syncStateToServer(rooms, updatedSettings);

    const presetObj = BACKGROUND_PRESETS.find((x) => x.id === presetId);
    const label = presetId === 'custom' ? `Warna Kustom (${targetColor})` : (presetObj?.name || presetId);
    showToast(`Latar Belakang: ${label}`);
  };

  const applyPattern = (pattern: 'dots' | 'none') => {
    const updated: AppSettings = {
      ...settings,
      ...tempSettings,
      bgPattern: pattern,
    };
    setTempSettings(updated);
    setSettings(updated);
    syncStateToServer(rooms, updated);
    showToast(`Pola Layar: ${pattern === 'dots' ? 'Titik Halus' : 'Polos Bersih'}`);
  };

  const removeBgImage = () => {
    const updated: AppSettings = {
      ...settings,
      ...tempSettings,
      bgImageUrl: null,
    };
    setTempSettings(updated);
    setSettings(updated);
    syncStateToServer(rooms, updated);
    showToast('Foto Background Dihapus');
  };

  // Handle Admin Button Click
  const handleOpenAdminTrigger = () => {
    setPinInput('');
    setPinError(false);
    setIsPinModalOpen(true);
  };

  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinInput.trim() === settings.pin) {
      setIsPinModalOpen(false);
      setPinError(false);
      setTempRooms(JSON.parse(JSON.stringify(rooms)));
      setTempSettings({ ...settings });
      setNewPin('');
      setIsAdminOpen(true);
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 2000);
    }
  };

  // Save changes from Admin
  const handleSaveAdmin = () => {
    const updatedSettings = {
      ...tempSettings,
      pin: newPin.trim().length >= 4 ? newPin.trim() : tempSettings.pin,
    };

    // Mark tokens that changed for highlight flash
    tempRooms.forEach((tr) => {
      const prev = rooms.find((r) => r.id === tr.id);
      if (!prev || prev.token !== tr.token) {
        markRoomTokenUpdated(tr.id);
      }
    });

    setRooms(tempRooms);
    setSettings(updatedSettings);
    setIsAdminOpen(false);
    setLastUpdated(Date.now());
    syncStateToServer(tempRooms, updatedSettings);
    triggerConfetti();
    if (updatedSettings.soundEnabled) {
      playToneNotification();
    }
    showToast('Pengaturan Token Berhasil Disimpan!');
  };

  // Quick Randomize Single Token
  const handleRandomizeTempToken = (index: number) => {
    const updated = [...tempRooms];
    updated[index].token = generateRandomToken();
    setTempRooms(updated);
    markRoomTokenUpdated(updated[index].id);
  };

  // Upload and compress custom background image
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const handleBgFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingBg(true);
      const compressedDataUrl = await compressAndReadImage(file);
      const updated: AppSettings = {
        ...settings,
        ...tempSettings,
        bgImageUrl: compressedDataUrl,
        bgImageFit: tempSettings.bgImageFit || 'cover',
        bgImageOpacity: tempSettings.bgImageOpacity ?? 0.85,
      };
      setTempSettings(updated);
      setSettings(updated);
      syncStateToServer(rooms, updated);
      showToast('Gambar latar belakang berhasil diunggah!');
    } catch {
      showToast('Gagal memproses gambar. Gunakan file JPG atau PNG.');
    } finally {
      setIsUploadingBg(false);
      e.target.value = '';
    }
  };

  // Quick Speak Token for Students/Proctors
  const handleSpeakToken = (roomName: string, token: string) => {
    if ('speechSynthesis' in window) {
      const spacedToken = token.split('').join(' ');
      const utterance = new SpeechSynthesisUtterance(`Token untuk ${roomName} adalah ${spacedToken}`);
      utterance.lang = 'id-ID';
      utterance.rate = 0.85;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      showToast(`Membacakan token ${roomName}...`);
    } else {
      showToast('Fitur text-to-speech tidak didukung di browser ini.');
    }
  };

  const handleCopyToken = (id: string, token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedId(id);
    triggerConfetti();
    showToast(`Token ${token} disalin ke clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Keyboard shortcuts for PC screen display (F for fullscreen, A for admin, D for dark mode, +/- for token size)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleOpenAdminTrigger();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setSettings((prev) => {
          const currentPreset = BACKGROUND_PRESETS.find((p) => p.id === prev.bgPreset);
          const willBeDark = !(currentPreset ? currentPreset.isDark : prev.theme === 'dark');
          return {
            ...prev,
            theme: willBeDark ? 'dark' : 'light',
            bgPreset: willBeDark ? 'dark-navy' : 'cream',
          };
        });
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setSettings((prev) => {
          const nextScale = prev.tokenScale === 'large' ? 'medium' : 'small';
          showToast(`Ukuran Token: ${nextScale === 'small' ? 'Kecil' : 'Sedang'}`);
          return { ...prev, tokenScale: nextScale };
        });
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        setSettings((prev) => {
          const nextScale = prev.tokenScale === 'small' ? 'medium' : 'large';
          showToast(`Ukuran Token: ${nextScale === 'large' ? 'Besar' : 'Sedang'}`);
          return { ...prev, tokenScale: nextScale };
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.theme, settings.tokenScale]);

  // Active rooms for the main display
  const activeRooms = rooms.filter((r) => r.isActive);

  // Background and dark mode resolution
  const currentBgPreset = BACKGROUND_PRESETS.find((p) => p.id === settings.bgPreset) || BACKGROUND_PRESETS[0];
  const effectiveBgColor = settings.bgPreset === 'custom'
    ? (settings.customBgColor || '#FDFBF7')
    : currentBgPreset.bgColor;
  const isDark = settings.bgPreset === 'custom'
    ? isColorDark(effectiveBgColor)
    : currentBgPreset.isDark;

  const handleToggleTheme = () => {
    const currentPreset = BACKGROUND_PRESETS.find((p) => p.id === settings.bgPreset);
    const willBeDark = !(currentPreset ? currentPreset.isDark : settings.theme === 'dark');
    const updated: AppSettings = {
      ...settings,
      theme: willBeDark ? 'dark' : 'light',
      bgPreset: willBeDark ? 'dark-navy' : 'cream',
    };
    setSettings(updated);
    setTempSettings(updated);
    syncStateToServer(rooms, updated);
  };

  return (
    <div
      ref={containerRef}
      style={{ backgroundColor: effectiveBgColor }}
      className={`relative w-screen h-screen max-h-screen select-none overflow-hidden flex flex-col justify-between font-sans transition-colors duration-300 ${
        isDark ? 'text-slate-100' : 'text-slate-900'
      } ${settings.bgPattern === 'dots' ? (isDark ? 'bg-grid-subtle-dark' : 'bg-grid-subtle') : ''}`}
    >
      {/* Custom Uploaded Background Image Layer */}
      {settings.bgImageUrl && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-500 z-0"
          style={{
            backgroundImage: `url(${settings.bgImageUrl})`,
            backgroundSize: settings.bgImageFit || 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: settings.bgImageOpacity ?? 0.85,
          }}
        />
      )}

      {/* Subtle ambient warm lighting in center */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.06)_0%,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.08)_0%,transparent_65%)]" />

      {/* Confetti Celebration Overlay */}
      {confettiActive && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => {
            const left = (i * 3.33) + (Math.sin(i) * 2);
            const delay = (i % 6) * 0.12;
            const size = 6 + (i % 8);
            const colors = ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316'];
            const color = colors[i % colors.length];
            return (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${left}%`,
                  top: '-20px',
                  width: `${size}px`,
                  height: `${size * 1.4}px`,
                  backgroundColor: color,
                  borderRadius: i % 2 === 0 ? '50%' : '2px',
                  transform: `rotate(${i * 24}deg)`,
                  animation: `tokenPop 0.8s ease-out, gentleFloat 2.2s ease-in forwards`,
                  animationDelay: `${delay}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOATING ACTION BAR (Top-Right / Minimal & Discrete for Presenter) */}
      {/* ========================================================================= */}
      <div className="absolute top-2.5 right-3.5 z-40 flex items-center gap-1.5 print:hidden opacity-70 hover:opacity-100 transition-opacity duration-200">
        {/* Real-time Multi-Device Sync Button with Action Menu */}
        <div className="relative">
          <div className="flex items-center rounded-full backdrop-blur-md border border-emerald-400/50 shadow-xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => handlePushSyncToServer(undefined, undefined, '⚡ Token berhasil disinkronkan ke perangkat lain!')}
              title="Klik untuk mengirim token di layar ini ke semua proyektor & HP lain secara instan"
              className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold transition-all cursor-pointer hover:opacity-90 active:scale-95 ${
                connectionStatus === 'connected'
                  ? isDark
                    ? 'bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900/90'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 hover:bg-amber-200'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0 ${isSyncing ? 'animate-bounce' : ''}`} />
              <span>Sinkronkan Token</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <RefreshCw className={`w-3 h-3 text-emerald-600/80 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>

            {/* Dropdown toggle for options */}
            <button
              type="button"
              onClick={() => setIsSyncMenuOpen((v) => !v)}
              title="Pilihan Sinkronisasi (Kirim / Tarik Token)"
              className={`px-1.5 py-1 border-l transition-all cursor-pointer ${
                isDark
                  ? 'bg-emerald-950/90 border-emerald-800 text-emerald-300 hover:bg-emerald-900'
                  : 'bg-emerald-100/90 border-emerald-300 text-emerald-800 hover:bg-emerald-200'
              }`}
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${isSyncMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Sync Options Dropdown */}
          {isSyncMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 p-3 rounded-2xl shadow-2xl border backdrop-blur-xl z-50 animate-token-pop bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  Menu Sinkronisasi Real-Time
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                  {connectedDevices} Perangkat
                </span>
              </div>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsSyncMenuOpen(false);
                    handlePushSyncToServer(undefined, undefined, '⚡ Token berhasil disinkronkan ke semua perangkat & proyektor!');
                  }}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-transparent hover:border-emerald-300 dark:hover:border-emerald-700 transition flex items-start gap-2.5 cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                    <Zap className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-emerald-900 dark:text-emerald-200">
                      ⚡ Kirim Token ke Semua Layar (Push)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
                      Kirim token di layar ini ke proyektor aula & HP pengawas seketika.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSyncMenuOpen(false);
                    handlePullSyncFromServer();
                  }}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-transparent hover:border-blue-300 dark:hover:border-blue-700 transition flex items-start gap-2.5 cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                    <ArrowDownCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-blue-900 dark:text-blue-200">
                      📥 Ambil Token dari Server (Pull)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-tight">
                      Perbarui token di layar ini jika proyektor belum menerima update terbaru.
                    </span>
                  </div>
                </button>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Status: {connectionStatus === 'connected' ? '🟢 Online (Terhubung)' : '🟡 Menghubungkan...'}</span>
                <button
                  type="button"
                  onClick={() => setIsSyncMenuOpen(false)}
                  className="font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Palette Background Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsQuickPaletteOpen((v) => !v)}
            title="Ganti Warna Latar Belakang Cepat"
            className={`p-1.5 sm:p-2 rounded-full backdrop-blur-md transition-all duration-200 border cursor-pointer ${
              isQuickPaletteOpen
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md scale-105'
                : isDark
                ? 'bg-slate-800/80 text-amber-300 border-slate-700 hover:bg-slate-700'
                : 'bg-white/80 text-slate-700 border-slate-200 shadow-sm hover:bg-white hover:text-slate-950'
            }`}
          >
            <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Quick Palette Popover Menu */}
          {isQuickPaletteOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 p-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl z-50 animate-token-pop bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-emerald-600" />
                  Pilih Warna Background
                </span>
                <button
                  onClick={() => setIsQuickPaletteOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Color Swatches Grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {BACKGROUND_PRESETS.map((preset) => {
                  const isSelected = settings.bgPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyBackgroundColor(preset.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-sm scale-[1.03] bg-emerald-50/50 dark:bg-emerald-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-full border border-black/20 shadow-xs flex items-center justify-center shrink-0"
                        style={{ backgroundColor: preset.bgColor }}
                      >
                        {isSelected && (
                          <Check className={`w-3.5 h-3.5 ${preset.isDark ? 'text-white' : 'text-emerald-700'}`} />
                        )}
                      </span>
                      <span className="text-[10px] font-bold truncate max-w-full leading-tight">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Picker in Quick Menu */}
              <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Bebas Custom:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.customBgColor || '#FDFBF7'}
                    onChange={(e) => applyBackgroundColor('custom', e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                    title="Pilih warna bebas"
                  />
                  <span className="text-[10px] font-mono text-slate-400">
                    {settings.customBgColor || '#FDFBF7'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Toggle Theme */}
        <button
          onClick={handleToggleTheme}
          title={isDark ? 'Mode Terang (Tekan D)' : 'Mode Gelap (Tekan D)'}
          className={`p-1.5 sm:p-2 rounded-full backdrop-blur-md transition-all duration-200 border cursor-pointer ${
            isDark
              ? 'bg-slate-800/80 text-amber-400 border-slate-700 hover:bg-slate-700'
              : 'bg-white/80 text-slate-700 border-slate-200 shadow-sm hover:bg-white hover:text-slate-950'
          }`}
        >
          {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Keluar Fullscreen (Esc / F)' : 'Layar Penuh Proyektor (Tekan F)'}
          className={`p-1.5 sm:p-2 rounded-full backdrop-blur-md transition-all duration-200 border cursor-pointer ${
            isDark
              ? 'bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-700'
              : 'bg-white/80 text-slate-700 border-slate-200 shadow-sm hover:bg-white hover:text-slate-950'
          }`}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* Admin Settings Button */}
        <button
          onClick={handleOpenAdminTrigger}
          title="Pengaturan Admin Token (Tekan A)"
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full font-semibold text-xs backdrop-blur-md transition-all duration-200 border shadow-sm cursor-pointer ${
            isDark
              ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-500'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Admin</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TOP HEADER SECTION (Compact fixed height for PC screen) */}
      {/* ========================================================================= */}
      <header className="relative w-full h-[13vh] min-h-[64px] max-h-[96px] px-4 sm:px-8 lg:px-12 flex items-center justify-between z-20 shrink-0">
        {/* Left: School Logo & Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 group cursor-pointer" onClick={handleOpenAdminTrigger}>
          {/* Authentic School Circular Badge Icon with polished metallic ring */}
          <div className="relative w-11 h-11 sm:w-14 sm:h-14 lg:w-15 lg:h-15 shrink-0 flex items-center justify-center transition-transform group-hover:scale-105">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
              <circle cx="50" cy="50" r="47" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="#1e3a8a" strokeWidth="3" />
              <circle cx="50" cy="50" r="41" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3 2" />
              <circle cx="50" cy="50" r="38" fill="#1e3a8a" />
              <circle cx="50" cy="50" r="32" fill="#ffffff" />
              <path
                d="M 30 65 Q 40 60 50 64 Q 60 60 70 65 L 70 56 Q 60 51 50 55 Q 40 51 30 56 Z"
                fill="#2563eb"
              />
              <path
                d="M 32 63 Q 40 59 50 63 Q 60 59 68 63 L 68 57 Q 60 53 50 56 Q 40 53 32 57 Z"
                fill="#ffffff"
              />
              <path d="M 47 52 L 53 52 L 51 40 L 49 40 Z" fill="#d97706" />
              <path d="M 50 28 Q 55 34 52 39 Q 50 43 47 38 Q 45 33 50 28 Z" fill="#ef4444" />
              <path d="M 50 31 Q 53 35 51 38 Q 49 40 48 37 Q 47 34 50 31 Z" fill="#f59e0b" />
              <polygon
                points="50,18 52,23 57,23 53,26 55,31 50,28 45,31 47,26 43,23 48,23"
                fill="#fbbf24"
              />
            </svg>
          </div>

          {/* School Name Typography with clean separator */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className={`w-[2px] h-8 sm:h-11 ${isDark ? 'bg-slate-500' : 'bg-slate-800'}`} />
            <div className="flex flex-col text-left">
              <span
                className={`text-xs sm:text-sm lg:text-base font-extrabold tracking-wider leading-none ${
                  isDark ? 'text-slate-100' : 'text-[#1e293b]'
                }`}
              >
                SMANEGERI 2
              </span>
              <span
                className={`text-[9px] sm:text-[11px] font-bold tracking-[0.32em] mt-0.5 leading-none ${
                  isDark ? 'text-slate-300' : 'text-[#334155]'
                }`}
              >
                K O T A
              </span>
              <span
                className={`text-[11px] sm:text-xs lg:text-sm font-black tracking-wider mt-0.5 leading-none ${
                  isDark ? 'text-slate-200' : 'text-[#1e293b]'
                }`}
              >
                PASURUAN
              </span>
            </div>
          </div>
        </div>

        {/* Center: Olive-Green Capsule Banner "TOKEN" + Live Digital Clock */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <div
            className={`relative overflow-hidden px-8 sm:px-14 md:px-20 lg:px-28 py-1.5 sm:py-2.5 rounded-full shadow-sm flex items-center justify-center transition-all duration-300 hover:scale-105 ${
              isDark
                ? 'bg-[#84b860] border-2 border-[#6ea04c] text-black shadow-lg shadow-lime-900/30'
                : 'bg-[#98c775] border border-[#86b563] text-black shadow-sm'
            }`}
          >
            {/* Shimmer glossy light bar across capsule */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer pointer-events-none" />

            <h1 className="relative text-lg sm:text-2xl md:text-3xl font-black tracking-widest text-black">
              {settings.bannerText || 'TOKEN'}
            </h1>
          </div>

          {/* Discreet live clock badge for exam proctors */}
          {currentTime && (
            <div className="mt-1 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[10px] sm:text-[11px] font-bold font-mono tracking-wider opacity-75">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{currentTime}</span>
            </div>
          )}
        </div>

        {/* Right: Comic Pop-Art Announcement Balloon with Authentic TANDA SERU (!) (Sesuai Referensi Gambar 234.png) */}
        <div className="relative w-28 sm:w-36 md:w-44 h-12 sm:h-16 shrink-0 pointer-events-none flex items-center justify-end animate-gentle-float">
          <svg viewBox="0 0 170 95" className="w-full h-full overflow-visible drop-shadow-sm">
            {/* Golden Yellow Speech Cloud / Bubble Outline */}
            <path
              d="M 35 72 Q 18 52 32 28 Q 58 6 98 16 Q 138 2 152 32 Q 166 65 138 82 Q 115 90 95 83 Q 78 88 58 83 Z"
              fill={isDark ? 'rgba(245, 184, 46, 0.12)' : 'rgba(254, 240, 138, 0.3)'}
              stroke="#f5b82e"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Comic Action Energy Rays */}
            <line x1="22" y1="22" x2="12" y2="12" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="95" y1="8" x2="95" y2="1" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="156" y1="20" x2="167" y2="12" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="160" y1="55" x2="170" y2="58" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />

            {/* Main Primary Pop-Art TANDA SERU (!) */}
            <g transform="translate(85, 18) rotate(4)">
              {/* 3D Black Drop Shadow */}
              <path
                d="M 4 2 L 14 2 L 11 38 L 7 38 Z"
                fill="#000000"
                transform="translate(2.5, 2.5)"
              />
              <circle cx="9" cy="48" r="5" fill="#000000" transform="translate(2.5, 2.5)" />

              {/* Cyan / Teal 3D Anaglyph Offset (Pop Art Style) */}
              <path
                d="M 4 2 L 14 2 L 11 38 L 7 38 Z"
                fill="#06b6d4"
                transform="translate(1.2, 1.2)"
              />
              <circle cx="9" cy="48" r="5" fill="#06b6d4" transform="translate(1.2, 1.2)" />

              {/* Red Exclamation Mark Body Stem */}
              <path
                d="M 4 2 Q 4 0 9 0 Q 14 0 14 2 L 11 38 Q 9 40 7 38 Z"
                fill="#e81922"
                stroke="#000000"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              {/* White Glossy Reflection on Stem */}
              <path
                d="M 6 3 L 7.5 3 L 6 34 L 5.2 34 Z"
                fill="#ffffff"
                opacity="0.85"
              />

              {/* Red Exclamation Mark Dot */}
              <circle
                cx="9"
                cy="48"
                r="4.8"
                fill="#e81922"
                stroke="#000000"
                strokeWidth="1.5"
              />
              <circle cx="7.5" cy="46.5" r="1.5" fill="#ffffff" opacity="0.9" />
            </g>

            {/* Secondary Lively TANDA SERU (!) - Tilted Comic Angle */}
            <g transform="translate(118, 25) rotate(16) scale(0.72)">
              <path
                d="M 4 2 L 13 2 L 10 34 L 7 34 Z"
                fill="#000000"
                transform="translate(2, 2)"
              />
              <circle cx="8.5" cy="43" r="4.5" fill="#000000" transform="translate(2, 2)" />

              <path
                d="M 4 2 L 13 2 L 10 34 L 7 34 Z"
                fill="#06b6d4"
                transform="translate(1, 1)"
              />
              <circle cx="8.5" cy="43" r="4.5" fill="#06b6d4" transform="translate(1, 1)" />

              <path
                d="M 4 2 Q 4 0 8.5 0 Q 13 0 13 2 L 10 34 Q 8.5 36 7 34 Z"
                fill="#ef4444"
                stroke="#000000"
                strokeWidth="1.5"
              />
              <path
                d="M 5.5 3 L 7 3 L 5.8 28 L 5 28 Z"
                fill="#ffffff"
                opacity="0.85"
              />
              <circle cx="8.5" cy="43" r="4.2" fill="#ef4444" stroke="#000000" strokeWidth="1.5" />
              <circle cx="7.2" cy="41.5" r="1.2" fill="#ffffff" opacity="0.9" />
            </g>

            {/* Mini Accent TANDA SERU (!) on Left for Festive Comic Burst */}
            <g transform="translate(56, 32) rotate(-14) scale(0.58)">
              <path
                d="M 4 2 L 13 2 L 10 32 L 7 32 Z"
                fill="#000000"
                transform="translate(2, 2)"
              />
              <circle cx="8.5" cy="41" r="4.5" fill="#000000" transform="translate(2, 2)" />
              <path
                d="M 4 2 Q 4 0 8.5 0 Q 13 0 13 2 L 10 32 Q 8.5 34 7 32 Z"
                fill="#f59e0b"
                stroke="#000000"
                strokeWidth="1.5"
              />
              <circle cx="8.5" cy="41" r="4.2" fill="#f59e0b" stroke="#000000" strokeWidth="1.5" />
            </g>

            {/* Festive Star & Dot Sparks */}
            <circle cx="45" cy="62" r="2.8" fill="#ef4444" opacity="0.9" />
            <circle cx="146" cy="42" r="2.5" fill="#f59e0b" opacity="0.9" />
            <circle cx="138" cy="70" r="3" fill="#ef4444" opacity="0.85" />
          </svg>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN TOKEN DISPLAY AREA (FLEX-1, AUTO-CENTERED, NO SCROLL) */}
      {/* ========================================================================= */}
      <main className="relative flex-1 min-h-0 w-full px-4 sm:px-8 lg:px-14 flex items-center justify-center z-10">
        {/* Left Side: Vertical Stacked Colorful Rectangles (from 123.png) */}
        <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-1.5 sm:gap-2 z-0">
          <div className="w-6 sm:w-8 lg:w-9 h-6 sm:h-8 lg:h-9 bg-[#e65135] rounded-xs shadow-xs" />
          <div className="w-6 sm:w-8 lg:w-9 h-6 sm:h-8 lg:h-9 bg-[#eab042] rounded-xs shadow-xs -ml-1.5" />
          <div className="w-6 sm:w-8 lg:w-9 h-6 sm:h-8 lg:h-9 bg-[#027285] rounded-xs shadow-xs" />
          <div className="w-6 sm:w-8 lg:w-9 h-6 sm:h-8 lg:h-9 bg-[#e65135] rounded-xs shadow-xs -ml-1.5" />
          <div className="w-6 sm:w-8 lg:w-9 h-6 sm:h-8 lg:h-9 bg-[#eab042] rounded-xs shadow-xs" />
          <div className="w-6 sm:w-8 lg:w-9 h-6 sm:h-8 lg:h-9 bg-[#027285] rounded-xs shadow-xs -ml-1.5" />
        </div>

        {/* Active Rooms Grid Container */}
        {activeRooms.length === 0 ? (
          <div className="text-center py-10 px-6 bg-white/70 dark:bg-slate-800/70 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-md mx-auto">
            <Info className="w-10 h-10 mx-auto text-amber-500 mb-2" />
            <h2 className="text-lg font-bold mb-1">Tidak Ada Ruangan Aktif</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Silakan buka Panel Admin untuk mengaktifkan ruangan ujian.
            </p>
            <button
              onClick={handleOpenAdminTrigger}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition"
            >
              Buka Panel Admin (A)
            </button>
          </div>
        ) : (
          <div className="w-full h-full max-w-7xl mx-auto flex flex-col md:flex-row items-stretch justify-center relative">
            {activeRooms.map((room, index) => {
              const hasDividerAfter = index < activeRooms.length - 1;

              return (
                <React.Fragment key={room.id}>
                  {/* Single Room Column */}
                  <div className="flex-1 flex flex-col items-center justify-center px-2 sm:px-6 lg:px-8 py-2 text-center group">
                    {/* Room Name: Golden Yellow Bold */}
                    <div className="flex items-center gap-2 mb-1 sm:mb-2">
                      <h2
                        className={`${getRoomNameClasses(settings.tokenScale, activeRooms.length)} font-black uppercase tracking-wider transition-colors ${
                          isDark ? 'text-[#f5be38]' : 'text-[#e5a519]'
                        }`}
                        style={{
                          textShadow: isDark
                            ? '0 2px 10px rgba(245, 190, 56, 0.4)'
                            : '1px 2px 0px rgba(0,0,0,0.12)',
                        }}
                      >
                        {room.name}
                      </h2>
                    </div>

                    {/* Token Code: Compact Italic Red 3D Anaglyph Pop-Art with sleek pedestal & flash update */}
                    {(() => {
                      const isRecentlyUpdated = Boolean(recentlyUpdatedTokens[room.id]);
                      return (
                        <div
                          key={`${room.id}-${room.token}-${lastUpdated}`}
                          className={`relative my-1 sm:my-2 px-4 sm:px-7 py-2 sm:py-3 rounded-2xl backdrop-blur-xs border transition-all duration-300 hover:scale-[1.03] cursor-pointer group/token ${
                            isRecentlyUpdated
                              ? isDark
                                ? 'animate-token-flash-dark ring-4 ring-amber-400 bg-amber-950/70 border-amber-400 shadow-2xl'
                                : 'animate-token-flash ring-4 ring-amber-500 bg-amber-100/95 border-amber-400 shadow-2xl'
                              : isDark
                              ? 'bg-slate-800/40 border-slate-700/60 shadow-xs hover:shadow-md animate-token-pop'
                              : 'bg-white/40 border-amber-500/10 shadow-xs hover:shadow-md animate-token-pop'
                          }`}
                          onClick={() => handleCopyToken(room.id, room.token)}
                          title="Klik untuk menyalin token"
                        >
                          {/* Animated Badge if Token Was Recently Updated */}
                          {isRecentlyUpdated && (
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 px-3 py-0.5 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 text-white text-[10px] font-black tracking-widest uppercase shadow-xl border-2 border-yellow-200 animate-bounce flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                              <Sparkles className="w-3.5 h-3.5 text-yellow-200 animate-spin" />
                              <span>TOKEN DIPERBARUI!</span>
                            </div>
                          )}

                          <span
                            className={`inline-block select-all leading-none ${
                              isRecentlyUpdated ? 'animate-token-text-burst' : ''
                            } ${isDark ? 'token-3d-text-dark' : 'token-3d-text'} ${getTokenSizeClasses(
                              settings.tokenScale,
                              activeRooms.length
                            )} tracking-wider`}
                          >
                            {room.token}
                          </span>

                          {/* Copied indicator tooltip */}
                          {copiedId === room.id && (
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black text-white text-[11px] font-bold px-2.5 py-0.5 rounded shadow-lg animate-bounce flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Disalin!</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Quick Action buttons below token */}
                    <div className="mt-1 sm:mt-2 flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleSpeakToken(room.name, room.token)}
                        title="Dengarkan pembacaan token"
                        className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      </button>
                      <button
                        onClick={() => handleCopyToken(room.id, room.token)}
                        title="Salin token"
                        className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      </button>
                      <button
                        onClick={() => {
                          handlePushSyncToServer(undefined, undefined, `⚡ Token ${room.name} (${room.token}) dikirim ke semua layar!`);
                        }}
                        title="Sinkronkan token ruangan ini ke semua proyektor & HP"
                        className="p-1 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition cursor-pointer text-emerald-600 dark:text-emerald-400"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>

                  {/* Thick Vertical Divider Line (Exact to 123.png with clean architectural tips) */}
                  {hasDividerAfter && (
                    <div className="hidden md:flex flex-col items-center justify-between self-stretch my-2">
                      <div className={`w-2.5 h-2.5 rotate-45 ${isDark ? 'bg-slate-500' : 'bg-black'}`} />
                      <div className={`w-1.5 flex-1 rounded-full my-1 ${isDark ? 'bg-slate-700' : 'bg-black'}`} />
                      <div className={`w-2.5 h-2.5 rotate-45 ${isDark ? 'bg-slate-500' : 'bg-black'}`} />
                    </div>
                  )}

                  {/* Mobile horizontal divider */}
                  {hasDividerAfter && (
                    <div
                      className={`block md:hidden h-1 w-3/4 mx-auto my-1.5 rounded-full ${
                        isDark ? 'bg-slate-700' : 'bg-black'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* BOTTOM FOOTER SECTION (CLIPPED INSIDE VIEWPORT, STRICT PROPORTIONS) */}
      {/* ========================================================================= */}
      <footer className="relative w-full h-[22vh] min-h-[110px] max-h-[170px] px-4 sm:px-8 z-20 flex items-end justify-between shrink-0 pointer-events-none pb-2 sm:pb-3">
        {/* Bottom Left: Happy SMA Students Waving */}
        <div className="relative w-44 sm:w-56 md:w-64 lg:w-72 h-full flex items-end shrink-0">
          <div className="absolute top-1 left-4 hidden sm:block">
            <div className="flex flex-col gap-0.5">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-[#f87171]/80" />
                <span className="w-2 h-2 rounded-full bg-[#f87171]/70" />
              </div>
              <div className="flex gap-1 ml-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f87171]/80" />
                <span className="w-2 h-2 rounded-full bg-[#f87171]/70" />
              </div>
            </div>
          </div>

          <img
            src={studentsWavingImg}
            alt="Siswa SMA Negeri 2 Pasuruan bergembira"
            className="w-full h-full object-contain object-bottom drop-shadow-md rounded-xl"
            style={{
              mixBlendMode: isDark ? 'screen' : 'multiply',
              filter: isDark ? 'contrast(1.1) brightness(0.95)' : 'none',
            }}
          />
        </div>

        {/* Footer Labels (TIM TKA & SMADAPAS 2026) */}
        <div className="flex-1 h-full flex flex-row items-end justify-between md:justify-around px-2 sm:px-6 pb-2 sm:pb-4 z-30 pointer-events-auto">
          {/* Left-Center Footer Text */}
          <div
            onClick={handleOpenAdminTrigger}
            className="cursor-pointer group flex items-center gap-1.5"
            title="Klik untuk membuka pengaturan"
          >
            <span
              className={`text-lg sm:text-2xl md:text-3xl font-black tracking-wider transition-colors ${
                isDark ? 'text-slate-200 group-hover:text-emerald-400' : 'text-black group-hover:text-emerald-600'
              }`}
            >
              {settings.footerLeft || 'TIM TKA'}
            </span>
          </div>

          {/* Right-Center Footer Text */}
          <div
            onClick={handleOpenAdminTrigger}
            className="cursor-pointer group flex items-center gap-1.5"
            title="Klik untuk membuka pengaturan"
          >
            <span
              className={`text-lg sm:text-2xl md:text-3xl font-black tracking-wider transition-colors ${
                isDark ? 'text-slate-200 group-hover:text-emerald-400' : 'text-black group-hover:text-emerald-600'
              }`}
            >
              {settings.footerRight || 'SMADAPAS 2026'}
            </span>
          </div>
        </div>

        {/* Bottom Right: Students Celebrating with Trophy & Gold Medal */}
        <div className="relative w-48 sm:w-64 md:w-72 lg:w-80 h-full flex items-end justify-end shrink-0">
          <img
            src={studentsCelebratingImg}
            alt="Siswa berprestasi merayakan dengan piala"
            className="w-full h-full object-contain object-bottom drop-shadow-md rounded-xl"
            style={{
              mixBlendMode: isDark ? 'screen' : 'multiply',
              filter: isDark ? 'contrast(1.1) brightness(0.95)' : 'none',
            }}
          />

          {/* Gold Star Medal Sticker Badge at bottom right corner (from 123.png) */}
          <div className="absolute -bottom-1 right-0 w-12 h-12 sm:w-15 sm:h-15 lg:w-17 lg:h-17 drop-shadow-xl z-20 hover:scale-105 transition-transform">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              <polygon points="35,65 24,98 42,91 50,75" fill="#dc2626" />
              <polygon points="65,65 76,98 58,91 50,75" fill="#b91c1c" />
              <circle cx="50" cy="50" r="35" fill="#f59e0b" stroke="#d97706" strokeWidth="3" />
              <circle cx="50" cy="50" r="29" fill="#fbbf24" />
              <circle cx="50" cy="50" r="26" fill="none" stroke="#fef08a" strokeWidth="1" strokeDasharray="3 2" />
              <polygon
                points="50,28 55,42 70,42 58,51 63,65 50,56 37,65 42,51 30,42 45,42"
                fill="#ffffff"
                opacity="0.95"
              />
            </svg>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* PIN AUTHENTICATION MODAL */}
      {/* ========================================================================= */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border transition-all ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold">Verifikasi Admin</h3>
              </div>
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Masukkan PIN Admin untuk mengubah pengaturan ruang dan token (Default PIN: <strong>1234</strong>).
            </p>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  autoFocus
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Ketik PIN..."
                  className={`w-full text-center text-2xl tracking-[0.5em] font-mono py-3 px-4 rounded-xl border-2 transition-all outline-none ${
                    pinError
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20 text-red-600'
                      : isDark
                      ? 'bg-slate-800 border-slate-700 focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-200 focus:border-emerald-600 focus:bg-white'
                  }`}
                />
                {pinError && (
                  <p className="text-xs text-red-500 text-center mt-1.5 font-medium">
                    PIN salah! Silakan coba lagi.
                  </p>
                )}
              </div>

              {/* Quick Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === 'C') {
                        setPinInput('');
                      } else if (key === 'OK') {
                        handleVerifyPin();
                      } else {
                        if (pinInput.length < 8) {
                          setPinInput((prev) => prev + key);
                        }
                      }
                    }}
                    className={`py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                      key === 'OK'
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : key === 'C'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-400'
                        : isDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                  Masuk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADMIN CONTROL PANEL MODAL */}
      {/* ========================================================================= */}
      {isAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div
            className={`w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border transition-all ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-600 text-white">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Panel Pengaturan Token & Ruangan</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Kelola token aktif, status ruangan, dan teks display proyektor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Real-time Multi-Device Sync Banner */}
              <div className="p-3 sm:p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Terkoneksi Antar-Perangkat (Real-Time Sync)
                    </span>
                    <span className="block text-[11px] text-slate-600 dark:text-slate-400">
                      Perubahan token, ruangan, dan background di sini otomatis tersinkron ke proyektor aula dan perangkat lain.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      handlePushSyncToServer(tempRooms, tempSettings, '⚡ Token berhasil disinkronkan ke layar proyektor & semua perangkat!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current text-amber-300" />
                    <span>Sinkronkan ke Proyektor</span>
                  </button>
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 border border-emerald-500/30 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shadow-xs">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{connectedDevices} Perangkat</span>
                  </div>
                </div>
              </div>

              {/* Presets Button Bar */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
                  Layout Cepat:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = tempRooms.map((r, i) => ({ ...r, isActive: i === 0 }));
                      setTempRooms(updated);
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                      tempRooms.filter((r) => r.isActive).length === 1
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : isDark
                        ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                        : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    1 Kolom (1 Ruang)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = tempRooms.map((r, i) => ({ ...r, isActive: i < 2 }));
                      setTempRooms(updated);
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                      tempRooms.filter((r) => r.isActive).length === 2
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : isDark
                        ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                        : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    2 Kolom (Seperti Referensi)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = tempRooms.map((r, i) => ({ ...r, isActive: i < 3 }));
                      setTempRooms(updated);
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                      tempRooms.filter((r) => r.isActive).length >= 3
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : isDark
                        ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                        : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    3 Kolom (3 Ruang)
                  </button>
                </div>
              </div>

              {/* Token Size Controller */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Ukuran Tampilan Token (PC / Proyektor):
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Pintasan keyboard: <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono">-</kbd> / <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono">+</kbd>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['small', 'medium', 'large'] as const).map((scale) => {
                    const label =
                      scale === 'small'
                        ? 'Kecil (Kompak)'
                        : scale === 'medium'
                        ? 'Sedang (Proporsional)'
                        : 'Besar';
                    const isSelected = tempSettings.tokenScale === scale;
                    return (
                      <button
                        key={scale}
                        type="button"
                        onClick={() => setTempSettings({ ...tempSettings, tokenScale: scale })}
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                          isSelected
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : isDark
                            ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                            : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Menu Ubah Background (Latar Belakang) */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-emerald-600" />
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Ubah Latar Belakang (Background)
                    </label>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pilih Tema / Warna Bebas
                  </span>
                </div>

                {/* Preset Swatches */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BACKGROUND_PRESETS.map((preset) => {
                    const isSelected = tempSettings.bgPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyBackgroundColor(preset.id)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-md scale-[1.02] bg-emerald-50/40 dark:bg-emerald-950/30'
                            : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:scale-[1.01]'
                        }`}
                        style={{ backgroundColor: preset.isDark ? '#1e293b' : '#ffffff' }}
                      >
                        <span
                          className="w-5 h-5 rounded-full shrink-0 border border-black/20 shadow-xs flex items-center justify-center"
                          style={{ backgroundColor: preset.bgColor }}
                        >
                          {isSelected && (
                            <Check className={`w-3 h-3 ${preset.isDark ? 'text-white' : 'text-emerald-700'}`} />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span
                            className={`block text-[11px] font-bold truncate leading-tight ${
                              preset.isDark ? 'text-slate-100' : 'text-slate-800'
                            }`}
                          >
                            {preset.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {/* Custom Color Picker Swatch */}
                  <div
                    className={`flex items-center gap-2 p-1.5 sm:p-2 rounded-xl border transition-all ${
                      tempSettings.bgPreset === 'custom'
                        ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-md scale-[1.02] bg-white dark:bg-slate-800'
                        : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="color"
                      value={tempSettings.customBgColor || '#FDFBF7'}
                      onChange={(e) => {
                        const val = e.target.value;
                        applyBackgroundColor('custom', val);
                      }}
                      className="w-7 h-7 rounded-md cursor-pointer border-0 p-0 shrink-0 bg-transparent"
                      title="Pilih palet warna kustom langsung"
                    />
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => applyBackgroundColor('custom', tempSettings.customBgColor || '#FDFBF7')}
                    >
                      <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                        Warna Kustom
                      </span>
                      <span className="block text-[9px] font-mono text-slate-400 uppercase">
                        {tempSettings.customBgColor || '#FDFBF7'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pattern texture selector */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Tekstur Pola Layar:
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyPattern('dots')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                        tempSettings.bgPattern === 'dots'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      Titik Halus (Dot Grid)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPattern('none')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                        tempSettings.bgPattern === 'none'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      Polos Bersih (Solid)
                    </button>
                  </div>
                </div>

                {/* Upload Background Image Section */}
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                      Upload Gambar / Foto Background:
                    </span>
                    {tempSettings.bgImageUrl && (
                      <button
                        type="button"
                        onClick={removeBgImage}
                        className="text-[10px] text-red-500 hover:text-red-600 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Hapus Foto
                      </button>
                    )}
                  </div>

                  {!tempSettings.bgImageUrl ? (
                    <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl cursor-pointer bg-white/50 dark:bg-slate-900/40 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all group">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleBgFileSelect}
                        disabled={isUploadingBg}
                        className="hidden"
                      />
                      <Upload className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 mb-1 transition-colors" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 transition-colors">
                        {isUploadingBg ? 'Sedang Memproses Gambar...' : 'Klik untuk Pilih / Upload Gambar Background'}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Mendukung file JPG, PNG, WEBP (Otomatis dikompresi & pas untuk layar proyektor)
                      </span>
                    </label>
                  ) : (
                    <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3">
                      <div className="flex items-center gap-3">
                        {/* Thumbnail Preview */}
                        <div className="relative w-16 h-10 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 shadow-xs">
                          <img
                            src={tempSettings.bgImageUrl}
                            alt="Preview Background"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            Foto Background Kustom Aktif
                          </span>
                          <label className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/svg+xml"
                              onChange={handleBgFileSelect}
                              className="hidden"
                            />
                            Ganti Gambar Lain
                          </label>
                        </div>
                      </div>

                      {/* Image Options: Fit and Opacity */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/40">
                        {/* Fit Mode */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                            Ukuran Gambar:
                          </label>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const updated: AppSettings = { ...settings, ...tempSettings, bgImageFit: 'cover' };
                                setTempSettings(updated);
                                setSettings(updated);
                              }}
                              className={`flex-1 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                                tempSettings.bgImageFit === 'cover' || !tempSettings.bgImageFit
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              Penuhi Layar (Cover)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated: AppSettings = { ...settings, ...tempSettings, bgImageFit: 'contain' };
                                setTempSettings(updated);
                                setSettings(updated);
                              }}
                              className={`flex-1 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                                tempSettings.bgImageFit === 'contain'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              Proporsional (Contain)
                            </button>
                          </div>
                        </div>

                        {/* Opacity Slider */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              Transparansi Foto:
                            </label>
                            <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
                              {Math.round((tempSettings.bgImageOpacity ?? 0.85) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.2"
                            max="1"
                            step="0.05"
                            value={tempSettings.bgImageOpacity ?? 0.85}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              const updated: AppSettings = { ...settings, ...tempSettings, bgImageOpacity: val };
                              setTempSettings(updated);
                              setSettings(updated);
                            }}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Room & Token List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Daftar Ruangan & Kode Token
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = `ruang-${Date.now()}`;
                      setTempRooms([
                        ...tempRooms,
                        {
                          id: newId,
                          name: `RUANG ${tempRooms.length + 1}`,
                          token: generateRandomToken(),
                          isActive: true,
                        },
                      ]);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Ruangan
                  </button>
                </div>

                <div className="space-y-3">
                  {tempRooms.map((room, index) => (
                    <div
                      key={room.id}
                      className={`p-4 rounded-xl border transition-all ${
                        room.isActive
                          ? isDark
                            ? 'bg-slate-800/90 border-emerald-500/50 shadow-sm'
                            : 'bg-emerald-50/50 border-emerald-200 shadow-sm'
                          : isDark
                          ? 'bg-slate-800/30 border-slate-800 opacity-60'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        {/* Active Toggle Checkbox */}
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={room.isActive}
                            onChange={(e) => {
                              const updated = [...tempRooms];
                              updated[index].isActive = e.target.checked;
                              setTempRooms(updated);
                            }}
                            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                          />
                          <span className="text-sm font-bold">
                            {room.isActive ? 'Aktif di Layar' : 'Nonaktif'}
                          </span>
                        </label>

                        {/* Delete Room button */}
                        {tempRooms.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setTempRooms(tempRooms.filter((_, i) => i !== index));
                            }}
                            title="Hapus ruangan"
                            className="p-1 rounded text-slate-400 hover:text-red-500 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Room Name Input */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Nama Ruangan
                          </label>
                          <input
                            type="text"
                            value={room.name}
                            onChange={(e) => {
                              const updated = [...tempRooms];
                              updated[index].name = e.target.value.toUpperCase();
                              setTempRooms(updated);
                            }}
                            placeholder="Contoh: AULA 1"
                            className={`w-full px-3 py-2 text-sm font-bold uppercase rounded-lg border outline-none ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-amber-400 focus:border-emerald-500'
                                : 'bg-white border-slate-300 text-amber-600 focus:border-emerald-600'
                            }`}
                          />
                        </div>

                        {/* Token Input with Quick Randomize */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Kode Token (6 Karakter)
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              maxLength={8}
                              value={room.token}
                              onChange={(e) => {
                                const updated = [...tempRooms];
                                updated[index].token = e.target.value.toUpperCase().replace(/\s/g, '');
                                setTempRooms(updated);
                              }}
                              placeholder="KODE"
                              className={`w-full px-3 py-2 text-sm font-black tracking-wider uppercase rounded-lg border outline-none font-mono ${
                                isDark
                                  ? 'bg-slate-900 border-slate-700 text-red-400 focus:border-emerald-500'
                                  : 'bg-white border-slate-300 text-red-600 focus:border-emerald-600'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleRandomizeTempToken(index)}
                              title="Acak Kode Token Baru"
                              className="px-2.5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-200 transition shrink-0 cursor-pointer"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handlePushSyncToServer(tempRooms, tempSettings, `⚡ Token ${room.name} (${room.token}) langsung dikirim ke layar proyektor!`);
                              }}
                              title="Kirim token ruangan ini langsung ke proyektor aula & HP sekarang"
                              className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shrink-0 flex items-center gap-1 text-xs font-bold shadow-xs cursor-pointer"
                            >
                              <Zap className="w-3.5 h-3.5 fill-current text-amber-300" />
                              <span className="hidden sm:inline">Kirim ke Layar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Header & Footer Text */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 block">
                  Teks Header & Footer
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Kapsul Atas
                    </label>
                    <input
                      type="text"
                      value={tempSettings.bannerText}
                      onChange={(e) =>
                        setTempSettings({ ...tempSettings, bannerText: e.target.value.toUpperCase() })
                      }
                      className={`w-full px-3 py-2 text-sm font-semibold rounded-lg border outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Footer Kiri
                    </label>
                    <input
                      type="text"
                      value={tempSettings.footerLeft}
                      onChange={(e) =>
                        setTempSettings({ ...tempSettings, footerLeft: e.target.value.toUpperCase() })
                      }
                      className={`w-full px-3 py-2 text-sm font-semibold rounded-lg border outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Footer Kanan
                    </label>
                    <input
                      type="text"
                      value={tempSettings.footerRight}
                      onChange={(e) =>
                        setTempSettings({ ...tempSettings, footerRight: e.target.value.toUpperCase() })
                      }
                      className={`w-full px-3 py-2 text-sm font-semibold rounded-lg border outline-none ${
                        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Sound & Security Settings */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold block">Suara Bel / Chime Notifikasi</span>
                    <span className="text-xs text-slate-500">
                      Bunyikan bel perayaan ketika token baru disimpan
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !tempSettings.soundEnabled;
                      setTempSettings({ ...tempSettings, soundEnabled: next });
                      if (next) playToneNotification();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      tempSettings.soundEnabled
                        ? 'bg-emerald-600 text-white'
                        : isDark
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tempSettings.soundEnabled ? 'Aktif' : 'Mati'}
                  </button>
                </div>

                {/* Cloud Sync Configuration (Opsional - Sinkronisasi Beda Laptop / HP) */}
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="text-xs font-bold block">
                          Sinkronisasi Cloud Antar-Perangkat (Opsional)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Kontrol token dari HP / Laptop terpisah ke laptop proyektor aula
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setTempSettings({
                          ...tempSettings,
                          cloudSyncEnabled: !tempSettings.cloudSyncEnabled,
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        tempSettings.cloudSyncEnabled
                          ? 'bg-emerald-600 text-white'
                          : isDark
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {tempSettings.cloudSyncEnabled ? 'Cloud Sync Aktif' : 'Nonaktif'}
                    </button>
                  </div>

                  {tempSettings.cloudSyncEnabled && (
                    <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700 space-y-2.5 animate-token-pop">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          URL Database / API Endpoint (Kosongkan untuk memakai server internal bawaan)
                        </label>
                        <input
                          type="text"
                          value={tempSettings.cloudSyncUrl || ''}
                          onChange={(e) =>
                            setTempSettings({ ...tempSettings, cloudSyncUrl: e.target.value })
                          }
                          placeholder="Default: /api/state (atau https://... Firebase / JSONBin / Supabase)"
                          className={`w-full px-3 py-1.5 text-xs rounded-lg border outline-none font-mono ${
                            isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          API Key / Auth Token (Opsional jika endpoint publik)
                        </label>
                        <input
                          type="password"
                          value={tempSettings.cloudSyncApiKey || ''}
                          onChange={(e) =>
                            setTempSettings({ ...tempSettings, cloudSyncApiKey: e.target.value })
                          }
                          placeholder="Masukkan token/kunci autentikasi jika ada..."
                          className={`w-full px-3 py-1.5 text-xs rounded-lg border outline-none font-mono ${
                            isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300'
                          }`}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleTestCloudConnection}
                          disabled={cloudTestState.status === 'testing'}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          {cloudTestState.status === 'testing' ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Sedang Mengetes...</span>
                            </>
                          ) : (
                            <>
                              <Wifi className="w-3.5 h-3.5" />
                              <span>Tes Koneksi Cloud</span>
                            </>
                          )}
                        </button>

                        {cloudTestState.message && (
                          <span
                            className={`text-[11px] font-semibold truncate ${
                              cloudTestState.status === 'success'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : cloudTestState.status === 'error'
                                ? 'text-red-500'
                                : 'text-slate-500'
                            }`}
                          >
                            {cloudTestState.message}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Change PIN option */}
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold">Ubah PIN Admin (Saat ini: {settings.pin})</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showNewPin ? 'text' : 'password'}
                        value={newPin}
                        maxLength={8}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="PIN baru (min. 4 digit)..."
                        className={`w-full px-3 py-1.5 text-xs rounded-lg border outline-none ${
                          isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPin(!showNewPin)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showNewPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => {
                  setTempRooms(DEFAULT_ROOMS);
                  setTempSettings(DEFAULT_SETTINGS);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
              >
                Reset ke Default
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdminOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveAdmin}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Zap className="w-4 h-4 fill-current text-amber-300" />
                  <span>Simpan & Sinkronkan ke Semua Layar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-slate-900/90 text-white text-xs sm:text-sm font-semibold shadow-2xl backdrop-blur-md border border-slate-700 flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
