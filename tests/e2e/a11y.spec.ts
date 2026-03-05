import { expect, test } from '@playwright/test';
import { checkA11y, injectAxe } from 'axe-playwright';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

test.describe('Accessibility', () => {
  test('landing page meets WCAG AA', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await expect(page).toHaveURL(/\/session\/new/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /Select (Category|Industry)/i })).toBeVisible({
      timeout: 15_000,
    });

    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      axeOptions: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21aa'],
        },
      },
    });
  });

  test('session page meets WCAG AA', async ({ page }) => {
    const res = await page.request.post(`${BASE_URL}/api/sessions`, {
      data: { industry: 'saas' },
    });

    const body = await res.json();
    const sessionId = body.id ?? body.sessionId;
    expect(sessionId).toBeTruthy();

    await page.goto(`${BASE_URL}/session/${sessionId}`);
    await expect(page.getByTestId('live-call-title')).toBeVisible();

    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      axeOptions: {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      },
    });
  });
});
