import { requireSupabase } from '@/lib/supabase';

export interface CashfreeCheckoutData {
  provider: 'cashfree';
  env: string;
  clientId: string;
  apiVersion: string;
  paymentSessionId: string | null;
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
  checkout: (options: { paymentSessionId: string }) => Promise<{ paymentStatus?: string; orderId?: string; message?: string }>;
}
interface CashfreeConstructor { new(options: { mode: string }): CashfreeSdkInstance; }
declare global { interface Window { Cashfree?: CashfreeConstructor; } }

async function invoke<T>(body: Record<string, string>) {
  const { data, error } = await requireSupabase().functions.invoke<T>('cashfree-subscription', { body });
  if (error) throw new Error(error.message || 'Subscription request failed');
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

export const cashfreeSubscriptionService = {
  create: () => invoke<CashfreeCheckoutData>({ action: 'create' }),
  cancel: () => invoke<{ cancelAtPeriodEnd: boolean }>({ action: 'cancel' }),
  status: () => invoke<{ subscription: { id: string; status: string; providerStatus: string; setupFeePaid: boolean; autopayAuthorized: boolean; businessActive?: boolean } | null }>({ action: 'status' }),
  async openCheckout(data: CashfreeCheckoutData): Promise<CashfreeOutcome> {
    if (!data.paymentSessionId) return 'error';
    await loadCheckout();
    const cashfree = new window.Cashfree!({ mode: data.env });
    try {
      const result = await cashfree.checkout({ paymentSessionId: data.paymentSessionId });
      const status = (result?.paymentStatus || '').toUpperCase();
      if (status === 'SUCCESS') return 'success';
      if (status === 'CANCELLED') return 'cancelled';
      return 'error';
    } catch (cause) {
      console.error('[Cashfree Checkout]', cause);
      return 'error';
    }
  },
};
