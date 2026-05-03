import { test, expect } from '@playwright/test';
import { login } from '../auth/login';

test.describe('Guests Module', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('guest list loads', async ({ page }) => {
    await login(page, 'owner@luma.com', 'LumaOwner123!');
    await page.goto('/guests');
    await expect(page.locator('h1, h2')).toContainText(/guest/i);
  });

  test('create a new guest', async ({ page }) => {
    await login(page, 'owner@luma.com', 'LumaOwner123!');
    await page.goto('/guests/new');
    await page.fill('input[name="firstName"]', 'Jane');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', 'jane.doe@example.com');
    await page.fill('input[name="phone"]', '+1 555-0100');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/guests\/.+/);
  });
});
