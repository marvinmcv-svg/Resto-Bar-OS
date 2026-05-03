import { chromium } from '@playwright/test';

async function globalTeardown() {
  // Close any open browsers
}

export default globalTeardown;
