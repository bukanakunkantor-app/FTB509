const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { encryptRecord, decryptRecord, encryptField, decryptField } = require('./lib/cryptoUtils');


let pool = null;
const pgUrl = process.env.DATABASE_URL || 
              process.env.POSTGRES_URL || 
              process.env.POSTGRES_PRISMA_URL || 
              process.env.POSTGRES_URL_NON_POOLING || 
              process.env.SUPABASE_DATABASE_URL;

if (pgUrl) {
    try {
        // Bypass TLS self-signed certificate rejection for Supabase connection poolers
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

        const { Pool } = require('pg');
        pool = new Pool({
            connectionString: pgUrl,
            ssl: { rejectUnauthorized: false }
        });
        console.log('Database: Connected to PostgreSQL (Supabase)');
    } catch (e) {
        console.warn('Database Warning: DATABASE_URL/POSTGRES_URL is set but "pg" module is not installed. Run "npm install pg" to use Supabase.');
    }
}

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'permohonan.json');

// Helper to read data from JSON file
function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        // Initial mock data
        const initialData = [
            {
                id: "d3b07384-d113-4ec6-a55d-114400a4d1f2",
                nama_pegawai: "Ahmad Subarjo",
                nip: "199001012015011001",
                jabatan: "Pelaksana",
                unit_kerja_asal: "Seksi Pengawasan I",
                nomor_whatsapp: "08123456789",
                nomor_whatsapp_kepegawaian: "08123456780",
                tanggal_mulai: "2026-07-20",
                tanggal_selesai: "2026-07-22",
                durasi: 3,
                status: "Disetujui",
                created_at: new Date().toISOString()
            },
            {
                id: "8c775d71-f923-41e9-86c0-7815bf5ee8d9",
                nama_pegawai: "Budi Santoso",
                nip: "198802022012011002",
                jabatan: "Account Representative",
                unit_kerja_asal: "Seksi Pengawasan II",
                nomor_whatsapp: "08987654321",
                nomor_whatsapp_kepegawaian: "08987654320",
                tanggal_mulai: "2026-07-21",
                tanggal_selesai: "2026-07-25",
                durasi: 5,
                status: "Menunggu",
                created_at: new Date().toISOString()
            },
            {
                id: "fc2ee35b-8012-4fb3-96b3-96b5d92df9a1",
                nama_pegawai: "Citra Lestari",
                nip: "199203032017012003",
                jabatan: "Fungsional Pemeriksa",
                unit_kerja_asal: "Fungsional Pemeriksa",
                nomor_whatsapp: "0855123456",
                nomor_whatsapp_kepegawaian: "0855123450",
                tanggal_mulai: "2026-07-23",
                tanggal_selesai: "2026-07-24",
                durasi: 2,
                status: "Ditolak",
                created_at: new Date().toISOString()
            }
        ];
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

// Helper to write data to JSON file
function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Helper to format date to Indonesian format
const formatIndoDate = (dateStr, includeDay = true) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const dateObj = new Date(year, monthIndex, day);
    if (isNaN(dateObj.getTime())) return dateStr;
    
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthsFull = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    const dayName = days[dateObj.getDay()];
    const monthName = monthsFull[monthIndex];
    
    if (includeDay) {
        return `${dayName}, ${day} ${monthName} ${year}`;
    } else {
        return `${day} ${monthName} ${year}`;
    }
};

let JSZip = null;
try {
    JSZip = require('jszip');
} catch (e) {
    console.warn('JSZip module not found. Run npm install jszip');
}

// Helper to generate docx using JSZip (Cloud-native / Vercel ready)
const generateDocx = async (item, status, callback) => {
    if (status !== 'Disetujui' && status !== 'Ditolak') {
        return callback(null);
    }
    const templateFilename = status === 'Disetujui' ? 'Setuju.docx' : 'Tolak.docx';
    const templatePath = path.join(__dirname, templateFilename);

    const isVercel = !!process.env.VERCEL;
    const genDir = isVercel ? path.join('/tmp', 'generated') : path.join(__dirname, 'frontend', 'generated');
    if (!fs.existsSync(genDir)) {
        fs.mkdirSync(genDir, { recursive: true });
    }

    const outputFilename = `ND_${status}_${item.id}.docx`;
    const outputPath = path.join(genDir, outputFilename);

    // Format unit_kerja_asal to expand abbreviations (KPP -> Kantor Pelayanan Pajak) preserving other parts like Pratama
    let formattedUnitKerja = item.unit_kerja_asal || '';
    formattedUnitKerja = formattedUnitKerja.replace(/\bKPP\b/gi, 'Kantor Pelayanan Pajak');

    const replacements = {
        'nama_pegawai': item.nama_pegawai,
        'nip': item.nip,
        'jabatan': item.jabatan,
        'unit_kerja_asal': formattedUnitKerja,
        'nomor_nota_dinas': item.nomor_nota_dinas,
        'tanggal_nota_dinas': formatIndoDate(item.tanggal_nota_dinas, false),
        'tanggal_mulai': formatIndoDate(item.tanggal_mulai, true),
        'tanggal_selesai': formatIndoDate(item.tanggal_selesai, true)
    };

    if (status === 'Ditolak') {
        replacements['alasan_tolak'] = item.alasan_tolak || '';
    }

    if (JSZip && fs.existsSync(templatePath)) {
        try {
            const data = fs.readFileSync(templatePath);
            const zip = await JSZip.loadAsync(data);

            const xmlFiles = Object.keys(zip.files).filter(filename => 
                filename === 'word/document.xml' || filename.startsWith('word/header') || filename.startsWith('word/footer')
            );

            for (const filename of xmlFiles) {
                let xmlText = await zip.files[filename].async('string');
                
                // Change only red font colors (placeholder text #FF0000) to black (000000), leaving gray (#BFBFBF) for "Ditandatangani secara elektronik"
                xmlText = xmlText.replace(/<w:color\s+[^>]*?w:val="(?:FF0000|C00000|ED1C24|E00000|D00000|red)"[^>]*?\/>/gi, '<w:color w:val="000000"/>');
                xmlText = xmlText.replace(/<w:color\s+[^>]*?w:val='(?:FF0000|C00000|ED1C24|E00000|D00000|red)'[^>]*?\/>/gi, "<w:color w:val='000000'/>");

                for (const [key, val] of Object.entries(replacements)) {
                    const xmlSafeVal = String(val || '')
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&apos;');
                    
                    xmlText = xmlText.split(key).join(xmlSafeVal);
                }
                zip.file(filename, xmlText);
            }

            const buffer = await zip.generateAsync({ type: 'nodebuffer' });
            fs.writeFileSync(outputPath, buffer);
            console.log('Docx generated using JSZip:', outputFilename);
            return callback(null, `/generated/${outputFilename}`);
        } catch (err) {
            console.error('Error generating docx with JSZip:', err);
        }
    }

    // Fallback to PHP if JSZip is not installed
    const phpPath = 'C:\\xampp\\php\\php.exe';
    const scriptPath = path.join(__dirname, 'generate_docx.php');
    if (fs.existsSync(phpPath) && fs.existsSync(scriptPath)) {
        execFile(phpPath, [scriptPath, templatePath, outputPath, JSON.stringify(replacements)], (error, stdout, stderr) => {
            if (error) {
                console.error('Error generating docx via PHP:', error, stderr);
                return callback(error);
            }
            console.log('Docx generated output:', stdout);
            callback(null, `/generated/${outputFilename}`);
        });
    } else {
        callback(new Error('No docx generator available'));
    }
};

// Helper to safely extract request body across local Node server and Vercel Serverless Functions
function getParsedBody(req, callback) {
    // 1. If Vercel or Express middleware already parsed req.body as an object
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        return callback(null, req.body);
    }

    // 2. If req.body is a string
    if (typeof req.body === 'string') {
        const trimmed = req.body.trim();
        if (!trimmed) return callback(null, {});
        try {
            return callback(null, JSON.parse(trimmed));
        } catch (e) {
            return callback(e);
        }
    }

    // 3. If req.body is a Buffer
    if (Buffer.isBuffer(req.body)) {
        try {
            const str = req.body.toString('utf-8').trim();
            return callback(null, str ? JSON.parse(str) : {});
        } catch (e) {
            return callback(e);
        }
    }

    // 4. Stream reading for standard Node http server
    let body = '';
    let isHandled = false;

    const finish = () => {
        if (isHandled) return;
        isHandled = true;
        const trimmed = body.trim();
        if (!trimmed) {
            return callback(null, {});
        }
        try {
            const parsed = JSON.parse(trimmed);
            callback(null, parsed);
        } catch (e) {
            callback(e);
        }
    };

    req.on('data', chunk => {
        body += chunk;
    });

    req.on('end', () => {
        finish();
    });

    req.on('error', (err) => {
        if (!isHandled) {
            isHandled = true;
            callback(err);
        }
    });

    // If stream is already ended or complete, finish immediately
    if (req.readableEnded || req.complete) {
        setImmediate(finish);
    }
}

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const reqUrl = req.headers['x-forwarded-url'] || req.headers['x-matched-path'] || req.url;
    const parsedUrl = new URL(reqUrl, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // API Routes
    if (pathname === '/api/permohonan' && req.method === 'GET') {
        if (pool) {
            pool.query('SELECT id, nama_pegawai, nip, jabatan, unit_kerja_asal, nomor_whatsapp, nomor_whatsapp_kepegawaian, nomor_nota_dinas, tanggal_nota_dinas, tanggal_mulai, tanggal_selesai, durasi, status, alasan_tolak, download_url, created_at FROM permohonan_ftb ORDER BY created_at DESC', (err, result) => {
                if (err) {
                    console.error('Postgres error fetching data:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: `Database Error: ${err.message}` }));
                    return;
                }
                const requests = result.rows.map(rawRow => {
                    const row = decryptRecord(rawRow);
                    const formatDate = (dateVal) => {
                        if (!dateVal) return '';
                        const d = new Date(dateVal);
                        const yr = d.getFullYear();
                        const mo = String(d.getMonth() + 1).padStart(2, '0');
                        const dy = String(d.getDate()).padStart(2, '0');
                        return `${yr}-${mo}-${dy}`;
                    };
                    return {
                        ...row,
                        tanggal_nota_dinas: formatDate(row.tanggal_nota_dinas),
                        tanggal_mulai: formatDate(row.tanggal_mulai),
                        tanggal_selesai: formatDate(row.tanggal_selesai),
                        created_at: row.created_at ? new Date(row.created_at).toISOString() : null
                    };
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(requests));
            });
        } else {
            const rawData = readData();
            const decryptedData = rawData.map(item => decryptRecord(item));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(decryptedData));
        }
        return;
    }

    if (pathname === '/api/permohonan' && req.method === 'POST') {
        getParsedBody(req, (err, item) => {
            if (err || !item) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
                return;
            }
            if (!item.nama_pegawai || !item.nip || !item.jabatan || !item.unit_kerja_asal || !item.nomor_whatsapp || !item.nomor_whatsapp_kepegawaian || !item.nomor_nota_dinas || !item.tanggal_nota_dinas || !item.tanggal_mulai || !item.tanggal_selesai) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing required fields' }));
                return;
            }

                // Calculate working days duration (excluding weekends & 2026 Indonesian holidays)
                const parseLocalDate = (dateStr) => {
                    const [year, month, day] = dateStr.split('-').map(Number);
                    return new Date(year, month - 1, day);
                };

                const start = parseLocalDate(item.tanggal_mulai);
                const end = parseLocalDate(item.tanggal_selesai);
                
                // Validate 8 working days lead time from today
                const holidays2026 = [
                    "2026-01-01", "2026-01-16", "2026-02-16", "2026-02-17",
                    "2026-03-18", "2026-03-19", "2026-03-20", "2026-03-21",
                    "2026-03-22", "2026-03-23", "2026-03-24", "2026-04-03",
                    "2026-04-05", "2026-05-01", "2026-05-14", "2026-05-15",
                    "2026-05-27", "2026-05-28", "2026-05-31", "2026-06-01",
                    "2026-06-16", "2026-08-17", "2026-08-25", "2026-12-24",
                    "2026-12-25"
                ];

                const getTodayStr = () => {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const date = String(today.getDate()).padStart(2, '0');
                    return `${year}-${month}-${date}`;
                };

                const todayStr = getTodayStr();
                let leadWorkingDays = 0;
                const todayObj = parseLocalDate(todayStr);
                
                if (!isNaN(todayObj.getTime()) && !isNaN(start.getTime()) && todayObj < start) {
                    let tempCurrent = new Date(todayObj);
                    tempCurrent.setDate(tempCurrent.getDate() + 1);
                    while (tempCurrent <= start) {
                        const dayOfWeek = tempCurrent.getDay();
                        const year = tempCurrent.getFullYear();
                        const month = String(tempCurrent.getMonth() + 1).padStart(2, '0');
                        const date = String(tempCurrent.getDate()).padStart(2, '0');
                        const formattedDate = `${year}-${month}-${date}`;
                        
                        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
                        const isHoliday = holidays2026.includes(formattedDate);
                        
                        if (!isWeekend && !isHoliday) {
                            leadWorkingDays++;
                        }
                        tempCurrent.setDate(tempCurrent.getDate() + 1);
                    }
                }

                if (leadWorkingDays < 8) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: `Pengajuan paling lambat 8 hari kerja sebelum tanggal mulai FTB (pilihan Anda berjarak ${leadWorkingDays} hari kerja)` }));
                    return;
                }

                let diffDays = 0;
                if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
                    let current = new Date(start);
                    const holidays2026 = [
                        "2026-01-01", "2026-01-16", "2026-02-16", "2026-02-17",
                        "2026-03-18", "2026-03-19", "2026-03-20", "2026-03-21",
                        "2026-03-22", "2026-03-23", "2026-03-24", "2026-04-03",
                        "2026-04-05", "2026-05-01", "2026-05-14", "2026-05-15",
                        "2026-05-27", "2026-05-28", "2026-05-31", "2026-06-01",
                        "2026-06-16", "2026-08-17", "2026-08-25", "2026-12-24",
                        "2026-12-25"
                    ];
                    while (current <= end) {
                        const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
                        const year = current.getFullYear();
                        const month = String(current.getMonth() + 1).padStart(2, '0');
                        const date = String(current.getDate()).padStart(2, '0');
                        const formattedDate = `${year}-${month}-${date}`;
                        
                        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
                        const isHoliday = holidays2026.includes(formattedDate);
                        
                        if (!isWeekend && !isHoliday) {
                        diffDays++;
                        }
                        current.setDate(current.getDate() + 1);
                    }
                }

                if (diffDays > 4) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Durasi FTB maksimal adalah 4 hari kerja' }));
                    return;
                }
                if (diffDays === 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Durasi FTB minimal adalah 1 hari kerja' }));
                    return;
                }

                const encItem = encryptRecord(item);

                if (pool) {
                    const query = `
                        INSERT INTO permohonan_ftb (
                            nama_pegawai, nip, jabatan, unit_kerja_asal, nomor_whatsapp, 
                            nomor_whatsapp_kepegawaian, nomor_nota_dinas, tanggal_nota_dinas, 
                            tanggal_mulai, tanggal_selesai, durasi, status
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
                        RETURNING *
                    `;
                    const values = [
                        encItem.nama_pegawai, encItem.nip, encItem.jabatan, encItem.unit_kerja_asal, encItem.nomor_whatsapp,
                        encItem.nomor_whatsapp_kepegawaian, encItem.nomor_nota_dinas, item.tanggal_nota_dinas,
                        item.tanggal_mulai, item.tanggal_selesai, isNaN(diffDays) ? 0 : diffDays, 'Menunggu'
                    ];

                    pool.query(query, values, (err, result) => {
                        if (err) {
                            console.error('Postgres insert error:', err);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: `Database Error: ${err.message}` }));
                            return;
                        }
                        const insertedRow = decryptRecord(result.rows[0]);
                        const formatDate = (dVal) => dVal ? new Date(dVal).toISOString().split('T')[0] : '';
                        const formattedResponse = {
                            ...insertedRow,
                            tanggal_nota_dinas: formatDate(insertedRow.tanggal_nota_dinas),
                            tanggal_mulai: formatDate(insertedRow.tanggal_mulai),
                            tanggal_selesai: formatDate(insertedRow.tanggal_selesai),
                            created_at: insertedRow.created_at ? new Date(insertedRow.created_at).toISOString() : null
                        };
                        res.writeHead(201, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(formattedResponse));
                    });
                } else if (process.env.VERCEL) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Koneksi Database Supabase belum aktif atau URL database belum terbaca di Vercel. Pastikan skema SQL di Supabase sudah dijalankan.' }));
                    return;
                } else {
                    const newItemToStore = {
                        id: Math.random().toString(36).substring(2, 9) + '-' + Math.random().toString(36).substring(2, 9),
                        nama_pegawai: encItem.nama_pegawai,
                        nip: encItem.nip,
                        jabatan: encItem.jabatan,
                        unit_kerja_asal: encItem.unit_kerja_asal,
                        nomor_whatsapp: encItem.nomor_whatsapp,
                        nomor_whatsapp_kepegawaian: encItem.nomor_whatsapp_kepegawaian,
                        nomor_nota_dinas: encItem.nomor_nota_dinas,
                        tanggal_nota_dinas: item.tanggal_nota_dinas,
                        tanggal_mulai: item.tanggal_mulai,
                        tanggal_selesai: item.tanggal_selesai,
                        durasi: isNaN(diffDays) ? 0 : diffDays,
                        status: 'Menunggu',
                        created_at: new Date().toISOString()
                    };

                    const currentData = readData();
                    currentData.push(newItemToStore);
                    writeData(currentData);

                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(decryptRecord(newItemToStore)));
                }
        });
        return;
    }

    // PUT /api/permohonan/:id/status
    if (pathname.startsWith('/api/permohonan/') && pathname.endsWith('/status') && req.method === 'PUT') {
        const parts = pathname.split('/');
        // Format: /api/permohonan/{id}/status
        const id = parts[3];

        getParsedBody(req, (err, payload) => {
            if (err || !payload) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
                return;
            }
            const status = payload.status; // 'Disetujui' or 'Ditolak' or 'Menunggu'

                if (!status || !['Menunggu', 'Disetujui', 'Ditolak'].includes(status)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid status' }));
                    return;
                }

                if (pool) {
                    pool.query('SELECT * FROM permohonan_ftb WHERE id = $1', [id], (err, selectRes) => {
                        if (err || selectRes.rows.length === 0) {
                            res.writeHead(404, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Request not found' }));
                            return;
                        }
                        const item = decryptRecord(selectRes.rows[0]);
                        const formatDate = (dVal) => dVal ? new Date(dVal).toISOString().split('T')[0] : '';
                        item.tanggal_nota_dinas = formatDate(item.tanggal_nota_dinas);
                        item.tanggal_mulai = formatDate(item.tanggal_mulai);
                        item.tanggal_selesai = formatDate(item.tanggal_selesai);

                        const updateRecord = (alasanTolakPlain, downloadUrl) => {
                            const updateQuery = `
                                UPDATE permohonan_ftb 
                                SET status = $1, alasan_tolak = $2, download_url = $3 
                                WHERE id = $4 
                                RETURNING *
                            `;
                            const alasanTolakEncrypted = alasanTolakPlain ? encryptField(alasanTolakPlain) : null;
                            pool.query(updateQuery, [status, alasanTolakEncrypted, downloadUrl, id], (updateErr, updateRes) => {
                                if (updateErr) {
                                    console.error('Postgres update status error:', updateErr);
                                    res.writeHead(500, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ error: 'Database error updating status' }));
                                    return;
                                }
                                const updatedRow = decryptRecord(updateRes.rows[0]);
                                const formattedResponse = {
                                    ...updatedRow,
                                    tanggal_nota_dinas: formatDate(updatedRow.tanggal_nota_dinas),
                                    tanggal_mulai: formatDate(updatedRow.tanggal_mulai),
                                    tanggal_selesai: formatDate(updatedRow.tanggal_selesai),
                                    created_at: updatedRow.created_at ? new Date(updatedRow.created_at).toISOString() : null
                                };
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify(formattedResponse));
                            });
                        };

                        if (status === 'Menunggu') {
                            if (item.download_url) {
                                const filePathToDelete = path.join(__dirname, 'frontend', item.download_url);
                                if (fs.existsSync(filePathToDelete)) {
                                    try { fs.unlinkSync(filePathToDelete); } catch (e) {}
                                }
                            }
                            updateRecord(null, null);
                        } else {
                            const testItemForDocx = {
                                ...item,
                                alasan_tolak: status === 'Ditolak' ? (payload.alasan_tolak || '') : ''
                            };
                            generateDocx(testItemForDocx, status, (docxErr, downloadUrl) => {
                                updateRecord(
                                    status === 'Ditolak' ? (payload.alasan_tolak || '') : null,
                                    docxErr ? null : downloadUrl
                                );
                            });
                        }
                    });
                } else {
                    const currentData = readData();
                    const index = currentData.findIndex(item => item.id === id);
                    if (index === -1) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Request not found' }));
                        return;
                    }

                    const itemDecrypted = decryptRecord(currentData[index]);

                    currentData[index].status = status;
                    if (status === 'Ditolak') {
                        currentData[index].alasan_tolak = encryptField(payload.alasan_tolak || '');
                        itemDecrypted.alasan_tolak = payload.alasan_tolak || '';
                    } else {
                        currentData[index].alasan_tolak = undefined;
                        itemDecrypted.alasan_tolak = undefined;
                    }

                    if (status === 'Menunggu') {
                        if (currentData[index].download_url) {
                            const filePathToDelete = path.join(__dirname, 'frontend', currentData[index].download_url);
                            if (fs.existsSync(filePathToDelete)) {
                                try {
                                    fs.unlinkSync(filePathToDelete);
                                } catch (err) {
                                    console.error('Failed to delete generated file:', err);
                                }
                            }
                            currentData[index].download_url = undefined;
                        }
                        writeData(currentData);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(decryptRecord(currentData[index])));
                    } else {
                        generateDocx(itemDecrypted, status, (err, downloadUrl) => {
                            if (!err && downloadUrl) {
                                currentData[index].download_url = downloadUrl;
                            }
                            writeData(currentData);

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(decryptRecord(currentData[index])));
                        });
                    }
                }
        });
        return;
    }

    // Serve Static Files
    let filePath = '';
    if (pathname === '/' || pathname === '/index.html') {
        filePath = path.join(__dirname, 'frontend', 'index.html');
    } else if (pathname.startsWith('/generated/') && process.env.VERCEL) {
        filePath = path.join('/tmp', pathname);
    } else {
        filePath = path.join(__dirname, 'frontend', pathname);
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.m4a': 'audio/mp4',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Sorry, check with the site admin for error: ${error.code} ..\n`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`Development server running at http://localhost:${PORT}`);
    });
}

module.exports = server;
