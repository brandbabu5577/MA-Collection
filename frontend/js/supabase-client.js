// MA Collection — Supabase JS v2 client (Step 0: configuration only).
//
// This module defines the single shared Supabase client. It is intentionally
// NOT loaded by index.html yet, so the existing app behavior is unchanged.
// Later phases will load it and use the exported `supabase` client.
//
// It uses the publishable / anon key only (see supabase-config.js). No
// service-role key is referenced anywhere in the frontend.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import supabaseConfig from './supabase-config.js';

const isPlaceholder =
  typeof supabaseConfig.url !== 'string' ||
  typeof supabaseConfig.anonKey !== 'string' ||
  supabaseConfig.url.includes('YOUR_SUPABASE') ||
  supabaseConfig.anonKey.includes('YOUR_SUPABASE');

if (isPlaceholder) {
  throw new Error(
    'Supabase is not configured yet. Set url and anonKey in frontend/js/supabase-config.js.'
  );
}

export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

// Expose the client for the existing classic (non-module) app script to use in
// later steps without a bundler. Harmless while this file is not loaded.
window.MA_SUPABASE = supabase;

export default supabase;
