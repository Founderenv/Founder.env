import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  addOneCalendarMonth, cashfreeApi, cashfreeEnv, MONTHLY_FEE, SETUP_FEE, TOTAL_COUNT,
} from '../_shared/cashfree.ts';

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
    const env = cashfreeEnv();
    const userClient = createClient(env.supabaseUrl, env.anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Invalid session' }, 401);
    const admin = createClient(env.supabaseUrl, env.serviceKey, { auth: { persistSession: false } });
    const body = await request.json() as { action?: string; subscriptionId?: string };

    const { data: profile } = await userClient.from('profiles').select('role,onboarding_complete,display_name,email_private').eq('id', userData.user.id).single();
    if (profile?.role !== 'business_owner' || !profile.onboarding_complete) return json({ error: 'Complete business onboarding first' }, 403);
    const { data: business, error: businessError } = await userClient.from('businesses').select('id,name,owner_id').eq('owner_id', userData.user.id).single();
    if (businessError || !business) return json({ error: 'Owned business not found' }, 404);

    if (body.action === 'create') return createSubscription(admin, env, business, profile, userData.user.id);
    if (body.action === 'cancel') return cancelSubscription(admin, env, business.id);
    if (body.action === 'status') return getStatus(admin, business.id);
    return json({ error: 'Unsupported action' }, 400);
  } catch (error) {
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
    return json(checkoutData(env, existing.provider_subscription_id, business.name, existing.subscription_start_at));
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
  const subscriptionId = `fe_${business.id.slice(0, 18)}_${Date.now().toString(36)}`;
  const customerPhone = stringValue(profile.phone) || stringValue(profile.phone_number) || '';
  const subscription = await cashfreeApi(env, '/subscriptions', 'POST', {
    subscription_id: subscriptionId,
    customer_details: {
      customer_id: userId,
      customer_name: stringValue(profile.display_name) || 'Founder.env owner',
      customer_email: stringValue(profile.email_private),
      customer_phone: customerPhone,
    },
    plan_details: { plan_id: stringValue(plan.plan_id) || planId },
    authorization_details: {
      authorization_amount: SETUP_FEE,
      authorization_amount_refund: false,
    },
    subscription_first_charge_time: startAt.toISOString(),
    subscription_expiry_time: addOneCalendarMonth(startAt).toISOString(),
    subscription_note: 'Founder.env business subscription',
    subscription_tags: { business_id: business.id, billing_model: 'setup_then_calendar_monthly' },
  });

  const cfSubscriptionId = stringValue(subscription.cf_subscription_id) || subscriptionId;
  const { error } = await admin.rpc('register_cashfree_subscription', {
    target_business_id: business.id,
    target_subscription_id: cfSubscriptionId,
    target_plan_id: stringValue(plan.plan_id) || planId,
    target_start_at: startAt.toISOString(),
  });
  if (error) throw new Error(error.message);

  // Create a Payment Order so the Cashfree hosted checkout has a session for the
  // ₹299 authorisation charge. Returns only the safe session id to the browser.
  let paymentSessionId: string | null = null;
  try {
    const order = await cashfreeApi(env, '/orders', 'POST', {
      order_id: `fe_auth_${cfSubscriptionId.slice(-24)}`,
      order_amount: SETUP_FEE,
      order_currency: 'INR',
      customer_details: {
        customer_id: userId,
        customer_name: stringValue(profile.display_name) || 'Founder.env owner',
        customer_email: stringValue(profile.email_private),
        customer_phone: customerPhone,
      },
      order_meta: { notify_url: `${env.supabaseUrl}/functions/v1/cashfree-webhook` },
      order_tags: { business_id: business.id, subscription_id: cfSubscriptionId },
    });
    paymentSessionId = stringValue(order.payment_session_id) || null;
  } catch (e) {
    console.error('Cashfree order session failed (falling back to subscription-only):', e instanceof Error ? e.message : e);
  }

  return json(checkoutData(env, cfSubscriptionId, business.name, startAt.toISOString(), paymentSessionId, planId));
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

function checkoutData(env: ReturnType<typeof cashfreeEnv>, subscriptionId: string, businessName: string, startAt: string, paymentSessionId: string | null = null, planId?: string) {
  return {
    provider: 'cashfree',
    env: env.env,
    clientId: env.clientId,
    apiVersion: env.apiVersion,
    paymentSessionId,
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
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } }); }
