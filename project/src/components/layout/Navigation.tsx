import { type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, Tag, MessageCircle, User, Plus, BarChart3, Menu, X, LayoutDashboard, LogOut, Bell } from 'lucide-react';
import { type Role } from '@/types';
import { cn } from '@/utils/format';
import { useEffect, useState } from 'react';
import { dataMode } from '@/lib/supabase';
import { useAuth } from '@/auth/AuthProvider';
import { notificationService } from '@/services';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
}

const customerNav: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/deals', label: 'Deals', icon: Tag },
  { to: '/messages', label: 'Messages', icon: MessageCircle },
  { to: '/account', label: 'Account', icon: User },
];

const ownerNav: NavItem[] = [
  { to: '/business/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/', label: 'Home', icon: Home },
  { to: '/owner/create', label: 'Create', icon: Plus },
  { to: '/owner/profile', label: 'Profile', icon: User },
  { to: '/messages', label: 'Messages', icon: MessageCircle },
  { to: '/owner/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/owner/qr', label: 'QR', icon: Menu },
];

const ownerMobileNav: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/messages', label: 'Message', icon: MessageCircle },
  { to: '/owner/create', label: 'Create', icon: Plus },
  { to: '/owner/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/owner/profile', label: 'Profile', icon: User },
];

function LogoutButton({ onDone }: { onDone?: () => void }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
      onDone?.();
      navigate('/auth/business', { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return <button type="button" onClick={() => void logout()} disabled={busy} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50 disabled:opacity-60 dark:hover:bg-error-500/10"><LogOut size={19} />{busy ? 'Logging out...' : 'Logout'}</button>;
}

const previewOwnerTools: NavItem[] = [
  { to: '/owner/edit', label: 'Settings', icon: User },
  { to: '/owner/rewards', label: 'Rewards', icon: Tag },
  { to: '/owner/loyalty', label: 'Loyalty', icon: BarChart3 },
  { to: '/owner/referrals', label: 'Referrals', icon: Compass },
  { to: '/owner/subscription', label: 'Subscription', icon: Menu },
];

const ownerTools: NavItem[] = dataMode === 'supabase'
  ? [
      { to: '/owner/edit', label: 'Settings', icon: User },
      { to: '/owner/subscription', label: 'Subscription', icon: Menu },
    ]
  : previewOwnerTools;

export function MobileNavigation({ role }: { role: Role }) {
  const location = useLocation();
  const nav = role === 'owner' ? ownerMobileNav : customerNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-950/95 lg:hidden">
      <div className="flex items-center justify-around px-1 py-1.5 safe-bottom">
        {nav.map((item) => {
          const isActive = location.pathname === item.to ||
            (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors no-tap',
                isActive ? 'text-brand-600 dark:text-brand-500' : 'text-gray-400 dark:text-gray-500'
              )}
            >
              <item.icon size={22} className={cn(isActive && 'fill-brand-100 dark:fill-brand-500/10')} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function DesktopSidebar({ role, children }: { role: Role; children: ReactNode }) {
  const location = useLocation();
  if (role === 'admin') {
    return <AdminSidebar>{children}</AdminSidebar>;
  }

  const nav = role === 'owner' ? ownerNav : customerNav;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950 lg:flex lg:flex-col">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <Logo />
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => {
            const isActive = location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-500'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                )}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {role === 'owner' && <><p className="mb-2 mt-7 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Manage</p><nav className="flex flex-col gap-1">{ownerTools.map((item) => <Link key={item.to} to={item.to} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium', location.pathname === item.to ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-500' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800')}><item.icon size={19} />{item.label}</Link>)}<LogoutButton /></nav></>}
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: Home },
  { to: '/admin/businesses', label: 'Businesses', icon: Compass },
  { to: '/admin/customers', label: 'Customers', icon: User },
  { to: '/admin/payments', label: 'Payments', icon: Tag },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: BarChart3 },
  { to: '/admin/content', label: 'Content', icon: Menu },
  { to: '/admin/reports', label: 'Reports', icon: MessageCircle },
  { to: '/admin/settings', label: 'Settings', icon: Menu },
];

function AdminSidebar({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950 md:flex md:flex-col">
        <Link to="/admin" className="mb-8 flex items-center gap-2 px-2">
          <Logo />
          <span className="text-xs font-medium text-gray-400">Admin</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {adminNav.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-500'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                )}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-950">
        <div className="md:hidden border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
          <Link to="/admin"><Logo /></Link>
          <button onClick={() => {
            const el = document.getElementById('mobile-admin-menu');
            el?.classList.toggle('hidden');
          }}>
            <Menu size={24} />
          </button>
        </div>
        <div id="mobile-admin-menu" className="hidden md:hidden border-b border-gray-200 dark:border-gray-800 p-4">
          <nav className="flex flex-col gap-1">
            {adminNav.map((item) => (
              <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
                <item.icon size={20} />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        {children}
      </main>
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-lg font-bold tracking-tight text-gray-900 dark:text-white', className)}>
      Founder<span className="text-brand-600 dark:text-brand-500">.env</span>
    </span>
  );
}

export function TopNavigation({ role }: { role: Role }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-950/95">
      <div className="flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          {role === 'owner' && <Link to="/business/dashboard" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10" title="Dashboard"><LayoutDashboard size={18}/><span className="hidden min-[360px]:inline">Dashboard</span></Link>}
          <NotificationBell />
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 p-4">
          <nav className="flex flex-col gap-1">
            {(role === 'owner' ? [...ownerNav, ...ownerTools] : customerNav).map((item) => (
              <Link key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
                <item.icon size={20} />
                {item.label}
              </Link>
            ))}
            {role === 'owner' && <LogoutButton onDone={() => setMobileMenuOpen(false)} />}
          </nav>
        </div>
      )}
    </header>
  );
}

function NotificationBell(){const[count,setCount]=useState(0);useEffect(()=>{let active=true;const load=()=>void notificationService.getUnreadCount().then((value)=>{if(active)setCount(value);}).catch(()=>undefined);load();window.addEventListener('founder:notifications-changed',load);return()=>{active=false;window.removeEventListener('founder:notifications-changed',load);};},[]);return <Link to="/notifications" className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800" aria-label={`Notifications${count?` (${count} unread)`:''}`}><Bell size={20}/>{count>0&&<span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-bold text-white">{count>99?'99+':count}</span>}</Link>;}
