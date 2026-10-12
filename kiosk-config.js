// App settings shared by every hospital. Nothing here is client-specific:
// staff sign in with the account an administrator created for them, and
// Supabase tells the app which hospital, branch and VR headsets it serves.
window.KIOSK_CONFIG = {
  // Supabase project (same one the admin portal uses). The anon key is public
  // by design: it can only call the app_* sign-in / visit functions
  // (db/12_connected_kiosk.sql) — every table stays locked. Never put the
  // service-role key here.
  supabaseUrl: 'https://usnynhvxctcyqntuexlc.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzbnluaHZ4Y3RjeXFudHVleGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTU0MDQsImV4cCI6MjA5MTk5MTQwNH0.4jz0kBuvwdzvnbKb5KHEBn5Cv2LrdEnPyzT4hVR__V8',
  // Headset bridge: Quest headsets report to /users/{id} and follow /users/{id}/scene.
  firebaseUrl: 'https://immersivesmile-test-default-rtdb.asia-southeast1.firebasedatabase.app'
};
