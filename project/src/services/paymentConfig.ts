// Payment-provider configuration.
//
// For Test Mode the ACTIVE provider is Cashfree. Razorpay remains fully
// available and untouched as a fallback. Business/payment business logic is
// provider-independent; only the checkout transport differs.

export type PaymentProvider = 'cashfree' | 'razorpay';

/** Current active provider for new business subscriptions. */
export const ACTIVE_PAYMENT_PROVIDER: PaymentProvider = 'cashfree';

/** Server-authoritative pricing shown in provider-neutral UI. */
export const SUBSCRIPTION_PRICING = {
  setupFee: 299,
  monthly: 199,
  totalCount: 24,
} as const;

/** True when the active provider's Live collection still needs Cashfree approval. */
export const isLiveCollectionPending = ACTIVE_PAYMENT_PROVIDER === 'cashfree';
