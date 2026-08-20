# Task: Fix Bug — Transport Nggak Ke-akumulasi di Kalkulasi Perjalanan Dinas

## Konteks
Di Step 2 (Peserta) & Step 4 (Ringkasan) form Perjalanan Dinas, ada kasus
peserta yang dicentang "dapat biaya transport" tapi transport-nya ke-hitung
**Rp 0** — walau kolom "Nominal per Kali" kelihatan ada saran angka dari
tarif kecamatan/kota. Screenshot: peserta "Mellya Puspita Sari" tercentang
dapat transport, tapi formula tampil "Rp 0 × 1 kali × 1 hari" = Rp 0, jadi
grand total cuma nge-sum uang harian doang.

## Root Cause
Di `toggleTransport()` (`js/perjalanan.js`), `nominal_transport` cuma
di-set ke `PJD.form.peserta` **kalau kolom input-nya masih kosong** saat
checkbox dicentang:

```js
if (nomInput && !nomInput.value && suggest) {
  nomInput.value = suggest;
  if (p) p.nominal_transport = suggest;
}
```

Masalahnya, kolom "Nominal per Kali" **selalu sudah ke-render duluan**
dengan value saran tarif otomatis (lihat `renderPesertaItem()`:
`existing?.nominal_transport || suggestTransport || ''`), meski div-nya
masih `display:none` sebelum user centang checkbox. Jadi begitu user
centang "dapat transport", kolomnya udah nggak kosong (`nomInput.value`
truthy) → kondisi `!nomInput.value` gagal → `p.nominal_transport` nggak
pernah ke-update, tetap `0` (default awal dari `togglePeserta()`) — padahal
di layar keliatan ada angka. Angka itu cuma numpang tampil, nggak pernah
kesimpen ke state, jadi nggak ikut ke-akumulasi ke total.

## Fix
Ganti jadi selalu panggil `updatePesertaTransport(pegawaiId)` tiap kali
checkbox dicentang — fungsi ini baca ulang value kolom Nominal & Jumlah
Kali dari DOM apa adanya (saran otomatis, isian lama, atau kosong) dan
sinkronkan ke `PJD.form.peserta`, sekalian refresh formula teks, total per
peserta, dan calc panel — behavior yang sama persis kayak kalau user ngetik
manual di kolom itu (`oninput`).

## Instruksi

1. Pastikan posisi kerja di root repo `SPPD`, patch-patch sebelumnya udah
   ke-apply duluan.
2. Apply patch `fix-transport-sync.patch` (satu folder sama file .md ini):

   ```bash
   git apply fix-transport-sync.patch
   ```

   Kalau gagal whitespace, coba:
   ```bash
   git apply --whitespace=fix fix-transport-sync.patch
   ```

   Kalau tetap gagal (context mismatch), terapkan manual: di fungsi
   `toggleTransport()` (`js/perjalanan.js`), pada blok `if (checked) { ... }`
   — hapus baris `if (p) p.nominal_transport = suggest;`, lalu setelah blok
   `if (nomInput && !nomInput.value && suggest) { nomInput.value = suggest; }`
   tambahkan `updatePesertaTransport(pegawaiId);` dan `return;` sebelum
   penutup kurung `if (checked)`. Baris `refreshPesertaTotal(pegawaiId);` dan
   `updateCalcPanel();` di paling bawah fungsi TETAP ADA (dipakai jalur
   `else` / uncheck).

3. File yang kena dampak: **cuma `js/perjalanan.js`**, fungsi
   `toggleTransport()` doang. Tidak ada perubahan logic kalkulasi
   (`calcPeserta`, `calcPesertaFull`, dst) — itu semua udah benar dari awal.

4. Setelah apply, jalankan cek cepat:
   ```bash
   node -c js/perjalanan.js
   ```

5. Smoke test:
   - Buat perjalanan dinas baru, jenis "Dalam Kota", pilih kecamatan yang
     tarif transport-nya udah diisi di Data Master (>0).
   - Step 2 → centang salah satu peserta → centang "dapat biaya transport"
     → badge "Saran: Rp xxx" muncul, kolom "Nominal per Kali" ke-isi
     otomatis dari saran itu.
   - **Tanpa mengetik apa-apa lagi**, langsung lanjut ke Step 4 (Ringkasan)
     → pastikan kolom Transport peserta itu ke-hitung sesuai nominal saran
     (bukan Rp 0), dan Grand Total ikut nambah dari transport.
   - Ulangi test yang sama untuk jenis "Luar Kota/Provinsi" dengan kota
     preset yang tarifnya udah diisi.
   - Test juga kasus tarif kecamatan/kota belum diisi (0) → kolom kosong,
     transport tetap Rp 0 sampai user isi manual — behavior ini harus tetap
     jalan seperti biasa (bukan bug, memang belum ada saran).
   - Uncheck lalu re-check "dapat transport" → nominal yang udah diisi
     sebelumnya tetap kepakai (nggak ke-reset ke 0).

## Selesai kalau
- Patch ke-apply bersih (atau perubahan manual setara).
- `node -c js/perjalanan.js` nggak error.
- Peserta yang dicentang "dapat transport" dengan saran tarif otomatis,
  transport-nya kehitung benar di Step 4 & Grand Total tanpa user harus
  ngetik ulang manual di kolom Nominal.
