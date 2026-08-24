/**
 * Kandidat modul upgrade pengendalian pagu.
 * File ini tidak aktif sampai patch integrasi diterapkan.
 */

const Anggaran = (() => {
  const MANUAL_DEBIT_TYPES = new Set(['realisasi_luar', 'saldo_awal', 'koreksi_kurang']);
  const MANUAL_CREDIT_TYPES = new Set(['koreksi_tambah']);

  function number(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function escape(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function money(value) {
    return typeof formatRupiah === 'function'
      ? formatRupiah(number(value))
      : 'Rp ' + number(value).toLocaleString('id-ID');
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function movements() {
    return DB.getArr(KEYS.anggaranMutasi);
  }

  function sipdById(id) {
    return DB.getArr(KEYS.sipd).find((item) => String(item.id) === String(id));
  }

  function yearOfPjd(pjd) {
    const raw = pjd?.tanggal_berangkat || pjd?.tanggal_surat || '';
    return number(String(raw).slice(0, 4)) || new Date().getFullYear();
  }

  function calculatePjd(pjd) {
    if (typeof calcGrandTotalFull === 'function') return number(calcGrandTotalFull(pjd));
    const duration = typeof hitungLama === 'function'
      ? (hitungLama(pjd.tanggal_berangkat, pjd.tanggal_kembali) || 1)
      : 1;
    const tarif = DB.get(KEYS.tarif) || {};
    const hasOverride = pjd.uang_harian_override !== null
      && pjd.uang_harian_override !== undefined
      && pjd.uang_harian_override !== '';
    const daily = hasOverride
      ? number(pjd.uang_harian_override)
      : number(tarif[pjd.jenis_perjalanan]?.uang_harian);
    return (pjd.peserta || []).reduce((total, participant) => {
      const transport = participant.dapat_transport
        ? number(participant.nominal_transport) * (number(participant.jumlah_kali) || 1)
        : 0;
      return total + (daily * duration) + transport;
    }, 0);
  }

  function freezePjdRates(pjd) {
    const hasOverride = pjd.uang_harian_override !== null
      && pjd.uang_harian_override !== undefined
      && pjd.uang_harian_override !== '';
    if (hasOverride) return;
    const tarif = DB.get(KEYS.tarif) || {};
    pjd.uang_harian_override = number(tarif[pjd.jenis_perjalanan]?.uang_harian);
  }

  function summary(sipdId) {
    const sipd = sipdById(sipdId);
    const pagu = number(sipd?.pagu_anggaran);
    const rows = movements().filter((item) => String(item.sipd_id) === String(sipdId));
    const used = rows.reduce((total, item) => total + number(item.nilai_dampak), 0);
    const system = rows
      .filter((item) => item.sumber === 'perjalanan')
      .reduce((total, item) => total + number(item.nilai_dampak), 0);
    const manual = used - system;
    return {
      sipd,
      pagu,
      used,
      system,
      manual,
      remaining: pagu - used,
      percent: pagu > 0 ? Math.max(0, (used / pagu) * 100) : 0,
      rows,
    };
  }

  function pjdImpacts(pjdId) {
    const result = new Map();
    movements()
      .filter((item) => item.sumber === 'perjalanan' && String(item.sumber_id) === String(pjdId))
      .forEach((item) => {
        const key = String(item.sipd_id);
        result.set(key, (result.get(key) || 0) + number(item.nilai_dampak));
      });
    return result;
  }

  function movement(data) {
    return {
      id: DB.genId('agt'),
      sipd_id: data.sipd_id,
      tahun_anggaran: number(data.tahun_anggaran),
      tanggal: data.tanggal || today(),
      jenis: data.jenis,
      sumber: data.sumber,
      sumber_id: data.sumber_id || '',
      nomor_dokumen: data.nomor_dokumen || '',
      uraian: data.uraian || '',
      nilai_dampak: number(data.nilai_dampak),
      alasan: data.alasan || '',
      referensi: data.referensi || '',
      reversal_of: data.reversal_of || '',
      created_by: DB._userId || '',
      created_at: new Date().toISOString(),
    };
  }

  function validateFinal(pjd, availableOverride) {
    if (pjd.status !== 'final') return { ok: true };
    if (!pjd.kode_sipd_id) {
      return { ok: false, message: 'Kode rekening dari Data Master wajib dipilih sebelum Final.' };
    }
    const sipd = sipdById(pjd.kode_sipd_id);
    if (!sipd) return { ok: false, message: 'Kode rekening anggaran tidak ditemukan.' };
    if (pjd.kode_sipd_manual && pjd.kode_sipd_manual.trim() !== String(sipd.kode || '').trim()) {
      return {
        ok: false,
        message: 'Kode manual berbeda dari kode master. Kosongkan kode manual sebelum Final.',
      };
    }
    const pjdYear = yearOfPjd(pjd);
    if (number(sipd.tahun_anggaran) !== pjdYear) {
      return {
        ok: false,
        message: `Tahun perjalanan ${pjdYear} tidak sesuai dengan tahun anggaran ${sipd.tahun_anggaran}.`,
      };
    }
    if (number(sipd.pagu_anggaran) <= 0) {
      return { ok: false, message: 'Pagu rekening belum diisi atau bernilai nol.' };
    }
    const total = calculatePjd(pjd);
    if (total <= 0) return { ok: false, message: 'Total biaya Final harus lebih dari nol.' };
    const available = availableOverride ?? summary(sipd.id).remaining;
    if (total > available) {
      return {
        ok: false,
        message: `Sisa pagu tidak cukup. Tersedia ${money(available)}, diperlukan ${money(total)}.`,
      };
    }
    return { ok: true, sipd, total };
  }

  function preparePerjalananSave(previous, nextValue) {
    const next = JSON.parse(JSON.stringify(nextValue));
    const oldFinal = previous?.status === 'final';
    const newFinal = next.status === 'final';
    const impacts = previous?.id ? pjdImpacts(previous.id) : new Map();
    const planned = [];

    if (!newFinal) {
      if (oldFinal) {
        impacts.forEach((amount, sipdId) => {
          if (!amount) return;
          planned.push({
            sipd_id: sipdId,
            amount: -amount,
            kind: 'pembatalan_final',
            description: `Pembatalan Final ${previous.nomor_surat || previous.id}`,
          });
        });
      }
      delete next.anggaran_final;
      return { ok: true, record: next, planned };
    }

    freezePjdRates(next);
    const newSipdId = String(next.kode_sipd_id || '');
    const newTotal = calculatePjd(next);
    let releasedOnNewSipd = 0;

    if (oldFinal && impacts.size) {
      impacts.forEach((amount, oldSipdId) => {
        if (String(oldSipdId) === newSipdId) {
          releasedOnNewSipd += amount;
        } else if (amount) {
          planned.push({
            sipd_id: oldSipdId,
            amount: -amount,
            kind: 'pindah_rekening_keluar',
            description: `Pemindahan rekening ${next.nomor_surat || next.id}`,
          });
        }
      });
    }

    const available = summary(newSipdId).remaining + releasedOnNewSipd;
    const validation = validateFinal(next, available);
    if (!validation.ok) return validation;

    const delta = newTotal - releasedOnNewSipd;
    if (delta) {
      planned.push({
        sipd_id: newSipdId,
        amount: delta,
        kind: releasedOnNewSipd ? 'penyesuaian_final' : 'finalisasi',
        description: `${releasedOnNewSipd ? 'Penyesuaian' : 'Finalisasi'} ${next.nomor_surat || next.id}`,
      });
    }

    next.anggaran_final = {
      sipd_id: newSipdId,
      nilai: newTotal,
      finalized_at: previous?.anggaran_final?.finalized_at || new Date().toISOString(),
      revision: number(previous?.anggaran_final?.revision) + 1,
    };
    return { ok: true, record: next, planned };
  }

  function commitPrepared(result) {
    if (!result?.planned?.length) return;
    const rows = movements();
    result.planned.forEach((item) => {
      const sipd = sipdById(item.sipd_id);
      rows.push(movement({
        sipd_id: item.sipd_id,
        tahun_anggaran: sipd?.tahun_anggaran,
        tanggal: result.record.tanggal_berangkat || today(),
        jenis: item.kind,
        sumber: 'perjalanan',
        sumber_id: result.record.id,
        nomor_dokumen: result.record.nomor_surat,
        uraian: item.description,
        nilai_dampak: item.amount,
      }));
    });
    DB.set(KEYS.anggaranMutasi, rows);
  }

  function canDeletePerjalanan(pjd) {
    if (pjd?.status !== 'final') return { ok: true };
    return {
      ok: false,
      message: 'Dokumen Final tidak dapat dihapus. Ubah ke Draft terlebih dahulu agar pagu dikembalikan.',
    };
  }

  function validateSipdUpdate(previous, next) {
    if (!previous) return { ok: true };
    const data = summary(previous.id);
    if (data.rows.length && number(previous.tahun_anggaran) !== number(next.tahun_anggaran)) {
      return { ok: false, message: 'Tahun anggaran tidak dapat diubah karena rekening sudah memiliki riwayat mutasi.' };
    }
    if (number(next.pagu_anggaran) < data.used) {
      return { ok: false, message: `Pagu tidak boleh lebih kecil dari penggunaan ${money(data.used)}.` };
    }
    return { ok: true };
  }

  function canDeleteSipd(sipd) {
    if (!sipd) return { ok: true };
    const data = summary(sipd.id);
    if (!data.rows.length) return { ok: true };
    return {
      ok: false,
      message: 'Rekening memiliki riwayat anggaran dan tidak dapat dihapus. Nonaktifkan rekening agar riwayat tetap utuh.',
    };
  }

  function selectionHint(pjd) {
    if (!pjd?.kode_sipd_id) {
      return '<span class="text-muted">Pilih kode rekening untuk melihat sisa pagu.</span>';
    }
    const data = summary(pjd.kode_sipd_id);
    if (!data.sipd) return '<span style="color:var(--red)">Kode rekening tidak ditemukan.</span>';
    return `<div class="anggaran-inline">
      <span>Pagu: <strong>${money(data.pagu)}</strong></span>
      <span>Terpakai: <strong>${money(data.used)}</strong></span>
      <span>Sisa: <strong>${money(data.remaining)}</strong></span>
    </div>`;
  }

  function refreshSelectionHint() {
    const container = document.getElementById('anggaran-sipd-hint');
    if (container && typeof PJD !== 'undefined') container.innerHTML = selectionHint(PJD.form);
  }

  function finalPreview(pjd) {
    if (!pjd?.kode_sipd_id) return '';
    const data = summary(pjd.kode_sipd_id);
    const total = calculatePjd(pjd);
    const previousImpact = pjd.id ? (pjdImpacts(pjd.id).get(String(pjd.kode_sipd_id)) || 0) : 0;
    const available = data.remaining + previousImpact;
    const after = available - total;
    return `<div class="alert ${after < 0 ? 'alert-warning' : 'alert-success'} anggaran-final-preview">
      <strong>Dampak pada pagu</strong>
      <div class="anggaran-preview-grid">
        <span>Sisa sebelum dokumen</span><strong>${money(available)}</strong>
        <span>Biaya Final</span><strong>${money(total)}</strong>
        <span>Sisa setelah Final</span><strong>${money(after)}</strong>
      </div>
    </div>`;
  }

  function statusBadge(data) {
    if (data.remaining < 0) return '<span class="badge status-anggaran-danger">Melebihi pagu</span>';
    if (data.pagu > 0 && data.percent >= 90) return '<span class="badge status-anggaran-warning">Hampir habis</span>';
    if (data.pagu > 0) return '<span class="badge badge-auto">Aman</span>';
    return '<span class="badge badge-static">Pagu belum diisi</span>';
  }

  function renderMaster() {
    const container = document.getElementById('tab-anggaran');
    if (!container) return;
    const sipds = DB.getArr(KEYS.sipd)
      .sort((a, b) => number(b.tahun_anggaran) - number(a.tahun_anggaran));
    container.innerHTML = `
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <h4 style="font-size:14px;font-weight:700">Pengendalian Pagu Anggaran</h4>
          <span class="badge badge-auto">${sipds.length} rekening</span>
        </div>
        <div class="table-toolbar-right">
          <button class="btn btn-secondary btn-sm" onclick="Anggaran.migrateLegacyFinals()">Impor Final Lama</button>
        </div>
      </div>
      <div class="alert alert-warning mb-4">
        Koreksi tidak mengubah saldo secara langsung. Setiap perubahan dicatat dalam buku mutasi.
      </div>
      ${sipds.length ? `<div class="card"><div class="table-wrap"><table>
        <thead><tr><th>Rekening / Subkegiatan</th><th>Tahun</th><th>Pagu</th><th>Terpakai</th><th>Sisa</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${sipds.map((sipd) => {
          const data = summary(sipd.id);
          return `<tr>
            <td><strong>${escape(sipd.kode)}</strong><br><span class="text-muted text-sm">${escape(sipd.sub_kegiatan || sipd.nama_singkat || '—')}</span></td>
            <td>${escape(sipd.tahun_anggaran || '—')}</td>
            <td>${money(data.pagu)}</td><td>${money(data.used)}</td>
            <td><strong>${money(data.remaining)}</strong></td><td>${statusBadge(data)}</td>
            <td><div class="flex gap-2 anggaran-actions">
              <button class="btn btn-primary btn-sm" onclick="Anggaran.openAdjustment('${sipd.id}','realisasi_luar')">Realisasi Luar</button>
              <button class="btn btn-secondary btn-sm" onclick="Anggaran.openAdjustment('${sipd.id}','koreksi_tambah')">Koreksi</button>
              <button class="btn btn-secondary btn-sm" onclick="Anggaran.openHistory('${sipd.id}')">Riwayat</button>
            </div></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div></div>` : '<div class="empty-state"><div class="empty-state-title">Belum ada kode rekening SIPD</div></div>'}
      <div id="anggaran-modal-host"></div>`;
  }

  function openAdjustment(sipdId, defaultType) {
    const sipd = sipdById(sipdId);
    const host = document.getElementById('anggaran-modal-host');
    if (!sipd || !host) return;
    host.innerHTML = modalHTML('modal-anggaran-koreksi', 'Catat Penyesuaian Anggaran', `
      <div class="alert alert-info"><strong>${escape(sipd.kode)}</strong><br>${escape(sipd.sub_kegiatan || sipd.nama_singkat || '')}</div>
      <input type="hidden" id="agt-sipd" value="${escape(sipd.id)}">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Jenis *</label>
          <select class="form-control" id="agt-jenis">
            <option value="realisasi_luar" ${defaultType === 'realisasi_luar' ? 'selected' : ''}>Realisasi luar sistem</option>
            <option value="saldo_awal">Saldo realisasi awal</option>
            <option value="koreksi_kurang">Koreksi pengurangan pagu</option>
            <option value="koreksi_tambah" ${defaultType === 'koreksi_tambah' ? 'selected' : ''}>Koreksi pengembalian pagu</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Tanggal *</label><input type="date" class="form-control" id="agt-tanggal" value="${today()}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nomor Dokumen *</label><input class="form-control" id="agt-nomor"></div>
        <div class="form-group"><label class="form-label">Nilai *</label><input type="number" min="1" step="1000" class="form-control" id="agt-nilai"></div>
      </div>
      <div class="form-group"><label class="form-label">Uraian *</label><textarea class="form-control" id="agt-uraian" rows="3"></textarea></div>
      <div class="form-group"><label class="form-label">Alasan *</label><textarea class="form-control" id="agt-alasan" rows="2"></textarea></div>
      <div class="form-group"><label class="form-label">Referensi/Lokasi Arsip</label><input class="form-control" id="agt-referensi"></div>
    `, `
      <button class="btn btn-secondary" onclick="closeModal('modal-anggaran-koreksi')">Batal</button>
      <button class="btn btn-primary" onclick="Anggaran.saveAdjustment()">Simpan Mutasi</button>
    `, true);
    openModal('modal-anggaran-koreksi');
  }

  function saveAdjustment() {
    const value = (id) => document.getElementById(id)?.value?.trim() || '';
    const sipd = sipdById(value('agt-sipd'));
    const type = value('agt-jenis');
    const date = value('agt-tanggal');
    const documentNumber = value('agt-nomor');
    const amount = number(value('agt-nilai'));
    const description = value('agt-uraian');
    const reason = value('agt-alasan');
    if (!sipd || !date || !documentNumber || !description || !reason || amount <= 0) {
      return toast('Lengkapi semua isian wajib dan nilai koreksi.', 'error');
    }
    const year = number(date.slice(0, 4));
    if (year !== number(sipd.tahun_anggaran)) {
      return toast(`Tanggal harus berada pada tahun anggaran ${sipd.tahun_anggaran}.`, 'error');
    }
    const duplicate = movements().some((item) =>
      String(item.sipd_id) === String(sipd.id)
      && number(item.tahun_anggaran) === year
      && String(item.nomor_dokumen).toLowerCase() === documentNumber.toLowerCase()
      && !item.reversal_of
      && !isReversed(item.id));
    if (duplicate) return toast('Nomor dokumen sudah tercatat pada rekening dan tahun ini.', 'error');

    const impact = MANUAL_CREDIT_TYPES.has(type) ? -amount : amount;
    const data = summary(sipd.id);
    if (impact > data.remaining) {
      return toast(`Sisa pagu hanya ${money(data.remaining)}.`, 'error');
    }
    if (impact < 0 && Math.abs(impact) > data.used) {
      return toast('Nilai pengembalian tidak boleh melebihi total penggunaan.', 'error');
    }
    if (!MANUAL_DEBIT_TYPES.has(type) && !MANUAL_CREDIT_TYPES.has(type)) {
      return toast('Jenis transaksi tidak dikenal.', 'error');
    }

    const rows = movements();
    rows.push(movement({
      sipd_id: sipd.id,
      tahun_anggaran: year,
      tanggal: date,
      jenis: type,
      sumber: 'manual',
      nomor_dokumen: documentNumber,
      uraian: description,
      nilai_dampak: impact,
      alasan: reason,
      referensi: value('agt-referensi'),
    }));
    DB.set(KEYS.anggaranMutasi, rows);
    closeModal('modal-anggaran-koreksi');
    renderMaster();
    toast('Penyesuaian anggaran dicatat.', 'success');
  }

  function isReversed(id) {
    return movements().some((item) => String(item.reversal_of) === String(id));
  }

  function openHistory(sipdId) {
    const sipd = sipdById(sipdId);
    const host = document.getElementById('anggaran-modal-host');
    if (!sipd || !host) return;
    const rows = movements()
      .filter((item) => String(item.sipd_id) === String(sipdId))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    host.innerHTML = modalHTML('modal-anggaran-riwayat', 'Riwayat Anggaran', `
      <div class="alert alert-info"><strong>${escape(sipd.kode)}</strong> · Sisa ${money(summary(sipdId).remaining)}</div>
      <div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Dokumen</th><th>Uraian</th><th>Sumber</th><th>Mutasi</th><th>Aksi</th></tr></thead>
      <tbody>${rows.length ? rows.map((item) => `<tr>
        <td>${escape(item.tanggal)}</td><td>${escape(item.nomor_dokumen || '—')}</td>
        <td>${escape(item.uraian)}${item.reversal_of ? '<br><span class="text-muted text-sm">Transaksi pembalik</span>' : ''}</td>
        <td>${item.sumber === 'perjalanan' ? 'Dokumen sistem' : 'Manual'}</td>
        <td class="${number(item.nilai_dampak) >= 0 ? 'anggaran-debit' : 'anggaran-credit'}">${number(item.nilai_dampak) >= 0 ? '-' : '+'}${money(Math.abs(number(item.nilai_dampak)))}</td>
        <td>${item.sumber === 'manual' && !item.reversal_of && !isReversed(item.id)
          ? `<button class="btn btn-danger btn-sm" onclick="Anggaran.reverseAdjustment('${item.id}')">Batalkan</button>`
          : '—'}</td>
      </tr>`).join('') : '<tr><td colspan="6" class="text-center text-muted">Belum ada mutasi</td></tr>'}</tbody></table></div>
    `, '<button class="btn btn-secondary" onclick="closeModal(\'modal-anggaran-riwayat\')">Tutup</button>', true);
    openModal('modal-anggaran-riwayat');
  }

  function reverseAdjustment(id) {
    const original = movements().find((item) => String(item.id) === String(id));
    if (!original || original.sumber !== 'manual' || original.reversal_of || isReversed(id)) {
      return toast('Transaksi tidak dapat dibatalkan.', 'error');
    }
    const reason = prompt('Alasan pembatalan transaksi:');
    if (!reason?.trim()) return;
    const data = summary(original.sipd_id);
    const reverseImpact = -number(original.nilai_dampak);
    if (reverseImpact > data.remaining) {
      return toast('Pembatalan akan menyebabkan sisa pagu negatif.', 'error');
    }
    const rows = movements();
    rows.push(movement({
      sipd_id: original.sipd_id,
      tahun_anggaran: original.tahun_anggaran,
      tanggal: today(),
      jenis: 'pembatalan_manual',
      sumber: 'manual',
      nomor_dokumen: original.nomor_dokumen,
      uraian: `Pembatalan: ${original.uraian}`,
      nilai_dampak: reverseImpact,
      alasan: reason.trim(),
      reversal_of: original.id,
    }));
    DB.set(KEYS.anggaranMutasi, rows);
    closeModal('modal-anggaran-riwayat');
    renderMaster();
    toast('Transaksi pembalik berhasil dibuat.', 'success');
  }

  function migrateLegacyFinals() {
    if (!confirm('Impor semua dokumen Final lama yang belum memiliki mutasi? Pastikan data sudah dicadangkan.')) return;
    const pjdList = DB.getArr(KEYS.perjalanan);
    const rows = movements();
    let imported = 0;
    let skipped = 0;
    pjdList.forEach((pjd) => {
      if (pjd.status !== 'final' || !pjd.kode_sipd_id || pjdImpacts(pjd.id).size) return;
      freezePjdRates(pjd);
      const validation = validateFinal(pjd);
      if (!validation.ok) {
        skipped++;
        return;
      }
      const total = calculatePjd(pjd);
      rows.push(movement({
        sipd_id: pjd.kode_sipd_id,
        tahun_anggaran: yearOfPjd(pjd),
        tanggal: pjd.tanggal_berangkat,
        jenis: 'migrasi_final_lama',
        sumber: 'perjalanan',
        sumber_id: pjd.id,
        nomor_dokumen: pjd.nomor_surat,
        uraian: `Migrasi dokumen Final lama ${pjd.nomor_surat || pjd.id}`,
        nilai_dampak: total,
        alasan: 'Migrasi awal fitur pengendalian pagu',
      }));
      pjd.anggaran_final = {
        sipd_id: pjd.kode_sipd_id,
        nilai: total,
        finalized_at: pjd.updated_at || new Date().toISOString(),
        revision: 1,
      };
      imported++;
    });
    DB.set(KEYS.anggaranMutasi, rows);
    DB.set(KEYS.perjalanan, pjdList);
    renderMaster();
    toast(`${imported} Final lama diimpor; ${skipped} dilewati untuk diperiksa.`, skipped ? 'warning' : 'success', 5000);
  }

  return {
    summary,
    calculatePjd,
    preparePerjalananSave,
    commitPrepared,
    canDeletePerjalanan,
    validateSipdUpdate,
    canDeleteSipd,
    selectionHint,
    refreshSelectionHint,
    finalPreview,
    renderMaster,
    openAdjustment,
    saveAdjustment,
    openHistory,
    reverseAdjustment,
    migrateLegacyFinals,
  };
})();
