import { useState, useEffect } from 'react';
import { RewardCard } from '@/components/rewards/RewardCard';
import { LoyaltyCard } from '@/components/rewards/LoyaltyCard';
import { ScratchCard } from '@/components/rewards/ScratchCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Sheet';
import { LoadingSpinner } from '@/components/ui/States';
import { rewardService, loyaltyService, scratchService } from '@/services';
import { useCurrentCustomer } from '@/hooks/useCurrentCustomer';
import type { Reward, LoyaltyProgram, ScratchCampaign } from '@/types';

export function RewardsPage() {
  const currentCustomer = useCurrentCustomer();
  const [tab, setTab] = useState('available');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyProgram[]>([]);
  const [campaigns, setCampaigns] = useState<ScratchCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      rewardService.getByCustomer(currentCustomer.id),
      loyaltyService.getByCustomer(currentCustomer.id),
      scratchService.getAvailable(),
    ]).then(([r, l, s]) => {
      setRewards(r);
      setLoyalty(l);
      setCampaigns(s);
      setLoading(false);
    });
  }, [currentCustomer.id]);

  if (loading) return <LoadingSpinner size={32} className="py-12" />;

  const available = rewards.filter((r) => r.status === 'available');
  const used = rewards.filter((r) => r.status === 'used');
  const expired = rewards.filter((r) => r.status === 'expired');
  const loyaltyRewards = rewards.filter((r) => r.type === 'loyalty');
  const referralRewards = rewards.filter((r) => r.type === 'referral');
  const scratchRewards = rewards.filter((r) => r.type === 'scratch');

  const tabContent: Record<string, Reward[] | LoyaltyProgram[]> = {
    available, loyalty: loyalty, loyaltyRewards, referralRewards, scratchRewards, used, expired,
  };

  return (
    <div className="max-w-2xl mx-auto pb-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Reward Wallet</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{available.length} rewards available</p>

      <Tabs
        tabs={[
          { id: 'available', label: 'Available' },
          { id: 'loyalty', label: 'Loyalty' },
          { id: 'referralRewards', label: 'Referral' },
          { id: 'scratchRewards', label: 'Scratch' },
          { id: 'used', label: 'Used' },
          { id: 'expired', label: 'Expired' },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-4"
      />

      {tab === 'scratchRewards' ? (
        <div className="space-y-4">
          {campaigns.map((campaign) => <ScratchCard key={campaign.id} campaign={campaign} />)}
          {scratchRewards.map((reward) => <RewardCard key={reward.id} reward={reward} />)}
        </div>
      ) : tab === 'loyalty' ? (
        loyalty.length > 0 ? (
          <div className="space-y-4">{loyalty.map((l) => <LoyaltyCard key={l.id} program={l} />)}</div>
        ) : (
          <EmptyState icon="Gift" title="No loyalty programs" description="Follow businesses to join their loyalty programs." />
        )
      ) : (tabContent[tab] as Reward[]).length > 0 ? (
        <div className="space-y-4">{(tabContent[tab] as Reward[]).map((r) => <RewardCard key={r.id} reward={r} />)}</div>
      ) : (
        <EmptyState icon="Gift" title="No rewards here" description="Your rewards will appear in this tab." />
      )}
    </div>
  );
}
