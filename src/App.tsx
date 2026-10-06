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
  Info
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
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  // Temporary editable state inside admin panel
  const [tempRooms, setTempRooms] = useState<RoomConfig[]>(rooms);
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  const [newPin, setNewPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync rooms and settings to localStorage
  useEffect(() => {
    localStorage.setItem('smadapas_token_rooms', JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem('smadapas_token_settings', JSON.stringify(settings));
  }, [settings]);

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
    setRooms(tempRooms);
    setSettings(updatedSettings);
    setIsAdminOpen(false);
    setLastUpdated(Date.now());
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
        setSettings((prev) => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
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
  const isDark = settings.theme === 'dark';

  return (
    <div
      ref={containerRef}
      className={`relative w-screen h-screen max-h-screen select-none overflow-hidden flex flex-col justify-between font-sans transition-colors duration-300 ${
        isDark ? 'bg-[#0f172a] text-slate-100' : 'bg-[#FDFBF7] text-slate-900'
      }`}
    >
      {/* ========================================================================= */}
      {/* FLOATING ACTION BAR (Top-Right / Minimal & Discrete for Presenter) */}
      {/* ========================================================================= */}
      <div className="absolute top-2.5 right-3.5 z-40 flex items-center gap-1.5 print:hidden opacity-40 hover:opacity-100 transition-opacity duration-200">
        {/* Toggle Theme */}
        <button
          onClick={() =>
            setSettings((prev) => ({
              ...prev,
              theme: prev.theme === 'light' ? 'dark' : 'light',
            }))
          }
          title={isDark ? 'Mode Terang (Tekan D)' : 'Mode Gelap (Tekan D)'}
          className={`p-1.5 sm:p-2 rounded-full backdrop-blur-md transition-all duration-200 border ${
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
          className={`p-1.5 sm:p-2 rounded-full backdrop-blur-md transition-all duration-200 border ${
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
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full font-semibold text-xs backdrop-blur-md transition-all duration-200 border shadow-sm ${
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
          {/* Authentic School Circular Badge Icon */}
          <div className="relative w-11 h-11 sm:w-14 sm:h-14 lg:w-15 lg:h-15 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
              <circle cx="50" cy="50" r="46" fill="none" stroke="#1e3a8a" strokeWidth="3" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="3 2" />
              <circle cx="50" cy="50" r="39" fill="#1e3a8a" />
              <circle cx="50" cy="50" r="33" fill="#ffffff" />
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

        {/* Center: Olive-Green Capsule Banner "TOKEN" */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
          <div
            className={`px-8 sm:px-14 md:px-20 lg:px-28 py-1.5 sm:py-2.5 rounded-full shadow-sm flex items-center justify-center transition-transform hover:scale-105 ${
              isDark
                ? 'bg-[#84b860] border-2 border-[#6ea04c] text-black shadow-lg shadow-lime-900/20'
                : 'bg-[#98c775] border border-[#86b563] text-black shadow-sm'
            }`}
          >
            <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-widest text-black">
              {settings.bannerText || 'TOKEN'}
            </h1>
          </div>
        </div>

        {/* Right: Yellow Cloud Line Decoration + Pink Confetti Dots */}
        <div className="relative w-24 sm:w-36 md:w-44 h-12 sm:h-16 shrink-0 pointer-events-none hidden xs:block">
          <svg viewBox="0 0 160 90" className="w-full h-full overflow-visible">
            <path
              d="M 30 75 Q 15 50 35 25 Q 65 5 105 18 Q 145 2 155 35 Q 165 70 135 85 Q 110 92 90 85 Q 75 90 55 85 Z"
              fill="none"
              stroke="#f5b82e"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
            <circle cx="85" cy="40" r="3.2" fill="#f87171" opacity="0.85" />
            <circle cx="94" cy="38" r="2.8" fill="#f87171" opacity="0.8" />
            <circle cx="90" cy="47" r="3" fill="#f87171" opacity="0.8" />
            <circle cx="82" cy="46" r="2.5" fill="#f87171" opacity="0.75" />
            <circle cx="50" cy="62" r="3" fill="#f87171" opacity="0.8" />
            <circle cx="58" cy="65" r="2.6" fill="#f87171" opacity="0.75" />
            <circle cx="54" cy="71" r="3" fill="#f87171" opacity="0.8" />
            <circle cx="46" cy="69" r="2.5" fill="#f87171" opacity="0.7" />
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
                        className={`${getRoomNameClasses(settings.tokenScale, activeRooms.length)} ${
                          isDark ? 'text-[#f5be38]' : 'text-[#e5a519]'
                        }`}
                        style={{
                          textShadow: isDark
                            ? '0 2px 8px rgba(245, 190, 56, 0.3)'
                            : '1px 2px 0px rgba(0,0,0,0.1)',
                        }}
                      >
                        {room.name}
                      </h2>
                    </div>

                    {/* Token Code: Compact Italic Red 3D Anaglyph Pop-Art */}
                    <div
                      key={`${room.id}-${room.token}-${lastUpdated}`}
                      className="relative my-1 sm:my-2 transition-transform duration-300 hover:scale-[1.03] cursor-pointer animate-token-pop"
                      onClick={() => handleCopyToken(room.id, room.token)}
                      title="Klik untuk menyalin token"
                    >
                      <span
                        className={`inline-block select-all leading-none ${
                          isDark ? 'token-3d-text-dark' : 'token-3d-text'
                        } ${getTokenSizeClasses(settings.tokenScale, activeRooms.length)} tracking-wider`}
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

                    {/* Quick Action buttons below token */}
                    <div className="mt-1 sm:mt-2 flex items-center gap-2 opacity-25 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleSpeakToken(room.name, room.token)}
                        title="Dengarkan pembacaan token"
                        className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      </button>
                      <button
                        onClick={() => handleCopyToken(room.id, room.token)}
                        title="Salin token"
                        className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                      >
                        <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      </button>
                    </div>
                  </div>

                  {/* Thick Vertical Divider Line (Exact to 123.png) */}
                  {hasDividerAfter && (
                    <div
                      className={`hidden md:block w-1.5 self-stretch rounded-full my-4 ${
                        isDark ? 'bg-slate-700' : 'bg-black'
                      }`}
                    />
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
          <div className="absolute -bottom-1 right-0 w-11 h-11 sm:w-14 sm:h-14 lg:w-16 lg:h-16 drop-shadow-lg z-20">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <polygon points="35,65 25,95 40,90 50,75" fill="#dc2626" />
              <polygon points="65,65 75,95 60,90 50,75" fill="#b91c1c" />
              <circle cx="50" cy="50" r="34" fill="#f59e0b" stroke="#d97706" strokeWidth="3" />
              <circle cx="50" cy="50" r="28" fill="#fbbf24" />
              <polygon
                points="50,28 55,42 70,42 58,51 63,65 50,56 37,65 42,51 30,42 45,42"
                fill="#ffffff"
                opacity="0.9"
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
                              className="px-2.5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-200 transition shrink-0"
                            >
                              <RefreshCw className="w-4 h-4" />
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
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition"
                >
                  Simpan & Tampilkan
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
