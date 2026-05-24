/**
 * auth.js — Autentikasi Supabase (login, daftar, sesi, guard)
 */

const Auth = (() => {
  let _client = null;

  function config() {
    return window.SPPD_CONFIG || {};
  }

  function isConfigured() {
    const c = config();
    return !!(c.supabaseUrl && c.supabaseAnonKey);
  }

  function client() {
    if (!isConfigured()) return null;
    if (!_client) {
      _client = supabase.createClient(config().supabaseUrl, config().supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }
    return _client;
  }

  function friendlyError(err) {
    const msg = err?.message || String(err);
    const map = {
      'Invalid login credentials': 'Email atau kata sandi salah.',
      'Email not confirmed': 'Email belum dikonfirmasi. Periksa kotak masuk Anda.',
      'User already registered': 'Email sudah terdaftar. Silakan masuk.',
      'Password should be at least 6 characters': 'Kata sandi minimal 6 karakter.',
    };
    return map[msg] || msg;
  }

  async function getSession() {
    const sb = client();
    if (!sb) return null;
    const { data: { session }, error } = await sb.auth.getSession();
    if (error) throw new Error(friendlyError(error));
    return session;
  }

  async function getUser() {
    const session = await getSession();
    return session?.user ?? null;
  }

  async function signIn(email, password) {
    const sb = client();
    if (!sb) throw new Error('Supabase belum dikonfigurasi. Hubungi administrator.');
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendlyError(error));
    return data;
  }

  async function signUp(email, password, fullName) {
    const sb = client();
    if (!sb) throw new Error('Supabase belum dikonfigurasi. Hubungi administrator.');
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/login.html`,
      },
    });
    if (error) throw new Error(friendlyError(error));
    const needsConfirmation = !data.session && data.user && !data.user.confirmed_at;
    return { ...data, needsConfirmation };
  }

  async function signOut() {
    const sb = client();
    if (!sb) {
      window.location.href = 'login.html';
      return;
    }
    await sb.auth.signOut();
    window.location.href = 'login.html';
  }

  async function resetPassword(email) {
    const sb = client();
    if (!sb) throw new Error('Supabase belum dikonfigurasi.');
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login.html`,
    });
    if (error) throw new Error(friendlyError(error));
  }

  /** Blokir akses ke index.html jika belum login */
  async function requireAuth() {
    if (!isConfigured()) {
      console.warn('[SPPD] Supabase tidak dikonfigurasi — akses tanpa login (mode dev).');
      return null;
    }
    const session = await getSession();
    if (!session) {
      window.location.replace('login.html');
      return null;
    }
    return session;
  }

  function displayName(user) {
    return user?.user_metadata?.full_name
      || user?.email?.split('@')[0]
      || 'Pengguna';
  }

  return {
    isConfigured,
    getSession,
    getUser,
    signIn,
    signUp,
    signOut,
    resetPassword,
    requireAuth,
    displayName,
    client,
  };
})();

// Toast ringan (login.html & index.html)
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
