# Immersive Smile kiosk

Standalone touchscreen remote controller for the ImmersiveSmile organization. Includes all 16 scene recordings and their simulation validation traces.

Portrait-first, static HTML remote controller. Run from this directory:

```sh
python3 -m http.server 5173 --bind 127.0.0.1
```

Open http://127.0.0.1:5173. No installation or frontend build is required. Landscape and narrow layouts are supported. For an installed kiosk, serve these files on HTTPS and use the browser's managed kiosk mode.

## Experience

The kiosk opens directly on a four-card world gallery. Tap a world to see an automatic silent preview; tap Start to begin. No welcome gate or search keyboard is needed. Nature, magic and adventure filters help visitors browse, with clear Previous/More controls. The Start action stays visible at the bottom of the preview screen, including on phones.

All 16 scene IDs remain available as 12 world cards: Garden's four versions and Valley's two versions are grouped inside their preview screens. The exact selected variant is sent to the backend. MainScene (0) remains the technical lobby. Next world lets visitors compare previews without returning to the gallery. Age guidance, staff setup and preview sound are secondary controls. Motion-sensitive visitors' reduced-motion preference disables automatic preview playback and decorative transitions. Active sessions never idle-reset; other screens return to the first gallery page after three minutes.

The session screen keeps the recording, status and End action; the unavailable interaction meter has been removed. Space Island's empty scene remains previewable but cannot be started from the visitor screen.

Only one video element is created at a time. The kiosk uses ordinary muted, looping video playback; it never renders the Unity scene or streams the headset. Preview pause affects only the video. Scene recordings cannot represent live interaction/adaptation, and are explicitly labelled prerecorded.

## Visitor data & iPad app

After the preview, **About you** asks age, gender and a 0–10 stress rating; the session timer runs from Begin to End experience; then the closing question *"How do you feel now after Immersive Smile Plus?"* takes a 0–10 face rating. `session-data.js` records each visit (with location) and uploads it to the Supabase table `kiosk_sessions` (backend `db/09_kiosk_sessions.sql`). It saves locally first and retries silently, so Supabase outages never reach visitors. In a browser it uses localStorage; inside the iPad app ([yoriichi-swift-wrapper](../yoriichi-swift-wrapper)) the native layer stores visits in SQLite and syncs them. Supabase settings are in `kiosk-config.js` (anon key only).

The header has back / forward / home buttons (history-based; the iPad app adds edge swipes), and the gallery pages scroll sideways with snap as well as via Back / More worlds. Faces are drawn as SVG, so no emoji font is needed.

## Unity recordings

All 16 playable scenes have new, distinct 24-second Unity Play Mode recordings at 960×540, 24 fps, H.264/AAC. Each clip captures the real scene camera and Unity audio mix. The kiosk plays one video at a time; sound is muted until the visitor enables it.

The recording harness feeds repeatable randomized stress-ball packets (Newtons, BPM and GSR) through BLEController and BleSensorInput. It applies three scripted targets through AdaptivePresentation: light calming, stronger calming, then easing back. This demonstrates interaction and the real presentation layer; it is **not trained DQN inference, online learning, patient data or a live headset feed**. The same provenance is burned into each video.

Per-scene CSV traces and capture reports live in `recordings/`. Reports include the camera, squeeze-trigger count, audio samples and runtime errors. `recordings.js` maps each exact Unity scene name to its own video and poster. Garden variants have separate recordings. Clips begin after a brief scene warmup; StarHeart warms through its opening cave sequence.

To regenerate (inside the separate ImmersiveSmilePlusVR Unity project; see [Unity integration](unity/README.md)):

1. Exit Unity Play Mode and use **ImmersiveSmile → Kiosk → Record All Scene Previews (Simulated Input)**.
2. Run `python3 Web/Kiosk/tools/encode_recordings.py --watch` from the Unity project root. For a deliberate full re-encode, first replace `Web/Kiosk/recordings.js` with `window.KIOSK_RECORDINGS = {};`.
3. Watch `Temp/KioskRecordings/status.txt`; refresh the kiosk when encoding finishes.

The tool refuses scene dependencies containing the project's Firebase clients, uses a temporary Play Mode start scene, and restores it afterward. It never saves scene assets. Temporary JPEG frames and raw audio stay under `Temp/KioskRecordings` and can be removed after confirming the encoded videos. Play Mode renders are not a Quest performance benchmark. The recordings show the current authored scenes, including their existing visual limitations. `spaceIsland` currently contains only the default sky/camera/light and editor painter settings, without the island environment. Its video honestly shows that empty scene. Farm completed with eight existing mesh-readability errors from animal outline effects (plus Animator parameter warnings). These issues are called out in the scene detail pages. If Unity has Error Pause enabled, resume Play Mode to finish Farm capture after those errors; the tool preserves that editor preference.

Staff can override any scene's recording with a playable MP4/WebM under 200 MB. Files remain in the kiosk browser's IndexedDB; clearing browser data removes overrides. The generated welcome illustration is concept artwork. Age suggestions remain provisional content guidance, not clinical approval or verified content ratings.

## Headsets

No login, API URL or patient ID is needed. Headsets running Immersive Smile register themselves in the Firebase Realtime Database under `/users/{id}` (with a `lastSeen` heartbeat) and follow `/users/{id}/scene`. The kiosk polls `/users.json` every 4 s; a headset is online if it was seen in the last 45 s. Tapping Let's begin writes `{id, name, label, updatedAt}` to that headset's `scene`, and ending writes `MainScene` (id 0) so it returns to its menu. With no headset online, the world plays as a preview on the kiosk screen. Staff setup lists detected headsets and lets staff pin one, or choose "This screen only"; the default is Automatic. The database URL is `firebaseUrl` in `kiosk-config.js`.

## Validation

JavaScript syntax and local browser flow are checked. Live hardware operation requires valid backend credentials and an available headset; no live session was started during implementation.
