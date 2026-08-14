import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('customer profile photo and free referral enrollment fit 390×844', async ({ page }) => {
  await page.goto('/account');
  await expect(page.getByRole('button', { name: 'Change profile photo' })).toBeVisible();
  await page.getByRole('button', { name: 'Change profile photo' }).click();
  await expect(page.getByRole('dialog', { name: 'Change profile photo' })).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('link', { name: 'Refer & Earn' }).filter({ visible: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto('/referrals');
  await expect(page.getByText('No enrollment fee. No ₹19 payment. Referral codes are free.').filter({ visible: true })).toBeVisible();
  await page.getByLabel('UPI ID / VPA *').filter({ visible: true }).fill('mobiletest@upi');
  await page.getByLabel('Payee name (optional)').filter({ visible: true }).fill('Mobile Test');
  await page.getByRole('button', { name: 'Save & Continue' }).filter({ visible: true }).click();
  await expect(page.getByText('FE-DEMO-X7K2Q9').filter({ visible: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Withdraw ₹150' }).filter({ visible: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
