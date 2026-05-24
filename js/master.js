/**
 * master.js — Phase 2: Data Master CRUD
 * Unit Kerja, Pegawai, Tarif, Kecamatan, Kode SIPD
 * Penyimpanan: js/db.js (Supabase + cache, migrasi dari localStorage)
 */

// ─── MODAL HELPERS ────────────────────────────────────────
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'flex';
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'none';
}
function modalHTML(id, title, bodyHtml, footerHtml, large = false) {
  return `
  <div class="modal-overlay" id="${id}" style="display:none" onclick="if(event.target===this)closeModal('${id}')">
    <div class="modal ${large ? 'modal-lg' : ''}">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" onclick="closeModal('${id}')">✕</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-footer">${footerHtml}</div>
    </div>
  </div>`;
}

// ─── TAB NAVIGATION ───────────────────────────────────────
function switchTab(tabId, btnEl) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const pane = document.getElementById('tab-' + tabId);
  if (pane) pane.classList.add('active');
  if (btnEl) btnEl.classList.add('active');
  // Render the tab content
  const renders = {
    'unit-kerja': renderUnitKerja,
    'pegawai':    renderPegawai,
    'tarif':      renderTarif,
    'kecamatan':  renderKecamatan,
    'sipd':       renderSipd,
  };
  if (renders[tabId]) renders[tabId]();
}

// ══════════════════════════════════════════════════════════
// UNIT KERJA
// ══════════════════════════════════════════════════════════
function renderUnitKerja() {
  const list = DB.getArr(KEYS.unitKerja);
  const c = document.getElementById('tab-unit-kerja');
  if (!c) return;

  c.innerHTML = `
    <div class="table-toolbar">
      <div class="table-toolbar-left">
        <h4 style="font-size:14px;font-weight:700">Unit Kerja / Dinas</h4>
        <span class="badge badge-auto">${list.length} data</span>
      </div>
      <div class="table-toolbar-right">
        <button class="btn btn-primary btn-sm" onclick="openUKModal()">+ Tambah Unit Kerja</button>
      </div>
    </div>
    ${list.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">🏛️</div>
        <div class="empty-state-title">Belum ada data unit kerja</div>
        <div class="empty-state-desc">Tambah unit kerja untuk mulai mengisi data perjalanan dinas</div>
      </div>` : list.map(uk => `
      <div class="card mb-4">
        <div class="card-header">
          <div class="card-icon" style="background:#E3F2FD;font-size:20px">🏛️</div>
          <div style="flex:1">
            <h3>${uk.nama}</h3>
            <p style="font-size:11px">${uk.kota} · ${uk.alamat?.substring(0,60)}...</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-secondary btn-sm" onclick="openUKModal('${uk.id}')">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteUK('${uk.id}')">🗑️</button>
          </div>
        </div>
        <div class="card-body" style="padding:14px 20px">
          <div class="grid-3" style="gap:10px;font-size:12px">
            <div><div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">PPK</div><strong>${uk.nama_ppk || '—'}</strong><br><span class="text-muted">${uk.nip_ppk || ''}</span></div>
            <div><div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Kepala Dinas</div><strong>${uk.nama_kepala || '—'}</strong><br><span class="text-muted">${uk.nip_kepala || ''}</span></div>
            <div><div class="text-muted" style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Bendahara</div><strong>${uk.nama_bendahara || '—'}</strong><br><span class="text-muted">${uk.nip_bendahara || ''}</span></div>
          </div>
        </div>
      </div>`).join('')}
    ${ukModal()}`;
}

function ukModal(id) {
  const uk = id ? DB.getArr(KEYS.unitKerja).find(x => x.id === id) : {};
  const v = uk || {};
  return modalHTML('modal-uk', id ? 'Edit Unit Kerja' : 'Tambah Unit Kerja', `
    <div class="form-group"><label class="form-label">Nama Dinas (Singkat) *</label>
      <input class="form-control" id="uk-nama" value="${v.nama||''}" placeholder="Dinas Kebudayaan"></div>
    <div class="form-group"><label class="form-label">Nama Lengkap / SKPD</label>
      <input class="form-control" id="uk-skpd" value="${v.skpd||''}" placeholder="Dinas Kebudayaan dan Pariwisata Kabupaten Bogor"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Kota *</label>
        <input class="form-control" id="uk-kota" value="${v.kota||''}" placeholder="Cibinong"></div>
      <div class="form-group"><label class="form-label">Tempat Kedudukan (SPPD)</label>
        <input class="form-control" id="uk-kedudukan" value="${v.tempat_kedudukan||''}" placeholder="Sukaraja"></div>
    </div>
    <div class="form-group"><label class="form-label">Alamat Lengkap</label>
      <input class="form-control" id="uk-alamat" value="${v.alamat||''}" placeholder="Vivo Mall Lantai 1 Jl. Raya Jakarta - Bogor..."></div>
    <div class="form-group"><label class="form-label">Instansi Pembayar (Kwitansi)</label>
      <input class="form-control" id="uk-instansi" value="${v.instansi_pembayar||'PEMERINTAH KABUPATEN BOGOR'}" placeholder="PEMERINTAH KABUPATEN BOGOR"></div>
    <hr style="margin:16px 0;border-color:var(--border)">
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-3);margin-bottom:12px">PPK — Pejabat Pembuat Komitmen (SPPD)</div>
    <div class="form-group"><label class="form-label">Jabatan PPK</label>
      <input class="form-control" id="uk-pejabat-ppk" value="${v.pejabat_ppk||''}" placeholder="Sekretaris Dinas Kebudayaan"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Nama PPK</label>
        <input class="form-control" id="uk-nama-ppk" value="${v.nama_ppk||''}" placeholder="Dr Ridwan Said, S.STP, M. Si."></div>
      <div class="form-group"><label class="form-label">NIP PPK</label>
        <input class="form-control" id="uk-nip-ppk" value="${v.nip_ppk||''}" placeholder="198209082001121001"></div>
    </div>
    <hr style="margin:16px 0;border-color:var(--border)">
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-3);margin-bottom:12px">Kepala Dinas (Surat Tugas)</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Nama Kepala Dinas</label>
        <input class="form-control" id="uk-nama-kepala" value="${v.nama_kepala||''}" placeholder="..."></div>
      <div class="form-group"><label class="form-label">NIP Kepala Dinas</label>
        <input class="form-control" id="uk-nip-kepala" value="${v.nip_kepala||''}" placeholder="..."></div>
    </div>
    <hr style="margin:16px 0;border-color:var(--border)">
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-3);margin-bottom:12px">Bendahara Pengeluaran (Rekap Belanja)</div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Nama Bendahara</label>
        <input class="form-control" id="uk-nama-bend" value="${v.nama_bendahara||''}" placeholder="YUSUF JUNAEDI"></div>
      <div class="form-group"><label class="form-label">NIP Bendahara</label>
        <input class="form-control" id="uk-nip-bend" value="${v.nip_bendahara||''}" placeholder="198208122009011003"></div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal('modal-uk')">Batal</button>
    <button class="btn btn-primary" onclick="saveUK('${id||''}')">💾 Simpan</button>
  `, true);
}

function openUKModal(id) {
  const c = document.getElementById('tab-unit-kerja');
  const existing = document.getElementById('modal-uk');
  if (existing) existing.remove();
  c.insertAdjacentHTML('beforeend', ukModal(id));
  if (id) {
    const uk = DB.getArr(KEYS.unitKerja).find(x => x.id === id);
    if (!uk) return;
    // Fields already set via value= in template
  }
  openModal('modal-uk');
}

function saveUK(id) {
  const g = (i) => document.getElementById(i)?.value?.trim() || '';
  const obj = {
    id: id || DB.genId('uk'),
    nama: g('uk-nama'), skpd: g('uk-skpd'),
    kota: g('uk-kota'), tempat_kedudukan: g('uk-kedudukan'),
    alamat: g('uk-alamat'), instansi_pembayar: g('uk-instansi'),
    pejabat_ppk: g('uk-pejabat-ppk'), nama_ppk: g('uk-nama-ppk'), nip_ppk: g('uk-nip-ppk'),
    nama_kepala: g('uk-nama-kepala'), nip_kepala: g('uk-nip-kepala'),
    nama_bendahara: g('uk-nama-bend'), nip_bendahara: g('uk-nip-bend'),
  };
  if (!obj.nama) return toast('Nama dinas wajib diisi', 'error');
  const list = DB.getArr(KEYS.unitKerja);
  const idx = list.findIndex(x => x.id === id);
  if (idx >= 0) list[idx] = obj; else list.push(obj);
  DB.set(KEYS.unitKerja, list);
  closeModal('modal-uk');
  renderUnitKerja();
  toast(`Unit kerja "${obj.nama}" disimpan`, 'success');
}

function deleteUK(id) {
  const uk = DB.getArr(KEYS.unitKerja).find(x => x.id === id);
  if (!confirm(`Hapus unit kerja "${uk?.nama}"?`)) return;
  DB.set(KEYS.unitKerja, DB.getArr(KEYS.unitKerja).filter(x => x.id !== id));
  renderUnitKerja();
  toast('Unit kerja dihapus', 'success');
}

// ══════════════════════════════════════════════════════════
// PEGAWAI
// ══════════════════════════════════════════════════════════
const GOLONGAN_OPTIONS = ['X','VII','IV-e','IV-d','IV-c','IV-b','IV-a','III-d','III-c','III-b','III-a','II-d','II-c','II-b','II-a','I-d','I-c','I-b','I-a'];

function renderPegawai(filter = '') {
  let list = DB.getArr(KEYS.pegawai);
  if (filter) list = list.filter(p =>
    p.nama_lengkap?.toLowerCase().includes(filter) ||
    p.nip?.includes(filter) ||
    p.jabatan?.toLowerCase().includes(filter)
  );
  // Sort by golongan desc
  list.sort((a,b) => golonganToNum(b.golongan) - golonganToNum(a.golongan));

  const c = document.getElementById('tab-pegawai');
  if (!c) return;
  c.innerHTML = `
    <div class="table-toolbar">
      <div class="table-toolbar-left">
        <h4 style="font-size:14px;font-weight:700">Data Pegawai</h4>
        <span class="badge badge-auto">${DB.getArr(KEYS.pegawai).length} pegawai</span>
      </div>
      <div class="table-toolbar-right">
        <div class="search-bar" style="width:220px">
          <span>🔍</span>
          <input type="text" placeholder="Cari nama/NIP..." id="pegawai-search"
            oninput="renderPegawai(this.value.toLowerCase())" value="${filter}">
        </div>
        <button class="btn btn-primary btn-sm" onclick="openPegawaiModal()">+ Tambah Pegawai</button>
      </div>
    </div>
    ${list.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">👤</div>
        <div class="empty-state-title">Belum ada data pegawai</div>
        <div class="empty-state-desc">Tambah pegawai untuk mulai membuat perjalanan dinas</div>
      </div>` : `
      <div class="card">
        <div class="table-wrap"><table>
          <thead><tr>
            <th>Nama Lengkap</th><th>NIP</th><th>Pangkat/Gol</th>
            <th>Jabatan</th><th>No. Rekening</th><th width="100">Aksi</th>
          </tr></thead>
          <tbody>
            ${list.map(p => `
              <tr>
                <td><strong>${p.nama_lengkap}</strong></td>
                <td><span class="tbl-mono">${p.nip||'—'}</span></td>
                <td>${p.pangkat ? `${p.pangkat} / ` : ''}${p.golongan||'—'}</td>
                <td>${p.jabatan||'—'}</td>
                <td><span class="tbl-mono">${p.nomor_rekening||'—'}</span></td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="openPegawaiModal('${p.id}')">✏️</button>
                  <button class="btn btn-danger btn-sm" onclick="deletePegawai('${p.id}')">🗑️</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`}
    ${pegawaiModal()}`;
}

function pegawaiModal(id) {
  const p = id ? DB.getArr(KEYS.pegawai).find(x => x.id === id) : {};
  const v = p || {};
  const ukOptions = DB.getArr(KEYS.unitKerja).map(uk =>
    `<option value="${uk.id}" ${v.unit_kerja_id === uk.id ? 'selected' : ''}>${uk.nama}</option>`
  ).join('');
  const golOptions = GOLONGAN_OPTIONS.map(g =>
    `<option value="${g}" ${v.golongan === g ? 'selected' : ''}>${g}</option>`
  ).join('');

  return modalHTML('modal-pegawai', id ? 'Edit Pegawai' : 'Tambah Pegawai', `
    <div class="form-group"><label class="form-label">Nama Lengkap (dengan gelar) *</label>
      <input class="form-control" id="pgw-nama" value="${v.nama_lengkap||''}" placeholder="Dr. Ridwan Said, S.STP, M.Si"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">NIP *</label>
        <input class="form-control" id="pgw-nip" value="${v.nip||''}" placeholder="198209082001121001"></div>
      <div class="form-group"><label class="form-label">Nomor Rekening Bank</label>
        <input class="form-control" id="pgw-rek" value="${v.nomor_rekening||''}" placeholder="0078230509101"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Pangkat</label>
        <input class="form-control" id="pgw-pangkat" value="${v.pangkat||''}" placeholder="Pembina Tk.I"></div>
      <div class="form-group"><label class="form-label">Golongan</label>
        <select class="form-control" id="pgw-gol">
          <option value="">— Pilih —</option>${golOptions}
        </select></div>
    </div>
    <div class="form-group"><label class="form-label">Jabatan</label>
      <input class="form-control" id="pgw-jabatan" value="${v.jabatan||''}" placeholder="Plt. Sekretaris Dinas"></div>
    <div class="form-group"><label class="form-label">Unit Kerja</label>
      <select class="form-control" id="pgw-uk">
        <option value="">— Pilih Unit Kerja —</option>${ukOptions}
      </select></div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal('modal-pegawai')">Batal</button>
    <button class="btn btn-primary" onclick="savePegawai('${id||''}')">💾 Simpan</button>
  `);
}

function openPegawaiModal(id) {
  const c = document.getElementById('tab-pegawai');
  const existing = document.getElementById('modal-pegawai');
  if (existing) existing.remove();
  c.insertAdjacentHTML('beforeend', pegawaiModal(id));
  openModal('modal-pegawai');
}

function savePegawai(id) {
  const g = (i) => document.getElementById(i)?.value?.trim() || '';
  const obj = {
    id: id || DB.genId('pgw'),
    nama_lengkap: g('pgw-nama'), nip: g('pgw-nip'),
    nomor_rekening: g('pgw-rek'), pangkat: g('pgw-pangkat'),
    golongan: g('pgw-gol'), jabatan: g('pgw-jabatan'),
    unit_kerja_id: g('pgw-uk'),
  };
  if (!obj.nama_lengkap) return toast('Nama pegawai wajib diisi', 'error');
  const list = DB.getArr(KEYS.pegawai);
  const idx = list.findIndex(x => x.id === id);
  if (idx >= 0) list[idx] = obj; else list.push(obj);
  DB.set(KEYS.pegawai, list);
  closeModal('modal-pegawai');
  renderPegawai();
  toast(`Pegawai "${obj.nama_lengkap}" disimpan`, 'success');
}

function deletePegawai(id) {
  const p = DB.getArr(KEYS.pegawai).find(x => x.id === id);
  if (!confirm(`Hapus pegawai "${p?.nama_lengkap}"?`)) return;
  DB.set(KEYS.pegawai, DB.getArr(KEYS.pegawai).filter(x => x.id !== id));
  renderPegawai();
  toast('Pegawai dihapus', 'success');
}

// ══════════════════════════════════════════════════════════
// TARIF PERJALANAN
// ══════════════════════════════════════════════════════════
function renderTarif() {
  const tarif = DB.get(KEYS.tarif) || {};
  const c = document.getElementById('tab-tarif');
  if (!c) return;

  const cards = Object.entries(tarif).map(([key, t]) => `
    <div class="tarif-card" id="tcard-${key}">
      <div class="tarif-icon">${t.icon}</div>
      <div class="tarif-label">${t.label}</div>
      <div class="tarif-value">${t.uang_harian > 0 ? formatRupiah(t.uang_harian) : '—'}</div>
      <div class="tarif-sub">per orang per hari</div>
      <div style="margin-top:14px">
        <label style="font-size:11px;color:var(--text-3);font-weight:600;text-transform:uppercase">Ubah Tarif (Rp)</label>
        <div class="input-group" style="margin-top:6px">
          <input type="number" class="form-control" id="tarif-${key}"
            value="${t.uang_harian||0}" min="0" step="1000"
            style="font-size:13px" placeholder="0">
          <button class="btn btn-primary" onclick="saveTarif('${key}')">✓</button>
        </div>
      </div>
    </div>`).join('');

  c.innerHTML = `
    <div class="table-toolbar">
      <div class="table-toolbar-left">
        <h4 style="font-size:14px;font-weight:700">Tarif Uang Harian</h4>
      </div>
    </div>
    <div class="alert alert-info mb-6">
      💡 Tarif uang harian dibedakan berdasarkan jenis perjalanan. Isi sesuai dengan Peraturan Bupati yang berlaku. Klik ✓ setelah mengubah nilai.
    </div>
    <div class="tarif-grid">${cards}</div>`;
}

function saveTarif(key) {
  const val = parseInt(document.getElementById('tarif-' + key)?.value) || 0;
  const tarif = DB.get(KEYS.tarif) || {};
  if (tarif[key]) tarif[key].uang_harian = val;
  DB.set(KEYS.tarif, tarif);
  renderTarif();
  toast(`Tarif ${tarif[key]?.label} diperbarui: ${formatRupiah(val)}`, 'success');
}

// ══════════════════════════════════════════════════════════
// KECAMATAN & TRANSPORT
// ══════════════════════════════════════════════════════════
function renderKecamatan(filter = '') {
  let list = DB.getArr(KEYS.kecamatan);
  const allList = list;
  if (filter) list = list.filter(k => k.nama.toLowerCase().includes(filter));

  const filled = allList.filter(k => k.tarif_transport > 0).length;
  const c = document.getElementById('tab-kecamatan');
  if (!c) return;

  c.innerHTML = `
    <div class="table-toolbar">
      <div class="table-toolbar-left">
        <h4 style="font-size:14px;font-weight:700">Tarif Transport per Kecamatan</h4>
        <span class="badge badge-auto">${allList.length} kecamatan</span>
        <span class="badge ${filled === allList.length ? 'badge-auto' : 'badge-manual'}">${filled}/${allList.length} terisi</span>
      </div>
      <div class="table-toolbar-right">
        <div class="search-bar kec-search">
          <span>🔍</span>
          <input type="text" placeholder="Cari kecamatan..." id="kec-search"
            oninput="renderKecamatan(this.value.toLowerCase())" value="${filter}">
        </div>
        <button class="btn btn-secondary btn-sm" onclick="saveAllKecamatan()">💾 Simpan Semua</button>
      </div>
    </div>
    <div class="alert alert-info mb-4">
      💡 Isi tarif transport PP (pulang-pergi) per kecamatan sesuai standar biaya daerah. Tarif dihitung: nominal × jumlah kali × lama perjalanan.
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr>
          <th width="40">No</th>
          <th>Kecamatan</th>
          <th width="220">Tarif Transport PP (Rp)</th>
          <th width="120">Preview</th>
        </tr></thead>
        <tbody>
          ${list.map((k, i) => `
            <tr>
              <td class="text-muted">${allList.indexOf(k) + 1}</td>
              <td><strong>${k.nama}</strong></td>
              <td>
                <input type="number" class="form-control" id="kec-tarif-${k.id}"
                  value="${k.tarif_transport||0}" min="0" step="1000"
                  style="font-size:13px;padding:7px 10px" placeholder="0"
                  onchange="previewKecTarif('${k.id}')">
              </td>
              <td id="kec-preview-${k.id}" class="${k.tarif_transport > 0 ? 'text-muted' : 'text-muted'}" style="font-size:12px">
                ${k.tarif_transport > 0 ? formatRupiah(k.tarif_transport) : '<span style="opacity:.4">Belum diisi</span>'}
              </td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
}

function previewKecTarif(id) {
  const val = parseInt(document.getElementById('kec-tarif-' + id)?.value) || 0;
  const el = document.getElementById('kec-preview-' + id);
  if (el) el.innerHTML = val > 0 ? formatRupiah(val) : '<span style="opacity:.4">Belum diisi</span>';
}

function saveAllKecamatan() {
  const list = DB.getArr(KEYS.kecamatan);
  list.forEach(k => {
    const input = document.getElementById('kec-tarif-' + k.id);
    if (input) k.tarif_transport = parseInt(input.value) || 0;
  });
  DB.set(KEYS.kecamatan, list);
  renderKecamatan(document.getElementById('kec-search')?.value?.toLowerCase() || '');
  toast('Tarif kecamatan disimpan', 'success');
}

// ══════════════════════════════════════════════════════════
// KODE REKENING SIPD
// ══════════════════════════════════════════════════════════
function renderSipd() {
  const list = DB.getArr(KEYS.sipd);
  const c = document.getElementById('tab-sipd');
  if (!c) return;

  c.innerHTML = `
    <div class="table-toolbar">
      <div class="table-toolbar-left">
        <h4 style="font-size:14px;font-weight:700">Kode Rekening SIPD</h4>
        <span class="badge badge-auto">${list.length} kode</span>
      </div>
      <div class="table-toolbar-right">
        <button class="btn btn-primary btn-sm" onclick="openSipdModal()">+ Tambah Kode</button>
      </div>
    </div>
    <div class="alert alert-warning mb-4">
      ⚠️ Kode rekening SIPD adalah kode anggaran kegiatan, <strong>bukan</strong> nomor rekening bank. Contoh: <code class="tbl-mono">5.1.02.04.001.00003</code>
    </div>
    ${list.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">📑</div>
        <div class="empty-state-title">Belum ada kode rekening SIPD</div>
        <div class="empty-state-desc">Tambah kode rekening untuk dipakai saat membuat perjalanan dinas</div>
      </div>` : `
      <div class="card">
        <div class="table-wrap"><table>
          <thead><tr>
            <th>Kode</th><th>Sub Kegiatan</th><th>Kegiatan</th>
            <th>Tahun</th><th>Status</th><th width="100">Aksi</th>
          </tr></thead>
          <tbody>
            ${list.map(s => `
              <tr>
                <td><span class="tbl-mono" style="font-size:11px">${s.kode}</span></td>
                <td><strong>${s.sub_kegiatan||'—'}</strong><br>
                  <span class="text-muted text-sm">${s.nama_singkat||''}</span></td>
                <td class="text-muted text-sm" style="max-width:180px">${s.kegiatan||'—'}</td>
                <td>${s.tahun_anggaran||'—'}</td>
                <td>${s.is_active
                  ? '<span class="badge badge-auto">✅ Aktif</span>'
                  : '<span class="badge badge-static">⏸ Nonaktif</span>'}</td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="openSipdModal('${s.id}')">✏️</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteSipd('${s.id}')">🗑️</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`}
    ${sipdModal()}`;
}

function sipdModal(id) {
  const s = id ? DB.getArr(KEYS.sipd).find(x => x.id === id) : {};
  const v = s || {};
  const ukOptions = DB.getArr(KEYS.unitKerja).map(uk =>
    `<option value="${uk.id}" ${v.unit_kerja_id === uk.id ? 'selected' : ''}>${uk.nama}</option>`
  ).join('');

  return modalHTML('modal-sipd', id ? 'Edit Kode Rekening SIPD' : 'Tambah Kode Rekening SIPD', `
    <div class="form-row">
      <div class="form-group" style="grid-column:1/-1"><label class="form-label">Kode Rekening *</label>
        <input class="form-control font-mono" id="sipd-kode" value="${v.kode||''}" placeholder="5.1.02.04.001.00003"></div>
    </div>
    <div class="form-group"><label class="form-label">Program</label>
      <input class="form-control" id="sipd-program" value="${v.program||''}" placeholder="Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota"></div>
    <div class="form-group"><label class="form-label">Kegiatan</label>
      <input class="form-control" id="sipd-kegiatan" value="${v.kegiatan||''}" placeholder="Perencanaan, Penganggaran dan Evaluasi Kinerja Perangkat Daerah"></div>
    <div class="form-group"><label class="form-label">Sub Kegiatan</label>
      <input class="form-control" id="sipd-sub" value="${v.sub_kegiatan||''}" placeholder="Evaluasi Kinerja Perangkat Daerah"></div>
    <div class="form-group"><label class="form-label">Nama Singkat (untuk dropdown)</label>
      <input class="form-control" id="sipd-singkat" value="${v.nama_singkat||''}" placeholder="Perjalanan Dinas Dalam Daerah"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Tahun Anggaran</label>
        <input type="number" class="form-control" id="sipd-tahun" value="${v.tahun_anggaran||new Date().getFullYear()}" placeholder="${new Date().getFullYear()}"></div>
      <div class="form-group"><label class="form-label">Unit Kerja</label>
        <select class="form-control" id="sipd-uk">
          <option value="">— Semua Unit Kerja —</option>${ukOptions}
        </select></div>
    </div>
    <div class="form-group">
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
        <input type="checkbox" id="sipd-aktif" ${v.is_active !== false ? 'checked' : ''} style="width:16px;height:16px">
        <span class="form-label" style="margin:0">Aktif (tampil di dropdown perjalanan dinas)</span>
      </label>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal('modal-sipd')">Batal</button>
    <button class="btn btn-primary" onclick="saveSipd('${id||''}')">💾 Simpan</button>
  `, true);
}

function openSipdModal(id) {
  const c = document.getElementById('tab-sipd');
  const existing = document.getElementById('modal-sipd');
  if (existing) existing.remove();
  c.insertAdjacentHTML('beforeend', sipdModal(id));
  openModal('modal-sipd');
}

function saveSipd(id) {
  const g = (i) => document.getElementById(i)?.value?.trim() || '';
  const obj = {
    id: id || DB.genId('sipd'),
    kode: g('sipd-kode'), program: g('sipd-program'),
    kegiatan: g('sipd-kegiatan'), sub_kegiatan: g('sipd-sub'),
    nama_singkat: g('sipd-singkat'),
    tahun_anggaran: parseInt(g('sipd-tahun')) || new Date().getFullYear(),
    unit_kerja_id: g('sipd-uk'),
    is_active: document.getElementById('sipd-aktif')?.checked ?? true,
  };
  if (!obj.kode) return toast('Kode rekening wajib diisi', 'error');
  const list = DB.getArr(KEYS.sipd);
  const idx = list.findIndex(x => x.id === id);
  if (idx >= 0) list[idx] = obj; else list.push(obj);
  DB.set(KEYS.sipd, list);
  closeModal('modal-sipd');
  renderSipd();
  toast(`Kode ${obj.kode} disimpan`, 'success');
}

function deleteSipd(id) {
  const s = DB.getArr(KEYS.sipd).find(x => x.id === id);
  if (!confirm(`Hapus kode "${s?.kode}"?`)) return;
  DB.set(KEYS.sipd, DB.getArr(KEYS.sipd).filter(x => x.id !== id));
  renderSipd();
  toast('Kode SIPD dihapus', 'success');
}

// ─── FORMAT HELPER (fallback jika terbilang.js belum load) ─
function formatRupiah(n) {
  if (!n || isNaN(n)) return 'Rp 0';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}
