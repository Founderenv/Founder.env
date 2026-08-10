import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Tag, Bookmark, Flame, Check } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { VerifiedBadge } from '@/components/ui/StatusBadge';
import { ShareButton } from '@/components/ui/ShareSheet';
import { formatCurrency, timeUntil, cn } from '@/utils/format';
import type { Deal } from '@/types';
import { dealService } from '@/services';

interface DealCardProps {
  deal: Deal;
  onClaim?: (deal: Deal) => void;
  compact?: boolean;
}

export function DealCard({ deal: initialDeal, onClaim, compact }: DealCardProps) {
  const [deal, setDeal] = useState(initialDeal);

  const handleClaim = () => {
    if (deal.isClaimed) {
      window.alert('This deal is already in your reward wallet. Redemption verification requires the backend.');
      return;
    }
    dealService.claim(deal.id).then((updated) => {
      if (updated) {
        setDeal(updated);
        onClaim?.(updated);
      }
    });
  };

  const toggleSave = () => {
    dealService.toggleSave(deal.id).then((updated) => updated && setDeal(updated));
  };

  if (compact) {
    return (
      <Link
        to={`/business/${deal.businessUsername}/deals`}
        className="card overflow-hidden transition-all hover:shadow-md active:scale-[0.98] block"
      >
        <div className="relative h-32">
          <img src={deal.mediaUrl} alt={deal.title} className="h-full w-full object-cover" loading="lazy" />
          <span className="absolute top-2 left-2 badge bg-accent-500 text-white">
            <Flame size={12} /> {deal.discount}% OFF
          </span>
        </div>
        <div className="p-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{deal.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{deal.businessName}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(deal.offerPrice)}</span>
            <span className="text-xs text-gray-400 line-through">{formatCurrency(deal.originalPrice)}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="card overflow-hidden animate-fade-in">
      <div className="flex items-center gap-3 p-3">
        <Link to={`/business/${deal.businessUsername}`}>
          <Avatar src={deal.businessLogo} alt={deal.businessName} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <Link to={`/business/${deal.businessUsername}`} className="text-sm font-semibold text-gray-900 hover:underline dark:text-gray-100 truncate">
              {deal.businessName}
            </Link>
            <VerifiedBadge size={14} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{deal.businessCategory} • {deal.city}</p>
        </div>
        <ShareButton title={deal.title} url={`/#/business/${deal.businessUsername}/deals`} />
      </div>

      <Link to={`/business/${deal.businessUsername}/deals`}>
        <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
          <img src={deal.mediaUrl} alt={deal.title} className="h-full w-full object-cover" loading="lazy" />
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="badge bg-accent-500 text-white">
              <Flame size={12} /> {deal.discount}% OFF
            </span>
            {deal.isClaimed && (
              <span className="badge bg-success-500 text-white">
                <Check size={12} /> Claimed
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="p-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{deal.title}</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{deal.description}</p>

        <div className="mt-3 flex items-end justify-between">
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(deal.offerPrice)}</span>
            <span className="text-sm text-gray-400 line-through mb-0.5">{formatCurrency(deal.originalPrice)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Clock size={14} />
            {timeUntil(deal.endDate)}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{deal.claimedCount} of {deal.maxClaims} claimed</span>
          <div className="h-1.5 w-20 rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${(deal.claimedCount / deal.maxClaims) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={handleClaim}
            disabled={deal.isClaimed}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]',
              deal.isClaimed
                ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            )}
          >
            <Tag size={16} />
            {deal.isClaimed ? 'Claimed' : 'Claim Deal'}
          </button>
          <button
            onClick={toggleSave}
            className="rounded-xl border border-gray-200 p-2.5 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
            aria-label="Save deal"
          >
            <Bookmark
              size={20}
              className={cn(
                deal.isSaved ? 'fill-gray-900 text-gray-900 dark:fill-white dark:text-white' : 'text-gray-500 dark:text-gray-400'
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
