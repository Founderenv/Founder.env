import { Check, UserPlus } from 'lucide-react';
import { cn } from '@/utils/format';

interface FollowButtonProps {
  isFollowing: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md';
  className?: string;
  disabled?: boolean;
}

export function FollowButton({ isFollowing, onToggle, size = 'md', className, disabled = false }: FollowButtonProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 no-tap',
        size === 'sm' ? 'px-4 py-2 text-xs' : 'px-5 py-2.5 text-sm',
        isFollowing
          ? 'bg-gray-100 text-gray-700 hover:bg-error-50 hover:text-error-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-error-500/10 dark:hover:text-error-500'
          : 'bg-brand-600 text-white hover:bg-brand-700',
        className
      )}
    >
      {isFollowing ? (
        <>
          <Check size={size === 'sm' ? 14 : 16} />
          <span className="following-label">Following</span>
          <span className="unfollow-label hidden">Unfollow</span>
        </>
      ) : (
        <>
          <UserPlus size={size === 'sm' ? 14 : 16} />
          Follow
        </>
      )}
    </button>
  );
}
