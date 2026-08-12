import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { dataMode, supabase } from '@/lib/supabase';

export type DatabaseRole = 'customer' | 'business_owner' | 'admin';

/** Key used to persist intended role across the Google OAuth redirect. */
const OAUTH_ROLE_INTENT_KEY = 'founder_env_oauth_role_intent';

export interface AuthProfile {
  id: string;
  role: DatabaseRole;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  onboardingComplete: boolean;
  status: 'active' | 'suspended';
}

/** Live state of the owner's business — loaded only for business_owner profiles. */
export interface OwnerBusinessState {
  businessId: string;
  businessName: string;
  businessUsername: string;
  lifecycle: string;
  subscriptionStatus: string;
  isActive: boolean;
  /**
   * Derived payment gate:
   * - 'pending'   → show PaymentPendingPage
   * - 'paid'      → full dashboard access
   * - 'suspended' → account suspended
   */
  paymentGate: 'pending' | 'paid' | 'suspended';
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  ownerBusiness: OwnerBusinessState | null;
  loading: boolean;
  isBackendMode: boolean;
  signInWithGoogle: (requestedRole?: Exclude<DatabaseRole, 'admin'>) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string, displayName: string, requestedRole: Exclude<DatabaseRole, 'admin'>) => Promise<void>;
  chooseRole: (role: Exclude<DatabaseRole, 'admin'>) => Promise<void>;
  completeBusinessOnboarding: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapProfile(row: Record<string, unknown>): AuthProfile {
  return {
    id: String(row.id),
    role: row.role as DatabaseRole,
    displayName: String(row.display_name ?? ''),
    avatarUrl: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    email: typeof row.email_private === 'string' ? row.email_private : null,
    onboardingComplete: Boolean(row.onboarding_complete),
    status: row.status === 'suspended' ? 'suspended' : 'active',
  };
}

function mapOwnerBusiness(row: Record<string, unknown>): OwnerBusinessState {
  const gate = String(row.payment_gate ?? 'pending');
  return {
    businessId: String(row.business_id),
    businessName: String(row.business_name ?? ''),
    businessUsername: String(row.business_username ?? ''),
    lifecycle: String(row.lifecycle ?? ''),
    subscriptionStatus: String(row.subscription_status ?? ''),
    isActive: Boolean(row.is_active),
    paymentGate: gate === 'paid' ? 'paid' : gate === 'suspended' ? 'suspended' : 'pending',
  };
}

/**
 * Centralized Post-Auth Resolver
 * Single trusted authority for routing authenticated users based on
 * role, onboarding state, and owner business payment gate.
 */
export function resolvePostAuthRoute(
  profile: AuthProfile | null,
  ownerBusiness: OwnerBusinessState | null
): string {
  if (!profile) return '/auth';
  if (profile.role === 'admin') return '/admin';
  if (profile.role === 'customer') return '/customer';
  if (profile.role === 'business_owner') {
    if (!profile.onboardingComplete) return '/onboarding';
    if (!ownerBusiness) return '/onboarding';
    if (ownerBusiness.paymentGate === 'pending' || ownerBusiness.paymentGate === 'suspended') {
      return '/owner/payment-pending';
    }
    return '/business/dashboard';
  }
  return '/';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [ownerBusiness, setOwnerBusiness] = useState<OwnerBusinessState | null>(null);
  const [loading, setLoading] = useState(dataMode === 'supabase');

  const loadOwnerBusiness = useCallback(async (profileData: AuthProfile | null) => {
    if (!supabase || !profileData || profileData.role !== 'business_owner') {
      setOwnerBusiness(null);
      return;
    }
    try {
      const { data, error } = await supabase.rpc('get_owner_business_state');
      if (error) { setOwnerBusiness(null); return; }
      if (data && Array.isArray(data) && data.length > 0) {
        setOwnerBusiness(mapOwnerBusiness(data[0] as Record<string, unknown>));
      } else {
        setOwnerBusiness(null);
      }
    } catch {
      setOwnerBusiness(null);
    }
  }, []);

  const loadProfile = useCallback(async (userId?: string) => {
    if (!supabase || !userId) { setProfile(null); setOwnerBusiness(null); return; }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    const mappedProfile = data ? mapProfile(data as Record<string, unknown>) : null;
    setProfile(mappedProfile);
    await loadOwnerBusiness(mappedProfile);
  }, [loadOwnerBusiness]);

  useEffect(() => {
    const client = supabase;
    if (!client) { setLoading(false); return; }
    let mounted = true;

    client.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;
      if (error) { setLoading(false); return; }
      setSession(data.session);
      if (data.session?.access_token) {
        await client.realtime.setAuth(data.session.access_token);
      }
      try { await loadProfile(data.session?.user.id); } finally { if (mounted) setLoading(false); }
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (nextSession?.access_token) {
        void client.realtime.setAuth(nextSession.access_token);
      }
      void loadProfile(nextSession?.user.id).catch(() => { setProfile(null); setOwnerBusiness(null); });
    });

    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    ownerBusiness,
    loading,
    isBackendMode: dataMode === 'supabase',

    signInWithGoogle: async (requestedRole = 'customer') => {
      if (!supabase) throw new Error('Supabase is not configured.');
      // Store intended role in sessionStorage
      try { sessionStorage.setItem(OAUTH_ROLE_INTENT_KEY, requestedRole); } catch { /* ignore */ }
      
      const callbackUrl = `${window.location.origin}/auth/callback`;
      console.log(`[Google Auth] Initiating OAuth for role: ${requestedRole}, redirectTo: ${callbackUrl}`);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      
      if (error) {
        console.error('[Google Auth Error]:', error);
        throw error;
      }
    },

    signInWithPassword: async (email, password) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },

    signUpWithPassword: async (email, password, displayName, requestedRole) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: displayName, requested_role: requestedRole },
        },
      });
      if (error) throw error;
    },

    chooseRole: async (role) => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error } = await supabase.rpc('choose_initial_role', { requested_role: role });
      if (error) throw error;
      await loadProfile(session?.user.id);
    },

    completeBusinessOnboarding: async () => {
      if (!supabase) throw new Error('Supabase is not configured.');
      const { error } = await supabase.rpc('complete_business_onboarding');
      if (error) throw error;
      await loadProfile(session?.user.id);
    },

    signOut: async () => {
      if (!supabase) return;
      try { sessionStorage.removeItem(OAUTH_ROLE_INTENT_KEY); } catch { /* ignore */ }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setProfile(null);
      setOwnerBusiness(null);
    },

    refreshProfile: async () => loadProfile(session?.user.id),
  }), [session, profile, ownerBusiness, loading, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}

/** Read and consume the OAuth role intent from sessionStorage (one-time use). */
export function consumeOAuthRoleIntent(): Exclude<DatabaseRole, 'admin'> | null {
  try {
    const stored = sessionStorage.getItem(OAUTH_ROLE_INTENT_KEY);
    if (stored === 'customer' || stored === 'business_owner') {
      sessionStorage.removeItem(OAUTH_ROLE_INTENT_KEY);
      return stored;
    }
  } catch { /* ignore */ }
  return null;
}
