/**
 * terbilang.js
 * Konversi angka ke kata-kata Bahasa Indonesia
 */

const SATUAN = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan',
  'Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas',
  'Enam Belas', 'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas'];

const PULUHAN = ['', '', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh',
  'Enam Puluh', 'Tujuh Puluh', 'Delapan Puluh', 'Sembilan Puluh'];

function terbilangRatusan(n) {
  if (n === 0) return '';
  if (n < 20) return SATUAN[n];
  if (n < 100) {
    const s = PULUHAN[Math.floor(n / 10)];
    const r = SATUAN[n % 10];
    return r ? `${s} ${r}` : s;
  }
  const ratus = Math.floor(n / 100);
  const sisa = n % 100;
  const prefix = ratus === 1 ? 'Seratus' : `${SATUAN[ratus]} Ratus`;
  const suffix = terbilangRatusan(sisa);
  return suffix ? `${prefix} ${suffix}` : prefix;
}

function terbilang(angka) {
  if (angka === 0) return 'Nol Rupiah';
  if (isNaN(angka) || angka < 0) return '';

  const n = Math.floor(angka);
  let hasil = '';

  const triliun = Math.floor(n / 1_000_000_000_000);
  const miliar  = Math.floor((n % 1_000_000_000_000) / 1_000_000_000);
  const juta    = Math.floor((n % 1_000_000_000) / 1_000_000);
  const ribu    = Math.floor((n % 1_000_000) / 1_000);
  const sisa    = n % 1_000;

  if (triliun > 0) hasil += `${terbilangRatusan(triliun)} Triliun `;
  if (miliar > 0)  hasil += `${terbilangRatusan(miliar)} Miliar `;
  if (juta > 0)    hasil += `${terbilangRatusan(juta)} Juta `;
  if (ribu > 0)    hasil += ribu === 1 ? 'Seribu ' : `${terbilangRatusan(ribu)} Ribu `;
  if (sisa > 0)    hasil += `${terbilangRatusan(sisa)} `;

  return hasil.trim() + ' Rupiah';
}

/**
 * Format angka ke Rupiah: 310000 → "Rp 310.000"
 */
function formatRupiah(angka) {
  if (!angka || isNaN(angka)) return 'Rp 0';
  return 'Rp ' + Number(angka).toLocaleString('id-ID');
}

/**
 * Format angka ke nominal DOCX: 310000 → "310,000"
 */
function formatNominalDoc(angka) {
  if (!angka || isNaN(angka)) return '0';
  return Number(angka).toLocaleString('en-US');
}

/**
 * Konversi angka ke terbilang hari: 1 → "1 (Satu) Hari"
 */
function terbilangHari(n) {
  const kata = terbilangRatusan(n);
  return `${n} (${kata}) Hari`;
}

/**
 * Format tanggal ke Indonesia: 2025-10-01 → "01 Oktober 2025"
 */
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni',
               'Juli','Agustus','September','Oktober','November','Desember'];

const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];

function formatTanggal(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const tgl = String(d.getDate()).padStart(2, '0');
  return `${tgl} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function namaHari(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return HARI[d.getDay()];
}

/**
 * Hitung lama perjalanan (hari)
 */
function hitungLama(tglBerangkat, tglKembali) {
  if (!tglBerangkat || !tglKembali) return 0;
  const a = new Date(tglBerangkat + 'T00:00:00');
  const b = new Date(tglKembali + 'T00:00:00');
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
  return diff < 1 ? 1 : diff;
}

/**
 * Compute {{hari_tanggal_tugas}}
 * "hari Senin s.d Jumat, tanggal 5 s.d 9 Januari 2026"
 * atau "hari Rabu, tanggal 15 April 2026"
 */
function formatHariTanggalTugas(tglBerangkat, tglKembali) {
  if (!tglBerangkat) return '';
  const a = new Date(tglBerangkat + 'T00:00:00');

  if (!tglKembali || tglBerangkat === tglKembali) {
    return `hari ${HARI[a.getDay()]}, tanggal ${formatTanggal(tglBerangkat)}`;
  }

  const b = new Date(tglKembali + 'T00:00:00');
  const hariA = HARI[a.getDay()];
  const hariB = HARI[b.getDay()];
  const tglA = a.getDate();
  const tglB = b.getDate();
  const bulanA = BULAN[a.getMonth()];
  const bulanB = BULAN[b.getMonth()];
  const tahunA = a.getFullYear();
  const tahunB = b.getFullYear();

  let tanggalPart;
  if (tahunA !== tahunB) {
    tanggalPart = `${tglA} ${bulanA} ${tahunA} s.d ${tglB} ${bulanB} ${tahunB}`;
  } else if (a.getMonth() !== b.getMonth()) {
    tanggalPart = `${tglA} ${bulanA} s.d ${tglB} ${bulanB} ${tahunA}`;
  } else {
    tanggalPart = `${tglA} s.d ${tglB} ${bulanA} ${tahunA}`;
  }

  return `hari ${hariA} s.d ${hariB}, tanggal ${tanggalPart}`;
}

/**
 * Sortir golongan pegawai (tinggi ke rendah)
 * IV-b > IV-a > III-d > III-c > ... > I-a
 */
function golonganToNum(golongan) {
  if (!golongan) return 0;
  const map = { 'IV-e':18,'IV-d':17,'IV-c':16,'IV-b':15,'IV-a':14,
                'III-d':13,'III-c':12,'III-b':11,'III-a':10,
                'II-d':9,'II-c':8,'II-b':7,'II-a':6,
                'I-d':5,'I-c':4,'I-b':3,'I-a':2 };
  return map[golongan.trim()] || 0;
}
