# Setup Modul Surat Tugas AI

## File yang Perlu Ditambahkan ke Project

```
api/
└── gemini.js                 ← Vercel serverless function (BARU)

js/
└── surat-tugas-ai.js         ← Modul UI + logic (BARU)

css/
└── surat-tugas-ai.css        ← Styles modul (BARU)

vercel.json                   ← Konfigurasi Vercel (BARU / update)
```

## Perubahan Minimal ke File yang Ada

### index.html — 3 baris

**Di `<head>`:**
```html
<link rel="stylesheet" href="css/surat-tugas-ai.css">
```

**Di sidebar nav (section Dokumen):**
```html
<button class="nav-item" data-page="surat-tugas-ai">
  <span class="nav-icon">🤖</span> Surat Tugas AI
</button>
```

**Di bagian bawah (setelah generate.js, sebelum pages.js):**
```html
<script src="js/surat-tugas-ai.js"></script>
```

### pages.js — 3 baris

```javascript
// 1. Di PAGES object
PAGES['surat-tugas-ai'] = `<div id="st-ai-container"></div>`;

// 2. Di PAGE_TITLES object
'surat-tugas-ai': { title: 'Surat Tugas AI', sub: 'Draft surat dengan bantuan Gemini' },

// 3. Di loadPage()
if (pageId === 'surat-tugas-ai') renderSuratTugasAI();
```

## Setup Vercel Environment Variable

Di Vercel Dashboard → Project → Settings → Environment Variables:

```
GEMINI_API_KEY = AIza... (API key dari Google AI Studio)
```

Cara dapat API key gratis:
1. Buka https://aistudio.google.com
2. Get API key → Create API key
3. Copy dan paste ke Vercel env var

## Cara Kerja

```
User isi form singkat
       ↓
POST /api/gemini (Vercel serverless)
       ↓ API key aman di server, tidak expose ke browser
Gemini 2.0 Flash API
       ↓ JSON { dasar, deskripsi_tugas }
User review + edit textarea
       ↓
Pilih template surat_tugas dari Kelola Template
       ↓
Generate .docx → download
       ↓
Auto-simpan ke Riwayat
```

## Key yang Digunakan di DB/localStorage

```
sppd_surat_tugas_ai    ← Riwayat surat tugas AI (baru, tidak konflik)
```

Modul ini hanya MEMBACA dari key yang sudah ada:
- sppd_pegawai
- sppd_unit_kerja  
- AppState.templates (via template-storage.js)
