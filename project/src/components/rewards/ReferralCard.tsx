import { useState } from 'react';
import { Users, Gift, Copy, Check, MessageCircle, Share2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/utils/format';
import type { Referral } from '@/types';

const stateVariant = {
  pending: 'warning',
  qualified: 'info',
  rewarded: 'success',
  expired: 'error',
  rejected: 'error',
} as const;

export function ReferralCard({ referral }: { referral: Referral }) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard?.writeText(`https://${referral.referralLink}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const share = () => {
    const url = `https://${referral.referralLink}`;
    if (navigator.share) navigator.share({ title: `Visit ${referral.businessName}`, text: `You get ${referral.friendReward}`, url });
    else navigator.clipboard?.writeText(url).then(() => window.alert('Referral link copied.'));
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <Avatar src={referral.businessLogo} alt={referral.businessName} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{referral.businessName}</p>
          <StatusBadge status={referral.state} variant={stateVariant[referral.state]} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">Friend gets</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
            <Gift size={14} className="text-brand-600" /> {referral.friendReward}
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">You get</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
            <Gift size={14} className="text-accent-500" /> {referral.referrerReward}
          </p>
        </div>
      </div>

      {referral.referredName && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Users size={14} /> Referred: <span className="font-medium text-gray-700 dark:text-gray-300">{referral.referredName}</span>
        </div>
      )}

      {referral.state === 'pending' && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-gray-200 p-2.5 dark:border-gray-800">
          <span className="flex-1 truncate text-xs text-gray-500 dark:text-gray-400 font-mono">{referral.referralLink}</span>
          <button onClick={copyLink} className={cn('rounded-lg p-1.5', copied ? 'text-success-600' : 'text-gray-400 hover:text-gray-600')}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Visit ${referral.businessName} and get ${referral.friendReward}: https://${referral.referralLink}`)}`} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-success-600 hover:bg-success-50 dark:hover:bg-success-500/10" aria-label="Share on WhatsApp">
            <MessageCircle size={16} />
          </a>
          <button onClick={share} className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600" aria-label="Share referral">
            <Share2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
