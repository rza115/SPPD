/**
 * template-storage.js — File template .docx di Supabase Storage
 * Metadata template (tanpa file) tetap di sppd_user_store / localStorage.
 */

const TemplateStorage = {
  BUCKET: 'sppd-templates',

  canUse() {
    return typeof DB !== 'undefined' && DB.usesCloud() && typeof Auth !== 'undefined' && Auth.client();
  },

  _userId() {
    return DB._userId;
  },

  buildPath(templateId, fileName) {
    const uid = this._userId();
    if (!uid) throw new Error('User belum login');
    const safe = (fileName || 'template.docx').replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${uid}/${templateId}/${safe}`;
  },

  _sb() {
    const sb = Auth.client();
    if (!sb) throw new Error('Supabase tidak tersedia');
    return sb;
  },

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  },

  base64ToBlob(b64) {
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  },

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  },

  hasFile(template) {
    return !!(template?.storagePath || template?.fileData);
  },

  /** Upload file; kembalikan storagePath */
  async upload(file, templateId) {
    const path = this.buildPath(templateId, file.name);
    const { error } = await this._sb().storage.from(this.BUCKET).upload(path, file, {
      upsert: true,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    if (error) throw error;
    return path;
  },

  async downloadBase64(template) {
    if (template.fileData) return template.fileData;
    if (!template.storagePath) throw new Error('File template tidak ditemukan');

    const { data, error } = await this._sb().storage
      .from(this.BUCKET)
      .download(template.storagePath);
    if (error) throw error;

    const buffer = await data.arrayBuffer();
    return this.arrayBufferToBase64(buffer);
  },

  async remove(template) {
    if (!template?.storagePath || !this.canUse()) return;
    const { error } = await this._sb().storage.from(this.BUCKET).remove([template.storagePath]);
    if (error) console.warn('[TemplateStorage] remove failed', error);
  },

  /** Metadata saja — tanpa fileData */
  metaFromRecord(rec, storagePath, fileSize) {
    const { fileData, ...meta } = rec;
    return {
      ...meta,
      storagePath,
      fileSize: fileSize ?? meta.fileSize ?? null,
    };
  },

  /** Pindahkan template lama (base64 di DB) ke Storage */
  async migrateTemplatesList(templates) {
    if (!this.canUse() || !Array.isArray(templates)) return templates;

    let changed = false;
    const out = [];

    for (const t of templates) {
      if (!t.fileData || t.storagePath) {
        if (t.fileData && t.storagePath) {
          const { fileData, ...clean } = t;
          out.push(clean);
          changed = true;
        } else {
          out.push(t);
        }
        continue;
      }

      try {
        const blob = this.base64ToBlob(t.fileData);
        const file = new File([blob], t.fileName || 'template.docx', { type: blob.type });
        const storagePath = await this.upload(file, t.id);
        out.push(this.metaFromRecord(t, storagePath, blob.size));
        changed = true;
      } catch (err) {
        console.error('[TemplateStorage] migrate failed', t.id, err);
        out.push(t);
      }
    }

    if (changed) {
      DB.set(KEYS.templates, out);
      if (typeof toast === 'function') {
        const n = out.filter(x => x.storagePath).length;
        toast(`${n} template file dipindah ke Supabase Storage`, 'success', 5000);
      }
    }

    return out;
  },
};
