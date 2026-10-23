import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { SaturnToast } from './SaturnToast';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function SaturnLogin() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Success toast is prepared for future authentication integration (inactive by default)
  const [isSuccessToastOpen, setIsSuccessToastOpen] = useState(false);

  const validateField = (field: string, value: string): string | undefined => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (field === 'email') {
      if (!value.trim()) return 'Email address is required';
      if (!emailRegex.test(value.trim())) return 'Please enter a valid email address';
    }
    if (field === 'password' && mode !== 'forgot') {
      if (!value) return 'Password is required';
      if (value.length < 6) return 'Password must be at least 6 characters';
    }
    if (field === 'name' && mode === 'signup') {
      if (!value.trim()) return 'Full name is required';
    }
    if (field === 'confirmPassword' && mode === 'signup') {
      if (!value) return 'Please confirm your password';
      if (value !== password) return 'Passwords do not match';
    }
    return undefined;
  };

  const handleBlur = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const validateAll = (): boolean => {
    const errs: FormErrors = {};
    const emailErr = validateField('email', email);
    if (emailErr) errs.email = emailErr;

    if (mode !== 'forgot') {
      const passErr = validateField('password', password);
      if (passErr) errs.password = passErr;
    }

    if (mode === 'signup') {
      const nameErr = validateField('name', name);
      if (nameErr) errs.name = nameErr;

      const confirmErr = validateField('confirmPassword', confirmPassword);
      if (confirmErr) errs.confirmPassword = confirmErr;
    }

    setErrors(errs);
    setTouched({
      email: true,
      password: true,
      name: true,
      confirmPassword: true,
    });
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll() || isLoading) return;

    // Display understated loading state during submission to prevent duplicate actions
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Authentication integration pending in downstream task
    }, 850);
  };

  const handleGoogleSignIn = () => {
    if (isLoading) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Google OAuth integration pending in downstream task
    }, 750);
  };

  return (
    <>
      {/* SaturnToast component prepared for future authentication integration */}
      <SaturnToast
        isOpen={isSuccessToastOpen}
        heading="Welcome to SATURN"
        supportingText="Your second brain is ready."
        onClose={() => setIsSuccessToastOpen(false)}
      />

      {/* Main Centered Login Screen with responsive padding and scroll allowance */}
      <div className="fixed inset-0 pointer-events-none z-20 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="pointer-events-auto relative w-full max-w-[416px] my-auto">
          {/* Liquid Glass Card Container */}
          <div className="relative rounded-2xl saturn-login-card px-6 py-7 sm:px-8 sm:py-8 transition-all duration-300">
            
            {/* Brand Header */}
            <header className="flex flex-col items-center text-center mb-5">
              {/* Saturn Planet Logo (Restrained, crisp geometry, fine perspective lines) */}
              <div className="relative w-11 h-11 flex items-center justify-center mb-1.5" aria-hidden="true">
                <svg 
                  className="relative w-10 h-10 text-[#F7D794] filter drop-shadow-[0_2px_6px_rgba(247,215,148,0.25)]" 
                  viewBox="0 0 100 100" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="planetGrad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#FFE8B5" />
                      <stop offset="45%" stopColor="#E29A38" />
                      <stop offset="100%" stopColor="#5C2508" />
                    </linearGradient>
                    <linearGradient id="ringGrad" x1="10" y1="30" x2="90" y2="70" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#FFEFC9" stopOpacity="0.95" />
                      <stop offset="50%" stopColor="#E5993B" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#8C4112" stopOpacity="0.3" />
                    </linearGradient>
                    <radialGradient id="planetGlow" cx="50" cy="50" r="30" gradientUnits="userSpaceOnUse">
                      <stop offset="70%" stopColor="#FFC266" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#FFC266" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Back ring segment */}
                  <path
                    d="M 12,42 C 22,25 78,25 88,42"
                    stroke="url(#ringGrad)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    opacity="0.45"
                  />

                  {/* Planet Body */}
                  <circle cx="50" cy="50" r="23" fill="url(#planetGrad)" />
                  <circle cx="50" cy="50" r="23" fill="url(#planetGlow)" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="23" 
                    fill="none" 
                    stroke="rgba(255, 235, 195, 0.35)" 
                    strokeWidth="1"
                  />

                  {/* Planetary banding lines */}
                  <path
                    d="M 30,46 Q 50,53 70,46"
                    stroke="rgba(255, 245, 220, 0.28)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 33,54 Q 50,61 67,54"
                    stroke="rgba(60, 20, 6, 0.35)"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />

                  {/* Front ring segment */}
                  <path
                    d="M 88,42 C 86,64 14,64 12,42"
                    stroke="url(#ringGrad)"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                  />
                  {/* Outer delicate ring accent */}
                  <path
                    d="M 94,40 C 92,69 8,69 6,40"
                    stroke="rgba(255, 235, 195, 0.25)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Brand Wordmark & Tagline */}
              <div className="flex items-center gap-1.5">
                <span className="font-['Cinzel',serif] text-lg font-bold tracking-[0.26em] text-[#F5F0E5] drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                  SATURN
                </span>
              </div>
              <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#F7D794]/75 mt-0.5">
                YOUR SECOND BRAIN.
              </p>

              {/* Auxiliary Mode Headings (Sign Up & Forgot Password only) */}
              {mode === 'signup' && (
                <div className="mt-3">
                  <h1 className="text-lg font-semibold text-[#F5F0E5] tracking-tight">
                    Create your vault.
                  </h1>
                  <p className="text-xs text-[#E0D8CC]/70 mt-0.5 max-w-[280px] leading-relaxed">
                    Frictionless thought capture and structured personal recall.
                  </p>
                </div>
              )}

              {mode === 'forgot' && (
                <div className="mt-3">
                  <h1 className="text-lg font-semibold text-[#F5F0E5] tracking-tight">
                    Recover access.
                  </h1>
                  <p className="text-xs text-[#E0D8CC]/70 mt-0.5 max-w-[280px] leading-relaxed">
                    Enter your email to receive recovery instructions.
                  </p>
                </div>
              )}
            </header>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-1">
              {/* Name Input (Sign Up only) */}
              {mode === 'signup' && (
                <div>
                  <label htmlFor="saturn-name" className="block text-xs font-medium text-[#F5F0E5]/80 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#F5F0E5]/40">
                      <User className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <input
                      id="saturn-name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (touched.name) {
                          setErrors((prev) => ({ ...prev, name: validateField('name', e.target.value) }));
                        }
                      }}
                      onBlur={() => handleBlur('name', name)}
                      disabled={isLoading}
                      aria-invalid={touched.name && !!errors.name}
                      aria-describedby="name-error"
                      placeholder="Ada Lovelace"
                      className="w-full h-10.5 pl-10.5 pr-4 saturn-glass-input rounded-xl text-sm text-[#F5F0E5] placeholder-[#F5F0E5]/35 disabled:opacity-50"
                    />
                  </div>
                  {/* Stable reserved error space to prevent vertical layout shift */}
                  <div id="name-error" className="h-5 flex items-center" aria-live="polite">
                    {touched.name && errors.name ? (
                      <p className="text-[11px] text-[#F87171] flex items-center gap-1 transition-opacity duration-150">
                        <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>{errors.name}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label htmlFor="saturn-email" className="block text-xs font-medium text-[#F5F0E5]/80 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#F5F0E5]/40">
                    <Mail className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <input
                    id="saturn-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (touched.email) {
                        setErrors((prev) => ({ ...prev, email: validateField('email', e.target.value) }));
                      }
                    }}
                    onBlur={() => handleBlur('email', email)}
                    disabled={isLoading}
                    aria-invalid={touched.email && !!errors.email}
                    aria-describedby="email-error"
                    placeholder="name@domain.com"
                    autoComplete="email"
                    className="w-full h-10.5 pl-10.5 pr-4 saturn-glass-input rounded-xl text-sm text-[#F5F0E5] placeholder-[#F5F0E5]/35 disabled:opacity-50"
                  />
                </div>
                {/* Stable reserved error space to prevent vertical layout shift */}
                <div id="email-error" className="h-5 flex items-center" aria-live="polite">
                  {touched.email && errors.email ? (
                    <p className="text-[11px] text-[#F87171] flex items-center gap-1 transition-opacity duration-150">
                      <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                      <span>{errors.email}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Password Input (Sign In & Sign Up) */}
              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="saturn-password" className="text-xs font-medium text-[#F5F0E5]/80">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#F5F0E5]/40">
                      <Lock className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <input
                      id="saturn-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (touched.password) {
                          setErrors((prev) => ({ ...prev, password: validateField('password', e.target.value) }));
                        }
                      }}
                      onBlur={() => handleBlur('password', password)}
                      disabled={isLoading}
                      aria-invalid={touched.password && !!errors.password}
                      aria-describedby="password-error"
                      placeholder="••••••••••••"
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      className="w-full h-10.5 pl-10.5 pr-10.5 saturn-glass-input rounded-xl text-sm text-[#F5F0E5] placeholder-[#F5F0E5]/35 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/40 hover:text-white/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F7D794] rounded-md transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {/* Stable reserved error space to prevent vertical layout shift */}
                  <div id="password-error" className="h-5 flex items-center" aria-live="polite">
                    {touched.password && errors.password ? (
                      <p className="text-[11px] text-[#F87171] flex items-center gap-1 transition-opacity duration-150">
                        <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>{errors.password}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Confirm Password (Sign Up only) */}
              {mode === 'signup' && (
                <div>
                  <label htmlFor="saturn-confirm-password" className="block text-xs font-medium text-[#F5F0E5]/80 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#F5F0E5]/40">
                      <Lock className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <input
                      id="saturn-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (touched.confirmPassword) {
                          setErrors((prev) => ({ ...prev, confirmPassword: validateField('confirmPassword', e.target.value) }));
                        }
                      }}
                      onBlur={() => handleBlur('confirmPassword', confirmPassword)}
                      disabled={isLoading}
                      aria-invalid={touched.confirmPassword && !!errors.confirmPassword}
                      aria-describedby="confirm-error"
                      placeholder="••••••••••••"
                      autoComplete="new-password"
                      className="w-full h-10.5 pl-10.5 pr-10.5 saturn-glass-input rounded-xl text-sm text-[#F5F0E5] placeholder-[#F5F0E5]/35 disabled:opacity-50"
                    />
                  </div>
                  {/* Stable reserved error space to prevent vertical layout shift */}
                  <div id="confirm-error" className="h-5 flex items-center" aria-live="polite">
                    {touched.confirmPassword && errors.confirmPassword ? (
                      <p className="text-[11px] text-[#F87171] flex items-center gap-1 transition-opacity duration-150">
                        <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>{errors.confirmPassword}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Remember Device & Forgot Password Row (Sign In only) */}
              {mode === 'signin' && (
                <div className="flex items-center justify-between pt-0.5 pb-2 text-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      id="remember-device"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isLoading}
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 rounded border border-[#FFEBC3]/30 bg-white/[0.03] peer-checked:bg-[#F7D794] peer-checked:border-[#F7D794] peer-focus-visible:ring-2 peer-focus-visible:ring-[#F7D794]/60 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-[#120F0C] flex items-center justify-center transition-all">
                      <Check className="w-2.5 h-2.5 text-[#140804] stroke-[2.5] opacity-0 peer-checked:opacity-100 transition-opacity" aria-hidden="true" />
                    </div>
                    <span className="text-[#E0D8CC]/75 group-hover:text-[#F5F0E5] transition-colors">
                      Remember this device
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrors({});
                      setTouched({});
                    }}
                    disabled={isLoading}
                    className="text-[#F7D794]/85 hover:text-[#FFE2A8] text-xs transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F7D794]"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                aria-busy={isLoading}
                className="w-full relative mt-1 py-2.5 px-4 rounded-xl bg-[#F7D794] hover:bg-[#FFE2A8] active:bg-[#EAC77E] active:scale-[0.99] text-[#120B06] font-semibold text-sm tracking-wide shadow-[0_2px_10px_rgba(247,215,148,0.16)] hover:shadow-[0_3px_14px_rgba(247,215,148,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7D794] focus-visible:ring-offset-2 focus-visible:ring-offset-[#120F0C] transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2 text-[#120B06]">
                    <div className="w-4 h-4 border-2 border-[#120B06]/30 border-t-[#120B06] rounded-full animate-spin" aria-hidden="true" />
                    <span className="text-xs font-semibold">Processing...</span>
                  </div>
                ) : (
                  <>
                    <span>
                      {mode === 'signin' && 'Sign in to SATURN'}
                      {mode === 'signup' && 'Create Account'}
                      {mode === 'forgot' && 'Send Reset Instructions'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#120B06]" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            {/* Social Auth & Mode Switchers */}
            {mode !== 'forgot' && (
              <>
                {/* Clean Non-Pill Divider */}
                <div className="my-3.5 flex items-center gap-3" aria-hidden="true">
                  <div className="flex-1 border-t border-white/[0.08]" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#E0D8CC]/45 select-none">
                    or continue with
                  </span>
                  <div className="flex-1 border-t border-white/[0.08]" />
                </div>

                {/* Google Sign In */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.025] hover:bg-white/[0.06] active:bg-white/[0.08] active:scale-[0.99] border border-white/10 hover:border-white/20 text-sm font-medium text-[#F5F0E5]/90 flex items-center justify-center gap-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#120F0C] transition-all duration-150 disabled:opacity-60 cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.9z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.9.7 5.5 1.9 7.9l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </>
            )}

            {/* Bottom Mode Switcher */}
            <footer className="mt-4.5 text-center text-xs text-[#E0D8CC]/65">
              {mode === 'signin' && (
                <p>
                  <span>New to SATURN?</span>{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrors({});
                      setTouched({});
                    }}
                    disabled={isLoading}
                    className="text-[#F7D794] hover:text-[#FFE2A8] font-medium transition-colors ml-1 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F7D794]"
                  >
                    Create account
                  </button>
                </p>
              )}

              {mode === 'signup' && (
                <p>
                  <span>Already have an account?</span>{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrors({});
                      setTouched({});
                    }}
                    disabled={isLoading}
                    className="text-[#F7D794] hover:text-[#FFE2A8] font-medium transition-colors ml-1 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F7D794]"
                  >
                    Sign in
                  </button>
                </p>
              )}

              {mode === 'forgot' && (
                <p>
                  <span>Remember your credentials?</span>{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrors({});
                      setTouched({});
                    }}
                    disabled={isLoading}
                    className="text-[#F7D794] hover:text-[#FFE2A8] font-medium transition-colors ml-1 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F7D794]"
                  >
                    Return to sign in
                  </button>
                </p>
              )}
            </footer>

          </div>
        </div>
      </div>
    </>
  );
}
