# Task: (1) Field "Nama Tempat" di Perjalanan Dinas + (2) Transport Multi-Peserta untuk Luar Daerah

## Konteks

Ada 2 perubahan digabung dalam satu patch:

**A. Field "Nama Tempat" (dalam kota)**
Di halaman "Data Perjalanan Dinas" step 1, jenis perjalanan `dalam_kota`
cuma ada dropdown "Kecamatan Tujuan", nggak ada tempat isi nama tempat
spesifik (misal "Kantor Kecamatan Kemang"). Ditambahin input teks opsional
yang juga kepakai di dokumen hasil generate (SPPD/Surat Tugas/kwitansi).

**B. Transport per-peserta untuk luar daerah**
Sebelumnya sistem membatasi HANYA 1 peserta yang boleh dapat biaya
transport, berlaku untuk semua jenis perjalanan (`dalam_kota`, `luar_kota`,
`luar_provinsi`). Batasan ini cuma masuk akal untuk dalam kota (asumsi 1
kendaraan dinas dipakai bareng). Untuk luar daerah/luar provinsi (misal ke
Jakarta atau Solo), tiap peserta biasanya punya tiket/transport sendiri
yang perlu di-reimburse masing-masing. User minta: khusus `luar_kota` dan
`luar_provinsi`, SEMUA peserta boleh diisi transport sendiri-sendiri;
`dalam_kota` tetap dibatasi 1 peserta seperti semula.

## Instruksi

1. Cek posisi kerja saat ini ada di root repo `SPPD` (ada `package.json`,
   folder `js/`, dll). Kalau belum, `cd` ke situ dulu.
2. Apply patch `nama-tempat-dan-transport-luar-daerah.patch` (satu folder
   sama file .md ini) dengan:

   ```bash
   git apply nama-tempat-dan-transport-luar-daerah.patch
   ```

   Kalau `git apply` gagal karena whitespace/line-ending, coba:

   ```bash
   git apply --whitespace=fix nama-tempat-dan-transport-luar-daerah.patch
   ```

   Kalau tetap gagal (mismatch context — kemungkinan file udah berubah
   dari versi yang dipatch), JANGAN paksa force apply. Laporkan ke user
   bagian mana yang conflict, baru terapkan perubahan yang sama secara
   manual mengikuti deskripsi di bawah.

3. File yang kena dampak:
   - `js/perjalanan.js`
   - `js/generate.js`
   - `js/pages.js` (dokumentasi field reference, bukan logic)

4. Ringkasan perubahan bagian A — Nama Tempat (buat verifikasi manual
   kalau patch gagal):
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
   otomatis ikut kepakai tanpa perlu diedit terpisah.

   Field `nama_tempat` ini **opsional** — jangan tambahin ke validasi
   wajib di `validateStep()`. Behavior lama (cuma kecamatan, tanpa nama
   tempat) harus tetap jalan normal kalau field dikosongin.

5. Ringkasan perubahan bagian B — Transport luar daerah (buat verifikasi
   manual kalau patch gagal):
   - **`toggleTransport(pegawaiId, checked)`**: batasan "hanya 1 peserta
     boleh dapat transport" sekarang cuma di-enforce kalau
     `PJD.form.jenis_perjalanan === 'dalam_kota'`. Untuk `luar_kota` /
     `luar_provinsi`, setiap peserta boleh independен toggle transport-nya
     sendiri (data per-peserta `dapat_transport` / `nominal_transport` /
     `jumlah_kali` udah memang tersimpan per-objek peserta — nggak perlu
     ubah struktur data, cuma ubah gate-nya).
   - **Fungsi baru `enforceTransportRuleForJenis()`**: dipanggil di awal
     `updateTujuanField()` (yang jalan tiap kali user ganti dropdown
     "Jenis Perjalanan"). Kalau user ganti balik ke `dalam_kota` padahal
     sebelumnya (waktu masih luar_kota/luar_provinsi) lebih dari 1 peserta
     udah dicentang dapat transport, sisain cuma peserta pertama dan
     kasih toast warning penjelasan.
   - **`renderStep2()`** — teks alert info soal transport dibikin
     kondisional: untuk `dalam_kota` tetap bilang "hanya satu peserta",
     untuk `luar_kota`/`luar_provinsi` bilang "setiap peserta boleh diisi
     transport masing-masing".

   Catatan: tidak ada perubahan di kalkulasi total (`calcPesertaFull`,
   `calcPesertaStatic`, `buildKwitansiSlotFields`, dst di
   `js/generate.js`/`js/rekap.js`) — semua fungsi itu memang sudah looping
   per-peserta dan sudah otomatis mendukung banyak peserta dengan
   transport masing-masing begitu gate di `toggleTransport()` dilonggarin.
   Jangan tambah logic baru di situ, cukup gate-nya yang diubah.

6. Setelah apply, jalankan cek cepat:
   ```bash
   node -c js/perjalanan.js
   node -c js/generate.js
   node -c js/pages.js
   ```
   (buat mastiin nggak ada syntax error dari template string yang ke-edit)

7. Kalau ada dev server / build step di proyek ini, jalankan buat smoke
   test:
   - Form dalam kota → isi input "Nama tempat" → cek muncul di ringkasan
     & hasil generate dokumen.
   - Bikin perjalanan jenis `luar_kota` dengan 2+ peserta → centang
     "Dapat biaya transport?" di lebih dari 1 peserta → pastikan semua
     bisa dicentang tanpa warning "hanya satu peserta".
   - Ganti jenis perjalanan dari `luar_kota` (2+ peserta transport) balik
     ke `dalam_kota` → pastikan otomatis nyisain cuma 1 peserta transport
     + muncul toast warning.

## Selesai kalau
- Patch ke-apply bersih (atau perubahan manual setara).
- `node -c` tiga file di atas nggak error.
- Nggak ada perubahan lain di luar fungsi/baris yang disebut di atas.
