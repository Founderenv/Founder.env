import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const envFile = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const localEnv = { ...process.env, ...Object.fromEntries(envFile.split(/\r?\n/).filter(Boolean).map((line) => {
  const separator = line.indexOf('=');
  return [line.slice(0, separator), line.slice(separator + 1)];
})) };

const founderErrors = (messages: string[]) => messages.filter((message) =>
  !message.includes('favicon') && !message.includes('extension') && !message.includes('ERR_BLOCKED_BY_CLIENT')
);

test.describe('production public launch gate', () => {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`${viewport.name} landing, auth, profile and shared post`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('pageerror', (error) => errors.push(error.message));

      await page.goto('/');
      await expect(page).toHaveTitle(/Founder\.env/);
      await expect(page.locator('body')).not.toContainText('Application error');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

      await page.goto('/auth');
      await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

      await page.goto('/explore');
      const businessResponse = await page.request.get(`${localEnv.VITE_SUPABASE_URL}/rest/v1/business_public?select=username&limit=1`, {
        headers: { apikey: localEnv.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${localEnv.VITE_SUPABASE_ANON_KEY}` },
      });
      expect(businessResponse.ok()).toBe(true);
      const businesses = await businessResponse.json() as Array<{ username: string }>;
      const businessHref = `/business/${businesses[0].username}`;
      expect(businessHref).toBeTruthy();
      await page.goto(businessHref!);
      await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

      const postResponse = await page.request.get(`${localEnv.VITE_SUPABASE_URL}/rest/v1/posts?select=id&status=eq.published&limit=1`, {
        headers: { apikey: localEnv.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${localEnv.VITE_SUPABASE_ANON_KEY}` },
      });
      expect(postResponse.ok()).toBe(true);
      const posts = await postResponse.json() as Array<{ id: string }>;
      expect(posts.length).toBeGreaterThan(0);
      await page.goto(`/post/${posts[0].id}`);
      await expect(page.getByRole('article')).toBeVisible();
      const shareButton = page.getByRole('button', { name: 'Share' });
      await expect(shareButton).toBeVisible();
      await shareButton.click();
      await expect(page.locator('input[readonly]')).toHaveValue(new URL(`/post/${posts[0].id}`, page.url()).href);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      expect(founderErrors(errors)).toEqual([]);
    });
  }
});
