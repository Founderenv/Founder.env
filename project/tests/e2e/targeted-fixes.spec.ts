import { expect, test } from '@playwright/test';

test.describe('targeted Home, profile and deal flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('founder-env-role', 'customer'));
  });

  test('discovery search and categories work for customers', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Discover Founder.env' })).toBeVisible();
    const search = page.getByLabel('Search Founder.env').filter({ visible: true });
    await expect(search).toBeVisible();
    await page.getByRole('button', { name: 'Fitness', exact: true }).filter({ visible: true }).click();
    await expect(page.getByText('FitZone Gym').filter({ visible: true })).toBeVisible();
    await page.getByRole('button', { name: 'All', exact: true }).filter({ visible: true }).click();
    await search.fill('Cafe Aroma');
    await expect(page.getByText('Cafe Aroma', { exact: true }).filter({ visible: true })).toBeVisible();
    await page.locator('a[href="/business/cafearoma"]').filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/business\/cafearoma$/);
  });

  test('owner Home remains discovery and deal saves into the profile', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('founder-env-role', 'owner'));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Discover Founder.env' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Profile' }).first()).toHaveAttribute('href', '/owner/profile');

    await page.goto('/owner/create');
    await page.getByRole('button', { name: 'Deal', exact: true }).filter({ visible: true }).click();
    const stamp = Date.now();
    await page.getByLabel('Deal title').fill(`Runtime Deal ${stamp}`);
    await page.getByLabel('Description').fill('Runtime persistence verification deal.');
    await page.getByLabel('Original price (₹)').fill('500');
    await page.getByLabel('Offer price (₹)').fill('350');
    await page.getByRole('button', { name: 'Save Deal' }).click();
    await expect(page).toHaveURL(/\/business\/cafearoma\/deals$/);
    await expect(page.getByText('Deal saved and published.')).toBeVisible();
    await expect(page.getByText(`Runtime Deal ${stamp}`).filter({ visible: true })).toBeVisible();
  });

  test('profile modes, tabs and customer interactions are functional', async ({ page }) => {
    await page.goto('/business/cafearoma');
    await expect(page.getByRole('button', { name: 'Follow', exact: true }).filter({ visible: true })).toBeVisible();
    await page.getByRole('button', { name: 'Follow', exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole('button', { name: 'Following', exact: true }).filter({ visible: true })).toBeVisible();

    for (const tab of ['Page', 'Deals', 'Posts', 'Videos', 'Reviews', 'About']) {
      await page.getByRole('button', { name: tab, exact: true }).filter({ visible: true }).click();
    }
    await expect(page.getByText('Business Information')).toBeVisible();
    await expect(page.getByText('Opening Hours')).toBeVisible();

    await page.getByRole('button', { name: 'Posts', exact: true }).filter({ visible: true }).click();
    const like = page.getByRole('button', { name: 'Like' }).filter({ visible: true }).first();
    await like.click();
    await page.getByRole('button', { name: 'Comment' }).filter({ visible: true }).first().click();
    await expect(page.getByRole('dialog', { name: 'Comments' })).toBeVisible();
    await page.getByPlaceholder('Add a comment...').fill('Runtime comment');
    await page.getByRole('button', { name: 'Send comment' }).click();
    await expect(page.getByText('Runtime comment')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.getByRole('button', { name: 'Deals', exact: true }).filter({ visible: true }).click();
    const claimButton = page.getByRole('button', { name: 'Claim Deal', exact: true }).filter({ visible: true }).first();
    await claimButton.click();
    await expect(page.getByRole('dialog', { name: 'Claim Deal' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm Claim' }).click();
    await expect(page.getByText('Show this code to the business')).toBeVisible();
  });

  test('profile layout does not overflow at mobile size', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/business/cafearoma');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const cover = await page.locator('img[alt="Cafe Aroma"]').filter({ visible: true }).first().boundingBox();
    expect(cover).not.toBeNull();
    await page.getByRole('button', { name: 'About', exact: true }).filter({ visible: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});
