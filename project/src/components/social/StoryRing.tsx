import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/utils/format';
import type { Story } from '@/types';

interface StoryRingProps {
  story?: Story;
  businessName: string;
  businessAvatar: string;
  hasUnseen?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function StoryRing({ story, businessName, businessAvatar, hasUnseen, onClick, size = 'md' }: StoryRingProps) {
  const sizeClass = {
    sm: 'h-14 w-14',
    md: 'h-16 w-16',
    lg: 'h-20 w-20',
  };

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 no-tap"
      aria-label={`View ${businessName} stories`}
    >
      <div className={cn('rounded-full p-[2px]', hasUnseen ? 'bg-gradient-to-tr from-brand-500 via-brand-400 to-accent-400' : 'bg-gray-200 dark:bg-gray-700')}>
        <div className="rounded-full bg-white p-[2px] dark:bg-gray-950">
          <Avatar
            src={businessAvatar || story?.businessLogo}
            alt={businessName}
            className={cn(sizeClass[size])}
            size="md"
          />
        </div>
      </div>
      <span className="max-w-[70px] truncate text-xs font-medium text-gray-700 dark:text-gray-300">
        {businessName}
      </span>
    </button>
  );
}
