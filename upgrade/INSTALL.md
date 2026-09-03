# Panduan Pemasangan

Paket ini disiapkan dan diverifikasi terhadap aplikasi pada commit `06d4cda`
(`update 5`) tanggal 3 September 2026.

## Prasyarat

1. Pastikan perubahan aplikasi saat ini sudah dicadangkan/di-commit.
2. Ekspor data atau buat salinan proyek.
3. Uji terlebih dahulu pada salinan proyek dan data nonproduksi.

## Memeriksa patch

Dari folder utama proyek:

```bash
git apply --check upgrade/patches/0001-integrasi-anggaran.patch
```

Perintah tersebut hanya memeriksa dan tidak mengubah file.

Jika pemeriksaan gagal, jangan paksa pemasangan. Pastikan aplikasi berada pada
versi yang kompatibel atau sesuaikan ulang patch terhadap perubahan yang lebih
baru.

## Memasang

```bash
git apply upgrade/patches/0001-integrasi-anggaran.patch
```

Patch membuat aplikasi memuat `upgrade/js/anggaran.js` dan
`upgrade/css/anggaran.css`. File pengembangan tetap berada di folder `upgrade`.

Sesudah pemasangan, jalankan pemeriksaan berikut:

```bash
node --check upgrade/js/anggaran.js
node --check js/db.js
node --check js/master.js
node --check js/perjalanan.js
node --check js/pages.js
npm run build
```

`npm run build` membutuhkan konfigurasi environment yang dipakai oleh proyek.
Pemeriksaan `node --check` dapat dijalankan tanpa koneksi ke Supabase.

## Pengujian minimum

1. Tambahkan pagu pada satu kode rekening.
2. Buat perjalanan Draft dan pastikan saldo tidak berubah.
3. Ubah menjadi Final dan pastikan saldo berkurang satu kali.
4. Simpan ulang tanpa perubahan dan pastikan tidak ada potongan kedua.
5. Ubah biaya Final dan pastikan hanya selisih yang dibukukan.
6. Kembalikan ke Draft dan pastikan saldo kembali.
7. Pastikan Final tidak dapat langsung dipindahkan ke Trash.
8. Catat realisasi luar sistem dan periksa saldo.
9. Batalkan transaksi manual dan periksa transaksi pembalik.
10. Coba nilai melebihi sisa dan pastikan penyimpanan ditolak.
11. Buat perjalanan dengan peserta yang jadwalnya bertabrakan dan pastikan
    validasi bentrok jadwal tetap bekerja.
12. Generate kwitansi dan rekap: kwitansi harus berisi uang harian saja,
    sedangkan mutasi pagu harus sama dengan grand total rekap (termasuk
    transport).

## Membatalkan patch

Jika patch baru saja diterapkan dan perubahan lain belum dibuat:

```bash
git apply -R upgrade/patches/0001-integrasi-anggaran.patch
```

Pembatalan kode tidak otomatis menghapus data `sppd_anggaran_mutasi` yang sudah
tersimpan. Data tersebut sengaja dibiarkan agar riwayat tidak hilang.

## Tahap produksi

Sebelum produksi, tetapkan siapa yang berhak:

- mengisi atau mengubah pagu;
- membuat realisasi luar sistem;
- membatalkan transaksi;
- membuka kembali dokumen Final; dan
- melakukan rekonsiliasi Final lama.
