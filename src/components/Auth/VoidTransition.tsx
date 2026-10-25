/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SATURN — "Welcome into the Void" Cinematic Transition
 * 
 * Orchestrates a monumental, interstellar post-login sequence:
 * - Phase 1 (0 - 450ms): Login card exits smoothly while wave flows continuously
 * - Phase 2 (450 - 1400ms): Interstellar title and subtitle de-blur & fade into view (single reveal)
 * - Phase 3 (1400 - 3200ms): Cosmic hold with luminous starlight shimmer & living wave
 * - Phase 4 (3200 - 4000ms): Seamless dissolution into pure black (#000000)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getRandomVoidPhrase, VoidPhrase } from '../../config/voidPhrases';

export const VOID_TRANSITION_TIMINGS = {
  CARD_EXIT_MS: 450,
  TITLE_REVEAL_MS: 950,
  COSMIC_HOLD_MS: 1800,
  FADE_TO_BLACK_MS: 800,
  REDUCED_TOTAL_MS: 700,
} as const;

export type VoidTransitionPhase = 'card_exit' | 'reveal' | 'hold' | 'dissolve';

export interface VoidTransitionProps {
  prefersReducedMotion?: boolean;
  onDissolveStart?: () => void;
  onComplete: () => void;
}

export const VoidTransition: React.FC<VoidTransitionProps> = ({
  prefersReducedMotion = false,
  onDissolveStart,
  onComplete,
}) => {
  // Select a randomized interstellar phrase once on mount (non-repeating consecutive)
  const phrase: VoidPhrase = useMemo(() => getRandomVoidPhrase(), []);

  const [phase, setPhase] = useState<VoidTransitionPhase>('card_exit');
  const timeoutsRef = useRef<number[]>([]);

  // Stable callback refs to prevent effect re-triggers from prop reference changes
  const onDissolveStartRef = useRef(onDissolveStart);
  onDissolveStartRef.current = onDissolveStart;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Guard to ensure the animation timeline runs strictly ONCE per lifecycle
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate triggers if component re-renders or props change
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    timeoutsRef.current.forEach((t) => window.clearTimeout(t));
    timeoutsRef.current = [];

    if (prefersReducedMotion) {
      // Streamlined crossfade for users with reduced motion preference
      const t1 = window.setTimeout(() => {
        setPhase('dissolve');
        onDissolveStartRef.current?.();
      }, VOID_TRANSITION_TIMINGS.REDUCED_TOTAL_MS - 250);

      const t2 = window.setTimeout(() => {
        onCompleteRef.current?.();
      }, VOID_TRANSITION_TIMINGS.REDUCED_TOTAL_MS);

      timeoutsRef.current = [t1, t2];
      return;
    }

    // Phase 1 -> 2: Card exit finishes (450ms), reveal interstellar title
    const tReveal = window.setTimeout(() => {
      setPhase('reveal');
    }, VOID_TRANSITION_TIMINGS.CARD_EXIT_MS);

    // Phase 2 -> 3: Title reaches full presence (1400ms), cosmic hold begins
    const tHold = window.setTimeout(() => {
      setPhase('hold');
    }, VOID_TRANSITION_TIMINGS.CARD_EXIT_MS + VOID_TRANSITION_TIMINGS.TITLE_REVEAL_MS);

    // Phase 3 -> 4: Cosmic hold completes (3200ms), dissolve into black
    const tDissolve = window.setTimeout(() => {
      setPhase('dissolve');
      onDissolveStartRef.current?.();
    }, VOID_TRANSITION_TIMINGS.CARD_EXIT_MS + VOID_TRANSITION_TIMINGS.TITLE_REVEAL_MS + VOID_TRANSITION_TIMINGS.COSMIC_HOLD_MS);

    // Completion: Scene reaches pure black (4000ms), hand off to dashboard
    const tComplete = window.setTimeout(() => {
      onCompleteRef.current?.();
    }, VOID_TRANSITION_TIMINGS.CARD_EXIT_MS + VOID_TRANSITION_TIMINGS.TITLE_REVEAL_MS + VOID_TRANSITION_TIMINGS.COSMIC_HOLD_MS + VOID_TRANSITION_TIMINGS.FADE_TO_BLACK_MS);

    timeoutsRef.current = [tReveal, tHold, tDissolve, tComplete];

    return () => {
      timeoutsRef.current.forEach((t) => window.clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, [prefersReducedMotion]);

  const isVisible = phase === 'reveal' || phase === 'hold';
  const isDissolving = phase === 'dissolve';

  return (
    <div
      data-testid="saturn-void-transition"
      className="fixed inset-0 z-30 pointer-events-none flex flex-col items-center justify-center select-none overflow-hidden"
      aria-live="polite"
    >
      {/* Soft central radial vignette for high typographic contrast over living wave */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
          phase === 'card_exit' ? 'opacity-0' : isDissolving ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          background:
            'radial-gradient(ellipse 65% 55% at 50% 50%, rgba(5, 4, 3, 0.72) 0%, rgba(5, 4, 3, 0.35) 45%, transparent 85%)',
        }}
      />

      {/* Interstellar Cinematic Title Container */}
      <div
        className="relative z-10 max-w-4xl px-6 sm:px-8 text-center transition-all ease-out"
        style={{
          opacity: isVisible ? 1 : 0,
          filter: isVisible ? 'blur(0px)' : isDissolving ? 'blur(6px)' : 'blur(10px)',
          transform: isVisible
            ? 'translateY(0) scale(1)'
            : isDissolving
            ? 'translateY(-6px) scale(0.98)'
            : 'translateY(12px) scale(0.96)',
          transitionDuration: prefersReducedMotion
            ? '250ms'
            : isDissolving
            ? `${VOID_TRANSITION_TIMINGS.FADE_TO_BLACK_MS}ms`
            : `${VOID_TRANSITION_TIMINGS.TITLE_REVEAL_MS}ms`,
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Subtle Starlight Accent Line */}
        <div
          className={`mx-auto mb-4 sm:mb-5 h-[1px] w-12 sm:w-16 bg-gradient-to-r from-transparent via-[#F7D794]/50 to-transparent transition-opacity duration-700 ${
            isVisible ? 'opacity-70' : 'opacity-0'
          }`}
        />

        {/* High-Contrast Monumental Serif Title - Scaled down ~25-30% with responsive clamp */}
        <h1
          className="font-serif font-semibold uppercase drop-shadow-2xl text-[#F7F2E8] leading-tight select-none"
          style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 'clamp(1.25rem, 3.2vw, 2.6rem)',
            letterSpacing: 'clamp(0.2em, 0.5vw, 0.3em)',
            textShadow:
              '0 0 24px rgba(247, 215, 148, 0.45), 0 0 55px rgba(235, 175, 80, 0.2), 0 3px 12px rgba(0, 0, 0, 0.95)',
          }}
        >
          {phrase.title}
        </h1>

        {/* Cinematic Subtitle / Status Line - Scaled down proportionally */}
        {phrase.subtitle && (
          <div
            className="mt-3.5 sm:mt-4 flex items-center justify-center space-x-2.5 font-mono text-[#EBD8B8]/80 uppercase select-none"
            style={{
              fontSize: 'clamp(0.65rem, 1.1vw, 0.78rem)',
              letterSpacing: 'clamp(0.24em, 0.4vw, 0.35em)',
              textShadow: '0 0 14px rgba(247, 215, 148, 0.28), 0 2px 8px rgba(0, 0, 0, 0.9)',
            }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F7D794] shadow-[0_0_6px_#F7D794] opacity-90 animate-pulse" />
            <span>{phrase.subtitle}</span>
          </div>
        )}
      </div>

      {/* Pure Blackout Overlay for seamless dissolution into the Vault Dashboard */}
      <div
        className="absolute inset-0 bg-[#000000] pointer-events-none"
        style={{
          opacity: isDissolving ? 1 : 0,
          transition: `opacity ${VOID_TRANSITION_TIMINGS.FADE_TO_BLACK_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        }}
      />
    </div>
  );
};
