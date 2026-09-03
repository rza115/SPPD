# Workflow Pengendalian Pagu Anggaran

## A. Menyiapkan pagu

1. Buka **Data Master → Kode Rekening SIPD**.
2. Pilih atau tambah kode rekening.
3. Isi program, kegiatan, subkegiatan, tahun anggaran, unit kerja, dan pagu.
4. Simpan.
5. Sistem menampilkan pagu awal, penggunaan, sisa, dan persentase penyerapan.

Satu kantong anggaran ditentukan oleh ID master SIPD. Secara bisnis, ID tersebut
mewakili kombinasi tahun, unit kerja, kode rekening, dan subkegiatan.

## B. Dokumen yang dibuat di dalam sistem

```text
Buat perjalanan
      ↓
Pilih kode rekening dari master
      ↓
Isi peserta dan biaya
      ↓
Simpan Draft ───────────────→ pagu belum berubah
      ↓
Centang Final
      ↓
Validasi tahun + sisa pagu
      ├─ tidak cukup → tetap Draft / finalisasi ditolak
      └─ cukup
           ↓
Simpan snapshot biaya + mutasi pemakaian
           ↓
Pagu berkurang
```

Nilai mutasi Final mengikuti grand total rekap belanja: uang harian seluruh
peserta ditambah transport yang berhak diterima. Pada versi aplikasi saat ini,
kwitansi hanya menampilkan uang harian; aturan tampilan kwitansi tersebut tidak
menghapus komponen transport dari realisasi anggaran.

### Perubahan status

| Perubahan | Perlakuan |
|---|---|
| Baru → Draft | Tidak ada mutasi |
| Draft → Final | Mutasi pemakaian sebesar total biaya |
| Final → Final, biaya berubah | Mutasi hanya sebesar selisih |
| Final → Final, rekening berubah | Pengembalian pada rekening lama dan pemakaian pada rekening baru |
| Final → Draft | Mutasi pengembalian sebesar nilai Final terakhir |
| Hapus Draft | Diizinkan; tidak ada pengaruh anggaran |
| Hapus Final | Ditolak; batalkan Final lebih dahulu |

## C. Dokumen yang dibuat di luar sistem

1. Buka **Data Master → Anggaran & Koreksi**.
2. Pada rekening yang sesuai, klik **Realisasi Luar Sistem**.
3. Isi nomor dan tanggal dokumen, uraian, nilai, serta alasan/referensi.
4. Sistem memeriksa duplikasi nomor dokumen pada rekening dan tahun yang sama.
5. Setelah disimpan, transaksi mengurangi sisa pagu.

Dokumen luar sistem harus mempunyai identitas yang dapat ditelusuri. Lampiran
fisik atau lokasi arsip dapat ditulis pada kolom referensi.

## D. Koreksi anggaran

Jenis transaksi manual:

- **Realisasi luar sistem** — menambah penggunaan dan mengurangi sisa.
- **Saldo realisasi awal** — mencatat penggunaan sebelum upgrade dipasang.
- **Koreksi pengurangan** — menambah penggunaan karena kekurangan pencatatan.
- **Koreksi pengembalian** — mengurangi penggunaan dan menambah sisa.

Transaksi yang salah tidak dihapus atau diedit. Pengguna memilih
**Batalkan transaksi**, mengisi alasan, lalu sistem membuat transaksi pembalik.
Setelah itu pengguna dapat membuat transaksi pengganti yang benar.

## E. Dokumen Final lama ketika upgrade dipasang

Dokumen Final yang sudah ada sebelum upgrade belum memiliki mutasi anggaran.
Lakukan proses berikut per tahun anggaran:

1. Cadangkan data.
2. Pastikan setiap dokumen Final lama menunjuk ID kode rekening master, bukan
   hanya kode manual.
3. Periksa total biaya masing-masing dokumen.
4. Jalankan/manfaatkan fungsi migrasi Final lama yang disediakan modul.
5. Cocokkan total penggunaan dengan rekap resmi.
6. Selisih dari dokumen luar sistem dimasukkan sebagai **Saldo realisasi awal**.
7. Tutup proses rekonsiliasi setelah total aplikasi sama dengan catatan resmi.

Jangan sekaligus mengimpor Final lama dan mencatatnya sebagai saldo realisasi
awal karena akan menyebabkan penghitungan ganda.

## F. Dokumen luar sistem yang kemudian dimasukkan ke aplikasi

Sebelum dokumen tersebut difinalkan di aplikasi:

1. Cari transaksi realisasi luar sistemnya.
2. Batalkan transaksi manual dengan alasan “Dikonversi ke dokumen sistem”.
3. Masukkan atau lengkapi perjalanan dinas di aplikasi.
4. Finalkan perjalanan.

Hasil akhirnya hanya ada satu pemakaian aktif yang bersumber dari dokumen
perjalanan dalam sistem.

## G. Rekonsiliasi rutin

Minimal setiap akhir bulan:

1. Bandingkan pagu awal dengan DPA/perubahan DPA.
2. Bandingkan penggunaan dalam sistem dengan daftar dokumen Final.
3. Bandingkan realisasi luar sistem dengan register manual.
4. Periksa transaksi pembalik dan alasannya.
5. Pastikan tidak ada sisa negatif.
6. Ekspor atau arsipkan riwayat mutasi.
7. Cocokkan total mutasi dokumen sistem dengan grand total rekap, bukan dengan
   total nominal pada kumpulan kwitansi.
