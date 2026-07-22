# Task: Hapus Grid "Phase Development" di Dashboard

## Konteks
Dashboard (`PAGES.dashboard` di `js/pages.js`) masih nampilin grid sisa
masa development — 4 kartu "Phase 1" s/d "Phase 4" (Foundation, Data
Master, Form Perjalanan, Generate Engine) yang semuanya bertanda ✓ done.
Ini nggak relevan lagi buat end user, dihapus.

## Instruksi

1. Pastikan posisi kerja di root repo `SPPD`, patch-patch sebelumnya udah
   ke-apply duluan.
2. Apply patch `hapus-phase-dashboard.patch` (satu folder sama file .md
   ini):

   ```bash
   git apply hapus-phase-dashboard.patch
   ```

   Kalau gagal whitespace, coba `git apply --whitespace=fix hapus-phase-dashboard.patch`.
   Kalau context mismatch, terapkan manual: hapus blok
   `<div class="phases mb-6">...</div>` (4 baris `.phase-card`) di
   `PAGES.dashboard`, persis di antara `.hero-banner` dan `.stats-grid`.

3. File yang kena dampak: **cuma `js/pages.js`** (1 blok HTML dihapus,
   nggak ada logic yang berubah).

4. Setelah apply, jalankan cek cepat:
   ```bash
   node -c js/pages.js
   ```

5. Opsional (nggak wajib): class CSS `.phases`, `.phase-card`,
   `.phase-num`, `.phase-title`, `.phase-desc` di `css/style.css` jadi
   nggak kepakai lagi setelah ini. Aman dibiarin (dead code, nggak
   ngaruh ke apa pun), tapi boleh dihapus juga kalau mau beres-beres.
   JANGAN hapus kalau ragu — cek dulu `grep -rn "phase-card\|class=\"phases\""`
   di seluruh project buat mastiin nggak ada file lain yang masih pakai.

## Selesai kalau
- Patch ke-apply bersih (atau perubahan manual setara).
- `node -c js/pages.js` nggak error.
- Buka Dashboard → grid "Phase 1-4" udah nggak muncul, langsung dari
  hero banner ke stats grid (Template Tersimpan, Perjalanan Dinas, dst).
