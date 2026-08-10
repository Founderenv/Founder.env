import { useState } from 'react';
import { ThumbsUp, CornerDownRight, Flag } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { RatingStars } from '@/components/ui/RatingStars';
import { timeAgo, cn } from '@/utils/format';
import type { Review } from '@/types';
import { reviewService } from '@/services';

interface ReviewCardProps {
  review: Review;
  isOwner?: boolean;
  onReply?: (review: Review) => void;
}

export function ReviewCard({ review: initialReview, isOwner, onReply }: ReviewCardProps) {
  const [review, setReview] = useState(initialReview);

  const toggleHelpful = () => {
    reviewService.toggleHelpful(review.id).then((u) => u && setReview(u));
  };

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <Avatar src={review.customerAvatar} alt={review.customerName} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{review.customerName}</p>
              <RatingStars rating={review.rating} size={12} />
            </div>
            <span className="text-xs text-gray-400">{timeAgo(review.createdAt)}</span>
          </div>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{review.text}</p>
          {review.photoUrl && (
            <img src={review.photoUrl} alt="Review photo" className="mt-3 rounded-xl max-h-48 w-full object-cover" loading="lazy" />
          )}
          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={toggleHelpful}
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium transition-colors',
                review.isHelpful ? 'text-brand-600 dark:text-brand-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              )}
            >
              <ThumbsUp size={14} className={cn(review.isHelpful && 'fill-brand-100 dark:fill-brand-500/10')} /> Helpful ({review.likeCount})
            </button>
            {isOwner && !review.reply && (
              <button
                onClick={() => onReply?.(review)}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <CornerDownRight size={14} /> Reply
              </button>
            )}
            {isOwner && (
              <button onClick={() => window.alert('Report captured in the frontend preview. Moderation submission requires the backend.')} className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-error-500">
                <Flag size={14} /> Report
              </button>
            )}
          </div>
          {review.reply && (
            <div className="mt-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
              <div className="flex items-center gap-1.5 mb-1">
                <CornerDownRight size={14} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Business replied</span>
                <span className="text-xs text-gray-400">{timeAgo(review.reply.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{review.reply.text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
