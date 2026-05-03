import { PrismaClient, Role, TableStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Import and re-export individual seeders
export { seedRealistic } from './seed-realistic';
export { seedMenu } from './seed-menu';
export { seedPart3 } from './seed-part3';

const prisma = new PrismaClient();

async function main() {
  const existingTenant = await prisma.tenant.findUnique({ where: { slug: 'demo' } });
  if (existingTenant) {
    console.log('Seed already exists, skipping...');
    return;
  }

  const tenant = await prisma.tenant.create({
    data: { name: 'Demo Restaurant', slug: 'demo', plan: 'starter' },
  });

  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const user = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.OWNER,
      tenantId: tenant.id,
    },
  });

  // Create 12 sample tables
  const tables = [];
  for (let i = 1; i <= 12; i++) {
    tables.push(
      await prisma.table.create({
        data: {
          tenantId: tenant.id,
          number: i,
          name: `Table ${i}`,
          capacity: i <= 6 ? 4 : 6,
          minCapacity: 1,
          section: i <= 6 ? 'main' : 'patio',
          status: TableStatus.AVAILABLE,
          positionX: (i - 1) % 4,
          positionY: Math.floor((i - 1) / 4),
        },
      }),
    );
  }

  console.log(`Seeded tenant: ${tenant.name}`);
  console.log(`Seeded user: ${user.email} / Admin123!`);
  console.log(`Seeded ${tables.length} tables`);
}

// Run all three seeders in sequence
export async function seedAll() {
  console.log('🌱 Running full seed: groups → menu → operational data...\n');

  const { seedRealistic } = await import('./seed-realistic');
  const { seedMenu } = await import('./seed-menu');
  const { seedPart3 } = await import('./seed-part3');

  await seedRealistic();
  console.log(''); // blank line between phases
  await seedMenu();
  console.log(''); // blank line between phases
  await seedPart3();

  console.log('\n✅ Full seed complete');
}

// Auto-run: --all flag runs seedAll(), otherwise runs original main()
const runAll = process.argv.includes('--all');

if (runAll) {
  seedAll()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
} else {
  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}