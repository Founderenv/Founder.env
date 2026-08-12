import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/format';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md card shadow-2xl animate-slide-up max-h-[85vh] overflow-hidden flex flex-col rounded-b-none sm:rounded-2xl" role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          {title && <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>}
          <button onClick={onClose} className="ml-auto rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

interface TabsProps {
  tabs: { id: string; label: string; icon?: ReactNode }[];
  active: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pills';
  className?: string;
}

export function Tabs({ tabs, active, onChange, variant = 'underline', className }: TabsProps) {
  if (variant === 'pills') {
    return (
      <div className={cn('flex gap-2 overflow-x-auto scrollbar-hide', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors',
              active === tab.id
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex gap-1 overflow-x-auto scrollbar-hide border-b border-gray-200 dark:border-gray-800', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
            active === tab.id
              ? 'border-brand-600 text-brand-600 dark:border-brand-500 dark:text-brand-500'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface SegmentedControlProps {
  options: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function SegmentedControl({ options, active, onChange, className }: SegmentedControlProps) {
  return (
    <div className={cn('inline-flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800', className)}>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
            active === opt.id
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
