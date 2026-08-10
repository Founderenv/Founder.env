import { useEffect, useState, useCallback } from 'react';
import { type Theme, type Role } from '@/types';
import { applyTheme, getStoredTheme, setStoredTheme, watchSystemTheme } from '@/utils/theme';
import { useAuth } from '@/auth/AuthProvider';
import { dataMode } from '@/lib/supabase';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
    setStoredTheme(theme);
  }, [theme]);

  useEffect(() => {
    const unwatch = watchSystemTheme(() => {
      if (theme === 'system') applyTheme('system');
    });
    return unwatch;
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);

  return { theme, setTheme };
}

const ROLE_KEY = 'founder-env-role';

export function useRole() {
  const auth = useAuth();
  const [role, setRoleState] = useState<Role>(() => {
    const stored = localStorage.getItem(ROLE_KEY);
    return (stored as Role) || 'guest';
  });

  const setRole = useCallback((r: Role) => {
    if (dataMode === 'supabase') return;
    setRoleState(r);
    localStorage.setItem(ROLE_KEY, r);
    window.dispatchEvent(new CustomEvent<Role>('founder-role-change', { detail: r }));
  }, []);

  useEffect(() => {
    const syncRole = (event: Event) => {
      const next = event instanceof CustomEvent ? event.detail as Role : localStorage.getItem(ROLE_KEY) as Role;
      if (next) setRoleState(next);
    };
    window.addEventListener('founder-role-change', syncRole);
    window.addEventListener('storage', syncRole);
    return () => {
      window.removeEventListener('founder-role-change', syncRole);
      window.removeEventListener('storage', syncRole);
    };
  }, []);

  const authenticatedRole: Role = !auth.user ? 'guest' : auth.profile?.role === 'business_owner' ? 'owner' : auth.profile?.role ?? 'customer';
  return { role: dataMode === 'supabase' ? authenticatedRole : role, setRole };
}
