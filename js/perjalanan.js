/**
 * perjalanan.js — Phase 3: Form Perjalanan Dinas
 * Multi-step wizard + kalkulasi realtime
 */

// ─── STATE ────────────────────────────────────────────────
const PJD = {
  currentStep: 1,
  totalSteps: 4,
  form: {},          // data yang sedang diisi
  editId: null,      // null = baru, string = edit existing

  reset() {
    this.currentStep = 1;
    this.editId = null;
    this.form = {
      nomor_surat: '', kode_no: '', tanggal_surat: '',
      tanggal_berangkat: '', tanggal_kembali: '',
      jenis_perjalanan: 'dalam_kota',
      kecamatan_id: '', alamat_tujuan: '', kota_tujuan_id: '',
      alat_angkutan: 'Kendaraan Roda 4',
      kode_sipd_id: '', kode_sipd_manual: '',
      peserta: [],
      maksud_perjalanan: '', dasar: '',
      deskripsi_tugas: '', pptk_id: '',
      status: 'draft',
      created_at: new Date().toISOString(),
    };
  }
};

// ─── HELPERS ──────────────────────────────────────────────
const getPJDList  = () => DB.getArr(KEYS.perjalanan);
const savePJDList = (arr) => DB.set(KEYS.perjalanan, arr);

function getPegawaiById(id) { return DB.getArr('sppd_pegawai').find(p => p.id === id); }
function getKecById(id)     { return DB.getArr('sppd_kecamatan').find(k => k.id === id); }
function getKotaById(id)    { return DB.getArr('sppd_kota_tujuan').find(k => k.id === id); }

// Saran tarif transport: dari kecamatan (dalam kota) atau kota preset (luar daerah).
function getSuggestTransport() {
  const jenis = PJD.form.jenis_perjalanan || 'dalam_kota';
  if (jenis === 'dalam_kota') {
    return getKecById(PJD.form.kecamatan_id)?.tarif_transport || 0;
  }
  return getKotaById(PJD.form.kota_tujuan_id)?.tarif_transport || 0;
}
function getSipdById(id)    { return DB.getArr('sppd_sipd').find(s => s.id === id); }
function getTarif()         { return DB.get('sppd_tarif') || {}; }

function getTarifHarian(jenis) {
  const t = getTarif();
  return t[jenis]?.uang_harian || 0;
}

function getTingkatBiaya(jenis) {
  const map = {
    dalam_kota: 'Dalam Daerah',
    luar_kota: 'Luar Daerah',
    luar_provinsi: 'Luar Provinsi',
  };
  return map[jenis] || jenis;
}

function getLamaPerjalanan() {
  const { tanggal_berangkat: a, tanggal_kembali: b } = PJD.form;
  if (!a || !b) return 0;
  return hitungLama(a, b);
}

// ─── KALKULASI PER PESERTA ────────────────────────────────
function calcPeserta(p) {
  const lama   = getLamaPerjalanan() || 1;
  const harian = getTarifHarian(PJD.form.jenis_perjalanan);
  const totalHarian    = harian * lama;
  const totalTransport = p.dapat_transport
    ? (parseInt(p.nominal_transport) || 0) * (parseInt(p.jumlah_kali) || 1) * lama
    : 0;
  return {
    ...p,
    uang_harian: harian,
    lama_perjalanan: lama,
    total_uang_harian: totalHarian,
    total_transport: totalTransport,
    total: totalHarian + totalTransport,
  };
}

function calcGrandTotal() {
  return PJD.form.peserta.reduce((sum, p) => sum + calcPeserta(p).total, 0);
}

// ─── CONTAINER RENDER ─────────────────────────────────────
function renderPerjalananPage() {
  const c = document.getElementById('perjalanan-container');
  if (!c) return;
  if (PJD.editId !== null || PJD.currentStep > 0 && PJD.form.nomor_surat !== undefined && document.getElementById('wizard-body')) {
    renderWizard();
  } else {
    renderPerjalananList();
  }
}

// ─── LIST VIEW ────────────────────────────────────────────
function renderPerjalananList() {
  const c = document.getElementById('perjalanan-container');
  if (!c) return;
  const list = getPJDList().sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

  c.innerHTML = `
    <div class="table-toolbar mb-6">
      <div class="table-toolbar-left">
        <h3 style="font-size:16px;font-weight:800">Daftar Perjalanan Dinas</h3>
        <span class="badge badge-auto">${list.length} perjalanan</span>
      </div>
      <div class="table-toolbar-right">
        <button class="btn btn-primary" onclick="startNewPerjalanan()">
          ✈️ Buat Perjalanan Dinas Baru
        </button>
      </div>
    </div>

    ${list.length === 0 ? `
      <div class="empty-state" style="padding:80px 24px">
        <div class="empty-state-icon">✈️</div>
        <div class="empty-state-title">Belum ada perjalanan dinas</div>
        <div class="empty-state-desc" style="margin-bottom:20px">Klik tombol di atas untuk membuat perjalanan dinas baru</div>
        <button class="btn btn-primary" onclick="startNewPerjalanan()">✈️ Buat Sekarang</button>
      </div>` : list.map(p => renderPJDCard(p)).join('')}`;
}

function renderPJDCard(p) {
  const pesertaList = (p.peserta || []).map(ps => {
    const pgw = getPegawaiById(ps.pegawai_id);
    return pgw ? pgw.nama_lengkap.split(',')[0] : '?';
  }).join(', ');

  const tujuan = p.jenis_perjalanan === 'dalam_kota'
    ? (p.nama_tempat || (getKecById(p.kecamatan_id)?.nama ? 'Kec. ' + getKecById(p.kecamatan_id).nama : '—'))
    : (p.alamat_tujuan || '—');

  const lama   = hitungLama(p.tanggal_berangkat, p.tanggal_kembali);
  const gt     = (p.peserta || []).reduce((s, ps) => {
    const cp = calcPesertaStatic(ps, p.jenis_perjalanan, lama);
    return s + cp.total;
  }, 0);

  const statusClass = p.status === 'final' ? 'status-final' : 'status-draft';
  const statusLabel = p.status === 'final' ? '✅ Final' : '📝 Draft';

  return `
    <div class="pjd-card">
      <div class="pjd-card-header">
        <div style="flex:1">
          <div class="flex items-center gap-2" style="margin-bottom:4px">
            <span style="font-size:15px;font-weight:800">${p.nomor_surat || '—'}</span>
            <span class="badge ${statusClass}">${statusLabel}</span>
          </div>
          <div class="pjd-meta">
            <span>📅 ${formatTanggal(p.tanggal_berangkat)}${p.tanggal_kembali !== p.tanggal_berangkat ? ' s.d ' + formatTanggal(p.tanggal_kembali) : ''}</span>
            <span>📍 ${tujuan}</span>
            <span>👥 ${p.peserta?.length || 0} peserta</span>
            <span>🚗 ${p.alat_angkutan || '—'}</span>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:18px;font-weight:800;color:var(--navy)">${formatRupiah(gt)}</div>
          <div style="font-size:11px;color:var(--text-3)">Grand Total</div>
        </div>
      </div>
      <div class="pjd-card-body">
        <div class="flex justify-between items-center">
          <span class="text-sm text-muted">👤 ${pesertaList || '—'}</span>
          <div class="flex gap-2">
            <button class="btn btn-secondary btn-sm" onclick="editPerjalanan('${p.id}')">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deletePerjalanan('${p.id}')">🗑️</button>
          </div>
        </div>
      </div>
    </div>`;
}

function calcPesertaStatic(ps, jenis, lama) {
  const tarif  = DB.get('sppd_tarif') || {};
  const harian = tarif[jenis]?.uang_harian || 0;
  const totalT = ps.dapat_transport
    ? (parseInt(ps.nominal_transport)||0) * (parseInt(ps.jumlah_kali)||1) * lama : 0;
  return { ...ps, total: harian * lama + totalT };
}

// ─── START / EDIT ──────────────────────────────────────────
function startNewPerjalanan() {
  PJD.reset();
  PJD.currentStep = 1;
  renderWizard();
}

function editPerjalanan(id) {
  const p = getPJDList().find(x => x.id === id);
  if (!p) return;
  PJD.form    = JSON.parse(JSON.stringify(p));
  PJD.editId  = id;
  PJD.currentStep = 1;
  renderWizard();
}

function deletePerjalanan(id) {
  const p = getPJDList().find(x => x.id === id);
  if (!confirm(`Hapus perjalanan "${p?.nomor_surat}"?`)) return;
  savePJDList(getPJDList().filter(x => x.id !== id));
  renderPerjalananList();
  toast('Perjalanan dinas dihapus', 'success');
}

// ─── WIZARD CONTAINER ─────────────────────────────────────
function renderWizard() {
  const c = document.getElementById('perjalanan-container');
  if (!c) return;
  c.innerHTML = `
    ${wizardStepsHTML()}
    <div id="wizard-body"></div>
    <div id="wizard-nav" class="flex justify-between items-center" style="margin-top:20px">
      <button class="btn btn-secondary" id="btn-prev" onclick="wizardPrev()">← Kembali</button>
      <div class="flex gap-2">
        <button class="btn btn-secondary" onclick="renderPerjalananList()">✕ Batal</button>
        <button class="btn btn-primary" id="btn-next" onclick="wizardNext()">Lanjut →</button>
      </div>
    </div>`;
  renderStep(PJD.currentStep);
}

function wizardStepsHTML() {
  const steps = [
    { label: 'Step 1', title: 'Data Perjalanan' },
    { label: 'Step 2', title: 'Peserta' },
    { label: 'Step 3', title: 'Isian Dokumen' },
    { label: 'Step 4', title: 'Ringkasan' },
  ];
  return `<div class="wizard-steps">
    ${steps.map((s, i) => {
      const n = i + 1;
      const cls = n < PJD.currentStep ? 'done' : n === PJD.currentStep ? 'active' : 'pending';
      const icon = n < PJD.currentStep ? '✓' : n;
      return `<div class="wizard-step ${cls}">
        <div class="step-circle">${icon}</div>
        <div class="step-info">
          <div class="step-label">${s.label}</div>
          <div class="step-title">${s.title}</div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

// ─── STEP RENDERER ────────────────────────────────────────
function renderStep(n) {
  const body = document.getElementById('wizard-body');
  const prev = document.getElementById('btn-prev');
  const next = document.getElementById('btn-next');
  if (!body) return;

  if (prev) prev.style.display = n === 1 ? 'none' : '';
  if (next) next.textContent = n === PJD.totalSteps ? '💾 Simpan Perjalanan' : 'Lanjut →';

  const renders = { 1: renderStep1, 2: renderStep2, 3: renderStep3, 4: renderStep4 };
  if (renders[n]) renders[n](body);
}

// ─────────────────────────────────────────────────────────
// STEP 1 — Data Perjalanan
// ─────────────────────────────────────────────────────────
function renderStep1(body) {
  const f     = PJD.form;
  const sipds = DB.getArr('sppd_sipd').filter(s => s.is_active !== false);
  const kecs  = DB.getArr('sppd_kecamatan');
  const kotas = DB.getArr('sppd_kota_tujuan');

  body.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-icon" style="background:#EBF3FD">📋</div>
        <div><h3>Data Perjalanan Dinas</h3><p>Nomor surat, tanggal, tujuan, dan angkutan</p></div>
      </div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nomor Surat *</label>
            <input class="form-control" id="f-nomor" value="${f.nomor_surat||''}"
              placeholder="800.1.11.1/1338-Sekretariat"
              oninput="PJD.form.nomor_surat=this.value">
          </div>
          <div class="form-group">
            <label class="form-label">Kode No. <span class="text-muted">(SPPD)</span></label>
            <input class="form-control" id="f-kodeno" value="${f.kode_no||''}"
              placeholder="Opsional"
              oninput="PJD.form.kode_no=this.value">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tanggal Surat *</label>
            <input type="date" class="form-control" id="f-tglsurat" value="${f.tanggal_surat||''}"
              onchange="PJD.form.tanggal_surat=this.value">
            <div class="form-text">Tanggal surat dibuat (bukan tanggal berangkat)</div>
          </div>
          <div class="form-group" style="visibility:hidden"></div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Tanggal Berangkat *</label>
            <input type="date" class="form-control" id="f-tglbrgkt" value="${f.tanggal_berangkat||''}"
              onchange="PJD.form.tanggal_berangkat=this.value;updateLamaPreview()">
          </div>
          <div class="form-group">
            <label class="form-label">Tanggal Kembali *</label>
            <input type="date" class="form-control" id="f-tglkmbli" value="${f.tanggal_kembali||''}"
              onchange="PJD.form.tanggal_kembali=this.value;updateLamaPreview()">
          </div>
        </div>

        <div id="lama-preview" style="display:none" class="alert alert-success" style="margin-bottom:14px">
          📅 <span id="lama-text"></span>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Jenis Perjalanan *</label>
            <select class="form-control" id="f-jenis" onchange="PJD.form.jenis_perjalanan=this.value;updateTarifPreview();updateTujuanField()">
              <option value="dalam_kota"    ${f.jenis_perjalanan==='dalam_kota'    ?'selected':''}>🏙️ Dalam Kota / Dalam Daerah</option>
              <option value="luar_kota"     ${f.jenis_perjalanan==='luar_kota'     ?'selected':''}>🚗 Luar Kota / Luar Daerah</option>
              <option value="luar_provinsi" ${f.jenis_perjalanan==='luar_provinsi' ?'selected':''}>✈️ Luar Provinsi</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Uang Harian</label>
            <div id="tarif-preview" class="form-control" style="background:var(--bg);cursor:default;font-weight:700;color:var(--navy)">
              ${formatRupiah(getTarifHarian(f.jenis_perjalanan||'dalam_kota'))} / orang / hari
            </div>
            <div class="form-text">Tarif dari master data. <a href="#" onclick="navigateTo('master');return false">Ubah di Data Master →</a></div>
          </div>
        </div>

        <div class="form-group" id="tujuan-wrap">
          <label class="form-label" id="tujuan-label">Kecamatan Tujuan *</label>
          <div id="tujuan-field">
            ${f.jenis_perjalanan === 'dalam_kota' || !f.jenis_perjalanan
              ? `<select class="form-control" id="f-kecamatan" onchange="PJD.form.kecamatan_id=this.value">
                  <option value="">— Pilih Kecamatan —</option>
                  ${kecs.map(k => `<option value="${k.id}" ${f.kecamatan_id===k.id?'selected':''}>${k.nama} ${k.tarif_transport>0?'('+formatRupiah(k.tarif_transport)+')':''}</option>`).join('')}
                </select>
                <input class="form-control" id="f-nama-tempat" style="margin-top:8px" value="${f.nama_tempat||''}"
                  placeholder="Nama tempat (opsional): Kantor Kecamatan Kemang"
                  oninput="PJD.form.nama_tempat=this.value">
                <div class="form-text">Isi jika ingin nama tempat spesifik muncul di dokumen, bukan cuma nama kecamatan.</div>`
              : `<select class="form-control" id="f-kota-tujuan" style="margin-bottom:8px" onchange="onKotaTujuanChange(this.value)">
                  <option value="">— Pilih Kota Besar (opsional, isi saran tarif transport) —</option>
                  ${kotas.map(k => `<option value="${k.id}" ${f.kota_tujuan_id===k.id?'selected':''}>${k.nama} ${k.tarif_transport>0?'('+formatRupiah(k.tarif_transport)+')':''}</option>`).join('')}
                </select>
                <input class="form-control" id="f-alamat" value="${f.alamat_tujuan||''}"
                  placeholder="Alamat lengkap tujuan perjalanan..."
                  oninput="PJD.form.alamat_tujuan=this.value">`}
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Alat Angkutan</label>
            <select class="form-control" id="f-angkutan" onchange="PJD.form.alat_angkutan=this.value">
              <option ${f.alat_angkutan==='Kendaraan Roda 4'?'selected':''}>Kendaraan Roda 4</option>
              <option ${f.alat_angkutan==='Kendaraan Roda 2'?'selected':''}>Kendaraan Roda 2</option>
              <option ${f.alat_angkutan==='Angkutan Umum'?'selected':''}>Angkutan Umum</option>
              <option ${f.alat_angkutan==='Pesawat Udara'?'selected':''}>Pesawat Udara</option>
              <option ${f.alat_angkutan==='Kereta Api'?'selected':''}>Kereta Api</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Kode Rekening SIPD</label>
            <select class="form-control" id="f-sipd" onchange="PJD.form.kode_sipd_id=this.value">
              <option value="">— Pilih atau isi manual —</option>
              ${sipds.map(s => `<option value="${s.id}" ${f.kode_sipd_id===s.id?'selected':''}>${s.nama_singkat||s.sub_kegiatan} (${s.kode})</option>`).join('')}
            </select>
            <input class="form-control" id="f-sipd-manual" style="margin-top:8px"
              value="${f.kode_sipd_manual||''}" placeholder="Atau ketik kode manual: 5.1.02.04.001.00003"
              oninput="PJD.form.kode_sipd_manual=this.value">
          </div>
        </div>
      </div>
    </div>`;

  updateLamaPreview();
  updateTarifPreview();
}

function updateLamaPreview() {
  const lama = getLamaPerjalanan();
  const el   = document.getElementById('lama-preview');
  const txt  = document.getElementById('lama-text');
  if (!el || !txt) return;
  if (lama > 0) {
    el.style.display = '';
    txt.textContent  = `Lama perjalanan: ${terbilangHari(lama)} · Berangkat ${namaHari(PJD.form.tanggal_berangkat)}, Kembali ${namaHari(PJD.form.tanggal_kembali)}`;
  } else {
    el.style.display = 'none';
  }
}

function updateTarifPreview() {
  const el = document.getElementById('tarif-preview');
  if (!el) return;
  const jenis = PJD.form.jenis_perjalanan || 'dalam_kota';
  const h = getTarifHarian(jenis);
  el.textContent = h > 0 ? formatRupiah(h) + ' / orang / hari' : 'Tarif belum diisi di Data Master';
  el.style.color = h > 0 ? 'var(--navy)' : 'var(--red)';
}

function updateTujuanField() {
  enforceTransportRuleForJenis();
  const jenis = PJD.form.jenis_perjalanan;
  const kecs  = DB.getArr('sppd_kecamatan');
  const kotas = DB.getArr('sppd_kota_tujuan');
  const label = document.getElementById('tujuan-label');
  const field = document.getElementById('tujuan-field');
  if (!field) return;
  if (jenis === 'dalam_kota') {
    if (label) label.textContent = 'Kecamatan Tujuan *';
    field.innerHTML = `<select class="form-control" id="f-kecamatan" onchange="PJD.form.kecamatan_id=this.value">
      <option value="">— Pilih Kecamatan —</option>
      ${kecs.map(k => `<option value="${k.id}" ${PJD.form.kecamatan_id===k.id?'selected':''}>${k.nama} ${k.tarif_transport>0?'('+formatRupiah(k.tarif_transport)+')':''}</option>`).join('')}
    </select>
    <input class="form-control" id="f-nama-tempat" style="margin-top:8px" value="${PJD.form.nama_tempat||''}"
      placeholder="Nama tempat (opsional): Kantor Kecamatan Kemang"
      oninput="PJD.form.nama_tempat=this.value">
    <div class="form-text">Isi jika ingin nama tempat spesifik muncul di dokumen, bukan cuma nama kecamatan.</div>`;
    PJD.form.alamat_tujuan = '';
    PJD.form.kota_tujuan_id = '';
  } else {
    if (label) label.textContent = 'Alamat Tujuan *';
    field.innerHTML = `<select class="form-control" id="f-kota-tujuan" style="margin-bottom:8px" onchange="onKotaTujuanChange(this.value)">
      <option value="">— Pilih Kota Besar (opsional, isi saran tarif transport) —</option>
      ${kotas.map(k => `<option value="${k.id}" ${PJD.form.kota_tujuan_id===k.id?'selected':''}>${k.nama} ${k.tarif_transport>0?'('+formatRupiah(k.tarif_transport)+')':''}</option>`).join('')}
    </select>
    <input class="form-control" id="f-alamat" value="${PJD.form.alamat_tujuan||''}"
      placeholder="Jl. Medan Merdeka Barat No.17, Jakarta..." oninput="PJD.form.alamat_tujuan=this.value">`;
    PJD.form.kecamatan_id = '';
  }
}

// Waktu user pilih kota besar preset (luar_kota/luar_provinsi): kalau alamat
// tujuan masih kosong, autofill nama kotanya biar nggak perlu ngetik ulang.
// Saran tarif transport per kota dipakai di Step 2 (lihat renderPesertaItem).
function onKotaTujuanChange(kotaId) {
  PJD.form.kota_tujuan_id = kotaId;
  const kota = getKotaById(kotaId);
  const alamatInput = document.getElementById('f-alamat');
  if (kota && alamatInput && !alamatInput.value.trim()) {
    alamatInput.value = kota.nama;
    PJD.form.alamat_tujuan = kota.nama;
  }
}

// ─────────────────────────────────────────────────────────
// STEP 2 — Peserta
// ─────────────────────────────────────────────────────────
function renderStep2(body) {
  const allPegawai = DB.getArr('sppd_pegawai')
    .sort((a,b) => golonganToNum(b.golongan) - golonganToNum(a.golongan));

  if (allPegawai.length === 0) {
    body.innerHTML = `
      <div class="empty-state" style="padding:60px 24px">
        <div class="empty-state-icon">👤</div>
        <div class="empty-state-title">Belum ada data pegawai</div>
        <div class="empty-state-desc" style="margin-bottom:16px">Tambahkan pegawai di Data Master terlebih dahulu</div>
        <button class="btn btn-primary" onclick="navigateTo('master')">🗄️ Ke Data Master</button>
      </div>`;
    return;
  }

  body.innerHTML = `
    <div class="grid-2" style="align-items:start;gap:20px">
      <div>
        <div class="card">
          <div class="card-header">
            <div class="card-icon" style="background:#E8F5E9">👥</div>
            <div><h3>Pilih Peserta</h3><p>Centang pegawai yang ikut perjalanan dinas</p></div>
          </div>
          <div class="card-body" style="padding:14px">
            ${allPegawai.map(p => renderPesertaItem(p)).join('')}
          </div>
        </div>
      </div>
      <div>
        <div class="calc-panel" id="calc-panel">
          <div class="calc-panel-title">💰 Kalkulasi Realtime</div>
          <div id="calc-content"><div style="opacity:.5;font-size:13px">Pilih peserta untuk melihat kalkulasi</div></div>
        </div>
        <div class="alert alert-info">
          💡 <strong>Transport:</strong> Nominal × Jumlah Kali × ${getLamaPerjalanan() || '?'} Hari<br>
          ${(PJD.form.jenis_perjalanan || 'dalam_kota') === 'dalam_kota'
            ? 'Hanya <strong>satu peserta</strong> yang dapat biaya transport (dalam kota).'
            : 'Untuk luar daerah/provinsi, <strong>setiap peserta</strong> boleh diisi transport masing-masing.'}
        </div>
      </div>
    </div>`;

  updateCalcPanel();
}

function renderPesertaItem(pgw) {
  const existing = PJD.form.peserta.find(p => p.pegawai_id === pgw.id);
  const isSelected = !!existing;
  const hasTrans   = existing?.dapat_transport || false;

  const suggestTransport = getSuggestTransport();

  return `
    <div class="peserta-item ${isSelected ? (hasTrans ? 'has-transport' : 'selected') : ''}"
         id="pitem-${pgw.id}">
      <div class="peserta-header" onclick="togglePeserta('${pgw.id}')">
        <input type="checkbox" class="peserta-check" id="pchk-${pgw.id}"
          ${isSelected ? 'checked' : ''} onclick="event.stopPropagation();togglePeserta('${pgw.id}')">
        <div class="peserta-info">
          <div class="peserta-name">${pgw.nama_lengkap}</div>
          <div class="peserta-meta">${pgw.pangkat||''} ${pgw.golongan ? '/ '+pgw.golongan : ''} · ${pgw.jabatan||'—'}</div>
        </div>
        <div class="peserta-total" id="ptotal-${pgw.id}">
          ${isSelected ? formatRupiah(calcPeserta(existing).total) : ''}
        </div>
      </div>

      <div class="peserta-transport" id="ptrans-${pgw.id}" ${isSelected ? '' : 'style="display:none"'}>
        <div class="transport-toggle">
          <input type="checkbox" id="ptrans-chk-${pgw.id}"
            ${hasTrans ? 'checked' : ''}
            onchange="toggleTransport('${pgw.id}', this.checked)"
            style="width:16px;height:16px;cursor:pointer;accent-color:var(--success)">
          <label for="ptrans-chk-${pgw.id}" style="cursor:pointer;font-weight:600">
            🚗 Dapat biaya transport?
          </label>
          ${suggestTransport > 0 ? `<span class="badge badge-auto" style="margin-left:auto">Saran: ${formatRupiah(suggestTransport)}</span>` : ''}
        </div>
        <div id="ptrans-inputs-${pgw.id}" ${hasTrans ? '' : 'style="display:none"'}>
          <div class="transport-inputs">
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Nominal per Kali (Rp)</label>
              <input type="number" class="form-control" id="pnom-${pgw.id}"
                value="${existing?.nominal_transport || suggestTransport || ''}"
                min="0" step="1000" placeholder="0"
                oninput="updatePesertaTransport('${pgw.id}')">
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Jumlah Kali</label>
              <input type="number" class="form-control" id="pkali-${pgw.id}"
                value="${existing?.jumlah_kali || 1}"
                min="1" max="99" placeholder="1"
                oninput="updatePesertaTransport('${pgw.id}')">
            </div>
          </div>
          <div class="text-sm text-muted" style="margin-top:6px" id="ptrans-formula-${pgw.id}">
            ${existing?.dapat_transport ? calcTransportFormula(existing) : ''}
          </div>
        </div>
      </div>
    </div>`;
}

function calcTransportFormula(p) {
  const nom  = parseInt(p.nominal_transport) || 0;
  const kali = parseInt(p.jumlah_kali) || 1;
  const lama = getLamaPerjalanan() || 1;
  const total = nom * kali * lama;
  return `${formatRupiah(nom)} × ${kali} kali × ${lama} hari = <strong>${formatRupiah(total)}</strong>`;
}

function togglePeserta(pegawaiId) {
  const chk = document.getElementById('pchk-' + pegawaiId);
  const item = document.getElementById('pitem-' + pegawaiId);
  const transDiv = document.getElementById('ptrans-' + pegawaiId);
  const existing = PJD.form.peserta.findIndex(p => p.pegawai_id === pegawaiId);

  if (existing >= 0) {
    // Remove
    PJD.form.peserta.splice(existing, 1);
    item.classList.remove('selected', 'has-transport');
    if (transDiv) transDiv.style.display = 'none';
    if (chk) chk.checked = false;
    document.getElementById('ptotal-' + pegawaiId).textContent = '';
  } else {
    // Add
    PJD.form.peserta.push({
      pegawai_id: pegawaiId,
      dapat_transport: false,
      nominal_transport: 0,
      jumlah_kali: 1,
    });
    item.classList.add('selected');
    if (transDiv) transDiv.style.display = 'block';
    if (chk) chk.checked = true;
    refreshPesertaTotal(pegawaiId);
  }
  updateCalcPanel();
}

// Kalau jenis perjalanan diganti balik ke dalam_kota, dan sebelumnya (waktu masih
// luar_kota/luar_provinsi) lebih dari 1 peserta sudah dicentang dapat transport,
// sisain cuma peserta pertama biar sesuai aturan "1 peserta" untuk dalam kota.
function enforceTransportRuleForJenis() {
  const isDalamKota = (PJD.form.jenis_perjalanan || 'dalam_kota') === 'dalam_kota';
  if (!isDalamKota) return;
  const withTransport = PJD.form.peserta.filter(p => p.dapat_transport);
  if (withTransport.length > 1) {
    withTransport.slice(1).forEach(p => { p.dapat_transport = false; });
    toast('Jenis perjalanan diubah ke dalam kota: transport disisakan untuk 1 peserta saja', 'warning');
  }
}

function toggleTransport(pegawaiId, checked) {
  // Hanya dibatasi 1 peserta untuk perjalanan dalam kota (asumsi 1 kendaraan dinas).
  // Luar daerah/provinsi: tiap peserta boleh dapat transport sendiri-sendiri (tiket masing-masing).
  const isDalamKota = (PJD.form.jenis_perjalanan || 'dalam_kota') === 'dalam_kota';
  if (checked && isDalamKota) {
    const already = PJD.form.peserta.find(p => p.dapat_transport && p.pegawai_id !== pegawaiId);
    if (already) {
      toast('Hanya satu peserta yang dapat biaya transport untuk perjalanan dalam kota', 'warning');
      document.getElementById('ptrans-chk-' + pegawaiId).checked = false;
      return;
    }
  }
  const p = PJD.form.peserta.find(x => x.pegawai_id === pegawaiId);
  if (p) p.dapat_transport = checked;

  const inputs = document.getElementById('ptrans-inputs-' + pegawaiId);
  if (inputs) inputs.style.display = checked ? 'block' : 'none';

  const item = document.getElementById('pitem-' + pegawaiId);
  if (item) {
    item.classList.toggle('has-transport', checked);
    item.classList.toggle('selected', !checked);
  }

  if (checked) {
    const suggest = getSuggestTransport();
    const nomInput = document.getElementById('pnom-' + pegawaiId);
    if (nomInput && !nomInput.value && suggest) {
      nomInput.value = suggest;
      if (p) p.nominal_transport = suggest;
    }
  }

  refreshPesertaTotal(pegawaiId);
  updateCalcPanel();
}

function updatePesertaTransport(pegawaiId) {
  const p = PJD.form.peserta.find(x => x.pegawai_id === pegawaiId);
  if (!p) return;
  p.nominal_transport = parseInt(document.getElementById('pnom-' + pegawaiId)?.value) || 0;
  p.jumlah_kali       = parseInt(document.getElementById('pkali-' + pegawaiId)?.value) || 1;
  const formulaEl = document.getElementById('ptrans-formula-' + pegawaiId);
  if (formulaEl) formulaEl.innerHTML = calcTransportFormula(p);
  refreshPesertaTotal(pegawaiId);
  updateCalcPanel();
}

function refreshPesertaTotal(pegawaiId) {
  const p  = PJD.form.peserta.find(x => x.pegawai_id === pegawaiId);
  const el = document.getElementById('ptotal-' + pegawaiId);
  if (el && p) el.textContent = formatRupiah(calcPeserta(p).total);
}

function updateCalcPanel() {
  const el = document.getElementById('calc-content');
  if (!el) return;
  if (PJD.form.peserta.length === 0) {
    el.innerHTML = '<div style="opacity:.5;font-size:13px">Pilih peserta untuk melihat kalkulasi</div>';
    return;
  }
  const lama = getLamaPerjalanan() || 1;
  let rows = '';
  let grand = 0;
  PJD.form.peserta.forEach(p => {
    const pgw = getPegawaiById(p.pegawai_id);
    const cp  = calcPeserta(p);
    grand += cp.total;
    const nama = pgw ? pgw.nama_lengkap.split(',')[0] : '?';
    rows += `<div class="calc-row">
      <span>${nama} ${p.dapat_transport ? '🚗' : ''}</span>
      <span>${formatRupiah(cp.total)}</span>
    </div>`;
  });
  el.innerHTML = `
    ${rows}
    <div class="calc-row total">
      <span>Grand Total (${PJD.form.peserta.length} orang × ${lama} hari)</span>
      <span>${formatRupiah(grand)}</span>
    </div>
    <div class="calc-terbilang">${terbilang(grand)}</div>`;
}

// ─────────────────────────────────────────────────────────
// STEP 3 — Isian Dokumen
// ─────────────────────────────────────────────────────────
function renderStep3(body) {
  const f      = PJD.form;
  const pegawai = DB.getArr('sppd_pegawai')
    .sort((a,b) => golonganToNum(b.golongan) - golonganToNum(a.golongan));

  body.innerHTML = `
    <div class="grid-2" style="align-items:start;gap:20px">
      <div>
        <div class="card mb-4">
          <div class="card-header">
            <div class="card-icon" style="background:#EBF3FD">📋</div>
            <div><h3>Untuk SPPD</h3><p>Item 4 pada dokumen SPPD</p></div>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Maksud Perjalanan Dinas</label>
              <textarea class="form-control" id="f-maksud" rows="4"
                placeholder="Kegiatan Survei Pembuatan Kujang dalam Rangka Persiapan Pengadaan Suvenir/Cendera Mata Kantor"
                oninput="PJD.form.maksud_perjalanan=this.value">${f.maksud_perjalanan||''}</textarea>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">PPTK <span class="text-muted">(Penandatangan Pergerakan SPPD)</span></label>
              <select class="form-control" id="f-pptk" onchange="PJD.form.pptk_id=this.value">
                <option value="">— Pilih PPTK —</option>
                ${pegawai.map(p => `<option value="${p.id}" ${f.pptk_id===p.id?'selected':''}>${p.nama_lengkap} (${p.golongan||'—'})</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="card">
          <div class="card-header">
            <div class="card-icon" style="background:#FFF3E0">📝</div>
            <div><h3>Untuk Surat Tugas</h3><p>Bagian dasar dan isi perintah</p></div>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Dasar Penugasan</label>
              <textarea class="form-control" id="f-dasar" rows="3"
                placeholder="Dalam rangka pelaksanaan program kerja Dinas Kebudayaan dan Pariwisata Kabupaten Bogor..."
                oninput="PJD.form.dasar=this.value">${f.dasar||''}</textarea>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">Deskripsi Tugas / Untuk</label>
              <textarea class="form-control" id="f-tugas" rows="4"
                placeholder="Koordinasi Perencanaan Pengembangan Pariwisata ke Dinas Pariwisata dan Kebudayaan Prov Jawa Barat..."
                oninput="PJD.form.deskripsi_tugas=this.value">${f.deskripsi_tugas||''}</textarea>
              <div class="form-text">Tanggal dan hari akan di-generate otomatis dari tanggal perjalanan</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────
// STEP 4 — Ringkasan & Simpan
// ─────────────────────────────────────────────────────────
function renderStep4(body) {
  const f      = PJD.form;
  const lama   = getLamaPerjalanan();
  const tujuan = f.jenis_perjalanan === 'dalam_kota'
    ? (f.nama_tempat || (getKecById(f.kecamatan_id)?.nama ? 'Kecamatan ' + getKecById(f.kecamatan_id).nama : '—'))
    : (f.alamat_tujuan || '—');

  const sipdText = (() => {
    if (f.kode_sipd_manual) return f.kode_sipd_manual;
    const s = getSipdById(f.kode_sipd_id);
    return s ? `${s.kode} — ${s.sub_kegiatan||s.nama_singkat}` : '—';
  })();

  const pptk = getPegawaiById(f.pptk_id);

  // Peserta rows
  let pesertaRows = '';
  let grand = 0;
  const sorted = [...f.peserta].sort((a,b) => {
    const pa = getPegawaiById(a.pegawai_id), pb = getPegawaiById(b.pegawai_id);
    return golonganToNum(pb?.golongan) - golonganToNum(pa?.golongan);
  });

  sorted.forEach((p, i) => {
    const pgw = getPegawaiById(p.pegawai_id);
    const cp  = calcPeserta(p);
    grand += cp.total;
    const nom = parseInt(p.nominal_transport)||0;
    const kali= parseInt(p.jumlah_kali)||1;
    pesertaRows += `
      <tr>
        <td>${i+1}</td>
        <td><strong>${pgw?.nama_lengkap||'?'}</strong><br><span class="text-muted text-sm">${pgw?.pangkat||''} ${pgw?.golongan?'/ '+pgw.golongan:''}</span></td>
        <td>${formatRupiah(cp.uang_harian)} × ${lama} hari<br><strong>${formatRupiah(cp.total_uang_harian)}</strong></td>
        <td>${p.dapat_transport
          ? `${formatRupiah(nom)} × ${kali} kali × ${lama} hari<br><strong>${formatRupiah(cp.total_transport)}</strong>`
          : '<span class="text-muted">—</span>'}</td>
        <td><strong style="color:var(--navy)">${formatRupiah(cp.total)}</strong></td>
        <td><span class="tbl-mono text-sm">${pgw?.nomor_rekening||'—'}</span></td>
      </tr>`;
  });

  body.innerHTML = `
    <div class="ringkasan-section">
      <div class="ringkasan-section-title">📋 Data Perjalanan</div>
      <div class="ringkasan-row"><div class="ringkasan-label">Nomor Surat</div><div class="ringkasan-value">${f.nomor_surat||'—'}</div></div>
      <div class="ringkasan-row"><div class="ringkasan-label">Tanggal Surat</div><div class="ringkasan-value">${f.tanggal_surat ? formatTanggal(f.tanggal_surat) : '—'}</div></div>
      <div class="ringkasan-row"><div class="ringkasan-label">Tanggal Berangkat</div><div class="ringkasan-value">${f.tanggal_berangkat ? formatTanggal(f.tanggal_berangkat)+' ('+namaHari(f.tanggal_berangkat)+')' : '—'}</div></div>
      <div class="ringkasan-row"><div class="ringkasan-label">Tanggal Kembali</div><div class="ringkasan-value">${f.tanggal_kembali ? formatTanggal(f.tanggal_kembali)+' ('+namaHari(f.tanggal_kembali)+')' : '—'}</div></div>
      <div class="ringkasan-row"><div class="ringkasan-label">Lama Perjalanan</div><div class="ringkasan-value">${lama > 0 ? terbilangHari(lama) : '—'}</div></div>
      <div class="ringkasan-row"><div class="ringkasan-label">Jenis Perjalanan</div><div class="ringkasan-value">${getTingkatBiaya(f.jenis_perjalanan)}</div></div>
      <div class="ringkasan-row"><div class="ringkasan-label">Tujuan</div><div class="ringkasan-value">${tujuan}</div></div>
      <div class="ringkasan-row"><div class="ringkasan-label">Alat Angkutan</div><div class="ringkasan-value">${f.alat_angkutan||'—'}</div></div>
      <div class="ringkasan-row"><div class="ringkasan-label">Kode Rekening SIPD</div><div class="ringkasan-value"><span class="tbl-mono">${sipdText}</span></div></div>
    </div>

    <div class="ringkasan-section">
      <div class="ringkasan-section-title">📝 Isian Dokumen</div>
      <div class="ringkasan-row"><div class="ringkasan-label">Maksud Perjalanan</div><div class="ringkasan-value">${f.maksud_perjalanan||'—'}</div></div>
      <div class="ringkasan-row"><div class="ringkasan-label">PPTK</div><div class="ringkasan-value">${pptk ? pptk.nama_lengkap : '—'}</div></div>
      <div class="ringkasan-row"><div class="ringkasan-label">Dasar Penugasan</div><div class="ringkasan-value">${f.dasar ? f.dasar.substring(0,100)+'...' : '—'}</div></div>
      <div class="ringkasan-row"><div class="ringkasan-label">Deskripsi Tugas</div><div class="ringkasan-value">${f.deskripsi_tugas ? f.deskripsi_tugas.substring(0,100)+'...' : '—'}</div></div>
    </div>

    <div class="ringkasan-section">
      <div class="ringkasan-section-title">💰 Kalkulasi Biaya</div>
      <div class="card-body" style="padding:0">
        <div class="table-wrap"><table>
          <thead><tr>
            <th width="30">No</th><th>Peserta</th>
            <th>Uang Harian</th><th>Transport</th>
            <th>Total</th><th>No. Rekening</th>
          </tr></thead>
          <tbody>${pesertaRows}</tbody>
          <tfoot>
            <tr style="background:var(--navy-dark);color:white">
              <td colspan="4" style="font-weight:700;padding:12px 14px">Grand Total</td>
              <td style="font-weight:800;font-size:15px;padding:12px 14px">${formatRupiah(grand)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table></div>
        <div style="padding:12px 16px;font-style:italic;color:var(--text-3);font-size:12px;border-top:1px solid var(--border)">
          Terbilang: <strong style="color:var(--text-2)">${terbilang(grand)}</strong>
        </div>
      </div>
    </div>

    <div class="flex gap-3 items-center" style="margin-top:4px">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">
        <input type="checkbox" id="f-final" ${f.status==='final'?'checked':''}
          onchange="PJD.form.status=this.checked?'final':'draft'"
          style="width:16px;height:16px;accent-color:var(--success)">
        <span>Tandai sebagai <strong>Final</strong> (siap untuk generate dokumen)</span>
      </label>
    </div>`;
}

// ─── WIZARD NAVIGATION ────────────────────────────────────
function wizardNext() {
  if (!validateStep(PJD.currentStep)) return;
  if (PJD.currentStep === PJD.totalSteps) {
    savePerjalanan();
    return;
  }
  PJD.currentStep++;
  renderWizard();
}

function wizardPrev() {
  if (PJD.currentStep <= 1) return;
  PJD.currentStep--;
  renderWizard();
}

// ─── VALIDATION ───────────────────────────────────────────
function validateStep(n) {
  const f = PJD.form;
  if (n === 1) {
    if (!f.nomor_surat) return toast('Nomor surat wajib diisi', 'error'), false;
    if (!f.tanggal_surat) return toast('Tanggal surat wajib diisi', 'error'), false;
    if (!f.tanggal_berangkat) return toast('Tanggal berangkat wajib diisi', 'error'), false;
    if (!f.tanggal_kembali) return toast('Tanggal kembali wajib diisi', 'error'), false;
    if (new Date(f.tanggal_kembali) < new Date(f.tanggal_berangkat))
      return toast('Tanggal kembali tidak boleh sebelum tanggal berangkat', 'error'), false;
    if (f.jenis_perjalanan === 'dalam_kota' && !f.kecamatan_id)
      return toast('Kecamatan tujuan wajib dipilih', 'error'), false;
    if (f.jenis_perjalanan !== 'dalam_kota' && !f.alamat_tujuan)
      return toast('Alamat tujuan wajib diisi', 'error'), false;
  }
  if (n === 2) {
    if (f.peserta.length === 0)
      return toast('Pilih minimal satu peserta', 'error'), false;
  }
  return true;
}

// ─── SAVE ─────────────────────────────────────────────────
function savePerjalanan() {
  const list = getPJDList();
  const id   = PJD.editId || ('pjd_' + Date.now());
  PJD.form.id = id;
  PJD.form.updated_at = new Date().toISOString();

  const idx = list.findIndex(x => x.id === id);
  if (idx >= 0) list[idx] = PJD.form;
  else list.push(PJD.form);
  savePJDList(list);

  const label = PJD.form.status === 'final' ? 'final' : 'draft';
  toast(`Perjalanan dinas disimpan sebagai ${label}`, 'success');
  PJD.reset();
  renderPerjalananList();
}
