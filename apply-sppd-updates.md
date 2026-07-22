# Task: 3 Perubahan di SPPD — Nama Tempat, Transport Multi-Peserta Luar Daerah, Master Kota Tujuan

## Konteks

Tiga perubahan digabung dalam satu patch (dikerjakan bertahap dalam satu sesi
diskusi, semuanya terkait alur "Data Perjalanan Dinas" & transport):

**A. Field "Nama Tempat" (dalam kota)**
Step 1 wizard perjalanan, jenis `dalam_kota` cuma ada dropdown "Kecamatan
Tujuan", nggak ada tempat isi nama tempat spesifik (misal "Kantor Kecamatan
Kemang"). Ditambah input teks opsional yang juga kepakai di dokumen hasil
generate (SPPD/Surat Tugas/kwitansi).

**B. Transport per-peserta untuk luar daerah**
Sebelumnya sistem membatasi HANYA 1 peserta boleh dapat biaya transport,
berlaku untuk semua jenis perjalanan. Batasan ini cuma masuk akal untuk
dalam kota (1 kendaraan dinas dipakai bareng). Untuk luar daerah/provinsi
(ke Jakarta, Solo, dst), tiap peserta biasanya punya tiket sendiri yang
perlu di-reimburse masing-masing. Sekarang: `dalam_kota` tetap dibatasi 1
peserta, `luar_kota`/`luar_provinsi` semua peserta boleh diisi transport
sendiri-sendiri.

**C. Master data "Kota Tujuan" (preset 10 kota besar)**
Sebelumnya transport luar daerah full manual, nggak ada saran tarif kayak
kecamatan. Ditambah tab baru di Data Master ("🏙️ Kota Tujuan") berisi 10
kota besar preset (Jakarta, Bandung, Surabaya, Semarang, Yogyakarta, Medan,
Makassar, Palembang, Surakarta/Solo, Denpasar), masing-masing bisa diisi
tarif transport PP. Di Step 1 form perjalanan, kalau jenis luar_kota/luar_
provinsi, muncul dropdown opsional buat pilih kota preset ini — kalau
dipilih: (1) alamat tujuan auto-terisi nama kota (jika masih kosong), (2)
di Step 2 badge "Saran: Rp xxx" transport per peserta ikut muncul dari
tarif kota tersebut (persis seperti behavior kecamatan untuk dalam kota).

## Instruksi

1. Cek posisi kerja saat ini ada di root repo `SPPD` (ada `package.json`,
   folder `js/`, dll). Kalau belum, `cd` ke situ dulu.
2. Apply patch `sppd-updates.patch` (satu folder sama file .md ini) dengan:

   ```bash
   git apply sppd-updates.patch
   ```

   Kalau gagal karena whitespace/line-ending, coba:

   ```bash
   git apply --whitespace=fix sppd-updates.patch
   ```

   Kalau tetap gagal (mismatch context — file udah berubah dari versi yang
   dipatch), JANGAN paksa force apply. Laporkan ke user bagian mana yang
   conflict, baru terapkan perubahan yang sama secara manual mengikuti
   deskripsi di bawah.

3. File yang kena dampak:
   - `js/db.js` (KEYS baru, seed data 10 kota, init)
   - `js/perjalanan.js` (form Step 1 & 2, helper, transport rule)
   - `js/master.js` (tab baru "Kota Tujuan")
   - `js/pages.js` (tab button/pane + dokumentasi field reference)
   - `js/generate.js` (dokumen pakai nama tempat manual kalau diisi)

4. Ringkasan perubahan bagian A — Nama Tempat:
   - **`renderStep1()`** & **`updateTujuanField()`** di `perjalanan.js`:
     blok `tujuan-field` untuk `dalam_kota` — tambah `<input id="f-nama-tempat">`
     opsional di bawah dropdown kecamatan, binding ke `PJD.form.nama_tempat`.
   - **`renderPJDCard()`** & **`renderStep4()`**: variabel `tujuan` pakai
     `nama_tempat` dulu kalau ada, fallback ke nama kecamatan.
   - **`buildTujuanText()`** di `generate.js`: return `pjd.nama_tempat`
     langsung kalau `dalam_kota` dan field itu keisi.
   - **`js/pages.js`**: update teks deskripsi field `tujuan` &
     `untuk_pembayaran` di halaman Panduan (dokumentasi doang, no logic).
   - Field ini **opsional**, jangan ditambahin ke validasi wajib.

5. Ringkasan perubahan bagian B — Transport multi-peserta luar daerah:
   - **`toggleTransport()`**: batasan "1 peserta" cuma di-enforce kalau
     `PJD.form.jenis_perjalanan === 'dalam_kota'`.
   - **Fungsi baru `enforceTransportRuleForJenis()`**: dipanggil di awal
     `updateTujuanField()` — kalau user ganti balik ke `dalam_kota` padahal
     sebelumnya beberapa peserta udah dicentang transport (saat luar
     daerah), sisain 1 peserta pertama + toast warning.
   - **`renderStep2()`**: teks alert transport dibikin kondisional sesuai
     jenis perjalanan.
   - TIDAK ada perubahan di fungsi kalkulasi (`calcPesertaFull`,
     `calcPesertaStatic`, dst) — semua udah looping per-peserta dari awal.

6. Ringkasan perubahan bagian C — Master Kota Tujuan:
   - **`js/db.js`**: `KEYS.kotaTujuan = 'sppd_kota_tujuan'`, konstanta
     `KOTA_TUJUAN_SEED` (10 kota), method `_seedKotaTujuan()` dipanggil di
     `init()` (mirror pola `_seedKecamatan`/`KECAMATAN_SEED`).
   - **`js/master.js`**: fungsi baru `renderKotaTujuan()`,
     `previewKotaTarif()`, `saveAllKotaTujuan()` — mirror persis pola
     `renderKecamatan()` dkk, ditambahin ke `renders` map di `switchTab()`
     dengan key `'kota-tujuan'`.
   - **`js/pages.js`**: tab button `🏙️ Kota Tujuan` + `<div id="tab-kota-tujuan">`
     ditambah di `PAGES.master`.
   - **`js/perjalanan.js`**:
     - Helper baru `getKotaById(id)` (mirror `getKecById`).
     - Helper baru `getSuggestTransport()` — return tarif dari kecamatan
       kalau `dalam_kota`, atau dari kota preset kalau luar daerah/provinsi.
       Dipakai di `renderPesertaItem()` (badge saran) dan `toggleTransport()`
       (auto-fill nominal saat dicentang).
     - Field baru `kota_tujuan_id` di `PJD.form` (default kosong).
     - Blok `tujuan-field` untuk `luar_kota`/`luar_provinsi` (di
       `renderStep1()` & `updateTujuanField()`) sekarang ada dropdown
       "Pilih Kota Besar (opsional)" di atas input alamat manual.
     - Fungsi baru `onKotaTujuanChange(kotaId)`: simpan `kota_tujuan_id`,
       dan kalau alamat tujuan masih kosong, auto-isi dengan nama kota.
   - Kota preset ini **tidak mengubah** `buildTujuanText()` di
     `generate.js` — untuk luar daerah, dokumen tetap pakai `alamat_tujuan`
     apa adanya (yang mungkin udah keisi otomatis dari nama kota, atau
     diedit manual jadi alamat lengkap).

7. Setelah apply, jalankan cek cepat:
   ```bash
   node -c js/db.js
   node -c js/perjalanan.js
   node -c js/generate.js
   node -c js/pages.js
   node -c js/master.js
   ```

8. Kalau ada dev server / build step di proyek ini, jalankan buat smoke
   test:
   - Data Master → tab baru "Kota Tujuan" muncul, 10 kota preset kelihatan,
     bisa isi tarif & simpan.
   - Perjalanan Dinas → dalam kota → isi "Nama tempat" → cek di ringkasan
     & hasil generate.
   - Perjalanan Dinas → jenis `luar_kota` → pilih kota preset (misal
     Jakarta) → alamat tujuan auto-terisi "Jakarta" → lanjut ke Step 2 →
     centang transport di 2+ peserta → semua bisa dicentang, badge saran
     tarif muncul kalau tarif kota itu udah diisi di Data Master.
   - Ganti jenis dari `luar_kota` (2+ peserta transport) balik ke
     `dalam_kota` → otomatis nyisain 1 peserta + toast warning.

## Selesai kalau
- Patch ke-apply bersih (atau perubahan manual setara).
- `node -c` semua file di atas nggak error.
- Nggak ada perubahan lain di luar fungsi/baris yang disebut di atas.
