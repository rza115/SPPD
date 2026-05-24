/**
 * Generate js/config.js dari variabel lingkungan (Vercel build).
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY
 */
const fs = require('fs');
const path = require('path');

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || '';

const content = `/**
 * Auto-generated — jangan edit manual. Gunakan Vercel env vars atau config.example.js.
 */
window.SPPD_CONFIG = {
  supabaseUrl: ${JSON.stringify(url)},
  supabaseAnonKey: ${JSON.stringify(key)},
};
`;

const out = path.join(__dirname, '..', 'js', 'config.js');
fs.writeFileSync(out, content, 'utf8');
console.log('[build] js/config.js generated', url ? '(Supabase URL set)' : '(empty — set env vars)');
