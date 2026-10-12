'use strict';
// Visit records: intake answers, session timing and the closing smile.
// Every change is saved on the device first and uploaded later, so a slow,
// paused or unreachable server never interrupts a visitor. Nothing here
// throws or shows errors — failures only leave records waiting in the queue.
// Visits go to the hospital the app is signed in to (Supabase app_record_visit),
// and each one stays with the staff account it was recorded under.
// Inside the iPad / Android app the native layer (SQLite + background sync) owns
// storage and upload; in a plain browser localStorage is used instead.
window.KioskData = (() => {
  // iPad app: WKScriptMessageHandler (returns a promise). Android app: @JavascriptInterface (returns JSON text).
  const android = window.AndroidKiosk && { postMessage: m => Promise.resolve(JSON.parse(window.AndroidKiosk.post(JSON.stringify(m)) || 'null')) };
  const bridge = (window.__IMMERSIVE_SMILE_NATIVE__ && window.webkit?.messageHandlers?.kiosk) || android;
  const account = () => window.KioskAccount?.state || {};
  const DRAFT = 'is.visit.draft', QUEUE = 'is.visit.queue', DEVICE = 'is.visit.device', LAST = 'is.visit.lastSync';
  let draft = null, clock = 0, syncing = false, lastError = null;

  const uuid = () => { try { if (crypto.randomUUID) return crypto.randomUUID() } catch (e) {} return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)) };
  const read = (key, fallback) => { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v) } catch (e) { return fallback } };
  const write = (key, value) => { try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(value)) } catch (e) {} };
  const post = message => { try { return Promise.resolve(bridge.postMessage(message)).catch(() => null) } catch (e) { return Promise.resolve(null) } };
  const seconds = () => Math.max(0, Math.round((Date.now() - clock) / 1000));

  function save() { if (!draft) return; if (bridge) post({ type: 'draft', record: draft }); else write(DRAFT, draft) }

  function deviceId() { let id = read(DEVICE); if (!id) { id = 'web-' + uuid(); write(DEVICE, id) } return id }

  function enqueue(record) {
    if (bridge) { post({ type: 'finish', record }); return }
    const queue = read(QUEUE, []);
    queue.push({ ...record, owner: record.owner || account().userId || null, device_id: deviceId(), platform: 'web', recorded_at: new Date().toISOString() });
    write(QUEUE, queue); write(DRAFT, null); flush();
  }

  // Browser fallback location; the iPad app attaches its own (with city/country).
  function locate() {
    if (bridge || !navigator.geolocation || !draft) return;
    const id = draft.client_id;
    try {
      navigator.geolocation.getCurrentPosition(p => {
        const target = draft?.client_id === id ? draft : null;
        const fields = { latitude: p.coords.latitude, longitude: p.coords.longitude, location_accuracy_m: Math.round(p.coords.accuracy), location_captured_at: new Date(p.timestamp).toISOString() };
        if (target) { Object.assign(target, fields); save() }
        else { const queue = read(QUEUE, []), row = queue.find(r => r.client_id === id); if (row && row.latitude == null) { Object.assign(row, fields); write(QUEUE, queue) } }
      }, () => {}, { timeout: 10000, maximumAge: 600000 });
    } catch (e) {}
  }

  // Uploads this account's waiting visits. Visits recorded under another
  // account wait until that account signs this kiosk in again.
  async function flush() {
    const me = account();
    if (bridge || syncing || !me.signedIn || !me.userId || navigator.onLine === false) return;
    syncing = true;
    try {
      for (const queued of read(QUEUE, [])) {
        if (queued.owner && queued.owner !== me.userId) continue;
        const { owner, ...row } = queued;
        const res = await window.KioskAccount.uploadVisit(row);
        if (!res?.ok) {
          if (!res || res.offline || res.code === 'signed_out') break; // offline or sign-in removed: keep everything, try later
          lastError = res.error; continue; // this one visit was refused; the rest still upload
        }
        lastError = null;
        write(QUEUE, read(QUEUE, []).filter(r => r.client_id !== queued.client_id)); write(LAST, Date.now());
      }
    } catch (e) {} finally { syncing = false }
  }

  // A draft left behind by a closed tab or crashed page becomes an interrupted visit.
  function recover() {
    if (bridge) { post({ type: 'ready' }); return }
    const orphan = read(DRAFT);
    if (orphan?.client_id) enqueue({ ...orphan, completion_status: 'interrupted' });
    flush();
  }

  addEventListener('online', flush);
  setInterval(() => { if (!bridge && read(QUEUE, []).length) flush() }, 60000);
  window.KioskAccount?.onChange(s => { if (s.signedIn) flush() });
  window.KioskAccount?.ready.then(recover);

  return {
    native: !!bridge,
    active: () => !!draft,
    current: () => draft,
    begin({ age, gender, stress, scene, mode, headset }) {
      draft = { client_id: uuid(), owner: account().userId || null, age, gender, initial_stress: stress, scene_index: scene.id, scene_name: scene.name, scene_label: scene.label, mode, metadata: headset ? { headset_id: headset.key, headset_name: headset.name, vr_device_id: headset.id } : {}, started_at: new Date().toISOString(), ended_at: null, duration_seconds: 0, feedback_score: null, feedback_at: null, completion_status: null };
      clock = Date.now(); save(); locate();
    },
    // Called while a world plays so a crash still leaves a usable duration.
    heartbeat() { if (!draft || draft.feedback_at || draft.completion_status) return; draft.duration_seconds = seconds(); draft.ended_at = new Date().toISOString(); save() },
    end() { if (!draft) return; draft.duration_seconds = seconds(); draft.ended_at = new Date().toISOString(); draft.completion_status = 'no_feedback'; save() },
    feedback(score, comment) { if (!draft) return; draft.feedback_score = score; draft.feedback_comment = comment || null; draft.feedback_at = new Date().toISOString(); draft.completion_status = 'completed'; save() },
    finish() { if (!draft) return; const record = { ...draft, completion_status: draft.completion_status || 'no_feedback' }; draft = null; enqueue(record) },
    async status() {
      if (bridge) return (await post({ type: 'status' })) || {};
      const me = account().userId, queue = read(QUEUE, []);
      const mine = queue.filter(r => !r.owner || r.owner === me).length;
      return { pending: mine, otherPending: queue.length - mine, lastSyncAt: read(LAST), lastError, deviceId: deviceId(), online: navigator.onLine };
    },
    async syncNow() { if (bridge) await post({ type: 'syncNow' }); else await flush() }
  };
})();
