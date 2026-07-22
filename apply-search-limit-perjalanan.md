# Task: Search + Limit Tampilan di Daftar Perjalanan Dinas

## Konteks
Sebelumnya halaman "Daftar Perjalanan Dinas" nampilin SEMUA data tanpa
search dan tanpa batas jumlah — makin banyak perjalanan tersimpan, makin
berat/panjang list-nya. Ditambah:
1. **Search box** — filter berdasarkan nomor surat, kode SPPD, tujuan
   (nama tempat/kecamatan/alamat), maksud perjalanan, dan nama peserta.
2. **Limit tampilan** — dropdown pilih 50 / 100 / tampilkan semua, plus
   link "Tampilkan semua →" di bawah list kalau hasil kepotong limit.

Ini murni perubahan di `js/perjalanan.js`, nggak ada perubahan struktur
data tersimpan (tetap baca dari `getPJDList()` seperti biasa).

## Instruksi

1. Pastikan posisi kerja di root repo `SPPD`, dengan patch-patch
   sebelumnya (nama tempat, transport multi-peserta, master kota tujuan,
   uang harian manual) sudah ke-apply duluan.
2. Apply patch `search-limit-perjalanan.patch` (satu folder sama file .md
   ini):

   ```bash
   git apply search-limit-perjalanan.patch
   ```

   Kalau gagal whitespace, coba `git apply --whitespace=fix search-limit-perjalanan.patch`.
   Kalau context mismatch, JANGAN force apply — laporkan bagian yang
   conflict, terapkan manual mengikuti deskripsi di bawah.

3. File yang kena dampak: **cuma `js/perjalanan.js`**.

4. Ringkasan perubahan:
   - **State baru `PJD_LIST_UI = { search: '', limit: 50 }`** — terpisah
     dari `PJD.form` (state wizard), jadi search/limit nggak ke-reset
     tiap buka/tutup form perjalanan baru.
   - **Fungsi baru `filterPJDList(list, search)`**: filter case-insensitive
     terhadap gabungan teks `nomor_surat`, `kode_no`, tujuan (nama_tempat/
     kecamatan/alamat_tujuan — reuse logic yang sama kayak `renderPJDCard`),
     `maksud_perjalanan`, dan nama-nama peserta.
   - **Fungsi baru `onPJDSearch(value)`**: update `PJD_LIST_UI.search`,
     render ulang list, lalu **refocus + restore posisi kursor** ke input
     search (karena render ulang bikin elemen input-nya diganti — tanpa
     ini fokus/kursor bakal kepental tiap ngetik satu huruf).
   - **Fungsi baru `onPJDLimitChange(value)`**: update `PJD_LIST_UI.limit`
     (`50` / `100` / `'all'`), render ulang list.
   - **`renderPerjalananList()`** di-rewrite:
     - Toolbar kanan sekarang ada search box + dropdown limit + tombol
       "Buat Perjalanan Dinas Baru" (urutan lama tetap dipertahankan).
     - Badge jumlah total (`${allList.length} perjalanan`) tetap ada;
       ditambah badge kedua `${filtered.length} hasil pencarian` kalau
       lagi search.
     - List yang dirender = `filtered.slice(0, limit)` (atau semua kalau
       limit `'all'`).
     - Empty state baru khusus "nggak ada hasil pencarian" (beda dari
       empty state "belum ada perjalanan dinas sama sekali") — ada tombol
       "✕ Reset Pencarian".
     - Kalau list kepotong limit, muncul teks
       "Menampilkan X dari Y perjalanan. Tampilkan semua →" di bawah list.
   - Fungsi `renderPJDCard()` **tidak diubah** — dipakai apa adanya buat
     render tiap kartu di list yang udah difilter/dipotong.
   - Pemanggil `renderPerjalananList()` yang udah ada (setelah save,
     delete, dsb) **tidak perlu diubah** — tetap dipanggil tanpa
     argumen seperti sebelumnya, karena state search/limit disimpan di
     `PJD_LIST_UI` (module-level), bukan parameter fungsi.

5. Setelah apply, jalankan cek cepat:
   ```bash
   node -c js/perjalanan.js
   ```

6. Smoke test kalau ada dev server:
   - Buka halaman Perjalanan Dinas dengan banyak data → pastikan cuma
     nampilin 50 pertama, ada dropdown limit di toolbar.
   - Ganti dropdown ke "100 / halaman" atau "Tampilkan semua" → list
     berubah sesuai.
   - Ketik di search box (misal nomor surat atau nama peserta) → list
     kefilter real-time, fokus/kursor di search box nggak kepental tiap
     ketik.
   - Search dengan kata yang nggak ada hasilnya → muncul empty state
     "Nggak ada hasil" + tombol reset.
   - Simpan/hapus satu perjalanan pas lagi dalam kondisi search aktif →
     pastikan search & limit tetap kepakai (nggak ke-reset) di render
     ulang list setelahnya.

## Selesai kalau
- Patch ke-apply bersih (atau perubahan manual setara).
- `node -c js/perjalanan.js` nggak error.
- Nggak ada perubahan lain di luar `renderPerjalananList()` dan
  fungsi-fungsi baru yang disebut di atas.
