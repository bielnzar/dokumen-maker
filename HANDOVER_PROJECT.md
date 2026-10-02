# SYSTEM HANDOVER: DokumenMaker (LLM-RAB-RKS)
> **Target Audience / AI Persona:** Dokumen ini disusun sebagai *context handover* komprehensif untuk Model AI (Google Gemini / LLM) agar langsung memahami arsitektur, domain bisnis, alur kerja, struktur kode, aturan baku dokumen dinas, serta roadmap teknis proyek DokumenMaker.

---

## 1. Ringkasan Eksekutif & Domain Bisnis

### 1.1 Apa itu DokumenMaker?
**DokumenMaker (LLM-RAB-RKS)** adalah sistem otomasi pembuatan dokumen pengadaan resmi milik unit kerja **PT Terminal Petikemas Surabaya (Pelindo Group)**. 

### 1.2 Masalah yang Diselesaikan
Sebelum ada sistem ini, tim pengadaan harus menyalin data secara manual dari berkas **LHP (Laporan Hasil Pemeriksaan)** berupa PDF yang tebal dan berantakan ke template dokumen formal:
- **RAB (Rencana Anggaran Biaya):** File Excel (`.xlsx`) berumus formula dan PDF.
- **RKS (Rencana Kerja & Syarat-Syarat):** File Word (`.docx`) formal berspesifikasi tinggi dan PDF.
- **Nota Dinas Ijin Prinsip:** Dokumen pengantar dinas (`.docx`) dan PDF.

### 1.3 Alur Utama (End-to-End Flow)
```
[Unggah PDF LHP]
       │
       ▼
[OCR Engine: EasyOCR (300 DPI)] ──► Real-time Progress (SSE Phase 1)
       │
       ▼
[Ekstraksi Terstruktur: Gemini AI] ──► Real-time Progress (SSE Phase 2)
       │
       ▼
[Review & Koreksi Interaktif (Frontend)]
  ├── Edit Item BOQ / RAB (Volume, Satuan, Harga)
  ├── Drag & Drop / AI Paraphrase Butir Kegiatan Pasal 2
  ├── Validasi Termin Pembayaran (Wajib 100%)
  └── Penyesuaian Pejabat (Kepada, Dari, Tanggal)
       │
       ▼
[Generator Dokumen Multi-Engine]
  ├── python-docx  ──► RKS (.docx) & Nota Dinas (.docx)
  ├── openpyxl     ──► RAB (.xlsx) dengan formula hidup =C*E
  └── LibreOffice  ──► Konversi otomatis DOCX & XLSX ke PDF resmi
       │
       ▼
[Pratinjau Lembar A4 & Unduh Berkas Siap Cetak]
```

---

## 2. Tech Stack & Dependencies

### 2.1 Backend (Python 3.11+)
- **Framework:** FastAPI (REST API & Server-Sent Events / SSE)
- **Server:** Uvicorn (ASGI)
- **OCR Engine:** EasyOCR (Pytorch CPU/CUDA, Bahasa Indonesia `id` & Inggris `en`)
- **LLM Engine:** Google Gemini Flash (`gemini-3.6-flash` / `gemini-2.5-flash`) via `google-generativeai` / `google.genai`
- **Document Processing:**
  - `python-docx`: Templating Word, injeksi XML custom (`w:lvlOverride`, `keep_with_next`, `hanging indent`).
  - `openpyxl`: Excel workbook, formula dinamis, formatting Rupiah accounting, sel terbilang.
  - `num2words`: Mengubah nominal angka menjadi teks terbilang rupiah.
- **PDF Headless Converter:** LibreOffice (`soffice --headless --convert-to pdf`)
- **Progress Tracking:** `ProgressManager` thread-safe dengan dual-phase streaming (`ocr` → `ai`).

### 2.2 Frontend (React 19 + TypeScript + Vite)
- **Framework:** React 19 dengan TypeScript
- **Bundler:** Vite
- **Styling:** Tailwind CSS v4 + Radix UI / Shadcn Primitives
- **Palette:** OKLCH Corporate Navy (Standar Korporat BUMN Pelindo)
- **Theming:** `ThemeProvider` (Light, Dark, dan Auto/System)
- **Interaksi Drag & Drop:** `@dnd-kit/core` & `@dnd-kit/sortable` (untuk butir kegiatan Pasal 2)
- **In-Browser Document Preview:** `mammoth` (render file DOCX ke HTML di atas kanvas kertas A4 berskala presisi `.document-sheet`)
- **Networking:** Axios (HTTP REST) + EventSource (SSE Listener dengan auto-reconnect & cleanup)

---

## 3. Struktur Direktori & Peta File Penting

```
dokumenMaker/
├── backend/
│   ├── main.py                     # Entrypoint API FastAPI, routes REST & SSE endpoint
│   ├── .env                        # GEMINI_API_KEY, konfigurasi port & model
│   ├── requirements.txt            # Dependensi Python backend
│   ├── services/
│   │   ├── ocr_service.py          # Konversi PDF 300 DPI -> EasyOCR per halaman
│   │   ├── extraction_service.py   # Prompt engineering & parsing structured JSON dari Gemini
│   │   ├── docx_service.py         # Engine manipulasi naskah RKS, XML styling & hanging indent
│   │   ├── excel_service.py        # Engine generator RAB XLSX, formula =C*E, teks terbilang
│   │   ├── pdf_service.py          # Wrapper LibreOffice headless DOCX/XLSX -> PDF
│   │   └── paraphrase_service.py   # AI Assistant penulisan ulang butir kegiatan Pasal 2
│   ├── strategies/                 # Pola Strategy Pattern untuk jenis pengadaan
│   │   ├── base.py                 # Abstract Base Strategy
│   │   ├── factory.py              # StrategyFactory.create(doc_type)
│   │   ├── pengadaan_strategy.py   # Strategi barang/jasa PENGADAAN (multi-termin)
│   │   ├── pemeliharaan_strategy.py# Strategi pekerjaan PEMELIHARAAN (maintenance)
│   │   ├── padiumkm_strategy.py    # Strategi PaDi UMKM (termin 100%, kegiatan baku)
│   │   └── nodin_strategy.py       # Strategi Nota Dinas Ijin Prinsip
│   ├── templates/                  # Template master DOCX resmi PT TPS
│   │   ├── RKS_pengadaan.docx
│   │   ├── RKS_pemeliharaan.docx
│   │   ├── RKS_padiumkm.docx
│   │   └── nodin.docx
│   ├── utils/
│   │   ├── config.py               # Central Config (GEMINI_MODEL, directory paths)
│   │   ├── progress.py             # ProgressManager thread-safe untuk SSE
│   │   └── logger.py               # Konfigurasi logging terpusat
│   ├── uploads/                    # Folder temporary berkas LHP PDF yang diunggah
│   └── output/                     # Folder output hasil render (DOCX, XLSX, PDF)
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # Header korporat, Stepper (Upload -> Review -> Generate)
│   │   ├── components/
│   │   │   ├── UploadStep.tsx      # Dropzone PDF, progress bar terintegrasi fase OCR & AI
│   │   │   ├── ReviewStep.tsx      # Form koreksi RAB, editor Pasal 2, termin & metadata
│   │   │   ├── GenerateStep.tsx    # Download cards (DOCX/XLSX/PDF) & A4 Live Document Preview
│   │   │   ├── TerminPreview.tsx   # Visualisasi & kalkulator validasi termin 100%
│   │   │   ├── Pasal2Drawer.tsx    # Slide-over panel prompt AI paraphrase Pasal 2
│   │   │   └── ThemeToggle.tsx     # Toggle mode terang / gelap
│   │   ├── services/
│   │   │   └── api.ts              # Endpoint caller Axios & EventSource listener
│   │   └── types/
│   │       └── index.ts            # Definisi Interface TypeScript (ExtractedData, Item, dll.)
│   ├── package.json
│   └── vite.config.ts
│
├── run.sh                          # Skrip jalankan local (Backend port 8090, Frontend 5173)
├── deploy.sh                       # Skrip setup awal di server (venv + pip + npm install)
├── start_public_server.sh          # Menjalankan backend + Cloudflare Tunnel publik
├── Dockerfile                      # Image container berbasis Debian dengan LibreOffice & EasyOCR
├── README.md                       # Dokumentasi umum proyek
└── RENCANA_PENGEMBANGAN_EFISIENSI_TOKEN.md # Rencana arsitektur hybrid pipeline
```

---

## 4. Standar Tipografi & Format Dokumen Dinas Pelindo (Kritikal)

Format dokumen resmi PT TPS Pelindo memiliki aturan hukum dan tata letak yang ketat. Kode di `docx_service.py` wajib mematuhi standar berikut:

1. **Anti Distorsi Spasi ("Anti Gigi Ompong"):**
   - Paragraf rata kanan-kiri (*Justify*) dalam Word akan meregang secara jelek jika ada karakter *newline* paksa (`\n`) di tengah kalimat.
   - **Aturan:** Setiap butir kegiatan atau klausul dibuat sebagai paragraf terpisah (`doc.add_paragraph()`), bukan satu paragraf besar yang disambung `\n`.
2. **Hierarki Indentasi Gantung (*Hanging Indent*):**
   - Level 1 (misal `a.`, `b.`): Indentasi diatur tepat **0.76 cm**.
   - Level 2 (misal `1)`, `2)`): Indentasi diatur tepat **1.52 cm**.
   - Teks baris kedua dan seterusnya harus sejajar rapi di bawah teks baris pertama, bukan di bawah abjad/angka penomoran.
3. **Pemisahan Penomoran Mandiri Pasal 10 (Termin):**
   - Penomoran termin pada Pasal 10 tidak boleh melanjutkan nomor dari pasal sebelumnya.
   - Diimplementasikan menggunakan manipulasi XML Word: `<w:lvlOverride>` dan pembuatan `w:numId` baru.
4. **Tabel 3.1 & Blok Tanda Tangan Anti-Yatim (*Orphan Prevention*):**
   - Menambahkan aturan XML `keep_with_next` pada judul tabel dan header baris agar tabel tidak terpotong canggung di akhir halaman.
   - Normalisasi spasi paragraf sebelum blok tanda tangan agar tanda tangan pejabat tidak terdorong sendirian ke halaman baru (*orphan signature*).
5. **RAB Formula Dinamis & Teks Terbilang:**
   - Kolom `JUMLAH HARGA` pada Excel diisi dengan rumus asli `=C{row}*E{row}`, bukan angka mati.
   - Format angka menggunakan accounting style Rupiah: `_("Rp"* #,##0_);_("Rp"* (#,##0);_("Rp"* "-"_);_(@_)`.
   - Menggunakan `num2words(nominal, lang='id')` bertingkat untuk teks terbilang rupiah.

---

## 5. Tipe Dokumen & Strategi Bisnis (Document Types)

Sistem mendukung 3 kategori pengadaan dengan aturan berbeda:

| Jenis Dokumen | Karakteristik Termin | Karakteristik Pasal 2 (Ruang Lingkup) | Template Terkait |
| :--- | :--- | :--- | :--- |
| **`PENGADAAN`** | Fleksibel / Multi-termin (misal: DP 20%, Termin I 50%, Pelunasan 30%). | Disusun dinamis oleh AI berdasarkan kebutuhan teknis di LHP (instalasi, testing, comissioning). | `RKS_pengadaan.docx`, `RAB_pengadaan.docx` |
| **`PEMELIHARAAN`** | Berbasis progress pekerjaan servis / *monthly billing*. | Difokuskan pada SLA, jadwal servis berkala, dan lingkup perbaikan. | `RKS_pemeliharaan.docx` |
| **`PADI_UMKM`** | Wajib **1 Termin (100%)** setelah pekerjaan selesai dan BAST terbit. | Baku (Standar 2 butir: pengiriman barang dan serah terima sesuai spesifikasi). | `RKS_padiumkm.docx` |

---

## 6. Kontrak Data Utama (Data Contracts / TypeScript Types)

Ketika berinteraksi dengan API atau memodifikasi frontend, struktur data berikut adalah acuan utama:

```typescript
export interface Item {
  no: string | number;
  uraian: string;
  volume: string | number;
  satuan: string;
  harga_satuan?: string | number;
  jumlah_harga?: string | number;
}

export interface ExtractedData {
  project_name: string;
  timeline: string;
  work_type: string;
  scope_description: string;
  work_activities: string[];          // Butir naskah kegiatan Pasal 2
  items: Item[];                       // Daftar item tabel BOQ / RAB
  termin_count: number | '';          // Jumlah termin pembayaran
  payment_terms?: Record<string, string>; // Detail alokasi persentase & syarat termin
  document_type: 'PENGADAAN' | 'PEMELIHARAAN' | 'PADI_UMKM';
  validation_errors?: string[];
  kepada?: string;                     // Penerima Nota Dinas
  dari?: string;                       // Pengirim Nota Dinas
}

export interface GenerateResponse {
  success: boolean;
  files: {
    rab?: string;          // Filename RAB .xlsx
    rks?: string;          // Filename RKS .docx
    nodin?: string;        // Filename Nota Dinas .docx
    rab_pdf?: string;      // Filename RAB .pdf
    rks_pdf?: string;      // Filename RKS .pdf
    nodin_pdf?: string;    // Filename Nota Dinas .pdf
  };
  document_type: string;
}

export interface UploadProgress {
  current_page: number;
  total_pages: number;
  status: 'processing' | 'completed' | 'error';
  message: string;
  phase: 'ocr' | 'ai';                 // Dual-phase progress
  ai_progress?: number;                // 0 - 100% pada fase AI
}
```

---

## 7. Rincian Endpoint REST API (FastAPI)

- `POST /api/upload`: Unggah file PDF LHP, membuat `file_id`, dan memicu worker background OCR + AI.
- `GET /api/upload/progress/{file_id}`: Stream SSE (`text/event-stream`) progres ekstraksi (Fase OCR: halaman x/y $\rightarrow$ Fase AI: parsing data).
- `POST /api/upload/result/{file_id}`: Mengambil `ExtractedData` hasil pemrosesan.
- `POST /api/preview`: Menerima `ExtractedData` dan mengembalikan pratinjau naskah RKS dalam format HTML.
- `POST /api/generate`: Menghasilkan seluruh bundel berkas final (XLSX, DOCX, dan PDF via LibreOffice).
- `GET /api/download/{filename}`: Mengunduh file dari folder `output/`.
- `POST /api/regenerate-pasal2`: Meminta Gemini menyusun ulang klausul Pasal 2 berdasarkan instruksi kustom pengguna.
- `GET /api/document-types`: Mengambil daftar jenis dokumen yang didukung.
- `GET /health`: Endpoint cek status keaktifan backend.

---

## 8. Panduan Operasional & Menjalankan Sistem

### 8.1 Menjalankan di Localhost
Gunakan skrip root [run.sh](file:///home/bosmuda/Intern/TPS/SIDEJOB/dokumenMaker/run.sh):
```bash
./run.sh
```
- Backend otomatis berjalan di `http://localhost:8090` (atau `8091` jika bentrok).
- Frontend otomatis berjalan di `http://localhost:5173`.

### 8.2 Menjalankan di Server Baru (Fresh Clone)
Sebelum menjalankan `./run.sh`, server harus disiapkan menggunakan [deploy.sh](file:///home/bosmuda/Intern/TPS/SIDEJOB/dokumenMaker/deploy.sh):
```bash
chmod +x deploy.sh run.sh
./deploy.sh
```
Skrip ini akan membuat `backend/venv`, menginstall `requirements.txt`, menginstall `node_modules` frontend, dan membuat template `.env`.

### 8.3 Environment Variables (`backend/.env`)
```env
GEMINI_API_KEY=AIzaSy...                # Wajib: Google Gemini API Key
GEMINI_MODEL=gemini-3.6-flash           # Opsional: default gemini-3.6-flash
```

---

## 9. Roadmap Arsitektur: Efisiensi Token & Hybrid Pipeline

Saat ini sistem sedang dalam roadmap transisi dari **Full LLM Extraction** ke **2-Role Hybrid Pipeline** (Lihat detail di `RENCANA_PENGEMBANGAN_EFISIENSI_TOKEN.md`):

1. **Masalah Saat Ini:** Seluruh teks OCR mentah (hingga 12.000 karakter) dikirim ke Gemini, menghabiskan banyak token dan berisiko salah membaca angka tabel volume/harga.
2. **Arsitektur Masa Depan (Hybrid):**
   - **Peran 1 (Python Deterministik / 0 Token):**
     - Membuang halaman lampiran tiket IT & foto.
     - Mengekstrak tabel BOQ menggunakan geometri tabel `pdfplumber` (100% presisi angka).
     - Mengambil metadata tanggal/nomor surat menggunakan Regex.
   - **Peran 2 (AI Gemini Naratif / Hemat Token ~80%):**
     - LLM hanya dikirimi nama pekerjaan dan ringkasan kebutuhan material.
     - LLM hanya diminta menyusun klausul naratif: **Pasal 2 (Langkah Kerja Teknis)** dan **Scope Summary**.
3. **PENTING: Jangan Gunakan Multi-Agent LLM:**
   - Multi-agent (Agent Planner, Agent Extractor, Agent Reviewer) dilarang karena memboroskan token input hingga 3x lipat akibat *system prompt* berulang. Gunakan modul Python deterministik untuk pekerjaan non-kreatif.

---

## 10. Aturan Kerja untuk AI Assistant (Rules of Engagement)

Jika Anda (AI Gemini) ditugaskan untuk memodifikasi kode di repositori ini, patuhi instruksi berikut:
1. **Aturan Git:** **JANGAN PERNAH** melakukan atau menyarankan perintah `git push` otomatis. Seluruh proses git commit dan push dilakukan secara manual oleh developer.
2. **Integritas Dokumen Dinas:** Jangan menghapus logika *hanging indent*, *keep_with_next*, atau manipulasi XML pada `docx_service.py` karena format tersebut sudah sesuai kesepakatan divisi pengadaan Pelindo.
3. **Formula Excel:** Jangan mengubah hasil generator Excel menjadi angka statis. Rumus harus tetap berupa formula Excel (`=C*E`).
4. **Desain UI:** Jangan menambahkan elemen visual gimmicky (seperti terminal matrix hitam, ikon pulsing brain berlebihan). Jaga antarmuka tetap bersih, korporat, elegan, dan profesional.
5. **Bahasa:** Istilah dokumen pengadaan menggunakan standar formal Bahasa Indonesia (LHP, RKS, RAB, Nota Dinas, BAST, Termin Pembayaran, Pelindo).
