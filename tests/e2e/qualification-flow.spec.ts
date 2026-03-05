import { expect, test } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

test.describe('Qualification Flow', () => {
  test('starts a SaaS session from category page', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await expect(page).toHaveURL(/\/session\/new/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /Select (Category|Industry)/i })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: /SaaS/i }).click();
    await page.getByRole('button', { name: /Start Session/i }).click();

    await expect(page).toHaveURL(/\/session\/.+/);
    await expect(page.getByTestId('live-call-title')).toBeVisible();
  });

  test('sends a text message in session type mode', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await expect(page).toHaveURL(/\/session\/new/, { timeout: 15_000 });
    await page.getByRole('button', { name: /SaaS/i }).click();
    await page.getByRole('button', { name: /Start Session/i }).click();
    await expect(page).toHaveURL(/\/session\/.+/);

    const input = page.getByPlaceholder(/Type your response/i);
    await expect(input).toBeVisible();

    await input.fill('Yes, I consent. We need better pipeline visibility.');
    await input.press('Enter');

    await expect(page.getByTestId('live-call-title')).toBeVisible();
    await expect(page.getByText('Recent Events')).toBeVisible();
  });

  test('loads analytics dashboard page', async ({ page }) => {
    await page.goto(`${BASE_URL}/analytics`);

    await expect(page.getByText('Analytics Dashboard')).toBeVisible();
    await expect(page.getByText('Conversion Funnel')).toBeVisible();
  });
});
