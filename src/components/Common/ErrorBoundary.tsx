/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SATURN — Global Application Error Boundary
 * Prevents white/black screens of death by displaying a visible recovery gateway.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected runtime error occurred'
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SATURN ErrorBoundary] Uncaught runtime error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach((key) => {
          if (key.includes('supabase') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
        window.location.href = window.location.pathname;
      }
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          data-testid="saturn-error-boundary-screen"
          className="fixed inset-0 w-screen h-screen bg-[#000000] flex items-center justify-center p-6 z-50 select-none"
        >
          <div className="max-w-md w-full p-8 rounded-2xl bg-zinc-950/90 border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)] text-center space-y-5 backdrop-blur-xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-white uppercase font-mono">
                System Recovery Notice
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed">
                SATURN encountered an unexpected visual rendering state. Your credentials and session have been safeguarded.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-98 text-black font-semibold text-xs tracking-wider uppercase shadow-lg shadow-amber-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Return to Login</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
