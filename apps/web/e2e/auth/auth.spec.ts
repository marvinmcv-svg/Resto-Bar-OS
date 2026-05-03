import { test, expect } from '@playwright/test';
import { login } from './login';

test.describe('Auth', () => {
  test('login with demo credentials', async ({ page }) => {
    await login(page, 'owner@luma.com', 'LumaOwner123!');
    await expect(page).toHaveURL(/\/(dashboard|overview)/);
  });

  test('login with wrong password fails', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'owner@luma.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid')).toBeVisible();
  });
});
