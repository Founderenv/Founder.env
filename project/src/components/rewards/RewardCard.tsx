import { Clock, Tag, Check, AlertCircle } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, cn } from '@/utils/format';
import type { Reward } from '@/types';
import { rewardService } from '@/services';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import type { RedemptionState } from '@/types';

export function RewardCard({ reward }: { reward: Reward }) {
  const [redeemState, setRedeemState] = useState<RedemptionState | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleRedeem = () => {
    rewardService.redeem(reward.id).then(({ state }) => {
      setRedeemState(state);
      setShowModal(true);
    });
  };

  const statusVariant = reward.status === 'available' ? 'success' : reward.status === 'used' ? 'info' : 'error';

  return (
    <>
      <div className={cn('card overflow-hidden', reward.status === 'expired' && 'opacity-60')}>
        <div className="flex items-start gap-3 p-4">
          <Avatar src={reward.businessLogo} alt={reward.businessName} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{reward.title}</p>
              <StatusBadge status={reward.status} variant={statusVariant} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{reward.businessName}</p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{reward.description}</p>
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1"><Clock size={12} /> Expires {formatDate(reward.expiryDate)}</span>
            <span className="font-mono text-gray-400">{reward.code}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleRedeem}
              disabled={reward.status !== 'available'}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all',
                reward.status === 'available'
                  ? 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98]'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
              )}
            >
              <Tag size={16} />
              {reward.status === 'used' ? 'Used' : reward.status === 'expired' ? 'Expired' : 'Redeem'}
            </button>
          </div>
        </div>
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Redemption" size="sm">
        <RedemptionResult state={redeemState} />
      </Modal>
    </>
  );
}

function RedemptionResult({ state }: { state: RedemptionState | null }) {
  if (!state) return null;
  const config = {
    valid: { icon: Check, color: 'text-success-600', bg: 'bg-success-50 dark:bg-success-500/10', title: 'Reward Redeemed!', desc: 'Show this to the business staff to claim your reward.' },
    already_used: { icon: AlertCircle, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', title: 'Already Used', desc: 'This reward has already been redeemed.' },
    expired: { icon: AlertCircle, color: 'text-error-500', bg: 'bg-error-50 dark:bg-error-500/10', title: 'Expired', desc: 'This reward has expired.' },
    wrong_business: { icon: AlertCircle, color: 'text-error-500', bg: 'bg-error-50 dark:bg-error-500/10', title: 'Wrong Business', desc: 'This reward is for a different business.' },
  };
  const c = config[state];
  return (
    <div className="text-center py-4">
      <div className={cn('mx-auto flex h-16 w-16 items-center justify-center rounded-2xl', c.bg)}>
        <c.icon size={28} className={c.color} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100">{c.title}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{c.desc}</p>
    </div>
  );
}
