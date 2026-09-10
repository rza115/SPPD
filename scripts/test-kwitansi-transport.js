// Run: node scripts/test-kwitansi-transport.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const elements = {};
const context = vm.createContext({
  console,
  DB: { get: () => ({}), getArr: () => [] },
  getPegawaiById: id => ({ nama_lengkap: `Peserta ${id}`, golongan: 'III/a' }),
  golonganToNum: () => 1,
  getKecById: () => ({ nama: 'Kemang' }),
  getTingkatBiaya: () => 'Dalam Daerah',
  document: { getElementById: id => elements[id] },
  AppState: { templates: [{ id: 'template', jenis: 'kwitansi', kwitansiLayout: 'per_halaman' }] },
});
for (const file of ['terbilang.js', 'generate.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), context);
}
// Master/base fields are unrelated to the receipt calculation under test.
context.buildBaseArgs = () => ({});
const withTransport = { pegawai_id: '1', dapat_transport: true, nominal_transport: 70000, jumlah_kali: 2 };
const withoutTransport = { ...withTransport, pegawai_id: '2', dapat_transport: false };
const zeroTransport = { ...withTransport, pegawai_id: '3', nominal_transport: 0 };
const pjd = { id: 'trip', jenis_perjalanan: 'dalam_kota', uang_harian_override: 170000,
  tanggal_berangkat: '2026-09-10', tanggal_kembali: '2026-09-11', peserta: [withTransport, withoutTransport, zeroTransport] };
context.getPJDList = () => [pjd];
const original = JSON.stringify(pjd);
for (const include of [undefined, false, true]) {
  const page = context.buildKwitansiHalamanArgs(pjd.peserta, pjd, 1, 1, include);
  for (const [i, ps] of pjd.peserta.entries()) {
    const single = context.buildPesertaArgs(ps, pjd, i + 1, include);
    const expected = 340000 + (include && i === 0 ? 140000 : 0);
    assert.equal(single.total, context.formatRupiah(expected));
    assert.equal(single.nominal, context.formatNominalDoc(expected));
    assert.equal(single.total_terbilang, context.terbilang(expected));
    assert.equal(single.transport, include && i === 0 ? context.formatRupiah(140000) : '');
    assert.equal(single.untuk_pembayaran.includes('dan Transport'), Boolean(include && i === 0));
    for (const key of ['total', 'total_peserta', 'nominal', 'nominal_peserta', 'total_terbilang', 'total_peserta_terbilang', 'banyaknya_uang', 'transport', 'transport_peserta', 'transport_total', 'untuk_pembayaran']) {
      assert.equal(page[`${key}_${i + 1}`], single[key], key);
    }
  }
  const partial = context.buildKwitansiHalamanArgs([withTransport], pjd, 1, 1, include);
  assert.equal(partial.total_2, '');
  assert.equal(partial.transport_3, '');
  assert.equal(partial.ada_peserta_2, false);
}
assert.equal(JSON.stringify(pjd), original);
assert.equal(context.calcGrandTotalFull(pjd), 1160000);
elements['gchk-kwitansi'] = { checked: true };
elements['gsel-kwitansi'] = { value: 'template' };
elements['gen-pjd-select'] = { value: 'trip' };
elements['gen-summary-text'] = {};
elements['gen-include-transport'] = { checked: false };
elements['gen-kwitansi-options'] = { hidden: true };
context.onGenCheck('kwitansi', true);
assert.equal(elements['gen-kwitansi-options'].hidden, false);
assert.equal(context.getGenSelections()[0].includeTransport, false);
elements['gen-include-transport'].checked = true;
context.updateGenSummary();
assert.match(elements['gen-summary-text'].innerHTML, /uang harian \+ transport/);
assert.equal(context.getGenSelections()[0].includeTransport, true);
context.onGenCheck('kwitansi', false);
assert.equal(elements['gen-include-transport'].checked, false);
assert.equal(elements['gen-kwitansi-options'].hidden, true);
console.log('PASS: receipt amounts, words, transport eligibility, both layouts, empty slots, unchanged source totals, checkbox and summary.');
