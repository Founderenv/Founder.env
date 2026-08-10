import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/States';
import { notificationService } from '@/services';
import { timeAgo, cn } from '@/utils/format';
import type { Notification } from '@/types';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationService.getAll().then((n) => {
      setNotifications(n);
      setLoading(false);
    });
  }, []);

  const markAllRead = () => {
    notificationService.markAllRead().then(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    });
  };

  if (loading) return <LoadingSpinner size={32} className="py-12" />;

  return (
    <div className="max-w-2xl mx-auto pb-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
        {notifications.some((n) => !n.isRead) && (
          <button onClick={markAllRead} className="btn-ghost text-xs">
            <Check size={14} /> Mark all read
          </button>
        )}
      </div>
      {notifications.length > 0 ? (
        <div className="space-y-1">
          {notifications.map((n) => (
            <Link
              key={n.id}
              to={n.actionLink || '#'}
              className={cn(
                'flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
                !n.isRead && 'bg-brand-50/50 dark:bg-brand-500/5'
              )}
            >
              {n.businessAvatar ? (
                <Avatar src={n.businessAvatar} alt={n.title} size="md" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10">
                  <Bell size={18} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{n.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{n.body}</p>
                <span className="text-xs text-gray-400">{timeAgo(n.createdAt)}</span>
              </div>
              {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon="Bell" title="No notifications" description="You're all caught up!" />
      )}
    </div>
  );
}
