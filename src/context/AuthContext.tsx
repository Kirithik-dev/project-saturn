import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, setRememberDevicePreference } from '../lib/supabase';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isRecoveryMode: boolean;
  oauthError: string | null;
  authError: string | null;
  clearOAuthError: () => void;
  clearAuthError: () => void;
  resetAuth: () => Promise<void>;
  setIsRecoveryMode: (val: boolean) => void;
  signInWithEmail: (email: string, password: string, rememberMe: boolean) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<{ error: AuthError | null; needsEmailConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
  updateUserPassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

/**
 * Sanitizes OAuth and Supabase errors into clean, user-friendly copy for the login card.
 * Never leaks codes, tokens, verifiers, or stack traces into the UI.
 */
export function sanitizeOAuthError(rawError?: string | null): string {
  if (!rawError) {
    return 'Google sign-in could not be completed. Please try again.';
  }

  const lower = rawError.toLowerCase();

  if (
    lower.includes('access_denied') ||
    lower.includes('cancelled') ||
    lower.includes('canceled') ||
    lower.includes('user denied')
  ) {
    return 'Sign-in was cancelled.';
  }

  if (lower.includes('popup') || lower.includes('blocked')) {
    return 'Sign-in popup was blocked by your browser. Please allow popups and try again.';
  }

  if (
    lower.includes('pkce') ||
    lower.includes('verifier') ||
    lower.includes('exchange') ||
    lower.includes('code')
  ) {
    return 'Your session could not be verified. Please try again.';
  }

  if (lower.includes('network') || lower.includes('timeout') || lower.includes('failed to fetch')) {
    return 'Network connection issue during sign-in. Please try again.';
  }

  return 'Google sign-in could not be completed. Please try again.';
}

/**
 * Safely resolves the active web application origin.
 * Handles iframe, standalone tabs, and provides fallback to the deployment URL.
 */
export function getAppOrigin(): string {
  if (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') {
    return window.location.origin;
  }
  return 'https://ais-dev-zgaf2pnyp2kp624giao4z2-980926353955.asia-east1.run.app';
}

/**
 * Returns canonical redirect URL with a trailing slash so that Supabase's wildcard pattern
 * matching (e.g. https://domain.com/**) matches reliably.
 */
export function getAppRedirectUrl(): string {
  const origin = getAppOrigin();
  return origin.endsWith('/') ? origin : `${origin}/`;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Guards against duplicate code exchanges
  const isExchangingCodeRef = React.useRef<boolean>(false);

  const clearOAuthError = () => setOauthError(null);
  const clearAuthError = () => setAuthError(null);

  /**
   * Emergency session reset:
   * Cleans up Supabase tokens, localStorage, sessionStorage, and resets state.
   */
  const resetAuth = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[SATURN Auth] Error during emergency signOut:', e);
    }

    try {
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach((key) => {
          if (key.includes('supabase') || key.includes('sb-') || key === 'saturn_remember_device') {
            localStorage.removeItem(key);
          }
        });
        Object.keys(sessionStorage).forEach((key) => {
          if (key.includes('supabase') || key.includes('sb-')) {
            sessionStorage.removeItem(key);
          }
        });
      }
    } catch {
      // Ignore storage access errors
    }

    setUser(null);
    setSession(null);
    setAuthError(null);
    setOauthError(null);
    setIsRecoveryMode(false);
    setLoading(false);
  };

  /**
   * Coordinates single-execution PKCE code exchange in the window holding the verifier.
   */
  const exchangeAuthCode = async (code: string) => {
    if (isExchangingCodeRef.current) return;
    isExchangingCodeRef.current = true;

    console.log('[SATURN Auth] Initiating single-execution PKCE authorization code exchange...');
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.warn('[SATURN Auth] PKCE exchange error:', error.message);
        setOauthError(sanitizeOAuthError(error.message));
        // Broadcast error to any waiting popup so it closes
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('saturn_auth_channel');
            bc.postMessage({ type: 'SATURN_AUTH_ERROR' });
            bc.close();
          }
        } catch {}
        return;
      }

      if (data?.session) {
        console.log('[SATURN Auth] Session successfully established for:', data.session.user.email);
        setSession(data.session);
        setUser(data.session.user);
        setAuthError(null);
        setOauthError(null);
        setLoading(false);

        // Clean up URL if code was in address bar
        try {
          if (window.location.search.includes('code=')) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        } catch {}

        // Broadcast success to any waiting popup so it closes
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('saturn_auth_channel');
            bc.postMessage({ type: 'SATURN_AUTH_SUCCESS' });
            bc.close();
          }
        } catch {}
      }
    } catch (err) {
      console.warn('[SATURN Auth] Exception during code exchange:', err);
      setOauthError(sanitizeOAuthError(err instanceof Error ? err.message : null));
    } finally {
      isExchangingCodeRef.current = false;
    }
  };

  useEffect(() => {
    // Check for emergency reset query parameter (e.g. ?reset=true or ?logout=true)
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('reset') === 'true' || searchParams.get('logout') === 'true' || searchParams.get('recover') === 'true') {
        console.warn('[SATURN Auth Diagnostic] Emergency reset URL parameter detected. Performing clean reset.');
        resetAuth().then(() => {
          try {
            window.history.replaceState(null, '', window.location.pathname);
          } catch {}
        });
        return;
      }
    }

    let isMounted = true;

    // Helper to refresh session from storage and notify state
    const syncCurrentSession = async () => {
      try {
        const { data: { session: activeSession }, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (!error && activeSession) {
          console.log('[SATURN Auth] Session synchronized:', activeSession.user.email);
          setSession(activeSession);
          setUser(activeSession.user);
          setLoading(false);
          return activeSession;
        }
      } catch (e) {
        console.warn('[SATURN Auth] Error checking session:', e);
      }
      return null;
    };

    // 1. Check for Direct (non-popup) PKCE authorization code in URL
    const searchParams = new URLSearchParams(window.location.search);
    const authCode = searchParams.get('code');
    const isDedicatedPopup = typeof window !== 'undefined' && window.name === 'saturn_oauth_popup';

    if (authCode && !isDedicatedPopup) {
      console.log('[SATURN Auth] Direct URL authorization code detected.');
      exchangeAuthCode(authCode);
    } else {
      // 2. Initial Session Restoration
      const safetyTimer = window.setTimeout(() => {
        if (isMounted) {
          console.log('[SATURN Auth] Initial session timer completed, releasing loading lock');
          setLoading(false);
        }
      }, 1500);

      supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
        if (!isMounted) return;
        window.clearTimeout(safetyTimer);
        if (error) {
          console.warn('[SATURN Auth] Session check encountered error:', error.message);
          setAuthError(error.message);
        } else if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
        }
        setLoading(false);
      }).catch((err) => {
        if (!isMounted) return;
        window.clearTimeout(safetyTimer);
        console.warn('[SATURN Auth] Session check unexpected exception:', err);
        setAuthError(err instanceof Error ? err.message : 'Session verification failed');
        setLoading(false);
      });
    }

    // 3. Check for Password Recovery via URL fragment or OAuth errors
    const hash = window.location.hash;
    const search = window.location.search;

    if (hash && hash.includes('type=recovery')) {
      setIsRecoveryMode(true);
    }

    // Inspect URL parameters for OAuth errors returned from Supabase / Google
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(search);
    const errorParam = hashParams.get('error_description') || 
                       queryParams.get('error_description') ||
                       hashParams.get('error') || 
                       queryParams.get('error');

    if (errorParam && !isDedicatedPopup) {
      console.warn('[SATURN Auth Diagnostic] OAuth callback returned error in URL:', errorParam);
      setOauthError(sanitizeOAuthError(decodeURIComponent(errorParam)));
      try {
        window.history.replaceState(null, '', window.location.pathname);
      } catch {}
    }

    // 4. Real-time Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
      setAuthError(null);

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      } else if (event === 'SIGNED_OUT') {
        setIsRecoveryMode(false);
      }
    });

    // 5. BroadcastChannel listener (instant, reliable cross-window messaging)
    let authChannel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        authChannel = new BroadcastChannel('saturn_auth_channel');
        authChannel.onmessage = (event) => {
          if (event.data?.type === 'SATURN_AUTH_CODE' && event.data?.code) {
            console.log('[SATURN Auth] BroadcastChannel received code from popup');
            exchangeAuthCode(event.data.code);
          } else if (event.data?.type === 'SATURN_AUTH_SUCCESS') {
            console.log('[SATURN Auth] BroadcastChannel received SATURN_AUTH_SUCCESS');
            syncCurrentSession();
          } else if (event.data?.type === 'SATURN_AUTH_ERROR') {
            console.warn('[SATURN Auth] BroadcastChannel received SATURN_AUTH_ERROR:', event.data.error);
            setOauthError(sanitizeOAuthError(event.data.error));
          } else if (event.data?.type === 'SATURN_AUTH_SIGNOUT') {
            console.log('[SATURN Auth] BroadcastChannel received SATURN_AUTH_SIGNOUT');
            setUser(null);
            setSession(null);
          }
        };
      } catch (err) {
        console.warn('[SATURN Auth] BroadcastChannel initialization failed:', err);
      }
    }

    // 6. Cross-tab storage listener to pick up code or session from OAuth popup window
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'saturn_auth_broadcast') {
        try {
          const payload = e.newValue ? JSON.parse(e.newValue) : null;
          if (payload?.type === 'SATURN_AUTH_CODE' && payload?.code) {
            console.log('[SATURN Auth] Storage broadcast received code from popup');
            exchangeAuthCode(payload.code);
          } else if (payload?.type === 'SATURN_AUTH_SUCCESS') {
            console.log('[SATURN Auth] Storage broadcast received SATURN_AUTH_SUCCESS');
            syncCurrentSession();
          } else if (payload?.type === 'SATURN_AUTH_ERROR') {
            setOauthError(sanitizeOAuthError(payload.error));
          }
        } catch {}
      } else if (e.key?.includes('supabase.auth.token') || e.key?.includes('sb-') || e.key === 'saturn_remember_device') {
        syncCurrentSession();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 7. PostMessage listener to receive instant auth notification from popup
    const handleAuthMessage = (e: MessageEvent) => {
      if (e.data?.type === 'SATURN_AUTH_CODE' && e.data?.code) {
        console.log('[SATURN Auth Diagnostic] Received authorization code from postMessage');
        exchangeAuthCode(e.data.code);
      } else if (e.data?.type === 'SATURN_AUTH_SUCCESS') {
        console.log('[SATURN Auth Diagnostic] Received SATURN_AUTH_SUCCESS from postMessage');
        syncCurrentSession();
      } else if (e.data?.type === 'SATURN_AUTH_ERROR') {
        setOauthError(sanitizeOAuthError(e.data.error));
      }
    };
    window.addEventListener('message', handleAuthMessage);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('message', handleAuthMessage);
      if (authChannel) {
        try {
          authChannel.close();
        } catch {}
      }
    };
  }, []);

  const signInWithEmail = async (email: string, password: string, rememberMe: boolean) => {
    setRememberDevicePreference(rememberMe);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (!error && data.session) {
      setSession(data.session);
      setUser(data.user);
    }

    return { error };
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name || '',
          name: name || ''
        },
        emailRedirectTo: getAppRedirectUrl()
      }
    });

    const needsEmailConfirmation = !error && !data.session && !!data.user;
    return { error, needsEmailConfirmation };
  };

  const signInWithGoogle = async () => {
    setOauthError(null);
    clearAuthError();
    const redirectUrl = getAppRedirectUrl();

    console.log('[SATURN Auth Diagnostic] Initiating Google OAuth popup flow:', {
      provider: 'google',
      appOrigin: getAppOrigin(),
      redirectUrl,
      timestamp: new Date().toISOString()
    });

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account consent'
          }
        }
      });

      if (error) {
        console.warn('[SATURN Auth Diagnostic] Supabase OAuth initiation failed:', error.message);
        setOauthError(sanitizeOAuthError(error.message));
        return { error };
      }

      if (data?.url) {
        console.log('[SATURN Auth Diagnostic] Opening SATURN OAuth popup');
        const opened = window.open(data.url, 'saturn_oauth_popup', 'width=540,height=680,menubar=no,toolbar=no');
        if (!opened) {
          const popupBlockedMsg = 'Sign-in popup was blocked by your browser. Please allow popups and try again.';
          setOauthError(popupBlockedMsg);
          const popupError = {
            name: 'PopupBlockedError',
            message: popupBlockedMsg
          } as AuthError;
          return { error: popupError };
        }

        // Active poll monitor on the popup
        let pollCount = 0;
        const maxPolls = 300; // ~90 seconds
        const pollTimer = window.setInterval(async () => {
          pollCount++;

          // 1. Direct check: when popup redirects back to same origin with code or error
          try {
            if (opened && !opened.closed && opened.location.origin === window.location.origin) {
              const searchStr = opened.location.search;
              const hashStr = opened.location.hash;

              // Check for OAuth error in popup URL
              if (searchStr.includes('error=') || hashStr.includes('error=')) {
                window.clearInterval(pollTimer);
                const sParams = new URLSearchParams(searchStr);
                const hParams = new URLSearchParams(hashStr.replace(/^#/, ''));
                const errParam =
                  sParams.get('error_description') ||
                  hParams.get('error_description') ||
                  sParams.get('error') ||
                  hParams.get('error');
                console.warn('[SATURN Auth] OAuth error detected in popup URL:', errParam);
                setOauthError(sanitizeOAuthError(errParam));
                try { opened.close(); } catch {}
                return;
              }

              // Check for authorization code in popup URL
              if (searchStr.includes('code=')) {
                const sParams = new URLSearchParams(searchStr);
                const code = sParams.get('code');
                if (code) {
                  window.clearInterval(pollTimer);
                  console.log('[SATURN Auth] Code detected directly from popup URL');
                  await exchangeAuthCode(code);
                  try { opened.close(); } catch {}
                  return;
                }
              }
            }
          } catch {
            // Cross-origin restriction while popup is on Google/Supabase. Safely ignored.
          }

          // 2. Check if session already established in storage
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session) {
              window.clearInterval(pollTimer);
              setSession(sessionData.session);
              setUser(sessionData.session.user);
              try { if (opened && !opened.closed) opened.close(); } catch {}
              return;
            }
          } catch {}

          // 3. Check if popup was closed by user
          if (!opened || opened.closed || pollCount >= maxPolls) {
            window.clearInterval(pollTimer);
            setTimeout(async () => {
              const { data: finalData } = await supabase.auth.getSession();
              if (finalData?.session) {
                setSession(finalData.session);
                setUser(finalData.session.user);
              } else if (!isExchangingCodeRef.current && !user) {
                console.log('[SATURN Auth] Popup closed before login completed');
                setOauthError('Sign-in was cancelled.');
              }
            }, 300);
          }
        }, 300);
      }

      return { error: null };
    } catch (err) {
      const sanitized = sanitizeOAuthError(err instanceof Error ? err.message : null);
      setOauthError(sanitized);
      const errorObj = {
        name: 'OAuthException',
        message: sanitized
      } as AuthError;
      return { error: errorObj };
    }
  };

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAppRedirectUrl()}#type=recovery`
    });
    return { error };
  };

  const updateUserPassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (!error) {
      setIsRecoveryMode(false);
      // Clean up recovery fragment from URL
      if (window.location.hash.includes('type=recovery')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
    return { error };
  };

  const signOut = async () => {
    try {
      // 1. Broadcast sign-out across all open tabs/windows
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('saturn_auth_channel');
          bc.postMessage({ type: 'SATURN_AUTH_SIGNOUT' });
          bc.close();
        }
      } catch {}

      try {
        localStorage.removeItem('saturn_auth_broadcast');
      } catch {}

      // 2. Perform Supabase sign out
      const { error } = await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setIsRecoveryMode(false);
      setAuthError(null);
      return { error };
    } catch (err) {
      setUser(null);
      setSession(null);
      setIsRecoveryMode(false);
      setAuthError(null);
      return { error: err as AuthError };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isRecoveryMode,
        oauthError,
        authError,
        clearOAuthError,
        clearAuthError,
        resetAuth,
        setIsRecoveryMode,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        sendPasswordReset,
        updateUserPassword,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
