import { type Theme } from '@/types';

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = theme === 'dark' || (theme === 'system' && media.matches);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  root.style.colorScheme = isDark ? 'dark' : 'light';
}

export function getStoredTheme(): Theme {
  const stored = localStorage.getItem('founder-env-theme');
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

export function setStoredTheme(theme: Theme) {
  localStorage.setItem('founder-env-theme', theme);
}

export function watchSystemTheme(callback: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
