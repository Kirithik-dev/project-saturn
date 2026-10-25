/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SATURN — Recoverable Authentication Error Screen
 * Displays a clear error description and a working Return to Login recovery action.
 */

import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthRecoveryScreenProps {
  message?: string | null;
  onRecover?: () => void;
}

export function AuthRecoveryScreen({ message, onRecover }: AuthRecoveryScreenProps) {
  const { resetAuth } = useAuth();
  const [isResetting, setIsResetting] = useState(false);

  const handleReturnToLogin = async () => {
    try {
      setIsResetting(true);
      await resetAuth();
      if (onRecover) {
        onRecover();
      }
    } catch (err) {
      console.error('[SATURN Recovery] Error resetting session:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div
      data-testid="saturn-recoverable-error-screen"
      className="fixed inset-0 w-screen h-screen bg-[#000000] flex items-center justify-center p-6 z-50 select-none"
      aria-label="Authentication Recovery Notice"
    >
      <div className="max-w-md w-full p-8 rounded-2xl bg-zinc-950/90 border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.12)] text-center space-y-6 backdrop-blur-xl">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-mono tracking-widest uppercase text-amber-400/80 px-2.5 py-1 rounded-full border border-amber-500/20 bg-amber-500/5">
            AUTHENTICATION NOTICE
          </span>
          <h1 className="text-xl font-bold tracking-tight text-white pt-2">
            Session Verification Failed
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed px-2">
            {message || 'Unable to verify or restore your security session. You can safely return to the login screen and authenticate again.'}
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={handleReturnToLogin}
            disabled={isResetting}
            data-testid="saturn-return-to-login-button"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-98 text-black font-semibold text-xs tracking-wider uppercase shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isResetting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowLeft className="w-4 h-4" />
            )}
            <span>{isResetting ? 'Resetting Session...' : 'Return to Login'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
