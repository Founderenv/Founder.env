import { type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { MobileNavigation, DesktopSidebar, TopNavigation } from '@/components/layout/Navigation';
import { DevPreviewSwitcher } from '@/components/layout/DevPreviewSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme, useRole } from '@/hooks/useTheme';
import { cn } from '@/utils/format';
import { useAuth } from '@/auth/AuthProvider';
import { RealtimeCenter } from '@/components/realtime/RealtimeCenter';

interface AppShellProps {
  children: ReactNode;
  showNav?: boolean;
  maxWidth?: 'feed' | 'full' | 'content';
}

export function AppShell({ children, showNav = true, maxWidth = 'feed' }: AppShellProps) {
  const { theme, setTheme } = useTheme();
  const { role, setRole } = useRole();
  const { isBackendMode, user } = useAuth();
  const location = useLocation();

  const isAdmin = location.pathname.startsWith('/admin');
  const isQR = location.pathname.startsWith('/q/');

  if (isQR) {
    return <>{children}</>;
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <DesktopSidebar role="admin">
          <div className="sticky top-0 z-20 hidden md:flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-950">
            {isBackendMode ? <span className="text-sm text-gray-500">{user?.email}</span> : <DevPreviewSwitcher role={role} setRole={setRole} compact />}
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
          <div className="p-4 md:p-6">{children}</div>
        </DesktopSidebar>
      </div>
    );
  }

  const maxW = maxWidth === 'feed' ? 'max-w-feed mx-auto' : maxWidth === 'content' ? 'max-w-content mx-auto' : '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {isBackendMode && user && <RealtimeCenter />}
      <div className="hidden lg:block">
        <DesktopSidebar role={role}>
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-950">
            {isBackendMode ? <span className="text-sm text-gray-500">{user?.email}</span> : <DevPreviewSwitcher role={role} setRole={setRole} compact />}
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
          <div className="p-4">
            <div className={cn(maxW)}>{children}</div>
          </div>
        </DesktopSidebar>
      </div>
      <div className="lg:hidden">
        <TopNavigation role={role} />
        <div className={cn('min-w-0 overflow-x-hidden px-3 py-4 pb-20', maxW)}>{children}</div>
      </div>
      {showNav && <MobileNavigation role={role} />}
    </div>
  );
}
