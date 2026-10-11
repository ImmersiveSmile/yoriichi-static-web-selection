// Kiosk settings that are the same for every hospital. Nothing here is
// client-specific: staff sign the kiosk in, and the backend tells it which
// hospital, branch and VR headsets it serves (assigned in the admin portal).
window.KIOSK_CONFIG = {
  // Immersive Smile backend. Staff can change it on the sign-in screen
  // ("Server"); the iPad / Android apps pass their own default.
  apiBase: '',
  // Headset bridge, used until the backend's own setting arrives at sign-in.
  firebaseUrl: 'https://immersivesmile-test-default-rtdb.asia-southeast1.firebasedatabase.app'
};
