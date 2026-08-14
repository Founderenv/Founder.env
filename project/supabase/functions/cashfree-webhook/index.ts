import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  authorizationDetails, cashfreeEnv, eventData, stringValue, subscriptionDetails, verifyWebhookSignature,
} from '../_shared/cashfree.ts';

// Real Cashfree subscription webhook event types.
const supportedEvents = new Set([
  'SUBSCRIPTION_STATUS_CHANGED',
  'SUBSCRIPTION_AUTH_STATUS',
  'SUBSCRIPTION_PAYMENT_SUCCESS',
  'SUBSCRIPTION_PAYMENT_FAILED',
  'SUBSCRIPTION_PAYMENT_CANCELLED',
]);

Deno.serve(async (request) => {
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
  try {
    const rawBody = await request.text();
    const timestamp = request.headers.get('x-webhook-timestamp');
    const signature = request.headers.get('x-webhook-signature');
    if (!(await verifyWebhookSignature(rawBody, timestamp, signature))) return response({ error: 'Invalid webhook signature' }, 401);

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const eventType = stringValue(payload.type);
    if (!supportedEvents.has(eventType)) return response({ ignored: true });

    const data = eventData(payload);
    const sub = subscriptionDetails(data);
    const auth = authorizationDetails(data);
    const cfSubscriptionId = stringValue(sub.cf_subscription_id) || stringValue(sub.subscription_id);
    if (!cfSubscriptionId) return response({ error: 'Subscription entity missing' }, 400);

    const env = cashfreeEnv();
    const admin = createClient(env.supabaseUrl, env.serviceKey, { auth: { persistSession: false } });

    // Stable, provider-prefixed event id so webhook retries are idempotent.
    const paymentId = stringValue(data.cf_payment_id) || stringValue(data.payment_details && (data.payment_details as Record<string, unknown>).cf_payment_id) || stringValue(auth.payment_id);
    const eventId = paymentId
      ? `cashfree:${eventType}:${paymentId}`
      : `cashfree:${eventType}:${cfSubscriptionId}:${stringValue(sub.subscription_status)}`;

    // Map Cashfree amounts (rupees) to paise at the schema boundary.
    const rawAmount = Number((data.payment_amount ?? auth.authorization_amount ?? sub.plan_recurring_amount));
    const amountPaise = Number.isFinite(rawAmount) ? Math.round(rawAmount * 100) : null;

    const paymentStatus = stringValue(data.payment_status) || stringValue(auth.authorization_status);
    const providerStatus = stringValue(sub.subscription_status) || stringValue(data.subscription_status);

    const { data: rpc, error } = await admin.rpc('apply_cashfree_subscription_event', {
      target_event_id: eventId,
      target_event_type: eventType,
      target_subscription_id: cfSubscriptionId,
      target_payment_id: paymentId || null,
      target_provider_status: providerStatus || null,
      target_payment_status: paymentStatus || null,
      target_payment_amount_paise: amountPaise,
      target_paid_count: null,
      target_payload: payload,
    });
    if (error) throw new Error(error.message);
    return response({ processed: rpc, duplicated: rpc === false });
  } catch (error) {
    console.error('Cashfree webhook failed:', error instanceof Error ? error.message : 'Unexpected error');
    return response({ error: 'Webhook processing failed' }, 500);
  }
});

function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }); }
