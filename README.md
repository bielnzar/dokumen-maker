# DokumenMaker (LLM-RAB-RKS)

Aplikasi otomasi dokumen pengadaan BUMN (**PT Terminal Petikemas Surabaya • Pelindo**). Mengonversi berkas LHP (*Laporan Hasil Pemeriksaan*) berformat PDF → ekstraksi data terstruktur berbasis AI → penelaahan & koreksi interaktif → penerbitan dokumen resmi **RAB (XLSX & PDF)**, **RKS (DOCX & PDF)**, dan **Nota Dinas Ijin Prinsip (DOCX & PDF)**.

**Teknologi Utama:** FastAPI (Python 3.11+) + React 19 / TypeScript / Vite + Tailwind CSS v4 + EasyOCR + Gemini 2.5 Flash + python-docx + openpyxl + LibreOffice Headless (PDF Converter).

---

## Alur Kerja (Workflow)

```
Unggah PDF LHP → OCR (EasyOCR 300 DPI, page-by-page)
               → Ekstraksi AI (Gemini 2.5 Flash via Server-Sent Events)
               → Telaah & Koreksi (Item RAB, Pasal 2, Termin Pembayaran, Kepada/Dari)
               → Penerbitan Dokumen Lengkap:
                 ├── RAB (XLSX & PDF)
                 ├── RKS (DOCX & PDF)
                 └── Nota Dinas Ijin Prinsip (DOCX & PDF)
```

---

## Tech Stack

### Backend (FastAPI)
- **OCR:** EasyOCR (GPU/CPU, multi-language `id`, `en`)
- **AI Engine:** Gemini 2.5 Flash via `google-generativeai` / `google.genai`
- **Word Engine:** `python-docx` (template processing, tabel dinamis, XML numbering overrides, hanging indent)
- **Excel Engine:** `openpyxl` (rumus otomatis `=C*E`, pemformatan Rupiah, sel terbilang bertingkat)
- **PDF Engine:** LibreOffice Headless (`pdf_service.py` untuk konversi DOCX & XLSX ke PDF)
- **Streaming:** `ProgressManager` berbasis SSE (Server-Sent Events) dual-phase (*ocr* → *ai*)
- **Background Tasks:** Threading daemon dengan proteksi idempotensi (`_regenerating_files`)

### Frontend (React + TypeScript)
- **Bundler & Framework:** Vite + React 19 + TypeScript
- **Styling:** Vanilla Tailwind CSS v4 + Shadcn UI primitives + OKLCH Corporate Navy Palette
- **Theming:** `ThemeProvider` dengan dukungan **Mode Terang (Light)**, **Mode Gelap (Dark)**, dan **Otomatis (System)**
- **Drag & Drop:** `@dnd-kit` untuk penyusunan urutan butir kegiatan Pasal 2
- **Document Preview:** `mammoth` (render naskah RKS HTML di atas kanvas kertas A4 `.document-sheet`)
- **HTTP & SSE:** Axios + EventSource dengan auto-cleanup

---

## Struktur Direktori

### Backend Structure
```
backend/
├── main.py                        # Entrypoint FastAPI, endpoints REST, streaming SSE
├── services/
│   ├── ocr_service.py              # Pemindaian PDF 300 DPI → EasyOCR ekstraksi teks
│   ├── extraction_service.py      # Ekstraksi data terstruktur LHP dengan Gemini AI
│   ├── docx_service.py             # Templating DOCX, tabel RAB/RKS, numbering, hanging indent
│   ├── excel_service.py            # Workbook XLSX, rumus =C*E, Rupiah, teks terbilang
│   ├── pdf_service.py              # Konversi headless DOCX & XLSX ke PDF via LibreOffice
│   └── paraphrase_service.py       # Penyesuaian redaksi kegiatan Pasal 2
├── strategies/
│   ├── base.py                     # Abstract DocumentStrategy
│   ├── factory.py                  # StrategyFactory.create(doc_type)
│   ├── pengadaan_strategy.py       # Strategi PENGADAAN (termin, AI activities)
│   ├── pemeliharaan_strategy.py    # Strategi PEMELIHARAAN
│   └── padiumkm_strategy.py        # Strategi PADI_UMKM (termin 100%, 2 kegiatan baku)
├── utils/
│   ├── config.py                   # Konfigurasi paths, OCR, model AI
│   ├── progress.py                 # ProgressManager thread-safe
│   └── logger.py                   # Central logging setup
└── templates/                      # Template DOCX resmi dengan placeholder {{tag}}
```

### Frontend Structure
```
frontend/src/
├── App.tsx                         # Layout utama, header korporat TPS, stepper, sticky footer
├── components/
│   ├── UploadStep.tsx              # Dropzone berkas PDF, progres berjenjang (tanpa hacker console)
│   ├── ReviewStep.tsx              # Penelaahan data proyek, item 3.1, termin, dan kegiatan
│   ├── GenerateStep.tsx            # Strip metrik, preview naskah A4, kartu unduhan DOCX/XLSX/PDF
│   ├── TerminPreview.tsx           # Tabel alokasi termin dan validasi 100% dengan status dot
│   ├── Pasal2Drawer.tsx            # Panel penyesuaian instruksi redaksi Pasal 2
│   ├── ThemeToggle.tsx             # Pengubah tema (Terang / Gelap / Sistem)
│   └── theme-provider.tsx          # Provider tema dengan persistensi localStorage & media query
├── services/api.ts                 # Service API Axios & SSE listener
└── types/index.ts                  # Deklarasi tipe data TypeScript (ExtractedData, GenerateResponse, dll.)
```

---

## Fitur Unggulan Terbaru

### 1. Ekspor Multi-Format Resmi (DOCX/XLSX + PDF)
Sistem secara otomatis mengonversi seluruh berkas kerja hasil generasi ke dalam format PDF siap cetak:
- **RAB:** Format `.xlsx` (dengan rumus formula hidup) dan format `.pdf`.
- **RKS:** Format `.docx` dan format `.pdf`.
- **Nota Dinas Ijin Prinsip:** Format `.docx` dan format `.pdf`.

### 2. Standar Tipografi & Format Dokumen RKS
- **Bebas Distorsi Spasi (*Anti Gigi Ompong*):** Mengeliminasi pemisahan baris paksa `\n` pada paragraf rata kanan-kiri (*Justify*). Setiap butir dibuat sebagai paragraf list independen.
- **Hierarki Indentasi Presisi (*Hanging Indent*):** Mengatur posisi nomor dan teks berjenjang (Level 1 di 0.76 cm, Level 2 di 1.52 cm) sehingga baris lanjutan rata rapi di bawah teks, bukan di bawah angka.
- **Penomoran Pasal 10 Mandiri:** Menjamin nomor termin Pasal 10 selalu dimulai dari `1.` melalui tag XML `<w:lvlOverride>` dan `w:numId` baru.
- **Tabel 3.1 & Blok Tanda Tangan Menyatu:** Dilengkapi aturan `keep_with_next` agar caption tabel tidak terpisah dari tabelnya, serta normalisasi margin sehingga blok tanda tangan menyatu di halaman penutup tanpa lembar yatim (*orphan signature*).

### 3. Antarmuka Eksekutif BUMN & Dukungan Dark Mode
- **Desain Bersih & Elegan:** Menghilangkan elemen visual "AI gimmicky" (seperti terminal hitam raw JSON streaming, pulsing brain, dan badge pill kaku yang melingkari teks).
- **Theme Switcher:** Tersedia opsi **Terang**, **Gelap**, dan **Sistem** dengan kontras tabel yang telah disesuaikan agar tidak menyilaukan.
- **Kanvas Kertas A4:** Lembar naskah RKS ditampilkan di atas kanvas kertas bersudut halus (`.document-sheet`) untuk memberikan representasi cetak fisik sebelum diunduh.

---

## Daftar Endpoint API

| Method | Path | Deskripsi |
|--------|------|-----------|
| `POST` | `/api/upload` | Mengunggah PDF LHP, membuat `file_id`, dan memulai proses OCR/AI di background |
| `GET` | `/api/upload/progress/{file_id}` | Streaming Server-Sent Events (SSE) progres OCR dan ekstraksi data |
| `POST` | `/api/upload/result/{file_id}` | Mengambil data hasil ekstraksi terstruktur |
| `POST` | `/api/preview` | Menghasilkan pratinjau HTML naskah RKS dan tabel RAB |
| `POST` | `/api/generate` | Menerbitkan berkas lengkap (RAB XLSX/PDF, RKS DOCX/PDF, Nota Dinas DOCX/PDF) |
| `GET` | `/api/download/{filename}` | Mengunduh berkas hasil generasi |
| `POST` | `/api/regenerate-pasal2` | Memperbarui redaksi butir kegiatan Pasal 2 dengan instruksi khusus |
| `GET` | `/api/document-types` | Mendapatkan daftar tipe dokumen pengadaan yang didukung |

---

## Prasyarat & Instalasi

### Prasyarat Sistem
- **Python:** 3.11+
- **Node.js:** 18+ (disarankan Node.js 20+)
- **LibreOffice:** Wajib terpasang untuk konversi PDF headless (misal: `sudo apt install libreoffice-nogpu` atau `libreoffice-core`)
- **GPU (CUDA):** Opsional (EasyOCR otomatis beralih ke mode CPU jika CUDA tidak terdeteksi)

### Menjalankan Aplikasi (Satu Pintu)
Gunakan skrip pengaktifan otomatis di root direktori:
```bash
./run.sh
```
Skrip ini akan secara otomatis:
1. Menjalankan Backend Uvicorn di `http://localhost:8000`
2. Menjalankan Frontend Vite di `http://localhost:5173` (atau port alternatif jika port terpakai)

### Menjalankan Secara Manual

**1. Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Pastikan file .env memiliki GEMINI_API_KEY
# GEMINI_API_KEY=your_api_key_here

python main.py
```

**2. Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**3. Menjalankan Pengujian (Testing):**
```bash
cd backend
source venv/bin/activate
pytest tests/
```

---

## Struktur Data Utama (TypeScript)

```typescript
export interface ExtractedData {
  project_name: string;
  timeline: string;
  work_type: string;
  scope_description: string;
  work_activities: string[];
  items: Item[];
  termin_count: number | '';
  payment_terms?: Record<string, string>;
  document_type: 'PENGADAAN' | 'PEMELIHARAAN' | 'PADI_UMKM';
  validation_errors?: string[];
  kepada?: string;
  dari?: string;
}

export interface GenerateResponse {
  success: boolean;
  files: {
    rab?: string;          // RAB .xlsx
    rks?: string;          // RKS .docx
    rab_xlsx?: string;     // alias RAB .xlsx
    nodin?: string;        // Nota Dinas .docx
    rab_pdf?: string;      // RAB .pdf
    rks_pdf?: string;      // RKS .pdf
    nodin_pdf?: string;    // Nota Dinas .pdf
  };
  document_type: string;
}
```