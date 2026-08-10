import { Sun, Moon, Monitor } from 'lucide-react';
import { type Theme } from '@/types';
import { cn } from '@/utils/format';

interface ThemeToggleProps {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export function ThemeToggle({ theme, setTheme }: ThemeToggleProps) {
  const options: { id: Theme; icon: typeof Sun; label: string }[] = [
    { id: 'light', icon: Sun, label: 'Light' },
    { id: 'dark', icon: Moon, label: 'Dark' },
    { id: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className="inline-flex items-center rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => setTheme(opt.id)}
          className={cn(
            'inline-flex items-center justify-center rounded-lg px-2 py-1.5 transition-all',
            theme === opt.id
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          )}
          aria-label={opt.label}
          title={opt.label}
        >
          <opt.icon size={16} />
        </button>
      ))}
    </div>
  );
}
