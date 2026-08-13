import { requireSupabase } from '@/lib/supabase';

export interface RazorpayCheckoutData {
  keyId: string;
  subscriptionId: string;
  businessName: string;
  setupFeeAmount: number;
  monthlyAmount: number;
  totalCount: number;
  startAt: string;
}

interface RazorpayCheckoutResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance { open: () => void; }
interface RazorpayConstructor { new(options: Record<string, unknown>): RazorpayInstance; }
declare global { interface Window { Razorpay?: RazorpayConstructor; } }

async function invoke<T>(body: Record<string, string>) {
  const { data, error } = await requireSupabase().functions.invoke<T>('razorpay-subscription', { body });
  if (error) throw new Error(error.message || 'Subscription request failed');
  return data as T;
}

async function loadCheckout() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-founder-razorpay]');
    if (existing) { existing.addEventListener('load', () => resolve(), { once: true }); existing.addEventListener('error', () => reject(new Error('Could not load Razorpay Checkout')), { once: true }); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.founderRazorpay = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay Checkout'));
    document.head.appendChild(script);
  });
  if (!window.Razorpay) throw new Error('Razorpay Checkout is unavailable');
}

export const razorpaySubscriptionService = {
  create: () => invoke<RazorpayCheckoutData>({ action: 'create' }),
  cancel: () => invoke<{ cancelAtPeriodEnd: boolean; currentPeriodEnd?: string }>({ action: 'cancel' }),
  async openCheckout(data: RazorpayCheckoutData, email: string | null, onSuccess: () => Promise<void>) {
    await loadCheckout();
    await new Promise<void>((resolve, reject) => {
      const checkout = new window.Razorpay!({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'Founder.env',
        description: '₹299 setup today · ₹199/month from next month',
        prefill: email ? { email } : undefined,
        notes: { business_name: data.businessName },
        theme: { color: '#4f46e5' },
        modal: { ondismiss: () => reject(new Error('Checkout was closed before authorisation')) },
        handler: async (result: RazorpayCheckoutResponse) => {
          try {
            await invoke<{ activated: boolean }>({
              action: 'verify',
              paymentId: result.razorpay_payment_id,
              subscriptionId: result.razorpay_subscription_id,
              signature: result.razorpay_signature,
            });
            await onSuccess();
            resolve();
          } catch (error) { reject(error); }
        },
      });
      checkout.open();
    });
  },
};
