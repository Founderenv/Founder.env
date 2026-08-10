import { useAuth } from '@/auth/AuthProvider';
import { currentCustomer as demoCustomer } from '@/mocks/data';
import type { CustomerAccount } from '@/types';

export function useCurrentCustomer(): CustomerAccount {
  const { isBackendMode, profile, user } = useAuth();
  if (!isBackendMode) return demoCustomer;

  return {
    id: user?.id ?? '',
    displayName: profile?.displayName || user?.user_metadata.full_name || 'Customer',
    email: profile?.email || user?.email || '',
    avatarUrl: profile?.avatarUrl || user?.user_metadata.avatar_url || '',
    createdAt: user?.created_at || new Date(0).toISOString(),
    lastActiveAt: new Date().toISOString(),
    followingCount: 0,
    rewardsCount: 0,
    reviewsCount: 0,
    savedCount: 0,
    status: profile?.status || 'active',
  };
}
