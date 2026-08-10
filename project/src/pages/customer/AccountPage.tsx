import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Bookmark, Star, Gift, MessageCircle, Users, ChevronRight, Bell } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { BusinessCard } from '@/components/business/BusinessCard';
import { ReviewCard } from '@/components/social/ReviewCard';
import { useRole } from '@/hooks/useTheme';
import { useCurrentCustomer } from '@/hooks/useCurrentCustomer';
import { customerService, followService, reviewService } from '@/services';
import { useAuth } from '@/auth/AuthProvider';
import type { Business, CustomerAccount, Review } from '@/types';

export function AccountPage() {
  const { setRole } = useRole();
  const identity = useCurrentCustomer();
  const { isBackendMode, signOut } = useAuth();
  const [currentCustomer, setCurrentCustomer] = useState<CustomerAccount>(identity);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    Promise.all([
      customerService.getCurrent(),
      followService.getFollowing(identity.id),
      reviewService.getByCustomer(identity.id),
    ]).then(([customer, following, customerReviews]) => {
      setCurrentCustomer(customer);
      setBusinesses(following);
      setReviews(customerReviews);
    }).catch(() => undefined);
  }, [identity.id]);

  const sections = [
    { to: '#following', icon: Users, label: 'Following', count: currentCustomer.followingCount },
    { to: '/saved', icon: Bookmark, label: 'Saved', count: currentCustomer.savedCount },
    { to: '/rewards', icon: Gift, label: 'Rewards', count: currentCustomer.rewardsCount },
    { to: '#reviews', icon: Star, label: 'Reviews', count: currentCustomer.reviewsCount },
    { to: '/referrals', icon: Users, label: 'Referrals' },
    { to: '/messages', icon: MessageCircle, label: 'Messages' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
  ];

  return (
    <div className="max-w-2xl mx-auto pb-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Account</h1>

      <div className="card p-6 text-center">
        <Avatar src={currentCustomer.avatarUrl} alt={currentCustomer.displayName} size="xl" className="mx-auto" />
        <h2 className="mt-3 text-lg font-bold text-gray-900 dark:text-gray-100">{currentCustomer.displayName}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{currentCustomer.email}</p>
        <div className="mt-4 flex justify-center gap-6">
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{currentCustomer.followingCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Following</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{currentCustomer.reviewsCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Reviews</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{currentCustomer.savedCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Saved</p>
          </div>
        </div>
      </div>

      <div className="mt-4 card divide-y divide-gray-200 dark:divide-gray-800">
        {sections.map((s) => (
          <Link key={s.to} to={s.to} className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
            <s.icon size={20} className="text-gray-500 dark:text-gray-400" />
            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{s.label}</span>
            {s.count !== undefined && <span className="text-xs text-gray-400">{s.count}</span>}
            <ChevronRight size={18} className="text-gray-400" />
          </Link>
        ))}
      </div>

      <div className="mt-4 card divide-y divide-gray-200 dark:divide-gray-800">
        <button onClick={() => window.alert('Account settings will be persisted when Supabase Auth is connected.')} className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800">
          <Settings size={20} className="text-gray-500 dark:text-gray-400" />
          <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">Settings</span>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
        <button onClick={() => isBackendMode ? void signOut() : setRole('guest')} className="flex items-center gap-3 p-4 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800">
          <span className="flex-1 text-sm font-medium text-error-500">{isBackendMode ? 'Sign Out' : 'Sign Out (Dev Preview)'}</span>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      <section id="following" className="mt-6 scroll-mt-20">
        <h2 className="section-title mb-3">Businesses following</h2>
        <div className="grid gap-3 sm:grid-cols-2">{businesses.slice(0, 2).map((business) => <BusinessCard key={business.id} business={business} variant="compact" />)}</div>
      </section>

      <section id="reviews" className="mt-6 scroll-mt-20">
        <h2 className="section-title mb-3">Your reviews</h2>
        <div className="space-y-3">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div>
      </section>

      <p className="mt-6 text-center text-xs text-gray-400">
        Your account is private. Only your name and avatar are visible to businesses.
      </p>
    </div>
  );
}
