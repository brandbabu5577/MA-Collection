// MA Collection — Supabase project configuration.
//
// Replace both placeholder values with your own project's values from the
// Supabase Dashboard: Project Settings -> API.
//
// The "publishable" / "anon" key is designed to be shipped in a browser: it
// only ever grants the access that Row Level Security allows for the signed-in
// user. NEVER put a service-role key in this file (or anywhere in the frontend).
const supabaseConfig = {
  url: 'YOUR_SUPABASE_PROJECT_URL', // e.g. https://your-project-ref.supabase.co
  anonKey: 'YOUR_SUPABASE_ANON_KEY' // publishable / anon public key
};

export default supabaseConfig;
