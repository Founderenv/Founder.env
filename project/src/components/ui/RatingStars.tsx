import { Star } from 'lucide-react';
import { cn } from '@/utils/format';

interface RatingStarsProps {
  rating: number;
  size?: number;
  showValue?: boolean;
  reviewCount?: number;
  className?: string;
}

export function RatingStars({ rating, size = 16, showValue, reviewCount, className }: RatingStarsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={cn(
              star <= Math.round(rating)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
            )}
          />
        ))}
      </div>
      {showValue && (
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{rating.toFixed(1)}</span>
      )}
      {reviewCount !== undefined && (
        <span className="text-xs text-gray-500 dark:text-gray-400">({reviewCount})</span>
      )}
    </div>
  );
}
