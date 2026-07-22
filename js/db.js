/**
 * db.js — Lapisan data: cache + Supabase (dengan fallback localStorage)
 * Migrasi otomatis dari localStorage saat login pertama kali.
 */

const KEYS = {
  unitKerja : 'sppd_unit_kerja',
  pegawai   : 'sppd_pegawai',
  tarif     : 'sppd_tarif',
  kecamatan : 'sppd_kecamatan',
  kotaTujuan: 'sppd_kota_tujuan',
  sipd      : 'sppd_sipd',
  perjalanan: 'sppd_perjalanan',
  templates : 'sppd_templates',
  generated : 'sppd_generated',
};

const ALL_STORE_KEYS = Object.values(KEYS);

const KECAMATAN_SEED = [
  'Babakan Madang','Bojonggede','Caringin','Cariu','Ciampea',
  'Ciawi','Cibinong','Cibungbulang','Cigombong','Cigudeg',
  'Cijeruk','Cileungsi','Ciomas','Cisarua','Ciseeng',
  'Citeureup','Dramaga','Gunung Putri','Gunung Sindur','Jasinga',
  'Jonggol','Kemang','Klapanunggal','Leuwiliang','Leuwisadeng',
  'Megamendung','Nanggung','Pamijahan','Parung','Parung Panjang',
  'Rancabungur','Rumpin','Sukamakmur','Sukaraja','Sukajaya',
  'Tajurhalang','Tamansari','Tanjungsari','Tenjo','Tenjolaya',
];

// Preset kota besar untuk perjalanan luar kota/luar provinsi.
// Tarif transport PP diisi manual per kota di Data Master (default 0).
const KOTA_TUJUAN_SEED = [
  'Jakarta','Bandung','Surabaya','Semarang','Yogyakarta',
  'Medan','Makassar','Palembang','Surakarta (Solo)','Denpasar',
];

const DB = {
  _cache: {},
  _ready: false,
  _userId: null,
  _useCloud: false,
  _persistQueue: Promise.resolve(),

  genId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  },

  get(key) {
    if (Object.prototype.hasOwnProperty.call(this._cache, key)) {
      return this._cache[key];
    }
    return null;
  },

  getArr(key) {
    const v = this.get(key);
    return Array.isArray(v) ? v : [];
  },

  set(key, val) {
    this._cache[key] = val;
    if (this._useCloud) {
      this._queuePersist(key, val);
    } else {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (e) {
        console.error('[DB] localStorage write failed', key, e);
        if (typeof toast === 'function') {
          toast('Penyimpanan lokal penuh. Kurangi ukuran template atau gunakan Supabase.', 'error', 5000);
        }
      }
    }
  },

  isReady() {
    return this._ready;
  },

  usesCloud() {
    return this._useCloud;
  },

  _readLocal(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return undefined;
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  },

  _loadFromLocalStorage() {
    ALL_STORE_KEYS.forEach((key) => {
      const val = this._readLocal(key);
      if (val !== undefined) this._cache[key] = val;
    });
  },

  async _loadFromCloud() {
    const sb = Auth.client();
    if (!sb || !this._userId) return;

    const { data, error } = await sb
      .from('sppd_user_store')
      .select('store_key, data')
      .eq('user_id', this._userId);

    if (error) throw error;

    (data || []).forEach((row) => {
      this._cache[row.store_key] = row.data;
    });
  },

  _isEmptyValue(val) {
    if (val === null || val === undefined) return true;
    if (Array.isArray(val)) return val.length === 0;
    if (typeof val === 'object') return Object.keys(val).length === 0;
    return false;
  },

  _hasLocalData(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return !this._isEmptyValue(parsed);
    } catch {
      return false;
    }
  },

  async _migrateLocalToCloud() {
    const flagKey = `sppd_migrated_${this._userId}`;
    if (localStorage.getItem(flagKey)) return false;

    let migrated = false;
    const counts = {};

    for (const key of ALL_STORE_KEYS) {
      if (!this._hasLocalData(key)) continue;

      const localVal = this._readLocal(key);
      const cloudVal = this._cache[key];
      const cloudEmpty = this._isEmptyValue(cloudVal);

      if (cloudEmpty && !this._isEmptyValue(localVal)) {
        this._cache[key] = localVal;
        await this._persistNow(key, localVal);
        counts[key] = Array.isArray(localVal) ? localVal.length : 1;
        migrated = true;
      }
    }

    localStorage.setItem(flagKey, new Date().toISOString());

    if (migrated && typeof toast === 'function') {
      const parts = Object.entries(counts).map(([k, n]) => {
        const label = k.replace('sppd_', '').replace(/_/g, ' ');
        return `${label} (${n})`;
      });
      toast(`Data lokal dimigrasi ke cloud: ${parts.join(', ')}`, 'success', 6000);
    }

    return migrated;
  },

  _queuePersist(key, val) {
    this._persistQueue = this._persistQueue
      .then(() => this._persistNow(key, val))
      .catch((err) => {
        console.error('[DB] persist failed', key, err);
        if (typeof toast === 'function') {
          toast('Gagal menyimpan ke cloud: ' + (err.message || 'unknown'), 'error');
        }
      });
    return this._persistQueue;
  },

  async _persistNow(key, val) {
    const sb = Auth.client();
    if (!sb || !this._userId) return;

    const { error } = await sb.from('sppd_user_store').upsert(
      {
        user_id: this._userId,
        store_key: key,
        data: val,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,store_key' },
    );

    if (error) throw error;
  },

  async flush() {
    if (!this._useCloud) return;
    await this._persistQueue;
  },

  _seedKecamatan() {
    if (this.getArr(KEYS.kecamatan).length > 0) return;
    const data = KECAMATAN_SEED.map((nama, i) => ({
      id: 'kec_' + (i + 1),
      nama,
      tarif_transport: 0,
    }));
    this.set(KEYS.kecamatan, data);
  },

  _seedKotaTujuan() {
    if (this.getArr(KEYS.kotaTujuan).length > 0) return;
    const data = KOTA_TUJUAN_SEED.map((nama, i) => ({
      id: 'kota_' + (i + 1),
      nama,
      tarif_transport: 0,
    }));
    this.set(KEYS.kotaTujuan, data);
  },

  _seedTarif() {
    if (this.get(KEYS.tarif)) return;
    this.set(KEYS.tarif, {
      dalam_kota: { uang_harian: 0, label: 'Dalam Kota / Dalam Daerah', icon: '🏙️', tingkat: 'Dalam Daerah' },
      luar_kota: { uang_harian: 0, label: 'Luar Kota / Luar Daerah', icon: '🚗', tingkat: 'Luar Daerah' },
      luar_provinsi: { uang_harian: 0, label: 'Luar Provinsi', icon: '✈️', tingkat: 'Luar Provinsi' },
    });
  },

  async init() {
    if (this._ready) return;

    const user = typeof Auth !== 'undefined' ? await Auth.getUser() : null;
    this._userId = user?.id || null;
    this._useCloud = typeof Auth !== 'undefined' && Auth.isConfigured() && !!this._userId;

    if (this._useCloud) {
      await this._loadFromCloud();
      await this._migrateLocalToCloud();
    } else {
      this._loadFromLocalStorage();
    }

    this._seedKecamatan();
    this._seedKotaTujuan();
    this._seedTarif();

    // Default array kosong agar getArr konsisten
    ALL_STORE_KEYS.forEach((key) => {
      if (key === KEYS.tarif) return;
      if (!Object.prototype.hasOwnProperty.call(this._cache, key)) {
        this._cache[key] = [];
      }
    });

    if (typeof TemplateStorage !== 'undefined' && TemplateStorage.canUse()) {
      const templates = this.getArr(KEYS.templates);
      await TemplateStorage.migrateTemplatesList(templates);
    }

    this._ready = true;
  },
};
