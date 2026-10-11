"use strict";
// Scene-specific instructions reflect the Unity runtime, not the preview simulation.
const SCENE_GUIDES = {
  StarHeart: {
    title: "Follow the light. Let the flowers open.",
    summary: "Travel through a lotus cavern into a field of stars.",
    steps: ["A butterfly guides you through the cavern. Gently squeeze the ball or press the controller trigger to open the lotus flowers.", "Among the stars, squeeze and release to gather and send light. Look toward the glowing cues and follow the gentle prompts."],
    note: "The opening moves forward through the cavern. No aiming or walking is needed."
  },
  DreamRoad: {
    title: "A gentle squeeze takes you forward",
    summary: "Enjoy a guided drive along the island road.",
    steps: ["Gently squeeze the stress ball to build speed, or use the controller trigger.", "Relax your hand to coast towards a stop. Steering follows the road for you.", "A squeeze and release gives a soft musical horn and dashboard glow."],
    note: "The viewpoint moves and turns with the car."
  },
  CloudVoyage: {
    title: "Build speed. Rise gently. Glide back down.",
    summary: "Take off from a coastal runway in a little seaplane.",
    steps: ["Gently squeeze the stress ball, or use the controller trigger, to accelerate and take off.", "Keep gentle pressure to climb along the guided route. Release to glide down and land; the aircraft keeps some momentum."],
    note: "The aircraft begins parked. The viewpoint moves during flight."
  },
  LumiStarfall: {
    title: "Gather light. Release a little wonder.",
    summary: "Meet Lumi and a constellation whale beneath the waves.",
    steps: ["Gently squeeze to gather light in the opal egg. Release to send light into the reef.", "Repeated gentle releases invite Lumi and Astra. You can also watch as the story introduces its companions."],
    note: "Use the stress ball or controller trigger. Your viewpoint stays seated."
  },
  SleepingOcean: {
    title: "A quiet moment beneath the waves",
    summary: "Watch the ocean awaken around you.",
    steps: ["Gently squeeze to gather light in the pearl. Release to send lights into the reef and open a coral bloom.", "Look around from your seat. The story also continues without squeezing."],
    note: "Use the stress ball or controller trigger."
  },
  SinharajaSanctuary: {
    title: "One gentle squeeze. A little connection.",
    summary: "Sit comfortably by the river with an elephant family.",
    steps: ["Gently squeeze the stress ball once to send fruit to an elephant. No aiming or throwing is needed.", "Relax your hand before another squeeze. If an elephant is busy, your next gift waits its turn.", "You can also simply watch. The elephants approach, explore and share a quiet family moment on their own."],
    duration: "2-minute family sequence; the forest stays calm afterwards.",
    note: "New food gifts finish during the final part of the sequence. Controller trigger is also supported."
  },
  JustOneBiscuit: {
    title: "Make yourself comfortable. Enjoy the story.",
    summary: "Two friends discover the joy of sharing.",
    steps: ["Watch Bop and Pip’s biscuit story unfold from your seat.", "No squeezing, pointing or controller input is required."],
    duration: "4 minutes 4 seconds · complete story.",
    note: "You can end the experience at any time."
  },
  Scene_4_Solarland: {
    title: "A journey through floating islands",
    summary: "Follow the airship story and its island encounters.",
    steps: ["Squeeze the glowing helm orb when it is offered to continue the journey. The ship also sets off after a wait.", "Pull the bell when it is offered. Stress-ball or controller-trigger input can also activate these moments."],
    note: "The viewpoint travels aboard the airship."
  },
  Scene_3_farm: {
    title: "A short visit to the farm",
    summary: "Spend a moment on the farm.",
    steps: ["Look around the farm from your seat.", "Squeeze the stress ball, or use your VR controller trigger, when you'd like to interact."],
    duration: "Plays a 90-second loop · end whenever you're ready."
  },
  Nightfall_Main: {
    title: "Your car. Your evening drive.",
    summary: "Choose a car, settle into the cabin and explore the estate.",
    steps: ["Staff enables car selection. Look at a car and squeeze the ball once, or point the active controller and tap its trigger.", "Inside the cabin, release then squeeze the ball to start the guided drive when the doors are closed, or press the trigger. B / Y stops immediately.", "While parked: A / X toggles the engine, grip toggles the window, and thumbstick click toggles the door. Thumbstick left / right changes cabin lighting; up / down selects D / P."],
    note: "Use the hand selected by staff. Procedure mode keeps the car parked; Resume still requires a fresh drive press."
  }
};
function guideFor(scene) {
  return SCENE_GUIDES[scene.name] || {
    title: "A world that responds",
    summary: "Explore your chosen world comfortably.",
    steps: ["Squeeze the stress ball, or use your VR controller trigger.", "Light, movement and atmosphere unfold inside the headset."]
  };
}
function interactionGuide(scene) {
  const g = guideFor(scene);
  return `<section class="scene-guide"><p class="eyebrow">IN THE HEADSET</p><h3>${esc(g.title)}</h3><ul>${g.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ul>${g.duration ? `<p class="guide-duration">${esc(g.duration)}</p>` : ""}${g.note ? `<p class="small-note">${esc(g.note)}</p>` : ""}</section>`;
}
function recordingNote(scene) {
  const r = window.KIOSK_RECORDINGS?.[scene.name];
  if (uploadUrls.has(scene.id)) return "Locally added recording · not a live headset view.";
  if (r?.previewNote) return r.previewNote;
  return "Recorded Unity preview · simulated interaction · not a live headset view.";
}
