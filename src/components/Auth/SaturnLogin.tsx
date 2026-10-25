import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { SaturnToast } from './SaturnToast';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export interface SaturnLoginProps {
  isFadingOut?: boolean;
}

export function SaturnLogin({ isFadingOut = false }: SaturnLoginProps = {}) {
  const {
    isRecoveryMode,
    oauthError,
    clearOAuthError,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    sendPasswordReset,
    updateUserPassword
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'reset-password'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Toast feedback state
  const [toastConfig, setToastConfig] = useState<{
    isOpen: boolean;
    heading: string;
    supportingText: string;
    type: 'success' | 'info' | 'error';
  }>({
    isOpen: false,
    heading: 'Welcome to SATURN',
    supportingText: 'Your second brain is ready.',
    type: 'success'
  });

  // Switch to reset-password mode automatically when a recovery link is opened
  useEffect(() => {
    if (isRecoveryMode) {
      setMode('reset-password');
      setApiError(null);
    }
  }, [isRecoveryMode]);

  useEffect(() => {
    if (oauthError) {
      setApiError(oauthError);
      setIsLoading(false);
      clearOAuthError();
    }
  }, [oauthError, clearOAuthError]);

  const validateField = (field: string, value: string): string | undefined => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (field === 'email' && mode !== 'reset-password') {
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
    if (field === 'confirmPassword' && (mode === 'signup' || mode === 'reset-password')) {
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

    if (mode !== 'reset-password') {
      const emailErr = validateField('email', email);
      if (emailErr) errs.email = emailErr;
    }

    if (mode !== 'forgot') {
      const passErr = validateField('password', password);
      if (passErr) errs.password = passErr;
    }

    if (mode === 'signup') {
      const nameErr = validateField('name', name);
      if (nameErr) errs.name = nameErr;
    }

    if (mode === 'signup' || mode === 'reset-password') {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    if (!validateAll() || isLoading) return;

    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signInWithEmail(email, password, rememberMe);
        if (error) {
          let friendlyMessage = error.message;
          if (error.message.toLowerCase().includes('invalid login credentials')) {
            friendlyMessage = 'Invalid email or password. Please verify your credentials.';
          } else if (error.message.toLowerCase().includes('email not confirmed')) {
            friendlyMessage = 'Email address not yet confirmed. Please check your inbox.';
          } else if (!isSupabaseConfigured()) {
            friendlyMessage = 'Supabase placeholder active. Configure VITE_SUPABASE_URL and key in .env.local to authenticate.';
          }
          setApiError(friendlyMessage);
        } else {
          setToastConfig({
            isOpen: true,
            heading: 'Welcome to SATURN',
            supportingText: 'Your second brain is ready.',
            type: 'success'
          });
        }
      } else if (mode === 'signup') {
        const { error, needsEmailConfirmation } = await signUpWithEmail(email, password, name);
        if (error) {
          let friendlyMessage = error.message;
          if (error.message.toLowerCase().includes('already registered')) {
            friendlyMessage = 'An account with this email address already exists.';
          }
          setApiError(friendlyMessage);
        } else if (needsEmailConfirmation) {
          setToastConfig({
            isOpen: true,
            heading: 'Verification Email Dispatched',
            supportingText: `Confirmation link sent to ${email}. Verify your inbox to activate your vault.`,
            type: 'info'
          });
          setMode('signin');
          setPassword('');
          setConfirmPassword('');
        } else {
          setToastConfig({
            isOpen: true,
            heading: 'Vault Initialized',
            supportingText: 'Welcome to SATURN. Your private workspace is active.',
            type: 'success'
          });
        }
      } else if (mode === 'forgot') {
        const { error } = await sendPasswordReset(email);
        if (error) {
          setApiError(error.message);
        } else {
          setToastConfig({
            isOpen: true,
            heading: 'Recovery Link Dispatched',
            supportingText: `Password reset instructions have been sent to ${email}.`,
            type: 'info'
          });
          setMode('signin');
        }
      } else if (mode === 'reset-password') {
        const { error } = await updateUserPassword(password);
        if (error) {
          setApiError(error.message);
        } else {
          setToastConfig({
            isOpen: true,
            heading: 'Password Renewed',
            supportingText: 'Your credentials have been securely updated.',
            type: 'success'
          });
          setMode('signin');
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An authentication error occurred';
      setApiError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setApiError(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        if (error.name === 'PopupBlockedError') {
          setApiError('Popup was blocked by your browser. Please allow popups for SATURN in your browser bar, or open the app in a standalone tab.');
        } else if (error.message.toLowerCase().includes('provider') || error.message.toLowerCase().includes('not enabled')) {
          setApiError('Google OAuth is not enabled in your Supabase project. Enable the Google provider in Supabase Dashboard -> Authentication -> Providers.');
        } else {
          setApiError(error.message || 'Google OAuth could not be initiated. Check Supabase Provider configuration.');
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Google OAuth failed';
      setApiError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* SaturnToast component providing accessible feedback */}
      <SaturnToast
        isOpen={toastConfig.isOpen && !isFadingOut}
        heading={toastConfig.heading}
        supportingText={toastConfig.supportingText}
        type={toastConfig.type}
        onClose={() => setToastConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Main Centered Login Screen with responsive padding and scroll allowance */}
      <div className={`fixed inset-0 pointer-events-none z-20 flex items-center justify-center p-4 sm:p-6 overflow-y-auto transition-opacity duration-500 ease-out ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
        <div className="pointer-events-auto relative w-full max-w-[424px] my-auto">
          {/* Warm ambient glow backdrop behind the login card */}
          <div 
            className="absolute -inset-12 sm:-inset-16 rounded-[48px] pointer-events-none opacity-65 blur-3xl transition-opacity duration-500"
            style={{
              background: 'radial-gradient(circle, rgba(235, 125, 20, 0.15) 0%, rgba(247, 215, 148, 0.06) 45%, rgba(0, 0, 0, 0) 75%)'
            }}
            aria-hidden="true"
          />

          {/* Liquid Obsidian Portal Glass Card Container */}
          <div className="relative rounded-[24px] saturn-login-card px-7 py-8 sm:px-9 sm:py-9 transition-all duration-300 overflow-hidden">
            {/* Corner Light Refractions inside card */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#F7D794]/35 to-transparent pointer-events-none" aria-hidden="true" />
            <div className="absolute top-0 left-0 w-36 h-36 bg-[#F7D794]/[0.05] rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
            <div className="absolute bottom-0 right-0 w-36 h-36 bg-[#E29A38]/[0.06] rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
            
            {/* Brand Header */}
            <header className="relative flex flex-col items-center text-center mb-6">
              {/* Saturn Planet Logo */}
              <div className="relative w-12 h-12 flex items-center justify-center mb-2" aria-hidden="true">
                <div className="absolute inset-1 rounded-full bg-[#F7D794]/12 blur-md" />
                <svg 
                  className="relative w-10.5 h-10.5 text-[#F7D794] filter drop-shadow-[0_2px_8px_rgba(247,215,148,0.30)]" 
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
                <span className="font-['Cinzel',serif] text-xl font-bold tracking-[0.28em] text-[#F5F0E5] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  SATURN
                </span>
              </div>
              <p className="text-[10px] font-mono tracking-[0.24em] uppercase text-[#F7D794]/75 mt-1">
                YOUR SECOND BRAIN.
              </p>

              {/* Auxiliary Mode Headings */}
              {mode === 'signup' && (
                <div className="mt-3.5">
                  <h1 className="text-lg font-semibold text-[#F5F0E5] tracking-tight">
                    Create your vault.
                  </h1>
                  <p className="text-xs text-[#E0D8CC]/70 mt-0.5 max-w-[280px] leading-relaxed">
                    Frictionless thought capture and structured personal recall.
                  </p>
                </div>
              )}

              {mode === 'forgot' && (
                <div className="mt-3.5">
                  <h1 className="text-lg font-semibold text-[#F5F0E5] tracking-tight">
                    Recover access.
                  </h1>
                  <p className="text-xs text-[#E0D8CC]/70 mt-0.5 max-w-[280px] leading-relaxed">
                    Enter your email to receive recovery instructions.
                  </p>
                </div>
              )}

              {mode === 'reset-password' && (
                <div className="mt-3.5">
                  <h1 className="text-lg font-semibold text-[#F5F0E5] tracking-tight">
                    Set new password.
                  </h1>
                  <p className="text-xs text-[#E0D8CC]/70 mt-0.5 max-w-[280px] leading-relaxed">
                    Enter your updated credentials to restore your vault.
                  </p>
                </div>
              )}
            </header>

            {/* General API Error Alert */}
            {apiError && (
              <div className="relative mb-3.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[#F87171] text-xs flex items-start gap-2.5" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-snug flex-1">{apiError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="relative space-y-1">
              {/* Name Input (Sign Up only) */}
              {mode === 'signup' && (
                <div>
                  <label htmlFor="saturn-name" className="block text-xs font-medium text-[#F5F0E5]/80 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#F7D794]/75">
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
                      className="w-full h-11 pl-10.5 pr-4 saturn-glass-input rounded-xl text-sm text-[#F5F0E5] placeholder-[#F5F0E5]/35 disabled:opacity-50"
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

              {/* Email Address (Sign In, Sign Up, Forgot) */}
              {mode !== 'reset-password' && (
                <div>
                  <label htmlFor="saturn-email" className="block text-xs font-medium text-[#F5F0E5]/80 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#F7D794]/75">
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
                      className="w-full h-11 pl-10.5 pr-4 saturn-glass-input rounded-xl text-sm text-[#F5F0E5] placeholder-[#F5F0E5]/35 disabled:opacity-50"
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
              )}

              {/* Password Input (Sign In, Sign Up, Reset-Password) */}
              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="saturn-password" className="text-xs font-medium text-[#F5F0E5]/80">
                      {mode === 'reset-password' ? 'New Password' : 'Password'}
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#F7D794]/75">
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
                      className="w-full h-11 pl-10.5 pr-10.5 saturn-glass-input rounded-xl text-sm text-[#F5F0E5] placeholder-[#F5F0E5]/35 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/45 hover:text-white/85 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F7D794] rounded-md transition-colors"
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

              {/* Confirm Password (Sign Up & Reset-Password) */}
              {(mode === 'signup' || mode === 'reset-password') && (
                <div>
                  <label htmlFor="saturn-confirm-password" className="block text-xs font-medium text-[#F5F0E5]/80 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#F7D794]/75">
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
                      className="w-full h-11 pl-10.5 pr-10.5 saturn-glass-input rounded-xl text-sm text-[#F5F0E5] placeholder-[#F5F0E5]/35 disabled:opacity-50"
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
                      setApiError(null);
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
                className="w-full relative mt-1.5 h-11 px-4 rounded-xl saturn-primary-btn text-sm font-semibold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7D794] focus-visible:ring-offset-2 focus-visible:ring-offset-[#120F0C] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
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
                      {mode === 'reset-password' && 'Update Password'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#120B06]" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            {/* Social Auth & Mode Switchers (Not shown in reset-password or forgot) */}
            {mode !== 'forgot' && mode !== 'reset-password' && (
              <>
                {/* Clean Non-Pill Divider */}
                <div className="my-4 flex items-center gap-3" aria-hidden="true">
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
                  className="w-full h-11 px-4 rounded-xl saturn-glass-button-secondary text-sm font-medium text-[#F5F0E5]/90 flex items-center justify-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#120F0C] disabled:opacity-60 cursor-pointer"
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
            <footer className="mt-5 text-center text-xs text-[#E0D8CC]/65">
              {mode === 'signin' && (
                <p>
                  <span>New to SATURN?</span>{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setApiError(null);
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
                      setApiError(null);
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

              {(mode === 'forgot' || mode === 'reset-password') && (
                <p>
                  <span>Remember your credentials?</span>{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setApiError(null);
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
