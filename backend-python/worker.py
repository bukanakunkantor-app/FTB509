import time
import json
import urllib.request
from urllib.error import URLError, HTTPError

# Configuration
API_URL = "http://localhost:8080/api/permohonan"
POLL_INTERVAL_SECONDS = 10

# In-memory tracking of processed request statuses
# Key: request_id, Value: last_known_status
notified_requests = {}

def fetch_permohonan():
    """Fetch the list of FTB permohonan from the API server."""
    try {
        req = urllib.request.Request(
            API_URL, 
            headers={'User-Agent': 'Python FTB Worker/1.0', 'Accept': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = response.read().decode('utf-8')
                return json.loads(data)
    except HTTPError as e:
        print(f"[Worker Error] HTTP error response: {e.code} - {e.reason}")
    except URLError as e:
        print(f"[Worker Warning] API Server not reachable at {API_URL} ({e.reason}). Retrying...")
    except Exception as e:
        print(f"[Worker Error] Unexpected error fetching data: {e}")
    return None

def send_whatsapp_notification(nama, whatsapp, status, tgl_mulai, tgl_selesai, durasi):
    """Simulate sending a WhatsApp notification to the employee."""
    border = "=" * 65
    print("\n" + border)
    print(f"               🚀 WHATSAPP NOTIFICATION ENGINE 🚀               ")
    print(border)
    print(f"Ke Nomor : {whatsapp}")
    print(f"Penerima : {nama}")
    print(f"Pesan    :")
    
    if status == "Disetujui":
        pesan = (
            f"Halo Rekan {nama},\n\n"
            f"Selamat! Pengajuan Flexibilitas Tempat Bekerja (FTB) Anda "
            f"telah DISETUJUI oleh Admin.\n"
            f"Detail pelaksanaan:\n"
            f"- Periode : {tgl_mulai} s.d {tgl_selesai}\n"
            f"- Durasi  : {durasi} Hari\n\n"
            f"Silakan melaksanakan pekerjaan secara fleksibel sesuai dengan target "
            f"kinerja yang telah disepakati. Tetap jaga komunikasi aktif."
        )
    elif status == "Ditolak":
        pesan = (
            f"Halo Rekan {nama},\n\n"
            f"Pengajuan Flexibilitas Tempat Bekerja (FTB) Anda untuk tanggal "
            f"{tgl_mulai} s.d {tgl_selesai} telah DITOLAK oleh Admin.\n\n"
            f"Silakan berkoordinasi dengan atasan langsung atau Unit Kerja asal "
            f"untuk penjelasan lebih lanjut."
        )
    else:
        pesan = f"Halo Rekan {nama}, pengajuan FTB Anda berstatus: {status}."

    print(pesan)
    print(border + "\n")

def run_worker():
    print("=================================================================")
    print("      Sistem FTB - Python Background Notification Worker         ")
    print(f"      Polling API: {API_URL} setiap {POLL_INTERVAL_SECONDS} detik")
    print("=================================================================")
    
    # Initialize the baseline requests on first run to avoid spamming historical records
    print("[Worker] Menginisialisasi data permohonan...")
    initial_list = fetch_permohonan()
    if initial_list is not None:
        for item in initial_list:
            notified_requests[item['id']] = item['status']
        print(f"[Worker] Inisialisasi selesai. Memantau {len(notified_requests)} data awal.")
    else:
        print("[Worker] Gagal memuat data awal. Akan mengulang pada interval berikutnya.")

    while True:
        time.sleep(POLL_INTERVAL_SECONDS)
        
        current_list = fetch_permohonan()
        if current_list is None:
            continue

        for item in current_list:
            request_id = item['id']
            nama = item['nama_pegawai']
            whatsapp = item['nomor_whatsapp']
            status = item['status']
            tgl_mulai = item['tanggal_mulai']
            tgl_selesai = item['tanggal_selesai']
            durasi = item['durasi']

            # Check if this is a new request or a request that has transitioned its status
            if request_id not in notified_requests:
                # New request submitted
                notified_requests[request_id] = status
                print(f"[Worker Info] Terdeteksi permohonan baru untuk {nama} (Status: {status})")
                
                # If it's already approved or rejected upon first load, trigger notification
                if status in ["Disetujui", "Ditolak"]:
                    send_whatsapp_notification(nama, whatsapp, status, tgl_mulai, tgl_selesai, durasi)
            else:
                last_status = notified_requests[request_id]
                if last_status != status:
                    # Status transitioned!
                    notified_requests[request_id] = status
                    print(f"[Worker Info] Transisi status {nama}: {last_status} -> {status}")
                    
                    if status in ["Disetujui", "Ditolak"]:
                        send_whatsapp_notification(nama, whatsapp, status, tgl_mulai, tgl_selesai, durasi)

if __name__ == "__main__":
    try:
        run_worker()
    except KeyboardInterrupt:
        print("\n[Worker] Mematikan worker background. Sampai jumpa!")
