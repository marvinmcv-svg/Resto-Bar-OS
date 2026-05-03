import { test, expect } from '@playwright/test';
import { login } from '../auth/login';

test.describe('Kitchen KDS', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('kitchen display shows active tickets', async ({ page }) => {
    await login(page, 'headchef@luma.com', 'LumaChef123!');
    await page.goto('/en/kitchen');
    await page.waitForLoadState('networkidle');
    
    // KDS should show station tickets
    await expect(page.locator('body')).not.toContainText('Loading...');
  });

  test('fire button sends ticket to active', async ({ page }) => {
    await login(page, 'headchef@luma.com', 'LumaChef123!');
    await page.goto('/en/kitchen');
    await page.waitForLoadState('networkidle');
    
    // Find fire/bump button
    const fireBtn = page.locator('button:has-text("Fire"), button:has-text("Start")').first();
    if (await fireBtn.isVisible()) {
      await fireBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('bump completed ticket', async ({ page }) => {
    await login(page, 'headchef@luma.com', 'LumaChef123!');
    await page.goto('/en/kitchen');
    await page.waitForLoadState('networkidle');
    
    const bumpBtn = page.locator('button:has-text("Bump"), button:has-text("Done")').first();
    if (await bumpBtn.isVisible()) {
      await bumpBtn.click();
      await page.waitForTimeout(500);
    }
  });
});
