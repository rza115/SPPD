# Task: Search Box di "Pilih Perjalanan Dinas" (Halaman Generate Dokumen)

## Konteks
Di halaman "Generate Dokumen" (`js/generate.js`, `renderGeneratePage()`),
pemilihan perjalanan dinas cuma pakai `<select>` HTML biasa berisi semua
perjalanan sebagai `<option>`. Begitu jumlah perjalanan banyak, dropdown
ini jadi susah dipakai (harus scroll panjang, nggak bisa ketik cari).

## Solusi
`<select>` diganti jadi search box (`<input type="text">`) + dropdown hasil
pencarian custom (mirip pola search yang sudah dipakai di halaman
Perjalanan Dinas / Rekap — filter di JS, bukan library baru). Filter
mencocokkan nomor surat, kode no, tujuan (lewat `buildTujuanText()`), dan
nama-nama peserta.

Elemen `<select id="gen-pjd-select">` diganti jadi `<input type="hidden">`
dengan id yang sama, supaya semua kode lain yang sudah baca
`document.getElementById('gen-pjd-select')?.value` (di `updateGenSummary()`
dan `triggerGenerate()`) **tetap jalan tanpa diubah**.

State pencarian & seleksi disimpan di object baru `GEN_UI` (level module,
mirip pola `PJD_LIST_UI` yang sudah ada di `js/perjalanan.js`), supaya
nggak reset kalau `renderGeneratePage()` dipanggil ulang (misalnya habis
proses generate selesai dan halaman di-render ulang).

## Instruksi

1. Pastikan posisi kerja di root repo `SPPD` (sudah termasuk patch-patch
   sebelumnya — nama tempat, transport multi-peserta, master kota tujuan,
   uang harian manual, dll).
2. Apply patch `search-pjd-generate.patch` (satu folder sama file .md ini):

   ```bash
   git apply search-pjd-generate.patch
   ```

   Kalau gagal whitespace, coba:
   ```bash
   git apply --whitespace=fix search-pjd-generate.patch
   ```

   Kalau tetap gagal (context mismatch — kemungkinan `js/generate.js` udah
   beda dari basis patch ini), JANGAN force apply. Laporkan bagian yang
   conflict, lalu terapkan manual mengikuti deskripsi di bawah.

3. File yang kena dampak: **cuma `js/generate.js`**.

4. Ringkasan perubahan (buat verifikasi manual kalau patch gagal):
   - **State baru** `const GEN_UI = { search: '', pjdId: '' };` — ditaruh
     di atas, sebelum komentar `// ─── HELPERS ───`.
   - **`renderGeneratePage()`**: hapus variabel `pjdOptions` (nggak
     dipakai lagi). Card "Pilih Perjalanan Dinas" diganti isinya:
     - Input teks `#gen-pjd-search` (pakai class `search-bar` yang udah
       ada, konsisten sama search di halaman Perjalanan Dinas).
     - Input hidden `#gen-pjd-select` (menggantikan `<select>` lama —
       ID SAMA supaya kode lain yang baca value-nya nggak perlu diubah).
     - Div `#gen-pjd-dropdown` (kosong, `display:none` awalnya) buat
       nampilin hasil pencarian.
     - Di akhir function (setelah `c.innerHTML = ...`), tambah logic
       restore: isi ulang value search input dari `GEN_UI.search`, dan
       kalau `GEN_UI.pjdId` masih valid (perjalanannya masih ada), panggil
       `onSelectPJD(GEN_UI.pjdId)` supaya detail & pilihan template ikut
       muncul lagi.
   - **4 fungsi baru** (taruh setelah `renderGeneratePage()`, sebelum
     `renderTemplateSelector()`):
     - `filterGenPJDList(list, search)` — filter by nomor surat, kode no,
       tujuan (`buildTujuanText()`), nama peserta.
     - `renderGenPJDDropdown()` — render max 50 hasil filter ke
       `#gen-pjd-dropdown`, tiap item punya `onmousedown="selectGenPJD(...)"`
       (pakai `onmousedown` bukan `onclick`, supaya klik kepilih duluan
       sebelum event `blur` di search input nutup dropdown).
     - `onGenPJDSearchInput(value)` — update `GEN_UI.search`, reset
       `GEN_UI.pjdId` & value hidden input, panggil `onSelectPJD('')`
       (biar detail/section ke-reset kalau user ngetik ulang), lalu
       render ulang dropdown.
     - `selectGenPJD(id)` — set `GEN_UI.pjdId` & `GEN_UI.search` (jadi
       teks label perjalanan terpilih), update value search input +
       hidden input, sembunyikan dropdown, panggil `onSelectPJD(id)`
       (fungsi lama, TIDAK DIUBAH) buat render detail & section template.
   - **Listener global** `document.addEventListener('click', ...)` di
     level module (bukan di dalam `renderGeneratePage()`, supaya nggak
     numpuk listener tiap buka halaman ulang) — nutup dropdown kalau klik
     di luar `#gen-pjd-search-wrap`.
   - TIDAK ADA perubahan di `onSelectPJD()`, `updateGenSummary()`,
     `getGenSelections()`, `triggerGenerate()`, atau logic generate
     dokumen lainnya — semua tetap baca value dari `#gen-pjd-select`
     seperti sebelumnya.

5. Setelah apply, jalankan cek cepat:
   ```bash
   node -c js/generate.js
   ```

6. Smoke test kalau ada dev server:
   - Buka halaman "Generate Dokumen" → search box muncul menggantikan
     dropdown lama.
   - Klik/fokus search box (belum ketik apa-apa) → dropdown muncul
     nampilin semua perjalanan (max 50), terbaru duluan.
   - Ketik nomor surat / tujuan / nama peserta → daftar ke-filter
     realtime.
   - Klik salah satu hasil → dropdown nutup, search box keisi label
     perjalanan itu, detail perjalanan + pilihan template dokumen muncul
     (behavior sama kayak sebelumnya pas pilih dari `<select>`).
   - Klik di luar search box → dropdown nutup tanpa ganti seleksi.
   - Generate dokumen seperti biasa → pastikan tetap jalan normal
     (value `#gen-pjd-select` masih ke-baca dengan benar).
   - Hapus teks di search box (kosongkan) → detail & pilihan template
     ikut hilang, sama kayak pas pilih opsi "— Pilih Perjalanan Dinas —"
     di `<select>` lama.

## Selesai kalau
- Patch ke-apply bersih (atau perubahan manual setara).
- `node -c js/generate.js` nggak error.
- Nggak ada perubahan lain di luar `js/generate.js` dan fungsi-fungsi yang
  disebut di atas.
