// Cashfree subscription provider helper for Supabase Edge Functions.
// Keeps the provider API access server-side; only safe checkout data is
// returned to the browser. Amounts are handled in rupees (Cashfree's unit)
// and converted to paise at the schema boundary.

export const SETUP_FEE = 299.0;          // ₹299 today
export const MONTHLY_FEE = 199.0;        // ₹199/month from one calendar month later
export const TOTAL_COUNT = 24;           // 24 recurring cycles
export const SETUP_FEE_PAISE = 29_900;
export const MONTHLY_FEE_PAISE = 19_900;

type JsonRecord = Record<string, unknown>;

export interface CashfreeEnv {
  supabaseUrl: string;
  serviceKey: string;
  anonKey: string;
  clientId: string;
  clientSecret: string;
  env: 'sandbox' | 'production';
  apiVersion: string;
  webhookSecret: string;
}

export function cashfreeEnv(): CashfreeEnv {
  const base = {
    supabaseUrl: required('SUPABASE_URL'),
    serviceKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    anonKey: required('SUPABASE_ANON_KEY'),
    clientId: required('CASHFREE_CLIENT_ID'),
    clientSecret: required('CASHFREE_CLIENT_SECRET'),
    env: (Deno.env.get('CASHFREE_ENV') || 'sandbox') as 'sandbox' | 'production',
    apiVersion: Deno.env.get('CASHFREE_API_VERSION') || '2025-07-08',
    webhookSecret: Deno.env.get('CASHFREE_WEBHOOK_SECRET') || '',
  };
  if (base.env !== 'production') base.env = 'sandbox';
  return base;
}

export function cashfreeBaseUrl(env: CashfreeEnv['env']) {
  return env === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
}

/** Generic Cashfree API call. Never exposes the client secret to the caller. */
export async function cashfreeApi(env: CashfreeEnv, path: string, method = 'GET', body?: JsonRecord): Promise<JsonRecord> {
  const timeoutMs = 10_000;
  let response: Response;
  try {
    response = await fetch(`${cashfreeBaseUrl(env.env)}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': env.clientId,
        'x-client-secret': env.clientSecret,
        'x-api-version': env.apiVersion,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error(`Cashfree request timed out after ${Math.round(timeoutMs / 1000)}s (${path})`);
    }
    throw new Error(`Cashfree request failed (${path}): ${error instanceof Error ? error.message : 'network error'}`);
  }
  const result = (await response.json().catch(() => ({}))) as JsonRecord;
  if (!response.ok) {
    const message = stringValue((result as { message?: string })?.message) || stringValue(result.error) || `Cashfree request failed (${response.status})`;
    throw new Error(message);
  }
  return result;
}

/** One calendar month from now, clamped to end-of-month (UTC). */
export function addOneCalendarMonth(date: Date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  return new Date(Date.UTC(year, month + 1, Math.min(date.getUTCDate(), lastDay), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()));
}

/**
 * Verify the Cashfree webhook signature. Cashfree signs `${timestamp}.${rawBody}`
 * with HMAC-SHA256 and base64-encodes it into the `x-webhook-signature` header,
 * with the timestamp in the `x-webhook-timestamp` header.
 */
export async function verifyWebhookSignature(rawBody: string, timestamp: string | null, signature: string | null): Promise<boolean> {
  if (!timestamp || !signature) return false;
  const secret = required('CASHFREE_WEBHOOK_SECRET');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(digest)));
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return mismatch === 0;
}

/** Extract the nested event data object from a Cashfree webhook payload. */
export function eventData(payload: JsonRecord): JsonRecord {
  const data = payload.data && typeof payload.data === 'object' ? payload.data as JsonRecord : {};
  return data;
}

export function subscriptionDetails(data: JsonRecord): JsonRecord {
  const value = data.subscription_details && typeof data.subscription_details === 'object' ? data.subscription_details as JsonRecord : {};
  return value;
}

export function authorizationDetails(data: JsonRecord): JsonRecord {
  const value = data.authorization_details && typeof data.authorization_details === 'object' ? data.authorization_details as JsonRecord : {};
  return value;
}

export function stringValue(value: unknown): string { return typeof value === 'string' ? value : ''; }
export function required(name: string): string { const value = Deno.env.get(name); if (!value) throw new Error(`Server configuration missing: ${name}`); return value; }
