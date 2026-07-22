// pages.js - HTML content for each page, injected by router

const PAGES = {};

PAGES.dashboard = `
<div class="hero-banner">
  <h2>Selamat Datang di SPPD Generator</h2>
  <p>Sistem generate otomatis dokumen perjalanan dinas — SPPD, Kwitansi, Surat Tugas, dan Rekap Belanja dari template .docx yang dapat dikustomisasi.</p>
  <div class="hero-actions">
    <button class="hero-btn hero-btn-primary" onclick="navigateTo('template')">📤 Upload Template</button>
    <button class="hero-btn hero-btn-secondary" onclick="navigateTo('panduan')">📖 Panduan Arguments</button>
  </div>
</div>

<div class="phases mb-6">
  <div class="phase-card done"><div class="phase-num">✓</div><div class="phase-title">Phase 1</div><div class="phase-desc">Foundation, Panduan & Template Manager</div></div>
  <div class="phase-card done"><div class="phase-num">✓</div><div class="phase-title">Phase 2</div><div class="phase-desc">Data Master: Pegawai, Tarif, Kecamatan, SIPD</div></div>
  <div class="phase-card done"><div class="phase-num">✓</div><div class="phase-title">Phase 3</div><div class="phase-desc">Form Perjalanan Dinas &amp; Kalkulasi Realtime</div></div>
  <div class="phase-card done"><div class="phase-num">✓</div><div class="phase-title">Phase 4</div><div class="phase-desc">Generate Engine &amp; ZIP Output</div></div>
</div>

<div class="stats-grid mb-6">
  <div class="stat-card navy"><span class="stat-icon">📄</span><div class="stat-value" id="stat-templates">0</div><div class="stat-label">Template Tersimpan</div></div>
  <div class="stat-card gold"><span class="stat-icon">✈️</span><div class="stat-value" id="stat-perjalanan">0</div><div class="stat-label">Perjalanan Dinas</div></div>
  <div class="stat-card green"><span class="stat-icon">📦</span><div class="stat-value" id="stat-generated">0</div><div class="stat-label">Dokumen Digenerate</div></div>
  <div class="stat-card red"><span class="stat-icon">👥</span><div class="stat-value" id="stat-pegawai">0</div><div class="stat-label">Data Pegawai</div></div>
</div>

<div class="grid-2">
  <div class="card">
    <div class="card-header">
      <div class="card-icon" style="background:#EBF3FD">📋</div>
      <div><h3>Cara Kerja Sistem</h3><p>Alur penggunaan aplikasi</p></div>
    </div>
    <div class="card-body">
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="flex gap-3 items-center"><div style="width:28px;height:28px;border-radius:50%;background:var(--navy);color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">1</div><div><strong>Upload Template .docx</strong><br><span class="text-muted text-sm">Tambah placeholder <code style="background:#f0f3f9;padding:1px 5px;border-radius:3px">{{nama}}</code> di file Word kamu</span></div></div>
        <div class="flex gap-3 items-center"><div style="width:28px;height:28px;border-radius:50%;background:var(--navy);color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">2</div><div><strong>Isi Data Master</strong><br><span class="text-muted text-sm">Pegawai, unit kerja, tarif, kecamatan</span></div></div>
        <div class="flex gap-3 items-center"><div style="width:28px;height:28px;border-radius:50%;background:var(--navy);color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">3</div><div><strong>Buat Perjalanan Dinas</strong><br><span class="text-muted text-sm">Isi form, sistem kalkulasi otomatis</span></div></div>
        <div class="flex gap-3 items-center"><div style="width:28px;height:28px;border-radius:50%;background:var(--success);color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">4</div><div><strong>Generate &amp; Download ZIP</strong><br><span class="text-muted text-sm">Semua dokumen siap dalam satu klik</span></div></div>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="card-header">
      <div class="card-icon" style="background:#FEF9E7">⚡</div>
      <div><h3>Aksi Cepat</h3><p>Shortcut menu utama</p></div>
    </div>
    <div class="card-body">
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn btn-primary" style="justify-content:flex-start" onclick="navigateTo('template')">📤 Upload Template Baru</button>
        <button class="btn btn-secondary" style="justify-content:flex-start" onclick="navigateTo('panduan')">📖 Lihat Panduan Arguments</button>
        <button class="btn btn-secondary" style="justify-content:flex-start" onclick="navigateTo('master')">🗄️ Kelola Data Master</button>
        <button class="btn btn-primary"   style="justify-content:flex-start" onclick="navigateTo('perjalanan')">✈️ Buat Perjalanan Dinas</button>
        <button class="btn btn-primary"   style="justify-content:flex-start" onclick="navigateTo('generate')">⚡ Generate Dokumen</button>
      </div>
    </div>
  </div>
</div>`;

// ── Helper to render a panduan arg-section ──────────────────
function argSection(icon, bg, title, desc, rows, extraAlert) {
  const rowsHtml = rows.map(([code, badge, badgeClass, desc2, ex]) => `
    <tr class="panduan-row">
      <td><code class="arg-code">{{${code}}}</code></td>
      <td><span class="badge badge-${badgeClass}">${badge}</span></td>
      <td>${desc2}</td>
      <td class="text-sm text-muted">${ex}</td>
    </tr>`).join('');
  return `
  <div class="arg-section">
    <div class="arg-section-header">
      <div class="arg-section-icon" style="background:${bg}">${icon}</div>
      <div><div class="arg-section-title">${title}</div><div class="arg-section-desc">${desc}</div></div>
    </div>
    ${extraAlert || ''}
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th width="220">Argument</th><th width="110">Tipe</th><th>Deskripsi</th><th>Contoh Nilai</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table></div></div>
  </div>`;
}

PAGES.panduan = `
<div class="alert alert-info mb-6">
  💡 Gunakan placeholder di bawah dalam template .docx dengan format <strong>{{nama_argument}}</strong>. Sistem otomatis mengisi nilai yang sesuai saat generate dokumen.
</div>
<div class="card mb-6">
  <div class="card-body" style="padding:16px 22px">
    <div class="flex justify-between items-center" style="flex-wrap:wrap;gap:12px">
      <div class="search-bar"><span>🔍</span><input type="text" id="panduan-search" placeholder="Cari argument... (misal: nama, tanggal, total)"></div>
      <div class="flex gap-2" style="flex-wrap:wrap">
        <span class="badge badge-auto">🔄 Auto-fill</span>
        <span class="badge badge-computed">⚡ Computed</span>
        <span class="badge badge-manual">✏️ Manual</span>
        <span class="badge badge-loop">🔁 Loop</span>
        <span class="badge badge-static">🔒 Static</span>
      </div>
    </div>
  </div>
</div>

` + argSection('👤','#E8F5E9','Data Pegawai','Auto-fill dari database pegawai yang sedang login atau dipilih',[
  ['nama_lengkap','🔄 Auto','auto','Nama lengkap pegawai beserta gelar akademik','Dr. Ridwan Said, S.STP, M.Si'],
  ['nip','🔄 Auto','auto','Nomor Induk Pegawai (18 digit)','198209082001121001'],
  ['jabatan','🔄 Auto','auto','Jabatan struktural / fungsional pegawai','Plt. Sekretaris Dinas'],
  ['pangkat','🔄 Auto','auto','Pangkat pegawai','Pembina Tk.I'],
  ['golongan','🔄 Auto','auto','Golongan ruang pegawai','IV-b'],
  ['pangkat_golongan','⚡ Computed','computed','Gabungan pangkat dan golongan (format SPPD)','Pembina Tk.I / IV-b'],
  ['nomor_rekening','🔄 Auto','auto','Nomor rekening bank pegawai (untuk kwitansi)','0483610003349'],
  ['unit_kerja','🔄 Auto','auto','Nama unit kerja / SKPD pegawai','Dinas Kebudayaan Kab. Bogor'],
]) + argSection('🏛️','#E3F2FD','Data Unit Kerja & Instansi','Auto-fill dari database unit kerja — header surat, penandatangan, dll',[
  ['nama_dinas','🔒 Static','static','Nama dinas lengkap','DINAS KEBUDAYAAN'],
  ['alamat_dinas','🔒 Static','static','Alamat lengkap kantor dinas','Vivo Mall Lantai 1 Jl. Raya Jakarta - Bogor Km. 50...'],
  ['kota','🔒 Static','static','Kota/kabupaten lokasi unit kerja','Cibinong'],
  ['skpd','🔄 Auto','auto','Nama SKPD untuk kolom pembebanan anggaran','Dinas Kebudayaan dan Pariwisata Kabupaten Bogor'],
  ['instansi_pembayar','🔒 Static','static','Nama instansi di kwitansi baris "Sudah terima dari"','PEMERINTAH KABUPATEN BOGOR'],
  ['pejabat_ppk','🔒 Static','static','Jabatan Pejabat Pembuat Komitmen (untuk SPPD)','Sekretaris Dinas Kebudayaan'],
  ['nama_ppk','🔒 Static','static','Nama lengkap PPK penandatangan SPPD','Dr Ridwan Said, S.STP, M. Si.'],
  ['nip_ppk','🔒 Static','static','NIP Pejabat Pembuat Komitmen','198209082001121001'],
  ['nama_kepala','🔒 Static','static','Nama Kepala Dinas (penandatangan Surat Tugas)','—'],
  ['nip_kepala','🔒 Static','static','NIP Kepala Dinas','—'],
  ['nama_bendahara','🔒 Static','static','Nama Bendahara Pengeluaran (untuk Rekap Belanja)','YUSUF JUNAEDI'],
  ['nip_bendahara','🔒 Static','static','NIP Bendahara Pengeluaran','198208122009011003'],
]) + argSection('✏️','#FFF3E0','Data Perjalanan — Input Manual','Diisi oleh user saat membuat form perjalanan dinas',[
  ['nomor','✏️ Manual','manual','Nomor surat — dipakai di semua dokumen satu sesi','800.1.11.1/1338-Sekretariat'],
  ['kode_no','✏️ Manual','manual','Kode nomor di pojok kiri SPPD','—'],
  ['lembar_ke','⚡ Computed','computed','Nomor lembar SPPD — otomatis 1 dan 2 saat generate','1 atau 2'],
  ['tanggal_surat','✏️ Manual','manual','Tanggal surat dibuat (bukan tanggal berangkat)','02 Januari 2026'],
  ['tanggal_berangkat','✏️ Manual','manual','Tanggal mulai perjalanan dinas','15 April 2026'],
  ['tanggal_kembali','✏️ Manual','manual','Tanggal selesai / kembali dari perjalanan','15 April 2026'],
  ['alat_angkutan','✏️ Manual','manual','Alat angkutan yang digunakan','Kendaraan Roda 4'],
  ['tingkat_biaya','⚡ Computed','computed','Tingkat biaya perjalanan dari jenis perjalanan yang dipilih','Dalam Daerah'],
  ['tujuan','✏️ Manual','manual','Kecamatan tujuan (dalam daerah) — bisa dioverride manual pakai nama tempat spesifik (field "Nama Tempat"), atau alamat lengkap (luar daerah/provinsi)','Kantor Kecamatan Kemang / Kecamatan Tenjolaya'],
  ['tempat_kedudukan','🔄 Auto','auto','Tempat kedudukan / asal keberangkatan (dari unit kerja)','Sukaraja'],
  ['maksud_perjalanan','✏️ Manual','manual','Maksud perjalanan dinas (untuk SPPD item 4)','Kegiatan Survei Pembuatan Kujang...'],
  ['dasar','✏️ Manual','manual','Dasar penugasan (untuk Surat Tugas, teks bebas)','Dalam rangka pelaksanaan program kerja...'],
  ['deskripsi_tugas','✏️ Manual','manual','Deskripsi tugas yang diperintahkan (untuk Surat Tugas)','Koordinasi Perencanaan Pengembangan Pariwisata...'],
  ['kode_rekening_sipd','✏️ Manual','manual','Kode rekening kegiatan di SIPD (bukan rekening bank) — dropdown atau manual','5.1.02.04.001.00003'],
  ['nama_pptk','✏️ Manual','manual','Nama PPTK penandatangan bagian pergerakan SPPD (pilih dari pegawai)','Romadhoni S Subekti, S.St. Par., M.M. Par.'],
  ['nip_pptk','🔄 Auto','auto','NIP PPTK — terisi otomatis saat nama PPTK dipilih','197808172005011016'],
]) + argSection('⚡','#EBF3FD','Computed Arguments','Dihitung otomatis oleh sistem — tidak perlu diisi manual',[
  ['lama_perjalanan','⚡ Computed','computed','Lama perjalanan + terbilang<br><span class="text-muted text-sm">tanggal_kembali − tanggal_berangkat + 1</span>','1 (Satu) Hari'],
  ['hari_tanggal_tugas','⚡ Computed','computed','Rangkaian hari dan tanggal untuk Surat Tugas<br><span class="text-muted text-sm">Nama hari + format tanggal lengkap</span>','hari Rabu, tanggal 15 April 2026'],
  ['kota_tanggal','⚡ Computed','computed','Baris kota dan tanggal untuk TTD<br><span class="text-muted text-sm">unit_kerja.kota + ", " + tanggal_surat</span>','Cibinong, 01 Oktober 2025'],
  ['untuk_pembayaran','⚡ Computed','computed','Teks "Untuk Pembayaran" di kwitansi<br><span class="text-muted text-sm">"Biaya Uang Harian [dan Transport] Perjalanan Dinas [jenis] ke [tujuan]" — [tujuan] ikut nama tempat manual kalau diisi</span>','Biaya Uang Harian dan Transport Perjalanan Dinas Dalam Daerah ke Kantor Kecamatan Kemang'],
  ['uang_harian','⚡ Computed','computed','Nominal uang harian per peserta<br><span class="text-muted text-sm">tarif_uang_harian[jenis_perjalanan] — bisa dioverride manual di Step 1 (field "Uang Harian")</span>','Rp 170.000'],
  ['transport','⚡ Computed','computed','Total transport per peserta (0 jika tidak dapat)<br><span class="text-muted text-sm">nominal_transport × jumlah_kali × lama_perjalanan</span>','Rp 600.000'],
  ['total','⚡ Computed','computed','Total per peserta (kwitansi)<br><span class="text-muted text-sm">uang_harian + transport</span>','Rp 310.000'],
  ['total_terbilang','⚡ Computed','computed','Total per peserta dalam kata-kata Bahasa Indonesia','Tiga Ratus Sepuluh Ribu Rupiah'],
  ['grand_total','⚡ Computed','computed','Total keseluruhan semua peserta (Rekap Belanja)<br><span class="text-muted text-sm">SUM semua total peserta</span>','Rp 1.660.000'],
  ['grand_total_terbilang','⚡ Computed','computed','Grand total dalam kata-kata Bahasa Indonesia','Satu Juta Enam Ratus Enam Puluh Ribu Rupiah'],
  ['nominal','⚡ Computed','computed','Total format angka di kwitansi (tanpa "Rp")','310,000'],
]) + argSection('📊','#F3E5F5','Rekap Belanja & Anggaran','Khusus template Rekap — auto-fill dari kode rekening SIPD',[
  ['program','🔄 Auto','auto','Nama program dari kode rekening SIPD','Penunjang Urusan Pemerintahan Daerah Kabupaten/Kota'],
  ['kegiatan','🔄 Auto','auto','Nama kegiatan dari kode rekening SIPD','Perencanaan, Penganggaran dan Evaluasi Kinerja Perangkat Daerah'],
  ['sub_kegiatan','🔄 Auto','auto','Nama sub kegiatan dari kode rekening SIPD','Evaluasi Kinerja Perangkat Daerah'],
  ['nomor_sppd','🔄 Auto','auto','Nomor SPPD (sama dengan {{nomor}})','800.1.11.1/1338-Sekretariat'],
  ['tujuan_perjalanan','⚡ Computed','computed','Deskripsi tujuan lengkap untuk rekap<br><span class="text-muted text-sm">Gabungan: deskripsi_tugas + hari_tanggal + alamat tujuan</span>','Koordinasi Terkait... pada hari Selasa, 30 Desember 2025, di Jl. Medan Merdeka Barat...'],
  ['tanggal_rekap','🔄 Auto','auto','Tanggal rekap belanja (sama dengan tanggal_berangkat)','30 Desember 2025'],
  ['kota_tanggal_rekap','⚡ Computed','computed','Baris kota dan tanggal di TTD rekap belanja','Cibinong, 30 Desember 2025'],
]) + argSection('📄','#E8F5E9','Kwitansi Per Halaman (1–3 peserta)','Argument untuk template kwitansi dengan layout 1 lembar = 1–3 peserta. Gunakan suffix _1, _2, _3 untuk masing-masing kwitansi di halaman yang sama.',
[
  ['nama_penerima_1','📄 Halaman','halaman','Nama penerima kwitansi slot 1','Romadhoni S Subekti...'],
  ['nip_penerima_1','📄 Halaman','halaman','NIP penerima slot 1','197808172005011016'],
  ['total_peserta_1','📄 Halaman','halaman','Total slot 1 (format Rp)','Rp 310.000'],
  ['total_peserta_terbilang_1','📄 Halaman','halaman','Total slot 1 terbilang','Tiga Ratus Sepuluh Ribu Rupiah'],
  ['nominal_peserta_1','📄 Halaman','halaman','Total slot 1 format angka','310,000'],
  ['untuk_pembayaran_1','📄 Halaman','halaman','Teks "Untuk Pembayaran" slot 1','Biaya Uang Harian...'],
  ['rekening_penerima_1','📄 Halaman','halaman','Rekening bank slot 1','0483210024282'],
  ['jumlah_kwitansi_halaman','📄 Halaman','halaman','Jumlah peserta di halaman ini (1–3) — sistem otomatis hapus blok kosong','2'],
  ['nama_penerima_2','📄 Halaman','halaman','Nama penerima kwitansi slot 2','—'],
  ['nama_penerima_3','📄 Halaman','halaman','Nama penerima kwitansi slot 3','—'],
  ['halaman_ke','📄 Halaman','halaman','Nomor halaman kwitansi (1, 2, 3...)','1'],
  ['total_halaman','📄 Halaman','halaman','Total halaman kwitansi yang digenerate','2'],
],
'<div class="alert alert-info">💡 Tidak perlu tag <strong>{{#ada_peserta_2}}</strong> di template. Sistem otomatis menghapus blok kwitansi 2 dan 3 jika peserta kurang dari 3.</div>'
) + argSection('🔁','#EDE7F6','Loop Peserta — Kwitansi (1 file/orang)','Argument ini tersedia pada template kwitansi dengan layout <strong>1 lembar = 1 peserta</strong>. Template di-render N kali sesuai jumlah peserta.',
[
  ['nama_penerima','🔁 Loop','loop','Nama lengkap peserta (iterasi saat ini)','Romadhoni S Subekti, S.St. Par., M.M. Par.'],
  ['nip_penerima','🔁 Loop','loop','NIP peserta (iterasi saat ini)','197808172005011016'],
  ['jabatan_penerima','🔁 Loop','loop','Jabatan peserta (iterasi saat ini)','Plt. Kepala Sub Bagian Umum'],
  ['rekening_penerima','🔁 Loop','loop','Nomor rekening bank peserta (iterasi saat ini)','0483210024282'],
  ['uang_harian_peserta','🔁 Loop','loop','Uang harian peserta ini (format Rp)','Rp 170.000'],
  ['transport_peserta','🔁 Loop','loop','Transport peserta ini (0 jika tidak dapat transport)','Rp 140.000'],
  ['total_peserta','🔁 Loop','loop','Total peserta ini (uang harian + transport)','Rp 310.000'],
  ['total_peserta_terbilang','🔁 Loop','loop','Total peserta ini dalam kata-kata Bahasa Indonesia','Tiga Ratus Sepuluh Ribu Rupiah'],
  ['nominal_peserta','🔁 Loop','loop','Total peserta format angka untuk kwitansi','310,000'],
  ['urutan_peserta','🔁 Loop','loop','Nomor urut peserta dalam daftar (1, 2, 3...)','1'],
],
'<div class="alert alert-warning">⚠️ Argument loop hanya berlaku pada template kwitansi dengan layout <strong>1 lembar = 1 peserta</strong>. Peserta diurutkan berdasarkan golongan tertinggi ke terendah.</div>'
) + argSection('📋','#E8F8F5','Tabel Peserta — SPPD & Surat Tugas','Argument untuk menyisipkan daftar peserta di dokumen non-loop',[
  ['peserta_table','⚡ Computed','computed','Tabel pengikut SPPD (nama | pangkat/gol | jabatan) — dirender otomatis, diurutkan golongan tertinggi','Tabel otomatis'],
  ['jumlah_peserta','⚡ Computed','computed','Jumlah total peserta perjalanan dinas','2'],
  ['nama_peserta_1','⚡ Computed','computed','Nama peserta urutan ke-1 (golongan tertinggi)','Romadhoni S Subekti...'],
  ['nip_gol_peserta_1','⚡ Computed','computed','NIP / Golongan peserta ke-1 (format SPPD)','197808172005011016 / IV-a'],
  ['jabatan_peserta_1','⚡ Computed','computed','Jabatan peserta ke-1 (kosong jika belum diisi di database)','Plt. Kepala Sub Bagian Umum'],
]) + `
<div class="card" style="border-left:4px solid var(--navy)">
  <div class="card-body">
    <h3 style="margin-bottom:14px;font-size:14px">📌 Catatan Penting Penggunaan Template</h3>
    <div style="display:flex;flex-direction:column;gap:10px;font-size:13px;color:var(--text-2)">
      <div>1. Semua placeholder ditulis <strong>{{nama_argument}}</strong> — huruf kecil, underscore sebagai spasi, tanpa spasi di dalam kurung kurawal.</div>
      <div>2. Template kwitansi default: <strong>1 lembar = 1–3 peserta</strong> — gunakan <code style="background:#f0f3f9;padding:1px 5px;border-radius:3px">{{nama_penerima_1}}</code>, <code style="background:#f0f3f9;padding:1px 5px;border-radius:3px">{{nama_penerima_2}}</code>, <code style="background:#f0f3f9;padding:1px 5px;border-radius:3px">{{nama_penerima_3}}</code>. Untuk 1 file per orang, pilih layout <strong>1 lembar = 1 peserta</strong> saat upload.</div>
      <div>3. SPPD otomatis di-generate <strong>2 lembar</strong> — cukup satu template, sistem loop 2x dengan <code style="background:#f0f3f9;padding:1px 5px;border-radius:3px">{{lembar_ke}}</code> berbeda.</div>
      <div>4. <code style="background:#f0f3f9;padding:1px 5px;border-radius:3px">{{nomor}}</code> dan <code style="background:#f0f3f9;padding:1px 5px;border-radius:3px">{{nomor_sppd}}</code> mengambil nilai yang sama — nomor surat yang diinput saat membuat perjalanan dinas.</div>
      <div>5. <code style="background:#f0f3f9;padding:1px 5px;border-radius:3px">{{kode_rekening_sipd}}</code> merujuk kode anggaran di SIPD, <strong>bukan</strong> nomor rekening bank. Untuk rekening bank pegawai gunakan <code style="background:#f0f3f9;padding:1px 5px;border-radius:3px">{{nomor_rekening}}</code>.</div>
      <div>6. Untuk tabel peserta yang jumlahnya bervariasi, gunakan <code style="background:#f0f3f9;padding:1px 5px;border-radius:3px">{{peserta_table}}</code> agar tabel menyesuaikan otomatis.</div>
    </div>
  </div>
</div>`;

PAGES.template = `
<div class="grid-2" style="align-items:start">
  <div>
    <div class="card mb-4">
      <div class="card-header">
        <div class="card-icon" style="background:#EBF3FD">📤</div>
        <div><h3>Upload Template Baru</h3><p>File .docx dengan placeholder {{argument}}</p></div>
      </div>
      <div class="card-body">
        <div class="upload-zone" id="upload-zone">
          <input type="file" class="upload-input" id="file-input" accept=".docx">
          <div class="upload-icon">📄</div>
          <div class="upload-title">Drag &amp; drop file .docx di sini</div>
          <div class="upload-desc">atau klik untuk pilih file</div>
        </div>
        <div id="upload-status" style="margin-top:12px"></div>
      </div>
    </div>
    <div class="card" id="upload-form" style="display:none">
      <div class="card-header">
        <div class="card-icon" style="background:#E8F5E9">⚙️</div>
        <div><h3>Konfigurasi Template</h3><p id="tf-filename" class="font-mono" style="font-size:11px"></p></div>
      </div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">Nama Template *</label>
          <input type="text" class="form-control" id="tf-nama" placeholder="cth: Kwitansi Perjalanan Dinas">
        </div>
        <div class="form-group">
          <label class="form-label">Jenis Dokumen</label>
          <select class="form-control" id="tf-jenis" onchange="onTemplateJenisChange()">
            <option value="kwitansi">🧾 Kwitansi</option>
            <option value="sppd">📋 SPPD</option>
            <option value="surat_tugas">📝 Surat Tugas</option>
            <option value="rekap_belanja">📊 Rekap Belanja</option>
            <option value="custom">📁 Custom</option>
          </select>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Scope</label>
            <select class="form-control" id="tf-scope">
              <option value="global">🌐 Global (semua user)</option>
              <option value="personal">👤 Personal (saya saja)</option>
            </select>
          </div>
          <div class="form-group" id="tf-kwitansi-layout-wrap">
            <label class="form-label">Layout Kwitansi</label>
            <select class="form-control" id="tf-kwitansi-layout">
              <option value="per_halaman">📄 1 lembar = 1–3 peserta (default)</option>
              <option value="per_peserta">🔁 1 lembar = 1 peserta (1 file/orang)</option>
            </select>
          </div>
          <div class="form-group" id="tf-iterable-wrap">
            <label class="form-label">Loop per Peserta?</label>
            <div style="display:flex;align-items:center;gap:10px;margin-top:10px">
              <input type="checkbox" id="tf-iterable" style="width:16px;height:16px;cursor:pointer">
              <label for="tf-iterable" style="cursor:pointer;font-size:13px;color:var(--text-2)">Ya, render per peserta</label>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Deskripsi</label>
          <input type="text" class="form-control" id="tf-deskripsi" placeholder="Opsional — deskripsi singkat template">
        </div>
        <div class="form-group">
          <label class="form-label">Placeholder Terdeteksi</label>
          <div class="chips" id="tf-placeholders"></div>
          <div class="text-sm text-muted" style="margin-top:6px">Klik ✕ untuk hapus placeholder yang tidak relevan</div>
        </div>
        <div class="form-group">
          <label class="form-label">Tambah Placeholder Manual</label>
          <div class="flex gap-2">
            <input type="text" class="form-control" id="manual-ph" placeholder="nama_argument (tanpa kurung kurawal)" onkeydown="if(event.key==='Enter')addManualPlaceholder()">
            <button class="btn btn-secondary" onclick="addManualPlaceholder()">+ Tambah</button>
          </div>
        </div>
        <div class="flex gap-2" style="justify-content:flex-end">
          <button class="btn btn-secondary" onclick="document.getElementById('upload-form').style.display='none'">Batal</button>
          <button class="btn btn-primary" onclick="saveTemplateForm()">💾 Simpan Template</button>
        </div>
      </div>
    </div>
  </div>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h3 style="font-size:15px;font-weight:700">Template Tersimpan</h3>
      <span class="badge badge-auto" id="template-count">0 template</span>
    </div>
    <div id="template-list">
      <div class="empty-state">
        <div class="empty-state-icon">📄</div>
        <div class="empty-state-title">Belum ada template</div>
        <div class="empty-state-desc">Upload file .docx untuk mulai</div>
      </div>
    </div>
  </div>
</div>`;

PAGES.master = `
<div class="tabs">
  <button class="tab-btn active" onclick="switchTab('unit-kerja',this)">🏛️ Unit Kerja</button>
  <button class="tab-btn" onclick="switchTab('pegawai',this)">👤 Pegawai</button>
  <button class="tab-btn" onclick="switchTab('tarif',this)">💰 Tarif Perjalanan</button>
  <button class="tab-btn" onclick="switchTab('kecamatan',this)">🗺️ Kecamatan &amp; Transport</button>
  <button class="tab-btn" onclick="switchTab('kota-tujuan',this)">🏙️ Kota Tujuan</button>
  <button class="tab-btn" onclick="switchTab('sipd',this)">📑 Kode Rekening SIPD</button>
</div>
<div id="tab-unit-kerja" class="tab-pane active"></div>
<div id="tab-pegawai"    class="tab-pane"></div>
<div id="tab-tarif"      class="tab-pane"></div>
<div id="tab-kecamatan"  class="tab-pane"></div>
<div id="tab-kota-tujuan" class="tab-pane"></div>
<div id="tab-sipd"       class="tab-pane"></div>`;

PAGES.perjalanan = `<div id="perjalanan-container"></div>`;

PAGES.generate = `<div id="generate-container"></div>`;

PAGES.rekap = `<div id="rekap-container"></div>`;

PAGES['surat-tugas-ai'] = `<div id="st-ai-container"></div>`;

// ── Page Loader ──────────────────────────────────────────
function loadPage(pageId) {
  const container = document.getElementById('main-content');
  container.innerHTML = PAGES[pageId] ||
    `<div class="empty-state"><div class="empty-state-icon">🚧</div>
     <div class="empty-state-title">Halaman belum tersedia</div></div>`;

  if (pageId === 'template') {
    initTemplateUpload();
    renderTemplateList();
    updateTemplateBadge();
  }
  if (pageId === 'panduan')    initPanduanSearch();
  if (pageId === 'dashboard')  updateStats();
  if (pageId === 'master')     renderUnitKerja();
  if (pageId === 'perjalanan') { PJD.reset(); renderPerjalananList(); }
  if (pageId === 'generate')   renderGeneratePage();
  if (pageId === 'rekap')      renderRekapPage();
  if (pageId === 'surat-tugas-ai')   renderSuratTugasAI();
}

function initTemplateUpload() {
  const zone = document.getElementById('upload-zone');
  if (!zone) return;
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleTemplateUpload(file);
  });
  const fi = document.getElementById('file-input');
  if (fi) fi.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleTemplateUpload(file);
    fi.value = '';
  });
}

// ─── STATS ───────────────────────────────────────────────
function updateStats() {
  const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  set('stat-templates',  AppState.templates.length);
  set('stat-perjalanan', DB.getArr(KEYS.perjalanan).length);
  set('stat-pegawai',    DB.getArr(KEYS.pegawai).length);
  set('stat-generated',  DB.getArr(KEYS.generated).length);
}

// ─── ROUTER ──────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard:  { title: 'Dashboard',           sub: 'Selamat datang di Sistem Surat Perjalanan Dinas' },
  panduan:    { title: 'Panduan Arguments',    sub: 'Referensi lengkap placeholder untuk template .docx' },
  template:   { title: 'Kelola Template',      sub: 'Upload dan manajemen template dokumen .docx' },
  master:     { title: 'Data Master',          sub: 'Pegawai, unit kerja, tarif, dan kode rekening' },
  perjalanan: { title: 'Perjalanan Dinas',     sub: 'Buat dan kelola perjalanan dinas' },
  generate:   { title: 'Generate Dokumen',     sub: 'Buat dokumen perjalanan dinas' },
  'surat-tugas-ai' : {title : 'Surat Tugas AI', sub   : 'Draft surat dengan bantuan Gemini — review & generate .docx'
},
  rekap           : { title: 'Rekap Rincian', sub: 'Generate laporan rekap rincian perjalanan dinas (.xlsx)' },
};

function navigateTo(pageId) {
  // Nav active state
  document.querySelectorAll('.nav-item[data-page]').forEach(n => {
    n.classList.toggle('active', n.dataset.page === pageId);
  });
  // Topbar
  const info = PAGE_TITLES[pageId] || { title: pageId, sub: '' };
  document.getElementById('topbar-title').textContent = info.title;
  document.getElementById('topbar-subtitle').textContent = info.sub;
  // Inject page content
  loadPage(pageId);
  history.pushState({}, '', '#' + pageId);
}

async function initUserBar() {
  if (typeof Auth === 'undefined') return;
  const user = await Auth.getUser();
  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');
  const avatarEl = document.getElementById('user-avatar');
  if (!user) {
    if (nameEl) nameEl.textContent = 'Mode lokal';
    if (emailEl) emailEl.textContent = 'Tanpa login';
    return;
  }
  if (nameEl) nameEl.textContent = Auth.displayName(user);
  if (emailEl) emailEl.textContent = user.email || '';
  if (avatarEl) {
    const initial = (Auth.displayName(user)[0] || '?').toUpperCase();
    avatarEl.textContent = initial;
  }
}

function setAppLoading(show, text) {
  const el = document.getElementById('app-loading');
  if (!el) return;
  el.classList.toggle('hidden', !show);
  const msg = el.querySelector('.app-loading-text');
  if (msg && text) msg.textContent = text;
}

document.addEventListener('DOMContentLoaded', async () => {
  setAppLoading(true, 'Memuat data...');
  try {
    if (typeof Auth !== 'undefined') {
      await Auth.requireAuth();
      await initUserBar();
    }
    await DB.init();
    updateCloudBadge();
  } catch (err) {
    console.error(err);
    toast('Gagal memuat data: ' + (err.message || 'unknown'), 'error', 5000);
  } finally {
    setAppLoading(false);
  }

  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });
  const hash = location.hash.replace('#', '') || 'dashboard';
  navigateTo(hash);
});

function updateCloudBadge() {
  const el = document.getElementById('cloud-sync-badge');
  if (!el) return;
  if (DB.usesCloud()) {
    el.textContent = '☁️ Cloud';
    el.title = 'Data tersimpan di Supabase';
    el.style.display = '';
  } else {
    el.textContent = '💾 Lokal';
    el.title = 'Data di browser (login + Supabase untuk sinkronisasi)';
    el.style.display = '';
  }
}
