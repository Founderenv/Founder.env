import { useState, useEffect } from 'react';
import { ReferralCard } from '@/components/rewards/ReferralCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Sheet';
import { LoadingSpinner } from '@/components/ui/States';
import { referralService } from '@/services';
import { useCurrentCustomer } from '@/hooks/useCurrentCustomer';
import type { Referral } from '@/types';

export function ReferralsPage() {
  const currentCustomer = useCurrentCustomer();
  const [tab, setTab] = useState('all');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    referralService.getByCustomer(currentCustomer.id).then((r) => {
      setReferrals(r);
      setLoading(false);
    });
  }, [currentCustomer.id]);

  if (loading) return <LoadingSpinner size={32} className="py-12" />;

  const pending = referrals.filter((r) => r.state === 'pending');
  const successful = referrals.filter((r) => r.state === 'rewarded' || r.state === 'qualified');
  const rewarded = referrals.filter((r) => r.state === 'rewarded');

  const filtered = tab === 'all' ? referrals : tab === 'pending' ? pending : tab === 'successful' ? successful : rewarded;

  const totalEarned = rewarded.length;

  return (
    <div className="max-w-2xl mx-auto pb-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Referrals</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{totalEarned} rewards earned from referrals</p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{referrals.length}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-warning-600">{pending.length}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-success-600">{rewarded.length}</p>
          <p className="text-xs text-gray-500">Rewarded</p>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'all', label: 'All' },
          { id: 'pending', label: 'Pending' },
          { id: 'successful', label: 'Successful' },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-4"
      />

      {filtered.length > 0 ? (
        <div className="space-y-4">{filtered.map((r) => <ReferralCard key={r.id} referral={r} />)}</div>
      ) : (
        <EmptyState icon="Users" title="No referrals yet" description="Refer friends to businesses and earn rewards." />
      )}
    </div>
  );
}
