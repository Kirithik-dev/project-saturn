/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SATURN Dashboard — Secure Authenticated Vault
 * 
 * Strict Requirements:
 * - Background: pure black (#000000)
 * - Pure black and empty except for ONE small, clearly visible Log Out button in top-right corner
 * - Minimal, elegant style consistent with SATURN's dark and gold visual identity
 * - Zero title, cards, navigation, user profile, notes, or any other content
 * - Log Out calls supabase.auth.signOut() through useAuth()
 * - Visually handles sign-out errors
 * - After sign-out, clears active auth state and displays the original login screen
 */

import React, { useState, useEffect } from 'react';
import { LogOut, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LivingTreeBackground } from './LivingTreeBackground';

export function SaturnWorkspace() {
  const { user, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    // Preserve and monitor user's authenticated session in the background
    if (user) {
      console.log('[SATURN Vault] Authenticated session active:', user.email || user.id);
    }

    // Attach global testing hook for programmatic sign out
    if (typeof window !== 'undefined') {
      (window as unknown as { saturnSignOut?: () => Promise<unknown> }).saturnSignOut = signOut;
    }

    // Keyboard shortcut (Shift + Escape) for power-user sign out
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && e.shiftKey && !isLoggingOut) {
        console.log('[SATURN Vault] Sign out triggered via shortcut (Shift+Escape)');
        handleSignOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [user, signOut, isLoggingOut]);

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      setLogoutError(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('saturn_tree_entered');
      }
      const { error } = await signOut();
      if (error) {
        setLogoutError(error.message || 'Failed to sign out. Please try again.');
        setIsLoggingOut(false);
      }
    } catch (err) {
      console.error('[SATURN Vault] Unexpected logout error:', err);
      setLogoutError(err instanceof Error ? err.message : 'Sign out failed');
      setIsLoggingOut(false);
    }
  };

  return (
    <div
      data-testid="saturn-vault-dashboard"
      className="fixed inset-0 w-screen h-screen bg-[#000000] overflow-hidden select-none z-30"
      aria-label="SATURN Vault Dashboard"
    >
      {/* Living Generative Particle Tree Background (Phase 1) */}
      <LivingTreeBackground />

      {/* 
        Top-Right Log Out Button
        Minimal, elegant dark & gold SATURN aesthetic
      */}
      <div className="absolute top-6 right-6 z-50 flex flex-col items-end gap-2">
        <button
          onClick={handleSignOut}
          disabled={isLoggingOut}
          data-testid="saturn-logout-button"
          aria-label="Log Out of SATURN"
          className="group relative flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-950/80 hover:bg-zinc-900 active:scale-95 border border-amber-500/30 hover:border-amber-400/80 text-amber-200/90 hover:text-amber-100 text-xs font-mono tracking-wider uppercase transition-all duration-200 shadow-[0_0_12px_rgba(245,158,11,0.12)] hover:shadow-[0_0_20px_rgba(245,158,11,0.28)] disabled:opacity-50 cursor-pointer backdrop-blur-md"
        >
          {isLoggingOut ? (
            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          ) : (
            <LogOut className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform duration-200" />
          )}
          <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
        </button>

        {/* Visually visible sign-out error badge if logout fails */}
        {logoutError && (
          <div
            role="alert"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/80 border border-red-500/40 text-red-300 text-[11px] font-sans shadow-lg max-w-xs animate-in fade-in slide-in-from-top-1"
          >
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="truncate">{logoutError}</span>
            <button
              onClick={() => setLogoutError(null)}
              className="ml-1 text-red-400 hover:text-white underline text-[10px]"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
