import { ACTIVE_PAYMENT_PROVIDER, type PaymentProvider } from './paymentConfig';
import { cashfreeSubscriptionService, type CashfreeCheckoutData } from './cashfreeService';
import { razorpaySubscriptionService, type RazorpayCheckoutData } from './razorpayService';

export type SubscriptionSession = CashfreeCheckoutData | RazorpayCheckoutData;

/**
 * Provider-neutral subscription gateway. Business logic (pricing, activation,
 * referral reward) lives on the backend; this only transports the checkout.
 * The active provider is configured in paymentConfig.
 */
export const paymentProvider = {
  provider: ACTIVE_PAYMENT_PROVIDER as PaymentProvider,
  isCashfree: ACTIVE_PAYMENT_PROVIDER === 'cashfree',
  create: (): Promise<SubscriptionSession> =>
    ACTIVE_PAYMENT_PROVIDER === 'cashfree'
      ? cashfreeSubscriptionService.create()
      : razorpaySubscriptionService.create(),
  cancel: () =>
    ACTIVE_PAYMENT_PROVIDER === 'cashfree'
      ? cashfreeSubscriptionService.cancel()
      : razorpaySubscriptionService.cancel(),
};
