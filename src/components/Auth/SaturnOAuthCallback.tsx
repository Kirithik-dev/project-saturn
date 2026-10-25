/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SATURN — Minimal OAuth Callback & Handshake Handler
 * The popup is an implementation detail:
 * - Unobtrusive, minimal authenticating indicator
 * - Dispatches authorization parameters to the main window
 * - Closes immediately upon completion or cancellation
 * - Never renders error screens, stack traces, login forms, or dashboards
 */

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export function SaturnOAuthCallback() {
  const [showCloseNotice, setShowCloseNotice] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const notifyParent = (payload: { type: string; code?: string; error?: string; email?: string }) => {
      // 1. PostMessage to opener (if accessible)
      try {
        if (typeof window !== 'undefined' && window.opener && window.opener !== window) {
          window.opener.postMessage(payload, '*');
        }
      } catch {}

      // 2. BroadcastChannel
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('saturn_auth_channel');
          bc.postMessage(payload);
          bc.close();
        }
      } catch {}

      // 3. Storage event
      try {
        localStorage.setItem('saturn_auth_broadcast', JSON.stringify({ ...payload, timestamp: Date.now() }));
      } catch {}
    };

    const handleCallback = () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

        // 1. Check for error returned by provider
        const errorDesc =
          searchParams.get('error_description') ||
          hashParams.get('error_description') ||
          searchParams.get('error') ||
          hashParams.get('error');

        if (errorDesc) {
          const decoded = decodeURIComponent(errorDesc);
          console.log('[SATURN Popup] Provider returned error, forwarding to main window');
          notifyParent({ type: 'SATURN_AUTH_ERROR', error: decoded });
          closeSafely();
          return;
        }

        // 2. Extract authorization code and pass to main window
        const code = searchParams.get('code');
        if (code) {
          console.log('[SATURN Popup] Received authorization code, transmitting to main window');
          notifyParent({ type: 'SATURN_AUTH_CODE', code });
        } else {
          // No code and no error
          notifyParent({ type: 'SATURN_AUTH_ERROR', error: 'No authorization code found.' });
          closeSafely();
          return;
        }

        // Listen for completion signal from main window
        const handleMessage = (e: MessageEvent) => {
          if (e.data?.type === 'SATURN_AUTH_SUCCESS' || e.data?.type === 'SATURN_AUTH_ERROR') {
            closeSafely();
          }
        };
        window.addEventListener('message', handleMessage);

        let authChannel: BroadcastChannel | null = null;
        if (typeof BroadcastChannel !== 'undefined') {
          try {
            authChannel = new BroadcastChannel('saturn_auth_channel');
            authChannel.onmessage = (event) => {
              if (event.data?.type === 'SATURN_AUTH_SUCCESS' || event.data?.type === 'SATURN_AUTH_ERROR') {
                closeSafely();
              }
            };
          } catch {}
        }

        // Fallback safety timeout: attempt close after 1200ms
        const timer = setTimeout(() => {
          closeSafely();
        }, 1200);

        return () => {
          window.removeEventListener('message', handleMessage);
          if (authChannel) authChannel.close();
          clearTimeout(timer);
        };
      } catch (err) {
        console.warn('[SATURN Popup] Callback parsing exception:', err);
        notifyParent({ type: 'SATURN_AUTH_ERROR', error: 'Callback processing error' });
        closeSafely();
      }
    };

    const closeSafely = () => {
      try {
        window.close();
      } catch {}

      // If browser security blocks window.close(), display minimal close hint after a brief delay
      setTimeout(() => {
        if (isMounted) {
          setShowCloseNotice(true);
        }
      }, 800);
    };

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      data-testid="saturn-oauth-popup-container"
      className="fixed inset-0 w-screen h-screen bg-[#000000] flex flex-col items-center justify-center p-4 text-center select-none z-50"
    >
      <div className="flex items-center gap-2.5 text-[#F7D794]">
        <Loader2 className="w-4 h-4 animate-spin text-[#F7D794]" />
        <span className="text-xs font-mono tracking-wider uppercase text-[#F5F0E5]/80">
          Authenticating with SATURN...
        </span>
      </div>

      {showCloseNotice && (
        <p className="text-[11px] text-[#E0D8CC]/60 font-sans mt-3 animate-in fade-in duration-200">
          Please close this window to return to SATURN.
        </p>
      )}
    </div>
  );
}
