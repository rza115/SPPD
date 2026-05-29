/**
 * api/gemini.js — Vercel Serverless Function
 * Proxy ke Gemini API, menjaga API key tetap di server
 *
 * Env var yang dibutuhkan di Vercel:
 *   GEMINI_API_KEY = your_api_key_here
 *
 * POST /api/gemini
 * Body: { mode, keperluan, tujuan_instansi, peserta, tanggal, teks_existing? }
 * Response: { dasar, deskripsi_tugas } | { error }
 */

export default async function handler(req, res) {
  // ─── CORS ────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  // ─── API KEY CHECK ────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di Vercel' });

  // ─── PARSE BODY ───────────────────────────────────────────
  const { mode, keperluan, tujuan_instansi, peserta, tanggal, teks_existing } = req.body || {};
  if (!keperluan) return res.status(400).json({ error: 'Field "keperluan" wajib diisi' });

  // ─── BUILD PROMPT ─────────────────────────────────────────
  const prompt = buildPrompt({ mode, keperluan, tujuan_instansi, peserta, tanggal, teks_existing });

  // ─── CALL GEMINI ──────────────────────────────────────────
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini error:', errText);
      return res.status(502).json({ error: 'Gemini API error: ' + geminiRes.status });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Parse JSON dari Gemini
    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch {
      return res.status(502).json({ error: 'Gemini mengembalikan format tidak valid', raw: rawText });
    }

    if (!parsed.dasar || !parsed.deskripsi_tugas) {
      return res.status(502).json({ error: 'Respons Gemini tidak lengkap', raw: rawText });
    }

    return res.status(200).json({
      dasar           : parsed.dasar.trim(),
      deskripsi_tugas : parsed.deskripsi_tugas.trim(),
    });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── PROMPT BUILDER ───────────────────────────────────────
function buildPrompt({ mode, keperluan, tujuan_instansi, peserta, tanggal, teks_existing }) {
  const pesertaStr = Array.isArray(peserta) && peserta.length
    ? peserta.map((p, i) => `${i + 1}. ${p.nama} (${p.jabatan || p.golongan || '—'})`).join('\n')
    : 'Tidak disebutkan';

  if (mode === 'perbaiki' && teks_existing) {
    return `Kamu adalah asisten penulisan surat resmi pemerintah Indonesia.
Perbaiki dan formalkan teks berikut menjadi bahasa Indonesia yang baku dan resmi sesuai standar surat pemerintah.

Teks yang perlu diperbaiki:
"${teks_existing}"

Konteks tambahan:
- Keperluan: ${keperluan}
- Tujuan/Instansi tujuan: ${tujuan_instansi || 'Tidak disebutkan'}
- Tanggal pelaksanaan: ${tanggal || 'Tidak disebutkan'}
- Peserta:
${pesertaStr}

Hasilkan HANYA JSON berikut tanpa teks lain:
{
  "dasar": "Teks dasar penugasan yang formal (1-3 kalimat, mengacu pada program kerja dinas dan kegiatan yang relevan)",
  "deskripsi_tugas": "Teks deskripsi lengkap tugas yang diperintahkan (formal, menyebutkan tujuan spesifik, nama instansi tujuan, dan instruksi untuk melaporkan hasil kepada pimpinan)"
}`;
  }

  return `Kamu adalah asisten penulisan surat resmi pemerintah Indonesia.
Buatkan konten untuk Surat Perintah Tugas dengan bahasa Indonesia yang baku dan formal sesuai standar surat dinas pemerintah daerah.

Data perjalanan dinas:
- Keperluan/Kegiatan: ${keperluan}
- Tujuan/Instansi yang dikunjungi: ${tujuan_instansi || 'Tidak disebutkan'}
- Tanggal pelaksanaan: ${tanggal || 'Tidak disebutkan'}
- Pegawai yang ditugaskan:
${pesertaStr}

Hasilkan HANYA JSON berikut tanpa teks lain:
{
  "dasar": "Teks dasar penugasan yang formal (1-3 kalimat, dimulai dengan 'Dalam rangka pelaksanaan...' atau 'Menindaklanjuti...' atau sejenisnya, mengacu pada program kerja dinas)",
  "deskripsi_tugas": "Teks deskripsi lengkap tugas yang diperintahkan (formal, sebutkan kegiatan spesifik, nama instansi tujuan, waktu pelaksanaan, dan diakhiri dengan kalimat 'Melaporkan pelaksanaan kegiatan kepada pimpinan.')"
}`;
}
