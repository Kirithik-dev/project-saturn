import { createClient } from '@supabase/supabase-js';

// Environment variable retrieval with graceful fallback to placeholders
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Baseline placeholders provided by developer
const DEFAULT_URL = 'https://urkfmgwhxyyfqghiwrjh.supabase.co';
const DEFAULT_KEY = 'sb_publishable_eJEgZeZDN5dntvlzgOnkkQ_1EfknCOw';

export const SUPABASE_URL = envUrl && envUrl.trim().length > 0 ? envUrl.trim() : DEFAULT_URL;
export const SUPABASE_ANON_KEY = envKey && envKey.trim().length > 0 ? envKey.trim() : DEFAULT_KEY;

// Storage key tracking "Remember this device" preference
const REMEMBER_PREF_KEY = 'saturn_remember_device';

export function setRememberDevicePreference(remember: boolean): void {
  try {
    localStorage.setItem(REMEMBER_PREF_KEY, remember ? 'true' : 'false');
  } catch {
    // Ignore in restricted environments
  }
}

export function getRememberDevicePreference(): boolean {
  try {
    const val = localStorage.getItem(REMEMBER_PREF_KEY);
    return val !== 'false'; // Defaults to true
  } catch {
    return true;
  }
}

/**
 * Custom storage adapter honoring the "Remember this device" setting.
 * When enabled: Auth tokens persist in localStorage across browser restarts.
 * When disabled: Auth tokens reside strictly in sessionStorage, clearing on tab/browser close.
 */
const dynamicAuthStorage = {
  getItem: (key: string): string | null => {
    try {
      // Check localStorage first, then sessionStorage
      const localVal = localStorage.getItem(key);
      if (localVal !== null) return localVal;
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      const remember = getRememberDevicePreference();
      if (remember) {
        localStorage.setItem(key, value);
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
        localStorage.removeItem(key);
      }
    } catch {
      // Silently handle sandbox storage limitations
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // Silently handle
    }
  }
};

/**
 * Returns whether Supabase has real, non-placeholder credentials configured.
 */
export function isSupabaseConfigured(): boolean {
  return (
    SUPABASE_URL.length > 0 &&
    SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
    SUPABASE_ANON_KEY.length > 0 &&
    SUPABASE_ANON_KEY !== 'your-anon-or-publishable-key'
  );
}

/**
 * Production-ready Supabase client
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: dynamicAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});
