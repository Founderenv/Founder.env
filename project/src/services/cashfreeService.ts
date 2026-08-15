import { requireSupabase } from '@/lib/supabase';

export interface CashfreeCheckoutData {
  provider: 'cashfree';
  env: string;
  clientId: string;
  apiVersion: string;
  subscriptionSessionId: string;
  subscriptionId: string;
  planId?: string;
  businessName: string;
  setupFeeAmount: number;
  monthlyAmount: number;
  totalCount: number;
  startAt: string;
  liveCollectionApproval: string;
}

export type CashfreeOutcome = 'success' | 'cancelled' | 'error';

interface CashfreeSdkInstance {
  subscriptionsCheckout: (options: { subsSessionId: string; redirectTarget?: string }) => Promise<{ error?: { message?: string } }>;
}
interface CashfreeConstructor { new(options: { mode: string }): CashfreeSdkInstance; }
declare global { interface Window { Cashfree?: CashfreeConstructor; } }

interface FunctionsErrorLike { message?: string; context?: { provider?: { code?: string; status?: number | null }; error?: string; code?: string } }

async function invoke<T>(body: Record<string, string>) {
  const { data, error } = await requireSupabase().functions.invoke<T>('cashfree-subscription', { body });
  if (error) {
    const message = error.message || 'Subscription request failed';
    const context = (error as FunctionsErrorLike)?.context;
    const provider = context?.provider;
    if (context?.code === 'OWNER_PHONE_REQUIRED') {
      throw new Error('Add your mobile number to continue with payment.');
    }
    if (provider?.code && provider.code !== 'timeout') {
      const status = typeof provider.status === 'number' ? ` (${provider.status})` : '';
      throw new Error(`Payment provider error: ${provider.code}${status}`);
    }
    if (/failed to send a request to the edge function/i.test(message)) {
      throw new Error('Unable to reach the payment service. Please check your connection and try again.');
    }
    if (/non-2xx/i.test(message)) {
      throw new Error('Payment service is temporarily unavailable. Please try again shortly.');
    }
    throw new Error(message);
  }
  return data as T;
}

async function loadCheckout() {
  if (window.Cashfree) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-founder-cashfree]');
    if (existing) { existing.addEventListener('load', () => resolve(), { once: true }); existing.addEventListener('error', () => reject(new Error('Could not load Cashfree Checkout')), { once: true }); return; }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.dataset.founderCashfree = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Cashfree Checkout'));
    document.head.appendChild(script);
  });
  if (!window.Cashfree) throw new Error('Cashfree Checkout is unavailable');
}

export function saveOwnerPhone(phone: string) {
  const client = requireSupabase();
  return client.rpc('save_owner_phone', { target_phone: phone });
}

export const cashfreeSubscriptionService = {
  create: () => invoke<CashfreeCheckoutData>({ action: 'create' }),
  cancel: () => invoke<{ cancelAtPeriodEnd: boolean }>({ action: 'cancel' }),
  status: () => invoke<{ subscription: { id: string; status: string; providerStatus: string; setupFeePaid: boolean; autopayAuthorized: boolean; businessActive?: boolean } | null }>({ action: 'status' }),
  async openCheckout(data: CashfreeCheckoutData): Promise<CashfreeOutcome> {
    if (!data.subscriptionSessionId) return 'error';
    await loadCheckout();
    const cashfree = new window.Cashfree!({ mode: data.env });
    try {
      // Subscription authorization checkout — drives the ₹299 authorization + mandate.
      // Opened in a new tab so the SPA (and its activation polling) stays alive;
      // the promise resolves when the checkout completes/closes.
      const result = await cashfree.subscriptionsCheckout({ subsSessionId: data.subscriptionSessionId, redirectTarget: '_blank' });
      if (result?.error?.message) {
        console.error('[Cashfree Subscription Checkout]', result.error.message);
        return 'error';
      }
      // The checkout resolves cleanly once the customer returns. Actual
      // activation is confirmed server-side via the signed Cashfree webhook;
      // a clean return here just means the payment/mandate flow was entered.
      return 'success';
    } catch (cause) {
      console.error('[Cashfree Subscription Checkout]', cause);
      return 'error';
    }
  },
};
