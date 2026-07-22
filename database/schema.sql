-- SQL schema for Flexibilitas Tempat Bekerja (FTB) database on Supabase

-- Drop table if exists (for migration/reset safety)
DROP TABLE IF EXISTS permohonan_ftb;

-- Create the FTB permohonan table
CREATE TABLE permohonan_ftb (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_pegawai VARCHAR(255) NOT NULL,
    nip VARCHAR(18) NOT NULL,
    jabatan VARCHAR(100) NOT NULL, -- Pelaksana, Account Representative, Juru Sita, Bendaharawan, Sekretaris, Pemeriksa Pajak Pertama, Pemeriksa Pajak Pelaksana, Pemeriksa Pajak Pelaksana Lanjutan, Penyuluh Pajak Ahli Pertama, Asisten Penyuluh Pajak Terampil
    unit_kerja_asal VARCHAR(255) NOT NULL,
    nomor_whatsapp VARCHAR(20) NOT NULL,
    nomor_whatsapp_kepegawaian VARCHAR(20) NOT NULL,
    nomor_nota_dinas VARCHAR(100) NOT NULL,
    tanggal_nota_dinas DATE NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    durasi INTEGER NOT NULL, -- Automatically calculated duration in days
    status VARCHAR(20) NOT NULL DEFAULT 'Menunggu', -- 'Menunggu', 'Disetujui', 'Ditolak'
    alasan_tolak VARCHAR(255) NULL, -- Reason for rejection
    download_url VARCHAR(255) NULL, -- Download URL for the ND file
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for scanning requests in a date range (important for calendar monitoring)
CREATE INDEX idx_permohonan_tanggal ON permohonan_ftb (tanggal_mulai, tanggal_selesai);

-- Index for searching requests by status
CREATE INDEX idx_permohonan_status ON permohonan_ftb (status);
