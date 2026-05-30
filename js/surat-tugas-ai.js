/**
 * surat-tugas-ai.js — Modul Surat Tugas dengan AI (Gemini)
 *
 * ISOLATED — tidak mengubah modul lain.
 * Hanya membaca: DB, AppState, KEYS, terbilang helpers (sudah di-load sebelumnya)
 * Menulis ke   : DB key 'sppd_surat_tugas_ai' (key baru, tidak konflik)
 *
 * Perubahan minimal di file lain:
 *   index.html → +1 nav item, +1 script tag
 *   pages.js   → +3 baris
 */

// ─── STATE ────────────────────────────────────────────────
const STAI = {
  currentTab : 'ai',
  isGenerating: false,
  editId     : null,
  form: {
    nomor_surat      : '',
    tanggal_surat    : '',
    tanggal_mulai    : '',
    tanggal_selesai  : '',
    keperluan        : '',
    tujuan_instansi  : '',
    peserta_ids      : [],   // array of pegawai id
    mode             : 'baru',
    teks_existing    : '',
    dasar            : '',
    deskripsi_tugas  : '',
    template_id      : '',
  },
};

const KEY_STAI = 'sppd_surat_tugas_ai';

// ─── DB HELPERS (pakai DB yang sudah ada) ─────────────────
const getSTAIList  = ()    => DB.getArr(KEY_STAI);
const saveSTAIList = (arr) => DB.set   ? DB.set(KEY_STAI, arr) : localStorage.setItem(KEY_STAI, JSON.stringify(arr));

// ─── RENDER ENTRY POINT ───────────────────────────────────
function renderSuratTugasAI() {
  const c = document.getElementById('st-ai-container');
  if (!c) return;

  c.innerHTML = `
    <div class="tabs" id="stai-tabs">
      <button class="tab-btn active" onclick="staiSwitchTab('ai', this)">🤖 Draft dengan AI</button>
      <button class="tab-btn"        onclick="staiSwitchTab('manual', this)">✏️ Tulis Manual</button>
      <button class="tab-btn"        onclick="staiSwitchTab('riwayat', this)">📋 Riwayat</button>
    </div>
    <div id="stai-tab-ai"      class="stai-pane active"></div>
    <div id="stai-tab-manual"  class="stai-pane"></div>
    <div id="stai-tab-riwayat" class="stai-pane"></div>`;

  staiRenderTab('ai');
}

function staiSwitchTab(tab, btn) {
  document.querySelectorAll('#stai-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.stai-pane').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const pane = document.getElementById('stai-tab-' + tab);
  if (pane) pane.classList.add('active');
  STAI.currentTab = tab;
  staiRenderTab(tab);
}

function staiRenderTab(tab) {
  const pane = document.getElementById('stai-tab-' + tab);
  if (!pane) return;
  if (tab === 'ai')      staiRenderAI(pane);
  if (tab === 'manual')  staiRenderManual(pane);
  if (tab === 'riwayat') staiRenderRiwayat(pane);
}

// ══════════════════════════════════════════════════════════
// TAB 1 — DRAFT AI
// ══════════════════════════════════════════════════════════
function staiRenderAI(pane) {
  const pegawaiList = DB.getArr(KEYS.pegawai)
    .sort((a,b) => golonganToNum(b.golongan) - golonganToNum(a.golongan));

  const f = STAI.form;

  pane.innerHTML = `
    <div class="grid-2" style="align-items:start;gap:20px">

      <!-- ── PANEL KIRI: Form Input ── -->
      <div>
        <div class="card mb-4">
          <div class="card-header">
            <div class="card-icon" style="background:#E8F0FE">🤖</div>
            <div><h3>Input untuk AI</h3><p>Isi ringkas, Gemini akan formalkan</p></div>
          </div>
          <div class="card-body">

            <div class="form-group">
              <label class="form-label">Mode Generate</label>
              <div style="display:flex;gap:10px">
                <label class="stai-radio ${f.mode==='baru'?'active':''}">
                  <input type="radio" name="stai-mode" value="baru"
                    ${f.mode==='baru'?'checked':''}
                    onchange="STAI.form.mode='baru';staiToggleExisting()">
                  ✨ Buat dari Awal
                </label>
                <label class="stai-radio ${f.mode==='perbaiki'?'active':''}">
                  <input type="radio" name="stai-mode" value="perbaiki"
                    ${f.mode==='perbaiki'?'checked':''}
                    onchange="STAI.form.mode='perbaiki';staiToggleExisting()">
                  🔧 Perbaiki Teks
                </label>
              </div>
            </div>

            <div class="form-group" id="stai-existing-wrap"
              style="display:${f.mode==='perbaiki'?'block':'none'}">
              <label class="form-label">Teks yang Ingin Diperbaiki</label>
              <textarea class="form-control" id="stai-teks-existing" rows="4"
                placeholder="Paste teks dasar / deskripsi tugas yang sudah ada..."
                oninput="STAI.form.teks_existing=this.value">${f.teks_existing||''}</textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Keperluan / Kegiatan *</label>
              <input class="form-control" id="stai-keperluan"
                value="${f.keperluan||''}"
                placeholder="cth: Koordinasi pengembangan pariwisata"
                oninput="STAI.form.keperluan=this.value">
              <div class="form-text">Tulis singkat — AI yang akan formalkan</div>
            </div>

            <div class="form-group">
              <label class="form-label">Tujuan / Instansi yang Dikunjungi</label>
              <input class="form-control" id="stai-tujuan"
                value="${f.tujuan_instansi||''}"
                placeholder="cth: Dinas Pariwisata Prov. Jawa Barat, Bandung"
                oninput="STAI.form.tujuan_instansi=this.value">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Tanggal Mulai</label>
                <input type="date" class="form-control" id="stai-tgl-mulai"
                  value="${f.tanggal_mulai||''}"
                  onchange="STAI.form.tanggal_mulai=this.value">
              </div>
              <div class="form-group">
                <label class="form-label">Tanggal Selesai</label>
                <input type="date" class="form-control" id="stai-tgl-selesai"
                  value="${f.tanggal_selesai||''}"
                  onchange="STAI.form.tanggal_selesai=this.value">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Peserta yang Ditugaskan</label>
              <div class="stai-peserta-list" id="stai-peserta-list">
                ${pegawaiList.length === 0
                  ? '<div class="text-muted text-sm">Belum ada data pegawai. <a href="#" onclick="navigateTo(\'master\');return false">Tambah di Data Master →</a></div>'
                  : pegawaiList.map(p => `
                    <label class="stai-peserta-item ${f.peserta_ids.includes(p.id)?'selected':''}">
                      <input type="checkbox" value="${p.id}"
                        ${f.peserta_ids.includes(p.id)?'checked':''}
                        onchange="staiTogglePeserta('${p.id}', this.checked)">
                      <div>
                        <div style="font-weight:600;font-size:13px">${p.nama_lengkap}</div>
                        <div class="text-muted text-sm">${p.jabatan||''} ${p.golongan?'· '+p.golongan:''}</div>
                      </div>
                    </label>`).join('')}
              </div>
            </div>

            <button class="btn btn-primary" style="width:100%;justify-content:center"
              id="stai-btn-generate" onclick="staiGenerate()">
              ⚡ Generate dengan Gemini
            </button>
            <div id="stai-gen-status" style="margin-top:8px"></div>
          </div>
        </div>
      </div>

      <!-- ── PANEL KANAN: Output AI ── -->
      <div>
        <div class="card mb-4" id="stai-output-card">
          <div class="card-header">
            <div class="card-icon" style="background:#E8F5E9">✍️</div>
            <div><h3>Hasil Draft AI</h3><p>Review & edit sebelum disimpan</p></div>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Dasar Penugasan</label>
              <textarea class="form-control" id="stai-out-dasar" rows="4"
                placeholder="Klik 'Generate dengan Gemini' untuk mengisi..."
                oninput="STAI.form.dasar=this.value">${f.dasar||''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Deskripsi / Isi Perintah Tugas</label>
              <textarea class="form-control" id="stai-out-deskripsi" rows="6"
                placeholder="Hasil Gemini akan muncul di sini..."
                oninput="STAI.form.deskripsi_tugas=this.value">${f.deskripsi_tugas||''}</textarea>
            </div>
            ${f.dasar ? `
            <div class="flex gap-2 justify-end">
              <button class="btn btn-secondary btn-sm" onclick="staiGenerate()">🔄 Generate Ulang</button>
              <button class="btn btn-ghost btn-sm" onclick="staiClearOutput()">✕ Hapus Hasil</button>
            </div>` : ''}
          </div>
        </div>

        <!-- Bottom: Data Surat + Generate DOCX -->
        ${staiBottomFormHTML(f)}
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════
// TAB 2 — MANUAL
// ══════════════════════════════════════════════════════════
function staiRenderManual(pane) {
  const f = STAI.form;
  pane.innerHTML = `
    <div class="card mb-4">
      <div class="card-header">
        <div class="card-icon" style="background:#FFF3E0">✏️</div>
        <div><h3>Tulis Manual</h3><p>Isi langsung tanpa AI</p></div>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Dasar Penugasan</label>
          <textarea class="form-control" id="stai-man-dasar" rows="4"
            placeholder="Dalam rangka pelaksanaan program kerja Dinas..."
            oninput="STAI.form.dasar=this.value">${f.dasar||''}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Deskripsi / Isi Perintah Tugas</label>
          <textarea class="form-control" id="stai-man-deskripsi" rows="6"
            placeholder="Koordinasi Perencanaan Pengembangan Pariwisata ke..."
            oninput="STAI.form.deskripsi_tugas=this.value">${f.deskripsi_tugas||''}</textarea>
        </div>
      </div>
    </div>
    ${staiBottomFormHTML(f)}`;
}

// ── Bottom form (sama untuk AI dan Manual) ────────────────
function staiBottomFormHTML(f) {
  const templates = (typeof AppState !== 'undefined' ? AppState.templates : [])
    .filter(t => t.jenis === 'surat_tugas');

  const templOpts = templates.length
    ? templates.map(t => `<option value="${t.id}" ${f.template_id===t.id?'selected':''}>${t.nama}${t.scope==='global'?' 🌐':''}</option>`).join('')
    : '<option value="">— Belum ada template surat_tugas —</option>';

  return `
    <div class="card">
      <div class="card-header">
        <div class="card-icon" style="background:#EBF3FD">📋</div>
        <div><h3>Data Surat & Generate</h3><p>Lengkapi, simpan, atau langsung download</p></div>
      </div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nomor Surat *</label>
            <input class="form-control" id="stai-nomor"
              value="${f.nomor_surat||''}"
              placeholder="800.1.11.1/xxx-Sekretariat"
              oninput="STAI.form.nomor_surat=this.value">
          </div>
          <div class="form-group">
            <label class="form-label">Tanggal Surat *</label>
            <input type="date" class="form-control" id="stai-tgl-surat"
              value="${f.tanggal_surat||f.tanggal_mulai||''}"
              onchange="STAI.form.tanggal_surat=this.value">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Template Dokumen</label>
          <select class="form-control" id="stai-template"
            onchange="STAI.form.template_id=this.value">
            <option value="">— Pilih template surat tugas —</option>
            ${templOpts}
          </select>
          ${templates.length === 0
            ? '<div class="form-text">⚠️ Belum ada template jenis "surat_tugas". <a href="#" onclick="navigateTo(\'template\');return false">Upload di Kelola Template →</a></div>'
            : ''}
        </div>
        <div class="flex gap-2" style="margin-top:4px">
          <button class="btn btn-secondary" style="flex:1;justify-content:center"
            onclick="staiSimpan()">
            💾 Simpan ke Riwayat
          </button>
          <button class="btn btn-primary" style="flex:1;justify-content:center"
            onclick="staiGenerateDocx()">
            📥 Generate & Download .docx
          </button>
        </div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════
// TAB 3 — RIWAYAT
// ══════════════════════════════════════════════════════════
function staiRenderRiwayat(pane) {
  const list = getSTAIList().sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

  pane.innerHTML = `
    <div class="table-toolbar mb-4">
      <div class="table-toolbar-left">
        <h4 style="font-size:14px;font-weight:700">Riwayat Surat Tugas</h4>
        <span class="badge badge-auto">${list.length} surat</span>
      </div>
      <div class="table-toolbar-right">
        <button class="btn btn-primary btn-sm" onclick="staiSwitchTab('ai', document.querySelector('#stai-tabs .tab-btn'))">
          + Buat Baru
        </button>
      </div>
    </div>

    ${list.length === 0 ? `
      <div class="empty-state" style="padding:60px 24px">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">Belum ada riwayat</div>
        <div class="empty-state-desc">Buat surat tugas baru dari tab AI atau Manual</div>
      </div>` : list.map(s => `
      <div class="card mb-4">
        <div class="card-header" style="background:var(--surface-2)">
          <div style="flex:1">
            <div style="font-weight:800;font-size:14px">${s.nomor_surat || '—'}</div>
            <div class="pjd-meta" style="margin-top:4px">
              <span>📅 ${s.tanggal_surat ? formatTanggal(s.tanggal_surat) : '—'}</span>
              <span>📍 ${s.tujuan_instansi || '—'}</span>
              <span>👥 ${(s.peserta_ids||[]).length} peserta</span>
              <span style="color:${s.source==='ai'?'#2980B9':'#666'}">
                ${s.source==='ai'?'🤖 AI':'✏️ Manual'}
              </span>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-secondary btn-sm" onclick="staiEdit('${s.id}')">✏️ Edit</button>
            <button class="btn btn-primary btn-sm" onclick="staiDownloadFromHistory('${s.id}')">📥</button>
            <button class="btn btn-danger btn-sm" onclick="staiHapus('${s.id}')">🗑️</button>
          </div>
        </div>
        <div class="card-body" style="padding:12px 20px">
          <div style="font-size:12px;color:var(--text-2);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Dasar</div>
          <div style="font-size:13px;color:var(--text);line-height:1.6;opacity:.85">
            ${(s.dasar||'—').substring(0,180)}${(s.dasar||'').length>180?'...':''}
          </div>
        </div>
      </div>`).join('')}`;
}

// ══════════════════════════════════════════════════════════
// AI GENERATE
// ══════════════════════════════════════════════════════════
async function staiGenerate() {
  const f = STAI.form;
  if (!f.keperluan.trim()) return toast('Keperluan wajib diisi', 'error');
  if (STAI.isGenerating) return;

  STAI.isGenerating = true;
  const btn = document.getElementById('stai-btn-generate');
  const status = document.getElementById('stai-gen-status');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Menghubungi Gemini...'; }
  if (status) status.innerHTML = '<div class="alert alert-info">🤖 Gemini sedang menyusun draft surat...</div>';

  // Build peserta data untuk prompt
  const pegawaiAll = DB.getArr(KEYS.pegawai);
  const pesertaData = f.peserta_ids.map(id => {
    const p = pegawaiAll.find(x => x.id === id);
    return p ? { nama: p.nama_lengkap, jabatan: p.jabatan, golongan: p.golongan } : null;
  }).filter(Boolean);

  const tanggalStr = f.tanggal_mulai
    ? formatHariTanggalTugas(f.tanggal_mulai, f.tanggal_selesai || f.tanggal_mulai)
    : '';

  try {
    const res = await fetch('/api/gemini', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        mode            : f.mode,
        keperluan       : f.keperluan,
        tujuan_instansi : f.tujuan_instansi,
        peserta         : pesertaData,
        tanggal         : tanggalStr,
        teks_existing   : f.teks_existing,
      }),
    });

    const data = await res.json().catch(() => ({
      error: 'Server mengembalikan respons yang tidak bisa dibaca',
    }));

    if (!res.ok || data.error) {
      throw new Error(data.error || 'Gagal menghubungi server');
    }

    // Isi hasil ke form state
    STAI.form.dasar           = data.dasar;
    STAI.form.deskripsi_tugas = data.deskripsi_tugas;

    // Update textarea langsung
    const dasarEl = document.getElementById('stai-out-dasar');
    const deskEl  = document.getElementById('stai-out-deskripsi');
    if (dasarEl) dasarEl.value = data.dasar;
    if (deskEl)  deskEl.value  = data.deskripsi_tugas;

    if (status) {
      const alertType = data.fallback ? 'alert-warning' : 'alert-success';
      const message = data.fallback
        ? (data.warning || 'Kuota Gemini sedang penuh. Draft sementara dibuat otomatis dan bisa diedit.')
        : '✅ Draft berhasil dibuat. Silakan review dan edit sesuai kebutuhan.';
      status.innerHTML = `<div class="alert ${alertType}">${message}</div>`;
    }
    toast(data.fallback ? 'Draft sementara berhasil dibuat' : 'Draft AI berhasil dibuat', data.fallback ? 'warning' : 'success');

  } catch (err) {
    console.warn(err);
    if (status) status.innerHTML = `<div class="alert alert-warning">⚠️ ${err.message}</div>`;
    toast('Gagal: ' + err.message, 'error');
  } finally {
    STAI.isGenerating = false;
    if (btn) { btn.disabled = false; btn.textContent = '⚡ Generate dengan Gemini'; }
  }
}

function staiClearOutput() {
  STAI.form.dasar = '';
  STAI.form.deskripsi_tugas = '';
  const dasarEl = document.getElementById('stai-out-dasar');
  const deskEl  = document.getElementById('stai-out-deskripsi');
  if (dasarEl) dasarEl.value = '';
  if (deskEl)  deskEl.value  = '';
}

function staiToggleExisting() {
  const wrap = document.getElementById('stai-existing-wrap');
  if (wrap) wrap.style.display = STAI.form.mode === 'perbaiki' ? 'block' : 'none';
  // Update radio label active state
  document.querySelectorAll('.stai-radio').forEach(el => {
    const input = el.querySelector('input[type=radio]');
    el.classList.toggle('active', input?.value === STAI.form.mode);
  });
}

function staiTogglePeserta(id, checked) {
  if (checked) {
    if (!STAI.form.peserta_ids.includes(id)) STAI.form.peserta_ids.push(id);
  } else {
    STAI.form.peserta_ids = STAI.form.peserta_ids.filter(x => x !== id);
  }
  // Update visual
  const label = document.querySelector(`.stai-peserta-item input[value="${id}"]`)?.closest('.stai-peserta-item');
  if (label) label.classList.toggle('selected', checked);
}

// ══════════════════════════════════════════════════════════
// SIMPAN KE RIWAYAT
// ══════════════════════════════════════════════════════════
function staiSimpan() {
  const f = STAI.form;
  if (!f.nomor_surat.trim()) return toast('Nomor surat wajib diisi', 'error');
  if (!f.dasar.trim() && !f.deskripsi_tugas.trim()) return toast('Isi dasar atau deskripsi tugas terlebih dahulu', 'error');

  const list = getSTAIList();
  const id   = STAI.editId || ('stai_' + Date.now());
  const obj  = {
    id,
    ...f,
    source     : STAI.currentTab === 'ai' ? 'ai' : 'manual',
    created_at : STAI.editId
      ? (list.find(x=>x.id===id)?.created_at || new Date().toISOString())
      : new Date().toISOString(),
    updated_at : new Date().toISOString(),
  };

  const idx = list.findIndex(x => x.id === id);
  if (idx >= 0) list[idx] = obj; else list.push(obj);
  saveSTAIList(list);

  STAI.editId = id;
  toast('Surat tugas disimpan ke riwayat', 'success');
}

// ══════════════════════════════════════════════════════════
// GENERATE DOCX
// ══════════════════════════════════════════════════════════
async function staiGenerateDocx() {
  const f = STAI.form;
  if (!f.nomor_surat.trim())    return toast('Nomor surat wajib diisi', 'error');
  if (!f.dasar.trim() && !f.deskripsi_tugas.trim())
    return toast('Isi dasar atau deskripsi tugas terlebih dahulu', 'error');
  if (!f.template_id)           return toast('Pilih template dokumen terlebih dahulu', 'error');

  const tmpl = AppState.templates.find(t => t.id === f.template_id);
  if (!tmpl?.fileData)          return toast('File template tidak tersedia', 'error');

  if (typeof PizZip === 'undefined' || typeof Docxtemplater === 'undefined')
    return toast('Library docxtemplater belum dimuat', 'error');

  try {
    const args  = staiBuildArgs();
    const bytes = atob(tmpl.fileData);
    const buf   = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);

    const piz = new PizZip(buf.buffer);
    const doc = new Docxtemplater(piz, {
      paragraphLoop : true,
      linebreaks    : true,
      nullGetter    : () => '',
    });
    doc.render(args);

    const out  = doc.getZip().generate({ type: 'arraybuffer' });
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const safe = (f.nomor_surat || 'Surat_Tugas').replace(/[^a-zA-Z0-9]/g,'_');
    a.href = url; a.download = `${safe}.docx`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 8000);

    // Auto-simpan ke riwayat
    staiSimpan();
    toast('✅ Dokumen berhasil digenerate!', 'success');

  } catch (err) {
    console.error(err);
    toast('Generate gagal: ' + err.message, 'error');
  }
}

function staiBuildArgs() {
  const f = STAI.form;

  // ── Data Master ──────────────────────────────────────────
  const ukKey  = (typeof KEYS !== 'undefined' && KEYS.unitKerja) ? KEYS.unitKerja : 'sppd_unit_kerja';
  const pgwKey = (typeof KEYS !== 'undefined' && KEYS.pegawai)   ? KEYS.pegawai   : 'sppd_pegawai';
  const uk     = DB.getArr(ukKey)[0] || {};

  // ── Peserta sorted by golongan desc ──────────────────────
  const pegawaiAll = DB.getArr(pgwKey);
  const peserta = f.peserta_ids
    .map(id => pegawaiAll.find(p => p.id === id))
    .filter(Boolean)
    .sort((a, b) => golonganToNum(b.golongan) - golonganToNum(a.golongan));

  // ── Indexed peserta (sesuai panduan: nama_peserta_1 dst) ─
  // Generate 10 slot: kosong string jika tidak ada peserta di posisi itu
  const indexed = {};
  for (let i = 1; i <= 10; i++) {
    const p = peserta[i - 1] || null;
    indexed[`nama_peserta_${i}`]     = p ? p.nama_lengkap || '' : '';
    indexed[`nip_gol_peserta_${i}`]  = p ? [p.nip, p.golongan].filter(Boolean).join(' / ') : '';
    indexed[`jabatan_peserta_${i}`]  = p ? p.jabatan  || '' : '';
    indexed[`pangkat_peserta_${i}`]  = p ? p.pangkat  || '' : '';
    indexed[`golongan_peserta_${i}`] = p ? p.golongan || '' : '';
  }

  // ── Tanggal helpers ───────────────────────────────────────
  const tglSurat   = f.tanggal_surat   || f.tanggal_mulai  || '';
  const tglMulai   = f.tanggal_mulai   || '';
  const tglSelesai = f.tanggal_selesai || tglMulai;
  const lama       = tglMulai ? hitungLama(tglMulai, tglSelesai) : 0;

  // ── kota_tanggal: ikut kota unit kerja (sesuai panduan) ──
  const kotaTanggal = uk.kota
    ? uk.kota + ', ' + formatTanggal(tglSurat)
    : formatTanggal(tglSurat);

  return {
    // ─── Data Perjalanan — Input Manual ───────────────────
    nomor              : f.nomor_surat || '',
    tanggal_surat      : formatTanggal(tglSurat),
    tanggal_berangkat  : formatTanggal(tglMulai),
    tanggal_kembali    : formatTanggal(tglSelesai),
    dasar              : f.dasar            || '',
    deskripsi_tugas    : f.deskripsi_tugas  || '',

    // ─── Computed Arguments ───────────────────────────────
    lama_perjalanan    : lama > 0 ? terbilangHari(lama) : '',
    hari_tanggal_tugas : tglMulai
      ? formatHariTanggalTugas(tglMulai, tglSelesai)
      : '',
    kota_tanggal       : kotaTanggal,

    // ─── Data Unit Kerja & Instansi ───────────────────────
    nama_dinas         : uk.nama              || '',
    alamat_dinas       : uk.alamat            || '',
    kota               : uk.kota              || '',
    skpd               : uk.skpd || uk.nama   || '',
    instansi_pembayar  : uk.instansi_pembayar || 'PEMERINTAH KABUPATEN BOGOR',
    // PPK — untuk kelengkapan template yang mungkin ada field ini
    pejabat_ppk        : uk.pejabat_ppk       || '',
    nama_ppk           : uk.nama_ppk          || '',
    nip_ppk            : uk.nip_ppk           || '',
    // Kepala Dinas — penandatangan Surat Tugas
    nama_kepala        : uk.nama_kepala       || '',
    nip_kepala         : uk.nip_kepala        || '',

    // ─── Tabel Peserta — Surat Tugas ──────────────────────
    jumlah_peserta     : peserta.length,
    ...indexed,
  };
}

// ══════════════════════════════════════════════════════════
// RIWAYAT ACTIONS
// ══════════════════════════════════════════════════════════
function staiEdit(id) {
  const s = getSTAIList().find(x => x.id === id);
  if (!s) return;
  STAI.form   = { ...s };
  STAI.editId = id;
  // Pindah ke tab yang sesuai
  const targetTab = s.source === 'ai' ? 'ai' : 'manual';
  const btns = document.querySelectorAll('#stai-tabs .tab-btn');
  const idx  = ['ai','manual','riwayat'].indexOf(targetTab);
  staiSwitchTab(targetTab, btns[idx]);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast('Data surat dimuat untuk diedit', 'success');
}

async function staiDownloadFromHistory(id) {
  const s = getSTAIList().find(x => x.id === id);
  if (!s) return;
  STAI.form      = { ...s };
  STAI.editId    = id;
  if (!s.template_id) return toast('Template belum dipilih untuk surat ini', 'warning');
  await staiGenerateDocx();
}

function staiHapus(id) {
  const s = getSTAIList().find(x => x.id === id);
  if (!confirm(`Hapus surat "${s?.nomor_surat||'ini'}"?`)) return;
  saveSTAIList(getSTAIList().filter(x => x.id !== id));
  staiRenderRiwayat(document.getElementById('stai-tab-riwayat'));
  toast('Surat dihapus dari riwayat', 'success');
}
