/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SATURN — Access Request & Authorization Gateway
 * AAA Sci-Fi Art Direction: Procedural "ACCESS DENIED" Glitch Headline & Refined Obsidian Gateway
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Lock, Mail, LogOut, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface BearRejectionScreenProps {
  userEmail?: string | null;
}

interface GlitchSlice {
  topPercent: number;
  heightPercent: number;
  shiftX: number;
}

interface Particle {
  id: number;
  leftPercent: number;
  topPercent: number;
  size: number;
  color: string;
  opacity: number;
  duration: number;
  delay: number;
}

export function BearRejectionScreen({ userEmail }: BearRejectionScreenProps) {
  const { signOut, user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Access request email state
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Procedural Glitch State (Background Headline ONLY)
  const [isGlitching, setIsGlitching] = useState(false);
  const [headlineText, setHeadlineText] = useState('ACCESS DENIED');
  const [glitchShiftX, setGlitchShiftX] = useState(0);
  const [glitchSlices, setGlitchSlices] = useState<GlitchSlice[]>([]);
  const [chromaticOffset, setChromaticOffset] = useState(0);

  // Reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Reset previous access-request error and success state on mount
    setRequestError(null);
    setRequestSuccess(false);

    const timer = setTimeout(() => setMounted(true), 20);
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
    }
    return () => clearTimeout(timer);
  }, []);

  // Procedural Glitch Loop (Triggers every 4 - 9 seconds for 100 - 220ms)
  // Peripheral Background Glitch Mark State
  const [peripheralMark, setPeripheralMark] = useState<string | null>(null);
  const [peripheralPosition, setPeripheralPosition] = useState<{ left: number; top: number }>({ left: 10, top: 15 });

  // Generate 18 floating cosmic dust particles
  const particles = useMemo(() => {
    const DUST_COLORS = ['#F7D794', '#E29A38', '#FFF5E6', '#D48628'];
    const result = [];
    for (let i = 0; i < 18; i++) {
      result.push({
        id: i,
        leftPercent: Math.floor(Math.random() * 92) + 4,
        topPercent: Math.floor(Math.random() * 92) + 4,
        size: Math.random() > 0.6 ? 2.5 : 1.5,
        color: DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)],
        opacity: 0.15 + Math.random() * 0.35,
        duration: 8 + Math.floor(Math.random() * 12),
        delay: Math.floor(Math.random() * 6),
      });
    }
    return result;
  }, []);

  // Procedural Glitch Loop (Triggers every 4 - 9 seconds for 100 - 200ms)
  useEffect(() => {
    if (prefersReducedMotion) return;

    let timeoutId: number;
    let isMounted = true;

    const peripheralTexts = [
      '0x7A // CORE_RESTRICTED',
      'SYS_LOCK // GATE_01',
      '7F C9 00 A2',
      'IDENTITY_DENIED',
      'NULL_SCOPE',
    ];

    const triggerGlitchEvent = () => {
      if (!isMounted) return;

      setIsGlitching(true);

      // Random horizontal shift (-16px to +16px)
      const mainShift = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 12) + 5);
      setGlitchShiftX(mainShift);

      // Chromatic ghost offset (-7px to +7px)
      const chromShift = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 6) + 3);
      setChromaticOffset(chromShift);

      // 10% chance to briefly switch to NO ACCESS fragment
      if (Math.random() > 0.88) {
        setHeadlineText('NO ACCESS');
      }

      // Show brief peripheral mark
      const randomMark = peripheralTexts[Math.floor(Math.random() * peripheralTexts.length)];
      const randLeft = Math.random() > 0.5 ? Math.floor(Math.random() * 15) + 5 : Math.floor(Math.random() * 15) + 78;
      const randTop = Math.random() > 0.5 ? Math.floor(Math.random() * 20) + 8 : Math.floor(Math.random() * 20) + 72;
      setPeripheralMark(randomMark);
      setPeripheralPosition({ left: randLeft, top: randTop });

      // 2 horizontal slice displacement strips
      const slice1Top = Math.floor(Math.random() * 30) + 10;
      const slice1Height = Math.floor(Math.random() * 18) + 8;
      const slice1Shift = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 18) + 6);

      const slice2Top = Math.floor(Math.random() * 30) + 55;
      const slice2Height = Math.floor(Math.random() * 18) + 8;
      const slice2Shift = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 20) + 6);

      setGlitchSlices([
        { topPercent: slice1Top, heightPercent: slice1Height, shiftX: slice1Shift },
        { topPercent: slice2Top, heightPercent: slice2Height, shiftX: slice2Shift },
      ]);

      // Event duration: 100ms - 200ms
      const duration = 100 + Math.floor(Math.random() * 100);
      setTimeout(() => {
        if (isMounted) {
          setIsGlitching(false);
          setHeadlineText('ACCESS DENIED');
          setGlitchShiftX(0);
          setChromaticOffset(0);
          setGlitchSlices([]);
          setPeripheralMark(null);
        }
      }, duration);

      // Next glitch interval: 4s - 9s
      const nextInterval = 4000 + Math.floor(Math.random() * 5000);
      timeoutId = window.setTimeout(triggerGlitchEvent, nextInterval);
    };

    const initialDelay = 1800 + Math.floor(Math.random() * 2000);
    timeoutId = window.setTimeout(triggerGlitchEvent, initialDelay);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [prefersReducedMotion]);

  const sanitizeErrorMessage = (rawError?: string | null): string => {
    const defaultMsg = "We couldn't send your request right now. Please try again later.";
    if (!rawError) return defaultMsg;

    const lower = rawError.toLowerCase();

    // Preserve user-facing rate-limiting or session expiration messages
    if (lower.includes('already submitted') || lower.includes('please wait') || lower.includes('session expired')) {
      return rawError;
    }

    // Filter out all internal environment variables, API key names, or raw server traces
    return defaultMsg;
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      setSignOutError(null);
      await signOut();
    } catch (err: unknown) {
      console.error('[SATURN Auth] Error during sign out from access screen:', err);
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed. Please try again.';
      setSignOutError(errorMessage);
      setIsSigningOut(false);
    }
  };

  const handleRequestAccess = async () => {
    if (isSendingRequest || requestSuccess) return;

    setIsSendingRequest(true);
    setRequestError(null);
    setRequestSuccess(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setRequestError("Your session expired. Please sign out and sign in again.");
        setIsSendingRequest(false);
        return;
      }

      let response = await fetch('/api/request-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      let result: { success?: boolean; error?: string; message?: string } | null = null;

      if (response.status === 404) {
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('request-access');
        if (edgeError) {
          const failMsg = sanitizeErrorMessage(edgeData?.error);
          setRequestError(failMsg);
          setRequestSuccess(false);
          return;
        }
        result = edgeData;
      } else {
        try {
          result = await response.json();
        } catch {
          result = { success: false, error: "We couldn't send your request right now. Please try again later." };
        }
      }

      if (result && result.success) {
        setRequestSuccess(true);
        setRequestError(null);
      } else {
        const failMsg = sanitizeErrorMessage(result?.error);
        setRequestError(failMsg);
        setRequestSuccess(false);
      }
    } catch (err: unknown) {
      console.error('[SATURN Access Request] Unexpected error:', err);
      setRequestError("We couldn't send your request right now. Please try again later.");
      setRequestSuccess(false);
    } finally {
      setIsSendingRequest(false);
    }
  };

  const displayedEmail = userEmail || user?.email || '';

  return (
    <div
      data-testid="saturn-bear-rejection"
      className={`relative w-full min-h-[100dvh] bg-black text-[#F5F0E5] select-none overflow-x-hidden overflow-y-auto flex flex-col justify-between p-4 sm:p-8 z-50 transition-opacity duration-700 ease-out motion-reduce:transition-none ${
        mounted ? 'opacity-100' : 'opacity-0'
      }`}
      aria-label="SATURN Access Not Granted"
      role="region"
    >
      <style>{`
        @keyframes saturnDustFloat {
          0% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-18px) translateX(10px); }
          100% { transform: translateY(0px) translateX(0px); }
        }
        .animate-saturn-dust {
          animation: saturnDustFloat ease-in-out infinite alternate;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-saturn-dust {
            animation: none !important;
          }
        }
      `}</style>

      {/* 
        ========================================================================
        ENHANCED ATMOSPHERIC BACKGROUND LAYER (Z-0):
        1. Far Background: Deep Black + Radial Charcoal Haze
        2. Middle Layer: Drifting Cosmic Gold Dust + Scanlines + Localized Core Glow
        3. Glitch Layer: Peripheral Code Marks + Scanline Streaks
        ========================================================================
      */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0" aria-hidden="true">
        {/* Far Background Canvas */}
        <div className="absolute inset-0 bg-black" />

        {/* Subtle Charcoal Tonal Gradient */}
        <div 
          className="absolute inset-0 opacity-60"
          style={{
            background: 'radial-gradient(circle at 50% 30%, rgba(18, 14, 10, 0.7) 0%, rgba(0, 0, 0, 1) 85%)'
          }}
        />

        {/* Restrained Localized Champagne-Gold Core Glow Behind Headline */}
        <div 
          className={`absolute top-[32%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] sm:w-[850px] sm:h-[420px] blur-[110px] pointer-events-none transition-opacity duration-150 ${
            isGlitching ? 'opacity-65 scale-[1.03]' : 'opacity-40 scale-100'
          }`}
          style={{
            background: 'radial-gradient(circle, rgba(235, 125, 20, 0.16) 0%, rgba(247, 215, 148, 0.05) 50%, rgba(0, 0, 0, 0) 80%)'
          }}
        />

        {/* Subtle Horizontal Scan-Line Texture */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.45)_50%)] bg-[length:100%_4px] opacity-20 pointer-events-none" />

        {/* Drifting Champagne-Gold Cosmic Dust Particles */}
        {particles.map((p: Particle) => (
          <div
            key={`dust-${p.id}`}
            className="absolute rounded-full animate-saturn-dust pointer-events-none"
            style={{
              left: `${p.leftPercent}%`,
              top: `${p.topPercent}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              opacity: isGlitching ? Math.min(1, p.opacity * 1.8) : p.opacity,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}

        {/* Transient Peripheral Glitch Mark */}
        {peripheralMark && (
          <div 
            className="absolute font-mono text-[10px] tracking-[0.25em] text-[#F7D794]/70 font-medium uppercase pointer-events-none transition-all duration-75"
            style={{
              left: `${peripheralPosition.left}%`,
              top: `${peripheralPosition.top}%`,
              textShadow: '0 0 6px rgba(247,215,148,0.5)',
            }}
          >
            {peripheralMark}
          </div>
        )}
      </div>

      {/* 
        ========================================================================
        DELIBERATE VERTICAL LAYOUT (Z-10 / Z-20)
        1. Upper Region: Brand Identity & Terminal Status
        2. Middle Region: Procedural Glitch Headline "ACCESS DENIED"
        3. Lower Region: Un-overlapped Access Message Card & Controls
        ========================================================================
      */}
      <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-between min-h-[92dvh] z-10 py-3 sm:py-5 space-y-3 sm:space-y-5">

        {/* 
          ----------------------------------------------------------------------
          UPPER REGION: SATURN Identity & Terminal Indicator
          ----------------------------------------------------------------------
        */}
        <header className="flex flex-col items-center space-y-2 pt-1 text-center z-20">
          <div className="flex items-center gap-2.5">
            {/* Saturn Planet Logo */}
            <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 rounded-full bg-[#F7D794]/20 blur-md" />
              <svg 
                className="relative w-6 h-6 text-[#F7D794] filter drop-shadow-[0_2px_8px_rgba(247,215,148,0.40)]" 
                viewBox="0 0 100 100" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="planetGradBreach" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFE8B5" />
                    <stop offset="45%" stopColor="#E29A38" />
                    <stop offset="100%" stopColor="#5C2508" />
                  </linearGradient>
                  <linearGradient id="ringGradBreach" x1="10" y1="30" x2="90" y2="70" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFEFC9" stopOpacity="0.95" />
                    <stop offset="50%" stopColor="#E5993B" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#8C4112" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                <path d="M 12,42 C 22,25 78,25 88,42" stroke="url(#ringGradBreach)" strokeWidth="3.2" strokeLinecap="round" opacity="0.45" />
                <circle cx="50" cy="50" r="23" fill="url(#planetGradBreach)" />
                <circle cx="50" cy="50" r="23" fill="none" stroke="rgba(255, 235, 195, 0.35)" strokeWidth="1" />
                <path d="M 30,46 Q 50,53 70,46" stroke="rgba(255, 245, 220, 0.28)" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M 33,54 Q 50,61 67,54" stroke="rgba(60, 20, 6, 0.35)" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M 88,42 C 86,64 14,64 12,42" stroke="url(#ringGradBreach)" strokeWidth="3.4" strokeLinecap="round" />
              </svg>
            </div>

            {/* SATURN Wordmark */}
            <span className="text-lg sm:text-xl font-bold tracking-[0.28em] text-[#F5F0E5] font-sans">
              SATURN
            </span>
          </div>

          {/* Terminal Indicator */}
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#F7D794]/[0.06] border border-[#F7D794]/20 text-[#F7D794] text-[10px] sm:text-[11px] font-mono tracking-[0.22em] font-medium uppercase shadow-sm">
            <Lock className="w-2.5 h-2.5 text-[#F7D794]/90 shrink-0" aria-hidden="true" />
            <span>AUTHORIZATION // RESTRICTED</span>
          </div>
        </header>

        {/* 
          ----------------------------------------------------------------------
          MIDDLE REGION: Procedural Glitch Headline "ACCESS DENIED"
          Responsive text size ensuring vertical space
          ----------------------------------------------------------------------
        */}
        <div 
          className="relative w-full flex flex-col items-center justify-center my-auto py-2 pointer-events-none select-none z-10 min-h-[90px] sm:min-h-[120px]"
          aria-hidden="true"
        >
          {/* Headline Stack Container */}
          <div 
            className="relative font-mono font-extrabold tracking-[0.16em] sm:tracking-[0.22em] uppercase text-center transition-all duration-75"
            style={{
              transform: isGlitching ? `translateX(${glitchShiftX}px)` : 'none',
            }}
          >
            {/* Base Stable Glow Underlayer */}
            <span 
              className="absolute inset-0 text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-[#F7D794]/20 blur-md pointer-events-none select-none"
            >
              {headlineText}
            </span>

            {/* Chromatic Red/Magenta Offset Ghost Layer */}
            {isGlitching && (
              <span 
                className="absolute inset-0 text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-[#FF4D4D]/75 mix-blend-screen pointer-events-none select-none"
                style={{
                  transform: `translateX(${-chromaticOffset}px) translateY(${chromaticOffset > 0 ? 1 : -1}px)`,
                  clipPath: 'inset(15% 0 35% 0)',
                }}
              >
                {headlineText}
              </span>
            )}

            {/* Chromatic Cyan/Ivory Offset Ghost Layer */}
            {isGlitching && (
              <span 
                className="absolute inset-0 text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-[#FFF5E6]/85 mix-blend-screen pointer-events-none select-none"
                style={{
                  transform: `translateX(${chromaticOffset * 1.4}px)`,
                  clipPath: 'inset(50% 0 10% 0)',
                }}
              >
                {headlineText}
              </span>
            )}

            {/* Main Primary Headline Text */}
            <span 
              className={`relative block text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold transition-all duration-75 ${
                isGlitching 
                  ? 'text-[#FFF5E6] filter drop-shadow-[0_0_18px_rgba(255,245,230,0.8)]' 
                  : 'bg-gradient-to-r from-[#FFF5E6] via-[#F7D794] to-[#E29A38] bg-clip-text text-transparent filter drop-shadow-[0_0_12px_rgba(247,215,148,0.30)]'
              }`}
            >
              {headlineText}
            </span>

            {/* Horizontal Strip Displacement Slice Overlays */}
            {isGlitching && glitchSlices.map((slice, idx) => (
              <div
                key={`h-slice-${idx}`}
                className="absolute inset-0 pointer-events-none text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-[#F7D794] font-extrabold"
                style={{
                  clipPath: `inset(${slice.topPercent}% 0 ${100 - slice.topPercent - slice.heightPercent}% 0)`,
                  transform: `translateX(${slice.shiftX}px)`,
                }}
              >
                {headlineText}
                {/* Thin Scanline Streak */}
                <div 
                  className="absolute left-0 right-0 h-[1.5px] bg-[#FFF5E6] shadow-[0_0_10px_#FFF5E6]"
                  style={{ top: `${slice.topPercent}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 
          ----------------------------------------------------------------------
          LOWER REGION: Refined Obsidian Access Panel & Actions
          Positioned below the glitch headline with zero overlapping text
          ----------------------------------------------------------------------
        */}
        <main className="relative w-full max-w-[430px] z-20">
          {/* Subtle Ambient Card Halo */}
          <div 
            className="absolute -inset-6 rounded-[32px] pointer-events-none opacity-40 blur-2xl"
            style={{
              background: 'radial-gradient(circle, rgba(235, 125, 20, 0.12) 0%, rgba(247, 215, 148, 0.03) 50%, rgba(0, 0, 0, 0) 80%)'
            }}
            aria-hidden="true"
          />

          {/* Smoked Glass Obsidian Container */}
          <div className="relative rounded-2xl sm:rounded-3xl bg-black/65 backdrop-blur-xl border border-[#F7D794]/15 px-5 py-5 sm:px-7 sm:py-6 text-center space-y-4 shadow-[0_16px_48px_rgba(0,0,0,0.80)]">
            {/* Top Champagne Refraction Line */}
            <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#F7D794]/30 to-transparent pointer-events-none" aria-hidden="true" />

            {/* Message Headings */}
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F5F0E5]">
                Access not yet available
              </h2>
              <p className="text-xs sm:text-sm text-[#F5F0E5]/70 leading-relaxed max-w-sm mx-auto font-normal">
                This account doesn&apos;t currently have access to SATURN. If you believe this is a mistake, you can request access below.
              </p>
            </div>

            {/* Authenticated User Email Display */}
            {displayedEmail && (
              <div className="py-2 px-3.5 rounded-xl bg-white/[0.03] border border-[#F7D794]/15 text-xs text-[#F5F0E5]/80 font-mono flex items-center justify-center gap-2 max-w-full truncate shadow-inner">
                <Mail className="w-3.5 h-3.5 text-[#F7D794]/80 shrink-0" aria-hidden="true" />
                <span className="text-[#F5F0E5]/50 shrink-0">Signed in as:</span>
                <span className="text-[#F7D794] font-medium truncate">{displayedEmail}</span>
              </div>
            )}

            {/* Success Banner */}
            {requestSuccess && (
              <div className="p-3.5 rounded-xl bg-[#F7D794]/10 border border-[#F7D794]/30 text-[#F7D794] text-xs flex items-start gap-2.5 text-left animate-fade-in" role="status">
                <CheckCircle2 className="w-4 h-4 text-[#F7D794] shrink-0 mt-0.5" aria-hidden="true" />
                <span className="leading-snug">
                  Access request sent successfully. Thank you — the workspace owner has been notified.
                </span>
              </div>
            )}

            {/* Request Error Alert */}
            {requestError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-[#F87171] text-xs flex items-start gap-2.5 text-left" role="alert">
                <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5" aria-hidden="true" />
                <span className="leading-snug">{requestError}</span>
              </div>
            )}

            {/* Sign Out Error Alert */}
            {signOutError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-[#F87171] text-xs flex items-center gap-2 text-left" role="alert">
                <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0" />
                <span className="leading-snug">{signOutError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 pt-1">
              {/* Primary Action: Request Access */}
              <button
                type="button"
                onClick={handleRequestAccess}
                disabled={isSendingRequest || requestSuccess}
                className={`w-full py-3 px-4 rounded-xl text-[#140804] font-semibold text-xs sm:text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed ${
                  requestSuccess
                    ? 'bg-[#F7D794] shadow-[0_4px_20px_rgba(247,215,148,0.25)]'
                    : 'bg-gradient-to-r from-[#F7D794] via-[#E29A38] to-[#D48628] hover:from-[#FFE8B5] hover:via-[#F7D794] hover:to-[#E29A38] active:scale-[0.99] shadow-[0_4px_20px_rgba(226,154,56,0.22)]'
                }`}
              >
                {isSendingRequest ? (
                  <>
                    <Loader2 className="w-4 h-4 text-[#140804] animate-spin shrink-0" aria-hidden="true" />
                    <span>Sending request...</span>
                  </>
                ) : requestSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#140804] shrink-0" aria-hidden="true" />
                    <span>Request sent</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 text-[#140804] shrink-0" aria-hidden="true" />
                    <span>Request access</span>
                  </>
                )}
              </button>

              {/* Secondary Action: Sign Out / Switch Account */}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-[#F5F0E5]/15 text-[#F5F0E5]/80 hover:text-[#F5F0E5] font-medium text-xs sm:text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="w-4 h-4 text-[#F5F0E5]/60" aria-hidden="true" />
                <span>{isSigningOut ? 'Signing out...' : 'Sign out / Switch account'}</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
