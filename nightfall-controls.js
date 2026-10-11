"use strict";
// Uses the existing per-headset Nightfall transport. Never writes on mount/poll.
window.NightfallControls = (() => {
  let cleanup = () => {};
  function dispose() { cleanup(); cleanup = () => {}; }
  function mount(host, database, deviceId) {
    dispose();
    host.innerHTML = `<section class="nightfall-controls"><p class="eyebrow">STAFF · HEADSET CONTROLS</p><h3>Nightfall</h3><p id="nfStatus" role="status">Waiting for the headset’s Nightfall session…</p><p id="nfError" role="alert"></p><p id="nfHint" class="small-note"></p><fieldset id="nfFields" disabled><button type="button" id="nfStop" class="nightfall-stop">Stop movement</button><div class="nightfall-options"><label><input id="nfSelection" type="checkbox"> Enable one-tap car selection</label><label>Active controller<select id="nfHand"><option value="right">Right hand</option><option value="left">Left hand</option></select></label><label>Session mode<select id="nfMode"><option value="procedure">Procedure · parked</option><option value="showcase">Showcase · guided drive</option></select></label><label><input id="nfMuted" type="checkbox"> Mute headset audio</label></div><div class="actions"><button id="nfResume" type="button" class="secondary">Resume showcase</button><button id="nfReset" type="button" class="secondary">Reset to gallery</button><button id="nfFinish" type="button" class="secondary">Finish Nightfall</button></div></fieldset><p class="small-note">These control the headset. Changing hands stops movement. Resume never starts the car: a fresh controller press is required. Preview playback and sound above affect only this screen.</p></section>`;
    const el = id => host.querySelector(`#${id}`);
    const root = `${database}/users/${encodeURIComponent(deviceId)}`;
    let alive = true, state = null, settings = {}, polling = false, pending = null, stopping = false, revision = 0;
    const controllers = new Set();
    const fresh = () => alive && state?.ready === true && typeof state.bootId === "string" && state.bootId.length > 0 && Number.isFinite(state.updatedAt) && Date.now() - state.updatedAt >= -3000 && Date.now() - state.updatedAt < 12000;
    function enabled() {
      if (!alive) return;
      el("nfFields").disabled = !fresh();
      host.querySelectorAll("#nfFields button, #nfFields input, #nfFields select").forEach(b => {
        const setting = ["nfSelection", "nfHand", "nfMode", "nfMuted"].includes(b.id);
        b.disabled = b.id === "nfStop" ? stopping : (!!pending || stopping || (setting && !!settings.stop));
      });
      el("nfHint").textContent = settings.stop ? "Stop is latched. Resume or Reset before changing settings; Resume still waits for a fresh controller press." : "";
    }
    async function request(path, method = "GET", body) {
      if (!alive) throw Error("Session closed.");
      const controller = new AbortController(); controllers.add(controller);
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(`${root}${path}.json`, {
          method, signal: controller.signal, cache: "no-store",
          headers: body === undefined ? {} : { "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body)
        });
        if (!response.ok) throw Error(`Headset control failed (${response.status}).`);
        return await response.json();
      } finally { clearTimeout(timeout); controllers.delete(controller); }
    }
    function error(e) { if (alive) el("nfError").textContent = e.message || String(e); }
    async function refresh() {
      if (!alive || polling || pending || stopping) return;
      polling = true;
      const ticket = revision;
      try {
        const [status, control] = await Promise.all([request("/nightfall/status"), request("/nightfall/control")]);
        if (!alive || ticket !== revision) return;
        state = status; settings = control || {};
        el("nfStatus").textContent = fresh()
          ? `${status.car || "Gallery"} · ${status.beat || "Ready"} · ${status.stopped ? "Stopped" : status.travelling ? "Travelling" : "Parked"}`
          : "Waiting for a current Nightfall session. Launch Nightfall on this headset.";
        el("nfSelection").checked = !!settings.selectionEnabled;
        el("nfMuted").checked = !!settings.muted;
        el("nfHand").value = settings.activeHand === "left" ? "left" : "right";
        el("nfMode").value = settings.mode === "procedure" ? "procedure" : "showcase";
      } catch(e) { if (alive && ticket === revision) { state = null; error(e); } }
      finally { polling = false; enabled(); }
    }
    function run(operation) {
      if (!fresh() || pending || stopping) return;
      revision++;
      pending = operation().then(() => { if (alive) el("nfError").textContent = ""; }).catch(error).finally(() => { pending = null; enabled(); refresh(); });
      enabled();
    }
    const patch = value => request("/nightfall/control", "PATCH", value);
    async function command(name, extra, clearStop = false) {
      const bootId = state.bootId;
      const ticket = revision;
      if (clearStop) await request("/scene/stop", "PUT", false);
      // Do not send a resume/reset after a new stop, stale status or a reboot.
      if (!fresh() || state.bootId !== bootId || ticket !== revision) return;
      await patch({ ...extra, bootId, commandId: crypto.randomUUID(), command: name, expiresAt: Date.now() + 15000 });
    }
    el("nfSelection").onchange = () => run(() => patch({ selectionEnabled: el("nfSelection").checked }));
    el("nfHand").onchange = () => run(() => patch({ activeHand: el("nfHand").value }));
    el("nfMode").onchange = () => run(() => patch({ mode: el("nfMode").value }));
    el("nfMuted").onchange = () => run(() => patch({ muted: el("nfMuted").checked }));
    el("nfResume").onclick = () => run(() => command("resume", { stop: false, mode: "showcase" }, true));
    el("nfReset").onclick = () => run(() => command("reset", { stop: false, selectionEnabled: false, mode: "showcase" }, true));
    el("nfFinish").onclick = () => run(() => command("finish", { selectionEnabled: false }));
    el("nfStop").onclick = async () => {
      if (!fresh() || stopping) return;
      stopping = true;
      enabled();
      revision++;
      const inFlight = pending;
      const value = { stop: true, selectionEnabled: false };
      // Stop goes immediately, then wins again if an older write was already in flight.
      try { await patch(value); } catch(e) { error(e); }
      if (inFlight) { await inFlight; if (alive) { try { await patch(value); } catch(e) { error(e); } } }
      stopping = false;
      enabled();
      refresh();
    };
    const timer = setInterval(refresh, 2000);
    const staleTimer = setInterval(enabled, 500);
    cleanup = () => { alive = false; revision++; clearInterval(timer); clearInterval(staleTimer); controllers.forEach(c => c.abort()); };
    refresh();
  }
  return { mount, dispose };
})();
