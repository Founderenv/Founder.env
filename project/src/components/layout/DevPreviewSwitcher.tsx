import { useState } from 'react';
import { ChevronDown, FlaskConical, User, Store, Shield, Eye } from 'lucide-react';
import { type Role } from '@/types';
import { cn } from '@/utils/format';
import { Modal } from '@/components/ui/Modal';

interface DevPreviewSwitcherProps {
  role: Role;
  setRole: (r: Role) => void;
  compact?: boolean;
}

const roleConfig: { id: Role; label: string; icon: typeof User; desc: string }[] = [
  { id: 'guest', label: 'Guest', icon: Eye, desc: 'Browse without an account' },
  { id: 'customer', label: 'Customer', icon: User, desc: 'Follow, like, save, claim deals' },
  { id: 'owner', label: 'Business Owner', icon: Store, desc: 'Manage your business profile' },
  { id: 'admin', label: 'Admin', icon: Shield, desc: 'Platform management' },
];

export function DevPreviewSwitcher({ role, setRole, compact }: DevPreviewSwitcherProps) {
  const [open, setOpen] = useState(false);
  const current = roleConfig.find((r) => r.id === role) || roleConfig[0];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
          'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-500'
        )}
      >
        <FlaskConical size={14} />
        {!compact && <span>Dev Preview:</span>}
        <span className="font-semibold">{current.label}</span>
        <ChevronDown size={14} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Development Preview" size="sm">
        <div className="space-y-4">
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-500">
            This is a frontend-only role switcher for development. Not real authentication. Will be replaced by Supabase Auth.
          </div>
          <div className="space-y-2">
            {roleConfig.map((r) => (
              <button
                key={r.id}
                onClick={() => { setRole(r.id); setOpen(false); }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all',
                  role === r.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700'
                )}
              >
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  role === r.id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                )}>
                  <r.icon size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{r.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{r.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
