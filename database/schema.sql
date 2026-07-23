-- SQL schema for Flexibilitas Tempat Bekerja (FTB) database on Supabase
-- Updated with TEXT data types for Field-Level Data Encryption (AES-256-GCM)

-- Drop table if exists (for reset safety)
-- DROP TABLE IF EXISTS permohonan_ftb;

-- Create the FTB permohonan table with encrypted field support
CREATE TABLE IF NOT EXISTS permohonan_ftb (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_pegawai TEXT NOT NULL,
    nip TEXT NOT NULL,
    jabatan TEXT NOT NULL,
    unit_kerja_asal TEXT NOT NULL,
    nomor_whatsapp TEXT NOT NULL,
    nomor_whatsapp_kepegawaian TEXT NOT NULL,
    nomor_nota_dinas TEXT NOT NULL,
    tanggal_nota_dinas DATE NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    durasi INTEGER NOT NULL, -- Automatically calculated duration in working days
    status VARCHAR(20) NOT NULL DEFAULT 'Menunggu', -- 'Menunggu', 'Disetujui', 'Ditolak'
    alasan_tolak TEXT NULL, -- Reason for rejection
    download_url VARCHAR(255) NULL, -- Download URL for generated ND file
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SQL Migration for existing Supabase installations:
-- Run these commands if you already created permohonan_ftb with VARCHAR limits:
/*
ALTER TABLE permohonan_ftb 
  ALTER COLUMN nama_pegawai TYPE TEXT,
  ALTER COLUMN nip TYPE TEXT,
  ALTER COLUMN jabatan TYPE TEXT,
  ALTER COLUMN unit_kerja_asal TYPE TEXT,
  ALTER COLUMN nomor_whatsapp TYPE TEXT,
  ALTER COLUMN nomor_whatsapp_kepegawaian TYPE TEXT,
  ALTER COLUMN nomor_nota_dinas TYPE TEXT,
  ALTER COLUMN alasan_tolak TYPE TEXT;
*/

-- Index for scanning requests in a date range (calendar monitoring)
CREATE INDEX IF NOT EXISTS idx_permohonan_tanggal ON permohonan_ftb (tanggal_mulai, tanggal_selesai);

-- Index for searching requests by status
CREATE INDEX IF NOT EXISTS idx_permohonan_status ON permohonan_ftb (status);
