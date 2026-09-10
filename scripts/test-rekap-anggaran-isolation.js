// Run: node scripts/test-rekap-anggaran-isolation.js
// Exercise real calculation/builders and generation routing with in-memory I/O.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const data = {
  sppd_tarif: { dalam_kota: { uang_harian: 170000 }, luar_kota: { uang_harian: 300000 }, luar_provinsi: { uang_harian: 450000 } },
  sppd_sipd: [{ id: 'budget', kode: '5.1', tahun_anggaran: 2026, pagu_anggaran: 100000000 }],
  sppd_pegawai: Array.from({ length: 4 }, (_, i) => ({ id: String(i), nama_lengkap: `Peserta ${i}`, golongan: 'III/a' })),
  sppd_kecamatan: [{ id: 'kec', nama: 'Kemang' }], trips: [], movements: [], history: [],
};
const writes = [], rendered = [];
const c = vm.createContext({ console,
  KEYS: { tarif: 'sppd_tarif', sipd: 'sppd_sipd', perjalanan: 'trips', anggaranMutasi: 'movements', generated: 'history' },
  DB: { get: k => data[k], getArr: k => data[k] || [], set: (k, v) => { writes.push(k); data[k] = v; }, genId: () => 'movement' },
  golonganToNum: () => 1,
  document: { getElementById: () => null },
  AppState: { templates: [] },
  TemplateStorage: { hasFile: () => true, downloadBase64: async t => t.id },
  JSZip: class { folder() { return this; } file() {} async generateAsync() { return {}; } },
  toast: () => {},
});
for (const f of ['js/terbilang.js', 'js/perjalanan.js', 'js/generate.js', 'js/rekap.js', 'upgrade/js/anggaran.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), c);
}
const budget = vm.runInContext('Anggaran', c);
c.generateDocx = async (template, args) => { rendered.push({ template, args }); return {}; };
c.renderGeneratePage = () => {};
c.showGeneratedDownloads = () => {};
const json = x => JSON.stringify(x);
let scenarios = 0;
(async () => {
  for (const jenis of ['dalam_kota', 'luar_kota', 'luar_provinsi']) {
    for (const override of [null, '', 0, '200000']) {
      for (const days of [1, 3]) {
        const pjd = { id: 'trip', status: 'final', kode_sipd_id: 'budget', nomor_surat: 'TEST',
          jenis_perjalanan: jenis, uang_harian_override: override, kecamatan_id: 'kec',
          tanggal_berangkat: '2026-09-10', tanggal_kembali: `2026-09-${9 + days}`, tanggal_surat: '2026-09-10',
          peserta: [
            { pegawai_id: '0', dapat_transport: true, nominal_transport: '70000', jumlah_kali: '2' },
            { pegawai_id: '1', dapat_transport: false, nominal_transport: 90000, jumlah_kali: 2 },
            { pegawai_id: '2', dapat_transport: true, nominal_transport: 0, jumlah_kali: 1 },
            { pegawai_id: '3', dapat_transport: jenis !== 'dalam_kota', nominal_transport: 100000, jumlah_kali: 1 },
          ] };
        data.trips = [pjd]; data.movements = []; writes.length = 0;
        const daily = override === null || override === '' ? data.sppd_tarif[jenis].uang_harian : Number(override);
        const transport = 140000 + (jenis !== 'dalam_kota' ? 100000 : 0);
        const total = daily * days * 4 + transport;
        const base = json(c.buildBaseArgs(pjd));
        const groups = json(c.buildRekapGroups(['trip']));
        const before = json(pjd);
        assert.equal(c.calcGrandTotalFull(pjd), total);
        assert.equal(budget.calculatePjd(pjd), total);
        const fallback = c.calcGrandTotalFull;
        c.calcGrandTotalFull = undefined;
        assert.equal(budget.calculatePjd(pjd), total);
        c.calcGrandTotalFull = fallback;
        const initial = budget.preparePerjalananSave(null, pjd);
        assert.equal(initial.ok, true);
        assert.equal(initial.record.anggaran_final.nilai, total);
        budget.commitPrepared(initial);
        assert.equal(budget.summary('budget').used, total);
        assert.equal(budget.summary('budget').remaining, 100000000 - total);
        const ledger = json(data.movements);
        writes.length = 0;
        for (const layout of ['per_halaman', 'per_peserta']) {
          c.AppState.templates = [
            { id: 'receipt', jenis: 'kwitansi', kwitansiLayout: layout, isIterable: layout === 'per_peserta' },
            { id: 'recap', jenis: 'rekap_belanja', isIterable: false },
          ];
          for (const includeTransport of [false, true, false]) {
            rendered.length = 0;
            await c.runGenerate('trip', [
              { jenis: 'kwitansi', label: 'Kwitansi', templateId: 'receipt', includeTransport },
              { jenis: 'rekap_belanja', label: 'Rekap', templateId: 'recap' },
            ]);
            assert.equal(json(rendered.find(r => r.template === 'recap').args), base);
            assert.equal(rendered.filter(r => r.template === 'receipt').length, layout === 'per_halaman' ? 2 : 4);
            assert.equal(json(c.buildRekapGroups(['trip'])), groups);
            const group = c.buildRekapGroups(['trip'])[0];
            assert.equal(group.totalGrup, total);
            assert.equal(group.peserta.reduce((sum, r) => sum + (r.biayaBBM || 0), 0), transport);
            for (const row of group.peserta) assert.equal(row.totalBiaya, row.totalPerjadin + (row.biayaBBM || 0));
            assert.equal(json(pjd), before);
            assert.equal(json(data.movements), ledger);
            assert.equal(budget.calculatePjd(pjd), total);
            const resave = budget.preparePerjalananSave(initial.record, initial.record);
            assert.equal(resave.ok, true);
            assert.equal(resave.planned.length, 0);
            assert.equal(data.history[0].kwitansiMode, includeTransport ? 'harian_transport' : 'harian');
          }
        }
        assert.ok(writes.every(k => k === 'history'), 'Generation must only write generation history');
        const cancelled = budget.preparePerjalananSave(initial.record, { ...initial.record, status: 'draft' });
        budget.commitPrepared(cancelled);
        assert.equal(budget.summary('budget').used, 0);
        scenarios++;
      }
    }
  }
  console.log(`PASS: ${scenarios} calculation scenarios, ${scenarios * 6} combined generations; recap data and budget ledger unchanged by receipt mode.`);
})().catch(err => { console.error(err); process.exitCode = 1; });
