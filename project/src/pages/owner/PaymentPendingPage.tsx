import { CreditCard, Clock, CheckCircle2, Mail, LogOut } from 'lucide-react';
import { useAuth } from '@/auth/AuthProvider';
import { Logo } from '@/components/layout/Navigation';

/**
 * PaymentPendingPage — shown to business owners whose business
 * has subscription_status = 'pending' (not yet paid or waived).
 *
 * This page is a PLACEHOLDER — no real Razorpay integration yet.
 * Payment integration will be added in a future release.
 *
 * Activation paths:
 *   1. payment_status = 'paid'  → admin confirms Razorpay payment → activates
 *   2. payment_status = 'waived' → admin calls admin_activate_early_access RPC → activates
 *
 * This page is NEVER shown to customers. It is only accessible
 * via the /owner/payment-pending route, which is guarded for
 * business_owner + onboardingComplete + paymentGate='pending'.
 */
export function PaymentPendingPage() {
  const { profile, ownerBusiness, signOut } = useAuth();

  const isEarlyAccess = ownerBusiness?.paymentGate === 'paid';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <button
            id="payment-pending-signout"
            onClick={() => void signOut()}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>

        {isEarlyAccess ? (
          /* Early Access approved — this branch should not normally be seen
             because the owner would be routed to /owner/analytics instead.
             Kept as a safety fallback. */
          <EarlyAccessApproved businessName={ownerBusiness?.businessName} />
        ) : (
          <PendingPayment profile={profile} ownerBusiness={ownerBusiness} />
        )}
      </div>
    </div>
  );
}

function PendingPayment({
  profile,
  ownerBusiness,
}: {
  profile: ReturnType<typeof useAuth>['profile'];
  ownerBusiness: ReturnType<typeof useAuth>['ownerBusiness'];
}) {
  return (
    <div className="card overflow-hidden p-0">
      {/* Header gradient */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
          <CreditCard size={28} />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Payment Required</h1>
        <p className="mt-1 text-sm text-brand-200">
          Activate your business profile on Founder.env
        </p>
      </div>

      <div className="p-6">
        {ownerBusiness && (
          <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500">Business profile</p>
            <p className="mt-0.5 font-semibold">{ownerBusiness.businessName}</p>
            <p className="text-sm text-gray-500">@{ownerBusiness.businessUsername}</p>
          </div>
        )}

        {/* Pricing card */}
        <div className="rounded-2xl border-2 border-brand-200 bg-brand-50 p-5 dark:border-brand-500/30 dark:bg-brand-500/10">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-semibold text-brand-900 dark:text-brand-200">Founder.env Business</p>
              <p className="mt-0.5 text-sm text-brand-700/70 dark:text-brand-400/70">One-time activation fee</p>
            </div>
            <p className="text-3xl font-bold text-brand-700 dark:text-brand-400">₹599</p>
          </div>

          <div className="mt-4 space-y-2">
            {[
              'Permanent public business profile',
              'Unlimited QR code (never expires)',
              'Deals, stories, and posts',
              'Customer follows & DMs',
              'Analytics dashboard',
              'Early access to new features',
            ].map((feature) => (
              <p key={feature} className="flex items-center gap-2 text-sm text-brand-800 dark:text-brand-300">
                <CheckCircle2 size={15} className="shrink-0 text-brand-600" />
                {feature}
              </p>
            ))}
          </div>
        </div>

        {/* Payment coming soon notice */}
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-500/10">
          <Clock size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Payment integration coming soon
            </p>
            <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/70">
              We're setting up Razorpay. You'll receive an email at{' '}
              <strong>{profile?.email ?? 'your registered email'}</strong> once payment is live.
            </p>
          </div>
        </div>

        {/* Contact for early access */}
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
          <Mail size={18} className="shrink-0 text-gray-400" />
          <div>
            <p className="text-sm font-medium">Interested in Early Access?</p>
            <p className="mt-0.5 text-xs text-gray-500">
              Email us at{' '}
              <a href="mailto:hello@founder.env" className="text-brand-600 hover:underline">
                hello@founder.env
              </a>{' '}
              to get your business activated manually while payment is being set up.
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-gray-100 py-2.5 text-sm text-gray-500 dark:bg-gray-800">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          Business profile saved · Pending activation
        </div>
      </div>
    </div>
  );
}

function EarlyAccessApproved({ businessName }: { businessName?: string }) {
  return (
    <div className="card p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-success-50 text-success-600 dark:bg-success-500/10">
        <CheckCircle2 size={32} />
      </div>
      <h1 className="mt-4 text-2xl font-bold">Early Access Approved</h1>
      <p className="mt-2 text-sm text-gray-500">
        {businessName ? `${businessName} is` : 'Your business is'} now live on Founder.env.
      </p>
      <a href="/owner/analytics" className="btn-primary mt-6 inline-flex">
        Go to Owner Dashboard
      </a>
    </div>
  );
}
