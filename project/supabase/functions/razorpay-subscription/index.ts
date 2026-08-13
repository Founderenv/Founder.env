import { createClient } from 'npm:@supabase/supabase-js@2';
import { addOneCalendarMonth, MONTHLY_FEE_PAISE, SETUP_FEE_PAISE, TOTAL_COUNT } from '../_shared/billing.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type JsonRecord = Record<string, unknown>;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return json({ error: 'Authentication required' }, 401);
    const env = getEnvironment();
    const userClient = createClient(env.supabaseUrl, env.anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Invalid session' }, 401);
    const admin = createClient(env.supabaseUrl, env.serviceKey, { auth: { persistSession: false } });
    const body = await request.json() as { action?: string; paymentId?: string; subscriptionId?: string; signature?: string };

    const { data: profile } = await userClient.from('profiles').select('role,onboarding_complete').eq('id', userData.user.id).single();
    if (profile?.role !== 'business_owner' || !profile.onboarding_complete) return json({ error: 'Complete business onboarding first' }, 403);
    const { data: business, error: businessError } = await userClient.from('businesses').select('id,name').eq('owner_id', userData.user.id).single();
    if (businessError || !business) return json({ error: 'Owned business not found' }, 404);

    if (body.action === 'create') return createSubscription(admin, env, business);
    if (body.action === 'verify') return verifyCheckout(admin, env, business.id, body);
    if (body.action === 'cancel') return cancelSubscription(admin, env, business.id);
    return json({ error: 'Unsupported action' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('Razorpay subscription request failed:', message);
    return json({ error: message }, 500);
  }
});

async function createSubscription(admin: ReturnType<typeof createClient>, env: ReturnType<typeof getEnvironment>, business: { id: string; name: string }) {
  const { data: existing } = await admin.from('subscriptions').select('*').eq('business_id', business.id).maybeSingle();
  if (existing?.activation_type && ['early_access', 'complimentary', 'trial'].includes(existing.activation_type) && existing.status === 'active') {
    return json({ error: 'This business already has a manual active plan' }, 409);
  }
  if (existing?.provider_subscription_id && existing.provider_status === 'created') {
    return json(checkoutData(env.keyId, existing.provider_subscription_id, business.name, existing.subscription_start_at));
  }
  if (existing?.provider_subscription_id && !['cancelled', 'completed', 'expired'].includes(existing.provider_status)) {
    return json({ error: 'An existing Razorpay subscription is already being processed' }, 409);
  }

  const startAt = addOneCalendarMonth(new Date());
  const provider = await razorpay(env, '/subscriptions', 'POST', {
    plan_id: env.planId,
    total_count: TOTAL_COUNT,
    quantity: 1,
    customer_notify: true,
    start_at: Math.floor(startAt.getTime() / 1000),
    addons: [{ item: { name: 'Founder.env business setup fee', amount: SETUP_FEE_PAISE, currency: 'INR' } }],
    notes: { business_id: business.id, billing_model: 'setup_then_calendar_monthly' },
  });
  const subscriptionId = stringValue(provider.id);
  if (!subscriptionId) throw new Error('Razorpay did not return a subscription id');
  const { error } = await admin.rpc('register_razorpay_subscription', {
    target_business_id: business.id,
    target_provider_subscription_id: subscriptionId,
    target_provider_plan_id: env.planId,
    target_start_at: startAt.toISOString(),
  });
  if (error) throw new Error(error.message);
  return json(checkoutData(env.keyId, subscriptionId, business.name, startAt.toISOString()));
}

async function verifyCheckout(admin: ReturnType<typeof createClient>, env: ReturnType<typeof getEnvironment>, businessId: string, body: { paymentId?: string; subscriptionId?: string; signature?: string }) {
  if (!body.paymentId || !body.subscriptionId || !body.signature) return json({ error: 'Incomplete checkout response' }, 400);
  const { data: stored, error: storedError } = await admin.from('subscriptions').select('*').eq('business_id', businessId).eq('provider_subscription_id', body.subscriptionId).single();
  if (storedError || !stored) return json({ error: 'Subscription does not belong to this business' }, 403);
  const validSignature = await verifyHmac(`${body.paymentId}|${stored.provider_subscription_id}`, body.signature, env.keySecret);
  if (!validSignature) return json({ error: 'Invalid checkout signature' }, 400);

  const [subscription, payment] = await Promise.all([
    razorpay(env, `/subscriptions/${encodeURIComponent(body.subscriptionId)}`),
    razorpay(env, `/payments/${encodeURIComponent(body.paymentId)}`),
  ]);
  if (stringValue(subscription.plan_id) !== env.planId || Number(subscription.total_count) !== TOTAL_COUNT) return json({ error: 'Subscription terms did not match' }, 409);
  if (Number(subscription.start_at) !== Math.floor(new Date(stored.subscription_start_at).getTime() / 1000)) return json({ error: 'Subscription start date did not match' }, 409);
  if (stringValue(payment.subscription_id) !== body.subscriptionId || payment.status !== 'captured' || Number(payment.amount) !== SETUP_FEE_PAISE) return json({ error: 'Setup payment is not captured for ₹299' }, 409);
  if (!['authenticated', 'active'].includes(stringValue(subscription.status))) return json({ error: 'Autopay mandate is not authenticated' }, 409);

  const { data, error } = await admin.rpc('apply_razorpay_subscription_event', eventArguments(
    `checkout:${body.paymentId}`, 'subscription.authenticated', subscription, payment, { checkout_verified: true },
  ));
  if (error) throw new Error(error.message);
  return json({ activated: true, processed: data });
}

async function cancelSubscription(admin: ReturnType<typeof createClient>, env: ReturnType<typeof getEnvironment>, businessId: string) {
  const { data: stored, error } = await admin.from('subscriptions').select('*').eq('business_id', businessId).eq('activation_type', 'razorpay').single();
  if (error || !stored?.provider_subscription_id) return json({ error: 'Razorpay subscription not found' }, 404);
  if (['cancelled', 'completed'].includes(stored.provider_status)) return json({ cancelAtPeriodEnd: true });
  const provider = await razorpay(env, `/subscriptions/${encodeURIComponent(stored.provider_subscription_id)}/cancel`, 'POST', { cancel_at_cycle_end: true });
  const { error: updateError } = await admin.from('subscriptions').update({
    cancel_at_period_end: true,
    provider_status: stringValue(provider.status) || stored.provider_status,
    updated_at: new Date().toISOString(),
  }).eq('id', stored.id);
  if (updateError) throw new Error(updateError.message);
  return json({ cancelAtPeriodEnd: true, currentPeriodEnd: stored.current_period_end });
}

function eventArguments(eventId: string, eventType: string, subscription: JsonRecord, payment: JsonRecord | null, payload: JsonRecord) {
  return {
    target_event_id: eventId,
    target_event_type: eventType,
    target_subscription_id: stringValue(subscription.id),
    target_payment_id: payment ? stringValue(payment.id) || null : null,
    target_provider_status: stringValue(subscription.status) || null,
    target_payment_status: payment ? stringValue(payment.status) || null : null,
    target_payment_amount_paise: payment ? Number(payment.amount) || null : null,
    target_paid_count: Number(subscription.paid_count) || 0,
    target_period_start: unixDate(subscription.current_start),
    target_period_end: unixDate(subscription.current_end),
    target_payload: payload,
  };
}

function checkoutData(keyId: string, subscriptionId: string, businessName: string, startAt: string) {
  return { keyId, subscriptionId, businessName, setupFeeAmount: SETUP_FEE_PAISE, monthlyAmount: MONTHLY_FEE_PAISE, totalCount: TOTAL_COUNT, startAt };
}

function getEnvironment() {
  const supabaseUrl = required('SUPABASE_URL');
  const anonKey = required('SUPABASE_ANON_KEY');
  const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY');
  const keyId = required('RAZORPAY_KEY_ID');
  const keySecret = required('RAZORPAY_KEY_SECRET');
  const planId = required('RAZORPAY_PLAN_ID');
  return { supabaseUrl, anonKey, serviceKey, keyId, keySecret, planId };
}

async function razorpay(env: ReturnType<typeof getEnvironment>, path: string, method = 'GET', body?: JsonRecord) {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { Authorization: `Basic ${btoa(`${env.keyId}:${env.keySecret}`)}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json() as JsonRecord;
  if (!response.ok) throw new Error(stringValue((result.error as JsonRecord | undefined)?.description) || 'Razorpay request failed');
  return result;
}

async function verifyHmac(message: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
  const expected = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return mismatch === 0;
}

function unixDate(value: unknown) { const seconds = Number(value); return seconds > 0 ? new Date(seconds * 1000).toISOString() : null; }
function stringValue(value: unknown) { return typeof value === 'string' ? value : ''; }
function required(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`Server configuration missing: ${name}`); return value; }
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } }); }
