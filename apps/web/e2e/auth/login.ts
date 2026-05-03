import { test as base, Page } from '@playwright/test';

/**
 * Shared login helper — navigates to /login and performs the credential flow.
 * Adapt selectors here if the login page markup changes.
 */
export const login = async (page: Page, email: string, password: string) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|overview)/);
  await page.waitForLoadState('networkidle');
};

// Re-export base test for extension
export { base as test };
