# Model Data

## 1. Perluasan master SIPD

Tambahan pada setiap objek `sppd_sipd`:

```json
{
  "pagu_anggaran": 100000000
}
```

`pagu_anggaran` adalah pagu awal. Nilai terpakai dan sisa tidak disimpan sebagai
angka yang dapat diedit, tetapi selalu dihitung dari buku mutasi.

## 2. Store baru

Kunci baru: `sppd_anggaran_mutasi`.

Contoh transaksi:

```json
{
  "id": "agt_...",
  "sipd_id": "sipd_...",
  "tahun_anggaran": 2026,
  "tanggal": "2026-08-22",
  "jenis": "realisasi_luar",
  "sumber": "manual",
  "sumber_id": "",
  "nomor_dokumen": "800/045-SPPD",
  "uraian": "Perjalanan dinas yang dibuat di luar aplikasi",
  "nilai_dampak": 4500000,
  "alasan": "Dokumen sebelum penggunaan aplikasi",
  "referensi": "Arsip Sekretariat/2026/045",
  "reversal_of": "",
  "created_at": "2026-08-22T10:00:00.000Z"
}
```

### Arti `nilai_dampak`

- Positif: menambah penggunaan, sehingga sisa berkurang.
- Negatif: mengurangi penggunaan, sehingga sisa bertambah.

Rumus:

```text
penggunaan = jumlah seluruh nilai_dampak rekening
sisa       = pagu_anggaran - penggunaan
```

## 3. Snapshot pada perjalanan Final

Tambahan pada objek perjalanan:

```json
{
  "anggaran_final": {
    "sipd_id": "sipd_...",
    "nilai": 5250000,
    "finalized_at": "2026-08-22T10:00:00.000Z",
    "revision": 1
  }
}
```

Snapshot menjaga nilai historis agar perubahan tarif master tidak mengubah
realisasi masa lalu. Saat pertama kali menjadi Final, tarif uang harian efektif
juga disalin ke `uang_harian_override`, sehingga tampilan daftar, dokumen, rekap,
dan buku anggaran tetap menggunakan angka yang sama.

## 4. Identitas dan anti-duplikasi

- Mutasi otomatis menggunakan `sumber = perjalanan` dan `sumber_id = pjd.id`.
- Realisasi luar sistem diperiksa berdasarkan rekening, tahun, dan nomor dokumen.
- Pembatalan disimpan sebagai record baru dengan `reversal_of` menunjuk transaksi
  asal.
- Satu transaksi tidak boleh mempunyai lebih dari satu pembalik aktif.

## 5. Batasan penyimpanan saat ini

Aplikasi sekarang menyimpan array JSON per pengguna. Penyimpanan perjalanan dan
mutasi merupakan dua penulisan terpisah. Untuk penggunaan satu operator, model
ini kompatibel dengan arsitektur saat ini. Jika kelak banyak operator dapat
mengubah anggaran yang sama secara bersamaan, gunakan rancangan relasional pada
`sql/001_anggaran_relational.sql` dan prosedur database transaksional.
