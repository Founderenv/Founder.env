import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { RatingStars } from '@/components/ui/RatingStars';
import { VerifiedBadge } from '@/components/ui/StatusBadge';
import { formatNumber } from '@/utils/format';
import type { Business } from '@/types';

interface BusinessCardProps {
  business: Business;
  variant?: 'default' | 'compact' | 'horizontal';
}

export function BusinessCard({ business, variant = 'default' }: BusinessCardProps) {
  if (variant === 'compact') {
    return (
      <Link
        to={`/business/${business.username}`}
        className="flex flex-col items-center gap-2 rounded-2xl p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
      >
        <div className="relative">
          <Avatar src={business.logoUrl} alt={business.name} size="xl" />
          {business.isVerified && <div className="absolute bottom-0 right-0"><VerifiedBadge size={18} /></div>}
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[100px]">{business.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{business.category}</p>
        </div>
      </Link>
    );
  }

  if (variant === 'horizontal') {
    return (
      <Link
        to={`/business/${business.username}`}
        className="flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
      >
        <Avatar src={business.logoUrl} alt={business.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{business.name}</p>
            {business.isVerified && <VerifiedBadge size={14} />}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{business.category} • {business.city}</p>
          <RatingStars rating={business.rating} size={12} showValue reviewCount={business.reviewCount} />
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/business/${business.username}`}
      className="card overflow-hidden transition-all hover:shadow-lg active:scale-[0.98]"
    >
      <div className="relative h-32">
        <img src={business.coverUrl} alt={business.name} className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-2 right-2">
          <span className="badge bg-white/90 text-gray-700">
            <MapPin size={12} /> {business.city}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative -mt-8">
            <Avatar src={business.logoUrl} alt={business.name} size="lg" ring />
            {business.isVerified && <div className="absolute -bottom-1 -right-1"><VerifiedBadge size={16} /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{business.name}</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{business.category} • {business.location}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{business.bio}</p>
        <div className="mt-3 flex items-center justify-between">
          <RatingStars rating={business.rating} size={14} showValue />
          <span className="text-xs text-gray-500 dark:text-gray-400">{formatNumber(business.followerCount)} followers</span>
        </div>
      </div>
    </Link>
  );
}
