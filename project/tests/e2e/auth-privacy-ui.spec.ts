import { expect, test } from '@playwright/test';

test('business owner authentication is email and password only', async ({ page }) => {
  await page.goto('/auth/business');
  await expect(page.getByRole('heading', { name: 'Business owner sign in' })).toBeVisible();
  await expect(page.getByPlaceholder('Business email address').filter({ visible: true })).toBeVisible();
  await expect(page.getByPlaceholder('Password').filter({ visible: true })).toBeVisible();
  await expect(page.getByText('Continue as Business Owner with Google')).toHaveCount(0);
  await expect(page.locator('#auth-google-business')).toHaveCount(0);

  await page.getByRole('button', { name: 'New here? List your business' }).filter({ visible: true }).click();
  await expect(page.getByPlaceholder('Your name').filter({ visible: true })).toBeVisible();
  await expect(page.getByPlaceholder('Business email address').filter({ visible: true })).toBeVisible();
  await expect(page.getByPlaceholder('Password').filter({ visible: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Business Account' }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('Continue as Business Owner with Google')).toHaveCount(0);
  await page.goto('/choose-role');
  await expect(page.locator('#choose-role-owner')).toHaveCount(0);
});

test('customer Google entry still starts the Supabase Google OAuth flow', async ({ page }) => {
  let requestedGoogle=false;
  await page.route('**/auth/v1/authorize**', async (route) => {
    requestedGoogle=route.request().url().includes('provider=google');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'http://127.0.0.1:4174/oauth-probe' }) });
  });
  await page.goto('/auth');
  const google=page.getByRole('button', { name: 'Continue with Google' });
  await expect(google).toBeVisible();
  await google.click();
  await expect.poll(()=>requestedGoogle).toBe(true);
});
