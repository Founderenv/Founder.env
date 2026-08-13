import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { FeedSkeleton } from '@/components/ui/States';
import { useRole } from '@/hooks/useTheme';
import { useAuth, type DatabaseRole } from '@/auth/AuthProvider';

// ── Lazy imports ──────────────────────────────────────────────────────────────
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
const OwnerProfilePage = lazy(() => import('@/pages/owner/OwnerProfilePage').then((m) => ({ default: m.OwnerProfilePage })));
const CreateContentPage = lazy(() => import('@/pages/owner/CreateContentPage').then((m) => ({ default: m.CreateContentPage })));
const OwnerPage = lazy(() => import('@/pages/owner/OwnerPage').then((m) => ({ default: m.OwnerPage })));
const PaymentPendingPage = lazy(() => import('@/pages/owner/PaymentPendingPage').then((m) => ({ default: m.PaymentPendingPage })));
const AdminPage = lazy(() => import('@/pages/admin/AdminPage').then((m) => ({ default: m.AdminPage })));
const QRRedirect = lazy(() => import('@/pages/business/QRRedirect').then((m) => ({ default: m.QRRedirect })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const AuthPage = lazy(() => import('@/pages/auth/AuthPages').then((m) => ({ default: m.AuthPage })));
const BusinessAuthPage = lazy(() => import('@/pages/auth/AuthPages').then((m) => ({ default: m.BusinessAuthPage })));
const AuthCallbackPage = lazy(() => import('@/pages/auth/AuthPages').then((m) => ({ default: m.AuthCallbackPage })));
const ChooseRolePage = lazy(() => import('@/pages/auth/AuthPages').then((m) => ({ default: m.ChooseRolePage })));
const CustomerDashboard = lazy(() => import('@/pages/customer/CustomerDashboard').then((m) => ({ default: m.CustomerDashboard })));
const BusinessDashboard = lazy(() => import('@/pages/owner/BusinessDashboard').then((m) => ({ default: m.BusinessDashboard })));
const AIContentStudioPage = lazy(() => import('@/pages/owner/AIContentStudioPage').then((m) => ({ default: m.AIContentStudioPage })));
const ContentProPage = lazy(() => import('@/pages/owner/AIContentStudioPage').then((m) => ({ default: m.ContentProPage })));
const PostDetailPage = lazy(() => import('@/pages/customer/PostDetailPage').then((m) => ({ default: m.PostDetailPage })));

// ── Loading skeleton ──────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="mx-auto max-w-feed p-4">
      <FeedSkeleton />
    </div>
  );
}

// ── Home component ────────────────────────────────────────────────────────────
/**
 * Public network discovery is the Home surface for guests, customers, and
 * owners. Authentication redirects are handled only by protected routes.
 */
function Home() {
  const { role } = useRole();
  const { loading, isBackendMode } = useAuth();

  // Non-backend (mock) mode: use legacy role switcher
  if (!isBackendMode) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    return <ExplorePage />;
  }

  // Backend mode with session still loading — show skeleton, not blank
  if (loading) return <PageSkeleton />;

  if (role === 'admin') return <Navigate to="/admin" replace />;
  return <ExplorePage />;
}

// ── Auth Guard ────────────────────────────────────────────────────────────────
/**
 * AuthGate — wraps protected routes.
 *
 * props:
 *   roles           — allowed DatabaseRole values (default: any authenticated)
 *   requirePayment  — if true, also requires the owner's payment gate to be
 *                     'paid' (i.e. is_active=true). Applies only when role
 *                     check passes for business_owner.
 */
function AuthGate({
  children,
  roles,
  requirePayment = false,
}: {
  children: ReactNode;
  roles?: DatabaseRole[];
  requirePayment?: boolean;
}) {
  const { isBackendMode, loading, user, profile, ownerBusiness } = useAuth();
  const location = useLocation();

  // In mock/preview mode: no auth required
  if (!isBackendMode) return children;

  // While restoring session from Supabase — show skeleton, never blank/redirect
  if (loading) return <PageSkeleton />;

  // Not authenticated → send to appropriate login
  if (!user) {
    const isOwnerRoute = location.pathname.startsWith('/owner') || location.pathname === '/onboarding' || location.pathname.startsWith('/business/dashboard') || location.pathname.startsWith('/business/onboarding');
    return <Navigate to={isOwnerRoute ? '/auth/business' : '/auth'} replace />;
  }

  // Authenticated but role not yet chosen → choose-role
  if (!profile) return <PageSkeleton />;
  if (!profile.onboardingComplete && !location.pathname.startsWith('/onboarding') && !location.pathname.startsWith('/business/onboarding')) {
    return <Navigate to={profile.role === 'business_owner' ? '/business/onboarding' : '/choose-role'} replace />;
  }

  // Role check
  if (roles && profile?.role && !roles.includes(profile.role)) {
    // customer trying to access owner route → redirect home (not auto-create business)
    return <Navigate to={profile.role === 'customer' ? '/customer' : '/business/dashboard'} replace />;
  }

  // Payment gate — only for business_owner routes that require activation
  if (requirePayment && profile?.role === 'business_owner') {
    if (!ownerBusiness || ownerBusiness.paymentGate === 'pending' || ownerBusiness.paymentGate === 'suspended') {
      return <Navigate to="/owner/payment-pending" replace />;
    }
  }

  return children;
}

/**
 * OwnerOnboardingGate — the /onboarding route is special:
 * accessible to business_owners with onboarding_complete=false
 * OR business_owners who need to set up a first business.
 * Once onboarding is complete with a paid/waived business, redirect to dashboard.
 */
function OwnerOnboardingGate({ children }: { children: ReactNode }) {
  const { isBackendMode, loading, user, profile, ownerBusiness } = useAuth();

  if (!isBackendMode) return children;
  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/auth/business" replace />;

  // Only business owners should reach onboarding
  if (!profile) return <PageSkeleton />;
  if (profile.role === 'customer') return <Navigate to="/customer" replace />;
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />;

  // If already fully activated, redirect to dashboard
  if (profile.onboardingComplete && ownerBusiness) {
    return <Navigate to="/business/dashboard" replace />;
  }

  return children;
}

/**
 * PaymentPendingGate — /owner/payment-pending route.
 * Only accessible to authenticated business_owners whose business
 * exists but is not yet activated.
 */
function PaymentPendingGate({ children }: { children: ReactNode }) {
  const { isBackendMode, loading, user, profile, ownerBusiness } = useAuth();

  if (!isBackendMode) return children;
  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/auth/business" replace />;
  if (profile?.role !== 'business_owner') return <Navigate to="/" replace />;

  // If payment is resolved, send to dashboard
  if (ownerBusiness?.paymentGate === 'paid') return <Navigate to="/owner/analytics" replace />;

  return children;
}

// ── App shell ─────────────────────────────────────────────────────────────────
function RoutedApp() {
  return (
    <AppShell maxWidth="full">
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/deals" element={<DealsPage />} />
          <Route path="/clips" element={<ClipsPage />} />
          <Route path="/business/:username" element={<BusinessProfile />} />
          <Route path="/business/:username/deals" element={<BusinessProfile />} />
          <Route path="/post/:postId" element={<PostDetailPage />} />
          <Route path="/q/:code" element={<QRRedirect />} />

          {/* Auth — customer entry */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/customer" element={<AuthPage />} />
          {/* Auth — business owner entry */}
          <Route path="/auth/business" element={<BusinessAuthPage />} />
          {/* OAuth callback — handles both customer + business Google OAuth */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          {/* Role selection fallback (Google OAuth users with no stored intent) */}
          <Route path="/choose-role" element={<ChooseRolePage />} />

          {/* V2 canonical customer routes; V1 feed routes remain available. */}
          <Route path="/customer" element={<AuthGate roles={['customer']}><CustomerDashboard /></AuthGate>} />
          <Route path="/customer/profile" element={<AuthGate roles={['customer']}><AccountPage /></AuthGate>} />

          {/* Customer-only protected routes */}
          <Route
            path="/messages"
            element={
              <AuthGate roles={['customer', 'business_owner']}>
                <MessagesPage />
              </AuthGate>
            }
          />
          <Route
            path="/notifications"
            element={
              <AuthGate>
                <NotificationsPage />
              </AuthGate>
            }
          />
          <Route
            path="/saved"
            element={
              <AuthGate roles={['customer']}>
                <SavedPage />
              </AuthGate>
            }
          />
          <Route
            path="/account"
            element={
              <AuthGate>
                <AccountPage />
              </AuthGate>
            }
          />
          <Route
            path="/rewards"
            element={
              <AuthGate roles={['customer']}>
                <RewardsPage />
              </AuthGate>
            }
          />
          <Route
            path="/referrals"
            element={
              <AuthGate roles={['customer']}>
                <ReferralsPage />
              </AuthGate>
            }
          />

          {/* Business owner — onboarding (payment gate NOT required yet) */}
          <Route
            path="/onboarding"
            element={
              <OwnerOnboardingGate>
                <OnboardingPage />
              </OwnerOnboardingGate>
            }
          />
          <Route path="/business/onboarding" element={<OwnerOnboardingGate><OnboardingPage /></OwnerOnboardingGate>} />

          {/* Business owner — payment pending placeholder */}
          <Route
            path="/owner/payment-pending"
            element={
              <PaymentPendingGate>
                <PaymentPendingPage />
              </PaymentPendingGate>
            }
          />

          {/* V2 canonical merchant dashboard; V1 owner sections remain available. */}
          <Route path="/business/dashboard" element={<AuthGate roles={['business_owner']} requirePayment><BusinessDashboard /></AuthGate>} />

          {/* Business owner — dashboard routes (requirePayment enforced) */}
          <Route
            path="/owner/edit"
            element={
              <AuthGate roles={['business_owner']} requirePayment>
                <OwnerEditPage />
              </AuthGate>
            }
          />
          <Route
            path="/owner/create"
            element={
              <AuthGate roles={['business_owner']} requirePayment>
                <CreateContentPage />
              </AuthGate>
            }
          />
          <Route path="/owner/home" element={<Navigate to="/" replace />} />
          <Route path="/owner/ai-content" element={<AuthGate roles={['business_owner']} requirePayment><AIContentStudioPage /></AuthGate>} />
          <Route path="/owner/content-pro" element={<AuthGate roles={['business_owner']} requirePayment><ContentProPage /></AuthGate>} />
          <Route path="/owner/profile" element={<AuthGate roles={['business_owner']} requirePayment><OwnerProfilePage /></AuthGate>} />
          <Route
            path="/owner/:section"
            element={
              <AuthGate roles={['business_owner']} requirePayment>
                <OwnerPage />
              </AuthGate>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <AuthGate roles={['admin']}>
                <AdminPage />
              </AuthGate>
            }
          />
          <Route
            path="/admin/:section"
            element={
              <AuthGate roles={['admin']}>
                <AdminPage />
              </AuthGate>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RoutedApp />
    </BrowserRouter>
  );
}
