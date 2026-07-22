# Task: Uang Harian Bisa Diedit Manual (Nggak Ke-lock ke Tarif Master)

## Konteks
Sebelumnya di Step 1 "Data Perjalanan Dinas", field "Uang Harian" cuma
nampilin tarif dari Data Master (read-only, `<div>` bukan input) — kalau
mau ubah nominalnya harus bolak-balik ke halaman Data Master dulu. Sekarang
field ini jadi `<input>` yang bisa diedit langsung per-perjalanan, tanpa
ubah tarif master itu sendiri.

## Instruksi

1. Pastikan posisi kerja di root repo `SPPD` (sudah termasuk patch
   sebelumnya — nama tempat, transport multi-peserta, master kota tujuan).
2. Apply patch `uang-harian-manual.patch` (satu folder sama file .md ini):

   ```bash
   git apply uang-harian-manual.patch
   ```

   Kalau gagal whitespace, coba `git apply --whitespace=fix uang-harian-manual.patch`.
   Kalau context mismatch (kemungkinan file udah beda dari basis patch
   ini), JANGAN force apply — laporkan bagian yang conflict, terapkan
   manual mengikuti deskripsi di bawah.

3. File yang kena dampak: `js/perjalanan.js`, `js/generate.js`, `js/pages.js`.

4. Ringkasan perubahan:
   - **`PJD.form`**: field baru `uang_harian_override` (default `null`).
     `null`/`undefined`/`''` artinya "pakai tarif master data seperti
     biasa"; kalau diisi angka, itu yang dipakai.
   - **Helper baru `getUangHarian(pjd)`** di `perjalanan.js`: return
     `uang_harian_override` kalau ada, fallback ke `getTarifHarian(jenis)`.
   - **`calcPeserta(p)`**: sekarang manggil `getUangHarian(PJD.form)`,
     bukan `getTarifHarian()` langsung. Ini otomatis nge-drive kalkulasi
     Step 2 (calc panel) dan Step 4 (ringkasan/tabel), karena keduanya
     manggil `calcPeserta()`.
   - **`calcPesertaStatic(ps, jenis, lama, override)`**: nambah parameter
     ke-4 `override`. Dipanggil dari `renderPJDCard()` dengan
     `p.uang_harian_override` (buat list kartu perjalanan tersimpan).
   - **`calcPesertaFull(ps, pjd)`** di `generate.js`: cek
     `pjd.uang_harian_override` sebelum fallback ke tarif master. Ini
     yang dipakai kwitansi, rekap, SPPD, Surat Tugas — semua otomatis
     ikut kepakai tanpa perlu diedit terpisah, karena semua manggil
     `calcPesertaFull()`.
   - **UI Step 1** (`renderStep1()`): `<div id="tarif-preview">` (read-only)
     diganti jadi `<input type="number" id="f-uang-harian">` yang
     nge-`oninput` ke `PJD.form.uang_harian_override`. Di bawahnya ada
     teks hint dinamis (`tarifHintText()`):
     - Kalau belum diubah manual: "Tarif dari master data... — atau edit
       langsung di kolom ini."
     - Kalau udah diubah manual: "Diubah manual (tarif master: Rp xxx).
       ↺ Pakai tarif master" (link buat reset ke `resetUangHarian()`).
   - **`updateTarifPreview()`**: sekarang, kalau nggak ada override aktif,
     ikut nge-refresh value input pas user ganti dropdown Jenis Perjalanan
     (biar nominal ikutan ganti sesuai tarif jenis baru). Kalau ada
     override aktif, value input DIBIARKAN (nggak ke-overwrite) walau
     jenis perjalanan diganti.
   - **Fungsi baru `resetUangHarian()`**: set `uang_harian_override = null`,
     refresh input value & hint text balik ke tarif master.
   - **`js/pages.js`**: update teks deskripsi field `uang_harian` di
     halaman Panduan/Referensi Field, nyebut bisa dioverride manual.

5. Setelah apply, jalankan cek cepat:
   ```bash
   node -c js/perjalanan.js
   node -c js/generate.js
   node -c js/pages.js
   ```

6. Smoke test kalau ada dev server:
   - Buat perjalanan baru → kolom "Uang Harian" langsung bisa diketik/diedit,
     nggak read-only lagi.
   - Ubah nominalnya manual → cek hint berubah jadi "Diubah manual..." →
     lanjut ke Step 2, calc panel per peserta ikut pakai nominal baru.
   - Klik "↺ Pakai tarif master" → nominal balik ke tarif Data Master.
   - Ganti dropdown "Jenis Perjalanan" tanpa override aktif → nominal ikut
     berubah otomatis sesuai tarif jenis yang baru dipilih.
   - Generate dokumen (SPPD/kwitansi) dari perjalanan yang uang hariannya
     di-override → pastikan nominal di dokumen ikut nominal manual, bukan
     tarif master.

## Selesai kalau
- Patch ke-apply bersih (atau perubahan manual setara).
- `node -c` tiga file di atas nggak error.
- Nggak ada perubahan lain di luar fungsi/baris yang disebut di atas.
