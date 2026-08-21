/**
 * trash.js — Soft delete, restore, dan hapus permanen.
 */

const TRASH_TYPES = {
  [KEYS.unitKerja]:    { label: 'Unit Kerja', icon: '🏛️' },
  [KEYS.pegawai]:      { label: 'Pegawai', icon: '👤' },
  [KEYS.sipd]:         { label: 'Kode SIPD', icon: '📑' },
  [KEYS.perjalanan]:   { label: 'Perjalanan Dinas', icon: '✈️' },
  [KEYS.templates]:    { label: 'Template', icon: '📄' },
  [KEYS.suratTugasAI]: { label: 'Surat Tugas AI', icon: '🤖' },
};

function trashEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function refreshTrashBadge() {
  const count = DB.getArr(KEYS.trash).length;
  const badge = document.getElementById('trash-count');
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count ? '' : 'none';
}

function renderTrashPage() {
  const container = document.getElementById('trash-container');
  if (!container) return;
  const trash = DB.getArr(KEYS.trash);
  refreshTrashBadge();

  if (!trash.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🗑️</div>
        <div class="empty-state-title">Trash kosong</div>
        <div class="empty-state-desc">Data yang dihapus akan disimpan di sini dan dapat direstore.</div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="alert alert-warning mb-4">
      ⚠️ Data di Trash masih dapat direstore. Hapus permanen tidak dapat dibatalkan.
    </div>
    <div class="table-toolbar">
      <div class="table-toolbar-left">
        <h4 style="font-size:14px;font-weight:700">Data Terhapus</h4>
        <span class="badge badge-manual">${trash.length} item</span>
      </div>
      <div class="table-toolbar-right">
        <button class="btn btn-danger btn-sm" onclick="emptyTrash()">🗑️ Kosongkan Trash</button>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>Data</th><th>Jenis</th><th>Dihapus</th><th width="230">Aksi</th></tr></thead>
        <tbody>${trash.map((entry) => {
          const type = TRASH_TYPES[entry.storeKey] || { label: entry.storeKey, icon: '📦' };
          const deleted = new Date(entry.deletedAt).toLocaleString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
          });
          return `<tr>
            <td><strong>${trashEscape(entry.label || entry.record?.id || '—')}</strong></td>
            <td>${type.icon} ${trashEscape(type.label)}</td>
            <td class="text-muted text-sm">${trashEscape(deleted)}</td>
            <td>
              <button class="btn btn-primary btn-sm" onclick="restoreTrashItem('${entry.id}')">↩️ Restore</button>
              <button class="btn btn-danger btn-sm" onclick="permanentlyDeleteTrashItem('${entry.id}')">🗑️ Permanen</button>
            </td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>`;
}

async function restoreTrashItem(id) {
  const entry = DB.getArr(KEYS.trash).find((item) => item.id === id);
  if (!entry) return toast('Data Trash tidak ditemukan', 'error');
  const result = DB.restoreFromTrash(id);
  if (!result.ok) {
    const message = result.reason === 'duplicate'
      ? 'Tidak dapat restore karena ID data sudah digunakan.'
      : 'Data Trash tidak ditemukan.';
    return toast(message, 'error');
  }
  await DB.flush();
  renderTrashPage();
  toast(`"${entry.label}" berhasil direstore`, 'success');
}

async function permanentlyDeleteTrashItem(id, skipConfirm = false, skipRender = false) {
  const entry = DB.getArr(KEYS.trash).find((item) => item.id === id);
  if (!entry) return false;
  if (!skipConfirm && !confirm(`Hapus "${entry.label}" secara permanen? Tindakan ini tidak dapat dibatalkan.`)) return false;

  try {
    if (entry.storeKey === KEYS.templates && typeof TemplateStorage !== 'undefined') {
      await TemplateStorage.remove(entry.record);
    }
    DB.removeFromTrash(id);
    await DB.flush();
    if (!skipRender) renderTrashPage();
    if (!skipConfirm) toast(`"${entry.label}" dihapus permanen`, 'success');
    return true;
  } catch (err) {
    toast(err.message || 'Gagal menghapus data secara permanen', 'error');
    return false;
  }
}

async function emptyTrash() {
  const items = [...DB.getArr(KEYS.trash)];
  if (!items.length) return;
  if (!confirm(`Hapus permanen semua ${items.length} item di Trash? Tindakan ini tidak dapat dibatalkan.`)) return;

  let removed = 0;
  for (const item of items) {
    if (await permanentlyDeleteTrashItem(item.id, true, true)) removed++;
  }
  renderTrashPage();
  toast(`${removed} item dihapus permanen`, removed === items.length ? 'success' : 'warning');
}
