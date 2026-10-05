// Supabase project for visit records. The anon key is public by design: the
// kiosk_sessions table only lets it INSERT (backend db/09_kiosk_sessions.sql).
// Never put the service-role key here.
window.KIOSK_CONFIG = {
  supabaseUrl: 'https://usnynhvxctcyqntuexlc.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzbnluaHZ4Y3RjeXFudHVleGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTU0MDQsImV4cCI6MjA5MTk5MTQwNH0.4jz0kBuvwdzvnbKb5KHEBn5Cv2LrdEnPyzT4hVR__V8',
  table: 'kiosk_sessions',
  // Headset bridge: Quest headsets register under /users/{id} and follow /users/{id}/scene.
  firebaseUrl: 'https://immersivesmile-test-default-rtdb.asia-southeast1.firebasedatabase.app'
};
