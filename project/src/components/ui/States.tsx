import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', description = 'An unexpected error occurred. Please try again.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-error-50 dark:bg-error-500/10">
        <AlertTriangle size={28} className="text-error-500" />
      </div>
      <h3 className="mb-1.5 text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline">
          <RefreshCw size={16} /> Retry
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className || ''}`} />;
}

export function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-2 h-3 w-20" />
            </div>
          </div>
          <Skeleton className="mt-4 h-64 w-full rounded-xl" />
          <Skeleton className="mt-4 h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div>
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="px-4 -mt-12">
        <Skeleton className="h-20 w-20 rounded-full border-4 border-white dark:border-gray-950" />
        <Skeleton className="mt-3 h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-60" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-12 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export function LoadingSpinner({ size = 24, className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className="animate-spin rounded-full border-2 border-gray-200 border-t-brand-600 dark:border-gray-700 dark:border-t-brand-500"
        style={{ width: size, height: size }}
      />
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
