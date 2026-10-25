/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SATURN — Minimal Loading State Indicator
 * Renders a visible, minimal loading indicator on a pure black background.
 * Includes a safety recovery path if loading is delayed.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RotateCcw } from 'lucide-react';

export function SaturnLoader() {
  const { resetAuth } = useAuth();
  const [showRecoveryOption, setShowRecoveryOption] = useState(false);

  useEffect(() => {
    // If loading takes longer than 3.5 seconds, display a subtle recovery link
    const timer = setTimeout(() => {
      setShowRecoveryOption(true);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      data-testid="saturn-loading-screen"
      className="fixed inset-0 w-screen h-screen bg-[#000000] flex flex-col items-center justify-center z-40 select-none"
      aria-label="Loading SATURN"
    >
      <div className="flex flex-col items-center justify-center space-y-6 text-center">
        {/* Minimal Saturn Orbital Loader Ring */}
        <div className="relative w-14 h-14 flex items-center justify-center">
          {/* Subtle amber pulsing halo */}
          <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-ping opacity-40" />
          
          {/* Outer rotating dashed ring */}
          <div className="w-12 h-12 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
          
          {/* Core amber orb */}
          <div className="absolute w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
        </div>

        {/* Minimal Typography */}
        <div className="space-y-1.5">
          <div className="text-xs font-mono tracking-[0.3em] uppercase text-amber-200/90 font-medium">
            SATURN
          </div>
          <div className="text-[11px] text-zinc-500 tracking-wider">
            Verifying security session...
          </div>
        </div>

        {/* Safety Recovery Option if session resolution is delayed */}
        {showRecoveryOption && (
          <div className="pt-4 animate-in fade-in duration-300">
            <button
              onClick={() => resetAuth()}
              data-testid="saturn-delayed-recovery-button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-amber-500/30 text-amber-300/80 hover:text-amber-200 text-[11px] font-mono tracking-wide transition-all cursor-pointer shadow-lg"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>Session delayed? Return to Login</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
