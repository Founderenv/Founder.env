import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LoaderCircle, LockKeyhole, Store, User } from 'lucide-react';
import { useAuth, type DatabaseRole } from '@/auth/AuthProvider';
import { Logo } from '@/components/layout/Navigation';
import { dataMode } from '@/lib/supabase';

export function AuthPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('');
  const [role, setRole] = useState<Exclude<DatabaseRole, 'admin'>>('customer'); const [signUp, setSignUp] = useState(false); const [error, setError] = useState('');
  if (auth.user) return <Navigate to={auth.profile?.onboardingComplete ? '/' : '/choose-role'} replace />;
  if (dataMode !== 'supabase') return <AuthUnavailable />;
  const submit = async () => { setError(''); try { if (signUp) await auth.signUpWithPassword(email, password, name, role); else await auth.signInWithPassword(email, password); navigate('/'); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Authentication failed'); } };
  return <div className="mx-auto max-w-md py-8"><div className="card p-6"><Logo /><h1 className="mt-6 text-2xl font-bold">{signUp ? 'Create account' : 'Welcome back'}</h1><p className="mt-1 text-sm text-gray-500">Secure authentication powered by Supabase.</p><div className="mt-5 grid grid-cols-2 gap-2">{(['customer','business_owner'] as const).map((item) => <button key={item} onClick={() => setRole(item)} className={role === item ? 'btn-primary' : 'btn-outline'}>{item === 'customer' ? <User size={16}/> : <Store size={16}/>} {item === 'customer' ? 'Customer' : 'Business owner'}</button>)}</div><button onClick={() => auth.signInWithGoogle(role).catch((caught) => setError(caught instanceof Error ? caught.message : 'Google sign-in failed'))} className="btn-outline mt-4 w-full">Continue with Google</button><div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-gray-200 dark:bg-gray-800"/><span className="text-xs text-gray-400">or email</span><span className="h-px flex-1 bg-gray-200 dark:bg-gray-800"/></div><div className="space-y-3">{signUp && <input className="input" placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} />}<input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} /><input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>{error && <p className="mt-3 rounded-xl bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/10">{error}</p>}<button onClick={submit} disabled={!email || !password || (signUp && !name)} className="btn-primary mt-4 w-full"><LockKeyhole size={16}/>{signUp ? 'Create account' : 'Sign in'}</button><button onClick={() => setSignUp((value) => !value)} className="btn-ghost mt-2 w-full">{signUp ? 'Already have an account?' : 'Create an account'}</button><p className="mt-4 text-center text-xs text-gray-400">Admin access cannot be self-selected.</p></div></div>;
}

export function AuthCallbackPage() {
  const { loading, user, profile } = useAuth();
  if (loading) return <CenteredLoading label="Completing secure sign-in…" />;
  if (!user) return <Navigate to="/auth" replace />;
  return <Navigate to={profile?.onboardingComplete ? '/' : '/choose-role'} replace />;
}

export function ChooseRolePage() {
  const auth = useAuth(); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  if (!auth.user) return <Navigate to="/auth" replace />;
  if (auth.profile?.onboardingComplete) return <Navigate to="/" replace />;
  const choose = async (role: 'customer'|'business_owner') => { setSaving(true); setError(''); try { await auth.chooseRole(role); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save role'); setSaving(false); } };
  return <div className="mx-auto max-w-xl py-12 text-center"><h1 className="text-2xl font-bold">How will you use Founder.env?</h1><p className="mt-2 text-sm text-gray-500">This choice is saved in PostgreSQL and cannot grant admin access.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><button disabled={saving} onClick={() => choose('customer')} className="card p-6 text-left hover:border-brand-500"><User className="text-brand-600"/><h2 className="mt-4 font-semibold">Customer</h2><p className="mt-1 text-sm text-gray-500">Follow businesses, claim deals and earn rewards.</p></button><button disabled={saving} onClick={() => choose('business_owner')} className="card p-6 text-left hover:border-brand-500"><Store className="text-brand-600"/><h2 className="mt-4 font-semibold">Business owner</h2><p className="mt-1 text-sm text-gray-500">Create and manage a business presence.</p></button></div>{error && <p className="mt-4 text-sm text-error-500">{error}</p>}</div>;
}

function AuthUnavailable() { return <div className="mx-auto max-w-md py-16 text-center"><LockKeyhole className="mx-auto text-gray-400"/><h1 className="mt-4 text-xl font-bold">Backend configuration required</h1><p className="mt-2 text-sm text-gray-500">Add the Supabase URL and public anon key to .env.local. The frontend remains in explicit mock preview mode.</p></div>; }
function CenteredLoading({ label }: { label: string }) { return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-gray-500"><LoaderCircle className="animate-spin"/>{label}</div>; }
