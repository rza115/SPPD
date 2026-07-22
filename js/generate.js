/**
 * generate.js — Phase 4: Generate Engine & ZIP Output
 * docxtemplater + PizZip + JSZip
 */

// ─── HELPERS ──────────────────────────────────────────────
function getFirstUK() {
  return DB.getArr('sppd_unit_kerja')[0] || {};
}

function getUKForPegawai(pgw) {
  if (!pgw?.unit_kerja_id) return getFirstUK();
  return DB.getArr('sppd_unit_kerja').find(u => u.id === pgw.unit_kerja_id) || getFirstUK();
}

function sortedPeserta(pjd) {
  return [...(pjd.peserta || [])].sort((a, b) => {
    const pa = getPegawaiById(a.pegawai_id);
    const pb = getPegawaiById(b.pegawai_id);
    return golonganToNum(pb?.golongan) - golonganToNum(pa?.golongan);
  });
}

function calcPesertaFull(ps, pjd) {
  const lama   = hitungLama(pjd.tanggal_berangkat, pjd.tanggal_kembali) || 1;
  const override = pjd.uang_harian_override;
  const hasOverride = override !== null && override !== undefined && override !== '';
  const tarif  = DB.get('sppd_tarif') || {};
  const harian = hasOverride ? (parseInt(override) || 0) : (tarif[pjd.jenis_perjalanan]?.uang_harian || 0);
  const totalH = harian * lama;
  const totalT = ps.dapat_transport
    ? (parseInt(ps.nominal_transport) || 0) * (parseInt(ps.jumlah_kali) || 1) * lama : 0;
  return { harian, totalH, totalT, total: totalH + totalT, lama };
}

function calcGrandTotalFull(pjd) {
  return (pjd.peserta || []).reduce((s, ps) => s + calcPesertaFull(ps, pjd).total, 0);
}

function buildTujuanText(pjd) {
  if (pjd.jenis_perjalanan === 'dalam_kota') {
    if (pjd.nama_tempat) return pjd.nama_tempat;
    const kec = getKecById(pjd.kecamatan_id);
    return kec ? 'Kecamatan ' + kec.nama : '—';
  }
  return pjd.alamat_tujuan || '—';
}

// ─── ARGUMENTS BUILDER ────────────────────────────────────
function buildBaseArgs(pjd) {
  const lama   = hitungLama(pjd.tanggal_berangkat, pjd.tanggal_kembali) || 1;
  const uk     = getFirstUK();
  const sipd   = getSipdById(pjd.kode_sipd_id);
  const pptk   = getPegawaiById(pjd.pptk_id);
  const tujuan = buildTujuanText(pjd);
  const tingkat= getTingkatBiaya(pjd.jenis_perjalanan);
  const grand  = calcGrandTotalFull(pjd);
  const kodeRek= sipd ? sipd.kode : (pjd.kode_sipd_manual || '');

  // Build peserta_table text (indexed args for SPPD/Surat Tugas)
  const pesertaIndexed = {};
  const sorted = sortedPeserta(pjd);
  sorted.forEach((ps, i) => {
    const pgw = getPegawaiById(ps.pegawai_id);
    const n   = i + 1;
    pesertaIndexed[`nama_peserta_${n}`]        = pgw?.nama_lengkap || '';
    pesertaIndexed[`nip_gol_peserta_${n}`]     = [pgw?.nip, pgw?.golongan].filter(Boolean).join(' / ');
    pesertaIndexed[`pangkat_gol_peserta_${n}`] = pgw?.pangkat_golongan
      || [pgw?.pangkat, pgw?.golongan].filter(Boolean).join(' / ')
      || '';
    pesertaIndexed[`jabatan_peserta_${n}`]     = pgw?.jabatan || '';
    pesertaIndexed[`pangkat_peserta_${n}`]     = pgw?.pangkat || (pgw?.pangkat_golongan?.split('/')[0]?.trim()) || '';
    pesertaIndexed[`golongan_peserta_${n}`]    = pgw?.golongan || '';
  });

  // Build per-N rekap args
  const rekapN = {};
  sorted.forEach((ps, i) => {
    const pgw = getPegawaiById(ps.pegawai_id);
    const cp  = calcPesertaFull(ps, pjd);
    const n   = i + 1;
    rekapN[`nama_${n}`]              = pgw?.nama_lengkap || '';
    rekapN[`nip_${n}`]               = pgw?.nip || '';
    rekapN[`uang_harian_${n}`]       = formatRupiah(cp.harian);
    rekapN[`uang_harian_total_${n}`] = formatRupiah(cp.totalH);
    rekapN[`transport_nominal_${n}`] = ps.dapat_transport ? formatRupiah(parseInt(ps.nominal_transport)||0) : '';
    rekapN[`lama_perjalanan_${n}`]    = cp.lama + ' Hari';
    rekapN[`transport_kali_${n}`]    = ps.dapat_transport ? (parseInt(ps.jumlah_kali)||1) + ' Kali' : '';
    rekapN[`transport_total_${n}`]   = ps.dapat_transport ? formatRupiah(cp.totalT) : '';
    rekapN[`total_${n}`]             = formatRupiah(cp.total);
    rekapN[`rekening_${n}`]          = pgw?.nomor_rekening || '';
  });

  return {
    // ── Perjalanan ───────────────────────────────────────
    nomor              : pjd.nomor_surat || '',
    nomor_sppd         : pjd.nomor_surat || '',
    kode_no            : pjd.kode_no || '',
    tanggal_surat      : formatTanggal(pjd.tanggal_surat),
    tanggal_berangkat  : formatTanggal(pjd.tanggal_berangkat),
    tanggal_kembali    : formatTanggal(pjd.tanggal_kembali),
    lama_perjalanan    : terbilangHari(lama),
    jenis_perjalanan   : tingkat,
    tingkat_biaya      : tingkat,
    alat_angkutan      : pjd.alat_angkutan || '',
    tujuan             : tujuan,
    tempat_tujuan      : tujuan,
    tempat_kedudukan   : uk.tempat_kedudukan || uk.kota || '',
    maksud_perjalanan  : pjd.maksud_perjalanan || '',
    dasar              : pjd.dasar || '',
    deskripsi_tugas    : pjd.deskripsi_tugas || '',
    hari_tanggal_tugas : formatHariTanggalTugas(pjd.tanggal_berangkat, pjd.tanggal_kembali),

    // ── Tanggal computed ────────────────────────────────
    kota_tanggal       : (uk.kota || '') + ', ' + formatTanggal(pjd.tanggal_surat),
    kota_tanggal_rekap : (uk.kota || '') + ', ' + formatTanggal(pjd.tanggal_berangkat),
    tanggal_rekap      : formatTanggal(pjd.tanggal_berangkat),

    // ── Unit Kerja ───────────────────────────────────────
    nama_dinas         : uk.nama || '',
    alamat_dinas       : uk.alamat || '',
    kota               : uk.kota || '',
    skpd               : uk.skpd || uk.nama || '',
    instansi_pembayar  : uk.instansi_pembayar || 'PEMERINTAH KABUPATEN BOGOR',
    pejabat_ppk        : uk.pejabat_ppk || '',
    nama_ppk           : uk.nama_ppk || '',
    nip_ppk            : uk.nip_ppk || '',
    nama_kepala        : uk.nama_kepala || '',
    nip_kepala         : uk.nip_kepala || '',
    nama_bendahara     : uk.nama_bendahara || '',
    nip_bendahara      : uk.nip_bendahara || '',

    // ── SIPD / Anggaran ──────────────────────────────────
    kode_rekening_sipd : kodeRek,
    program            : sipd?.program || '',
    kegiatan           : sipd?.kegiatan || '',
    sub_kegiatan       : sipd?.sub_kegiatan || '',
    nama_singkat_sipd  : sipd?.nama_singkat || '',
    tujuan_perjalanan  : [pjd.deskripsi_tugas, formatHariTanggalTugas(pjd.tanggal_berangkat, pjd.tanggal_kembali), tujuan ? 'di ' + tujuan : ''].filter(Boolean).join(', pada '),

    // ── PPTK ────────────────────────────────────────────
    nama_pptk          : pptk?.nama_lengkap || '',
    nip_pptk           : pptk?.nip || '',

    // ── Grand Total ──────────────────────────────────────
    jumlah_peserta     : sorted.length,
    grand_total        : formatRupiah(grand),
    grand_total_angka  : formatNominalDoc(grand),
    grand_total_terbilang: terbilang(grand),

    // ── Indexed peserta (untuk SPPD tabel pengikut) ──────
    ...pesertaIndexed,

    // ── Per-N rekap args ─────────────────────────────────
    ...rekapN,
  };
}

const KWITANSI_PER_HALAMAN = 3;

function getKwitansiLayout(tmpl) {
  if (tmpl.kwitansiLayout === 'per_halaman' || tmpl.kwitansiLayout === 'per_peserta') {
    return tmpl.kwitansiLayout;
  }
  return tmpl.isIterable ? 'per_peserta' : 'per_halaman';
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildUntukPembayaran(ps, pjd) {
  const tingkat = getTingkatBiaya(pjd.jenis_perjalanan);
  const tujuan  = buildTujuanText(pjd);
  let text = ps.dapat_transport
    ? `Biaya Uang Harian dan Transport Perjalanan Dinas ${tingkat} ke ${tujuan}`
    : `Biaya Uang Harian Perjalanan Dinas ${tingkat} ke ${tujuan}`;
  const maksud = (pjd.maksud_perjalanan || '').trim();
  if (maksud) {
    text += /^dalam\s+rangka/i.test(maksud) ? ' ' + maksud : ' dalam rangka ' + maksud;
  }
  return text;
}

function emptyKwitansiSlotFields(slot) {
  const keys = [
    'nama', 'nama_penerima', 'nip', 'nip_penerima', 'jabatan', 'jabatan_penerima',
    'pangkat_golongan', 'nomor_rekening', 'rekening_penerima', 'rekening',
    'uang_harian', 'uang_harian_peserta', 'transport', 'transport_peserta', 'transport_total',
    'total', 'total_peserta', 'total_terbilang', 'total_peserta_terbilang', 'banyaknya_uang',
    'nominal', 'nominal_peserta', 'untuk_pembayaran', 'urutan_peserta',
  ];
  const out = {};
  keys.forEach(k => { out[`${k}_${slot}`] = ''; });
  out[`ada_peserta_${slot}`] = false;
  return out;
}

function buildKwitansiSlotFields(ps, pjd, urutanGlobal, slot) {
  if (!ps) return emptyKwitansiSlotFields(slot);

  const pgw = getPegawaiById(ps.pegawai_id);
  const cp  = calcPesertaFull(ps, pjd);
  const pg  = pgw?.pangkat_golongan || [pgw?.pangkat, pgw?.golongan].filter(Boolean).join(' / ') || '';

  return {
    [`nama_${slot}`]                  : pgw?.nama_lengkap || '',
    [`nama_penerima_${slot}`]         : pgw?.nama_lengkap || '',
    [`nip_${slot}`]                   : pgw?.nip || '',
    [`nip_penerima_${slot}`]          : pgw?.nip || '',
    [`jabatan_${slot}`]               : pgw?.jabatan || '',
    [`jabatan_penerima_${slot}`]      : pgw?.jabatan || '',
    [`pangkat_golongan_${slot}`]      : pg,
    [`nomor_rekening_${slot}`]        : pgw?.nomor_rekening || '',
    [`rekening_penerima_${slot}`]     : pgw?.nomor_rekening || '',
    [`rekening_${slot}`]              : pgw?.nomor_rekening || '',
    [`uang_harian_${slot}`]           : formatRupiah(cp.harian),
    [`uang_harian_peserta_${slot}`]   : formatRupiah(cp.harian),
    [`transport_${slot}`]             : formatRupiah(cp.totalT),
    [`transport_peserta_${slot}`]     : formatRupiah(cp.totalT),
    [`transport_total_${slot}`]       : formatRupiah(cp.totalT),
    [`total_${slot}`]                 : formatRupiah(cp.total),
    [`total_peserta_${slot}`]         : formatRupiah(cp.total),
    [`total_terbilang_${slot}`]       : terbilang(cp.total),
    [`total_peserta_terbilang_${slot}`]: terbilang(cp.total),
    [`banyaknya_uang_${slot}`]        : terbilang(cp.total),
    [`nominal_${slot}`]               : formatNominalDoc(cp.total),
    [`nominal_peserta_${slot}`]       : formatNominalDoc(cp.total),
    [`untuk_pembayaran_${slot}`]      : buildUntukPembayaran(ps, pjd),
    [`urutan_peserta_${slot}`]        : urutanGlobal,
    [`ada_peserta_${slot}`]           : true,
  };
}

function buildKwitansiHalamanArgs(chunk, pjd, halamanKe, totalHalaman) {
  const base = buildBaseArgs(pjd);
  const sorted = sortedPeserta(pjd);
  const globalOffset = (halamanKe - 1) * KWITANSI_PER_HALAMAN;

  let slotArgs = {};
  for (let s = 0; s < KWITANSI_PER_HALAMAN; s++) {
    const ps = chunk[s] || null;
    const urutan = ps ? sorted.indexOf(ps) + 1 : 0;
    Object.assign(slotArgs, buildKwitansiSlotFields(ps, pjd, urutan, s + 1));
  }

  return {
    ...base,
    ...slotArgs,
    halaman_ke              : halamanKe,
    total_halaman           : totalHalaman,
    jumlah_kwitansi_halaman : chunk.length,
    jumlah_peserta_halaman  : chunk.length,
  };
}

function countKwitansiFiles(pjd, tmpl) {
  const n = pjd?.peserta?.length || 0;
  if (n === 0) return 0;
  if (getKwitansiLayout(tmpl) === 'per_halaman') {
    return Math.ceil(n / KWITANSI_PER_HALAMAN);
  }
  return n;
}

function buildPesertaArgs(ps, pjd, urutan) {
  const pgw  = getPegawaiById(ps.pegawai_id);
  const uk   = getUKForPegawai(pgw);
  const cp   = calcPesertaFull(ps, pjd);

  const untukPembayaran = buildUntukPembayaran(ps, pjd);

  return {
    ...buildBaseArgs(pjd),
    // Override dengan data peserta
    nama_lengkap         : pgw?.nama_lengkap || '',
    nama_penerima        : pgw?.nama_lengkap || '',
    nip                  : pgw?.nip || '',
    nip_penerima         : pgw?.nip || '',
    jabatan              : pgw?.jabatan || '',
    jabatan_penerima     : pgw?.jabatan || '',
    pangkat              : pgw?.pangkat || '',
    golongan             : pgw?.golongan || '',
    pangkat_golongan     : [pgw?.pangkat, pgw?.golongan].filter(Boolean).join(' / '),
    nomor_rekening       : pgw?.nomor_rekening || '',
    rekening_penerima    : pgw?.nomor_rekening || '',
    unit_kerja           : uk.skpd || uk.nama || '',
    kota                 : uk.kota || '',
    kota_tanggal         : (uk.kota || '') + ', ' + formatTanggal(pjd.tanggal_surat),
    // Kalkulasi
    uang_harian          : formatRupiah(cp.harian),
    uang_harian_peserta  : formatRupiah(cp.harian),
    transport            : formatRupiah(cp.totalT),
    transport_peserta    : formatRupiah(cp.totalT),
    total                : formatRupiah(cp.total),
    total_peserta        : formatRupiah(cp.total),
    total_terbilang      : terbilang(cp.total),
    total_peserta_terbilang: terbilang(cp.total),
    banyaknya_uang       : terbilang(cp.total),
    nominal              : formatNominalDoc(cp.total),
    nominal_peserta      : formatNominalDoc(cp.total),
    untuk_pembayaran     : untukPembayaran,
    urutan_peserta       : urutan,
    // Transport detail
    transport_nominal    : ps.dapat_transport ? formatRupiah(parseInt(ps.nominal_transport)||0) : '',
    transport_kali       : ps.dapat_transport ? (parseInt(ps.jumlah_kali)||1) : '',
    lama_hari            : cp.lama,
  };
}

// ─── DOCX GENERATOR ───────────────────────────────────────

// docxtemplater dari jsdelivr kadang expose sebagai huruf kecil (window.docxtemplater)
// bukan kapital (window.Docxtemplater) — ini alias-nya supaya aman
function getDocxtemplaterClass() {
  return window.Docxtemplater || window.docxtemplater || null;
}

async function generateDocx(b64, args, opts = {}) {
  const DocxClass = getDocxtemplaterClass();
  if (!DocxClass) throw new Error('Library Docxtemplater tidak ditemukan. Pastikan CDN sudah dimuat.');

  const bytes = atob(b64);
  const buf   = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);

  const piz = new PizZip(buf.buffer);
  const doc = new DocxClass(piz, {
    paragraphLoop : true,
    linebreaks    : true,
    delimiters    : { start: '{{', end: '}}' }, // template pakai {{tag}}, bukan {tag}
    nullGetter    : () => '',
  });
  doc.render(args);
  let blob = new Blob([doc.getZip().generate({ type: 'arraybuffer' })], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  if (opts.kwitansiJumlahPeserta) {
    blob = await trimKwitansiHalaman(blob, opts.kwitansiJumlahPeserta);
  }
  return blob;
}

/** Hapus tabel kwitansi kosong — conditional {#ada_peserta_N} tidak bisa membungkus tabel Word. */
async function trimKwitansiHalaman(blob, jumlahPeserta) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file('word/document.xml').async('string');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const NS  = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const body = doc.getElementsByTagNameNS(NS, 'body')[0];
  if (!body) return blob;

  const isCondOnly = (t) => /^\{\{[#/]?ada_peserta_[23]\}\}$/.test(t);

  for (const el of [...body.children]) {
    if (el.localName !== 'p') continue;
    const t = (el.textContent || '').trim();
    if (isCondOnly(t)) body.removeChild(el);
  }

  const tbls = () => [...body.children].filter(el => el.localName === 'tbl');
  if (tbls().length >= 3 && jumlahPeserta < 3) body.removeChild(tbls()[2]);
  if (tbls().length >= 2 && jumlahPeserta < 2) body.removeChild(tbls()[1]);

  zip.file('word/document.xml', new XMLSerializer().serializeToString(doc));
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

// ─── MAIN GENERATE ORCHESTRATOR ───────────────────────────
async function runGenerate(pjdId, selections) {
  const pjd = getPJDList().find(x => x.id === pjdId);
  if (!pjd) return toast('Data perjalanan tidak ditemukan', 'error');

  const btn = document.getElementById('btn-generate');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generating...'; }

  const zip    = new JSZip();
  const nomorSafe = (pjd.nomor_surat || 'SPPD').replace(/[^a-zA-Z0-9]/g, '_');
  const folder = zip.folder(nomorSafe);
  const errors = [];
  let   count  = 0;

  for (const sel of selections) {
    const tmpl = AppState.templates.find(t => t.id === sel.templateId);
    if (!tmpl || !TemplateStorage.hasFile(tmpl)) {
      errors.push(`${sel.label}: file tidak tersedia`);
      continue;
    }

    let tmplB64;
    try {
      updateGenerateProgress(`Memuat template ${sel.label}...`);
      tmplB64 = await TemplateStorage.downloadBase64(tmpl);
    } catch (loadErr) {
      errors.push(`${sel.label}: ${loadErr.message}`);
      continue;
    }

    try {
      updateGenerateProgress(`Generating ${sel.label}...`);

      if (tmpl.jenis === 'kwitansi' && getKwitansiLayout(tmpl) === 'per_halaman') {
        const sorted = sortedPeserta(pjd);
        const pages  = chunkArray(sorted, KWITANSI_PER_HALAMAN);
        for (let p = 0; p < pages.length; p++) {
          const args = buildKwitansiHalamanArgs(pages[p], pjd, p + 1, pages.length);
          const blob = await generateDocx(tmplB64, args, {
            kwitansiJumlahPeserta: pages[p].length,
          });
          folder.file(`Kwitansi_Halaman${p + 1}.docx`, blob);
          count++;
        }
      } else if (tmpl.isIterable) {
        const sorted = sortedPeserta(pjd);
        for (let i = 0; i < sorted.length; i++) {
          const pgw  = getPegawaiById(sorted[i].pegawai_id);
          const nama = (pgw?.nama_lengkap || 'Peserta').split(',')[0].trim().replace(/\s+/g,'_');
          const args = buildPesertaArgs(sorted[i], pjd, i + 1);
          const blob = await generateDocx(tmplB64, args);
          folder.file(`Kwitansi_${i+1}_${nama}.docx`, blob);
          count++;
        }
      } else if (tmpl.jenis === 'sppd') {
        for (const lembar of [1, 2]) {
          const args = { ...buildBaseArgs(pjd), lembar_ke: lembar };
          const blob = await generateDocx(tmplB64, args);
          folder.file(`SPPD_Lembar${lembar}.docx`, blob);
          count++;
        }
      } else {
        const args = buildBaseArgs(pjd);
        const blob = await generateDocx(tmplB64, args);
        const jenisSafe = (tmpl.jenis || 'Dokumen').replace(/[^a-zA-Z0-9]/g,'_');
        folder.file(`${jenisSafe}.docx`, blob);
        count++;
      }
    } catch (err) {
      console.error(err);
      errors.push(`${sel.label}: ${err.message}`);
    }
  }

  updateGenerateProgress('Membuat file ZIP...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const tgl     = formatTanggal(pjd.tanggal_berangkat).replace(/\s/g, '');
  const dlName  = `${nomorSafe}_${tgl}.zip`;
  const url     = URL.createObjectURL(zipBlob);
  const a       = document.createElement('a');
  a.href = url; a.download = dlName; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 8000);

  // Catat di history
  const gen = DB.getArr(KEYS.generated);
  gen.unshift({ id: Date.now(), pjd_id: pjdId, nomor: pjd.nomor_surat, count, errors: errors.length, at: new Date().toISOString() });
  DB.set(KEYS.generated, gen.slice(0, 50));

  if (btn) { btn.disabled = false; btn.textContent = '⚡ Generate & Download ZIP'; }
  updateGenerateProgress('');

  if (errors.length) {
    errors.forEach(e => toast('⚠️ ' + e, 'warning', 5000));
  }
  toast(`✅ ${count} dokumen berhasil digenerate!`, 'success', 5000);
  renderGeneratePage();
}

function updateGenerateProgress(msg) {
  const el = document.getElementById('gen-progress');
  if (el) el.textContent = msg;
}

// ─── GENERATE PAGE UI ─────────────────────────────────────
function renderGeneratePage() {
  const c = document.getElementById('generate-container');
  if (!c) return;

  const pjdList = getPJDList().sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  const templates = AppState.templates;

  if (pjdList.length === 0) {
    c.innerHTML = `
      <div class="empty-state" style="padding:80px 24px">
        <div class="empty-state-icon">✈️</div>
        <div class="empty-state-title">Belum ada data perjalanan dinas</div>
        <div class="empty-state-desc" style="margin-bottom:20px">Buat perjalanan dinas terlebih dahulu sebelum generate dokumen</div>
        <button class="btn btn-primary" onclick="navigateTo('perjalanan')">✈️ Buat Perjalanan Dinas</button>
      </div>`;
    return;
  }

  if (templates.length === 0) {
    c.innerHTML = `
      <div class="empty-state" style="padding:80px 24px">
        <div class="empty-state-icon">📄</div>
        <div class="empty-state-title">Belum ada template tersimpan</div>
        <div class="empty-state-desc" style="margin-bottom:20px">Upload template .docx terlebih dahulu</div>
        <button class="btn btn-primary" onclick="navigateTo('template')">📤 Upload Template</button>
      </div>`;
    return;
  }

  const pjdOptions = pjdList.map(p => {
    const lama   = hitungLama(p.tanggal_berangkat, p.tanggal_kembali);
    const tujuan = buildTujuanText(p);
    const label  = `${p.nomor_surat || '—'} · ${formatTanggal(p.tanggal_berangkat)} · ${tujuan} (${p.peserta?.length||0} orang)`;
    const icon   = p.status === 'final' ? '✅' : '📝';
    return `<option value="${p.id}">${icon} ${label}</option>`;
  }).join('');

  const genHistory = DB.getArr(KEYS.generated).slice(0, 5);

  c.innerHTML = `
    <!-- Select Perjalanan -->
    <div class="card mb-6">
      <div class="card-header">
        <div class="card-icon" style="background:#EBF3FD">✈️</div>
        <div><h3>Pilih Perjalanan Dinas</h3><p>Pilih perjalanan yang akan digenerate dokumennya</p></div>
      </div>
      <div class="card-body">
        <div class="form-group" style="margin-bottom:0">
          <select class="form-control" id="gen-pjd-select" onchange="onSelectPJD(this.value)" style="font-size:13px">
            <option value="">— Pilih Perjalanan Dinas —</option>
            ${pjdOptions}
          </select>
        </div>
      </div>
    </div>

    <!-- Perjalanan Detail (shown after select) -->
    <div id="gen-pjd-detail"></div>

    <!-- Template Selector -->
    <div id="gen-template-section" style="display:none">
      <div class="card mb-6">
        <div class="card-header">
          <div class="card-icon" style="background:#E8F5E9">📄</div>
          <div><h3>Pilih Dokumen yang Akan Digenerate</h3><p>Centang jenis dokumen dan pilih template untuk masing-masing</p></div>
        </div>
        <div class="card-body" id="gen-template-body">
          ${renderTemplateSelector()}
        </div>
      </div>

      <!-- Generate Button -->
      <div class="card" style="border:2px solid var(--navy)">
        <div class="card-body" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px">
          <div>
            <div style="font-size:15px;font-weight:800;color:var(--navy)">Siap Generate</div>
            <div id="gen-summary-text" class="text-muted text-sm">Pilih minimal satu template</div>
            <div id="gen-progress" class="text-sm" style="color:var(--navy);margin-top:4px"></div>
          </div>
          <button class="btn btn-primary btn-lg" id="btn-generate" onclick="triggerGenerate()">
            ⚡ Generate & Download ZIP
          </button>
        </div>
      </div>
    </div>

    <!-- History -->
    ${genHistory.length > 0 ? `
    <div class="card" style="margin-top:24px">
      <div class="card-header">
        <div class="card-icon" style="background:#FEF9E7">📦</div>
        <div><h3>Riwayat Generate</h3><p>5 generate terakhir</p></div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Nomor Surat</th><th>Dokumen</th><th>Status</th><th>Waktu</th></tr></thead>
        <tbody>
          ${genHistory.map(h => `
            <tr>
              <td><strong>${h.nomor||'—'}</strong></td>
              <td><span class="badge badge-auto">${h.count} dokumen</span></td>
              <td>${h.errors > 0 ? `<span class="badge badge-manual">⚠️ ${h.errors} error</span>` : '<span class="badge badge-auto">✅ Berhasil</span>'}</td>
              <td class="text-muted text-sm">${new Date(h.at).toLocaleString('id-ID')}</td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    </div>` : ''}`;
}

function renderTemplateSelector() {
  const JENIS = [
    { key: 'sppd',          label: 'SPPD',           icon: '📋', note: 'Generate 2 lembar otomatis (Lembar 1 & 2)' },
    { key: 'kwitansi',      label: 'Kwitansi',       icon: '🧾', note: '1 lembar = 1–3 peserta (atau 1 file/orang jika template loop)' },
    { key: 'surat_tugas',   label: 'Surat Tugas',    icon: '📝', note: 'Generate 1 file' },
    { key: 'rekap_belanja', label: 'Rekap Belanja',  icon: '📊', note: 'Generate 1 file' },
    { key: 'custom',        label: 'Custom',         icon: '📁', note: 'Template custom' },
  ];

  return JENIS.map(j => {
    const tmpls = AppState.templates.filter(t => t.jenis === j.key);
    if (tmpls.length === 0) return '';

    const opts = tmpls.map(t => `<option value="${t.id}">${t.nama}${t.scope === 'global' ? ' 🌐' : ''}</option>`).join('');

    return `
      <div class="gen-item" id="genitem-${j.key}" style="display:flex;align-items:center;gap:14px;padding:14px;border:2px solid var(--border);border-radius:var(--radius);margin-bottom:10px;transition:var(--transition)">
        <input type="checkbox" id="gchk-${j.key}" class="gen-chk"
          style="width:18px;height:18px;cursor:pointer;flex-shrink:0;accent-color:var(--navy)"
          onchange="onGenCheck('${j.key}', this.checked)">
        <div style="font-size:22px;flex-shrink:0">${j.icon}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:13px">${j.label}</div>
          <div class="text-muted text-sm">${j.note}</div>
        </div>
        <div style="width:260px;flex-shrink:0">
          <select class="form-control" id="gsel-${j.key}" style="font-size:12px" onchange="updateGenSummary()">
            ${opts}
          </select>
        </div>
      </div>`;
  }).join('');
}

function onGenCheck(jenis, checked) {
  const item = document.getElementById('genitem-' + jenis);
  if (item) {
    item.style.borderColor = checked ? 'var(--navy)' : 'var(--border)';
    item.style.background  = checked ? '#EEF3FB' : '';
  }
  updateGenSummary();
}

function updateGenSummary() {
  const selections = getGenSelections();
  const el = document.getElementById('gen-summary-text');
  if (!el) return;
  if (selections.length === 0) {
    el.textContent = 'Pilih minimal satu template';
  } else {
    const detail = selections.map(s => {
      if (s.jenis === 'kwitansi') {
        const pjdId = document.getElementById('gen-pjd-select')?.value;
        const pjd   = getPJDList().find(x => x.id === pjdId);
        const tmpl  = AppState.templates.find(t => t.id === s.templateId);
        const n     = countKwitansiFiles(pjd, tmpl || {});
        return `Kwitansi (${n} file)`;
      }
      if (s.jenis === 'sppd') return 'SPPD (2 lembar)';
      return s.label + ' (1 file)';
    });
    const total = selections.reduce((sum, s) => {
      if (s.jenis === 'kwitansi') {
        const pjdId = document.getElementById('gen-pjd-select')?.value;
        const pjd   = getPJDList().find(x => x.id === pjdId);
        const tmpl  = AppState.templates.find(t => t.id === s.templateId);
        return sum + countKwitansiFiles(pjd, tmpl || {});
      }
      if (s.jenis === 'sppd') return sum + 2;
      return sum + 1;
    }, 0);
    el.innerHTML = `${total} file akan digenerate: ${detail.join(', ')}`;
  }
}

function getGenSelections() {
  const JENIS = ['sppd','kwitansi','surat_tugas','rekap_belanja','custom'];
  return JENIS.filter(j => document.getElementById('gchk-' + j)?.checked)
    .map(j => ({
      jenis: j,
      label: { sppd:'SPPD', kwitansi:'Kwitansi', surat_tugas:'Surat Tugas', rekap_belanja:'Rekap Belanja', custom:'Custom' }[j],
      templateId: document.getElementById('gsel-' + j)?.value,
    }))
    .filter(s => s.templateId);
}

function onSelectPJD(pjdId) {
  const detail  = document.getElementById('gen-pjd-detail');
  const section = document.getElementById('gen-template-section');
  if (!pjdId) {
    if (detail)  detail.innerHTML = '';
    if (section) section.style.display = 'none';
    return;
  }

  const pjd    = getPJDList().find(x => x.id === pjdId);
  if (!pjd) return;

  const lama   = hitungLama(pjd.tanggal_berangkat, pjd.tanggal_kembali);
  const tujuan = buildTujuanText(pjd);
  const grand  = calcGrandTotalFull(pjd);
  const sorted = sortedPeserta(pjd);

  // Warning for draft
  const draftWarn = pjd.status !== 'final'
    ? `<div class="alert alert-warning" style="margin-bottom:12px">⚠️ Perjalanan ini masih berstatus <strong>Draft</strong>. Disarankan finalisasi terlebih dahulu di halaman Perjalanan Dinas.</div>`
    : '';

  // Peserta list
  const pesertaRows = sorted.map((ps, i) => {
    const pgw = getPegawaiById(ps.pegawai_id);
    const cp  = calcPesertaFull(ps, pjd);
    return `<tr>
      <td>${i+1}</td>
      <td><strong>${pgw?.nama_lengkap||'?'}</strong><br><span class="text-muted text-sm">${pgw?.golongan||''}</span></td>
      <td>${formatRupiah(cp.harian)} × ${lama} hari</td>
      <td>${ps.dapat_transport ? formatRupiah(cp.totalT) + ' 🚗' : '<span class="text-muted">—</span>'}</td>
      <td><strong style="color:var(--navy)">${formatRupiah(cp.total)}</strong></td>
    </tr>`;
  }).join('');

  if (detail) detail.innerHTML = `
    ${draftWarn}
    <div class="card mb-6">
      <div class="card-header" style="background:var(--surface-2)">
        <div style="flex:1">
          <div style="font-weight:800;font-size:15px">${pjd.nomor_surat}</div>
          <div class="pjd-meta" style="margin-top:4px">
            <span>📅 ${formatTanggal(pjd.tanggal_berangkat)} s.d ${formatTanggal(pjd.tanggal_kembali)}</span>
            <span>⏱ ${terbilangHari(lama)}</span>
            <span>📍 ${tujuan}</span>
            <span>🚗 ${pjd.alat_angkutan||'—'}</span>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:800;color:var(--navy)">${formatRupiah(grand)}</div>
          <div style="font-size:11px;color:var(--text-3)">${terbilang(grand)}</div>
        </div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Peserta</th><th>Uang Harian</th><th>Transport</th><th>Total</th></tr></thead>
        <tbody>${pesertaRows}</tbody>
      </table></div>
    </div>`;

  if (section) section.style.display = '';
  updateGenSummary();
}

function triggerGenerate() {
  const pjdId     = document.getElementById('gen-pjd-select')?.value;
  const selections = getGenSelections();

  if (!pjdId)           return toast('Pilih perjalanan dinas terlebih dahulu', 'error');
  if (!selections.length) return toast('Pilih minimal satu template dokumen', 'error');

  // Check PizZip & Docxtemplater loaded
  if (typeof PizZip === 'undefined') return toast('Library PizZip belum dimuat. Cek koneksi internet.', 'error');
  if (!getDocxtemplaterClass())      return toast('Library Docxtemplater belum dimuat. Cek koneksi internet.', 'error');

  runGenerate(pjdId, selections);
}
