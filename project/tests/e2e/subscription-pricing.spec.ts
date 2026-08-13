import { expect, test } from '@playwright/test';

test.describe('deferred business subscription pricing', () => {
  for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`${viewport.name} shows setup-only checkout terms without overflow`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/owner/payment-pending');
      await expect(page.getByRole('heading', { name: 'Start your business subscription' })).toBeVisible();
      const pricing = page.getByRole('complementary').filter({ visible: true });
      await expect(pricing.getByText('₹299', { exact: true })).toBeVisible();
      await expect(pricing.getByText('₹199/month', { exact: true })).toBeVisible();
      await expect(pricing.getByText(/exactly one calendar month after authorisation/i)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Pay ₹299 & Enable AutoPay' })).toBeVisible();
      await expect(page.locator('body')).not.toContainText('₹498');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    });
  }
});
