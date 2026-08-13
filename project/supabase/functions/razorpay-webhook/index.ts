import { createClient } from 'npm:@supabase/supabase-js@2';

type JsonRecord = Record<string, unknown>;
const supportedEvents = new Set([
  'subscription.authenticated', 'subscription.activated', 'subscription.charged',
  'subscription.completed', 'subscription.updated', 'subscription.pending',
  'subscription.halted', 'subscription.cancelled', 'subscription.paused', 'subscription.resumed',
]);

Deno.serve(async (request) => {
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') ?? '';
    const eventId = request.headers.get('x-razorpay-event-id') ?? '';
    const webhookSecret = required('RAZORPAY_WEBHOOK_SECRET');
    if (!signature || !eventId || !(await verifyHmac(rawBody, signature, webhookSecret))) return response({ error: 'Invalid webhook signature' }, 401);
    const payload = JSON.parse(rawBody) as JsonRecord;
    const eventType = stringValue(payload.event);
    if (!supportedEvents.has(eventType)) return response({ ignored: true });

    const entities = ((payload.payload as JsonRecord | undefined) ?? {});
    const subscription = entity(entities.subscription);
    const payment = entity(entities.payment);
    if (!subscription.id) return response({ error: 'Subscription entity missing' }, 400);
    const admin = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
    const { data, error } = await admin.rpc('apply_razorpay_subscription_event', {
      target_event_id: eventId,
      target_event_type: eventType,
      target_subscription_id: stringValue(subscription.id),
      target_payment_id: stringValue(payment.id) || null,
      target_provider_status: stringValue(subscription.status) || null,
      target_payment_status: stringValue(payment.status) || null,
      target_payment_amount_paise: Number(payment.amount) || null,
      target_paid_count: Number(subscription.paid_count) || 0,
      target_period_start: unixDate(subscription.current_start),
      target_period_end: unixDate(subscription.current_end),
      target_payload: payload,
    });
    if (error) throw new Error(error.message);
    return response({ processed: data });
  } catch (error) {
    console.error('Razorpay webhook failed:', error instanceof Error ? error.message : 'Unexpected error');
    return response({ error: 'Webhook processing failed' }, 500);
  }
});

function entity(value: unknown): JsonRecord {
  const wrapper = value && typeof value === 'object' ? value as JsonRecord : {};
  return wrapper.entity && typeof wrapper.entity === 'object' ? wrapper.entity as JsonRecord : {};
}
async function verifyHmac(message: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
  const expected = [...signed].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return mismatch === 0;
}
function unixDate(value: unknown) { const seconds = Number(value); return seconds > 0 ? new Date(seconds * 1000).toISOString() : null; }
function stringValue(value: unknown) { return typeof value === 'string' ? value : ''; }
function required(name: string) { const value = Deno.env.get(name); if (!value) throw new Error(`Missing ${name}`); return value; }
function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }); }
