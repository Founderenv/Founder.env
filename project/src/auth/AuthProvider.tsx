import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { dataMode, supabase } from '@/lib/supabase';

export type DatabaseRole = 'customer' | 'business_owner' | 'admin';

export interface AuthProfile {
  id: string;
  role: DatabaseRole;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  onboardingComplete: boolean;
  status: 'active' | 'suspended';
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  isBackendMode: boolean;
  signInWithGoogle: (requestedRole?: Exclude<DatabaseRole, 'admin'>) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string, displayName: string, requestedRole: Exclude<DatabaseRole, 'admin'>) => Promise<void>;
  chooseRole: (role: Exclude<DatabaseRole, 'admin'>) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapProfile(row: Record<string, unknown>): AuthProfile {
  return {
    id: String(row.id), role: row.role as DatabaseRole, displayName: String(row.display_name ?? ''),
    avatarUrl: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    email: typeof row.email_private === 'string' ? row.email_private : null,
    onboardingComplete: Boolean(row.onboarding_complete), status: row.status === 'suspended' ? 'suspended' : 'active',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(dataMode === 'supabase');

  const loadProfile = useCallback(async (userId?: string) => {
    if (!supabase || !userId) { setProfile(null); return; }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    setProfile(data ? mapProfile(data as Record<string, unknown>) : null);
  }, []);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let mounted = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;
      if (error) { setLoading(false); return; }
      setSession(data.session);
      if (data.session?.access_token) supabase.realtime.setAuth(data.session.access_token);
      try { await loadProfile(data.session?.user.id); } finally { if (mounted) setLoading(false); }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (nextSession?.access_token) supabase.realtime.setAuth(nextSession.access_token);
      void loadProfile(nextSession?.user.id).catch(() => setProfile(null));
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    session, user: session?.user ?? null, profile, loading, isBackendMode: dataMode === 'supabase',
    signInWithGoogle: async (requestedRole = 'customer') => {
      if (!supabase) throw new Error('Supabase is not configured.');
      void requestedRole;
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { access_type: 'offline', prompt: 'consent' } } });
      if (error) throw error;
    },
    signInWithPassword: async (email, password) => { if (!supabase) throw new Error('Supabase is not configured.'); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; },
    signUpWithPassword: async (email, password, displayName, requestedRole) => { if (!supabase) throw new Error('Supabase is not configured.'); const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: displayName, requested_role: requestedRole } } }); if (error) throw error; },
    chooseRole: async (role) => { if (!supabase) throw new Error('Supabase is not configured.'); const { error } = await supabase.rpc('choose_initial_role', { requested_role: role }); if (error) throw error; await loadProfile(session?.user.id); },
    signOut: async () => { if (!supabase) return; const { error } = await supabase.auth.signOut(); if (error) throw error; setProfile(null); },
    refreshProfile: async () => loadProfile(session?.user.id),
  }), [session, profile, loading, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Context hooks intentionally share this module with their provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
