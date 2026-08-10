import { type ReactNode } from 'react';
import { cn } from '@/utils/format';

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  className?: string;
  children?: ReactNode;
}

const variantClasses = {
  success: 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-500',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-500',
  error: 'bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-500',
  info: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function StatusBadge({ status, variant = 'neutral', className, children }: StatusBadgeProps) {
  return (
    <span className={cn('badge', variantClasses[variant], className)}>
      {children || status}
    </span>
  );
}

export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-brand-500 shrink-0"
      aria-label="Verified"
    >
      <path d="M12 2l2.4 1.8 3 .1 1 2.8 2.5 1.6-1 2.8 1 2.8-2.5 1.6-1 2.8-3 .1L12 22l-2.4-1.8-3-.1-1-2.8L3 15.7l1-2.8-1-2.8 2.5-1.6 1-2.8 3-.1L12 2z" />
      <path d="M9.5 12.5l2 2 4-4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
