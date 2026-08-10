import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { FeedSkeleton } from '@/components/ui/States';
import { useRole } from '@/hooks/useTheme';
import { useAuth, type DatabaseRole } from '@/auth/AuthProvider';

const LandingPage = lazy(() => import('@/pages/landing/LandingPage').then((m) => ({ default: m.LandingPage })));
const CustomerFeed = lazy(() => import('@/pages/customer/CustomerFeed').then((m) => ({ default: m.CustomerFeed })));
const ExplorePage = lazy(() => import('@/pages/customer/ExplorePage').then((m) => ({ default: m.ExplorePage })));
const DealsPage = lazy(() => import('@/pages/customer/DealsPage').then((m) => ({ default: m.DealsPage })));
const ClipsPage = lazy(() => import('@/pages/customer/ClipsPage').then((m) => ({ default: m.ClipsPage })));
const MessagesPage = lazy(() => import('@/pages/customer/MessagesPage').then((m) => ({ default: m.MessagesPage })));
const NotificationsPage = lazy(() => import('@/pages/customer/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const SavedPage = lazy(() => import('@/pages/customer/SavedPage').then((m) => ({ default: m.SavedPage })));
const AccountPage = lazy(() => import('@/pages/customer/AccountPage').then((m) => ({ default: m.AccountPage })));
const RewardsPage = lazy(() => import('@/pages/customer/RewardsPage').then((m) => ({ default: m.RewardsPage })));
const ReferralsPage = lazy(() => import('@/pages/customer/ReferralsPage').then((m) => ({ default: m.ReferralsPage })));
const BusinessProfile = lazy(() => import('@/pages/business/BusinessProfile').then((m) => ({ default: m.BusinessProfile })));
const OnboardingPage = lazy(() => import('@/pages/owner/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const OwnerEditPage = lazy(() => import('@/pages/owner/OwnerEditPage').then((m) => ({ default: m.OwnerEditPage })));
const CreateContentPage = lazy(() => import('@/pages/owner/CreateContentPage').then((m) => ({ default: m.CreateContentPage })));
const OwnerPage = lazy(() => import('@/pages/owner/OwnerPage').then((m) => ({ default: m.OwnerPage })));
const AdminPage = lazy(() => import('@/pages/admin/AdminPage').then((m) => ({ default: m.AdminPage })));
const QRRedirect = lazy(() => import('@/pages/business/QRRedirect').then((m) => ({ default: m.QRRedirect })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const AuthPage = lazy(() => import('@/pages/auth/AuthPages').then((m) => ({ default: m.AuthPage })));
const AuthCallbackPage = lazy(() => import('@/pages/auth/AuthPages').then((m) => ({ default: m.AuthCallbackPage })));
const ChooseRolePage = lazy(() => import('@/pages/auth/AuthPages').then((m) => ({ default: m.ChooseRolePage })));

function Home() {
  const { role } = useRole();
  if (role === 'guest') return <LandingPage />;
  if (role === 'owner') return <Navigate to="/business/cafearoma" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  return <CustomerFeed />;
}

function AuthGate({ children, roles }: { children: ReactNode; roles?: DatabaseRole[] }) {
  const { isBackendMode, loading, user, profile } = useAuth();
  if (!isBackendMode) return children;
  if (loading) return <FeedSkeleton />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile?.onboardingComplete) return <Navigate to="/choose-role" replace />;
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />;
  return children;
}

function RoutedApp() {
  return (
    <AppShell maxWidth="full">
      <Suspense fallback={<div className="mx-auto max-w-feed p-4"><FeedSkeleton /></div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/deals" element={<DealsPage />} />
          <Route path="/clips" element={<ClipsPage />} />
          <Route path="/messages" element={<AuthGate roles={['customer', 'business_owner']}><MessagesPage /></AuthGate>} />
          <Route path="/notifications" element={<AuthGate><NotificationsPage /></AuthGate>} />
          <Route path="/saved" element={<AuthGate roles={['customer']}><SavedPage /></AuthGate>} />
          <Route path="/account" element={<AuthGate><AccountPage /></AuthGate>} />
          <Route path="/rewards" element={<AuthGate roles={['customer']}><RewardsPage /></AuthGate>} />
          <Route path="/referrals" element={<AuthGate roles={['customer']}><ReferralsPage /></AuthGate>} />
          <Route path="/business/:username" element={<BusinessProfile />} />
          <Route path="/business/:username/deals" element={<BusinessProfile />} />
          <Route path="/onboarding" element={<AuthGate roles={['business_owner']}><OnboardingPage /></AuthGate>} />
          <Route path="/owner/edit" element={<AuthGate roles={['business_owner']}><OwnerEditPage /></AuthGate>} />
          <Route path="/owner/create" element={<AuthGate roles={['business_owner']}><CreateContentPage /></AuthGate>} />
          <Route path="/owner/:section" element={<AuthGate roles={['business_owner']}><OwnerPage /></AuthGate>} />
          <Route path="/admin" element={<AuthGate roles={['admin']}><AdminPage /></AuthGate>} />
          <Route path="/admin/:section" element={<AuthGate roles={['admin']}><AdminPage /></AuthGate>} />
          <Route path="/q/:code" element={<QRRedirect />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/choose-role" element={<ChooseRolePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default function App() {
  return <BrowserRouter><RoutedApp /></BrowserRouter>;
}
