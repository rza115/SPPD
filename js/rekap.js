/**
 * rekap.js — Rekap Rincian Perjalanan Dinas
 * Generate .xlsx dengan ExcelJS — struktur sesuai draft
 *
 * Kolom (A–O, 1–15):
 *  A=No(grup)  B=No(sub)  C=Nama  D=Rekening  E=NIP
 *  F=No&Tgl Surat  G=Jml Hari(teks)  H=Tgl Brkt  I=Tgl Kmbli  J=Maksud
 *  K=Jml Hari  L=Uang Harian  M=Total Perjadin  N=Biaya BBM  O=Total Biaya
 */

// ─────────────────────────────────────────────────────────
// KONSTANTA
// ─────────────────────────────────────────────────────────
const REKAP_COL_WIDTHS = [4, 4, 26, 18, 22, 22, 10, 14, 14, 42, 7, 14, 14, 12, 14];

const REKAP_JENIS_LABEL = {
  dalam_kota    : 'DALAM DAERAH',
  luar_kota     : 'LUAR DAERAH',
  luar_provinsi : 'LUAR PROVINSI',
};

// ─────────────────────────────────────────────────────────
// PAGE RENDER
// ─────────────────────────────────────────────────────────
function renderRekapPage() {
  const c = document.getElementById('rekap-container');
  if (!c) return;

  const pjdList = getPJDList()
    .sort((a, b) => new Date(a.tanggal_berangkat) - new Date(b.tanggal_berangkat));

  if (pjdList.length === 0) {
    c.innerHTML = `
      <div class="empty-state" style="padding:80px 24px">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-title">Belum ada data perjalanan dinas</div>
        <div class="empty-state-desc" style="margin-bottom:20px">Buat perjalanan dinas terlebih dahulu</div>
        <button class="btn btn-primary" onclick="navigateTo('perjalanan')">✈️ Buat Perjalanan Dinas</button>
      </div>`;
    return;
  }

  const pjdRows = pjdList.map(p => {
    const tujuan  = buildTujuanText(p);
    const grand   = calcGrandTotalFull(p);
    const jLabel  = getTingkatBiaya(p.jenis_perjalanan);
    const icon    = p.status === 'final' ? '✅' : '📝';
    return `
      <label class="rekap-pjd-row" data-jenis="${p.jenis_perjalanan}" id="rpjd-${p.id}">
        <input type="checkbox" class="rekap-chk" value="${p.id}"
          style="width:15px;height:15px;accent-color:var(--navy);flex-shrink:0"
          onchange="onRekapChange()">
        <div style="flex:1;min-width:0;overflow:hidden">
          <div style="font-weight:700;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${icon} ${p.nomor_surat || '—'}
          </div>
          <div style="font-size:11px;color:var(--text-3);margin-top:2px">
            ${formatTanggal(p.tanggal_berangkat)} · ${tujuan} · ${p.peserta?.length || 0} org
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:8px">
          <div style="font-size:12px;font-weight:700;color:var(--navy)">${formatRupiah(grand)}</div>
          <div style="font-size:10px;color:var(--text-3)">${jLabel}</div>
        </div>
      </label>`;
  }).join('');

  c.innerHTML = `
    <div class="grid-2" style="align-items:start;gap:20px">

      <!-- ═══ KIRI: Pilih & Filter ═══ -->
      <div>
        <div class="card mb-4">
          <div class="card-header">
            <div class="card-icon" style="background:#F3E5F5">☑️</div>
            <div><h3>Pilih Perjalanan Dinas</h3><p>Centang yang akan direkap</p></div>
          </div>
          <div class="card-body" style="padding:12px 16px">

            <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
              <button class="btn btn-secondary btn-sm" onclick="rekapCheckAll(true)">✅ Semua</button>
              <button class="btn btn-secondary btn-sm" onclick="rekapCheckAll(false)">☐ Batal</button>
              <select class="form-control" id="rekap-jenis-filter"
                style="font-size:12px;height:32px;padding:4px 8px;flex:1;min-width:130px"
                onchange="rekapApplyJenisFilter()">
                <option value="">Semua Jenis</option>
                <option value="dalam_kota">Dalam Daerah</option>
                <option value="luar_kota">Luar Daerah</option>
                <option value="luar_provinsi">Luar Provinsi</option>
              </select>
            </div>

            <div style="border:1px solid var(--border);border-radius:var(--radius);
                        max-height:460px;overflow-y:auto">
              <div id="rekap-pjd-list">${pjdRows}</div>
            </div>
          </div>
        </div>

        <!-- Tombol download (muncul saat ada yang dipilih) -->
        <div class="card" id="rekap-action-card"
          style="display:none;border:2px solid var(--navy)">
          <div class="card-body"
            style="display:flex;align-items:center;justify-content:space-between;
                   flex-wrap:wrap;gap:12px;padding:16px 20px">
            <div>
              <div id="rekap-sum-label"
                style="font-size:14px;font-weight:800;color:var(--navy)">—</div>
              <div id="rekap-grand-label" class="text-muted text-sm"></div>
              <div id="rekap-year-label" class="text-sm" style="color:var(--navy);margin-top:2px"></div>
            </div>
            <button class="btn btn-primary" id="btn-rekap-dl" onclick="downloadRekapXlsx()">
              📥 Download .xlsx
            </button>
          </div>
        </div>
      </div>

      <!-- ═══ KANAN: Preview ═══ -->
      <div class="card" style="min-height:320px">
        <div class="card-header">
          <div class="card-icon" style="background:#EBF3FD">👁️</div>
          <div><h3>Preview Rekap</h3><p>Tampilan sebelum download</p></div>
        </div>
        <div id="rekap-preview" class="card-body"
          style="padding:12px;overflow-x:auto">
          <div class="empty-state" style="padding:40px">
            <div class="empty-state-icon" style="font-size:28px">📋</div>
            <div class="empty-state-title" style="font-size:13px">
              Pilih perjalanan untuk preview
            </div>
          </div>
        </div>
      </div>

    </div>`;

  // Inject CSS sekali
  if (!document.getElementById('rekap-css')) {
    const s = document.createElement('style');
    s.id = 'rekap-css';
    s.textContent = `
      .rekap-pjd-row {
        display:flex;align-items:center;gap:10px;padding:10px 12px;
        cursor:pointer;border-bottom:1px solid var(--border);
        transition:background .15s;
      }
      .rekap-pjd-row:last-child { border-bottom:none; }
      .rekap-pjd-row:hover { background:var(--surface-2); }
      .rekap-pjd-row input:checked ~ * { color:var(--navy); }
    `;
    document.head.appendChild(s);
  }
}

function rekapCheckAll(checked) {
  document.querySelectorAll('.rekap-chk').forEach(chk => {
    const row = chk.closest('.rekap-pjd-row');
    if (row && row.style.display === 'none') return;
    chk.checked = checked;
  });
  onRekapChange();
}

function rekapApplyJenisFilter() {
  const val = document.getElementById('rekap-jenis-filter')?.value || '';
  document.querySelectorAll('.rekap-pjd-row').forEach(row => {
    row.style.display = (!val || row.dataset.jenis === val) ? '' : 'none';
  });
  onRekapChange();
}

function getRekapSelectedIds() {
  return [...document.querySelectorAll('.rekap-chk:checked')].map(c => c.value);
}

function onRekapChange() {
  const ids      = getRekapSelectedIds();
  const card     = document.getElementById('rekap-action-card');
  const sumEl    = document.getElementById('rekap-sum-label');
  const grandEl  = document.getElementById('rekap-grand-label');
  const yearEl   = document.getElementById('rekap-year-label');
  const preview  = document.getElementById('rekap-preview');
  const emptyHTML = `<div class="empty-state" style="padding:40px">
    <div class="empty-state-icon" style="font-size:28px">📋</div>
    <div class="empty-state-title" style="font-size:13px">Pilih perjalanan untuk preview</div>
  </div>`;

  if (!ids.length) {
    if (card)    card.style.display = 'none';
    if (preview) preview.innerHTML  = emptyHTML;
    return;
  }

  const groups     = buildRekapGroups(ids);
  const grandTotal = groups.reduce((s, g) => s + g.totalGrup, 0);
  const totalRows  = groups.reduce((s, g) => s + g.peserta.length, 0);
  const tahun      = rekapDetectTahun(groups);
  const jenisSet   = [...new Set(groups.map(g => g.jenis))];
  const jenisLabel = jenisSet.length === 1
    ? REKAP_JENIS_LABEL[jenisSet[0]] || jenisSet[0]
    : 'DALAM & LUAR DAERAH';

  if (sumEl)   sumEl.textContent   = `${ids.length} perjalanan · ${totalRows} baris data`;
  if (grandEl) grandEl.textContent = `Grand Total: ${formatRupiah(grandTotal)}`;
  if (yearEl)  yearEl.textContent  = `Tahun Anggaran ${tahun} · ${jenisLabel}`;
  if (card)    card.style.display  = '';
  if (preview) preview.innerHTML   = renderRekapPreview(groups);
}

function rekapDetectTahun(groups) {
  if (!groups.length) return new Date().getFullYear();
  return Math.max(...groups.map(g => g.tahunAnggaran));
}

/** Ambil PPTK dominan dari kumpulan grup (prioritas: grup pertama yang ada data-nya) */
function rekapDetectPptk(groups) {
  for (const g of groups) {
    if (g.namaPptk) return { nama: g.namaPptk, nip: g.nipPptk };
  }
  return { nama: '', nip: '' };
}

// ─────────────────────────────────────────────────────────
// DATA BUILDER
// ─────────────────────────────────────────────────────────
function buildRekapGroups(pjdIds) {
  const pjdList = getPJDList();
  return pjdIds
    .map(id => pjdList.find(p => p.id === id))
    .filter(Boolean)
    .sort((a, b) => new Date(a.tanggal_berangkat) - new Date(b.tanggal_berangkat))
    .map((pjd, idx) => {
      const lama   = hitungLama(pjd.tanggal_berangkat, pjd.tanggal_kembali) || 1;
      const sorted = sortedPeserta(pjd);

      const pesertaRows = sorted.map((ps, i) => {
        const pgw = getPegawaiById(ps.pegawai_id);
        const cp  = calcPesertaFull(ps, pjd);
        return {
          subNo         : i + 1,
          nama          : pgw?.nama_lengkap || '—',
          rekening      : pgw?.nomor_rekening || '—',
          nip           : pgw?.nip || '—',
          nomorSurat    : pjd.nomor_surat || '—',
          jumlahHariStr : lama + ' Hari',
          tglBerangkat  : formatTanggal(pjd.tanggal_berangkat),
          tglKembali    : formatTanggal(pjd.tanggal_kembali),
          maksud        : pjd.maksud_perjalanan || '—',
          jmlHari       : lama,
          uangHarian    : cp.harian,
          totalPerjadin : cp.totalH,
          biayaBBM      : ps.dapat_transport ? cp.totalT : null,
          totalBiaya    : cp.total,
        };
      });

      return {
        no           : idx + 1,
        tanggal      : formatTanggal(pjd.tanggal_berangkat),
        jenis        : pjd.jenis_perjalanan,
        tahunAnggaran: new Date(pjd.tanggal_berangkat).getFullYear() || new Date().getFullYear(),
        peserta      : pesertaRows,
        totalGrup    : pesertaRows.reduce((s, r) => s + r.totalBiaya, 0),
        namaPptk     : pjd.nama_pptk || '',
        nipPptk      : pjd.nip_pptk  || '',
      };
    });
}

// ─────────────────────────────────────────────────────────
// HTML PREVIEW  (rowspan untuk F–J pada multi-peserta)
// ─────────────────────────────────────────────────────────
function renderRekapPreview(groups) {
  const uk         = getFirstUK();
  const tahun      = rekapDetectTahun(groups);
  const jenisSet   = [...new Set(groups.map(g => g.jenis))];
  const jenisLabel = jenisSet.length === 1
    ? REKAP_JENIS_LABEL[jenisSet[0]] || jenisSet[0]
    : 'DALAM DAN LUAR DAERAH';
  const grandTotal = groups.reduce((s, g) => s + g.totalGrup, 0);

  const TH = `border:1px solid #8096b5;padding:4px 5px;background:#1a3a6b;
              color:white;text-align:center;font-size:10px;white-space:nowrap;vertical-align:middle`;
  const TD = (a = 'left', bold = false) =>
    `border:1px solid #ccc;padding:3px 5px;font-size:10px;
     text-align:${a};vertical-align:middle;${bold ? 'font-weight:700' : ''}`;

  let dataRows = '';
  groups.forEach(g => {
    const np = g.peserta.length;

    // ── Baris tanggal grup ──────────────────────────────
    dataRows += `
      <tr style="background:#e8eef7">
        <td colspan="2" style="${TD()}"></td>
        <td style="${TD()};font-weight:700">${g.tanggal}</td>
        <td colspan="7" style="${TD()}"></td>
        <td colspan="2" style="${TD('right')};font-weight:700">Total Penggunaan Anggaran</td>
        <td colspan="2" style="${TD()}"></td>
        <td style="${TD('right')};font-weight:700">${formatRupiah(g.totalGrup)}</td>
      </tr>`;

    // ── Baris peserta ──────────────────────────────────
    g.peserta.forEach((r, i) => {
      const fgRowspan = np > 1 && i === 0 ? ` rowspan="${np}"` : '';
      const showFJ    = np === 1 || i === 0;
      dataRows += `<tr>
        <td style="${TD('center')}">${i === 0 ? g.no : ''}</td>
        <td style="${TD('center')}">${r.subNo}</td>
        <td style="${TD()}">${r.nama}</td>
        <td style="${TD('center')}">${r.rekening}</td>
        <td style="${TD('center')}">${r.nip}</td>
        ${showFJ ? `
          <td${fgRowspan} style="${TD()}">${r.nomorSurat}</td>
          <td${fgRowspan} style="${TD('center')}">${r.jumlahHariStr}</td>
          <td${fgRowspan} style="${TD('center')}">${r.tglBerangkat}</td>
          <td${fgRowspan} style="${TD('center')}">${r.tglKembali}</td>
          <td${fgRowspan} style="${TD()}">${r.maksud}</td>
        ` : ''}
        <td style="${TD('center')}">${r.jmlHari}</td>
        <td style="${TD('right')}">${formatRupiah(r.uangHarian)}</td>
        <td style="${TD('right')}">${formatRupiah(r.totalPerjadin)}</td>
        <td style="${TD('right')}">${r.biayaBBM !== null ? formatRupiah(r.biayaBBM) : '-'}</td>
        <td style="${TD('right', true)}">${formatRupiah(r.totalBiaya)}</td>
      </tr>`;
    });

    // ── Baris Pencairan ────────────────────────────────
    dataRows += `
      <tr style="background:#fffde7">
        <td colspan="13" style="${TD()}"></td>
        <td style="${TD('right')};font-weight:700">Pencairan</td>
        <td style="${TD('right')};font-weight:700">${formatRupiah(g.totalGrup)}</td>
      </tr>`;
  });

  // ── Grand Total ────────────────────────────────────────
  dataRows += `
    <tr style="background:#1a3a6b">
      <td colspan="14"
        style="border:1px solid #8096b5;padding:5px 7px;font-size:10px;
               font-weight:700;color:white">Total Pencairan</td>
      <td style="border:1px solid #8096b5;padding:5px 7px;font-size:10px;
                 font-weight:700;color:white;text-align:right">
        ${formatRupiah(grandTotal)}
      </td>
    </tr>`;

  // ── PPTK ───────────────────────────────────────────────
  const pptk = rekapDetectPptk(groups);
  if (pptk.nama) {
    dataRows += `
      <tr>
        <td colspan="11" style="border:none;padding:5px 0"></td>
        <td colspan="4" style="border:none;padding:6px 5px;font-size:10px;
            text-align:center;font-weight:700">Pejabat Pelaksana Teknis Kegiatan</td>
      </tr>
      <tr>
        <td colspan="11" style="border:none"></td>
        <td colspan="4" style="border:none;padding:2px 5px;font-size:10px;
            text-align:center;font-weight:700">${pptk.nama}</td>
      </tr>
      <tr>
        <td colspan="11" style="border:none"></td>
        <td colspan="4" style="border:none;padding:2px 5px;font-size:10px;
            text-align:center">NIP. ${pptk.nip || '—'}</td>
      </tr>`;
  }

  return `
    <div style="font-size:10px;min-width:860px">
      <div style="text-align:center;margin-bottom:10px">
        <div style="font-weight:700;font-size:11px">
          ${uk.instansi_pembayar || 'PEMERINTAH KABUPATEN BOGOR'} TAHUN ANGGARAN ${tahun}
        </div>
        <div style="font-weight:700;font-size:11px">
          ${(uk.nama || 'DINAS KEBUDAYAAN KABUPATEN BOGOR').toUpperCase()}
        </div>
        <div style="font-weight:700;font-size:11px">PERJALANAN DINAS ${jenisLabel}</div>
      </div>
      <table style="border-collapse:collapse;width:100%">
        <thead>
          <tr>
            <th style="${TH}">No.</th>
            <th style="${TH}">No.</th>
            <th style="${TH}">Nama</th>
            <th style="${TH}">Nomor Rekening</th>
            <th style="${TH}">NIP</th>
            <th style="${TH}">Nomor dan Tanggal Surat Tugas</th>
            <th style="${TH}">Jumlah Hari</th>
            <th style="${TH}">Tanggal Berangkat</th>
            <th style="${TH}">Tanggal Kembali</th>
            <th style="${TH}">Maksud Perjalanan Dinas</th>
            <th colspan="4" style="${TH}">Biaya Perjalanan Dinas</th>
            <th style="${TH}">Total Biaya</th>
          </tr>
          <tr>
            ${Array(10).fill(`<th style="${TH}"></th>`).join('')}
            <th style="${TH}">Jml Hari</th>
            <th style="${TH}">Uang Harian</th>
            <th style="${TH}">Total Perjadin</th>
            <th style="${TH}">Biaya BBM</th>
            <th style="${TH}"></th>
          </tr>
          <tr>
            ${Array.from({length:15},(_,i)=>`<th style="${TH}">${i+1}</th>`).join('')}
          </tr>
        </thead>
        <tbody>${dataRows}</tbody>
      </table>
    </div>`;
}

// ─────────────────────────────────────────────────────────
// EXCEL DOWNLOAD HANDLER
// ─────────────────────────────────────────────────────────
async function downloadRekapXlsx() {
  const ids = getRekapSelectedIds();
  if (!ids.length) return toast('Pilih minimal satu perjalanan dinas', 'error');
  if (typeof ExcelJS === 'undefined')
    return toast('Library ExcelJS belum dimuat. Cek koneksi internet.', 'error');

  const btn = document.getElementById('btn-rekap-dl');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generating...'; }

  try {
    const groups = buildRekapGroups(ids);
    await generateRekapXlsx(groups);
    toast('✅ File rekap berhasil didownload!', 'success', 4000);
  } catch (err) {
    console.error('[Rekap]', err);
    toast('❌ Gagal generate: ' + err.message, 'error', 6000);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📥 Download .xlsx'; }
  }
}

// ─────────────────────────────────────────────────────────
// EXCEL GENERATOR  (ExcelJS — struktur 1:1 sesuai draft)
// ─────────────────────────────────────────────────────────
async function generateRekapXlsx(groups) {
  const uk         = getFirstUK();
  const tahun      = rekapDetectTahun(groups);
  const jenisSet   = [...new Set(groups.map(g => g.jenis))];
  const jenisLabel = jenisSet.length === 1
    ? REKAP_JENIS_LABEL[jenisSet[0]] || jenisSet[0]
    : 'DALAM DAN LUAR DAERAH';
  const grandTotal = groups.reduce((s, g) => s + g.totalGrup, 0);

  // ── Workbook & worksheet ──────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SPPD Generator';
  wb.created = new Date();

  const ws = wb.addWorksheet('Rekap Rincian', {
    pageSetup: {
      paperSize   : 9,           // A4
      orientation : 'landscape',
      fitToPage   : true,
      fitToWidth  : 1,
      fitToHeight : 0,
    },
  });

  // Freeze header rows (1–3 title + 1 spacer + 3 kolom = baris 1–7)
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 7 }];

  // ── Column widths ──────────────────────────────────────
  REKAP_COL_WIDTHS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // ── Shared styles ──────────────────────────────────────
  const NAVY_ARGB = 'FF1A3A6B';
  const border1   = {
    top    : { style: 'thin' }, bottom: { style: 'thin' },
    left   : { style: 'thin' }, right  : { style: 'thin' },
  };
  const navyFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_ARGB } };
  const blueFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF7' } };
  const yelFill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFCE0' } };

  /** Terapkan style navy ke satu cell header */
  function navyCell(row, col, value, hAlign = 'center') {
    const cell = ws.getCell(row, col);
    cell.value      = value;
    cell.fill       = navyFill;
    cell.font       = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.alignment  = { horizontal: hAlign, vertical: 'middle', wrapText: true };
    cell.border     = border1;
  }

  /** Terapkan border & gaya data ke satu cell */
  function dataCell(row, col, value, hAlign = 'left', bold = false, numFmt = null) {
    const cell = ws.getCell(row, col);
    cell.value     = value;
    cell.border    = border1;
    cell.font      = { size: 10, bold };
    cell.alignment = { horizontal: hAlign, vertical: 'middle', wrapText: true };
    if (numFmt) cell.numFmt = numFmt;
  }

  /** Isi semua cell dalam satu baris dengan fill & border (untuk baris berwarna) */
  function fillRow(row, fill, height = 18) {
    ws.getRow(row).height = height;
    for (let c = 1; c <= 15; c++) {
      const cell = ws.getCell(row, c);
      cell.fill   = fill;
      cell.border = border1;
    }
  }

  // ═══════════════════════════════════════════════════════
  // BARIS 1–3: Judul dokumen (A:O merged)
  // ═══════════════════════════════════════════════════════
  const titles = [
    `${uk.instansi_pembayar || 'PEMERINTAH KABUPATEN BOGOR'} TAHUN ANGGARAN ${tahun}`,
    (uk.nama || 'DINAS KEBUDAYAAN KABUPATEN BOGOR').toUpperCase(),
    `PERJALANAN DINAS ${jenisLabel}`,
  ];
  titles.forEach((txt, i) => {
    const r = i + 1;
    ws.mergeCells(r, 1, r, 15);
    const cell       = ws.getCell(r, 1);
    cell.value       = txt;
    cell.font        = { bold: true, size: 11 };
    cell.alignment   = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(r).height = 18;
  });

  // Baris 4: spacer
  ws.getRow(4).height = 6;

  // ═══════════════════════════════════════════════════════
  // BARIS 5–7: Header kolom
  // Merged sesuai draft:
  //   A5:A6, B5:B6, C5:C6, D5:D6, E5:E6, F5:F6,
  //   G5:G6, H5:H6, I5:I6, J5:J6, K5:N5, O5:O6
  // ═══════════════════════════════════════════════════════
  ws.getRow(5).height = 32;
  ws.getRow(6).height = 20;
  ws.getRow(7).height = 16;

  // Row 5 — isi semua 15 kolom dulu, baru merge
  const hdr5 = [
    'No.', '', 'Nama', 'Nomor Rekening', 'NIP',
    'Nomor dan Tanggal Surat Tugas', 'Jumlah Hari',
    'Tanggal Berangkat', 'Tanggal Kembali',
    'Maksud Perjalanan Dinas\n(Sesuai Surat Tugas)',
    'Biaya Perjalanan Dinas', '', '', '', 'Total Biaya',
  ];
  hdr5.forEach((v, i) => navyCell(5, i + 1, v));
  // Override K5 setelah loop (nilai asli)
  navyCell(5, 11, 'Biaya Perjalanan Dinas');

  // Row 6 — sub-header hanya K–N, kolom lain navy kosong
  for (let c = 1; c <= 15; c++) {
    if (c >= 11 && c <= 14) continue; // diisi di bawah
    const cell = ws.getCell(6, c);
    cell.fill   = navyFill;
    cell.border = border1;
  }
  ['Jml Hari', 'Uang Harian', 'Total Perjadin', 'Biaya BBM'].forEach((v, i) => {
    navyCell(6, 11 + i, v);
  });

  // Row 7 — nomor indeks 1–15
  for (let c = 1; c <= 15; c++) navyCell(7, c, c);

  // Terapkan merge header sesuai draft
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach(col => {
    ws.mergeCells(`${col}5:${col}6`);
  });
  ws.mergeCells('K5:N5');  // "Biaya Perjalanan Dinas"
  ws.mergeCells('O5:O6');

  // ═══════════════════════════════════════════════════════
  // BARIS DATA
  // ═══════════════════════════════════════════════════════
  let r = 8;

  groups.forEach(g => {
    const np = g.peserta.length;

    // ── Baris tanggal grup ────────────────────────────────
    fillRow(r, blueFill, 18);
    ws.mergeCells(r, 1, r, 12);      // A:L — tanggal
    ws.getCell(r, 1).value     = g.tanggal;
    ws.getCell(r, 1).font      = { bold: true, size: 10 };
    ws.getCell(r, 1).alignment = { horizontal: 'left', vertical: 'middle' };

    ws.mergeCells(r, 13, r, 14);     // M:N — label
    ws.getCell(r, 13).value     = 'Total Penggunaan Anggaran';
    ws.getCell(r, 13).font      = { bold: true, size: 10 };
    ws.getCell(r, 13).alignment = { horizontal: 'right', vertical: 'middle' };

    ws.getCell(r, 15).value     = g.totalGrup;
    ws.getCell(r, 15).font      = { bold: true, size: 10 };
    ws.getCell(r, 15).numFmt    = '#,##0';
    ws.getCell(r, 15).alignment = { horizontal: 'right', vertical: 'middle' };
    r++;

    // ── Baris peserta ─────────────────────────────────────
    const firstDataRow = r;

    g.peserta.forEach((pr, i) => {
      ws.getRow(r).height = 32;

      dataCell(r,  1, i === 0 ? g.no : null, 'center');
      dataCell(r,  2, pr.subNo,              'center');
      dataCell(r,  3, pr.nama);
      dataCell(r,  4, pr.rekening,           'center');
      dataCell(r,  5, pr.nip,                'center');

      // F–J: hanya isi di baris pertama; baris berikut hanya border
      if (i === 0) {
        dataCell(r,  6, pr.nomorSurat);
        dataCell(r,  7, pr.jumlahHariStr,    'center');
        dataCell(r,  8, pr.tglBerangkat,     'center');
        dataCell(r,  9, pr.tglKembali,       'center');
        dataCell(r, 10, pr.maksud);
      } else {
        for (let c = 6; c <= 10; c++) ws.getCell(r, c).border = border1;
      }

      dataCell(r, 11, pr.jmlHari,            'center');
      dataCell(r, 12, pr.uangHarian,         'right',  false, '#,##0');
      dataCell(r, 13, pr.totalPerjadin,      'right',  false, '#,##0');

      if (pr.biayaBBM !== null) {
        dataCell(r, 14, pr.biayaBBM,         'right',  false, '#,##0');
      } else {
        dataCell(r, 14, '-',                 'right');
      }

      dataCell(r, 15, pr.totalBiaya,         'right',  true,  '#,##0');
      r++;
    });

    // Merge F–J vertikal untuk grup multi-peserta (sesuai draft F12:F13, dll)
    if (np > 1) {
      const lastDataRow = r - 1;
      for (let col = 6; col <= 10; col++) {
        ws.mergeCells(firstDataRow, col, lastDataRow, col);
        const cell       = ws.getCell(firstDataRow, col);
        cell.alignment   = {
          horizontal : (col === 6 || col === 10) ? 'left' : 'center',
          vertical   : 'middle',
          wrapText   : true,
        };
      }
    }

    // ── Baris Pencairan ───────────────────────────────────
    fillRow(r, yelFill, 18);
    ws.mergeCells(r, 1, r, 13);        // A:M kosong
    ws.getCell(r, 1).alignment = { vertical: 'middle' };

    ws.getCell(r, 14).value     = 'Pencairan';
    ws.getCell(r, 14).font      = { bold: true, size: 10 };
    ws.getCell(r, 14).alignment = { horizontal: 'right', vertical: 'middle' };

    ws.getCell(r, 15).value     = g.totalGrup;
    ws.getCell(r, 15).font      = { bold: true, size: 10 };
    ws.getCell(r, 15).numFmt    = '#,##0';
    ws.getCell(r, 15).alignment = { horizontal: 'right', vertical: 'middle' };
    r++;
  });

  // ── Grand Total (A:N merged, sesuai draft A15:N15) ──────
  fillRow(r, navyFill, 22);
  ws.mergeCells(r, 1, r, 14);   // A:N
  ws.getCell(r, 1).value     = 'Total Pencairan';
  ws.getCell(r, 1).font      = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  ws.getCell(r, 1).alignment = { horizontal: 'left', vertical: 'middle' };

  ws.getCell(r, 15).value     = grandTotal;
  ws.getCell(r, 15).font      = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  ws.getCell(r, 15).numFmt    = '#,##0';
  ws.getCell(r, 15).alignment = { horizontal: 'right', vertical: 'middle' };
  r++;

  // ── PPTK (sesuai draft: baris kosong, label, nama, NIP) ──
  const pptk = rekapDetectPptk(groups);
  if (pptk.nama) {
    // Baris kosong sebagai spacer
    ws.getRow(r).height = 10;
    r++;

    // Baris label "Pejabat Pelaksana Teknis Kegiatan"
    ws.getRow(r).height = 18;
    ws.mergeCells(r, 11, r, 15);
    const lblCell       = ws.getCell(r, 11);
    lblCell.value       = 'Pejabat Pelaksana Teknis Kegiatan';
    lblCell.font        = { bold: true, size: 10 };
    lblCell.alignment   = { horizontal: 'center', vertical: 'middle' };
    r++;

    // Baris nama PPTK
    ws.getRow(r).height = 18;
    ws.mergeCells(r, 11, r, 15);
    const namaCell      = ws.getCell(r, 11);
    namaCell.value      = pptk.nama;
    namaCell.font       = { bold: true, size: 10 };
    namaCell.alignment  = { horizontal: 'center', vertical: 'middle' };
    r++;

    // Baris NIP PPTK
    ws.getRow(r).height = 16;
    ws.mergeCells(r, 11, r, 15);
    const nipCell       = ws.getCell(r, 11);
    nipCell.value       = `NIP. ${pptk.nip || '—'}`;
    nipCell.font        = { size: 10 };
    nipCell.alignment   = { horizontal: 'center', vertical: 'middle' };
  }

  // ── Download ───────────────────────────────────────────
  const buf    = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = `Rekap_Rincian_PD_${tahun}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
