-- ============================================================================
-- SKEMA & QUERI DATABASE TOKEN UJIAN & TKA
-- SMAN 2 KOTA PASURUAN (SMADAPAS)
-- Kompatibel dengan: PostgreSQL, MySQL / MariaDB, dan SQLite
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABEL RUANGAN UJIAN (rooms)
-- Menyimpan daftar ruangan dan token aktif yang ditampilkan di proyektor
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    token VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk mempercepat pencarian ruangan aktif
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms (is_active);

-- ----------------------------------------------------------------------------
-- 2. TABEL RIWAYAT UPDATE TOKEN (token_history)
-- Mencatat seluruh jejak perubahan token dari setiap ruangan secara permanen
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS token_history (
    id VARCHAR(60) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    formatted_time VARCHAR(50) NOT NULL,
    room_id VARCHAR(50) NOT NULL,
    room_name VARCHAR(100) NOT NULL,
    token VARCHAR(20) NOT NULL,
    old_token VARCHAR(20) DEFAULT '-',
    source VARCHAR(50) DEFAULT 'manual_edit', -- auto_generate, manual_edit, excel_import, remote_sync
    device VARCHAR(100) DEFAULT 'Perangkat Pengawas', -- HP / Mobile, Laptop, Proyektor
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Index untuk memfilter riwayat berdasarkan ruangan dan waktu
CREATE INDEX IF NOT EXISTS idx_history_room ON token_history (room_id);
CREATE INDEX IF NOT EXISTS idx_history_timestamp ON token_history (timestamp DESC);

-- ----------------------------------------------------------------------------
-- 3. TABEL PENGATURAN DISPLAY & SISTEM (app_settings)
-- Menyimpan konfigurasi PIN admin, teks banner, footer, tema, dan suara
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
    id INT PRIMARY KEY DEFAULT 1,
    pin VARCHAR(20) NOT NULL DEFAULT '1234',
    banner_text VARCHAR(100) DEFAULT 'TOKEN',
    footer_left VARCHAR(100) DEFAULT 'TIM TKA',
    footer_right VARCHAR(100) DEFAULT 'SMADAPAS 2026',
    theme VARCHAR(20) DEFAULT 'light',
    sound_enabled BOOLEAN DEFAULT TRUE,
    token_scale VARCHAR(20) DEFAULT 'small', -- small, medium, large
    bg_preset VARCHAR(50) DEFAULT 'cream',
    custom_bg_color VARCHAR(20) DEFAULT '#FDFBF7',
    bg_pattern VARCHAR(20) DEFAULT 'dots',
    cloud_sync_enabled BOOLEAN DEFAULT FALSE,
    cloud_sync_url TEXT DEFAULT '',
    cloud_sync_api_key TEXT DEFAULT '',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. INSERT DATA AWAL (SEEDING DATA)
-- ============================================================================

-- Data Ruangan Awal SMADAPAS
INSERT INTO rooms (id, name, token, is_active) VALUES
('aula-2', 'AULA 2', 'ZMQOUL', TRUE),
('aula-1', 'AULA 1', 'OVBOWK', TRUE),
('multimedia', 'LAB MULTIMEDIA', 'KTR7LP', FALSE)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, token = EXCLUDED.token, is_active = EXCLUDED.is_active;

-- Data Riwayat Awal
INSERT INTO token_history (id, timestamp, formatted_time, room_id, room_name, token, old_token, source, device, is_active) VALUES
('tok-init-01', 1791438368454, '08/10/2026, 12:46:08 WIB', 'aula-2', 'AULA 2', 'ZMQOUL', '-', 'auto_generate', 'Inisialisasi Sistem', TRUE),
('tok-init-02', 1791438368476, '08/10/2026, 12:46:08 WIB', 'aula-1', 'AULA 1', 'OVBOWK', '-', 'auto_generate', 'Inisialisasi Sistem', TRUE),
('tok-init-03', 1791438368478, '08/10/2026, 12:46:08 WIB', 'multimedia', 'LAB MULTIMEDIA', 'KTR7LP', '-', 'auto_generate', 'Inisialisasi Sistem', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Pengaturan Awal
INSERT INTO app_settings (id, pin, banner_text, footer_left, footer_right, theme, sound_enabled, token_scale, bg_preset, custom_bg_color, bg_pattern) VALUES
(1, '1234', 'TOKEN', 'TIM TKA', 'SMADAPAS 2026', 'light', TRUE, 'small', 'cream', '#FDFBF7', 'dots')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. KUMPULAN QUERI UTAMA (QUERIES) UNTUK APLIKASI
-- ============================================================================

-- Q1: Mengambil Semua Ruangan yang Aktif untuk Tampilan Layar Proyektor
SELECT id, name, token, is_active, updated_at 
FROM rooms 
WHERE is_active = TRUE 
ORDER BY name ASC;

-- Q2: Mengambil Semua Ruangan (Aktif maupun Nonaktif) untuk Panel Admin
SELECT id, name, token, is_active 
FROM rooms 
ORDER BY id ASC;

-- Q3: Update Token Ruangan Saat Diubah atau Digenerate Baru
UPDATE rooms 
SET token = 'BARU88', updated_at = CURRENT_TIMESTAMP 
WHERE id = 'aula-2';

-- Q4: Mencatat Riwayat Setiap Kali Token Di-update
INSERT INTO token_history (id, timestamp, formatted_time, room_id, room_name, token, old_token, source, device, is_active)
VALUES (
    'tok-' || CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT),
    CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT),
    TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'DD/MM/YYYY, HH24:MI:SS') || ' WIB',
    'aula-2',
    'AULA 2',
    'BARU88',
    'ZMQOUL',
    'auto_generate',
    'Laptop Proyektor',
    TRUE
);

-- Q5: Mengambil 50 Riwayat Update Terakhir (Untuk Tampilan Database Excel)
SELECT id, formatted_time, room_name, token, old_token, source, device, is_active 
FROM token_history 
ORDER BY timestamp DESC 
LIMIT 50;

-- Q6: Mencari Riwayat Berdasarkan Nama Ruangan Tertentu
SELECT formatted_time, room_name, token, old_token, source, device 
FROM token_history 
WHERE room_id = 'aula-2' 
ORDER BY timestamp DESC;

-- Q7: Mencari Riwayat Berdasarkan Token Spesifik
SELECT formatted_time, room_name, token, old_token, source, device 
FROM token_history 
WHERE token ILIKE '%ZMQOUL%' 
ORDER BY timestamp DESC;

-- Q8: Rekapitulasi Berapa Kali Setiap Ruangan Mengalami Pergantian Token
SELECT 
    room_name,
    COUNT(*) AS total_pergantian_token,
    MAX(formatted_time) AS terakhir_diupdate
FROM token_history
GROUP BY room_name
ORDER BY total_pergantian_token DESC;

-- Q9: Ambil Pengaturan Display
SELECT pin, banner_text, footer_left, footer_right, theme, sound_enabled, token_scale, bg_preset, custom_bg_color, bg_pattern 
FROM app_settings 
WHERE id = 1;

-- Q10: Update Pengaturan PIN & Teks Display
UPDATE app_settings 
SET pin = '5678', 
    banner_text = 'TOKEN UJIAN UTBK',
    updated_at = CURRENT_TIMESTAMP 
WHERE id = 1;
