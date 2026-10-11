"use strict";
// Shared settings belong to the headset, so they apply before and across scene changes.
window.StressBallControls = {
  mount(host, database, deviceId) {
    host.innerHTML = `<section class="ball-settings"><p>Automatic hand selection and a 6.5 cm ball are ready by default. Patients only hold and squeeze the ball; no setup questions appear in VR.</p><fieldset data-ball="fields" disabled><div class="nightfall-options"><label>Hand holding the ball<select data-ball="hand"><option value="auto">Detect automatically</option><option value="right">Right hand</option><option value="left">Left hand</option></select></label><label>Ball diameter<select data-ball="size"><option value="0.04">4 cm</option><option value="0.05">5 cm</option><option value="0.06">6 cm</option><option value="0.065" selected>6.5 cm · default</option><option value="0.07">7 cm</option><option value="0.08">8 cm</option><option value="0.09">9 cm</option><option value="0.10">10 cm</option></select></label><label>Squeeze response<select data-ball="range"><option value="0.08">Sensitive · smaller movement</option><option value="0.12" selected>Standard · default</option><option value="0.20">Less sensitive · larger movement</option></select></label><label><input data-ball="notice" type="checkbox"> Show connection message in headset</label></div><button type="button" data-ball="save" class="secondary">Save headset defaults</button></fieldset><p data-ball="status" role="status">Loading headset settings…</p><p data-ball="error" role="alert"></p><p class="small-note">Hands stay invisible; a soft ball shows the squeeze. Hand tracking estimates grip movement, not measured force or object recognition. The ball hand must remain visible to the headset. A connected sensor ball takes priority.</p></section>`;
    const el = key => host.querySelector(`[data-ball="${key}"]`);
    const root = `${database}/users/${encodeURIComponent(deviceId)}/stressBall`;
    let active = true, reading = false, saving = false, loaded = false, dirty = false, savedRevision = "", generation = 0;
    const aborts = new Set();
    async function request(path, method = "GET", body) {
      const controller = new AbortController(); aborts.add(controller);
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(`${root}/${path}.json`, {method, signal:controller.signal, cache:"no-store", headers: body ? {"Content-Type":"application/json"} : {}, body:body ? JSON.stringify(body) : undefined});
        if (!response.ok) throw Error(`Could not contact headset settings (${response.status}).`);
        return await response.json();
      } finally { clearTimeout(timer); aborts.delete(controller); }
    }
    function renderStatus(status) {
      const fresh = status?.schemaVersion === 1 && Number.isFinite(status.updatedAt) && Date.now() - status.updatedAt < 15000 && Date.now() - status.updatedAt >= -3000;
      if (!fresh) { el("status").textContent = savedRevision ? "Defaults saved. Waiting for the updated headset app to apply them." : "Defaults are ready. Live status requires the updated headset app."; return; }
      const applied = savedRevision && status.appliedRevision !== savedRevision ? "Saved · waiting to apply. " : savedRevision ? "Settings applied. " : "";
      const source = {sensor:"Sensor ball connected",hand:"Hand squeeze ready",controller:"Controller input ready",waiting:status.tracking ? "Settling on resting grip" : "Waiting for a tracked hand or sensor ball"}[status.source] || "Waiting for input";
      el("status").textContent = `${applied}${source}${status.tracking ? ` · ${status.hand === "left" ? "left" : "right"} hand` : ""}.`;
    }
    async function refresh() {
      if (!active || reading || saving) return;
      reading = true;
      const ticket = generation;
      try {
        const [settings,status] = await Promise.all([request("control"),request("status")]);
        if (!active || ticket !== generation) return;
        loaded = true;
        if (!dirty) {
          el("hand").value = ["left","right"].includes(settings?.hand) ? settings.hand : "auto";
          const size = Number(settings?.diameterMeters ?? .065);
          // Preserve arbitrary valid sizes from another staff client without silently rounding on Save.
          const sizes = [...el("size").options];
          if (!sizes.some(o=>Number(o.value)===size) && size>=.04 && size<=.10) el("size").add(new Option(`${(size*100).toFixed(1)} cm`,String(size)));
          el("size").value = [...el("size").options].find(o=>Number(o.value)===size)?.value || "0.065";
          const range = Number(settings?.curlRange ?? .12);
          if (![...el("range").options].some(o=>Number(o.value)===range) && range>=.06 && range<=.3) el("range").add(new Option("Custom response",String(range)));
          el("range").value = [...el("range").options].find(o=>Number(o.value)===range)?.value || "0.12";
          el("notice").checked = settings?.showConnectionNotice === true;
        }
        renderStatus(status); el("error").textContent = "";
      } catch(e) { if (active) el("error").textContent = e.message; }
      finally { reading = false; if(active) el("fields").disabled = !loaded || saving; }
    }
    for (const key of ["hand","size","range","notice"]) el(key).onchange = () => { dirty = true; };
    el("save").onclick = async () => {
      if (!active || saving || !loaded) return;
      const settings = {schemaVersion:1,hand:el("hand").value,diameterMeters:Number(el("size").value),curlRange:Number(el("range").value),showConnectionNotice:el("notice").checked,revision:crypto.randomUUID()};
      if (!["auto","left","right"].includes(settings.hand) || !Number.isFinite(settings.diameterMeters) || settings.diameterMeters<.04 || settings.diameterMeters>.10 || !Number.isFinite(settings.curlRange) || settings.curlRange<.06 || settings.curlRange>.3) { el("error").textContent="Choose a valid hand, ball size and response."; return; }
      generation++; saving=true; el("fields").disabled=true;
      try {
        await request("control","PATCH",settings);
        if(active) { savedRevision=settings.revision; dirty=false; el("status").textContent="Defaults saved. Waiting for headset confirmation…"; el("error").textContent=""; }
      } catch(e) { if(active) el("error").textContent=e.message; }
      finally { saving=false; if(active) { el("fields").disabled=false; refresh(); } }
    };
    const timer=setInterval(refresh,3000); refresh();
    return () => {active=false; clearInterval(timer); aborts.forEach(c=>c.abort());};
  }
};
