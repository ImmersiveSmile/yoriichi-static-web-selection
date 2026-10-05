"use strict";
const scenes = [
  [
    24,
    "StarHeart",
    "A little light. A cosmic connection.",
    "Wonder",
    10,
    "Gentle interaction",
    "starheart",
  ],
  [
    26,
    "ImpossibleGarden",
    "Waterfalls, wonder and a world that responds.",
    "Nature",
    10,
    "Seated exploration",
    "garden",
  ],
  [
    20,
    "SleepingOcean",
    "Discover a quiet world beneath the waves.",
    "Nature",
    10,
    "Underwater encounters",
    "ocean",
  ],
  [
    21,
    "LumiStarfall",
    "Catch a moment among the falling stars.",
    "Wonder",
    10,
    "Gentle interaction",
    "lumistarfall",
  ],
  [
    22,
    "DreamRoad",
    "Take the scenic route through a dream.",
    "Journey",
    13,
    "Driving · moving viewpoint",
    "dreamroad",
  ],
  [
    23,
    "CloudVoyage",
    "Let your imagination take flight.",
    "Journey",
    13,
    "Flight · moving viewpoint",
    "cloudvoyage",
  ],
  [
    25,
    "FastLumiValley",
    "Step into a luminous valley.",
    "Nature",
    10,
    "Explore at your own pace",
    "valley",
  ],
  [
    30,
    "LumiValley",
    "A little time in a brighter place.",
    "Nature",
    10,
    "Explore at your own pace",
    "valley",
  ],
  [
    31,
    "spaceIsland",
    "An island beneath a sky of possibilities.",
    "Wonder",
    13,
    "Explore a space setting",
    "space",
  ],
  [
    27,
    "ImpossibleGarden_NoVideos",
    "The garden, without its cinema sequences.",
    "Nature",
    10,
    "No in-world videos",
    "garden",
  ],
  [
    28,
    "ImpossibleGarden_Mochi",
    "Meet Mochi in an impossible garden.",
    "Nature",
    10,
    "Mochi companion",
    "garden",
  ],
  [
    29,
    "ImpossibleGarden_Mochi_NoVideos",
    "Mochi’s garden, without cinema sequences.",
    "Nature",
    10,
    "Mochi · no in-world videos",
    "garden",
  ],
  [
    1,
    "Scene_1_Car_dealership",
    "Explore the car showroom.",
    "Explore",
    13,
    "Legacy scene · review suitability",
    "showroom",
  ],
  [
    2,
    "Scene_2_Castle",
    "Discover a castle world.",
    "Explore",
    13,
    "Legacy scene · review suitability",
    "castle",
  ],
  [
    3,
    "Scene_R1",
    "Explore the original R1 environment.",
    "Explore",
    13,
    "Legacy scene · review suitability",
    "r1",
  ],
  [
    4,
    "Scene_3_farm",
    "Spend a moment on the farm.",
    "Nature",
    13,
    "Legacy scene · review suitability",
    "farm",
  ],
].map(([id, name, description, category, age, motion, art]) => ({
  id,
  name,
  description,
  category,
  age,
  motion,
  art,
  title:
    {
      Scene_1_Car_dealership: "Car Dealership",
      Scene_2_Castle: "Castle",
      Scene_R1: "R1",
      Scene_3_farm: "Farm",
      ImpossibleGarden_NoVideos: "Impossible Garden · Pure",
      ImpossibleGarden_Mochi: "Impossible Garden · Mochi",
      ImpossibleGarden_Mochi_NoVideos: "Impossible Garden · Mochi Pure",
      spaceIsland: "Space Island",
    }[name] || name.replace(/([a-z])([A-Z])/g, "$1 $2"),
}));
const included = new Set([
  "starheart",
  "dreamroad",
  "cloudvoyage",
  "lumistarfall",
]);
const $ = (id) => document.getElementById(id),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let galleryPage = 0;
let page = "browse",
  selected = scenes[0],
  filter = "All worlds",
  age = "all",
  query = "",
  session = null,
  busy = false,
  timer = null,
  started = 0,
  uploadUrls = new Map(),
  db;
let intake = { age: null, gender: null, stress: null },
  feedbackScore = null,
  navIndex = 0,
  navMax = 0,
  completeTimer = null;
// 0–10 face scales. Stress runs calm→stressed; the closing question runs not good→amazing.
const STRESS = [
  "Totally calm",
  "Calm",
  "Mostly calm",
  "A little uneasy",
  "A bit worried",
  "Worried",
  "Quite worried",
  "Stressed",
  "Very stressed",
  "Really stressed",
  "Extremely stressed",
];
const FEEL = [
  "Really not good",
  "Not good",
  "Not great",
  "A bit low",
  "So-so",
  "Okay",
  "Fine",
  "Good",
  "Really good",
  "Great!",
  "Amazing!",
];
const GENDERS = [
  ["female", "Female"],
  ["male", "Male"],
  ["other", "Other"],
  ["prefer_not_to_say", "Prefer not to say"],
];
const stressHue = (i) => (10 - i) * 13 + 20,
  feelHue = (i) => i * 13 + 10,
  stressFace = (i) => face(0.92 - i * 0.092, stressHue(i), { sweat: i >= 7 }),
  feelFace = (i) => face(i / 10, feelHue(i), { tear: i <= 1, stars: i === 10 }),
  reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
// Visit recording must never interrupt a visitor, so every call is fire-and-forget.
const soundIcon =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10"/></svg>';
const track = (fn) => {
  try {
    if (window.KioskData) fn(window.KioskData);
  } catch (e) {}
};
if (window.KioskData?.native) document.documentElement.classList.add("native");
function poster(s) {
  if (window.KIOSK_RECORDINGS?.[s.name])
    return window.KIOSK_RECORDINGS[s.name].poster;
  return included.has(s.art)
    ? `assets/${s.art}.jpg`
    : s.art === "garden"
      ? "assets/garden.png"
      : s.art === "ocean"
        ? "assets/ocean.png"
        : "assets/welcome.png";
}
function videoSource(s) {
  return (
    uploadUrls.get(s.id) ||
    window.KIOSK_RECORDINGS?.[s.name]?.video ||
    (included.has(s.art) ? `assets/${s.art}.mp4` : "")
  );
}
function toast(message) {
  $("toast").textContent = message;
  $("toast").style.display = "block";
  setTimeout(() => ($("toast").style.display = "none"), 5000);
}
// VR headsets register themselves in Firebase under /users/{id} and follow /users/{id}/scene,
// so the kiosk finds them and switches worlds directly — no backend login or patient ID needed.
const FIREBASE = (window.KIOSK_CONFIG?.firebaseUrl || "").replace(/\/$/, ""),
  ONLINE_MS = 45000,
  LOBBY = { id: 0, name: "MainScene", label: "Main Menu" };
let headsets = [],
  headsetChoice = (() => {
    try {
      return localStorage.getItem("is.headset") || "auto";
    } catch (e) {
      return "auto";
    }
  })(),
  headsetPolling = false;
function activeHeadset() {
  if (headsetChoice === "preview") return null;
  const online = headsets.filter((h) => h.online);
  return headsetChoice === "auto"
    ? online[0] || null
    : online.find((h) => h.id === headsetChoice) || null;
}
async function pollHeadsets() {
  if (!FIREBASE || headsetPolling) return;
  headsetPolling = true;
  try {
    const res = await fetch(`${FIREBASE}/users.json`, {
      cache: "no-store",
      signal: AbortSignal.timeout?.(8000),
    });
    if (!res.ok) throw Error(res.status);
    const data = (await res.json()) || {},
      now = Date.now();
    headsets = Object.entries(data)
      .filter(([, u]) => u && typeof u === "object")
      .map(([id, u]) => {
        const seen =
          typeof u.lastSeen === "number"
            ? u.lastSeen
            : typeof u.connectedAt === "number"
              ? u.connectedAt
              : 0;
        return {
          id,
          name: u.name || "VR headset",
          seen,
          online: now - seen < ONLINE_MS,
          showing: u.telemetry?.sceneName || null,
        };
      })
      .sort((a, b) => b.online - a.online || b.seen - a.seen);
  } catch (e) {
    headsets = headsets.map((h) => ({
      ...h,
      online: Date.now() - h.seen < ONLINE_MS,
    }));
  } finally {
    headsetPolling = false;
    connection();
    if ($("settings").open) renderHeadsets();
    if (page === "session" && session) sessionStatus();
  }
}
async function sendScene(headset, scene) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(
        `${FIREBASE}/users/${encodeURIComponent(headset.id)}/scene.json`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: scene.id,
            name: scene.name,
            label: scene.label ?? scene.title,
            updatedAt: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout?.(8000),
        },
      );
      if (res.ok) return true;
    } catch (e) {}
  }
  return false;
}
function connection() {
  const h = activeHeadset(),
    el = $("connection");
  el.classList.toggle("live", !!h);
  el.textContent = h ? `● ${h.name}` : "○ Preview mode";
  if ($("dockEyebrow") && !busy) {
    $("dockEyebrow").textContent = h ? "READY WHEN YOU ARE" : "TRY IT HERE";
    $("dockText").textContent = h
      ? `Put on the ${h.name}. We’ll take you there.`
      : "Enjoy a preview on this screen.";
    if (selected.id !== 31)
      $("start").innerHTML =
        `${h ? "LET’S BEGIN" : "START PREVIEW"} <span>→</span>`;
  }
}
function ago(ms) {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 1
    ? "just now"
    : m < 60
      ? `${m} min ago`
      : m < 1440
        ? `${Math.round(m / 60)} h ago`
        : `${Math.round(m / 1440)} d ago`;
}
function renderHeadsets() {
  const recent = headsets.filter(
      (h) =>
        h.online || h.id === headsetChoice || Date.now() - h.seen < 86400000,
    ),
    auto = headsets.find((h) => h.online);
  const option = (value, title, sub, on) =>
    `<button type="button" role="radio" aria-checked="${headsetChoice === value}" class="headset-option${headsetChoice === value ? " selected" : ""}" data-headset="${esc(value)}"><span class="headset-dot ${on ? "on" : ""}"></span><span><strong>${title}</strong><small>${sub}</small></span></button>`;
  $("headsetList").innerHTML =
    option(
      "auto",
      "Automatic",
      auto
        ? `Uses ${esc(auto.name)} · online now`
        : "Uses the first headset that comes online",
      !!auto,
    ) +
    recent
      .map((h) =>
        option(
          h.id,
          esc(h.name),
          `${h.online ? "Online" : `Last seen ${ago(h.seen)}`} · ${esc(h.id.slice(0, 6))}${h.online && h.showing ? ` · showing ${esc(h.showing)}` : ""}`,
          h.online,
        ),
      )
      .join("") +
    option(
      "preview",
      "This screen only",
      "Play previews here without a headset",
      false,
    ) +
    (FIREBASE && !headsets.length
      ? '<p class="small-note">No headsets found yet. Open Immersive Smile on the headset and keep it on the same internet connection.</p>'
      : "");
}
function sessionStatus() {
  if (!session || session.demo || !$("headsetStatus")) return;
  const h = headsets.find((x) => x.id === session.headset.id);
  $("headsetStatus").textContent = h?.online
    ? `${h.name} · online`
    : `${session.headset.name} · not responding`;
  $("experienceStatus").innerHTML = !session.sent
    ? 'Couldn’t reach the headset <button type="button" class="text-button" id="resend">Try again</button>'
    : h?.showing === selected.name
      ? `Showing ${esc(selected.title)}`
      : `Sent ${esc(selected.title)} to the headset`;
  if ($("resend"))
    $("resend").onclick = async () => {
      $("experienceStatus").textContent = "Sending…";
      session.sent = await sendScene(session.headset, selected);
      sessionStatus();
    };
}
function stopVideos() {
  document.querySelectorAll("video").forEach((v) => {
    v.pause();
    v.removeAttribute("src");
    v.load();
  });
}
function snapshot() {
  return { page, id: selected.id, galleryPage, filter, idx: navIndex };
}
function remember() {
  try {
    history.replaceState(snapshot(), "", "#" + page);
  } catch (e) {}
}
function leave(next) {
  clearInterval(completeTimer);
  if (page === "feedback" && next !== "feedback")
    track((d) => {
      if (d.active()) d.finish();
    });
}
function navigate(next, { replace = false } = {}) {
  if (busy && !["session", "feedback", "complete"].includes(next)) {
    toast("Please wait for the current action to finish.");
    return;
  }
  if (session && next !== "session") {
    toast("End the current experience before leaving.");
    return;
  }
  leave(next);
  stopVideos();
  page = next;
  if (!replace) {
    navIndex++;
    navMax = navIndex;
  }
  try {
    history[replace ? "replaceState" : "pushState"](snapshot(), "", "#" + page);
  } catch (e) {}
  render();
  window.scrollTo(0, 0);
  updateNav();
}
function updateNav() {
  const lock = !!session;
  $("navBack").disabled = lock || navIndex <= 0;
  $("navForward").disabled = lock || navIndex >= navMax;
  $("navHome").disabled = lock;
}
function goHome() {
  galleryPage = 0;
  filter = "All worlds";
  if (page === "browse") {
    render();
    remember();
  } else navigate("browse");
}
function sceneLabel(s) {
  return familyFor(s).length > 1
    ? `${familyTitle(s)} · ${versionLabel(s)}`
    : s.title;
}
function render() {
  const root = $("app");
  root.querySelectorAll("video").forEach((v) => v.pause());
  if (page === "home") {
    root.innerHTML = `<section class="attract"><p class="eyebrow">A LITTLE WONDER. A MOMENT FOR YOU.</p><h1>IMMERSIVE SMILE</h1><p class="sub">Your World. Your Moment.</p><div class="welcome-bottom"><button id="enter" class="primary">TOUCH TO ENTER &nbsp; →</button><p>Discover immersive worlds designed around comfort, curiosity and connection.</p></div></section>`;
    $("enter").onclick = () => navigate("browse");
    return;
  }
  if (page === "browse") {
    root.innerHTML = `<section class="discovery content"><div class="discovery-intro"><div><p class="eyebrow">A MOMENT OF WONDER</p><h1>Where will you <br><em>escape today?</em></h1><p>Choose a world. Make it your moment.</p></div><div class="journey-step"><span class="step active">1</span><span>Choose a world</span><span class="step">2</span><span>About you</span><span class="step">3</span><span>Step inside</span></div></div><div class="browse-tools"><div class="filters" id="filters">${[
      ["All worlds", "All worlds"],
      ["Nature", "Nature & calm"],
      ["Wonder", "A little magic"],
      ["Journey", "An adventure"],
    ]
      .map(
        ([f, label]) =>
          `<button class="${f === filter ? "selected" : ""}" data-filter="${f}" aria-pressed="${f === filter}">${label}</button>`,
      )
      .join(
        "",
      )}</div><button id="ageHelp" class="text-button info-button">Age guidance <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/></svg></button></div><div class="section-label"><span id="count"></span><span>TAP A WORLD TO TAKE A LOOK</span></div><div class="gallery" id="cards" aria-label="Worlds"></div><nav class="gallery-nav" aria-label="Browse worlds"><button id="previous">← Back</button><div id="pageCount" aria-live="polite"></div><button id="next">More worlds →</button></nav><p class="small-note gallery-note">Swipe for more worlds. Preview any world before you begin.</p></section>`;
    cards();
    $("filters").onclick = (e) => {
      if (e.target.dataset.filter) {
        filter = e.target.dataset.filter;
        galleryPage = 0;
        render();
      }
    };
    $("ageHelp").onclick = () => $("ageInfo").showModal();
    return;
  }
  if (page === "detail") {
    const family = familyFor(selected),
      warning = window.KIOSK_RECORDINGS?.[selected.name]?.reviewNote;
    root.innerHTML = `<section class="preview-page content"><div class="preview-nav"><button class="back" id="back">← All worlds</button><span class="eyebrow">TAKE A LOOK AROUND</span><button id="nextWorld" class="back">Next world →</button></div><div class="preview-stage">${media(selected)}<div class="preview-caption"><span class="tag">${selected.category}</span><h1>${esc(familyTitle(selected))}</h1><p>${familyDescription(selected)}</p></div></div><div class="preview-under"><div class="tags"><span class="tag">Suggested ${selected.age}+</span><span class="tag">${selected.motion.replace("Legacy scene · review suitability", "Explore at your own pace")}</span></div><div class="media-controls"><button id="playPreview">Ⅱ Pause preview</button><button id="audioToggle">${soundIcon} Sound off</button></div></div>${family.length > 1 ? `<div class="versions"><span>Choose your version</span><div>${family.map((v) => `<button data-version="${v.id}" class="${v.id === selected.id ? "selected" : ""}" aria-pressed="${v.id === selected.id}">${versionLabel(v)}</button>`).join("")}</div><select id="versionSelect" class="version-select" aria-label="World version">${family.map((v) => `<option value="${v.id}" ${v.id === selected.id ? "selected" : ""}>${versionLabel(v)}</option>`).join("")}</select></div>` : ""}${warning ? `<p class="review-notice">${selected.id === 31 ? "This world is still being prepared. Choose another world to begin." : "This world needs a staff check before use."}<button class="text-button" id="reviewDetails">Details</button></p>` : ""}<div class="start-dock"><div><p class="eyebrow" id="dockEyebrow"></p><p id="dockText"></p></div><button class="primary" id="start" ${selected.id === 31 ? "disabled" : ""}>${selected.id === 31 ? "COMING SOON" : "START PREVIEW"} <span>→</span></button></div><p class="recording-note">Recorded Unity preview · simulated interaction · Not a live headset view.</p></section>`;
    $("back").onclick = () => navigate("browse");
    $("nextWorld").onclick = () => {
      if (busy) return;
      const list = galleryScenes();
      let i = list.findIndex((x) =>
        familyFor(x).some((v) => v.id === selected.id),
      );
      selected = list[(i + 1) % list.length] || scenes[0];
      navigate("detail");
    };
    $("playPreview").disabled = !videoSource(selected);
    $("playPreview").onclick = () => {
      const v = document.querySelector("video");
      if (!v) return;
      if (v.paused) playVideo();
      else v.pause();
    };
    bindAudio();
    $("start").onclick = () => {
      intake = { age: null, gender: null, stress: null };
      navigate("intake");
    };
    connection();
    document.querySelectorAll("[data-version]").forEach(
      (b) =>
        (b.onclick = () => {
          if (busy) return;
          selected = scenes.find((x) => x.id === Number(b.dataset.version));
          navigate("detail", { replace: true });
        }),
    );
    if ($("versionSelect"))
      $("versionSelect").onchange = (e) => {
        if (busy) return;
        selected = scenes.find((s) => s.id === Number(e.target.value));
        navigate("detail", { replace: true });
      };
    if ($("reviewDetails")) $("reviewDetails").onclick = () => toast(warning);
    const v = document.querySelector("video");
    if (v) {
      v.onplay = () => {
        $("playPreview").textContent = "Ⅱ Pause preview";
      };
      v.onpause = () => {
        if ($("playPreview")) $("playPreview").textContent = "▷ Play preview";
      };
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) playVideo();
      else $("playPreview").textContent = "▷ Play preview";
    }
    return;
  }
  if (page === "intake") {
    const family = familyFor(selected);
    root.innerHTML = `<section class="intake content"><div class="preview-nav"><button class="back" id="back">← ${esc(familyTitle(selected))}</button><span class="eyebrow">STEP 2 OF 3 · ABOUT YOU</span><span class="world-chip"><img src="${poster(selected)}" alt="">${esc(family.length > 1 ? versionLabel(selected) : familyTitle(selected))}</span></div><div class="intake-head"><h1>Before we <em>begin…</em></h1><p>Three quick taps help us make every visit a little better.</p></div><div class="intake-grid"><section class="question" id="qAge"><p class="q-label"><span>1</span>How old are you?</p><div class="age-entry"><button type="button" class="age-step" data-step="-1" aria-label="Younger">−</button><input id="ageInput" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" placeholder="Type age" aria-label="Age in years"><button type="button" class="age-step" data-step="1" aria-label="Older">+</button></div><div class="age-strip" id="ageStrip" role="radiogroup" aria-label="Or tap an age">${Array.from({ length: 99 }, (_, i) => `<button type="button" role="radio" aria-checked="false" data-age="${i + 1}">${i + 1}</button>`).join("")}</div></section><section class="question" id="qGender"><p class="q-label"><span>2</span>Gender</p><div class="choice-row" role="radiogroup" aria-label="Gender">${GENDERS.map(([v, l]) => `<button type="button" role="radio" aria-checked="false" data-gender="${v}">${l}</button>`).join("")}</div></section><section class="question wide" id="qStress"><div class="q-head"><p class="q-label"><span>3</span>How stressed or worried do you feel right now?</p><div class="mood-hero" id="stressHero"></div></div>${moodScale("stress", STRESS, stressHue, stressFace)}<div class="scale-ends"><span>Calm</span><span>Very stressed</span></div></section></div><div class="start-dock"><div><p class="eyebrow">STEP INSIDE</p><p id="intakeHint"></p></div><div class="dock-actions"><button type="button" class="text-button" id="skipIntake">Skip questions</button><button class="primary" id="start">LET’S BEGIN <span>→</span></button></div></div></section>`;
    $("back").onclick = () => {
      if (navIndex > 0) history.back();
      else navigate("detail");
    };
    $("ageInput").oninput = (e) => {
      const v = e.target.value.replace(/\D/g, "").slice(0, 2);
      e.target.value = v;
      intake.age = Number(v) >= 1 ? Number(v) : null;
      syncIntake(true, false, true);
    };
    $("ageInput").onkeydown = (e) => {
      if (e.key === "Enter") e.target.blur();
    };
    $("ageStrip").onclick = (e) => {
      const b = e.target.closest("[data-age]");
      if (b) {
        intake.age = Number(b.dataset.age);
        syncIntake(true);
      }
    };
    document.querySelectorAll(".age-step").forEach(
      (b) =>
        (b.onclick = () => {
          const step = Number(b.dataset.step);
          intake.age =
            intake.age == null
              ? step > 0
                ? 9
                : 7
              : Math.max(1, Math.min(99, intake.age + step));
          syncIntake(true);
        }),
    );
    document.querySelector(".choice-row").onclick = (e) => {
      const b = e.target.closest("[data-gender]");
      if (b) {
        intake.gender = b.dataset.gender;
        syncIntake();
      }
    };
    bindScale("stress", (v) => {
      intake.stress = v;
      syncIntake();
    });
    $("skipIntake").onclick = () => {
      intake = { age: null, gender: null, stress: null };
      start();
    };
    $("start").onclick = start;
    syncIntake(true, true);
    return;
  }
  if (page === "session") {
    root.innerHTML = `<section class="content"><div class="session-title"><p class="eyebrow">${session.demo ? "KIOSK PREVIEW" : "YOUR EXPERIENCE"}</p><h1>${esc(selected.title)}</h1><p>Your touch brings worlds to life.</p></div><div class="session-grid">${media(selected)}<aside class="interaction"><p class="eyebrow">YOUR INTERACTION</p><div class="orb"></div><p>Squeeze the stress ball, or use your VR controller trigger.</p><div class="down">↓</div><h3>A world that responds</h3><p>Light, movement and atmosphere unfold inside the headset.</p></aside></div><p class="small-note" style="text-align:center">PRERECORDED PREVIEW · This is not a live headset view. Simulated interaction. Your headset experience may differ.</p><div class="media-controls"><button id="playPreview">▷ Play preview</button><button id="pausePreview">Ⅱ Pause preview only</button><button id="audioToggle">${soundIcon} Enable preview sound</button></div><div class="status-list"><div class="status-row"><span>Experience</span><strong id="experienceStatus">${session.demo ? "Playing on this screen" : "Sending…"}</strong></div><div class="status-row"><span>Headset</span><strong id="headsetStatus">${session.demo ? "None — preview only" : "Checking…"}</strong></div><div class="status-row"><span>Elapsed</span><strong id="elapsed">00:00</strong></div></div><div class="actions"><button id="end" class="primary">End experience</button></div></section>`;
    $("end").onclick = () => {
      $("stopDescription").textContent = session.demo
        ? "End this preview."
        : `End this session and return the ${session.headset.name} to its main menu.`;
      $("stopDialog").showModal();
    };
    $("playPreview").onclick = playVideo;
    bindAudio();
    $("pausePreview").onclick = () => document.querySelector("video")?.pause();
    $("playPreview").disabled = $("pausePreview").disabled =
      !videoSource(selected);
    playVideo();
    sessionStatus();
    return;
  }
  if (page === "feedback") {
    root.innerHTML = `<section class="feedback-page" id="feedbackPage"><div class="sparkles" aria-hidden="true">${"<i></i>".repeat(12)}</div><p class="eyebrow">ONE LAST THING</p><h1>How do you feel now after <em>Immersive Smile Plus?</em></h1><div class="mood-hero feel-hero" id="feelHero"></div>${moodScale("feel", FEEL, feelHue, feelFace)}<div class="scale-ends"><span>Not good</span><span>Amazing</span></div><div class="feedback-actions"><button class="primary" id="sendFeel">SEND MY SMILE <span>→</span></button><button type="button" class="text-button" id="skipFeel">Skip</button></div></section>`;
    const pick = (v) => {
      feedbackScore = v;
      setScale("feel", v);
      hero(
        "feelHero",
        FEEL,
        v,
        feelHue,
        feelFace,
        "Tap the face that feels right",
      );
      $("feedbackPage").style.setProperty(
        "--hue",
        v == null ? 205 : feelHue(v),
      );
      $("sendFeel").disabled = v == null;
    };
    bindScale("feel", pick);
    pick(feedbackScore);
    $("sendFeel").onclick = () => {
      if (feedbackScore == null) return;
      track((d) => {
        d.feedback(feedbackScore);
        d.finish();
      });
      navigate("complete", { replace: true });
    };
    $("skipFeel").onclick = () => {
      feedbackScore = null;
      track((d) => d.finish());
      navigate("complete", { replace: true });
    };
    return;
  }
  if (page === "complete") {
    let left = 15;
    const thanked = feedbackScore != null;
    root.innerHTML = `<section class="attract"><p class="eyebrow">TAKE THAT LITTLE LIGHT WITH YOU</p><h1>${thanked ? "Thank you<br>for sharing." : "A moment,<br>just for you."}</h1><p class="sub">${thanked ? `<span class="mini-face">${feelFace(feedbackScore)}</span>Your smile helps us make every visit better.` : "Your experience has ended."}</p><div class="welcome-bottom"><button id="again" class="primary">EXPLORE MORE WORLDS →</button><p>Back to all worlds in <span id="countdown">${left}</span>s</p></div></section>`;
    $("again").onclick = goHome;
    completeTimer = setInterval(() => {
      left--;
      if ($("countdown")) $("countdown").textContent = left;
      if (left <= 0) goHome();
    }, 1000);
  }
}
// Hand-drawn SVG faces (no emoji font needed): mood 0 = saddest … 1 = happiest.
function face(mood, hue, { sweat = false, tear = false, stars = false } = {}) {
  const curve = (mood - 0.5) * 34,
    brow = mood < 0.45 ? (0.45 - mood) * 22 : 0;
  const eyes =
    mood >= 0.85
      ? '<path d="M29 43q7-8 14 0M57 43q7-8 14 0" fill="none" stroke-width="4.5"/>'
      : `<ellipse cx="36" cy="42" rx="4.3" ry="${mood < 0.2 ? 4.2 : 5.4}"/><ellipse cx="64" cy="42" rx="4.3" ry="${mood < 0.2 ? 4.2 : 5.4}"/>`;
  const brows = brow
    ? `<path d="M26 ${31 + brow * 0.3}L43 ${30 - brow}M74 ${31 + brow * 0.3}L57 ${30 - brow}" fill="none" stroke-width="4"/>`
    : "";
  const mouth =
    mood >= 0.75
      ? `<path d="M31 60Q50 ${60 + curve * 1.7} 69 60Z" stroke-width="3.5" stroke-linejoin="round"/>`
      : mood <= 0.05
        ? '<path d="M35 72Q50 56 65 72Z" stroke-width="3.5" stroke-linejoin="round"/>'
        : `<path d="M34 ${67 - curve / 2}Q50 ${67 + curve} 66 ${67 - curve / 2}" fill="none" stroke-width="4.5"/>`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="52" r="43" fill="hsl(${hue} 82% 66%)" stroke="hsl(${hue} 55% 36%)" stroke-width="3"/><ellipse cx="37" cy="27" rx="17" ry="8" fill="#fff" opacity=".3"/>${mood >= 0.7 ? '<circle cx="25" cy="58" r="6.5" fill="#ff8fb1" opacity=".55"/><circle cx="75" cy="58" r="6.5" fill="#ff8fb1" opacity=".55"/>' : ""}<g fill="#1d2135" stroke="#1d2135" stroke-linecap="round">${eyes}${brows}${mouth}</g>${tear ? '<path d="M66 50q-5 8 0 12q5-4 0-12z" fill="#7fd3ff" stroke="#2f7fb0" stroke-width="1.4"/>' : ""}${sweat ? '<path d="M83 17q-7 10 0 15q7-5 0-15z" fill="#9be2ff" stroke="#2f7fb0" stroke-width="1.6"/>' : ""}${stars ? '<path d="M88 8l2.4 6 6 2.4-6 2.4-2.4 6-2.4-6-6-2.4 6-2.4z M12 70l1.8 4.4 4.4 1.8-4.4 1.8-1.8 4.4-1.8-4.4-4.4-1.8 4.4-1.8z" fill="#fff3b8"/>' : ""}</svg>`;
}
function moodScale(name, labels, hue, draw) {
  return `<div class="mood-scale" role="radiogroup" data-scale="${name}">${labels.map((label, i) => `<button type="button" role="radio" aria-checked="false" aria-label="${i}: ${label}" data-value="${i}" style="--hue:${hue(i)}"><span class="face">${draw(i)}</span><span class="num">${i}</span></button>`).join("")}</div>`;
}
function bindScale(name, onPick) {
  const el = document.querySelector(`[data-scale="${name}"]`);
  if (el)
    el.onclick = (e) => {
      const b = e.target.closest("[data-value]");
      if (b) onPick(Number(b.dataset.value));
    };
}
function setScale(name, value) {
  document
    .querySelectorAll(`[data-scale="${name}"] [data-value]`)
    .forEach((b) => {
      const on = Number(b.dataset.value) === value;
      b.classList.toggle("selected", on);
      b.setAttribute("aria-checked", on);
    });
}
function hero(id, labels, value, hue, draw, empty) {
  const el = $(id);
  if (!el) return;
  el.classList.toggle("unset", value == null);
  el.style.setProperty("--hue", value == null ? 205 : hue(value));
  el.innerHTML = `<span class="face">${value == null ? face(0.6, 205) : draw(value)}</span><strong>${value == null ? empty : labels[value]}</strong>`;
  if (value != null && !reduced()) {
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }
}
function syncIntake(centerAge, first, typing) {
  const strip = $("ageStrip");
  if (!strip) return;
  if (!typing) $("ageInput").value = intake.age ?? "";
  strip.querySelectorAll("[data-age]").forEach((b) => {
    const on = Number(b.dataset.age) === intake.age;
    b.classList.toggle("selected", on);
    b.setAttribute("aria-checked", on);
  });
  const target =
    centerAge && strip.querySelector(`[data-age="${intake.age ?? 8}"]`);
  if (target)
    strip.scrollTo({
      left: target.offsetLeft - strip.clientWidth / 2 + target.offsetWidth / 2,
      behavior: first || reduced() ? "auto" : "smooth",
    });
  document.querySelectorAll("[data-gender]").forEach((b) => {
    const on = b.dataset.gender === intake.gender;
    b.classList.toggle("selected", on);
    b.setAttribute("aria-checked", on);
  });
  setScale("stress", intake.stress);
  hero(
    "stressHero",
    STRESS,
    intake.stress,
    stressHue,
    stressFace,
    "Tap the face that matches how you feel",
  );
  $("qAge").classList.toggle("done", intake.age != null);
  $("qGender").classList.toggle("done", intake.gender != null);
  $("qStress").classList.toggle("done", intake.stress != null);
  const missing = [
    intake.age == null && "your age",
    intake.gender == null && "gender",
    intake.stress == null && "how you feel",
  ].filter(Boolean);
  $("intakeHint").textContent = missing.length
    ? `Just ${missing.join(", ").replace(/, ([^,]*)$/, " and $1")} to go.`
    : activeHeadset()
      ? `All set. Put on the ${activeHeadset().name} — we’ll take you there.`
      : "All set. Tap Let’s begin when you’re ready.";
  $("start").disabled = missing.length > 0 || busy;
}
function familyFor(s) {
  const ids = [26, 27, 28, 29].includes(s.id)
    ? [27, 26, 29, 28]
    : [25, 30].includes(s.id)
      ? [25, 30]
      : [s.id];
  return ids.map((id) => scenes.find((x) => x.id === id));
}
function familyTitle(s) {
  return [26, 27, 28, 29].includes(s.id)
    ? "Impossible Garden"
    : [25, 30].includes(s.id)
      ? "Lumi Valley"
      : s.title;
}
function familyDescription(s) {
  return [26, 27, 28, 29].includes(s.id)
    ? "Waterfalls, wonder and a world that responds."
    : s.description;
}
function versionLabel(s) {
  return (
    {
      26: "With cinema",
      27: "Garden only",
      28: "Mochi + cinema",
      29: "With Mochi",
      25: "Fast Lumi Valley",
      30: "Original valley",
    }[s.id] || s.title
  );
}
function galleryScenes() {
  return [25, 20, 27, 24, 21, 22, 23, 1, 2, 3, 4, 31]
    .map((id) => scenes.find((s) => s.id === id))
    .filter((s) => filter === "All worlds" || s.category === filter);
}
function card(s) {
  return `<button class="card" data-id="${s.id}" aria-label="Preview ${esc(familyTitle(s))}"><img loading="eager" src="${poster(s)}" alt=""><span class="card-top"><span>${s.id === 31 ? "COMING SOON" : s.category}</span><span>${s.age}+</span></span><span class="card-copy"><h3>${familyTitle(s)}</h3><span class="description">${familyDescription(s)}</span><span class="card-bottom"><span>${s.id === 31 ? "See work in progress" : "Explore this world"}</span><span class="arrow">↗</span></span></span></button>`;
}
// Four worlds per page; pages sit side by side so visitors can swipe or use Back / More worlds.
function cards() {
  const list = galleryScenes(),
    pages = Math.max(1, Math.ceil(list.length / 4)),
    track = $("cards");
  galleryPage = Math.min(galleryPage, pages - 1);
  $("count").textContent = `${list.length} WORLDS TO DISCOVER`;
  track.innerHTML = Array.from(
    { length: pages },
    (_, p) =>
      `<div class="grid gallery-page" role="group" aria-label="Page ${p + 1} of ${pages}">${list
        .slice(p * 4, p * 4 + 4)
        .map(card)
        .join("")}</div>`,
  ).join("");
  $("pageCount").innerHTML =
    `<span class="page-dots">${Array.from({ length: pages }, (_, i) => `<button type="button" data-page="${i}" aria-label="Show page ${i + 1}"></button>`).join("")}</span><span id="pageLabel"></span>`;
  let heading = null,
    settle;
  const at = () =>
    Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
  const mark = (p) => {
    galleryPage = p;
    $("pageCount")
      .querySelectorAll("[data-page]")
      .forEach((d, i) => {
        d.classList.toggle("active", i === p);
        d.setAttribute("aria-current", i === p ? "page" : "false");
      });
    $("pageLabel").textContent = `${p + 1} of ${pages}`;
    $("previous").disabled = p === 0;
    $("next").disabled = p === pages - 1;
    if (page === "browse") remember();
  };
  const go = (p) => {
    p = Math.max(0, Math.min(pages - 1, p));
    heading = p;
    mark(p);
    track.scrollTo({
      left: p * track.clientWidth,
      behavior: reduced() ? "auto" : "smooth",
    });
    setTimeout(() => {
      if (heading === p && at() !== p) {
        track.scrollLeft = p * track.clientWidth;
      }
    }, 650);
  };
  track.onscroll = () => {
    if (heading == null && at() !== galleryPage) mark(at());
    clearTimeout(settle);
    settle = setTimeout(() => {
      heading = null;
      if (at() !== galleryPage) mark(at());
      remember();
    }, 140);
  };
  mark(galleryPage);
  track.scrollLeft = galleryPage * track.clientWidth;
  $("previous").onclick = () => go(galleryPage - 1);
  $("next").onclick = () => go(galleryPage + 1);
  $("pageCount").onclick = (e) => {
    const d = e.target.closest("[data-page]");
    if (d) go(Number(d.dataset.page));
  };
  track.onclick = (e) => {
    const c = e.target.closest("[data-id]");
    if (c && !busy) {
      selected = scenes.find((s) => s.id === Number(c.dataset.id));
      navigate("detail");
    }
  };
}
function media(s) {
  let src = videoSource(s);
  return `<div class="hero">${src ? `<video src="${esc(src)}" poster="${poster(s)}" loop muted playsinline preload="none" aria-label="Prerecorded ${esc(s.title)} preview"></video>` : `<img src="${poster(s)}" alt="${["garden", "ocean"].includes(s.art) ? "Scene screenshot" : "Illustrative cover artwork"}"><div class="no-video">Recording not added yet. Staff can add this scene’s MP4 in setup.</div>`}<span class="badge">${src ? (window.KIOSK_RECORDINGS?.[s.name] && !uploadUrls.has(s.id) ? "▷ UNITY RECORDING · SIMULATED INPUT" : "▷ RECORDED PREVIEW") : "STILL PREVIEW"}</span></div>`;
}
function bindAudio() {
  const b = $("audioToggle");
  if (!b) return;
  b.disabled = !videoSource(selected);
  b.onclick = () => {
    const v = document.querySelector("video");
    if (!v) return;
    v.muted = !v.muted;
    b.innerHTML = soundIcon + (v.muted ? " Sound off" : " Sound on");
    if (!v.muted) playVideo();
  };
}
function playVideo() {
  const v = document.querySelector("video");
  if (v) v.play().catch(() => toast("Tap Play preview to start playback."));
}
async function start() {
  if (busy || session) return;
  busy = true;
  $("start").disabled = true;
  const headset = activeHeadset(),
    sent = headset ? await sendScene(headset, selected) : false;
  session = { demo: !headset, headset, sent };
  busy = false;
  track((d) =>
    d.begin({
      age: intake.age,
      gender: intake.gender,
      stress: intake.stress,
      scene: {
        id: selected.id,
        name: selected.name,
        label: sceneLabel(selected),
      },
      mode: headset ? "headset" : "preview",
      headset,
    }),
  );
  started = Date.now();
  navigate("session", { replace: true });
  timer = setInterval(tick, 1000);
}
function tick() {
  if (!session) return;
  const sec = Math.floor((Date.now() - started) / 1000);
  if ($("elapsed"))
    $("elapsed").textContent =
      `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  if (sec % 15 === 0) track((d) => d.heartbeat());
}
// Ending returns the headset to its main menu (best effort — the visitor moves on either way).
$("confirmStop").onclick = () => {
  if (!session) return;
  if (!session.demo) sendScene(session.headset, LOBBY);
  clearInterval(timer);
  session = null;
  $("stopDialog").close();
  track((d) => d.end());
  feedbackScore = null;
  navigate("feedback", { replace: true });
};
$("recordScene").innerHTML = scenes
  .map((s) => `<option value="${s.id}">${s.title}</option>`)
  .join("");
const request = indexedDB.open("immersive-smile-kiosk", 1);
request.onupgradeneeded = () => request.result.createObjectStore("recordings");
request.onsuccess = () => {
  db = request.result;
  const cursor = db
    .transaction("recordings")
    .objectStore("recordings")
    .openCursor();
  cursor.onsuccess = () => {
    let c = cursor.result;
    if (c) {
      uploadUrls.set(c.key, URL.createObjectURL(c.value));
      c.continue();
    } else if (page === "browse") cards();
  };
};
$("recordFile").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!db) {
    $("recordMessage").textContent = "Browser storage is unavailable.";
    return;
  }
  if (file.size > 200 * 1024 * 1024) {
    $("recordMessage").textContent = "Use a recording smaller than 200 MB.";
    return;
  }
  const id = Number($("recordScene").value);
  const test = document.createElement("video");
  test.preload = "metadata";
  const url = URL.createObjectURL(file);
  test.src = url;
  test.onloadedmetadata = () => {
    const tx = db.transaction("recordings", "readwrite");
    tx.objectStore("recordings").put(file, id);
    tx.oncomplete = () => {
      if (uploadUrls.has(id)) URL.revokeObjectURL(uploadUrls.get(id));
      uploadUrls.set(id, url);
      $("recordMessage").textContent = "Recording saved on this kiosk.";
      if (page === "detail" || page === "browse") render();
    };
    tx.onerror = () => {
      URL.revokeObjectURL(url);
      $("recordMessage").textContent = "Storage is full or unavailable.";
    };
  };
  test.onerror = () => {
    URL.revokeObjectURL(url);
    $("recordMessage").textContent =
      "This browser cannot play that recording. Use H.264 MP4.";
  };
};
$("home").onclick = $("navHome").onclick = goHome;
$("navBack").onclick = () => {
  if (navIndex > 0) history.back();
};
$("navForward").onclick = () => {
  if (navIndex < navMax) history.forward();
};
$("setup").onclick = $("connection").onclick = () => {
  renderHeadsets();
  $("settings").showModal();
  refreshSync();
  pollHeadsets();
};
$("headsetList").onclick = (e) => {
  const b = e.target.closest("[data-headset]");
  if (!b) return;
  if (session) {
    toast("End the current experience first.");
    return;
  }
  headsetChoice = b.dataset.headset;
  try {
    localStorage.setItem("is.headset", headsetChoice);
  } catch (err) {}
  renderHeadsets();
  connection();
};
pollHeadsets();
setInterval(() => {
  if (document.visibilityState !== "hidden") pollHeadsets();
}, 4000);
async function refreshSync() {
  const el = $("syncStatus");
  try {
    const s = await window.KioskData.status(),
      ago = s.lastSyncAt
        ? Math.round((Date.now() - s.lastSyncAt) / 60000)
        : null;
    el.innerHTML = [
      s.pending
        ? `<strong>${s.pending} visit${s.pending === 1 ? "" : "s"} waiting to upload</strong>`
        : "<strong>All visits uploaded</strong>",
      ago != null
        ? `Last upload ${ago < 1 ? "just now" : ago < 120 ? ago + " min ago" : Math.round(ago / 60) + " h ago"}`
        : "",
      s.online === false ? "Offline · will upload when connected" : "",
      s.pending && s.lastError ? esc(s.lastError) : "",
      s.location ? `Location: ${esc(s.location)}` : "",
      s.deviceId ? `Device ID: ${esc(s.deviceId)}` : "",
    ]
      .filter(Boolean)
      .join("<br>");
    if (document.activeElement !== $("clinic"))
      $("clinic").value = s.clinicCode || "";
  } catch (e) {
    el.textContent = "Visits are saved on this kiosk.";
  }
}
$("saveClinic").onclick = async () => {
  track(async (d) => {
    await d.setClinic($("clinic").value);
    toast("Clinic name saved on this kiosk.");
    refreshSync();
  });
};
$("clinic").onkeydown = (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    $("saveClinic").click();
  }
};
$("syncNow").onclick = () => {
  $("syncStatus").textContent = "Uploading…";
  track(async (d) => {
    await d.syncNow();
    setTimeout(refreshSync, 1200);
  });
};
addEventListener("popstate", (e) => {
  const s = e.state;
  if (!s || !s.page) return;
  if (session || busy) {
    navIndex = s.idx + 1;
    navMax = navIndex;
    try {
      history.pushState(snapshot(), "", "#" + page);
    } catch (err) {}
    toast("End the current experience before leaving.");
    updateNav();
    return;
  }
  leave(s.page);
  stopVideos();
  selected = scenes.find((x) => x.id === s.id) || scenes[0];
  galleryPage = s.galleryPage || 0;
  filter = s.filter || "All worlds";
  navIndex = s.idx || 0;
  page =
    s.page === "session" ||
    (s.page === "feedback" && !window.KioskData?.active())
      ? "detail"
      : s.page;
  if (page !== s.page) remember();
  render();
  window.scrollTo(0, 0);
  updateNav();
});
addEventListener("resize", () => {
  const t = $("cards");
  if (t && page === "browse") t.scrollLeft = galleryPage * t.clientWidth;
});
$("fullscreen").onclick = () => {
  (document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen()
  ).catch(() => toast("Fullscreen is unavailable in this browser."));
};
document
  .querySelectorAll(".close")
  .forEach((b) => (b.onclick = () => b.closest("dialog").close()));
let lastTouch = Date.now();
["pointerdown", "keydown"].forEach((type) =>
  document.addEventListener(type, () => (lastTouch = Date.now())),
);
setInterval(() => {
  if (
    !session &&
    !document.querySelector("dialog[open]") &&
    Date.now() - lastTouch > 180000 &&
    !busy &&
    (page !== "browse" || galleryPage !== 0 || filter !== "All worlds")
  ) {
    galleryPage = 0;
    filter = "All worlds";
    navigate("browse");
  }
}, 10000);
remember();
render();
updateNav();
