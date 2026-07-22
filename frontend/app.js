const { useState, useEffect, useMemo, useRef } = React;

const holidayNames2026 = {
    "2026-01-01": "Tahun Baru Masehi",
    "2026-01-16": "Isra Mikraj Nabi Muhammad SAW",
    "2026-02-16": "Cuti Bersama Tahun Baru Imlek",
    "2026-02-17": "Tahun Baru Imlek 2577 Kongzili",
    "2026-03-18": "Cuti Bersama Hari Suci Nyepi",
    "2026-03-19": "Hari Suci Nyepi (Tahun Baru Saka 1948)",
    "2026-03-20": "Cuti Bersama Idul Fitri 1447 H",
    "2026-03-21": "Hari Raya Idul Fitri 1447 H",
    "2026-03-22": "Hari Raya Idul Fitri 1447 H",
    "2026-03-23": "Cuti Bersama Idul Fitri 1447 H",
    "2026-03-24": "Cuti Bersama Idul Fitri 1447 H",
    "2026-04-03": "Wafat Yesus Kristus",
    "2026-04-05": "Hari Paskah",
    "2026-05-01": "Hari Buruh Internasional",
    "2026-05-14": "Kenaikan Yesus Kristus",
    "2026-05-15": "Cuti Bersama Kenaikan Yesus Kristus",
    "2026-05-27": "Hari Raya Idul Adha 1447 H",
    "2026-05-28": "Cuti Bersama Idul Adha 1447 H",
    "2026-05-31": "Hari Raya Waisak 2570 BE",
    "2026-06-01": "Hari Lahir Pancasila",
    "2026-06-16": "Tahun Baru Islam 1448 H",
    "2026-08-17": "Hari Kemerdekaan RI",
    "2026-08-25": "Maulid Nabi Muhammad SAW",
    "2026-12-24": "Cuti Bersama Hari Raya Natal",
    "2026-12-25": "Hari Raya Natal"
};

// Helper for formatting Date objects to 'YYYY-MM-DD' local format
const formatDateStr = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Date formatting helper for output displays (e.g. Senin, 10 Agustus 2026)
const formatDisplayDate = (dateStr) => {
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

    return `${dayName}, ${day} ${monthName} ${year}`;
};

// Timestamp formatting helper (e.g. Senin, 22 Juli 2026 Pukul 14:15)
const formatTimestamp = (isoString) => {
    if (!isoString) return '';
    try {
        const dateObj = new Date(isoString);
        if (isNaN(dateObj.getTime())) return isoString;

        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const monthsFull = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];

        const dayName = days[dateObj.getDay()];
        const day = dateObj.getDate();
        const monthName = monthsFull[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');

        return `${dayName}, ${day} ${monthName} ${year} Pukul ${hours}:${minutes}`;
    } catch (e) {
        return isoString;
    }
};

// Calculate working days between two dates (first date exclusive, second date inclusive)
const getWorkingDaysBetween = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return 0;
    const parseLocalDate = (dateStr) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    };
    const start = parseLocalDate(startDateStr);
    const end = parseLocalDate(endDateStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return 0;

    let count = 0;
    let current = new Date(start);
    current.setDate(current.getDate() + 1);

    const holidays2026 = Object.keys(holidayNames2026);

    while (current <= end) {
        const dayOfWeek = current.getDay();
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const date = String(current.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${date}`;

        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        const isHoliday = holidays2026.includes(formattedDate);

        if (!isWeekend && !isHoliday) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    return count;
};

function App() {
    // Tab selection: 'buat' | 'monitoring' | 'admin'
    const [activeTab, setActiveTab] = useState('buat');

    // Audio Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Toast Alert State
    const [alert, setAlert] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Admin Auth State
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [adminError, setAdminError] = useState('');

    // Rejection Modal state
    const [rejectionModalItem, setRejectionModalItem] = useState(null);
    const [alasanTolakInput, setAlasanTolakInput] = useState('');

    // Calendar Selected Date state for Modal popup
    const [selectedDate, setSelectedDate] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [pickerMonth, setPickerMonth] = useState(new Date(2026, 6, 1)); // Default to July 2026

    // Form inputs state
    const [formInputs, setFormInputs] = useState({
        nama_pegawai: '',
        nip: '',
        jabatan: 'Pelaksana',
        unit_kerja_asal: '',
        nomor_whatsapp: '',
        nomor_whatsapp_kepegawaian: '',
        nomor_nota_dinas: '',
        tanggal_nota_dinas: '',
        tanggal_mulai: '',
        tanggal_selesai: ''
    });

    // API URL Base (works relative to current server)
    const API_BASE = '/api';

    // Fetch requests from server
    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/permohonan`);
            if (res.ok) {
                const data = await res.json();
                // Sort by created_at desc
                const sorted = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setRequests(sorted);
            } else {
                showToast('error', 'Gagal memuat data permohonan.');
            }
        } catch (err) {
            showToast('error', 'Koneksi ke server gagal.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    // Autoplay background music handler
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const startPlay = () => {
            if (audio) {
                audio.play()
                    .then(() => setIsPlaying(true))
                    .catch(e => console.log("Play failed on interaction:", e));
            }
            window.removeEventListener('click', startPlay);
            window.removeEventListener('keydown', startPlay);
        };

        // Try playing immediately
        audio.play()
            .then(() => {
                setIsPlaying(true);
            })
            .catch((err) => {
                console.log("Autoplay blocked. Will start on first user interaction.");
                window.addEventListener('click', startPlay);
                window.addEventListener('keydown', startPlay);
            });

        return () => {
            window.removeEventListener('click', startPlay);
            window.removeEventListener('keydown', startPlay);
        };
    }, []);

    const toggleMusic = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play().then(() => {
                    setIsPlaying(true);
                }).catch(err => {
                    console.error("Gagal memutar musik:", err);
                });
            }
        }
    };

    // Show dynamic toast alert
    const showToast = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => {
            setAlert(null);
        }, 5000);
    };

    // Calculate duration in days dynamically (excluding weekends and Indonesian holidays)
    const computedDuration = useMemo(() => {
        if (!formInputs.tanggal_mulai || !formInputs.tanggal_selesai) return 0;

        const parseLocalDate = (dateStr) => {
            const [year, month, day] = dateStr.split('-').map(Number);
            return new Date(year, month - 1, day);
        };

        const start = parseLocalDate(formInputs.tanggal_mulai);
        const end = parseLocalDate(formInputs.tanggal_selesai);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;

        let count = 0;
        let current = new Date(start);

        // Indonesian public holidays & cuti bersama in 2026
        const holidays2026 = Object.keys(holidayNames2026);

        while (current <= end) {
            const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday

            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            const date = String(current.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${date}`;

            const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
            const isHoliday = holidays2026.includes(formattedDate);

            if (!isWeekend && !isHoliday) {
                count++;
            }

            current.setDate(current.getDate() + 1);
        }
        return count;
    }, [formInputs.tanggal_mulai, formInputs.tanggal_selesai]);

    // Generate Calendar Day Array for Date Picker
    const pickerDays = useMemo(() => {
        const year = pickerMonth.getFullYear();
        const month = pickerMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const startDayIndex = firstDay.getDay(); // 0 = Sunday
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const cells = [];

        // Padding cells for previous month empty slots
        for (let i = 0; i < startDayIndex; i++) {
            cells.push({ type: 'empty', id: `picker-empty-${i}` });
        }

        // Current month cells
        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(year, month, day);
            const dateString = formatDateStr(dateObj);
            const dayOfWeek = dateObj.getDay();
            const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
            const holidayName = holidayNames2026[dateString] || null;
            const isHoliday = !!holidayName;

            const todayStr = formatDateStr(new Date());
            const leadDays = getWorkingDaysBetween(todayStr, dateString);
            const isTooClose = leadDays < 8;

            cells.push({
                type: 'day',
                dayNumber: day,
                dateStr: dateString,
                isWeekend,
                isHoliday,
                holidayName,
                isTooClose
            });
        }

        return cells;
    }, [pickerMonth]);

    const prevPickerMonth = () => {
        setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1));
    };

    const nextPickerMonth = () => {
        setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1));
    };

    const handleDateClick = (dateStr) => {
        const todayStr = formatDateStr(new Date());

        // If neither start nor end is selected, or both are already selected, set this as start date.
        if (!formInputs.tanggal_mulai || (formInputs.tanggal_mulai && formInputs.tanggal_selesai)) {
            const leadDays = getWorkingDaysBetween(todayStr, dateStr);
            if (leadDays < 8) {
                showToast('error', `Tanggal mulai FTB harus minimal 8 hari kerja dari hari ini (pilihan Anda hanya berjarak ${leadDays} hari kerja).`);
                return;
            }
            setFormInputs(prev => ({
                ...prev,
                tanggal_mulai: dateStr,
                tanggal_selesai: ''
            }));
        } else {
            // Start is selected, but end is not.
            if (dateStr < formInputs.tanggal_mulai) {
                // If clicked date is before start date, set it as new start date.
                const leadDays = getWorkingDaysBetween(todayStr, dateStr);
                if (leadDays < 8) {
                    showToast('error', `Tanggal mulai FTB harus minimal 8 hari kerja dari hari ini (pilihan Anda hanya berjarak ${leadDays} hari kerja).`);
                    return;
                }
                setFormInputs(prev => ({
                    ...prev,
                    tanggal_mulai: dateStr,
                    tanggal_selesai: ''
                }));
            } else {
                // Clicked date is after or equal to start date. Set it as end date.
                const start = new Date(formInputs.tanggal_mulai);
                const end = new Date(dateStr);

                let count = 0;
                let current = new Date(start);

                const holidays2026 = Object.keys(holidayNames2026);

                while (current <= end) {
                    const dayOfWeek = current.getDay();
                    const yr = current.getFullYear();
                    const mo = String(current.getMonth() + 1).padStart(2, '0');
                    const dy = String(current.getDate()).padStart(2, '0');
                    const formattedDate = `${yr}-${mo}-${dy}`;

                    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
                    const isHoliday = holidays2026.includes(formattedDate);

                    if (!isWeekend && !isHoliday) {
                        count++;
                    }
                    current.setDate(current.getDate() + 1);
                }

                if (count > 4) {
                    showToast('error', `Durasi pengajuan melebihi 4 hari kerja! Jarak tanggal terpilih adalah ${count} hari kerja. Silakan pilih rentang tanggal yang lebih pendek.`);
                    return;
                }

                if (count === 0) {
                    showToast('error', 'Durasi tidak boleh 0 hari kerja (tidak boleh seluruhnya hari libur/akhir pekan).');
                    return;
                }

                setFormInputs(prev => ({
                    ...prev,
                    tanggal_selesai: dateStr
                }));
            }
        }
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormInputs(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle Form Submit
    const handleFormSubmit = async (e) => {
        e.preventDefault();

        // Validations
        if (!formInputs.nama_pegawai.trim()) return showToast('error', 'Nama Pegawai harus diisi!');
        if (!formInputs.nip.trim()) return showToast('error', 'NIP Panjang Pegawai harus diisi!');
        if (formInputs.nip.length !== 18) return showToast('error', 'NIP Panjang Pegawai harus berupa 18 digit angka!');
        if (!formInputs.unit_kerja_asal.trim()) return showToast('error', 'Unit Kerja Asal harus diisi!');
        if (!formInputs.nomor_whatsapp.trim()) return showToast('error', 'Nomor Whatsapp harus diisi!');
        if (!formInputs.nomor_whatsapp_kepegawaian.trim()) return showToast('error', 'Nomor Whatsapp Kepegawaian harus diisi!');
        if (!formInputs.nomor_nota_dinas.trim()) return showToast('error', 'Nomor Nota Dinas Permohonan harus diisi!');
        if (!formInputs.tanggal_nota_dinas.trim()) return showToast('error', 'Tanggal Nota Dinas Permohonan harus diisi!');
        if (!formInputs.tanggal_mulai) return showToast('error', 'Tanggal Mulai FTB harus dipilih!');
        if (!formInputs.tanggal_selesai) return showToast('error', 'Tanggal Selesai FTB harus dipilih!');

        const start = new Date(formInputs.tanggal_mulai);
        const end = new Date(formInputs.tanggal_selesai);
        if (end < start) {
            return showToast('error', 'Tanggal Selesai tidak boleh mendahului Tanggal Mulai!');
        }

        const todayStr = formatDateStr(new Date());
        const leadDays = getWorkingDaysBetween(todayStr, formInputs.tanggal_mulai);
        if (leadDays < 8) {
            return showToast('error', `Pengajuan tidak sah! Tanggal mulai FTB harus minimal 8 hari kerja dari hari ini (jarak saat ini: ${leadDays} hari kerja).`);
        }

        if (computedDuration > 4) {
            return showToast('error', `Durasi FTB melebihi batas maksimal! Maksimal pengajuan adalah 4 hari kerja (pengajuan Anda: ${computedDuration} hari kerja).`);
        }
        if (computedDuration === 0) {
            return showToast('error', 'Durasi FTB tidak boleh 0 hari kerja (tidak boleh seluruhnya hari libur/akhir pekan).');
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/permohonan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formInputs)
            });

            if (res.ok) {
                setShowSuccessModal(true);
                // Reset form
                setFormInputs({
                    nama_pegawai: '',
                    nip: '',
                    jabatan: 'Pelaksana',
                    unit_kerja_asal: '',
                    nomor_whatsapp: '',
                    nomor_whatsapp_kepegawaian: '',
                    nomor_nota_dinas: '',
                    tanggal_nota_dinas: '',
                    tanggal_mulai: '',
                    tanggal_selesai: ''
                });
                // Re-fetch database records
                fetchRequests();
            } else {
                const data = await res.json();
                showToast('error', data.error || 'Gagal mengajukan permohonan.');
            }
        } catch (err) {
            showToast('error', 'Terjadi kesalahan jaringan.');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Admin Login
    const handleAdminLogin = (e) => {
        e.preventDefault();
        if (adminPassword === 'lantai2') {
            setIsAdminAuthenticated(true);
            setAdminPassword('');
            setAdminError('');
            showToast('success', 'Berhasil masuk ke Dashboard Admin.');
        } else {
            setAdminError('Kata Sandi Admin Salah!');
        }
    };

    // Handle Admin Action (Approve / Reject)
    const handleUpdateStatus = async (id, status, alasan_tolak = '') => {
        try {
            const res = await fetch(`${API_BASE}/permohonan/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, alasan_tolak })
            });

            if (res.ok) {
                const updatedItem = await res.json();
                showToast('success', `Permohonan atas nama ${updatedItem.nama_pegawai} telah ${status === 'Disetujui' ? 'disetujui' : 'ditolak'}.`);
                // Update local state list with the fully updated item from server
                setRequests(prev => prev.map(item => item.id === id ? updatedItem : item));
            } else {
                showToast('error', 'Gagal memperbarui status permohonan.');
            }
        } catch (err) {
            showToast('error', 'Koneksi ke server gagal.');
            console.error(err);
        }
    };



    // Generate Calendar Day Array for Current Month
    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        // First day of the month
        const firstDayOfMonth = new Date(year, month, 1);
        // Day of week for first day (0 = Sunday, 1 = Monday, etc.)
        const startDayIndex = firstDayOfMonth.getDay();

        // Number of days in the month
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const cells = [];

        // Padding cells for previous month empty slots
        for (let i = 0; i < startDayIndex; i++) {
            cells.push({ type: 'empty', id: `empty-${i}` });
        }

        // Current month cells
        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(year, month, day);
            const dateString = formatDateStr(dateObj);

            // Check if this date has any FTB permohonan (regardless of status)
            const activeFTB = requests.filter(item => {
                return item.tanggal_mulai <= dateString &&
                    item.tanggal_selesai >= dateString;
            });

            cells.push({
                type: 'day',
                dayNumber: day,
                dateStr: dateString,
                dateObj: dateObj,
                hasRequests: activeFTB.length > 0,
                activeFTB: activeFTB
            });
        }

        return cells;
    }, [currentMonth, requests]);

    // Handle Month Navigation
    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    // Statistics counts
    const stats = useMemo(() => {
        const total = requests.length;
        const pending = requests.filter(r => r.status === 'Menunggu').length;
        const approved = requests.filter(r => r.status === 'Disetujui').length;
        const rejected = requests.filter(r => r.status === 'Ditolak').length;
        return { total, pending, approved, rejected };
    }, [requests]);

    return (
        <>
            <div className="app-container" style={{ position: 'relative', overflow: 'hidden' }}>
                {/* Semarang Minimalist Ornaments */}
                <div className="semarang-watermark-batik"></div>
                <div className="semarang-watermark-tugu">
                    <svg viewBox="0 0 100 200" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}>
                        <path d="M50 20 C45 35 48 45 50 55 C52 45 55 35 50 20 Z" fill="currentColor" />
                        <line x1="50" y1="55" x2="50" y2="150" strokeWidth="2" />
                        <path d="M47 70 H53 M46 90 H54 M45 110 H55 M44 130 H56" />
                        <path d="M40 150 H60" strokeWidth="2" />
                        <path d="M36 156 H64 L62 165 H38 Z" fill="none" />
                        <path d="M30 165 H70" strokeWidth="2.5" />
                        <path d="M20 175 H80" strokeWidth="3" />
                        <path d="M10 185 H90" strokeWidth="3.5" />
                        <rect x="5" y="185" width="90" height="8" rx="1" fill="currentColor" opacity="0.1" />
                    </svg>
                </div>

                {/* Header */}
                <header style={{ position: 'relative', zIndex: 2 }}>
                    <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div className="logo-icon-container" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>
                            {/* Minimalist Tugu Muda Vector Logo */}
                            <svg width="32" height="48" viewBox="0 0 100 150" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 4px rgba(79, 70, 229, 0.15))' }}>
                                <path d="M50 15 C46 25 48 32 50 40 C52 32 54 25 50 15 Z" fill="currentColor" />
                                <line x1="50" y1="40" x2="50" y2="110" strokeWidth="4" />
                                <path d="M47 55 H53 M46 70 H54 M45 85 H55 M44 100 H56" />
                                <path d="M40 110 H60" strokeWidth="4" />
                                <path d="M35 115 H65 L62 122 H38 Z" fill="none" />
                                <path d="M28 122 H72" strokeWidth="5" />
                                <path d="M18 130 H82" strokeWidth="6" />
                                <path d="M8 138 H92" strokeWidth="7" />
                            </svg>
                        </div>
                        <div>
                            <h1>Sistem FTB Semarang Tengah</h1>
                            <p>Mari Mencoba Bekerja di Semarang Tengah</p>
                        </div>
                    </div>

                    {/* Navigation Menu */}
                    <nav>
                        <button
                            className={`nav-btn ${activeTab === 'buat' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('buat'); setAlert(null); }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                            Buat Permohonan
                        </button>
                        <button
                            className={`nav-btn ${activeTab === 'monitoring' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('monitoring'); setAlert(null); }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                            Monitoring Permohonan
                        </button>
                        <button
                            className={`nav-btn admin-tab ${activeTab === 'admin' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('admin'); setAlert(null); }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            Admin Portal
                        </button>
                    </nav>
                </header>

                {/* Alert Notification Toast */}
                {alert && (
                    <div className={`alert-success ${alert.type === 'error' ? 'badge ditolak' : ''}`} style={{ justifyContent: 'flex-start', padding: '12px 18px', width: '100%', marginBottom: '20px' }}>
                        {alert.type === 'error' ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                        <span>{alert.message}</span>
                    </div>
                )}

                {/* Content Area */}
                <main className="view-panel">

                    {/* 1. Tab Buat Permohonan */}
                    {activeTab === 'buat' && (
                        <div className="two-column-layout">
                            {/* Form Panel */}
                            <div className="panel-card">
                                <h2>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                                    Formulir Pengajuan FTB
                                </h2>
                                <form onSubmit={handleFormSubmit} className="form-grid">
                                    <div className="form-group full-width">
                                        <label>Nama Lengkap Pegawai</label>
                                        <input
                                            type="text"
                                            name="nama_pegawai"
                                            placeholder="Contoh: Ahmad Subarjo"
                                            value={formInputs.nama_pegawai}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group full-width">
                                        <label>NIP Panjang Pegawai</label>
                                        <input
                                            type="text"
                                            name="nip"
                                            placeholder="Contoh: 199501012018011001"
                                            value={formInputs.nip}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 18);
                                                setFormInputs(prev => ({ ...prev, nip: val }));
                                            }}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Jabatan</label>
                                        <select
                                            name="jabatan"
                                            value={formInputs.jabatan}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="Pelaksana">Pelaksana</option>
                                            <option value="Account Representative">Account Representative</option>
                                            <option value="Juru Sita">Juru Sita</option>
                                            <option value="Bendaharawan">Bendaharawan</option>
                                            <option value="Sekretaris">Sekretaris</option>
                                            <option value="Pemeriksa Pajak Pertama">Pemeriksa Pajak Pertama</option>
                                            <option value="Pemeriksa Pajak Pelaksana">Pemeriksa Pajak Pelaksana</option>
                                            <option value="Pemeriksa Pajak Pelaksana Lanjutan">Pemeriksa Pajak Pelaksana Lanjutan</option>
                                            <option value="Penyuluh Pajak Ahli Pertama">Penyuluh Pajak Ahli Pertama</option>
                                            <option value="Asisten Penyuluh Pajak Terampil">Asisten Penyuluh Pajak Terampil</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Unit Kerja Asal</label>
                                        <input
                                            type="text"
                                            name="unit_kerja_asal"
                                            placeholder="Contoh: KPP Pratama Semarang Tengah"
                                            value={formInputs.unit_kerja_asal}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group full-width">
                                        <label>Nomor WhatsApp (Aktif)</label>
                                        <input
                                            type="tel"
                                            name="nomor_whatsapp"
                                            placeholder="Contoh: 081234567890"
                                            value={formInputs.nomor_whatsapp}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group full-width">
                                        <label>Nomor WhatsApp Kepegawaian Kantor Asal (untuk koordinasi)</label>
                                        <input
                                            type="tel"
                                            name="nomor_whatsapp_kepegawaian"
                                            placeholder="Contoh: 081234567890"
                                            value={formInputs.nomor_whatsapp_kepegawaian}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Nomor Nota Dinas Permohonan FTB</label>
                                        <input
                                            type="text"
                                            name="nomor_nota_dinas"
                                            placeholder="Contoh: ND-123/KPP.XXXX/2026"
                                            value={formInputs.nomor_nota_dinas}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Tanggal Nota Dinas Permohonan FTB</label>
                                        <input
                                            type="date"
                                            name="tanggal_nota_dinas"
                                            value={formInputs.tanggal_nota_dinas}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group full-width">
                                        <label>Pilih Rentang Tanggal FTB (Maksimal 4 Hari Kerja)</label>
                                        <div className="range-picker-container">
                                            <div className="range-picker-header">
                                                <button type="button" className="btn-picker-nav" onClick={prevPickerMonth} title="Bulan Sebelumnya">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                                                </button>
                                                <span className="picker-month-title">
                                                    {pickerMonth.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                                                </span>
                                                <button type="button" className="btn-picker-nav" onClick={nextPickerMonth} title="Bulan Selanjutnya">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                                                </button>
                                            </div>

                                            <div className="picker-grid">
                                                <div className="picker-day-label weekend">Min</div>
                                                <div className="picker-day-label">Sen</div>
                                                <div className="picker-day-label">Sel</div>
                                                <div className="picker-day-label">Rab</div>
                                                <div className="picker-day-label">Kam</div>
                                                <div className="picker-day-label">Jum</div>
                                                <div className="picker-day-label weekend">Sab</div>
                                            </div>

                                            <div className="picker-grid" style={{ marginTop: '0.25rem' }}>
                                                {pickerDays.map((cell) => {
                                                    if (cell.type === 'empty') {
                                                        return <div key={cell.id} className="picker-cell empty"></div>;
                                                    }

                                                    const isStart = formInputs.tanggal_mulai === cell.dateStr;
                                                    const isEnd = formInputs.tanggal_selesai === cell.dateStr;
                                                    const isInRange = formInputs.tanggal_mulai && formInputs.tanggal_selesai &&
                                                        cell.dateStr > formInputs.tanggal_mulai && cell.dateStr < formInputs.tanggal_selesai;

                                                    let cellClass = "picker-cell";
                                                    if (isStart) cellClass += " range-start";
                                                    if (isEnd) cellClass += " range-end";
                                                    if (isInRange) cellClass += " range-in";
                                                    if (cell.isWeekend) cellClass += " weekend";
                                                    if (cell.isHoliday) cellClass += " holiday";
                                                    if (cell.isTooClose) cellClass += " disabled too-close";

                                                    return (
                                                        <div
                                                            key={cell.dateStr}
                                                            className={cellClass}
                                                            onClick={() => handleDateClick(cell.dateStr)}
                                                            title={cell.isTooClose ? "Batas pengajuan minimal 8 hari kerja dari hari ini" : (cell.holidayName || (cell.isWeekend ? "Akhir Pekan" : "Klik untuk memilih"))}
                                                        >
                                                            <span className="picker-day-num">{cell.dayNumber}</span>
                                                            {cell.isHoliday && <span className="picker-holiday-dot"></span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Picker Guide Legend */}
                                        <div className="picker-legend">
                                            <div className="picker-legend-item">
                                                <span className="picker-legend-dot holiday"></span>
                                                <span>Hari Libur / Cuti Bersama</span>
                                            </div>
                                            <div className="picker-legend-item">
                                                <span className="picker-legend-dot weekend"></span>
                                                <span>Akhir Pekan</span>
                                            </div>
                                            <div className="picker-legend-item">
                                                <span className="picker-legend-box range"></span>
                                                <span>Rentang FTB</span>
                                            </div>
                                        </div>

                                        <div className="selected-range-info">
                                            {formInputs.tanggal_mulai ? (
                                                <div>
                                                    Pilihan: <strong style={{ color: 'var(--primary)' }}>{formatDisplayDate(formInputs.tanggal_mulai)}</strong>
                                                    {formInputs.tanggal_selesai ? (
                                                        <span> s.d <strong style={{ color: 'var(--primary)' }}>{formatDisplayDate(formInputs.tanggal_selesai)}</strong> ({computedDuration} Hari Kerja)</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--warning)', fontStyle: 'italic' }}> (Silakan pilih tanggal selesai...)</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                    Silakan klik tanggal pada kalender di atas untuk memilih tanggal mulai.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn-submit"
                                        disabled={submitting}
                                    >
                                        {submitting ? 'Mengirim...' : 'Kirim Permohonan'}
                                        {!submitting && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="11" y1="2" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>}
                                    </button>
                                </form>
                            </div>

                            {/* Guide Panel */}
                            <div className="info-panel">
                                <div className="guide-card">
                                    <h3>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="16" y2="12" /><line x1="12" x2="12.01" y1="8" y2="8" /></svg>
                                        Petunjuk Pengajuan FTB
                                    </h3>
                                    <ul>
                                        <li>Pastikan data nama, jabatan, dan unit kerja asal sudah sesuai dengan data kepegawaian.</li>
                                        <li>Isikan nomor WhatsApp aktif untuk koordinasi.</li>
                                        <li>Nomor Nota Dinas boleh versi Booking Nomor untuk memudahkan.</li>
                                        <li>Durasi akan dihitung otomatis setelah Anda memilih tanggal mulai dan tanggal selesai.</li>
                                        <li>Permohonan yang diajukan akan berstatus <strong>Menunggu</strong> sebelum ditelaah oleh Admin.</li>
                                    </ul>
                                </div>

                                <div className="panel-card stats-card">
                                    <h2>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" /></svg>
                                        Ringkasan Permohonan di KPP Pratama Semarang Tengah
                                    </h2>
                                    <div className="stat-item">
                                        <span className="stat-label">Total Permohonan</span>
                                        <span className="stat-value">{stats.total}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Menunggu Persetujuan</span>
                                        <span className="stat-value" style={{ color: 'var(--warning)' }}>{stats.pending}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Disetujui</span>
                                        <span className="stat-value" style={{ color: 'var(--success)' }}>{stats.approved}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. Tab Monitoring Permohonan */}
                    {activeTab === 'monitoring' && (
                        <div className="panel-card">
                            <h2>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                                Kalender Monitoring FTB
                            </h2>

                            <div className="calendar-wrapper">
                                <div className="calendar-header">
                                    <h3>
                                        {currentMonth.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <div className="calendar-nav-buttons">
                                        <button className="btn-cal-nav" onClick={prevMonth} title="Bulan Sebelumnya">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                                        </button>
                                        <button className="btn-cal-nav" onClick={nextMonth} title="Bulan Selanjutnya">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Calendar Days Legend */}
                                <div className="calendar-grid" style={{ marginBottom: '0px' }}>
                                    <div className="calendar-day-label" style={{ color: 'var(--danger)' }}>Min</div>
                                    <div className="calendar-day-label">Sen</div>
                                    <div className="calendar-day-label">Sel</div>
                                    <div className="calendar-day-label">Rab</div>
                                    <div className="calendar-day-label">Kam</div>
                                    <div className="calendar-day-label">Jum</div>
                                    <div className="calendar-day-label">Sab</div>
                                </div>

                                {/* Calendar Grid Cells */}
                                <div className="calendar-grid">
                                    {calendarDays.map((cell) => {
                                        if (cell.type === 'empty') {
                                            return <div key={cell.id} className="calendar-cell empty"></div>;
                                        }

                                        const isToday = formatDateStr(new Date()) === cell.dateStr;

                                        return (
                                            <div
                                                key={cell.dateStr}
                                                className={`calendar-cell ${isToday ? 'today' : ''}`}
                                                onClick={() => {
                                                    if (cell.activeFTB && cell.activeFTB.length > 0) {
                                                        setSelectedDate(cell);
                                                    } else {
                                                        // Optional alert if empty date clicked
                                                        showToast('info', `Tidak ada pengajuan FTB pada tanggal ${formatDisplayDate(cell.dateStr)}.`);
                                                    }
                                                }}
                                            >
                                                <span className="day-number">{cell.dayNumber}</span>
                                                {cell.activeFTB && cell.activeFTB.length > 0 && (
                                                    <div className="dots-container">
                                                        {cell.activeFTB.map((item, idx) => {
                                                            let dotClass = "dot-indicator";
                                                            if (item.status === 'Disetujui') dotClass += " success";
                                                            else if (item.status === 'Menunggu') dotClass += " warning";
                                                            else if (item.status === 'Ditolak') dotClass += " danger";
                                                            return (
                                                                <div
                                                                    key={item.id || idx}
                                                                    className={dotClass}
                                                                    title={`${item.nama_pegawai} (${item.status})`}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Calendar Guide Info */}
                            <div className="calendar-legend">
                                <div className="legend-item">
                                    <span className="legend-dot success"></span>
                                    <span>Disetujui</span>
                                </div>
                                <div className="legend-item">
                                    <span className="legend-dot warning"></span>
                                    <span>Menunggu Persetujuan</span>
                                </div>
                                <div className="legend-item">
                                    <span className="legend-dot danger"></span>
                                    <span>Ditolak</span>
                                </div>
                                <div className="legend-item">
                                    <span className="legend-today-box"></span>
                                    <span>Hari Ini</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. Tab Admin Panel */}
                    {activeTab === 'admin' && (
                        <div>
                            {!isAdminAuthenticated ? (
                                /* Admin Authentication Login card */
                                <div className="panel-card admin-login-box" style={{ textAlign: 'center', maxWidth: '440px', margin: '2rem auto', padding: '2.5rem 2rem' }}>
                                    <div style={{ background: 'rgba(79,70,229,0.06)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--primary)' }}>
                                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                    </div>
                                    <h2 style={{ display: 'block', textAlign: 'center', width: '100%', marginBottom: '0.5rem' }}>Otentikasi Administrator</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>Silakan masukkan kata sandi admin untuk mengakses panel persetujuan.</p>
                                    <form onSubmit={handleAdminLogin}>
                                        <div className="form-group" style={{ textAlign: 'left' }}>
                                            <label>Kata Sandi Admin</label>
                                            <input
                                                type="password"
                                                placeholder="Masukkan sandi"
                                                value={adminPassword}
                                                onChange={(e) => setAdminPassword(e.target.value)}
                                                required
                                            />
                                        </div>
                                        {adminError && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: '500', marginTop: '0.5rem', textAlign: 'center' }}>{adminError}</div>}
                                        <button type="submit" className="btn-admin-auth">Masuk Panel Admin</button>
                                    </form>
                                </div>
                            ) : (
                                /* Admin Main Dashboard */
                                <div className="admin-dashboard">
                                    <div className="admin-header-actions">
                                        <div className="admin-title-wrap">
                                            <h2>Dashboard Persetujuan FTB</h2>
                                            <p>Total {requests.length} pengajuan masuk ke sistem</p>
                                        </div>
                                        <button
                                            className="btn-logout"
                                            onClick={() => setIsAdminAuthenticated(false)}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                                                Keluar Admin
                                            </div>
                                        </button>
                                    </div>

                                    <div className="table-responsive">
                                        {requests.length === 0 ? (
                                            <div className="empty-state">
                                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="8" x2="16" y1="12" y2="12" /></svg>
                                                <p>Belum ada permohonan FTB yang diajukan oleh pegawai.</p>
                                            </div>
                                        ) : (
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Pegawai</th>
                                                        <th>Unit Kerja</th>
                                                        <th>Nomor WhatsApp</th>
                                                        <th>Tanggal FTB</th>
                                                        <th>Status</th>
                                                        <th>Tindakan / Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {requests.map((item) => (
                                                        <tr key={item.id}>
                                                            <td>
                                                                <div className="name-cell">
                                                                    <span className="name">{item.nama_pegawai}</span>
                                                                    <span className="role">{item.jabatan} • NIP {item.nip}</span>
                                                                    {item.created_at && (
                                                                         <span className="timestamp-info" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                                                             Dikirim: {formatTimestamp(item.created_at)}
                                                                         </span>
                                                                     )}
                                                                    {item.nomor_nota_dinas && (
                                                                        <span className="nd-info" style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '4px', display: 'block' }}>
                                                                            ND: {item.nomor_nota_dinas} ({formatDisplayDate(item.tanggal_nota_dinas)})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td>{item.unit_kerja_asal}</td>
                                                            <td>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <a
                                                                        href={`https://wa.me/${item.nomor_whatsapp.replace(/[^0-9]/g, '')}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="whatsapp-link"
                                                                        title="WhatsApp Aktif"
                                                                    >
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                                                        <span>Aktif: {item.nomor_whatsapp}</span>
                                                                    </a>
                                                                    {item.nomor_whatsapp_kepegawaian && (
                                                                        <a
                                                                            href={`https://wa.me/${item.nomor_whatsapp_kepegawaian.replace(/[^0-9]/g, '')}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="whatsapp-link"
                                                                            style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}
                                                                            title="WhatsApp Kepegawaian"
                                                                        >
                                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                                                            <span>Kepeg: {item.nomor_whatsapp_kepegawaian}</span>
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="date-range">
                                                                    {formatDisplayDate(item.tanggal_mulai)} s.d {formatDisplayDate(item.tanggal_selesai)}
                                                                </div>
                                                                <div className="date-duration">
                                                                    Durasi: {item.durasi} Hari
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className={`badge ${item.status.toLowerCase()}`}>
                                                                    <span className="status-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', marginRight: '4px', display: 'inline-block' }}></span>
                                                                    {item.status}
                                                                </span>
                                                                {item.status === 'Ditolak' && item.alasan_tolak && (
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '4px', maxWidth: '150px', wordBreak: 'break-word', fontStyle: 'italic' }}>
                                                                        Alasan: {item.alasan_tolak}
                                                                    </div>
                                                                )}
                                                                {item.download_url && (
                                                                    <a
                                                                        href={item.download_url}
                                                                        download
                                                                        className="btn-action approve"
                                                                        style={{ marginTop: '8px', display: 'inline-flex', padding: '4px 8px', fontSize: '0.75rem', textDecoration: 'none', gap: '4px', alignItems: 'center' }}
                                                                    >
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                                                        Unduh ND
                                                                    </a>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {item.status === 'Menunggu' ? (
                                                                    <div className="action-buttons-cell">
                                                                        <button
                                                                            className="btn-action approve"
                                                                            onClick={() => handleUpdateStatus(item.id, 'Disetujui')}
                                                                        >
                                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                                            Setujui
                                                                        </button>
                                                                        <button
                                                                            className="btn-action reject"
                                                                            onClick={() => {
                                                                                setRejectionModalItem(item);
                                                                                setAlasanTolakInput('');
                                                                            }}
                                                                        >
                                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                                                                            Tolak
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Selesai ditelaah</span>
                                                                        <button
                                                                            className="btn-action reject"
                                                                            onClick={() => handleUpdateStatus(item.id, 'Menunggu')}
                                                                            style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', gap: '4px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid rgba(15,23,42,0.1)', boxShadow: 'none' }}
                                                                        >
                                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                                                                            Batal Aksi
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div> {/* End of app-container */}

            {/* Modal Alasan Penolakan */}
            {rejectionModalItem && (
                <div className="modal-overlay" onClick={() => setRejectionModalItem(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header" style={{ background: 'linear-gradient(135deg, var(--danger) 0%, #f43f5e 100%)' }}>
                            <h3>Alasan Penolakan FTB</h3>
                            <button className="modal-close" onClick={() => setRejectionModalItem(null)}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ padding: '1.5rem' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                Berikan alasan penolakan permohonan untuk <strong>{rejectionModalItem.nama_pegawai}</strong>:
                            </p>
                            <textarea
                                value={alasanTolakInput}
                                onChange={(e) => setAlasanTolakInput(e.target.value)}
                                placeholder="Tulis alasan penolakan di sini..."
                                rows="4"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1.5px solid rgba(15, 23, 42, 0.1)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.9rem',
                                    fontFamily: 'inherit',
                                    outline: 'none',
                                    resize: 'none',
                                    marginBottom: '1.25rem'
                                }}
                                required
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button
                                    onClick={() => setRejectionModalItem(null)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: '#f1f5f9',
                                        color: 'var(--text-muted)',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: '500'
                                    }}
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!alasanTolakInput.trim()) {
                                            showToast('error', 'Alasan penolakan harus diisi!');
                                            return;
                                        }
                                        await handleUpdateStatus(rejectionModalItem.id, 'Ditolak', alasanTolakInput);
                                        setRejectionModalItem(null);
                                    }}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'var(--danger)',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: '500'
                                    }}
                                >
                                    Kirim Penolakan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detail untuk Hari Kalender yang di-Klik */}
            {selectedDate && (
                <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Detail Permohonan: {formatDisplayDate(selectedDate.dateStr)}</h3>
                            <button className="modal-close" onClick={() => setSelectedDate(null)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                Terdapat {selectedDate.activeFTB.length} pengajuan FTB pada tanggal ini:
                            </p>
                            <div className="employee-ftb-list">
                                {selectedDate.activeFTB.map((item) => (
                                    <div
                                        key={item.id}
                                        className="employee-ftb-item"
                                        style={{ borderLeft: `4px solid ${item.status === 'Disetujui' ? 'var(--success)' : item.status === 'Ditolak' ? 'var(--danger)' : 'var(--warning)'}` }}
                                    >
                                        <div className="emp-details">
                                            <h4>{item.nama_pegawai}</h4>
                                            <p>{item.jabatan} • NIP {item.nip} • {item.unit_kerja_asal}</p>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                                WA Aktif: {item.nomor_whatsapp} {item.nomor_whatsapp_kepegawaian && `• WA Kepegawaian: ${item.nomor_whatsapp_kepegawaian}`}
                                            </p>
                                            {item.nomor_nota_dinas && (
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                                    ND Permohonan: {item.nomor_nota_dinas} ({formatDisplayDate(item.tanggal_nota_dinas)})
                                                </p>
                                            )}
                                            {item.status === 'Ditolak' && item.alasan_tolak && (
                                                <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.1rem', fontStyle: 'italic' }}>
                                                    Alasan Penolakan: {item.alasan_tolak}
                                                </p>
                                            )}
                                            <p style={{ fontSize: '0.75rem', marginTop: '0.2rem', color: 'var(--primary)' }}>
                                                Periode: {formatDisplayDate(item.tanggal_mulai)} s.d {formatDisplayDate(item.tanggal_selesai)} ({item.durasi} Hari)
                                            </p>
                                        </div>
                                        <div>
                                            <span className={`badge ${item.status === 'Disetujui' ? 'disetujui' : item.status === 'Ditolak' ? 'ditolak' : 'menunggu'}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Konfirmasi Sukses Permohonan */}
            {showSuccessModal && (
                <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header" style={{ background: 'linear-gradient(135deg, var(--success) 0%, #059669 100%)' }}>
                            <h3>Permohonan Berhasil Direkam</h3>
                            <button className="modal-close" onClick={() => setShowSuccessModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ padding: '2rem', textAlign: 'center' }}>
                            <div style={{ background: 'rgba(16,185,129,0.1)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--success)' }}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '0.75rem' }}>Berhasil!</h2>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                                Permohonan FTB Anda telah berhasil direkam di sistem dan berstatus <strong>Menunggu</strong> persetujuan Admin.
                            </p>
                            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(15, 23, 42, 0.05)', marginBottom: '1.5rem', textAlign: 'left' }}>
                                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-dark)', marginBottom: '0.5rem', fontWeight: '600' }}>Hubungi Contact Person (Konfirmasi):</h4>
                                <a
                                    href="https://wa.me/6285799864292"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        color: '#25D366',
                                        textDecoration: 'none'
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                    Astri (085799864292)
                                </a>
                            </div>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                style={{
                                    padding: '0.6rem 1.5rem',
                                    background: 'var(--primary)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    width: '100%',
                                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
                                }}
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Background Audio and Unified Music Player Widget */}
            <audio
                ref={audioRef}
                src="gambangsemarang.m4a"
                loop
                autoPlay
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />

            <div className={`music-player-widget ${isPlaying ? 'playing' : 'paused'}`}>
                <div className="music-info-badge">
                    <span className="now-playing-label">Now Playing</span>
                    <span className="song-title">Gambang Semarang</span>
                    {isPlaying && (
                        <div className="music-waves">
                            <span></span>
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    )}
                </div>
                <button
                    className={`music-toggle-btn ${isPlaying ? 'playing' : 'paused'}`}
                    onClick={toggleMusic}
                    title={isPlaying ? "Matikan Musik" : "Putar Musik"}
                >
                    {isPlaying ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                    )}
                </button>
            </div>
        </>
    );
}

// Render the application to the DOM root
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
