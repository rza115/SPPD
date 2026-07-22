# Task: Tambah field "Nama Tempat" di Data Perjalanan Dinas

## Konteks
Di halaman "Data Perjalanan Dinas" (step 1 wizard perjalanan), untuk jenis
perjalanan `dalam_kota` cuma ada dropdown "Kecamatan Tujuan". Nggak ada
tempat buat isi nama tempat spesifik (misal "Kantor Kecamatan Kemang").
User mau tambahan input teks opsional buat itu, yang juga kepakai di
dokumen hasil generate (SPPD / Surat Tugas).

## Instruksi

1. Cek posisi kerja saat ini ada di root repo `SPPD` (ada `package.json`,
   folder `js/`, dll). Kalau belum, `cd` ke situ dulu.
2. Apply patch `nama-tempat-tujuan.patch` (satu folder sama file .md ini)
   dengan:

   ```bash
   git apply nama-tempat-tujuan.patch
   ```

   Kalau `git apply` gagal karena whitespace/line-ending, coba:

   ```bash
   git apply --whitespace=fix nama-tempat-tujuan.patch
   ```

   Kalau tetap gagal (mismatch context — kemungkinan file udah berubah
   dari versi yang dipatch), JANGAN paksa force apply. Laporkan ke user
   bagian mana yang conflict, baru terapkan perubahan yang sama secara
   manual mengikuti deskripsi di bawah.

3. File yang kena dampak:
   - `js/perjalanan.js`
   - `js/generate.js`
   - `js/pages.js` (dokumentasi field reference, bukan logic)

4. Ringkasan perubahan (buat verifikasi manual kalau patch gagal):
   - **`renderStep1()`**: di blok `tujuan-field` untuk kondisi
     `dalam_kota`, tambah `<input id="f-nama-tempat">` opsional di bawah
     `<select id="f-kecamatan">`, binding ke `PJD.form.nama_tempat`.
   - **`updateTujuanField()`**: tambahin input yang sama persis (field ini
     di-render ulang tiap kali user ganti "Jenis Perjalanan").
   - **`renderPJDCard()`**: variabel `tujuan` — pakai `p.nama_tempat` dulu
     kalau ada, fallback ke nama kecamatan seperti sebelumnya.
   - **`renderStep4()`** (ringkasan): sama, variabel `tujuan` pakai
     `f.nama_tempat` dulu kalau ada.
   - **`buildTujuanText()`** di `generate.js`: kalau
     `pjd.jenis_perjalanan === 'dalam_kota'` dan `pjd.nama_tempat` keisi,
     return itu langsung (dipakai buat text `tujuan`/`tempat_tujuan` di
     docx generate).
   - **`js/pages.js`** (baris deskripsi field `tujuan` dan
     `untuk_pembayaran` di halaman Panduan/Referensi Field): update teks
     penjelasan + contoh biar nyebut opsi override "Nama Tempat" manual.
     Ini murni teks dokumentasi buat user, tidak ada logic yang berubah.

   Catatan: field lain yang menampilkan tujuan (`js/rekap.js`, kwitansi
   `untuk_pembayaran`, `tujuan_perjalanan`, label kartu SPPD, preview
   dokumen) semuanya manggil `buildTujuanText()` secara terpusat, jadi
   otomatis ikut kepakai tanpa perlu diedit terpisah. `js/master.js`
   (data master tarif kecamatan) dan `js/surat-tugas-ai.js` (modul AI
   Surat Tugas yang isolated, sudah punya field teks bebas sendiri)
   sengaja TIDAK disentuh — di luar scope perubahan ini.

5. Field `nama_tempat` ini **opsional** — jangan tambahin ke validasi
   wajib di `validateStep()`. Behavior lama (cuma kecamatan, tanpa nama
   tempat) harus tetap jalan normal kalau field dikosongin.

6. Setelah apply, jalankan cek cepat:
   ```bash
   node -c js/perjalanan.js
   node -c js/generate.js
   node -c js/pages.js
   ```
   (buat mastiin nggak ada syntax error dari template string yang ke-edit)

7. Kalau ada dev server / build step di proyek ini, jalankan buat smoke
   test halaman "Perjalanan Dinas" → isi form dalam kota → cek input
   "Nama tempat" muncul di bawah dropdown kecamatan, kesimpen ke
   ringkasan, dan ke hasil generate dokumen.

## Selesai kalau
- Patch ke-apply bersih (atau perubahan manual setara).
- `node -c` tiga file di atas nggak error.
- Nggak ada perubahan lain di luar fungsi/baris yang disebut di atas
  (4 fungsi di `perjalanan.js`/`generate.js` + 2 baris dokumentasi di
  `pages.js`).
