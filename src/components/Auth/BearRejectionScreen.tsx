/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SATURN — Security Sentinel & Sentinel Bear Access Denied Gateway
 * Fullscreen edge-to-edge cinematic security lockdown screen for unauthorized accounts.
 */

import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface BearRejectionScreenProps {
  userEmail?: string | null;
}

export function BearRejectionScreen({ userEmail }: BearRejectionScreenProps) {
  const { signOut, user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Smooth entrance fade-in
    const timer = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(timer);
  }, []);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      setSignOutError(null);
      await signOut();
    } catch (err: unknown) {
      console.error('[SATURN Security] Error during sign out from rejection screen:', err);
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed. Please try again.';
      setSignOutError(errorMessage);
      setIsSigningOut(false);
    }
  };

  const displayedEmail = userEmail || user?.email;

  return (
    <div
      data-testid="saturn-bear-rejection"
      className={`relative w-full min-h-[100dvh] bg-black text-white select-none overflow-x-hidden overflow-y-auto flex flex-col items-center justify-between py-3 sm:py-5 px-3 sm:px-4 z-50 transition-opacity duration-500 ease-out motion-reduce:transition-none ${
        mounted ? 'opacity-100' : 'opacity-0'
      }`}
      aria-label="Access Denied Security Screen"
      role="region"
    >
      <style>{`
        @keyframes saturnBearBreathing {
          0%, 100% {
            transform: scale(1.0);
          }
          50% {
            transform: scale(1.025);
          }
        }
        @keyframes saturnHudScan {
          0% {
            top: 4%;
            opacity: 0;
          }
          15% {
            opacity: 0.45;
          }
          85% {
            opacity: 0.45;
          }
          100% {
            top: 94%;
            opacity: 0;
          }
        }
        .animate-bear-breathing {
          animation: saturnBearBreathing 14s ease-in-out infinite;
        }
        .animate-hud-scan {
          animation: saturnHudScan 7s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-bear-breathing,
          .animate-hud-scan {
            animation: none !important;
          }
        }
      `}</style>

      {/* 
        LAYER 1: Ambient Background Scenery (Fixed behind entire page)
      */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0">
        <img
          src="/assets/aistudio/image_0a352fda.png"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center filter blur-3xl scale-125 opacity-20"
        />
        <div className="absolute inset-0 bg-black/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_35%,rgba(220,38,38,0.12)_0%,rgba(245,158,11,0.05)_45%,#000000_100%)]" />
        {/* Subtle Scanlines & Grid */}
        <div
          className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(rgba(255,255,255,0)_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.5)_1px,transparent_1px)] [background-size:32px_32px]"
          aria-hidden="true"
        />
      </div>

      {/* 
        LAYER 2: Top Security HUD Header
        Left: SATURN SECURITY // RESTRICTED ACCESS
        Right: THREAT LEVEL: UNIMPRESSED
      */}
      <header className="relative w-full max-w-5xl flex items-center justify-between shrink-0 z-20 mb-2 sm:mb-3">
        {/* Status Indicator */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-red-950/80 ring-1 ring-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.12)]">
          <div className="relative flex items-center justify-center w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-75 animate-ping motion-reduce:hidden" />
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]" />
          </div>
          <span className="text-[11px] sm:text-xs font-mono tracking-wider uppercase text-red-400 font-medium">
            SATURN SECURITY <span className="text-red-700 mx-1">//</span> RESTRICTED ACCESS
          </span>
        </div>

        {/* Humorous Threat Level Readout */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-amber-950/70 ring-1 ring-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.08)]">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]" />
          <span className="text-[10px] sm:text-[11px] font-mono tracking-wider uppercase text-amber-300 font-medium">
            THREAT LEVEL: <span className="text-amber-400 font-semibold">UNIMPRESSED</span>
          </span>
        </div>
      </header>

      {/* 
        LAYER 3: Main Centered Flow Layout
        Bear and Panel are sequential flex children with ZERO overlap
      */}
      <main className="relative w-full max-w-xl flex flex-col items-center justify-center flex-1 my-auto gap-3 sm:gap-4 z-20">
        {/* 
          1. Dedicated Bear Visual Area
          Desktop size: ~420–520px wide, ~380–480px tall, constrained by viewport height
          object-fit: contain ensures entire bear, head, and raised paw are 100% visible
        */}
        <div className="relative w-full max-w-[480px] h-[300px] sm:h-[360px] md:h-[400px] max-h-[42vh] flex items-center justify-center shrink-0">
          {/* Subtle HUD Corner Markers */}
          <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-red-500/50 pointer-events-none" />
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-red-500/50 pointer-events-none" />
          <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-red-500/50 pointer-events-none" />
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-red-500/50 pointer-events-none" />

          {/* Faint Animated Scanning Line within bear frame */}
          <div className="absolute inset-x-2 h-[1px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent pointer-events-none animate-hud-scan" />

          {/* Floating Label: SECURITY GUARD // ON DUTY (in top-right corner, clear of head and paw) */}
          <div className="absolute top-2 right-2 z-20 pointer-events-none">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/85 backdrop-blur-md border border-red-950/80 ring-1 ring-red-500/30 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.9)]" />
              <span className="text-[9px] font-mono tracking-widest uppercase text-red-300 font-medium">
                SECURITY GUARD <span className="text-red-700">//</span> ON DUTY
              </span>
            </div>
          </div>

          {/* Bear Image Container */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-xl bg-black/40 border border-red-950/40 shadow-[0_0_35px_rgba(220,38,38,0.12)]">
            <img
              src="/assets/aistudio/image_0a352fda.png"
              alt="SATURN Security Sentinel Bear"
              className="w-full h-full object-contain object-center drop-shadow-[0_0_30px_rgba(0,0,0,0.95)] animate-bear-breathing"
              loading="eager"
            />
            {/* Subtle dark gradient around image edges without over-darkening the bear */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.35)_85%,#000000_100%)] pointer-events-none" />
          </div>
        </div>

        {/* 
          2. Rejection Panel (Positioned Completely BELOW the Bear Image)
          Classified-terminal appearance with dark glass surface, crimson border, and red glow
        */}
        <div className="relative w-full max-w-md p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-black/90 via-black/85 to-zinc-950/90 backdrop-blur-xl border border-red-950/80 ring-1 ring-red-500/25 shadow-[0_0_35px_rgba(220,38,38,0.2),inset_0_1px_0_rgba(255,200,120,0.08)] text-center space-y-3 shrink-0">
          {/* Subtle amber/gold rim highlight at top border */}
          <div className="absolute inset-x-12 -top-[1px] h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />

          {/* Header Lockup: Security Badge + Bold Headline + Status Pill */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" aria-hidden="true" />
              <span className="text-[10px] sm:text-[11px] font-mono tracking-widest uppercase text-red-300 bg-red-950/70 border border-red-800/40 px-2.5 py-0.5 rounded-md font-medium shadow-sm">
                IDENTITY NOT AUTHORIZED
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-wider text-white flex items-center justify-center gap-2">
              <span>ACCESS DENIED</span>
              <span role="img" aria-label="bear" className="text-lg">🐻</span>
            </h1>

            {/* Humorous line */}
            <p className="text-xs sm:text-[13px] text-amber-200/90 font-mono tracking-wide">
              The bear has reviewed your credentials. The bear is unconvinced.
            </p>

            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed pt-0.5">
              This SATURN workspace is restricted to authorized operators.
            </p>
          </div>

          {/* Dynamic Authenticated Email Display */}
          {displayedEmail && (
            <div className="py-1 px-3 rounded-lg bg-zinc-950/80 border border-red-950/60 text-xs font-mono text-zinc-400 max-w-full truncate">
              <span className="text-zinc-500">Signed in as:</span>{' '}
              <span className="text-red-200 font-semibold">{displayedEmail}</span>
            </div>
          )}

          {/* Sign Out Error Alert if any */}
          {signOutError && (
            <div className="p-2 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-xs flex items-center gap-2 text-left" role="alert">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{signOutError}</span>
            </div>
          )}

          {/* Primary Action Button: Red-to-Deep-Orange Gradient */}
          <div>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-700 hover:from-red-500 hover:via-rose-500 hover:to-amber-600 active:scale-[0.98] text-white font-medium text-xs sm:text-sm tracking-wide shadow-lg shadow-red-950/60 ring-1 ring-white/10 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4 text-white/90" />
              <span>{isSigningOut ? 'Signing Out...' : 'SWITCH ACCOUNT / SIGN OUT'}</span>
            </button>
          </div>

          {/* Friendly Disclaimer and Apology */}
          <div className="pt-2 border-t border-white/10">
            <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto text-center font-normal">
              Just for fun! 😄 This is a playful SATURN demo, not a personal judgment. Sorry if the bear&apos;s rejection hurt your feelings — no hard feelings, okay? <span className="text-amber-400 font-medium">🐻❤️</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}



