import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const envFile = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const env = { ...process.env, ...Object.fromEntries(envFile.split(/\r?\n/).filter(Boolean).map((line) => {
  const separator = line.indexOf('=');
  return [line.slice(0, separator), line.slice(separator + 1)];
})) };
const supabaseUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

async function signUp(request: import('@playwright/test').APIRequestContext, role: 'customer' | 'business_owner', stamp: string) {
  const email = `codex.${role}.${stamp}@example.com`;
  const password = `Runtime-${stamp}-Pass!`;
  const response = await request.post(`${supabaseUrl}/auth/v1/signup`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    data: { email, password, data: { full_name: `Codex ${role}`, requested_role: role } },
  });
  expect(response.ok()).toBe(true);
  const result = await response.json() as { access_token?: string; user?: { id: string } };
  expect(result.access_token).toBeTruthy();
  expect(result.user?.id).toBeTruthy();
  return { token: result.access_token!, userId: result.user!.id, email, password };
}

test.describe.serial('production-backed deal actions', () => {
  test.setTimeout(90_000);
  test('owner deal insert persists and logout revokes protected access', async ({ page, request }) => {
    const stamp = Date.now().toString();
    const owner = await signUp(request, 'business_owner', stamp);
    const headers = { apikey: anonKey, Authorization: `Bearer ${owner.token}`, Prefer: 'return=representation' };
    const businessResponse = await request.post(`${supabaseUrl}/rest/v1/businesses`, {
      headers,
      data: { owner_id: owner.userId, name: `Codex Runtime ${stamp}`, username: `codex_runtime_${stamp}`, category: 'Services', description: 'Automated runtime verification business.' },
    });
    expect(businessResponse.ok()).toBe(true);
    const [business] = await businessResponse.json() as Array<{ id: string }>;
    const onboardingResponse = await request.post(`${supabaseUrl}/rest/v1/rpc/complete_business_onboarding`, { headers, data: {} });
    expect(onboardingResponse.ok()).toBe(true);

    const startsAt = new Date(Date.now() - 60_000).toISOString();
    const endsAt = new Date(Date.now() + 86_400_000).toISOString();
    const title = `Runtime Persisted Deal ${stamp}`;
    const createResponse = await request.post(`${supabaseUrl}/rest/v1/deals`, {
      headers,
      data: { business_id: business.id, title, description: 'Production persistence verification.', media_path: null, original_price: 500, offer_price: 350, discount_percent: 30, starts_at: startsAt, ends_at: endsAt, max_claims: 5, terms: 'Runtime verification only.', cta_label: 'Claim Deal', status: 'published' },
    });
    expect(createResponse.ok()).toBe(true);
    const [created] = await createResponse.json() as Array<{ id: string; title: string }>;
    expect(created.title).toBe(title);

    const persistedResponse = await request.get(`${supabaseUrl}/rest/v1/deals?id=eq.${created.id}&select=id,title,status,media_path`, { headers });
    expect(persistedResponse.ok()).toBe(true);
    expect(await persistedResponse.json()).toEqual([{ id: created.id, title, status: 'published', media_path: null }]);

    await page.goto('/auth/business');
    await page.getByPlaceholder('Business email address').filter({ visible: true }).fill(owner.email);
    await page.getByPlaceholder('Password').filter({ visible: true }).fill(owner.password);
    await page.getByRole('button', { name: 'Sign in as owner' }).filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/owner\/payment-pending$/);
    await page.getByRole('button', { name: 'Logout' }).filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/auth\/business$/);
    await page.goto('/business/dashboard');
    await expect(page).toHaveURL(/\/auth\/business$/);
  });

  test('customer claim UI persists and duplicate claim returns the same claim', async ({ page, request }) => {
    const stamp = Date.now().toString();
    const activeResponse = await request.get(`${supabaseUrl}/rest/v1/deals?select=id,title&status=eq.published&starts_at=lte.${encodeURIComponent(new Date().toISOString())}&ends_at=gte.${encodeURIComponent(new Date().toISOString())}&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    expect(activeResponse.ok()).toBe(true);
    const [activeDeal] = await activeResponse.json() as Array<{ id: string; title: string }>;
    expect(activeDeal).toBeTruthy();

    await page.goto('/auth?mode=signup');
    await page.getByPlaceholder('Your name').filter({ visible: true }).fill('Codex Claim Tester');
    await page.getByPlaceholder('Email address').filter({ visible: true }).fill(`codex.customer.claim.${stamp}@example.com`);
    await page.getByPlaceholder('Password').filter({ visible: true }).fill(`Runtime-${stamp}-Pass!`);
    await page.getByRole('button', { name: 'Create customer account', exact: true }).filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/customer$/);
    await page.goto('/deals');
    await expect(page.getByText(activeDeal.title, { exact: true }).filter({ visible: true })).toBeVisible();
    await page.getByRole('button', { name: 'Claim Deal', exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole('dialog', { name: 'Claim Deal' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm Claim' }).click();
    await expect(page.getByText('Show this code to the business')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: 'Deal Claimed', exact: true }).filter({ visible: true })).toBeVisible();
    const token = await page.evaluate(() => {
      const entry = Object.keys(localStorage).find((key) => key.startsWith('sb-') && key.endsWith('-auth-token'));
      if (!entry) return '';
      return JSON.parse(localStorage.getItem(entry) ?? '{}').access_token as string;
    });
    const claimHeaders = { apikey: anonKey, Authorization: `Bearer ${token}` };
    const claimsResponse = await request.get(`${supabaseUrl}/rest/v1/deal_claims?deal_id=eq.${activeDeal.id}&select=id,claim_code,status`, { headers: claimHeaders });
    expect(claimsResponse.ok()).toBe(true);
    const claims = await claimsResponse.json() as Array<{ id: string; claim_code: string; status: string }>;
    expect(claims).toHaveLength(1);

    const duplicateResponse = await request.post(`${supabaseUrl}/rest/v1/rpc/claim_deal`, { headers: { ...claimHeaders, Prefer: 'return=representation' }, data: { target_deal_id: activeDeal.id } });
    expect(duplicateResponse.ok()).toBe(true);
    const duplicate = await duplicateResponse.json() as { id: string; claim_code: string };
    expect(duplicate.id).toBe(claims[0].id);
    expect(duplicate.claim_code).toBe(claims[0].claim_code);

    const postResponse = await request.get(`${supabaseUrl}/rest/v1/posts?select=id,business_id,businesses(username)&status=eq.published&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    expect(postResponse.ok()).toBe(true);
    const [post] = await postResponse.json() as Array<{ id: string; businesses: { username: string } }>;
    await page.goto(`/business/${post.businesses.username}`);
    const follow = page.getByRole('button', { name: 'Follow', exact: true }).filter({ visible: true });
    await follow.click();
    await expect(page.getByRole('button', { name: 'Following', exact: true }).filter({ visible: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Following', exact: true }).filter({ visible: true })).toBeVisible();

    await page.goto(`/post/${post.id}`);
    const like = page.getByRole('button', { name: 'Like' }).filter({ visible: true });
    await like.click();
    await expect(like.locator('svg')).toHaveClass(/fill-error-500/);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Like' }).filter({ visible: true }).locator('svg')).toHaveClass(/fill-error-500/);
    await page.getByRole('button', { name: 'Comment' }).filter({ visible: true }).click();
    await page.getByPlaceholder('Add a comment...').fill(`Runtime comment ${stamp}`);
    await page.getByRole('button', { name: 'Send comment' }).click();
    await expect(page.getByText(`Runtime comment ${stamp}`)).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Comment' }).filter({ visible: true }).click();
    await expect(page.getByText(`Runtime comment ${stamp}`)).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Share' }).filter({ visible: true }).click();
    await expect(page.locator('input[readonly]')).toHaveValue(`https://founder-env-sigma.vercel.app/post/${post.id}`);
  });
});
