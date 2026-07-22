package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "github.com/lib/pq" // Postgres driver
)

// PermohonanFTB represents the structure of database table permohonan_ftb
type PermohonanFTB struct {
	ID            string    `json:"id"`
	NamaPegawai   string    `json:"nama_pegawai"`
	Nip           string    `json:"nip"`
	Jabatan       string    `json:"jabatan"`
	UnitKerjaAsal string    `json:"unit_kerja_asal"`
	NomorWhatsapp string    `json:"nomor_whatsapp"`
	TanggalMulai  string    `json:"tanggal_mulai"`
	TanggalSelesai string   `json:"tanggal_selesai"`
	Durasi        int       `json:"durasi"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
}

type StatusUpdatePayload struct {
	Status string `json:"status"`
}

var db *sql.DB

func main() {
	// 1. Database Connection Configuration (Supabase PostgreSQL)
	// Example Connection String: "postgres://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?sslmode=disable"
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		// Default fallback for development/local supabase docker
		connStr = "host=localhost port=5432 user=postgres password=postgres dbname=postgres sslmode=disable"
		log.Println("WARNING: DATABASE_URL env variable not set. Falling back to local default.")
	}

	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error opening database: %v", err)
	}
	defer db.Close()

	// Verify database connection
	err = db.Ping()
	if err != nil {
		log.Printf("Warning: Database ping failed: %v. Make sure database is running.", err)
	} else {
		log.Println("Successfully connected to Supabase PostgreSQL database.")
	}

	// 2. Set Up API Routes
	http.HandleFunc("/api/permohonan", handlePermohonan)
	http.HandleFunc("/api/permohonan/", handleStatusUpdate) // Matches /api/permohonan/{id}/status

	// 3. Serve Frontend Static Files
	frontendDir := "./frontend"
	if envDir := os.Getenv("FRONTEND_DIR"); envDir != "" {
		frontendDir = envDir
	}
	log.Printf("Serving static assets from directory: %s", frontendDir)

	fs := http.FileServer(http.Dir(frontendDir))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Serve index.html for root path or when files are not found (SPA routing fallback)
		path := filepath.Clean(r.URL.Path)
		fullPath := filepath.Join(frontendDir, path)

		// Check if file exists
		info, err := os.Stat(fullPath)
		if err != nil || info.IsDir() {
			http.ServeFile(w, r, filepath.Join(frontendDir, "index.html"))
			return
		}
		fs.ServeHTTP(w, r)
	})

	// 4. Start HTTP Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server listening on http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server startup failed: %v", err)
	}
}

// Enable CORS utility
func enableCORS(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
	(*w).Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

// Handler for GET /api/permohonan and POST /api/permohonan
func handlePermohonan(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method == http.MethodGet {
		// Fetch all requests
		rows, err := db.Query("SELECT id, nama_pegawai, nip, jabatan, unit_kerja_asal, nomor_whatsapp, tanggal_mulai, tanggal_selesai, durasi, status, created_at FROM permohonan_ftb ORDER BY created_at DESC")
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error": "Database error: %v"}`, err), http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		requests := []PermohonanFTB{}
		for rows.Next() {
			var item PermohonanFTB
			var mulTime, selTime time.Time
			err := rows.Scan(
				&item.ID,
				&item.NamaPegawai,
				&item.Nip,
				&item.Jabatan,
				&item.UnitKerjaAsal,
				&item.NomorWhatsapp,
				&mulTime,
				&selTime,
				&item.Durasi,
				&item.Status,
				&item.CreatedAt,
			)
			if err != nil {
				http.Error(w, fmt.Sprintf(`{"error": "Scan error: %v"}`, err), http.StatusInternalServerError)
				return
			}
			item.TanggalMulai = mulTime.Format("2002-01-02") // Output YYYY-MM-DD
			item.TanggalSelesai = selTime.Format("2002-01-02")
			// Keep format compatible
			item.TanggalMulai = strings.Split(mulTime.String(), " ")[0]
			item.TanggalSelesai = strings.Split(selTime.String(), " ")[0]

			requests = append(requests, item)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(requests)
		return
	}

	if r.Method == http.MethodPost {
		// Submit new request
		var item PermohonanFTB
		err := json.NewDecoder(r.Body).Decode(&item)
		if err != nil {
			http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
			return
		}

		// Field Validations
		if item.NamaPegawai == "" || item.Nip == "" || item.Jabatan == "" || item.UnitKerjaAsal == "" || item.NomorWhatsapp == "" || item.TanggalMulai == "" || item.TanggalSelesai == "" {
			http.Error(w, `{"error": "Missing required fields"}`, http.StatusBadRequest)
			return
		}

		// Parse dates and calculate duration
		start, err1 := time.Parse("2006-01-02", item.TanggalMulai)
		end, err2 := time.Parse("2006-01-02", item.TanggalSelesai)
		if err1 != nil || err2 != nil {
			http.Error(w, `{"error": "Invalid date format. Must be YYYY-MM-DD"}`, http.StatusBadRequest)
			return
		}

		if end.Before(start) {
			http.Error(w, `{"error": "Tanggal selesai cannot be before tanggal mulai"}`, http.StatusBadRequest)
			return
		}

		// Calculate duration in days (excluding weekends & 2026 Indonesian holidays)
		holidays2026 := map[string]bool{
			"2026-01-01": true, "2026-01-16": true, "2026-02-16": true, "2026-02-17": true,
			"2026-03-18": true, "2026-03-19": true, "2026-03-20": true, "2026-03-21": true,
			"2026-03-22": true, "2026-03-23": true, "2026-03-24": true, "2026-04-03": true,
			"2026-04-05": true, "2026-05-01": true, "2026-05-14": true, "2026-05-15": true,
			"2026-05-27": true, "2026-05-28": true, "2026-05-31": true, "2026-06-01": true,
			"2026-06-16": true, "2026-08-17": true, "2026-08-25": true, "2026-12-24": true,
			"2026-12-25": true,
		}

		durasi := 0
		for curr := start; !curr.After(end); curr = curr.AddDate(0, 0, 1) {
			dayOfWeek := curr.Weekday() // time.Sunday = 0, time.Saturday = 6
			formattedDate := curr.Format("2006-01-02")
			
			isWeekend := (dayOfWeek == time.Sunday || dayOfWeek == time.Saturday)
			isHoliday := holidays2026[formattedDate]
			
			if !isWeekend && !isHoliday {
				durasi++
			}
		}

		if durasi > 4 {
			http.Error(w, `{"error": "Durasi FTB maksimal adalah 4 hari kerja"}`, http.StatusBadRequest)
			return
		}
		if durasi == 0 {
			http.Error(w, `{"error": "Durasi FTB minimal adalah 1 hari kerja"}`, http.StatusBadRequest)
			return
		}

		// Insert into database
		var insertedID string
		var createdAt time.Time
		query := `
			INSERT INTO permohonan_ftb (nama_pegawai, nip, jabatan, unit_kerja_asal, nomor_whatsapp, tanggal_mulai, tanggal_selesai, durasi, status)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Menunggu')
			RETURNING id, created_at
		`
		err = db.QueryRow(query, item.NamaPegawai, item.Nip, item.Jabatan, item.UnitKerjaAsal, item.NomorWhatsapp, start, end, durasi).Scan(&insertedID, &createdAt)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error": "Database insert failed: %v"}`, err), http.StatusInternalServerError)
			return
		}

		item.ID = insertedID
		item.Durasi = durasi
		item.Status = "Menunggu"
		item.CreatedAt = createdAt

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(item)
		return
	}

	http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
}

// Handler for PUT /api/permohonan/{id}/status
func handleStatusUpdate(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if r.Method != http.MethodPut {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	// Extract ID from URL path: /api/permohonan/{id}/status
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 5 || parts[4] != "status" {
		http.Error(w, `{"error": "Invalid API endpoint path"}`, http.StatusBadRequest)
		return
	}
	id := parts[3]

	var payload StatusUpdatePayload
	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Validate status
	status := payload.Status
	if status != "Menunggu" && status != "Disetujui" && status != "Ditolak" {
		http.Error(w, `{"error": "Invalid status value. Must be Menunggu, Disetujui, or Ditolak"}`, http.StatusBadRequest)
		return
	}

	// Update DB record
	query := `
		UPDATE permohonan_ftb 
		SET status = $1 
		WHERE id = $2
		RETURNING id, nama_pegawai, nip, jabatan, unit_kerja_asal, nomor_whatsapp, tanggal_mulai, tanggal_selesai, durasi, status, created_at
	`

	var item PermohonanFTB
	var mulTime, selTime time.Time
	err = db.QueryRow(query, status, id).Scan(
		&item.ID,
		&item.NamaPegawai,
		&item.Nip,
		&item.Jabatan,
		&item.UnitKerjaAsal,
		&item.NomorWhatsapp,
		&mulTime,
		&selTime,
		&item.Durasi,
		&item.Status,
		&item.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, `{"error": "Permohonan FTB record not found"}`, http.StatusNotFound)
		} else {
			http.Error(w, fmt.Sprintf(`{"error": "Database update failed: %v"}`, err), http.StatusInternalServerError)
		}
		return
	}

	item.TanggalMulai = strings.Split(mulTime.String(), " ")[0]
	item.TanggalSelesai = strings.Split(selTime.String(), " ")[0]

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(item)
}
