"use strict";
const scenes = [
  [33, "SinharajaSanctuary", "A peaceful river, waterfalls and an elephant family.", "Nature", 10, "Seated · optional one-squeeze feeding", "sinharaja"],
  [35, "JustOneBiscuit", "A biscuit, two friends and a little kindness.", "Wonder", 10, "Seated · watch the story", "biscuit"],
  [34, "Nightfall_Main", "Choose a car and discover a softly lit palace estate.", "Journey", 13, "Guided drive · moving viewpoint", "nightfall"],
  [32, "Scene_4_Solarland", "Visit floating islands aboard a magical airship.", "Journey", 13, "Airship journey · moving viewpoint", "solarland"],
  [
    24,
    "StarHeart",
    "A lotus cavern, a butterfly guide and a journey into starlight.",
    "Wonder",
    13,
    "Cave journey · moving viewpoint",
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
      Scene_4_Solarland: "Solarland",
      Nightfall_Main: "Nightfall",
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
let disposeSessionBall = null, disposeStaffBall = null, staffBallId = "";
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
// Android app only: phone-specific polish in styles.css (the iPad app never gets this class).
if (window.AndroidKiosk) document.documentElement.classList.add("android");
function poster(s) {
  if (window.KIOSK_RECORDINGS?.[s.name])
    return window.KIOSK_RECORDINGS[s.name].poster || "assets/welcome.png";
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
// VR headsets come from the backend: the admin portal assigns them to this
// app's hospital (and branch). Their live state — online, battery, current
// scene — is read from the Firebase bridge they report to, and scenes are sent
// there. One headset → the visitor goes straight in; several → they choose.
// Loop length sent with every scene (SceneSelector.cs maxSegments): 1 = 30 s, 2 = 1 min, 3 = 1:30.
const SCENE_SEGMENTS = 3,
  ONLINE_MS = 45000,
  LOBBY = { id: 0, name: "MainScene", label: "Main Menu" };
const account = () => window.KioskAccount?.state || {},
  signedIn = () => !!account().signedIn,
  firebase = () =>
    (account().context?.firebase_url || window.KIOSK_CONFIG?.firebaseUrl || "").replace(/\/$/, ""),
  assigned = () => account().context?.headsets || [];
let headsets = [], // assigned headsets merged with what Firebase reports
  records = [], // latest Firebase /users records
  chosenHeadset = null, // this visit's pick: an assigned headset id, or "preview"
  headsetPolling = false,
  choicesKey = "";
const onlineHeadsets = () => headsets.filter((h) => h.online);
// A branch with exactly one headset: visitors skip the headset step and their
// world starts as soon as that headset is online.
function soleHeadset() {
  const a = assigned();
  return a.length === 1 ? a[0].id : null;
}
// A headset is found by the ID registered in the admin portal: its Firebase
// record id, or the permanent deviceUid newer headset apps report.
function mergeHeadsets() {
  const now = Date.now();
  headsets = assigned().map((a) => {
    const want = String(a.device_id || "").toLowerCase();
    const r = records
      .filter((x) => x.key.toLowerCase() === want || (x.uid && x.uid === want))
      .sort((x, y) => y.seen - x.seen)[0];
    return {
      id: a.id,
      name: a.name,
      deviceId: a.device_id,
      key: r?.key || a.device_id,
      model: r?.model || null,
      seen: r?.seen || 0,
      online: !!r && now - r.seen < ONLINE_MS,
      battery: r && r.battery != null && r.battery >= 0 ? r.battery : null,
      showing: r?.showing || null,
    };
  });
}
function battery(h, cls = "") {
  if (!h || h.battery == null) return "";
  const p = Math.max(0, Math.min(100, h.battery)),
    tone = p <= 15 ? "low" : p <= 35 ? "mid" : "ok";
  return `<span class="battery ${tone} ${cls}" aria-label="Battery ${p}%"><span class="battery-shell"><span style="width:${Math.max(p, 8)}%"></span></span>${p}%</span>`;
}
let waitTimer = null;
const vrIcon =
  '<svg class="vr-icon" viewBox="0 0 48 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M7 6h34a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4h-9l-4-5h-8l-4 5H7a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z"/><circle cx="15" cy="16" r="3.5"/><circle cx="33" cy="16" r="3.5"/></svg>';
const screenIcon =
  '<svg class="vr-icon" viewBox="0 0 48 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="9" y="3" width="30" height="24" rx="4"/><path d="M21 22h6"/></svg>';
async function pollHeadsets() {
  if (headsetPolling) return;
  const base = firebase();
  if (base && signedIn() && assigned().length) {
    headsetPolling = true;
    try {
      const res = await fetch(`${base}/users.json`, {
        cache: "no-store",
        signal: AbortSignal.timeout?.(8000),
      });
      if (!res.ok) throw Error(res.status);
      const data = (await res.json()) || {};
      records = Object.entries(data)
        .filter(([, u]) => u && typeof u === "object")
        .map(([key, u]) => ({
          key,
          uid: typeof u.deviceUid === "string" ? u.deviceUid.trim().toLowerCase() : "",
          seen:
            typeof u.lastSeen === "number"
              ? u.lastSeen
              : typeof u.connectedAt === "number"
                ? u.connectedAt
                : 0,
          model: typeof u.name === "string" ? u.name : null,
          battery: typeof u.batteryPercentage === "number" ? Math.round(u.batteryPercentage) : null,
          showing: u.telemetry?.sceneName || null,
        }));
    } catch (e) {
      // Keep the last records; their heartbeats age into "offline" on their own.
    } finally {
      headsetPolling = false;
    }
  }
  mergeHeadsets();
  connection();
  if ($("settings").open) { renderHeadsets(); renderBallHeadsets(); }
  if (page === "headset") renderHeadsetChoices();
  if (page === "waiting") waitingStatus();
  if (page === "waiting" && !busy && !session && onlineHeadsets().some((h) => h.id === chosenHeadset)) start();
  if (page === "session" && session) sessionStatus();
}
async function sendScene(headset, scene) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(
        `${firebase()}/users/${encodeURIComponent(headset.key)}/scene.json`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: scene.id,
            name: scene.name,
            label: scene.label ?? scene.title,
            segments: SCENE_SEGMENTS,
            stop: false,
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
  const online = onlineHeadsets(),
    el = $("connection");
  el.classList.toggle("live", signedIn() && online.length > 0);
  el.innerHTML = !signedIn()
    ? "○ Not signed in"
    : !assigned().length
      ? "○ No headset assigned"
      : online.length
        ? `● ${online.length === 1 ? esc(online[0].name) : `${online.length} headsets`} online${online.length === 1 ? battery(online[0], "in-pill") : ""}`
        : `○ ${assigned().length === 1 ? esc(assigned()[0].name) : "Headsets"} offline`;
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
// Staff panel: the account this app works for and the headsets assigned to it.
function renderAccount() {
  const c = account().context;
  $("accountBox").innerHTML = c
    ? `<div class="account-row"><img src="${esc(c.hospital?.logo_url || "assets/brand/mark.png")}" alt="" onerror="this.src='assets/brand/mark.png'"><span><strong>${esc(c.hospital?.name || "Hospital")}</strong><small>${esc(c.branch?.name || "All branches")} · signed in as ${esc(c.user?.full_name || c.user?.email || "staff")}</small></span></div>`
    : "<p>Not signed in.</p>";
  if (account().notice)
    $("accountBox").innerHTML += `<p class="signin-error">${esc(account().notice)} Visits stay saved on this device until then.</p>`;
}
function renderHeadsets() {
  renderAccount();
  $("headsetList").innerHTML = headsets.length
    ? headsets
        .map(
          (h) =>
            `<div class="headset-option"><span class="headset-dot ${h.online ? "on" : ""}"></span><span><strong>${esc(h.name)}</strong><small>${h.online ? "Online" : h.seen ? `Last seen ${ago(h.seen)}` : "Not seen yet"} · ${esc(h.deviceId)}${h.online && h.showing ? ` · showing ${esc(h.showing)}` : ""}</small></span>${h.online ? battery(h) : ""}</div>`,
        )
        .join("")
    : '<p class="small-note">No headset is assigned here yet. Your administrator adds headsets for your hospital and branch in the admin portal; they appear here straight away.</p>';
}
// Visitor headset step: online headsets plus an explicit "no headset" choice.
function renderHeadsetChoices(force) {
  const el = $("headsetChoices");
  if (!el) return;
  const online = onlineHeadsets(),
    picked =
      chosenHeadset && chosenHeadset !== "preview"
        ? headsets.find((h) => h.id === chosenHeadset)
        : null,
    ready =
      chosenHeadset === "preview" || online.some((h) => h.id === chosenHeadset),
    key =
      headsets.map((h) => `${h.id}:${h.online}:${h.battery}`).join() + "|" + chosenHeadset;
  // Rebuilding while a finger is down can swallow the tap, so only redraw on real changes.
  if (force || key !== choicesKey) {
    choicesKey = key;
    const choice = (value, icon, title, sub, extra = "", disabled = false) =>
      `<button type="button" role="radio" aria-checked="${chosenHeadset === value}" class="headset-card${chosenHeadset === value ? " selected" : ""}${extra}" data-choice="${esc(value)}"${disabled ? " disabled" : ""}>${icon}<strong>${title}</strong><small>${sub}</small><span class="check" aria-hidden="true">✓</span></button>`;
    el.innerHTML =
      headsets
        .map((h) =>
          choice(
            h.id,
            vrIcon,
            esc(h.name),
            h.online
              ? `<span class="headset-dot on"></span>Online${battery(h)}`
              : '<span class="headset-dot"></span>Offline · switch it on to use it',
            h.online ? "" : " offline",
            !h.online,
          ),
        )
        .join("") +
      (headsets.length
        ? online.length
          ? ""
          : '<div class="headset-empty"><span class="scan" aria-hidden="true"></span><strong>Waiting for a headset…</strong><small>Switch on a headset and open Immersive Smile. It lights up here when it’s ready.</small></div>'
        : '<div class="headset-empty"><strong>No headset set up yet</strong><small>Ask staff to set up a headset. You can still watch on this screen.</small></div>') +
      choice(
        "preview",
        screenIcon,
        "No headset",
        "Watch the preview on this screen",
        " preview-card",
      );
  }
  $("start").disabled = !ready || busy;
  $("headsetHint").textContent = ready
    ? chosenHeadset === "preview"
      ? "The world will play here on this screen."
      : `Put on the ${picked.name}. We’ll take you there.`
    : picked
      ? `${picked.name} went offline. Choose a headset again.`
      : "Choose the headset you’re wearing.";
}
function sessionStatus() {
  if (!session || session.demo || !$("headsetStatus")) return;
  const h = headsets.find((x) => x.id === session.headset.id);
  $("headsetStatus").innerHTML = h?.online
    ? `${esc(h.name)} · online${battery(h)}`
    : `${esc(session.headset.name)} · not responding`;
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
function waitingStatus() {
  const el = $("waitingStatus"),
    h = headsets.find((x) => x.id === chosenHeadset);
  if (!el) return;
  el.innerHTML = h?.online
    ? `<span class="headset-dot on"></span>${esc(h.name)} is ready${battery(h)}`
    : `<span class="headset-dot"></span>Waiting for ${esc(h?.name || "your headset")}`;
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
  clearInterval(waitTimer);
  if (page === "feedback" && next !== "feedback")
    track((d) => {
      if (d.active()) d.finish();
    });
}
function navigate(next, { replace = false, force = false } = {}) {
  // Until staff sign in to a hospital, only the staff sign-in shows.
  if (!signedIn() && !session && page !== "feedback") next = "signin";
  if (busy && !["session", "feedback", "complete"].includes(next)) {
    toast("Please wait for the current action to finish.");
    return;
  }
  if (session && next !== "session") {
    toast("End the current experience before leaving.");
    return;
  }
  if (page === "feedback" && next !== "complete" && !force) {
    toast("Tap a face to tell us how you feel.");
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
  const lock = !!session || page === "feedback" || page === "signin";
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
  window.NightfallControls?.dispose();
  disposeSessionBall?.(); disposeSessionBall = null;
  root.querySelectorAll("video").forEach((v) => v.pause());
  if (!signedIn() && !session && page !== "feedback" && page !== "complete") page = "signin";
  document.body.classList.toggle("signed-out", page === "signin");
  if (page === "signin") {
    root.innerHTML = `<section class="signin content"><div class="signin-card"><img class="signin-logo" src="assets/brand/mark.png" alt="" width="72" height="72"><p class="eyebrow">STAFF SIGN-IN</p><h1>Welcome to <em>Immersive Smile</em></h1><p>Sign in with the staff account your administrator created for you. You only need to do this once on this device.</p><form id="signinForm" autocomplete="on" novalidate><label>Email or username<input id="siUser" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></label><label>Password<span class="password-field"><input id="siPass" name="password" type="password" autocomplete="current-password" required><button type="button" class="text-button" id="siShow" aria-label="Show password">Show</button></span></label><p class="signin-error" id="siError" role="alert" hidden></p><button class="primary" id="siSubmit" type="submit">SIGN IN <span>→</span></button></form></div></section>`;
    const fail = (msg) => {
      $("siError").textContent = msg;
      $("siError").hidden = false;
    };
    $("siShow").onclick = () => {
      const show = $("siPass").type === "password";
      $("siPass").type = show ? "text" : "password";
      $("siShow").textContent = show ? "Hide" : "Show";
    };
    $("signinForm").onsubmit = async (e) => {
      e.preventDefault();
      const identifier = $("siUser").value.trim(),
        password = $("siPass").value;
      $("siError").hidden = true;
      if (!identifier || !password) return fail("Enter your email or username and your password.");
      $("siSubmit").disabled = true;
      $("siSubmit").innerHTML = "SIGNING IN…";
      const r = await window.KioskAccount.signIn({ identifier, password });
      if (!r?.ok) {
        $("siSubmit").disabled = false;
        $("siSubmit").innerHTML = "SIGN IN <span>→</span>";
        return fail(r?.error || "Couldn’t sign in. Please try again.");
      }
      const c = r.context || {};
      toast(`Signed in · ${c.hospital?.name || "hospital"}${c.branch ? ` · ${c.branch.name}` : ""}`);
    };
    setTimeout(() => $("siUser")?.focus(), 50);
    return;
  }
  if (page === "home") {
    root.innerHTML = `<section class="attract"><p class="eyebrow">A LITTLE WONDER. A MOMENT FOR YOU.</p><h1>IMMERSIVE SMILE</h1><p class="sub">Your World. Your Moment.</p><div class="welcome-bottom"><button id="enter" class="primary">TOUCH TO ENTER &nbsp; →</button><p>Discover immersive worlds designed around comfort, curiosity and connection.</p></div></section>`;
    $("enter").onclick = () => navigate("browse");
    return;
  }
  if (page === "browse") {
    root.innerHTML = `<section class="discovery content"><div class="discovery-intro"><div><p class="eyebrow">A MOMENT OF WONDER</p><h1>Where will you <br><em>escape today?</em></h1><p>Choose a world. Make it your moment.</p></div><div class="journey-step"><span class="step active">1</span><span>Choose a world</span><span class="step">2</span><span>About you</span><span class="step">3</span><span>${soleHeadset() ? "Step inside" : "Your headset"}</span></div></div><div class="browse-tools"><div class="filters" id="filters">${[
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
    root.innerHTML = `<section class="preview-page content"><div class="preview-nav"><button class="back" id="back">← All worlds</button><span class="eyebrow">TAKE A LOOK AROUND</span><button id="nextWorld" class="back">Next world →</button></div><div class="preview-stage">${media(selected)}<div class="preview-caption"><span class="tag">${selected.category}</span><h1>${esc(familyTitle(selected))}</h1><p>${familyDescription(selected)}</p></div></div><div class="preview-under"><div class="tags"><span class="tag">Suggested ${selected.age}+</span><span class="tag">${selected.motion.replace("Legacy scene · review suitability", "Explore at your own pace")}</span></div><div class="media-controls"><button id="playPreview">Ⅱ Pause preview</button><button id="audioToggle">${soundIcon} Sound off</button></div></div>${interactionGuide(selected)}${family.length > 1 ? `<div class="versions"><span>Choose your version</span><div>${family.map((v) => `<button data-version="${v.id}" class="${v.id === selected.id ? "selected" : ""}" aria-pressed="${v.id === selected.id}">${versionLabel(v)}</button>`).join("")}</div><select id="versionSelect" class="version-select" aria-label="World version">${family.map((v) => `<option value="${v.id}" ${v.id === selected.id ? "selected" : ""}>${versionLabel(v)}</option>`).join("")}</select></div>` : ""}${warning ? `<p class="review-notice">${selected.id === 31 ? "This world is still being prepared. Choose another world to begin." : "This world needs a staff check before use."}<button class="text-button" id="reviewDetails">Details</button></p>` : ""}<div class="start-dock"><div><p class="eyebrow">NEXT · ABOUT YOU</p><p>${soleHeadset() ? "Three quick questions, then your world starts in the headset." : "Three quick questions, then choose your headset."}</p></div><button class="primary" id="start" ${selected.id === 31 ? "disabled" : ""}>${selected.id === 31 ? "COMING SOON" : "CONTINUE"} <span>→</span></button></div><p class="recording-note">${esc(recordingNote(selected))}</p></section>`;
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
    if (!videoSource(selected)) $("playPreview").textContent = "Video pending";
    $("playPreview").onclick = () => {
      const v = document.querySelector("video");
      if (!v) return;
      if (v.paused) playVideo();
      else v.pause();
    };
    bindAudio();
    $("start").onclick = () => {
      intake = { age: null, gender: null, stress: null };
      chosenHeadset = null;
      navigate("intake");
    };
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
    root.innerHTML = `<section class="intake content"><div class="preview-nav"><button class="back" id="back">← ${esc(familyTitle(selected))}</button><span class="eyebrow">STEP 2 OF ${soleHeadset() ? 2 : 3} · ABOUT YOU</span><span class="world-chip"><img src="${poster(selected)}" alt="">${esc(family.length > 1 ? versionLabel(selected) : familyTitle(selected))}</span></div><div class="intake-head"><h1>Before we <em>begin…</em></h1><p>Three quick taps help us make every visit a little better.</p></div><div class="intake-grid"><section class="question" id="qAge"><p class="q-label"><span>1</span>How old are you?</p><div class="age-entry"><button type="button" class="age-step" data-step="-1" aria-label="Younger">−</button><input id="ageInput" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="off" placeholder="Type age" aria-label="Age in years"><button type="button" class="age-step" data-step="1" aria-label="Older">+</button></div><div class="age-strip" id="ageStrip" role="radiogroup" aria-label="Or tap an age">${Array.from({ length: 99 }, (_, i) => `<button type="button" role="radio" aria-checked="false" data-age="${i + 1}">${i + 1}</button>`).join("")}</div></section><section class="question" id="qGender"><p class="q-label"><span>2</span>Gender</p><div class="choice-row" role="radiogroup" aria-label="Gender">${GENDERS.map(([v, l]) => `<button type="button" role="radio" aria-checked="false" data-gender="${v}">${l}</button>`).join("")}</div></section><section class="question wide" id="qStress"><div class="q-head"><p class="q-label"><span>3</span>How stressed or worried do you feel right now?</p><div class="mood-hero" id="stressHero"></div></div>${moodScale("stress", STRESS, stressHue, stressFace)}<div class="scale-ends"><span>Calm</span><span>Very stressed</span></div></section></div><div class="start-dock"><div><p class="eyebrow">${soleHeadset() ? "NEXT · STEP INSIDE" : "NEXT · YOUR HEADSET"}</p><p id="intakeHint"></p></div><div class="dock-actions"><button type="button" class="text-button" id="skipIntake">Skip questions</button><button class="primary" id="start">CONTINUE <span>→</span></button></div></div></section>`;
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
      continueToHeadset();
    };
    $("start").onclick = continueToHeadset;
    syncIntake(true, true);
    return;
  }
  if (page === "waiting") {
    root.innerHTML = `<section class="waiting-page content"><div class="preview-nav"><button class="back" id="back">← About you</button><span class="eyebrow">ALMOST THERE</span><span class="world-chip"><img src="${poster(selected)}" alt="">${esc(sceneLabel(selected).replace(/^.* · /, ""))}</span></div><div class="waiting-card" role="status"><video class="wear-video" src="assets/guide/wear-headset.mp4" poster="assets/guide/wear-headset.jpg" autoplay loop muted playsinline aria-label="Please turn on your VR headset and wear it"></video><p>Your world starts by itself as soon as the headset is switched on and connected.</p><p class="small-note waiting-status" id="waitingStatus"></p></div></section>`;
    // The "turn on and wear it" loop plays until the headset is online; navigating to the session stops it.
    document.querySelector(".wear-video")?.play().catch(() => {});
    waitingStatus();
    $("back").onclick = () => {
      if (navIndex > 0) history.back();
      else navigate("intake");
    };
    pollHeadsets();
    waitTimer = setInterval(pollHeadsets, 2000);
    return;
  }
  if (page === "headset") {
    root.innerHTML = `<section class="headset-page content"><div class="preview-nav"><button class="back" id="back">← About you</button><span class="eyebrow">STEP 3 OF 3 · YOUR HEADSET</span><span class="world-chip"><img src="${poster(selected)}" alt="">${esc(sceneLabel(selected).replace(/^.* · /, ""))}</span></div><div class="intake-head"><h1>Which headset <em>are you using?</em></h1><p>Tap the headset you’re wearing — a headset lights up when it’s switched on.</p></div><div class="headset-grid" id="headsetChoices" role="radiogroup" aria-label="VR headset"></div><div class="start-dock"><div><p class="eyebrow">STEP INSIDE</p><p id="headsetHint"></p></div><button class="primary" id="start" disabled>LET’S BEGIN <span>→</span></button></div></section>`;
    $("back").onclick = () => {
      if (navIndex > 0) history.back();
      else navigate("intake");
    };
    $("headsetChoices").onclick = (e) => {
      const b = e.target.closest("[data-choice]");
      if (!b) return;
      chosenHeadset = b.dataset.choice;
      renderHeadsetChoices(true);
    };
    $("start").onclick = start;
    renderHeadsetChoices(true);
    pollHeadsets();
    return;
  }
  if (page === "session") {
    root.innerHTML = `<section class="content"><div class="session-title"><p class="eyebrow">${session.demo ? "PREVIEW" : "YOUR EXPERIENCE"}</p><h1>${esc(selected.title)}</h1><p>${esc(guideFor(selected).summary)}</p></div><div id="sceneControls"></div>${session.demo ? "" : `<details class="ball-session"><summary>Staff · stress-ball defaults</summary><div id="ballSessionControls"></div></details>`}<div class="session-grid">${media(selected)}<aside class="interaction">${interactionGuide(selected)}</aside></div><p class="small-note" style="text-align:center">${esc(recordingNote(selected))}</p><div class="media-controls"><button id="playPreview">▷ Play preview</button><button id="pausePreview">Ⅱ Pause preview only</button><button id="audioToggle">${soundIcon} Enable preview sound</button></div><div class="status-list"><div class="status-row"><span>Experience</span><strong id="experienceStatus">${session.demo ? "Playing on this screen" : "Sending…"}</strong></div><div class="status-row"><span>Headset</span><strong id="headsetStatus">${session.demo ? "None — preview only" : "Checking…"}</strong></div><div class="status-row"><span>Elapsed</span><strong id="elapsed">00:00</strong></div></div><div class="actions"><button id="end" class="primary">End experience</button></div></section>`;
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
    if (!session.demo) disposeSessionBall = window.StressBallControls.mount($("ballSessionControls"), firebase(), session.headset.key);
    if (selected.id === 34 && !session.demo)
      window.NightfallControls.mount($("sceneControls"), firebase(), session.headset.key);
    return;
  }
  if (page === "feedback") {
    root.innerHTML = `<section class="feedback-page" id="feedbackPage"><div class="sparkles" aria-hidden="true">${"<i></i>".repeat(12)}</div><p class="eyebrow">ONE LAST THING</p><h1>How do you feel now after <em>Immersive Smile Plus?</em></h1><div class="mood-hero feel-hero" id="feelHero"></div>${moodScale("feel", FEEL, feelHue, feelFace)}<div class="scale-ends"><span>Not good</span><span>Amazing</span></div><label class="feedback-note"><span>Anything you’d like to tell us? <em>Optional</em></span><textarea id="feelNote" maxlength="500" rows="3" placeholder="What did you enjoy? What could be better?"></textarea></label><div class="feedback-actions"><button class="primary" id="sendFeel">SEND MY SMILE <span>→</span></button><p class="small-note" id="feelHint">Tap a face to continue.</p></div></section>`;
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
      $("feelHint").style.visibility = v == null ? "visible" : "hidden";
    };
    bindScale("feel", pick);
    pick(feedbackScore);
    $("sendFeel").onclick = () => {
      if (feedbackScore == null) return;
      const note = $("feelNote").value.trim().slice(0, 500);
      track((d) => {
        d.feedback(feedbackScore, note);
        d.finish();
      });
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
    : soleHeadset()
      ? "All set. Your world starts in the headset."
      : "All set. Next, choose your headset.";
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
  return [24, 25, 33, 32, 20, 27, 21, 22, 23, 2, 3, 4]
    .map((id) => scenes.find((s) => s.id === id))
    .filter((s) => filter === "All worlds" || s.category === filter);
}
function card(s) {
  return `<button class="card${window.KIOSK_RECORDINGS?.[s.name]?.previewMissing ? " preview-pending" : ""}" data-id="${s.id}" aria-label="Preview ${esc(familyTitle(s))}">${window.KIOSK_RECORDINGS?.[s.name]?.previewMissing ? "" : `<img loading="eager" src="${poster(s)}" alt="">`}<span class="card-top"><span>${s.id === 31 ? "COMING SOON" : window.KIOSK_RECORDINGS?.[s.name]?.previewMissing ? "Preview pending" : s.category}</span><span>${s.age}+</span></span><span class="card-copy"><h3>${familyTitle(s)}</h3><span class="description">${familyDescription(s)}</span><span class="card-bottom"><span>${s.id === 31 ? "See work in progress" : "Explore this world"}</span><span class="arrow">↗</span></span></span></button>`;
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
  return `<div class="hero">${src ? `<video src="${esc(src)}" poster="${poster(s)}" loop muted playsinline preload="none" aria-label="Prerecorded ${esc(s.title)} preview"></video>` : `<img ${window.KIOSK_RECORDINGS?.[s.name]?.previewMissing ? 'style="visibility:hidden"' : ""} src="${poster(s)}" alt="${window.KIOSK_RECORDINGS?.[s.name]?.poster?.includes("recordings/") || ["garden", "ocean"].includes(s.art) ? "Scene screenshot" : "Illustrative cover artwork"}"><div class="no-video">${esc(window.KIOSK_RECORDINGS?.[s.name]?.missingNote || "Recording not added yet. Staff can add this scene’s MP4 in setup.")}</div>`}<span class="badge">${src ? (window.KIOSK_RECORDINGS?.[s.name] && !uploadUrls.has(s.id) ? (window.KIOSK_RECORDINGS[s.name].simulated ? "▷ UNITY RECORDING · SIMULATED INPUT" : "▷ UNITY RECORDING") : "▷ RECORDED PREVIEW") : "STILL PREVIEW"}</span></div>`;
}
function bindAudio() {
  const b = $("audioToggle");
  if (!b) return;
  const silent = !uploadUrls.has(selected.id) && window.KIOSK_RECORDINGS?.[selected.name]?.audio === false;
  b.disabled = !videoSource(selected) || silent;
  if (silent) b.textContent = "Silent preview";
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
  // Leaving the page cancels playback (AbortError); only a real autoplay refusal needs the hint.
  if (v)
    v.play().catch((e) => {
      if (e?.name !== "AbortError" && v.isConnected && v.getAttribute("src")) toast("Tap Play preview to start playback.");
    });
}
// After About you: with one assigned headset the world starts on it right away
// (on a holding screen until it comes online); otherwise the visitor chooses.
function continueToHeadset() {
  const only = soleHeadset();
  if (!only) return navigate("headset");
  chosenHeadset = only;
  if (onlineHeadsets().some((h) => h.id === only)) start();
  else navigate("waiting");
}
async function start() {
  if (busy || session) return;
  busy = true;
  if ($("start")) $("start").disabled = true;
  const headset =
    chosenHeadset === "preview"
      ? null
      : onlineHeadsets().find((h) => h.id === chosenHeadset) || null;
  if (!headset && chosenHeadset !== "preview") {
    busy = false;
    if (page === "headset") renderHeadsetChoices(true);
    return;
  }
  const sent = headset ? await sendScene(headset, selected) : false;
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
const clock = (sec) =>
  `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
function tick() {
  if (!session) return;
  const sec = Math.floor((Date.now() - started) / 1000);
  if ($("elapsed")) $("elapsed").textContent = clock(sec);
  if (sec % 15 === 0) track((d) => d.heartbeat());
}
// Ending returns the headset to its main menu (best effort — the visitor moves on either way).
function endSession() {
  if (!session) return;
  if (!session.demo) sendScene(session.headset, LOBBY).then((sent) => {
    if (!sent) toast("Could not return the headset to its menu. Please check the headset.");
  });
  clearInterval(timer);
  session = null;
  if ($("stopDialog").open) $("stopDialog").close();
  track((d) => d.end());
  feedbackScore = null;
  navigate("feedback", { replace: true });
}
$("confirmStop").onclick = endSession;
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
      $("recordMessage").textContent = "Recording saved on this device.";
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
  if (!signedIn()) return navigate("signin");
  renderHeadsets();
  $("settings").showModal();
  renderBallHeadsets();
  refreshSync();
  window.KioskAccount.refresh().then(pollHeadsets);
};
function renderBallHeadsets() {
  const select = $("ballHeadset");
  const ids = headsets;
  const key = ids.map(h => h.key + h.name + h.online).join("|");
  if (select.dataset.choices !== key) {
    select.dataset.choices = key;
    select.innerHTML = '<option value="">Choose a headset</option>' + ids.map(h => `<option value="${esc(h.key)}">${esc(h.name)}${h.online ? "" : " · offline"}</option>`).join("");
    select.value = ids.some(h => h.key === staffBallId) ? staffBallId : "";
    if (staffBallId && !select.value) select.onchange();
  }
  if (!staffBallId && session?.headset && ids.some(h=>h.key===session.headset.key)) { select.value=session.headset.key; select.onchange(); }
}
$("ballHeadset").onchange = () => {
  disposeStaffBall?.(); disposeStaffBall=null;
  staffBallId=$("ballHeadset").value;
  if (staffBallId) disposeStaffBall=window.StressBallControls.mount($("ballStaffControls"),firebase(),staffBallId);
  else $("ballStaffControls").innerHTML="<p>Choose a headset to adjust its stress-ball defaults.</p>";
};
$("settings").addEventListener("close",()=>{disposeStaffBall?.();disposeStaffBall=null;staffBallId="";$("ballHeadset").value="";$("ballStaffControls").innerHTML="<p>Choose a headset to adjust its stress-ball defaults.</p>";});
setInterval(() => {
  if (document.visibilityState !== "hidden") pollHeadsets();
}, 4000);
// Pick up headsets added, renamed or moved in the admin portal (never mid-visit).
setInterval(() => {
  if (signedIn() && !session && !busy && document.visibilityState !== "hidden")
    window.KioskAccount.refresh();
}, 60000);
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
      s.otherPending
        ? `${s.otherPending} visit${s.otherPending === 1 ? "" : "s"} from another staff account will upload when it signs in here`
        : "",
      s.online === false ? "Offline · will upload when connected" : "",
      s.pending && s.lastError ? esc(s.lastError) : "",
      s.location ? `Location: ${esc(s.location)}` : "",
      s.deviceId ? `Device ID: ${esc(s.deviceId)}` : "",
    ]
      .filter(Boolean)
      .join("<br>");
  } catch (e) {
    el.textContent = "Visits are saved on this device.";
  }
}
$("signOut").onclick = async () => {
  if (session) return toast("End the current experience first.");
  const s = await window.KioskData.status().catch(() => ({}));
  $("signOutNote").textContent = s.pending
    ? `${s.pending} visit${s.pending === 1 ? " hasn’t" : "s haven’t"} uploaded yet. They stay on this device and upload the next time this account signs in here.`
    : "Visitors can’t use the app until staff sign in again.";
  $("signOutDialog").showModal();
};
$("confirmSignOut").onclick = async () => {
  $("signOutDialog").close();
  $("settings").close();
  await window.KioskAccount.signOut();
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
  if (!s || !s.page || !signedIn() || s.page === "signin") return;
  if (session || busy || page === "feedback") {
    navIndex = s.idx + 1;
    navMax = navIndex;
    try {
      history.pushState(snapshot(), "", "#" + page);
    } catch (err) {}
    toast(
      page === "feedback"
        ? "Tap a face to tell us how you feel."
        : "End the current experience before leaving.",
    );
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
    page !== "signin" &&
    (page !== "browse" || galleryPage !== 0 || filter !== "All worlds")
  ) {
    galleryPage = 0;
    filter = "All worlds";
    navigate("browse", { force: true });
  }
}, 10000);
// Start once we know which hospital this app is signed in to.
let wasSignedIn = null;
function onAccount(state) {
  mergeHeadsets();
  connection();
  if (state.signedIn === wasSignedIn) {
    // Same account, fresh context: headsets may have been added, renamed or removed.
    if (page === "headset") renderHeadsetChoices(true);
    if (page === "waiting") waitingStatus();
    if ($("settings").open) { renderHeadsets(); renderBallHeadsets(); }
    pollHeadsets();
    return;
  }
  wasSignedIn = state.signedIn;
  if (state.signedIn) {
    navIndex = navMax = 0;
    page = "browse";
    galleryPage = 0;
    filter = "All worlds";
    try { history.replaceState(snapshot(), "", "#browse"); } catch (e) {}
    pollHeadsets();
  } else if (!session && page !== "feedback") {
    if ($("settings").open) $("settings").close();
    page = "signin";
    try { history.replaceState(snapshot(), "", "#signin"); } catch (e) {}
  }
  render();
  updateNav();
}
window.KioskAccount.onChange(onAccount);
window.KioskAccount.ready.then((state) => {
  onAccount(state);
  if (state.signedIn) window.KioskAccount.refresh(); // pick up headset changes made while the app was closed
});
