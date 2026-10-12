'use strict';
// Who this app works for. Hospital staff sign in once with the account an
// administrator created for them in the admin portal; from then on the app
// knows its hospital, branch and the VR headsets assigned to it, and every
// visit goes to that hospital's dashboard.
//
// Sign-in, the hospital context and visit upload are Supabase functions
// (db/12_connected_kiosk.sql: app_sign_in / app_context / app_record_visit /
// app_sign_out) called with the public anon key — the same Supabase project
// the admin portal uses, so there is no separate server to configure.
//
// A sign-in never times out: it lasts until staff press "Sign out". If the
// account is later removed, the app keeps working, keeps visits queued and
// tells staff in Settings to sign in again.
//
// In the iPad / Android app the native layer signs in, keeps the token in the
// Keychain / app-private storage and uploads visits in the background. In a
// plain browser this file does it with fetch + localStorage.
window.KioskAccount = (() => {
  const cfg = window.KIOSK_CONFIG || {};
  const android = window.AndroidKiosk && {
    postMessage: m => new Promise(resolve => {
      // Network calls go through postAsync so the WebView never blocks on them.
      if (window.AndroidKiosk.postAsync) {
        const id = 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2);
        (window.__kioskReplies ||= {})[id] = resolve;
        window.AndroidKiosk.postAsync(JSON.stringify(m), id);
      } else resolve(JSON.parse(window.AndroidKiosk.post(JSON.stringify(m)) || 'null'));
    })
  };
  const bridge = (window.__IMMERSIVE_SMILE_NATIVE__ && window.webkit?.messageHandlers?.kiosk) || android;
  const STORE = 'is.account';
  const read = () => { try { return JSON.parse(localStorage.getItem(STORE) || 'null') || {} } catch (e) { return {} } };
  const write = v => { try { localStorage.setItem(STORE, JSON.stringify(v)) } catch (e) {} };
  const post = m => { try { return Promise.resolve(bridge.postMessage(m)).catch(() => null) } catch (e) { return Promise.resolve(null) } };
  const listeners = new Set();
  let state = { signedIn: false, context: null, userId: null, notice: null };

  function set(next) {
    state = { ...state, ...next };
    listeners.forEach(fn => { try { fn(state) } catch (e) {} });
  }
  const OFFLINE = 'Can’t connect right now. Check the internet connection and try again.';

  // Browser mode: call a Supabase function with the public anon key.
  async function rpc(name, args) {
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return { ok: false, offline: true, error: OFFLINE };
    try {
      const res = await fetch(`${cfg.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers: { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${cfg.supabaseAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout?.(20000)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return { ok: false, offline: res.status >= 500, error: res.status === 404 ? 'Sign-in isn’t set up yet. Ask your administrator to finish the database update.' : OFFLINE };
      return data || { ok: false, error: OFFLINE };
    } catch (e) {
      return { ok: false, offline: true, error: OFFLINE };
    }
  }

  async function load() {
    if (bridge) {
      const r = (await post({ type: 'account' })) || {};
      set({ signedIn: !!r.signedIn && !!r.context, context: r.context || null, userId: r.context?.user?.id || null, notice: r.notice || null });
    } else {
      const s = read();
      set({ signedIn: !!(s.token && s.context), context: s.context || null, userId: s.context?.user?.id || null, notice: s.notice || null });
    }
    return state;
  }

  async function signIn({ identifier, password }) {
    const device = { platform: bridge ? (android ? 'android-app' : 'ios-app') : 'web', model: navigator.userAgent.slice(0, 60) };
    let r;
    if (bridge) r = (await post({ type: 'signIn', identifier, password })) || { ok: false, error: OFFLINE };
    else {
      r = await rpc('app_sign_in', { p_identifier: identifier, p_password: password, p_device: device });
      if (r.ok) write({ token: r.token, context: r.context });
    }
    if (r.ok) set({ signedIn: true, context: r.context, userId: r.context?.user?.id || null, notice: null });
    return r;
  }

  // Headsets can be added, renamed or moved in the admin portal at any time.
  // Never signs out: a failed refresh keeps the last known hospital and headsets.
  async function refresh() {
    if (!state.signedIn) return state;
    let r;
    if (bridge) r = (await post({ type: 'refreshContext' })) || { ok: false, offline: true };
    else {
      r = await rpc('app_context', { p_token: read().token });
      if (r.ok) write({ ...read(), context: r.context, notice: null });
      else if (r.code === 'signed_out') write({ ...read(), notice: r.error });
    }
    if (r.ok && r.context) set({ context: r.context, userId: r.context.user?.id || null, notice: null });
    else if (r.code === 'signed_out') set({ notice: r.error || 'This sign-in was removed in the admin portal. Sign out and sign in again.' });
    return state;
  }

  async function signOut() {
    if (bridge) await post({ type: 'signOut' });
    else {
      const token = read().token;
      write({});
      if (token) rpc('app_sign_out', { p_token: token });
    }
    set({ signedIn: false, context: null, userId: null, notice: null });
  }

  // Browser mode only: one visit to the hospital's dashboard.
  async function uploadVisit(row) {
    if (bridge || !state.signedIn) return { ok: false, offline: true };
    const r = await rpc('app_record_visit', { p_token: read().token, p_visit: row });
    if (r.code === 'signed_out') { write({ ...read(), notice: r.error }); set({ notice: r.error }) }
    return r;
  }

  const ready = load();
  return {
    native: !!bridge,
    ready,
    get state() { return state },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    signIn, signOut, refresh, uploadVisit
  };
})();

// Android replies to postAsync by calling this with the request id and JSON.
window.__kioskReply = (id, json) => {
  const fn = window.__kioskReplies?.[id];
  if (!fn) return;
  delete window.__kioskReplies[id];
  try { fn(typeof json === 'string' ? JSON.parse(json || 'null') : json) } catch (e) { fn(null) }
};
