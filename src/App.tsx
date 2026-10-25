/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SATURN — Second Brain
 * Centralized Authentication & Security State Machine
 * 
 * Guaranteed Distinct Outcomes:
 * 1. Loading: Visible minimal loading indicator on a black background
 * 2. Unauthenticated: Original SATURN login screen over animated wave background
 * 3. Authorized: Pure black dashboard (#000000) with only the Log Out button
 * 4. Unauthorized: Full-screen Bear security screen with working Sign Out action
 * 5. Recoverable Error: Visible message with a working Return to Login action
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ParticleLandscape } from './components/Landscape/ParticleLandscape';
import { SaturnLogin } from './components/Auth/SaturnLogin';
import { SaturnWorkspace } from './components/Workspace/SaturnWorkspace';
import { BearRejectionScreen } from './components/Auth/BearRejectionScreen';
import { AuthRecoveryScreen } from './components/Auth/AuthRecoveryScreen';
import { SaturnLoader } from './components/Common/SaturnLoader';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isEmailAuthorized } from './config/authConfig';
import { SaturnOAuthCallback } from './components/Auth/SaturnOAuthCallback';
import { VoidTransition, VOID_TRANSITION_TIMINGS } from './components/Auth/VoidTransition';
import { User } from '@supabase/supabase-js';

export type AppState =
  | 'loading'          // Checking initial Supabase session -> SaturnLoader
  | 'unauthenticated'  // Showing login screen and living wave background
  | 'transitioning'    // Authorized user undergoing the cinematic wave transition
  | 'authenticated'    // Authorized user in pure black vault dashboard with Log Out
  | 'unauthorized'     // Unauthorized account blocked by Bear security screen
  | 'error';           // Recoverable authentication error screen

function SaturnContent() {
  const { user, loading, authError, clearAuthError } = useAuth();
  const [appState, setAppState] = useState<AppState>('loading');
  const [isWaveDissolving, setIsWaveDissolving] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // References to track lifecycle transitions safely
  const initialCheckCompletedRef = useRef<boolean>(false);
  const prevUserRef = useRef<User | null>(null);
  const timeoutsRef = useRef<number[]>([]);

  // Detect user preference for reduced motion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  const clearPendingTimeouts = () => {
    timeoutsRef.current.forEach((t) => window.clearTimeout(t));
    timeoutsRef.current = [];
  };

  useEffect(() => {
    return () => clearPendingTimeouts();
  }, []);

  /**
   * Triggers the cinematic "Welcome into the Void" transition for freshly authorized logins.
   * Keeps living wave active while login card exits, presents randomized interstellar title,
   * holds sequence, and dissolves seamlessly into the pure black vault.
   */
  const triggerTransition = useCallback(() => {
    clearPendingTimeouts();
    setIsWaveDissolving(false);
    setAppState('transitioning');
  }, []);

  const handleDissolveStart = useCallback(() => {
    setIsWaveDissolving(true);
  }, []);

  const handleTransitionComplete = useCallback(() => {
    setAppState('authenticated');
    setIsWaveDissolving(false);
  }, []);

  /**
   * Centralized State Machine Coordinator
   * Evaluates authentication, authorization, and error changes deterministically.
   */
  useEffect(() => {
    // 0. If there's an explicit auth restoration error, show recovery screen
    if (authError && !loading) {
      setAppState('error');
      return;
    }

    // 1. If AuthContext is still checking the session on initial boot, keep state at 'loading'
    if (loading) {
      setAppState('loading');
      return;
    }

    // 2. Initial Boot Evaluation (Page reload or initial boot)
    if (!initialCheckCompletedRef.current) {
      initialCheckCompletedRef.current = true;
      prevUserRef.current = user;

      if (!user) {
        // No active session: show login screen
        setAppState('unauthenticated');
      } else {
        // User exists: verify authorization
        const authorized = isEmailAuthorized(user.email);
        if (authorized) {
          // Returning/reload visit: immediate pure black dashboard with Log Out button
          setAppState('authenticated');
        } else {
          // Unauthorized email: show Bear security rejection screen
          setAppState('unauthorized');
        }
      }
      return;
    }

    // 3. User Signed Out
    if (!user && prevUserRef.current) {
      prevUserRef.current = null;
      clearPendingTimeouts();
      setIsWaveDissolving(false);
      setAppState('unauthenticated');
      return;
    }

    // 4. Fresh Login or User Changed
    if (user && user !== prevUserRef.current) {
      const isSameUser = prevUserRef.current && prevUserRef.current.id === user.id;
      prevUserRef.current = user;
      const authorized = isEmailAuthorized(user.email);

      if (!authorized) {
        clearPendingTimeouts();
        setAppState('unauthorized');
        return;
      }

      // Authorized user logged in: run cinematic wave transition strictly once
      if (!isSameUser && appState !== 'authenticated' && appState !== 'transitioning') {
        triggerTransition();
      }
    }
  }, [user, loading, authError, appState, triggerTransition]);

  // Visual component flags
  const showWave = appState === 'unauthenticated' || appState === 'transitioning';
  const isTransitioning = appState === 'transitioning';
  const showLogin = appState === 'unauthenticated' || appState === 'transitioning';

  return (
    <main
      data-testid={`saturn-app-root-${appState}`}
      className="relative w-screen h-screen overflow-hidden bg-[#000000] select-none"
    >
      {/* 
        OUTCOME 1: LOADING
        Visible minimal loading indicator on a black background
      */}
      {appState === 'loading' && <SaturnLoader />}

      {/* 
        OUTCOME 2 & WAVE TRANSITION: LIVING WAVE & LOGIN GATEWAY
        Active during 'unauthenticated' and cinematic 'transitioning'.
        The wave continues to flow seamlessly throughout the transition.
      */}
      {showWave && (
        <div
          className="fixed inset-0 w-full h-full pointer-events-none z-10"
          style={{
            transform: isTransitioning
              ? (prefersReducedMotion ? 'scale(1)' : 'scale(1.15)')
              : 'scale(1)',
            opacity: isWaveDissolving ? 0 : 1,
            transition: prefersReducedMotion
              ? 'opacity 300ms ease-in-out'
              : isWaveDissolving
              ? `opacity ${VOID_TRANSITION_TIMINGS.FADE_TO_BLACK_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
              : 'transform 4200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 500ms ease-out',
            transformOrigin: '50% 65%',
            willChange: 'transform, opacity',
          }}
        >
          <ParticleLandscape />
        </div>
      )}

      {/* Login Card Layer: fades away smoothly upon authorized login */}
      {showLogin && (
        <div
          className={`fixed inset-0 z-20 transition-opacity ${
            prefersReducedMotion ? 'duration-200' : 'duration-500'
          } ease-out ${
            isTransitioning ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
          }`}
          aria-hidden={isTransitioning}
        >
          <SaturnLogin isFadingOut={isTransitioning} />
        </div>
      )}

      {/* 
        CINEMATIC "WELCOME INTO THE VOID" SEQUENCE
        Active only during fresh authorized login transitions.
      */}
      {appState === 'transitioning' && (
        <VoidTransition
          prefersReducedMotion={prefersReducedMotion}
          onDissolveStart={handleDissolveStart}
          onComplete={handleTransitionComplete}
        />
      )}

      {/* 
        OUTCOME 3: AUTHORIZED
        Pure Black Dashboard (#000000) with ONLY the top-right Log Out button
      */}
      {appState === 'authenticated' && <SaturnWorkspace />}

      {/* 
        OUTCOME 4: UNAUTHORIZED
        Full-Screen Bear Rejection Security Screen with Sign Out action
      */}
      {appState === 'unauthorized' && <BearRejectionScreen userEmail={user?.email} />}

      {/* 
        OUTCOME 5: RECOVERABLE ERROR
        Visible error description with working Return to Login action
      */}
      {appState === 'error' && (
        <AuthRecoveryScreen
          message={authError}
          onRecover={() => {
            clearAuthError();
            setAppState('unauthenticated');
          }}
        />
      )}
    </main>
  );
}

export default function App() {
  const isPopup = typeof window !== 'undefined' && (
    window.name === 'saturn_oauth_popup' ||
    (window.opener !== null && (window.location.search.includes('code=') || window.location.search.includes('error=')))
  );

  if (isPopup) {
    return (
      <ErrorBoundary>
        <SaturnOAuthCallback />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SaturnContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
