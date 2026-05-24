# SPPD Generator

Aplikasi web untuk generate dokumen perjalanan dinas (SPPD, Kwitansi, Surat Tugas, Rekap Belanja) dari template `.docx`.

## Fitur autentikasi

- Halaman login: `login.html` (masuk, daftar, lupa kata sandi)
- Aplikasi utama: `index.html` (dilindungi — redirect ke login jika belum masuk)
- Backend auth: [Supabase](https://supabase.com)

## Setup Supabase

1. Buat proyek di [supabase.com](https://supabase.com).
2. **Authentication → Providers → Email**: aktifkan Email.
3. **SQL Editor**: jalankan isi file `supabase/schema.sql`.
4. **Project Settings → API**: salin **Project URL** dan **anon public** key.

### URL redirect (penting)

Di **Authentication → URL Configuration**:

| Field | Nilai (contoh) |
|--------|----------------|
| Site URL | `https://nama-app.vercel.app` |
| Redirect URLs | `https://nama-app.vercel.app/login.html`, `http://localhost:5500/login.html` |

## Pengembangan lokal

```bash
# Salin template konfigurasi
cp js/config.example.js js/config.js
# Edit js/config.js — isi supabaseUrl dan supabaseAnonKey
```

Jalankan dengan Live Server / `npx serve` lalu buka `login.html`.

Tanpa konfigurasi Supabase, `index.html` tetap bisa dibuka (mode dev) dengan peringatan di konsol.

## Deploy ke Vercel

1. Push repositori ke GitHub.
2. Import project di [vercel.com](https://vercel.com).
3. Tambahkan **Environment Variables**:

   - `SUPABASE_URL` — URL proyek Supabase  
   - `SUPABASE_ANON_KEY` — anon public key  

4. Deploy. Build command (`npm run build`) akan membuat `js/config.js` dari env vars.

Setelah deploy, buka `https://domain-anda.vercel.app/login.html` untuk masuk.

## Struktur file auth

| File | Fungsi |
|------|--------|
| `login.html` | UI masuk / daftar |
| `js/auth.js` | Logika Supabase Auth |
| `js/config.js` | Kredensial (jangan commit jika berisi data asli) |
| `js/config.example.js` | Template konfigurasi |
| `scripts/generate-config.js` | Generate config saat build Vercel |
| `supabase/schema.sql` | Tabel `profiles` + trigger |

## Penyimpanan data (Supabase)

Semua data aplikasi disimpan di tabel **`sppd_user_store`** (JSON per kunci, per user):

| Kunci | Isi |
|--------|-----|
| `sppd_unit_kerja` | Unit kerja / dinas |
| `sppd_pegawai` | Data pegawai |
| `sppd_tarif` | Tarif uang harian |
| `sppd_kecamatan` | Tarif transport kecamatan |
| `sppd_sipd` | Kode rekening SIPD |
| `sppd_perjalanan` | Perjalanan dinas |
| `sppd_templates` | Metadata template (nama, placeholder, path storage) |
| **Storage** `sppd-templates` | File .docx (bucket Supabase, per user) |
| `sppd_generated` | Riwayat generate |

### Migrasi dari localStorage

Saat **login pertama** dengan Supabase aktif:

1. Data di browser (localStorage) yang belum ada di cloud **otomatis di-upload**.
2. Muncul notifikasi berisi ringkasan data yang dimigrasi.
3. Flag `sppd_migrated_<user_id>` mencegah migrasi ulang.

Tanpa login / tanpa Supabase: data tetap di **localStorage** (mode lokal).

### Supabase Storage (template .docx)

Jalankan **`supabase/storage.sql`** di SQL Editor untuk membuat bucket `sppd-templates` dan kebijakan akses (hanya pemilik folder `{user_id}/...`).

- **Cloud (login)**: file .docx di Storage; metadata di `sppd_user_store`
- **Lokal (tanpa login)**: file tetap base64 di browser
- Template lama yang masih base64 di database **otomatis dipindah** ke Storage saat login

Batas ukuran per file: **50 MB** (dapat diubah di `storage.sql`).

### SQL tambahan (jika sudah pernah jalankan schema lama)

Jika tabel `profiles` sudah ada, cukup jalankan bagian **`sppd_user_store`** di `supabase/schema.sql`, lalu **`supabase/storage.sql`**.

### Badge di aplikasi

- **☁️ Cloud** — data tersimpan di Supabase  
- **💾 Lokal** — hanya di browser ini

## Lisensi

Internal — Dinas Kebudayaan Kabupaten Bogor.
