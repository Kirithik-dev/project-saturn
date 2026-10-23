import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';

export interface SaturnToastProps {
  isOpen?: boolean;
  heading?: string;
  supportingText?: string;
  onClose?: () => void;
  duration?: number;
}

/**
 * SaturnToast
 * A polished, reusable success-toast UI component ready for future authentication integration.
 * Complies with SATURN liquid-glass aesthetic and accessible notification patterns.
 */
export function SaturnToast({
  isOpen = false,
  heading = 'Welcome to SATURN',
  supportingText = 'Your second brain is ready.',
  onClose,
  duration = 4500
}: SaturnToastProps) {
  useEffect(() => {
    if (!isOpen || !onClose || duration <= 0) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [isOpen, onClose, duration]);

  if (!isOpen) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-[90%] max-w-[380px] saturn-toast rounded-xl p-3.5 flex items-start gap-3 transition-all duration-200 animate-in fade-in slide-in-from-top-2"
    >
      <div className="w-5 h-5 rounded-full bg-[#F7D794]/15 border border-[#F7D794]/30 flex items-center justify-center shrink-0 mt-0.5">
        <Check className="w-3 h-3 text-[#F7D794] stroke-[2.5]" />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <h2 className="text-sm font-semibold text-[#F5F0E5] tracking-tight">
          {heading}
        </h2>
        <p className="text-xs text-[#E0D8CC]/75 mt-0.5 leading-relaxed">
          {supportingText}
        </p>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-white/40 hover:text-white/80 p-1 -mr-1 -mt-1 rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F7D794] transition-colors"
          aria-label="Close notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </aside>
  );
}
