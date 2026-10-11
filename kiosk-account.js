'use strict';
// Who this kiosk works for. Hospital staff sign the kiosk in once; from then on
// it knows its hospital, branch and the VR headsets the admin portal assigned to
// it, and every visit is uploaded to that hospital's dashboard.
//
// In the iPad / Android app the native layer signs in, keeps the token in the
// Keychain / app-private storage and makes every backend call (no CORS, no token
// in JavaScript). In a plain browser this file does it with fetch + localStorage.
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
  const clean = url => String(url || '').trim().replace(/\/+$/, '').replace(/\/api$/, '');
  const listeners = new Set();
  let state = { apiBase: '', signedIn: false, context: null, userId: null };

  function nativeDefault() {
    try {
      return window.__IMMERSIVE_SMILE_NATIVE__?.apiBase || (window.AndroidKiosk?.config && JSON.parse(window.AndroidKiosk.config()).apiBase) || '';
    } catch (e) { return '' }
  }
  function set(next) {
    state = { ...state, ...next };
    listeners.forEach(fn => { try { fn(state) } catch (e) {} });
  }
  function message(status, body) {
    if (status === 0) return 'Can’t reach the server. Check the internet connection and the server address.';
    if (status === 401) return body?.message || 'That email or password isn’t right.';
    if (status === 403) return body?.message || 'This account can’t sign in a kiosk.';
    if (status === 404) return 'The server address doesn’t look right.';
    return body?.message || `The server returned an error (${status}).`;
  }
  async function request(path, { method = 'GET', body, token } = {}) {
    const s = read();
    const base = clean(s.apiBase || cfg.apiBase);
    if (!base) return { ok: false, status: 0, error: 'Set the server address first.' };
    try {
      const res = await fetch(base + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token || s.token ? { Authorization: `Bearer ${token || s.token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout?.(20000)
      });
      const data = await res.json().catch(() => null);
      return res.ok ? { ok: true, status: res.status, data } : { ok: false, status: res.status, error: message(res.status, data) };
    } catch (e) {
      return { ok: false, status: 0, error: message(0) };
    }
  }

  async function load() {
    if (bridge) {
      const r = (await post({ type: 'account' })) || {};
      set({ apiBase: r.apiBase || nativeDefault(), signedIn: !!r.signedIn && !!r.context, context: r.context || null, userId: r.context?.user?.id || null });
    } else {
      const s = read();
      set({ apiBase: clean(s.apiBase || cfg.apiBase), signedIn: !!(s.token && s.context), context: s.context || null, userId: s.context?.user?.id || null });
    }
    return state;
  }

  async function signIn({ apiBase, identifier, password }) {
    const base = clean(apiBase || state.apiBase);
    const device = { platform: bridge ? (android ? 'android-app' : 'ios-app') : 'web', model: navigator.userAgent.slice(0, 60) };
    if (bridge) {
      const r = (await post({ type: 'signIn', apiBase: base, identifier, password })) || { ok: false, error: message(0) };
      if (r.ok) set({ apiBase: base, signedIn: true, context: r.context, userId: r.context?.user?.id || null });
      return r;
    }
    write({ ...read(), apiBase: base });
    const r = await request('/api/kiosk/login', { method: 'POST', body: { identifier, password, device } });
    if (!r.ok) return r;
    write({ apiBase: base, token: r.data.access_token, context: r.data.context });
    set({ apiBase: base, signedIn: true, context: r.data.context, userId: r.data.context?.user?.id || null });
    return { ok: true, context: r.data.context };
  }

  // Headsets can be added, renamed or moved in the admin portal at any time.
  async function refresh() {
    if (!state.signedIn) return state;
    let r;
    if (bridge) r = (await post({ type: 'refreshContext' })) || { ok: false, status: 0 };
    else {
      r = await request('/api/kiosk/context');
      if (r.ok) { r.context = r.data; write({ ...read(), context: r.data }) }
    }
    if (r.ok && r.context) set({ context: r.context, userId: r.context.user?.id || null });
    else if (r.status === 401 || r.status === 403 || r.status === 404) {
      // The account was removed, deactivated or its hospital switched off.
      if (!bridge) write({ apiBase: read().apiBase });
      set({ signedIn: false, context: null, userId: null, reason: `This kiosk was signed out: ${(r.error || 'please sign in again.').replace(/^./, c => c.toLowerCase())}` });
    }
    return state;
  }

  async function signOut() {
    if (bridge) await post({ type: 'signOut' });
    else write({ apiBase: read().apiBase });
    set({ signedIn: false, context: null, userId: null, reason: null });
  }

  // Browser mode only: visit upload with the kiosk's token.
  async function uploadVisit(row) {
    if (bridge || !state.signedIn) return { ok: false, status: 0 };
    const r = await request('/api/kiosk/visits', { method: 'POST', body: row });
    if (r.status === 401 || r.status === 403) await refresh();
    return r;
  }

  const ready = load();
  return {
    native: !!bridge,
    ready,
    get state() { return state },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    signIn, signOut, refresh, uploadVisit,
    defaultServer: () => clean(state.apiBase || cfg.apiBase || nativeDefault())
  };
})();

// Android replies to postAsync by calling this with the request id and JSON.
window.__kioskReply = (id, json) => {
  const fn = window.__kioskReplies?.[id];
  if (!fn) return;
  delete window.__kioskReplies[id];
  try { fn(typeof json === 'string' ? JSON.parse(json || 'null') : json) } catch (e) { fn(null) }
};
