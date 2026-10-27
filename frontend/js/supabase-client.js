// MA Collection — Supabase JS v2 client.
//
// Loaded by auth.js. Defines the single shared Supabase client and exposes it
// to app.js as window.MA_SUPABASE.
//
// It uses the publishable / anon key only (see supabase-config.js). No
// service-role key is referenced anywhere in the frontend.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import supabaseConfig from './supabase-config.js';

// Treat any template value as "not configured" so the login gate shows the
// setup screen instead of trying to reach a fake project.
function isPlaceholderConfig(config) {
  const url = config && typeof config.url === 'string' ? config.url.trim() : '';
  const key = config && typeof config.anonKey === 'string' ? config.anonKey.trim() : '';
  if (!url || !key || /YOUR[-_]/i.test(url) || /YOUR[-_]/i.test(key)) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol !== 'https:' && parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost';
  } catch (_) {
    return true;
  }
}
const isPlaceholder = isPlaceholderConfig(supabaseConfig);

if (isPlaceholder) {
  throw new Error(
    'Supabase is not configured yet. Set url and anonKey in frontend/js/supabase-config.js.'
  );
}

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

// Expose the client to the classic (non-module) app.js script.
window.MA_SUPABASE = supabase;

export default supabase;
