import React, { useState, useRef, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Database,
  RefreshCw,
  Copy,
  Check,
  Search,
  Trash2,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Clock,
  Send,
  Building,
  KeyRound,
  ShieldCheck,
  RotateCcw,
  Code2,
  Terminal,
  FileCode
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { RoomConfig } from '../App';

export interface TokenHistoryEntry {
  id: string;
  timestamp: number;
  formattedTime: string;
  roomId: string;
  roomName: string;
  token: string;
  oldToken?: string;
  source: 'auto_generate' | 'manual_edit' | 'excel_import' | 'remote_sync';
  device?: string;
  isActive: boolean;
}

interface ExcelDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: RoomConfig[];
  history: TokenHistoryEntry[];
  onRefreshHistory: () => Promise<void>;
  onClearHistory: () => Promise<void>;
  onApplyImportedRooms: (importedRooms: RoomConfig[]) => Promise<void>;
  onApplySingleToken: (roomId: string, token: string) => Promise<void>;
  showToast: (msg: string) => void;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

export function ExcelDatabaseModal({
  isOpen,
  onClose,
  rooms,
  history,
  onRefreshHistory,
  onClearHistory,
  onApplyImportedRooms,
  onApplySingleToken,
  showToast,
  connectionStatus,
}: ExcelDatabaseModalProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'import' | 'current' | 'sql'>('history');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedImportRows, setParsedImportRows] = useState<
    Array<{
      roomName: string;
      token: string;
      isActive: boolean;
      isValid: boolean;
      errorMessage?: string;
    }>
  >([]);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isApplyingImport, setIsApplyingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered history list
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchSearch =
        item.token.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.oldToken && item.oldToken.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.device && item.device.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.formattedTime.toLowerCase().includes(searchTerm.toLowerCase());

      const matchRoom =
        selectedRoomFilter === 'all' || item.roomId === selectedRoomFilter || item.roomName === selectedRoomFilter;

      return matchSearch && matchRoom;
    });
  }, [history, searchTerm, selectedRoomFilter]);

  // Unique room list for dropdown filter
  const roomOptions = useMemo(() => {
    const map = new Map<string, string>();
    rooms.forEach((r) => map.set(r.id, r.name));
    history.forEach((h) => map.set(h.roomId, h.roomName));
    return Array.from(map.entries());
  }, [rooms, history]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Token "${text}" disalin ke clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshHistory();
      showToast('Database riwayat token diperbarui');
    } catch {
      showToast('Gagal memperbarui database');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Client-side Excel Export generator (works reliably online & offline)
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      // 1. Try server endpoint first for native streaming
      const res = await fetch('/api/tokens/export-excel');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
          now.getDate()
        ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        a.download = `Database_Token_Ujian_SMADAPAS_${dateStr}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast('✅ Berhasil mengunduh Database Excel (.xlsx)');
        setIsExporting(false);
        return;
      }
    } catch {
      // Fallback to client-side SheetJS generation below
    }

    try {
      // 2. Client-side SheetJS fallback
      const wb = XLSX.utils.book_new();

      // Sheet 1: Riwayat Update
      const historyRows = history.map((h, idx) => ({
        No: idx + 1,
        'Waktu Update': h.formattedTime,
        'Nama Ruangan': h.roomName,
        'Token Baru': h.token,
        'Token Lama': h.oldToken || '-',
        'Status Ruangan': h.isActive ? 'Aktif' : 'Nonaktif',
        'Sumber Update':
          h.source === 'auto_generate'
            ? 'Generate Otomatis'
            : h.source === 'excel_import'
            ? 'Import Excel'
            : h.source === 'remote_sync'
            ? 'Sinkronisasi Perangkat'
            : 'Edit Manual',
        'Perangkat / Keterangan': h.device || 'Pengawas',
      }));
      const wsHistory = XLSX.utils.json_to_sheet(
        historyRows.length > 0
          ? historyRows
          : [
              {
                No: 1,
                'Waktu Update': '-',
                'Nama Ruangan': '-',
                'Token Baru': '-',
                'Token Lama': '-',
                'Status Ruangan': '-',
                'Sumber Update': '-',
                'Perangkat / Keterangan': 'Belum ada riwayat',
              },
            ]
      );
      wsHistory['!cols'] = [
        { wch: 6 },
        { wch: 25 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 16 },
        { wch: 24 },
        { wch: 26 },
      ];
      XLSX.utils.book_append_sheet(wb, wsHistory, 'Database Riwayat Token');

      // Sheet 2: Token Aktif
      const currentRows = rooms.map((r, idx) => ({
        No: idx + 1,
        'ID Ruangan': r.id,
        'Nama Ruangan': r.name,
        'Token Aktif': r.token,
        Status: r.isActive ? 'AKTIF' : 'NONAKTIF',
        'Terakhir Diperiksa': new Date().toLocaleString('id-ID'),
      }));
      const wsCurrent = XLSX.utils.json_to_sheet(currentRows);
      wsCurrent['!cols'] = [
        { wch: 6 },
        { wch: 16 },
        { wch: 22 },
        { wch: 16 },
        { wch: 16 },
        { wch: 25 },
      ];
      XLSX.utils.book_append_sheet(wb, wsCurrent, 'Token Aktif Saat Ini');

      // Sheet 3: Template Import
      const templateRows = [
        { 'Nama Ruangan': 'AULA 1', Token: 'AB12CD', 'Status (Y/N)': 'Y' },
        { 'Nama Ruangan': 'AULA 2', Token: 'EF34GH', 'Status (Y/N)': 'Y' },
        { 'Nama Ruangan': 'LAB MULTIMEDIA', Token: 'JK56LM', 'Status (Y/N)': 'N' },
        { 'Nama Ruangan': 'RUANG 01', Token: 'PQ78RS', 'Status (Y/N)': 'Y' },
        { 'Nama Ruangan': 'RUANG 02', Token: 'TU90VW', 'Status (Y/N)': 'Y' },
      ];
      const wsTemplate = XLSX.utils.json_to_sheet(templateRows);
      wsTemplate['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, wsTemplate, 'Template Import Token');

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      XLSX.writeFile(wb, `Database_Token_Ujian_SMADAPAS_${dateStr}.xlsx`);
      showToast('✅ Berhasil mengekspor Database Excel (.xlsx)');
    } catch (err: any) {
      console.error('Export error:', err);
      showToast('⚠️ Gagal membuat file Excel');
    } finally {
      setIsExporting(false);
    }
  };

  // Download official Template Excel
  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      const templateData = [
        { 'Nama Ruangan': 'AULA 1', Token: 'AB12CD', 'Status (Y/N)': 'Y' },
        { 'Nama Ruangan': 'AULA 2', Token: 'EF34GH', 'Status (Y/N)': 'Y' },
        { 'Nama Ruangan': 'LAB MULTIMEDIA', Token: 'JK56LM', 'Status (Y/N)': 'N' },
        { 'Nama Ruangan': 'RUANG 01', Token: 'PQ78RS', 'Status (Y/N)': 'Y' },
        { 'Nama Ruangan': 'RUANG 02', Token: 'TU90VW', 'Status (Y/N)': 'Y' },
        { 'Nama Ruangan': 'RUANG 03', Token: 'XY12ZA', 'Status (Y/N)': 'Y' },
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      ws['!cols'] = [{ wch: 24 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Template Token Ujian');
      XLSX.writeFile(wb, 'Template_Token_Ujian_SMADAPAS.xlsx');
      showToast('📄 Template Excel berhasil diunduh');
    } catch {
      showToast('⚠️ Gagal mengunduh template Excel');
    }
  };

  // Generate complete SQL script containing schema, current data, and queries
  const generateSqlScript = () => {
    let sql = `-- ============================================================================\n`;
    sql += `-- SKEMA & DATA DATABASE TOKEN UJIAN SMADAPAS (SMAN 2 KOTA PASURUAN)\n`;
    sql += `-- Tanggal Ekspor: ${new Date().toLocaleString('id-ID')} WIB\n`;
    sql += `-- Kompatibel dengan: PostgreSQL, MySQL, MariaDB, SQLite\n`;
    sql += `-- ============================================================================\n\n`;

    sql += `-- 1. TABEL RUANGAN UJIAN (rooms)\n`;
    sql += `CREATE TABLE IF NOT EXISTS rooms (\n`;
    sql += `    id VARCHAR(50) PRIMARY KEY,\n`;
    sql += `    name VARCHAR(100) NOT NULL,\n`;
    sql += `    token VARCHAR(20) NOT NULL,\n`;
    sql += `    is_active BOOLEAN DEFAULT TRUE,\n`;
    sql += `    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;

    sql += `-- 2. TABEL RIWAYAT UPDATE TOKEN (token_history)\n`;
    sql += `CREATE TABLE IF NOT EXISTS token_history (\n`;
    sql += `    id VARCHAR(60) PRIMARY KEY,\n`;
    sql += `    timestamp BIGINT NOT NULL,\n`;
    sql += `    formatted_time VARCHAR(50) NOT NULL,\n`;
    sql += `    room_id VARCHAR(50) NOT NULL,\n`;
    sql += `    room_name VARCHAR(100) NOT NULL,\n`;
    sql += `    token VARCHAR(20) NOT NULL,\n`;
    sql += `    old_token VARCHAR(20) DEFAULT '-',\n`;
    sql += `    source VARCHAR(50) DEFAULT 'manual_edit',\n`;
    sql += `    device VARCHAR(100) DEFAULT 'Perangkat Pengawas',\n`;
    sql += `    is_active BOOLEAN DEFAULT TRUE,\n`;
    sql += `    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;

    sql += `-- 3. TABEL PENGATURAN DISPLAY (app_settings)\n`;
    sql += `CREATE TABLE IF NOT EXISTS app_settings (\n`;
    sql += `    id INT PRIMARY KEY DEFAULT 1,\n`;
    sql += `    pin VARCHAR(20) NOT NULL DEFAULT '1234',\n`;
    sql += `    banner_text VARCHAR(100) DEFAULT 'TOKEN',\n`;
    sql += `    footer_left VARCHAR(100) DEFAULT 'TIM TKA',\n`;
    sql += `    footer_right VARCHAR(100) DEFAULT 'SMADAPAS 2026',\n`;
    sql += `    theme VARCHAR(20) DEFAULT 'light',\n`;
    sql += `    sound_enabled BOOLEAN DEFAULT TRUE,\n`;
    sql += `    token_scale VARCHAR(20) DEFAULT 'small',\n`;
    sql += `    bg_preset VARCHAR(50) DEFAULT 'cream',\n`;
    sql += `    custom_bg_color VARCHAR(20) DEFAULT '#FDFBF7',\n`;
    sql += `    bg_pattern VARCHAR(20) DEFAULT 'dots'\n`;
    sql += `);\n\n`;

    sql += `-- ============================================================================\n`;
    sql += `-- DATA RUANGAN SAAT INI (${rooms.length} Ruangan)\n`;
    sql += `-- ============================================================================\n`;
    rooms.forEach((r) => {
      const safeId = r.id.replace(/'/g, "''");
      const safeName = r.name.replace(/'/g, "''");
      const safeToken = r.token.replace(/'/g, "''");
      sql += `INSERT INTO rooms (id, name, token, is_active) VALUES ('${safeId}', '${safeName}', '${safeToken}', ${r.isActive ? 'TRUE' : 'FALSE'})\n`;
      sql += `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, token = EXCLUDED.token, is_active = EXCLUDED.is_active;\n`;
    });
    sql += `\n`;

    if (history.length > 0) {
      sql += `-- ============================================================================\n`;
      sql += `-- DATA RIWAYAT UPDATE TOKEN (${history.length} Entri)\n`;
      sql += `-- ============================================================================\n`;
      history.forEach((h) => {
        const safeId = h.id.replace(/'/g, "''");
        const safeTime = h.formattedTime.replace(/'/g, "''");
        const safeRoomId = h.roomId.replace(/'/g, "''");
        const safeRoomName = h.roomName.replace(/'/g, "''");
        const safeToken = h.token.replace(/'/g, "''");
        const safeOldToken = (h.oldToken || '-').replace(/'/g, "''");
        const safeSource = (h.source || 'manual_edit').replace(/'/g, "''");
        const safeDevice = (h.device || 'Pengawas').replace(/'/g, "''");
        sql += `INSERT INTO token_history (id, timestamp, formatted_time, room_id, room_name, token, old_token, source, device, is_active)\n`;
        sql += `VALUES ('${safeId}', ${h.timestamp}, '${safeTime}', '${safeRoomId}', '${safeRoomName}', '${safeToken}', '${safeOldToken}', '${safeSource}', '${safeDevice}', ${h.isActive ? 'TRUE' : 'FALSE'})\n`;
        sql += `ON CONFLICT (id) DO NOTHING;\n`;
      });
      sql += `\n`;
    }

    sql += `-- ============================================================================\n`;
    sql += `-- KUMPULAN QUERI UTAMA (QUERIES) OPERASIONAL\n`;
    sql += `-- ============================================================================\n\n`;
    sql += `-- 1. Ambil semua token aktif untuk proyektor:\n`;
    sql += `SELECT id, name, token FROM rooms WHERE is_active = TRUE ORDER BY name ASC;\n\n`;
    sql += `-- 2. Update token ruangan AULA 2:\n`;
    sql += `UPDATE rooms SET token = 'BARU99', updated_at = CURRENT_TIMESTAMP WHERE id = 'aula-2';\n\n`;
    sql += `-- 3. Ambil 50 riwayat update terbaru:\n`;
    sql += `SELECT formatted_time, room_name, token, old_token, source, device FROM token_history ORDER BY timestamp DESC LIMIT 50;\n\n`;
    sql += `-- 4. Rekap frekuensi update per ruangan:\n`;
    sql += `SELECT room_name, COUNT(*) AS total_pergantian FROM token_history GROUP BY room_name ORDER BY total_pergantian DESC;\n`;

    return sql;
  };

  const handleDownloadSql = () => {
    try {
      const sqlContent = generateSqlScript();
      const blob = new Blob([sqlContent], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.download = `Skema_Dan_Data_Token_SMADAPAS_${dateStr}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('💾 Script Database SQL (.sql) berhasil diunduh');
    } catch {
      showToast('⚠️ Gagal mengunduh file SQL');
    }
  };

  const handleCopySql = () => {
    try {
      const sqlContent = generateSqlScript();
      navigator.clipboard.writeText(sqlContent);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2200);
      showToast('📋 Skema & queri SQL disalin ke clipboard');
    } catch {
      showToast('⚠️ Gagal menyalin SQL');
    }
  };

  // Parse Excel file on file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    processExcelFile(file);
  };

  const processExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          setImportStatus('⚠️ File Excel kosong atau tidak memiliki data.');
          setParsedImportRows([]);
          return;
        }

        const parsed = rawJson.map((row: any) => {
          // Flexible key detection for columns
          const roomName =
            row['Nama Ruangan'] ||
            row['Ruangan'] ||
            row['Nama'] ||
            row['Ruang'] ||
            row['Room'] ||
            row['ROOM'] ||
            row['ruangan'] ||
            '';

          const token =
            row['Token'] ||
            row['TOKEN'] ||
            row['Token Ujian'] ||
            row['Token Baru'] ||
            row['token'] ||
            '';

          const statusRaw = String(
            row['Status (Y/N)'] ||
              row['Status'] ||
              row['Aktif'] ||
              row['IsActive'] ||
              row['STATUS'] ||
              'Y'
          ).toUpperCase().trim();

          const isActive =
            statusRaw === 'Y' ||
            statusRaw === 'YA' ||
            statusRaw === 'YES' ||
            statusRaw === 'TRUE' ||
            statusRaw === '1' ||
            statusRaw === 'AKTIF';

          const cleanRoomName = String(roomName).trim();
          const cleanToken = String(token).trim().toUpperCase();

          const isValid = cleanRoomName.length > 0 && cleanToken.length >= 3;
          let errorMessage: string | undefined;
          if (!cleanRoomName) errorMessage = 'Nama ruangan kosong';
          else if (!cleanToken) errorMessage = 'Token kosong';
          else if (cleanToken.length < 3) errorMessage = 'Token minimal 3 karakter';

          return {
            roomName: cleanRoomName,
            token: cleanToken,
            isActive,
            isValid,
            errorMessage,
          };
        });

        setParsedImportRows(parsed);
        const validCount = parsed.filter((p) => p.isValid).length;
        setImportStatus(`Ditemukan ${parsed.length} baris data (${validCount} valid).`);
      } catch (err: any) {
        console.error('Error reading Excel:', err);
        setImportStatus('⚠️ Gagal membaca format file Excel. Pastikan berformat .xlsx atau .csv');
        setParsedImportRows([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Apply parsed Excel rows to system
  const handleApplyImport = async () => {
    const validRows = parsedImportRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      showToast('⚠️ Tidak ada baris data token valid untuk diimpor');
      return;
    }

    setIsApplyingImport(true);
    try {
      const newRooms: RoomConfig[] = validRows.map((row) => {
        // Find existing room id if match by name
        const existing = rooms.find(
          (r) => r.name.toLowerCase().trim() === row.roomName.toLowerCase().trim()
        );
        const id = existing
          ? existing.id
          : row.roomName
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '') || `ruang-${Date.now()}`;

        return {
          id,
          name: row.roomName,
          token: row.token,
          isActive: row.isActive,
        };
      });

      await onApplyImportedRooms(newRooms);
      showToast(`✅ Berhasil mengimpor & menerapkan ${newRooms.length} ruangan dari Excel!`);
      setActiveTab('history');
      setImportFile(null);
      setParsedImportRows([]);
      setImportStatus(null);
    } catch {
      showToast('⚠️ Gagal menerapkan data import Excel');
    } finally {
      setIsApplyingImport(false);
    }
  };

  const handleClearHistoryConfirm = async () => {
    if (window.confirm('Apakah Anda yakin ingin membersihkan seluruh riwayat database token?')) {
      setIsClearing(true);
      try {
        await onClearHistory();
        showToast('Riwayat database token berhasil dibersihkan');
      } catch {
        showToast('Gagal membersihkan riwayat');
      } finally {
        setIsClearing(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Database Excel Token Ujian
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                  SMADAPAS
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  {connectionStatus === 'connected' ? 'Database Server Online' : 'Koneksi Lokal'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Menyimpan seluruh token yang terupdate secara otomatis dan terintegrasi dengan file spreadsheet Excel (.xlsx)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all shadow-sm shadow-emerald-600/20 disabled:opacity-50"
              title="Unduh seluruh riwayat dan token aktif ke file Excel"
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'Mengekspor...' : 'Unduh Database Excel (.xlsx)'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'history'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Riwayat Token Terupdate</span>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {history.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'import'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Import dari Excel (.xlsx)</span>
              {parsedImportRows.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                  {parsedImportRows.length} Siap
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('current')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'current'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Token Aktif Ruangan</span>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {rooms.length} Ruangan
              </span>
            </button>

            <button
              onClick={() => setActiveTab('sql')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'sql'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Queri Database SQL</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              title="Sinkronkan data terbaru dari server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Riwayat Token Terupdate */}
        {activeTab === 'history' && (
          <div className="flex-1 flex flex-col min-h-0 p-6 overflow-hidden bg-slate-50/50 dark:bg-slate-950/30">
            {/* Toolbar Filter & Pencarian */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari token, nama ruangan, waktu..."
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="relative">
                  <select
                    value={selectedRoomFilter}
                    onChange={(e) => setSelectedRoomFilter(e.target.value)}
                    className="px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 dark:text-slate-200"
                  >
                    <option value="all">Semua Ruangan</option>
                    {roomOptions.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearHistoryConfirm}
                  disabled={isClearing || history.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl transition-colors disabled:opacity-40"
                  title="Bersihkan riwayat database"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Riwayat</span>
                </button>
              </div>
            </div>

            {/* Tabel Database Token */}
            <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-10 backdrop-blur-xs">
                    <th className="py-3 px-3.5 text-center w-12">No</th>
                    <th className="py-3 px-3.5">Waktu Update</th>
                    <th className="py-3 px-3.5">Ruangan</th>
                    <th className="py-3 px-3.5 text-center">Token Baru</th>
                    <th className="py-3 px-3.5 text-center">Token Lama</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                    <th className="py-3 px-3.5">Sumber Update</th>
                    <th className="py-3 px-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <Database className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                        <p className="font-medium">Belum ada riwayat update token yang sesuai</p>
                        <p className="text-xs mt-1">
                          Setiap kali token digenerate atau diubah di ruangan mana pun, otomatis tersimpan di sini.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-3.5 text-center font-mono text-slate-400 text-xs">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.formattedTime}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{item.roomName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className="inline-block px-3 py-1 font-mono font-bold text-sm tracking-widest bg-emerald-100/80 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 rounded-lg shadow-2xs">
                            {item.token}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className="font-mono text-xs text-slate-400 dark:text-slate-500 line-through">
                            {item.oldToken && item.oldToken !== '-' ? item.oldToken : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              item.isActive
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {item.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                              item.source === 'auto_generate'
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                                : item.source === 'excel_import'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : item.source === 'remote_sync'
                                ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}
                          >
                            {item.source === 'auto_generate'
                              ? '⚡ Generate Acak'
                              : item.source === 'excel_import'
                              ? '📊 Import Excel'
                              : item.source === 'remote_sync'
                              ? '🔄 Sinkronisasi'
                              : '✏️ Edit Manual'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleCopy(item.token, item.id)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Salin Token"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    `Terapkan token "${item.token}" sekarang ke ruangan "${item.roomName}"?`
                                  )
                                ) {
                                  await onApplySingleToken(item.roomId, item.token);
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                              title="Terapkan token ini ke ruangan sekarang"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Summary info */}
            <div className="flex items-center justify-between pt-3 text-xs text-slate-500 dark:text-slate-400">
              <div>
                Menampilkan <span className="font-semibold">{filteredHistory.length}</span> dari{' '}
                <span className="font-semibold">{history.length}</span> total token tersimpan di database Excel server.
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Penyimpanan Permanen Disk Server (JSON + Excel)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Import dari Excel */}
        {activeTab === 'import' && (
          <div className="flex-1 flex flex-col min-h-0 p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/30 space-y-5">
            {/* Download Template Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Format File Excel Resmi
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Gunakan file Excel (.xlsx) dengan kolom: <b>Nama Ruangan</b>, <b>Token</b>, dan{' '}
                    <b>Status (Y/N)</b>. Anda dapat mengunduh contoh template di samping.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100/60 dark:hover:bg-slate-700 rounded-xl transition-all shadow-xs"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Unduh Template Excel (.xlsx)</span>
              </button>
            </div>

            {/* Dropzone File Upload */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-slate-900/60 rounded-2xl cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-2xl mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {importFile ? importFile.name : 'Klik untuk memilih file Excel atau seret ke sini'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Mendukung format file <b>.xlsx</b>, <b>.xls</b>, atau <b>.csv</b>
              </p>
              {importStatus && (
                <div className="mt-3 px-3 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {importStatus}
                </div>
              )}
            </div>

            {/* Pratinjau Data yang Diparsing */}
            {parsedImportRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Pratinjau Data Token dari Excel ({parsedImportRows.length} Ruangan)
                  </h4>
                  <button
                    onClick={handleApplyImport}
                    disabled={isApplyingImport || parsedImportRows.filter((r) => r.isValid).length === 0}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-600/30 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isApplyingImport
                        ? 'Menerapkan...'
                        : 'Terapkan Token dari Excel ke Semua Ruangan'}
                    </span>
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 font-semibold text-slate-600 dark:text-slate-300">
                        <th className="py-2.5 px-3.5 text-center w-12">No</th>
                        <th className="py-2.5 px-3.5">Nama Ruangan</th>
                        <th className="py-2.5 px-3.5 text-center">Token</th>
                        <th className="py-2.5 px-3.5 text-center">Status</th>
                        <th className="py-2.5 px-3.5">Validasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedImportRows.map((row, idx) => (
                        <tr
                          key={idx}
                          className={row.isValid ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40' : 'bg-rose-50/50 dark:bg-rose-950/20'}
                        >
                          <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">
                            {row.roomName || <span className="text-rose-500 italic">Kosong</span>}
                          </td>
                          <td className="py-2.5 px-3.5 text-center font-mono font-bold tracking-wider">
                            <span className="px-2.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                              {row.token || <span className="text-rose-500 italic">Kosong</span>}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                row.isActive
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                  : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {row.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium text-xs">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {row.errorMessage}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Token Aktif Ruangan Saat Ini */}
        {activeTab === 'current' && (
          <div className="flex-1 flex flex-col min-h-0 p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/30 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Daftar Token yang Sedang Aktif di Proyektor
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Semua token di bawah ini langsung ditampilkan di layar utama proyektor ujian.
                </p>
              </div>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Ekspor ke Excel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((r, idx) => (
                <div
                  key={r.id}
                  className={`p-4 rounded-xl border transition-all ${
                    r.isActive
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                      : 'bg-slate-100/80 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/40 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Ruangan #{idx + 1}</span>
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                        r.isActive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {r.isActive ? 'Tampil' : 'Disembunyikan'}
                    </span>
                  </div>

                  <h5 className="font-bold text-base text-slate-900 dark:text-white mb-2">{r.name}</h5>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                    <span className="font-mono text-xl font-black tracking-widest text-emerald-600 dark:text-emerald-400">
                      {r.token}
                    </span>
                    <button
                      onClick={() => handleCopy(r.token, r.id)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
                      title="Salin Token"
                    >
                      {copiedId === r.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Queri Database SQL */}
        {activeTab === 'sql' && (
          <div className="flex-1 flex flex-col min-h-0 p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/30 space-y-5">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Skema Relasional & Kumpulan Queri SQL
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Struktur tabel dan kumpulan perintah SQL siap pakai untuk PostgreSQL, MySQL / MariaDB, dan SQLite.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Tersalin!' : 'Salin SQL'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSql}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all shadow-xs shadow-emerald-600/20 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh File SQL (.sql)</span>
                </button>
              </div>
            </div>

            {/* Structure Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    TABEL: rooms
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">
                    {rooms.length} Baris
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Menyimpan ruangan ujian, nama, token aktif, dan status aktif.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    TABEL: token_history
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">
                    {history.length} Catatan
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Menyimpan rekam jejak setiap pergantian token beserta waktu, sumber, dan perangkat.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    TABEL: app_settings
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">
                    Konfigurasi
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Menyimpan PIN admin, teks banner proyektor, teks footer, dan preferensi tema.
                </p>
              </div>
            </div>

            {/* Quick Query Snippets */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pintasan Queri Cepat (Quick Queries):
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      1. Ambil Token Aktif Proyektor
                    </span>
                    <code className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                      SELECT * FROM rooms WHERE is_active = TRUE;
                    </code>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('SELECT id, name, token FROM rooms WHERE is_active = TRUE ORDER BY name ASC;');
                      showToast('Queri disalin ke clipboard');
                    }}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="Salin Queri"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      2. Update Token Ruangan
                    </span>
                    <code className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                      UPDATE rooms SET token = 'NEW_TOKEN' WHERE id = '...';
                    </code>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("UPDATE rooms SET token = 'ZMQOUL', updated_at = CURRENT_TIMESTAMP WHERE id = 'aula-2';");
                      showToast('Queri disalin ke clipboard');
                    }}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="Salin Queri"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Code Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-emerald-600" />
                  Pratinjau Script SQL Lengkap:
                </span>
                <span className="text-[11px] text-slate-400">
                  Tersedia file fisik di root proyek: <code>database_schema.sql</code>
                </span>
              </div>
              <pre className="p-4 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto max-h-80 select-all leading-relaxed shadow-inner">
                {generateSqlScript()}
              </pre>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              SMADAPAS Database Engine
            </span>
            <span>•</span>
            <span>Otomatis tersinkronisasi antar perangkat</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
