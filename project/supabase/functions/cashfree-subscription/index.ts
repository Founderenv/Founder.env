import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  addOneCalendarMonth, cashfreeApi, cashfreeEnv, CashfreeProviderError, MONTHLY_FEE, SETUP_FEE, TOTAL_COUNT,
} from '../_shared/cashfree.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, GET, POST, PATCH, DELETE',
};

type JsonRecord = Record<string, unknown>;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) return json({ error: 'Authentication required' }, 401);
    const env = cashfreeEnv();
    const userClient = createClient(env.supabaseUrl, env.anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Invalid session' }, 401);
    const admin = createClient(env.supabaseUrl, env.serviceKey, { auth: { persistSession: false } });
    const body = await request.json() as { action?: string; subscriptionId?: string };

    const { data: profile } = await userClient.from('profiles').select('role,onboarding_complete,display_name,email_private,phone').eq('id', userData.user.id).single();
    if (profile?.role !== 'business_owner' || !profile.onboarding_complete) return json({ error: 'Complete business onboarding first' }, 403);
    const { data: business, error: businessError } = await userClient.from('businesses').select('id,name,owner_id').eq('owner_id', userData.user.id).single();
    if (businessError || !business) return json({ error: 'Owned business not found' }, 404);

    // Await each async dispatch so a rejected (e.g. Cashfree provider) call is
    // caught here and returned as a CORS-safe JSON diagnostic rather than
    // becoming an unhandled rejection that Supabase turns into a bare
    // EDGE_FUNCTION_ERROR 500 without Access-Control-Allow-Origin (which the
    // browser then CORS-blocks as a transport failure).
    if (body.action === 'create') return await createSubscription(admin, env, business, profile, userData.user.id);
    if (body.action === 'cancel') return await cancelSubscription(admin, env, business.id);
    if (body.action === 'status') return await getStatus(admin, business.id);
    return json({ error: 'Unsupported action' }, 400);
  } catch (error) {
    if (error instanceof CashfreeProviderError) {
      return json({ error: error.message, provider: error.provider }, 500);
    }
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('Cashfree subscription request failed:', message);
    return json({ error: message }, 500);
  }
});

async function createSubscription(admin: ReturnType<typeof createClient>, env: ReturnType<typeof cashfreeEnv>, business: { id: string; name: string }, profile: JsonRecord, userId: string) {
  const { data: existing } = await admin.from('subscriptions').select('*').eq('business_id', business.id).maybeSingle();
  if (existing?.activation_type && ['early_access', 'complimentary', 'trial'].includes(existing.activation_type) && existing.status === 'active') {
    return json({ error: 'This business already has a manual active plan' }, 409);
  }
  if (existing?.provider === 'cashfree' && existing.provider_subscription_id && !['cancelled', 'completed', 'expired'].includes(existing.provider_status)) {
    // Return the existing checkout so the owner can continue/retry without a duplicate subscription.
    return json(checkoutData(env, existing.provider_subscription_id, existing.subscription_session ?? '', business.name, existing.subscription_start_at, existing.provider_plan_id));
  }

  // Ensure the Founder.env business plan exists (idempotent by deterministic plan id).
  const planId = `fe_biz_${business.id.slice(0, 18)}`;
  const plan = await cashfreeApi(env, '/plans', 'POST', {
    plan_id: planId,
    plan_name: 'Founder.env Business',
    plan_type: 'PERIODIC',
    plan_interval_type: 'MONTH',
    plan_intervals: 1,
    plan_recurring_amount: MONTHLY_FEE,
    plan_max_cycles: TOTAL_COUNT,
    plan_max_amount: Number((MONTHLY_FEE * TOTAL_COUNT).toFixed(2)),
    plan_currency: 'INR',
    plan_note: 'Founder.env ₹199/month for up to 24 cycles',
  }).catch(() => ({ plan_id: planId }));

  const startAt = addOneCalendarMonth(new Date());
  // Expiry must cover the full 24-month recurring run (auth + 24 monthly
  // charges), so push it out 25 calendar months from the start, not 1.
  let expiry = startAt;
  for (let i = 0; i < TOTAL_COUNT + 1; i += 1) expiry = addOneCalendarMonth(expiry);
  const subscriptionId = `fe_${business.id.slice(0, 18)}_${Date.now().toString(36)}`;

  // Cashfree requires a customer_phone and rejects POST /subscriptions with a
  // 400 when it is empty. Resolve + validate the owner's private phone BEFORE
  // calling Cashfree, surfaced as a client-actionable code rather than a
  // provider error. Normalised to the plain 10-digit Indian mobile Cashfree's
  // customer_phone expects (e.g. "9908730221").
  const ownerPhone = normalizeIndianMobile(stringValue(profile.phone) || stringValue(profile.phone_number));
  if (!ownerPhone) {
    return json({ error: 'Mobile number is required before payment.', code: 'OWNER_PHONE_REQUIRED' }, 422);
  }

  const subscription = await cashfreeApi(env, '/subscriptions', 'POST', {
    subscription_id: subscriptionId,
    customer_details: {
      customer_id: userId,
      customer_name: stringValue(profile.display_name) || 'Founder.env owner',
      customer_email: stringValue(profile.email_private),
      customer_phone: ownerPhone,
    },
    plan_details: { plan_id: stringValue(plan.plan_id) || planId },
    authorization_details: {
      authorization_amount: SETUP_FEE,
      authorization_amount_refund: false,
    },
    subscription_first_charge_time: startAt.toISOString(),
    subscription_expiry_time: expiry.toISOString(),
    subscription_note: 'Founder.env business subscription',
    subscription_tags: { business_id: business.id, billing_model: 'setup_then_calendar_monthly' },
  });

  const cfSubscriptionId = stringValue(subscription.cf_subscription_id) || subscriptionId;
  // The subscription authorization checkout must use the Cashfree subscription
  // session returned by POST /subscriptions — NOT a separate PG order's
  // payment_session_id. This session drives the ₹299 authorization + mandate.
  const subscriptionSessionId = stringValue(subscription.subscription_session_id) || '';
  if (!subscriptionSessionId) {
    throw new Error('Cashfree did not return a subscription session; cannot start checkout');
  }

  const { error } = await admin.rpc('register_cashfree_subscription', {
    target_business_id: business.id,
    target_subscription_id: cfSubscriptionId,
    target_plan_id: stringValue(plan.plan_id) || planId,
    target_start_at: startAt.toISOString(),
    target_session: subscriptionSessionId,
  });
  if (error) throw new Error(error.message);

  return json(checkoutData(env, cfSubscriptionId, subscriptionSessionId, business.name, startAt.toISOString(), planId));
}

async function getStatus(admin: ReturnType<typeof createClient>, businessId: string) {
  const { data: sub } = await admin.from('subscriptions').select('*').eq('business_id', businessId).eq('provider', 'cashfree').maybeSingle();
  if (!sub) return json({ subscription: null });
  return json({
    subscription: {
      id: sub.provider_subscription_id,
      status: sub.status,
      providerStatus: sub.provider_status,
      setupFeePaid: sub.setup_fee_paid,
      autopayAuthorized: sub.autopay_authorized,
      businessActive: sub.business_active ?? undefined,
    },
  });
}

async function cancelSubscription(admin: ReturnType<typeof createClient>, env: ReturnType<typeof cashfreeEnv>, businessId: string) {
  const { data: stored, error } = await admin.from('subscriptions').select('*').eq('business_id', businessId).eq('activation_type', 'cashfree').single();
  if (error || !stored?.provider_subscription_id) return json({ error: 'Cashfree subscription not found' }, 404);
  if (['cancelled', 'completed', 'expired'].includes(stored.provider_status)) return json({ cancelAtPeriodEnd: true });
  try {
    await cashfreeApi(env, `/subscriptions/${encodeURIComponent(stored.provider_subscription_id)}`, 'PATCH', { subscription_status: 'CANCELLED' });
  } catch (e) {
    console.error('Cashfree cancel API failed:', e instanceof Error ? e.message : e);
  }
  await admin.from('subscriptions').update({ status: 'cancelled', cancel_at_period_end: true, updated_at: new Date().toISOString() }).eq('id', stored.id);
  return json({ cancelAtPeriodEnd: true });
}

function checkoutData(env: ReturnType<typeof cashfreeEnv>, subscriptionId: string, subscriptionSessionId: string, businessName: string, startAt: string, planId?: string) {
  return {
    provider: 'cashfree',
    env: env.env,
    clientId: env.clientId,
    apiVersion: env.apiVersion,
    subscriptionSessionId,
    subscriptionId,
    planId,
    businessName,
    setupFeeAmount: SETUP_FEE,
    monthlyAmount: MONTHLY_FEE,
    totalCount: TOTAL_COUNT,
    startAt,
    liveCollectionApproval: env.env === 'production' ? 'EXTERNAL_APPROVAL_PENDING' : 'sandbox',
  };
}

function stringValue(value: unknown) { return typeof value === 'string' ? value : ''; }

/**
 * Normalise an Indian mobile to the plain 10-digit form Cashfree expects for
 * customer_phone (e.g. "9908730221"). Accepts "+91 99087 30221", "91990873...",
 * "099087...", or bare 10 digits. Returns '' when the input is not a valid
 * Indian mobile so callers can surface an actionable phone-required error.
 */
function normalizeIndianMobile(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (/^91[6-9]\d{9}$/.test(digits)) return digits.slice(2);
  if (/^0[6-9]\d{9}$/.test(digits)) return digits.slice(1);
  if (/^[6-9]\d{9}$/.test(digits)) return digits;
  return '';
}

function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } }); }
