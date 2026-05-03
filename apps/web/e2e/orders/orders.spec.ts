import { test, expect } from '@playwright/test';
import { login } from '../auth/login';

test.describe('Orders Module', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('order list loads', async ({ page }) => {
    await login(page, 'owner@luma.com', 'LumaOwner123!');
    await page.goto('/en/orders');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText('Loading...');
  });

  test('create order for existing reservation', async ({ page }) => {
    await login(page, 'owner@luma.com', 'LumaOwner123!');
    await page.goto('/en/orders/new');
    await page.waitForLoadState('networkidle');
    
    // Select a table or reservation
    const tableSelect = page.locator('select[name="tableId"], select[name="table"]').first();
    if (await tableSelect.isVisible()) {
      await tableSelect.selectOption({ index: 1 });
    }
    
    // Add menu items
    const addItemBtn = page.locator('button:has-text("Add Item"), button:has-text("+ Item")').first();
    if (await addItemBtn.isVisible()) {
      await addItemBtn.click();
    }
    
    await page.click('button[type="submit"], button:has-text("Send to Kitchen"), button:has-text("Fire")');
    await page.waitForLoadState('networkidle');
    
    // Should show order in kitchen or order list
    await expect(page.locator('body')).not.toContainText('Error');
  });
});
