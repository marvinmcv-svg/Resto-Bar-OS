import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Seed demo data if needed — call prisma:seed:all via API or direct DB
  // For now, assume seed runs separately

  await browser.close();
}

export default globalSetup;
