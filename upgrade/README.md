# Paket Upgrade Pengendalian Pagu Anggaran

Folder ini berisi rancangan dan patch pengembangan fitur pagu anggaran untuk
aplikasi SPPD. Tidak ada file aplikasi aktif yang diubah ketika paket ini
dibuat.

## Isi paket

- `WORKFLOW.md` — alur bisnis lengkap, termasuk dokumen luar sistem.
- `DATA-MODEL.md` — struktur data dan aturan perhitungan.
- `INSTALL.md` — cara memeriksa, memasang, menguji, dan membatalkan patch.
- `js/anggaran.js` — modul pengendalian pagu dan buku mutasi.
- `css/anggaran.css` — tampilan halaman anggaran.
- `patches/0001-integrasi-anggaran.patch` — patch integrasi ke aplikasi saat ini.
- `sql/001_anggaran_relational.sql` — rancangan opsional untuk tahap lanjutan
  dengan transaksi database yang lebih kuat.

## Kemampuan yang dirancang

1. Pagu awal per kode rekening, subkegiatan, unit kerja, dan tahun.
2. Draft tidak mengurangi pagu.
3. Status Final mengurangi pagu tepat satu kali.
4. Perubahan dokumen Final hanya membukukan selisih.
5. Pembatalan Final mengembalikan pagu.
6. Dokumen Final tidak dapat langsung dihapus.
7. Realisasi dokumen luar sistem dan koreksi dicatat secara manual.
8. Koreksi memakai transaksi pembalik, bukan menghapus riwayat.
9. Validasi tahun anggaran dan saldo sebelum finalisasi.
10. Snapshot nilai biaya pada saat Final agar tarif lama tidak berubah.

## Status

Paket ini adalah kandidat upgrade yang harus diuji pada salinan data terlebih
dahulu. Patch belum diterapkan ke aplikasi aktif.
