import { type ReactNode } from 'react';
import { Bell, Bookmark, Gift, Image, Inbox, MessageCircle, Search, Star, Tag, Users, Video, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/format';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon = 'Inbox', title, description, action, className }: EmptyStateProps) {
  const icons: Record<string, LucideIcon> = { Bell, Bookmark, Gift, Image, Inbox, MessageCircle, Search, Star, Tag, Users, Video };
  const IconComponent = icons[icon] || Inbox;

  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <IconComponent size={28} className="text-gray-400" />
      </div>
      <h3 className="mb-1.5 text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {action}
    </div>
  );
}
