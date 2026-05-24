/**
 * app.js — State, Toast, Template Management Utilities
 * File .docx: Supabase Storage (cloud) atau base64 di localStorage (lokal)
 */

// ─── STATE ────────────────────────────────────────────────
const AppState = {
  get templates() {
    return DB.getArr(KEYS.templates);
  },
  saveTemplates(arr) {
    DB.set(KEYS.templates, arr);
  },
};

// ─── TOAST ────────────────────────────────────────────────
function toast(msg, type = 'default', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', default: 'ℹ️' };
  el.innerHTML = `<span>${icons[type] || icons.default}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ─── EXTRACT PLACEHOLDERS dari DOCX ───────────────────────
async function extractPlaceholders(file) {
  try {
    const zip = await JSZip.loadAsync(file);
    const xmlFile = zip.file('word/document.xml');
    if (!xmlFile) throw new Error('Bukan file DOCX yang valid');
    const xmlText = await xmlFile.async('string');
    const plain = xmlText.replace(/<[^>]+>/g, ' ');
    const matches = [...plain.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g)];
    return [...new Set(matches.map(m => m[1]))];
  } catch (e) {
    console.error('Extract error:', e);
    throw e;
  }
}

// ─── TEMPLATE UPLOAD HANDLER ──────────────────────────────
async function handleTemplateUpload(file) {
  if (!file || !file.name.endsWith('.docx')) {
    return toast('Hanya file .docx yang didukung', 'error');
  }
  const statusEl = document.getElementById('upload-status');
  if (statusEl) statusEl.innerHTML = `<div class="alert alert-info">⏳ Membaca file dan mendeteksi placeholder...</div>`;

  try {
    const placeholders = await extractPlaceholders(file);
    showUploadForm(file.name, placeholders, file);
    if (statusEl) {
      statusEl.innerHTML = `<div class="alert alert-success">✅ Berhasil membaca file. Ditemukan <strong>${placeholders.length} placeholder</strong>.</div>`;
    }
  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<div class="alert alert-warning">⚠️ ${err.message}</div>`;
    toast(err.message, 'error');
  }
}

function showUploadForm(fileName, placeholders, pendingFile) {
  const formEl = document.getElementById('upload-form');
  if (!formEl) return;
  formEl.style.display = 'block';
  const fnEl = document.getElementById('tf-filename');
  if (fnEl) fnEl.textContent = fileName;

  const chipsEl = document.getElementById('tf-placeholders');
  if (chipsEl) {
    chipsEl.innerHTML = placeholders.length
      ? placeholders.map(p => `
          <span class="chip">
            {{${p}}}
            <em class="chip-remove" onclick="this.closest('.chip').remove()" style="cursor:pointer;font-style:normal;margin-left:4px;opacity:.6">✕</em>
          </span>`).join('')
      : '<span class="text-muted text-sm">Tidak ada placeholder terdeteksi. Tambah manual di bawah.</span>';
  }

  formEl._pendingFile = pendingFile instanceof File ? pendingFile : null;
  delete formEl.dataset.fileData;
  formEl.dataset.fileName = fileName;
  onTemplateJenisChange();
}

function addManualPlaceholder() {
  const input = document.getElementById('manual-ph');
  if (!input) return;
  const val = input.value.trim().replace(/[{}]/g, '');
  if (!val) return;
  const chipsEl = document.getElementById('tf-placeholders');
  if (chipsEl) {
    chipsEl.insertAdjacentHTML('beforeend', `
      <span class="chip">
        {{${val}}}
        <em class="chip-remove" onclick="this.closest('.chip').remove()" style="cursor:pointer;font-style:normal;margin-left:4px;opacity:.6">✕</em>
      </span>`);
  }
  input.value = '';
  input.focus();
}

function getKwitansiLayoutFromForm() {
  const jenis = document.getElementById('tf-jenis')?.value;
  if (jenis !== 'kwitansi') {
    return document.getElementById('tf-iterable')?.checked ? 'per_peserta' : null;
  }
  return document.getElementById('tf-kwitansi-layout')?.value || 'per_halaman';
}

function onTemplateJenisChange() {
  const jenis = document.getElementById('tf-jenis')?.value;
  const kwitansiWrap = document.getElementById('tf-kwitansi-layout-wrap');
  const iterableWrap = document.getElementById('tf-iterable-wrap');
  if (kwitansiWrap) kwitansiWrap.style.display = jenis === 'kwitansi' ? '' : 'none';
  if (iterableWrap) iterableWrap.style.display = jenis === 'kwitansi' ? 'none' : '';
}

async function saveTemplateForm() {
  const formEl = document.getElementById('upload-form');
  const nama = document.getElementById('tf-nama')?.value.trim();
  const jenis = document.getElementById('tf-jenis')?.value;
  const scope = document.getElementById('tf-scope')?.value;
  const deskripsi = document.getElementById('tf-deskripsi')?.value.trim();
  const kwitansiLayout = jenis === 'kwitansi' ? getKwitansiLayoutFromForm() : null;
  const isIterable = jenis === 'kwitansi'
    ? kwitansiLayout === 'per_peserta'
    : !!document.getElementById('tf-iterable')?.checked;
  if (!nama) return toast('Nama template wajib diisi', 'error');
  const pendingFile = formEl?._pendingFile;
  if (!pendingFile) return toast('File belum diupload', 'error');

  const chips = [...document.querySelectorAll('#tf-placeholders .chip')];
  const placeholders = chips.map(c => {
    return c.childNodes[0].textContent.trim().replace(/[{}]/g, '').trim();
  }).filter(Boolean);

  const id = 'tpl_' + Date.now();
  const fileName = formEl.dataset.fileName || pendingFile.name;

  const activeBtn = formEl?.querySelector('.btn-primary');
  const prevLabel = activeBtn?.textContent;
  if (activeBtn) {
    activeBtn.disabled = true;
    activeBtn.textContent = '⏳ Menyimpan...';
  }

  try {
    let record;

    if (TemplateStorage.canUse()) {
      const storagePath = await TemplateStorage.upload(pendingFile, id);
      record = {
        id,
        nama,
        jenis,
        scope,
        deskripsi: deskripsi || '',
        isIterable: !!isIterable,
        kwitansiLayout: kwitansiLayout || undefined,
        placeholders,
        fileName,
        storagePath,
        fileSize: pendingFile.size,
        createdAt: new Date().toISOString(),
      };
    } else {
      const fileData = await TemplateStorage.fileToBase64(pendingFile);
      record = {
        id,
        nama,
        jenis,
        scope,
        deskripsi: deskripsi || '',
        isIterable: !!isIterable,
        kwitansiLayout: kwitansiLayout || undefined,
        placeholders,
        fileName,
        fileData,
        fileSize: pendingFile.size,
        createdAt: new Date().toISOString(),
      };
    }

    const templates = AppState.templates;
    templates.push(record);
    AppState.saveTemplates(templates);
    await DB.flush();

    formEl.style.display = 'none';
    formEl._pendingFile = null;
    document.getElementById('upload-status').innerHTML = '';
    ['tf-nama', 'tf-deskripsi'].forEach((fid) => {
      const el = document.getElementById(fid);
      if (el) el.value = '';
    });
    const phEl = document.getElementById('tf-placeholders');
    if (phEl) phEl.innerHTML = '';
    const iterEl = document.getElementById('tf-iterable');
    if (iterEl) iterEl.checked = false;
    const layoutEl = document.getElementById('tf-kwitansi-layout');
    if (layoutEl) layoutEl.value = 'per_halaman';
    onTemplateJenisChange();

    renderTemplateList();
    updateTemplateBadge();
    const loc = TemplateStorage.canUse() ? ' (cloud storage)' : '';
    toast(`Template "${nama}" berhasil disimpan${loc}`, 'success');
  } catch (err) {
    console.error(err);
    toast(err.message || 'Gagal menyimpan template', 'error');
  } finally {
    if (activeBtn) {
      activeBtn.disabled = false;
      activeBtn.textContent = prevLabel || '💾 Simpan';
    }
  }
}

// ─── RENDER TEMPLATE LIST ─────────────────────────────────
const JENIS_META = {
  kwitansi: { label: 'Kwitansi', icon: '🧾', bg: '#E8F5E9', tc: '#2E7D32' },
  sppd: { label: 'SPPD', icon: '📋', bg: '#E3F2FD', tc: '#1565C0' },
  surat_tugas: { label: 'Surat Tugas', icon: '📝', bg: '#FFF3E0', tc: '#E65100' },
  rekap_belanja: { label: 'Rekap Belanja', icon: '📊', bg: '#F3E5F5', tc: '#6A1B9A' },
  custom: { label: 'Custom', icon: '📁', bg: '#F5F5F5', tc: '#616161' },
};

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderTemplateList() {
  const container = document.getElementById('template-list');
  if (!container) return;
  const templates = AppState.templates;
  updateTemplateBadge();

  if (templates.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📄</div>
        <div class="empty-state-title">Belum ada template</div>
        <div class="empty-state-desc">Upload file .docx untuk mulai</div>
      </div>`;
    return;
  }

  container.innerHTML = templates.map(t => {
    const j = JENIS_META[t.jenis] || JENIS_META.custom;
    const scopeBadge = t.scope === 'global'
      ? '<span class="badge badge-computed">🌐 Global</span>'
      : '<span class="badge badge-manual">👤 Personal</span>';
    const kLayout = t.kwitansiLayout || (t.isIterable ? 'per_peserta' : 'per_halaman');
    const loopBadge = t.isIterable
      ? '<span class="badge badge-loop">🔁 Loop</span>'
      : (t.jenis === 'kwitansi' && kLayout === 'per_halaman'
        ? '<span class="badge badge-loop">📄 1–3/hal</span>' : '');
    const storageBadge = t.storagePath
      ? '<span class="badge badge-computed" title="File di Supabase Storage">📦 Storage</span>'
      : (t.fileData ? '<span class="badge badge-manual" title="File di browser">💾 Lokal</span>' : '');

    const shown = (t.placeholders || []).slice(0, 5);
    const more = (t.placeholders || []).length > 5
      ? `<span class="text-muted text-sm" style="align-self:center">+${t.placeholders.length - 5} lainnya</span>` : '';

    const chips = shown.map(p =>
      `<span class="chip" style="font-size:10px;padding:2px 8px">{{${p}}}</span>`
    ).join('');

    const createdAt = new Date(t.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    const sizeLabel = t.fileSize ? formatFileSize(t.fileSize) : '';

    return `
      <div class="card mb-4">
        <div class="card-header" style="background:${j.bg}22">
          <div class="card-icon" style="background:${j.bg};font-size:20px">${j.icon}</div>
          <div style="flex:1;min-width:0">
            <h3 style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.nama}</h3>
            <p>${t.deskripsi || '<em style="opacity:.6">Tidak ada deskripsi</em>'}</p>
          </div>
          <div class="flex gap-2 items-center" style="flex-shrink:0;flex-wrap:wrap;justify-content:flex-end">
            ${scopeBadge} ${loopBadge} ${storageBadge}
            <button class="btn btn-secondary btn-sm" onclick="downloadTemplate('${t.id}')">⬇️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteTemplate('${t.id}')">🗑️</button>
          </div>
        </div>
        <div class="card-body" style="padding:12px 20px">
          <div class="flex justify-between items-center" style="margin-bottom:8px">
            <span style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em">${t.placeholders?.length || 0} Placeholder</span>
            <span class="text-sm text-muted">📅 ${createdAt} · ${t.fileName}${sizeLabel ? ' · ' + sizeLabel : ''}</span>
          </div>
          <div class="flex" style="flex-wrap:wrap;gap:5px;align-items:center">${chips}${more}</div>
        </div>
      </div>`;
  }).join('');
}

async function deleteTemplate(id) {
  const t = AppState.templates.find(x => x.id === id);
  if (!t) return;
  if (!confirm(`Hapus template "${t.nama}"?`)) return;

  try {
    await TemplateStorage.remove(t);
    AppState.saveTemplates(AppState.templates.filter(x => x.id !== id));
    await DB.flush();
    renderTemplateList();
    updateTemplateBadge();
    toast('Template dihapus', 'success');
  } catch (err) {
    toast(err.message || 'Gagal menghapus template', 'error');
  }
}

async function downloadTemplate(id) {
  const t = AppState.templates.find(x => x.id === id);
  if (!t || !TemplateStorage.hasFile(t)) return toast('Data file tidak tersedia', 'error');

  try {
    const b64 = await TemplateStorage.downloadBase64(t);
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const blob = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t.fileName || 'template.docx';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast(err.message || 'Gagal mengunduh template', 'error');
  }
}

function updateTemplateBadge() {
  const templates = AppState.templates;
  const el = document.getElementById('template-count');
  if (el) el.textContent = templates.length + ' template';
}

// ─── PANDUAN SEARCH ───────────────────────────────────────
function initPanduanSearch() {
  const input = document.getElementById('panduan-search');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    document.querySelectorAll('.panduan-row').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}
