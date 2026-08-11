import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LoaderCircle, LockKeyhole, Store, User, AlertCircle } from 'lucide-react';
import { useAuth, type DatabaseRole, consumeOAuthRoleIntent } from '@/auth/AuthProvider';
import { Logo } from '@/components/layout/Navigation';
import { dataMode } from '@/lib/supabase';

// ============================================================
// CUSTOMER AUTH PAGE  (/auth)
// ============================================================
// Entry point for customers: Sign In / Sign Up / Continue with Google.
// This page NEVER creates a business owner account.
// ============================================================
export function AuthPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [signUp, setSignUp] = useState(searchParams.get('mode') === 'signup');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Already authenticated → redirect based on state
  if (auth.user) {
    return <Navigate to={getPostLoginRoute(auth.profile?.role, auth.profile?.onboardingComplete)} replace />;
  }
  if (dataMode !== 'supabase') return <AuthUnavailable />;

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      if (signUp) {
        // Email signup: always creates a CUSTOMER account
        await auth.signUpWithPassword(email, password, name, 'customer');
        // After signup Supabase sends a confirmation email; profile is auto-created
        // with role=customer, onboarding_complete=true by handle_new_user
        navigate('/');
      } else {
        await auth.signInWithPassword(email, password);
        // onAuthStateChange will load the profile; navigate after it resolves
        navigate('/');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="card p-6">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold">{signUp ? 'Create account' : 'Welcome back'}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {signUp ? 'Join as a customer. Discover local deals and earn rewards.' : 'Sign in to your customer account.'}
        </p>

        {/* Google OAuth — always creates/signs in a CUSTOMER */}
        <button
          id="auth-google-customer"
          onClick={() =>
            auth.signInWithGoogle('customer').catch((caught) =>
              setError(caught instanceof Error ? caught.message : 'Google sign-in failed')
            )
          }
          className="btn-outline mt-5 w-full"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          <span className="text-xs text-gray-400">or email</span>
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        </div>

        <div className="space-y-3">
          {signUp && (
            <input
              id="auth-name"
              className="input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            id="auth-email"
            className="input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            id="auth-password"
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/10">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </p>
        )}

        <button
          id="auth-submit"
          onClick={() => void submit()}
          disabled={!email || !password || (signUp && !name) || busy}
          className="btn-primary mt-4 w-full"
        >
          {busy ? <LoaderCircle size={16} className="animate-spin" /> : <LockKeyhole size={16} />}
          {signUp ? 'Create customer account' : 'Sign in'}
        </button>

        <button onClick={() => setSignUp((v) => !v)} className="btn-ghost mt-2 w-full">
          {signUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>

        <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
          <p className="text-center text-xs text-gray-400">
            Are you a business owner?{' '}
            <a href="/auth/business" className="text-brand-600 hover:underline">
              List your business →
            </a>
          </p>
        </div>

        <p className="mt-3 text-center text-xs text-gray-400">Admin access cannot be self-selected.</p>
      </div>
    </div>
  );
}

// ============================================================
// BUSINESS OWNER AUTH PAGE  (/auth/business)
// ============================================================
// Dedicated entry point for business owners.
// Google OAuth from this page stores 'business_owner' intent.
// ============================================================
export function BusinessAuthPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [signUp, setSignUp] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Already authenticated
  if (auth.user) {
    return <Navigate to={getPostLoginRoute(auth.profile?.role, auth.profile?.onboardingComplete)} replace />;
  }
  if (dataMode !== 'supabase') return <AuthUnavailable />;

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      if (signUp) {
        // Email signup with business_owner intent
        await auth.signUpWithPassword(email, password, name, 'business_owner');
        // handle_new_user creates role=business_owner, onboarding_complete=false
        navigate('/onboarding');
      } else {
        await auth.signInWithPassword(email, password);
        navigate('/');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="card p-6">
        <Logo />
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-brand-50 p-3 dark:bg-brand-500/10">
          <Store size={20} className="shrink-0 text-brand-600" />
          <div>
            <p className="text-sm font-semibold text-brand-700 dark:text-brand-400">Business Owner Portal</p>
            <p className="text-xs text-brand-600/70 dark:text-brand-500/70">List and manage your business on Founder.env</p>
          </div>
        </div>

        <h1 className="mt-5 text-2xl font-bold">{signUp ? 'List your business' : 'Business owner sign in'}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {signUp
            ? 'Create a business owner account and set up your profile.'
            : 'Sign in to your business owner account.'}
        </p>

        {/* Google OAuth — stores 'business_owner' intent for the callback */}
        <button
          id="auth-google-business"
          onClick={() =>
            auth.signInWithGoogle('business_owner').catch((caught) =>
              setError(caught instanceof Error ? caught.message : 'Google sign-in failed')
            )
          }
          className="btn-outline mt-5 w-full"
        >
          <GoogleIcon />
          Continue as Business Owner with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          <span className="text-xs text-gray-400">or email</span>
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        </div>

        <div className="space-y-3">
          {signUp && (
            <input
              id="biz-auth-name"
              className="input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            id="biz-auth-email"
            className="input"
            type="email"
            placeholder="Business email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            id="biz-auth-password"
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/10">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </p>
        )}

        <button
          id="biz-auth-submit"
          onClick={() => void submit()}
          disabled={!email || !password || (signUp && !name) || busy}
          className="btn-primary mt-4 w-full"
        >
          {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Store size={16} />}
          {signUp ? 'Create business account' : 'Sign in as owner'}
        </button>

        <button onClick={() => setSignUp((v) => !v)} className="btn-ghost mt-2 w-full">
          {signUp ? 'Already have a business account? Sign in' : 'New here? List your business'}
        </button>

        <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
          <p className="text-center text-xs text-gray-400">
            Looking for your customer account?{' '}
            <a href="/auth" className="text-brand-600 hover:underline">
              Customer sign in →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AUTH CALLBACK PAGE  (/auth/callback)
// ============================================================
// Handles the Google OAuth redirect. Reads the role intent that
// was stored in sessionStorage before the OAuth redirect and
// applies it to the profile if it has not been set yet.
// ============================================================
export function AuthCallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (auth.loading || applying) return;
    if (!auth.user) return; // still loading or error — handled below

    const applyIntent = async () => {
      setApplying(true);
      try {
        // Read the stored role intent (one-time, clears itself)
        const intent = consumeOAuthRoleIntent();

        if (!auth.profile?.onboardingComplete && intent) {
          // New Google user with a role intent — apply it
          await auth.chooseRole(intent);
          // After chooseRole, profile is refreshed
          // business_owner → onboarding_complete=false → redirect /onboarding
          // customer → onboarding_complete=true → redirect /
        } else if (!auth.profile?.onboardingComplete && !intent) {
          // New Google user, no stored intent → treat as customer
          await auth.chooseRole('customer');
        }

        // Now route based on the updated profile state
        const updatedRole = auth.profile?.role;
        const updatedComplete = auth.profile?.onboardingComplete;
        navigate(getPostLoginRoute(updatedRole, updatedComplete), { replace: true });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Sign-in failed');
        setApplying(false);
      }
    };

    void applyIntent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.loading, auth.user]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="text-error-500" size={32} />
        <h1 className="text-xl font-bold">Sign-in error</h1>
        <p className="text-sm text-gray-500">{error}</p>
        <a href="/auth" className="btn-primary">Try again</a>
      </div>
    );
  }

  if (!auth.user && !auth.loading) {
    return <Navigate to="/auth" replace />;
  }

  return <CenteredLoading label="Completing secure sign-in…" />;
}

// ============================================================
// CHOOSE ROLE PAGE  (/choose-role)
// ============================================================
// Shown to users who are authenticated but have not yet set their
// role (onboarding_complete = false). Typically Google OAuth users
// who didn't have a stored intent (edge case fallback).
// ============================================================
export function ChooseRolePage() {
  const auth = useAuth();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!auth.user) return <Navigate to="/auth" replace />;
  if (auth.profile?.onboardingComplete) {
    return <Navigate to={getPostLoginRoute(auth.profile.role, true)} replace />;
  }

  const choose = async (role: 'customer' | 'business_owner') => {
    setSaving(true);
    setError('');
    try {
      await auth.chooseRole(role);
      // After choosing, profile is reloaded. Navigate based on outcome.
      // business_owner: onboarding_complete=false → /onboarding
      // customer: onboarding_complete=true → /
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save role');
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl py-12 text-center">
      <h1 className="text-2xl font-bold">How will you use Founder.env?</h1>
      <p className="mt-2 text-sm text-gray-500">Choose your account type to continue.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <button
          id="choose-role-customer"
          disabled={saving}
          onClick={() => void choose('customer')}
          className="card p-6 text-left hover:border-brand-500 transition-colors"
        >
          <User className="text-brand-600" />
          <h2 className="mt-4 font-semibold">Customer</h2>
          <p className="mt-1 text-sm text-gray-500">Follow businesses, claim deals and earn rewards.</p>
        </button>
        <button
          id="choose-role-owner"
          disabled={saving}
          onClick={() => void choose('business_owner')}
          className="card p-6 text-left hover:border-brand-500 transition-colors"
        >
          <Store className="text-brand-600" />
          <h2 className="mt-4 font-semibold">Business owner</h2>
          <p className="mt-1 text-sm text-gray-500">Create and manage a business presence.</p>
        </button>
      </div>
      {saving && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
          <LoaderCircle size={16} className="animate-spin" />
          Setting up your account…
        </div>
      )}
      {error && <p className="mt-4 text-sm text-error-500">{error}</p>}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

/**
 * Determines where to send a user after a successful login,
 * based on their role and onboarding completion state.
 */
export function getPostLoginRoute(role?: DatabaseRole, onboardingComplete?: boolean): string {
  if (!role) return '/choose-role';
  if (role === 'admin') return '/admin';
  if (role === 'business_owner') {
    if (!onboardingComplete) return '/onboarding';
    // onboardingComplete=true means the wizard was done; payment gate is checked in App.tsx
    return '/owner/analytics';
  }
  // customer (or unknown)
  return '/';
}

function AuthUnavailable() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <LockKeyhole className="mx-auto text-gray-400" />
      <h1 className="mt-4 text-xl font-bold">Backend configuration required</h1>
      <p className="mt-2 text-sm text-gray-500">
        Add the Supabase URL and public anon key to .env.local. The frontend remains in explicit mock preview mode.
      </p>
    </div>
  );
}

function CenteredLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-gray-500">
      <LoaderCircle className="animate-spin" />
      {label}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
