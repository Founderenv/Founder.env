import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LoaderCircle, LockKeyhole, Store, User, AlertCircle } from 'lucide-react';
import { useAuth, consumeOAuthRoleIntent, resolvePostAuthRoute } from '@/auth/AuthProvider';
import { Logo } from '@/components/layout/Navigation';
import { dataMode, supabase } from '@/lib/supabase';

// ============================================================
// CUSTOMER AUTH PAGE  (/auth)
// ============================================================
// Entry point for customers: Sign In / Sign Up / Continue with Google.
// Customer login NEVER creates or accesses a business owner account.
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
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);

  // Already authenticated → route using trusted post-auth resolver
  if (auth.loading) return <CenteredLoading label="Restoring your session…" />;
  if (auth.user && auth.profile) {
    return <Navigate to={resolvePostAuthRoute(auth.profile, auth.ownerBusiness)} replace />;
  }
  if (dataMode !== 'supabase') return <AuthUnavailable />;

  const submit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError('');
    setBusy(true);
    try {
      if (signUp) {
        // Email signup: creates a CUSTOMER account
        const completion = await auth.signUpWithPassword(email, password, name, 'customer');
        if (completion.emailConfirmationRequired) { setConfirmationRequired(true); return; }
        navigate(completion.destination ?? '/customer', { replace: true });
      } else {
        const completion = await auth.signInWithPassword(email, password);
        navigate(completion.destination ?? '/customer', { replace: true });
      }
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="card p-6">
        {confirmationRequired ? <EmailConfirmation email={email} signInPath="/auth" /> : <>
        <Logo />
        <h1 className="mt-6 text-2xl font-bold">{signUp ? 'Create customer account' : 'Welcome back'}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {signUp ? 'Join as a customer. Discover local deals and earn rewards.' : 'Sign in to your customer account.'}
        </p>

        {/* Google OAuth — customer role intent */}
        <button
          type="button"
          id="auth-google-customer"
          onClick={() => {
            setError('');
            auth.signInWithGoogle('customer').catch((caught) => {
              const msg = caught instanceof Error ? caught.message : 'Google sign-in failed';
              setError(msg);
            });
          }}
          className="btn-outline mt-5 w-full flex items-center justify-center gap-2"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          <span className="text-xs text-gray-400">or email</span>
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-3">
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

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/10">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            id="auth-submit"
            disabled={!email || !password || (signUp && !name) || busy}
            className="btn-primary mt-4 w-full"
          >
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : <LockKeyhole size={16} />}
            {signUp ? 'Create customer account' : 'Sign in'}
          </button>
        </form>

        <button type="button" onClick={() => { setError(''); setSignUp((v) => !v); }} className="btn-ghost mt-2 w-full">
          {signUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>

        <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
          <p className="text-center text-xs text-gray-400">
            Are you a business owner?{' '}
            <a href="/auth/business" className="text-brand-600 font-medium hover:underline">
              List your business →
            </a>
          </p>
        </div>
        </>}
      </div>
    </div>
  );
}

// ============================================================
// BUSINESS OWNER AUTH PAGE  (/auth/business)
// ============================================================
// Dedicated entry point for business owners.
// Password login verifies profile.role === 'business_owner' before allowing entry.
// ============================================================
export function BusinessAuthPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [signUp, setSignUp] = useState(false);
  const [error, setError] = useState('');
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);

  // Already authenticated → route using trusted post-auth resolver
  if (auth.loading) return <CenteredLoading label="Restoring your session…" />;
  if (auth.user && auth.profile) {
    // If authenticated user is a customer trying to open /auth/business, redirect home
    if (auth.profile?.role === 'customer') {
      return (
        <div className="mx-auto max-w-md py-12 text-center">
          <div className="card p-6">
            <AlertCircle className="mx-auto text-amber-500" size={32} />
            <h2 className="mt-4 text-lg font-bold">Customer Account Logged In</h2>
            <p className="mt-2 text-sm text-gray-500">
              You are currently signed in as a customer ({auth.user.email}). To access the Business Owner Portal, please sign out first.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => void auth.signOut()} className="btn-outline">
                Sign out
              </button>
              <button onClick={() => navigate('/')} className="btn-primary">
                Go to Customer Feed
              </button>
            </div>
          </div>
        </div>
      );
    }
    return <Navigate to={resolvePostAuthRoute(auth.profile, auth.ownerBusiness)} replace />;
  }
  if (dataMode !== 'supabase') return <AuthUnavailable />;

  const submit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError('');
    setBusy(true);
    try {
      if (signUp) {
        // Email signup with business_owner intent
        const completion = await auth.signUpWithPassword(email, password, name, 'business_owner');
        if (completion.emailConfirmationRequired) { setConfirmationRequired(true); return; }
        navigate(completion.destination ?? '/business/onboarding', { replace: true });
      } else {
        const completion = await auth.signInWithPassword(email, password);
        if (completion.profile?.role !== 'business_owner' && completion.profile?.role !== 'admin') {
          await auth.signOut();
          setError('This account is a customer account. Please use Customer Sign In.');
          return;
        }
        navigate(completion.destination ?? '/business/onboarding', { replace: true });
      }
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="card p-6">
        {confirmationRequired ? <EmailConfirmation email={email} signInPath="/auth/business" /> : <>
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

        {/* Google OAuth — stores 'business_owner' intent for callback */}
        <button
          type="button"
          id="auth-google-business"
          onClick={() => {
            setError('');
            auth.signInWithGoogle('business_owner').catch((caught) => {
              const msg = caught instanceof Error ? caught.message : 'Google sign-in failed';
              setError(msg);
            });
          }}
          className="btn-outline mt-5 w-full flex items-center justify-center gap-2"
        >
          <GoogleIcon />
          Continue as Business Owner with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
          <span className="text-xs text-gray-400">or email</span>
          <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="space-y-3">
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

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/10">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            id="biz-auth-submit"
            disabled={!email || !password || (signUp && !name) || busy}
            className="btn-primary mt-4 w-full"
          >
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Store size={16} />}
            {signUp ? 'Create business account' : 'Sign in as owner'}
          </button>
        </form>

        <button type="button" onClick={() => { setError(''); setSignUp((v) => !v); }} className="btn-ghost mt-2 w-full">
          {signUp ? 'Already have a business account? Sign in' : 'New here? List your business'}
        </button>

        <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
          <p className="text-center text-xs text-gray-400">
            Looking for your customer account?{' '}
            <a href="/auth" className="text-brand-600 font-medium hover:underline">
              Customer sign in →
            </a>
          </p>
        </div>
        </>}
      </div>
    </div>
  );
}

// ============================================================
// AUTH CALLBACK PAGE  (/auth/callback)
// ============================================================
// Handles the OAuth redirect. Parses URL error parameters if Google OAuth
// fails, waits for session resolution, consumes role intent, and routes
// safely using resolvePostAuthRoute.
// ============================================================
export function AuthCallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [applying, setApplying] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    // Check for error parameters in query string or hash fragment (from Supabase/Google)
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);
    
    const err = searchParams.get('error_description') || searchParams.get('error') || hashParams.get('error_description') || hashParams.get('error');
    if (err) {
      console.error('[OAuth Callback URL Error]:', err);
      setUrlError(decodeURIComponent(err).replace(/\+/g, ' '));
      return;
    }

    if (auth.loading || applying) return;

    const processCallback = async () => {
      setApplying(true);
      try {
        if (!auth.user) {
          // If auth loading finished but user is still null, wait brief moment for session restore
          if (supabase) {
            const { data } = await supabase.auth.getSession();
            if (!data.session?.user) {
              setUrlError('Authentication session could not be established. Please verify Google OAuth configuration in Supabase Dashboard.');
              setApplying(false);
              return;
            }
          }
        }

        // Consume stored role intent from sessionStorage
        const intent = consumeOAuthRoleIntent();

        // A role intent is only for a newly-created OAuth profile. Never let
        // the entry page change an existing unfinished owner's stored role.
        if (!auth.profile?.onboardingComplete && auth.profile?.role === 'customer') {
          if (intent) {
            await auth.chooseRole(intent);
          } else {
            // Default new OAuth user to customer if no stored intent
            await auth.chooseRole('customer');
          }
        }

        const completion = await auth.refreshProfile();
        navigate(completion.destination ?? '/customer', { replace: true });
      } catch (caught) {
        console.error('[OAuth Callback Resolution Error]:', caught);
        setUrlError(caught instanceof Error ? caught.message : 'OAuth callback resolution failed');
        setApplying(false);
      }
    };

    void processCallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.loading, auth.user]);

  if (urlError) {
    return (
      <div className="mx-auto max-w-md py-16 px-4 text-center">
        <div className="card p-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-error-50 text-error-600 dark:bg-error-500/10">
            <AlertCircle size={28} />
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Authentication Failed</h1>
          <p className="mt-2 text-sm text-gray-500 break-words">{urlError}</p>

          {urlError.includes('provider') || urlError.includes('configuration') ? (
            <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 text-left dark:bg-amber-500/10 dark:text-amber-300">
              <p className="font-semibold">Setup Requirement Notice:</p>
              <p className="mt-1">Google OAuth Provider must be enabled in your Supabase Dashboard under Authentication -&gt; Providers -&gt; Google.</p>
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-center gap-3">
            <a href="/auth" className="btn-primary">
              Customer Sign In
            </a>
            <a href="/auth/business" className="btn-outline">
              Business Owner Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <CenteredLoading label="Completing secure sign-in…" />;
}

// ============================================================
// CHOOSE ROLE PAGE  (/choose-role)
// ============================================================
export function ChooseRolePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (auth.loading) return <CenteredLoading label="Restoring your session…" />;
  if (!auth.user) return <Navigate to="/auth" replace />;
  if (auth.profile?.onboardingComplete) {
    return <Navigate to={resolvePostAuthRoute(auth.profile, auth.ownerBusiness)} replace />;
  }

  const choose = async (role: 'customer' | 'business_owner') => {
    setSaving(true);
    setError('');
    try {
      await auth.chooseRole(role);
      const completion = await auth.refreshProfile();
      navigate(completion.destination ?? '/customer', { replace: true });
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

function EmailConfirmation({ email, signInPath }: { email: string; signInPath: string }) {
  return <div className="py-4 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10"><AlertCircle size={22} /></div>
    <h1 className="mt-4 text-xl font-bold">Check your email</h1>
    <p className="mt-2 text-sm text-gray-500">Your account was created. Confirm the link sent to <span className="font-medium">{email}</span>, then sign in to continue.</p>
    <a href={signInPath} className="btn-primary mt-6">Go to sign in</a>
  </div>;
}

function authErrorMessage(caught: unknown) {
  const message = caught instanceof Error ? caught.message : '';
  if (/invalid login credentials/i.test(message)) return 'Incorrect email or password.';
  if (/already exists|already registered|already been registered/i.test(message)) return 'An account already exists with this email. Please sign in.';
  if (/password/i.test(message)) return 'Use a stronger password and try again.';
  if (/profile/i.test(message)) return 'Your account was created, but the profile could not be loaded. Please sign in again.';
  return message || 'Authentication failed. Please try again.';
}

// ============================================================
// Helpers
// ============================================================

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
