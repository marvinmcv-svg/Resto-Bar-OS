import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting realistic seed...');

  // ============================================================
  // RESTAURANT GROUP
  // ============================================================
  const groupId = randomUUID();
  const now = new Date().toISOString();

  await prisma.$executeRaw`
    INSERT INTO "RestaurantGroup" (id, name, slug, plan, "createdAt", "updatedAt")
    VALUES (${groupId}, 'The Ember Collection', 'ember-collection', 'professional', ${now}::timestamp, ${now}::timestamp)
  `;
  console.log('✓ Restaurant Group: The Ember Collection');

  // ============================================================
  // TENANTS
  // ============================================================
  const tenants = [
    { name: 'Luma', slug: 'luma', plan: 'professional', focus: 'Contemporary American, dry-aged steaks', priceRange: '$$$$' },
    { name: 'Sakura', slug: 'sakura', plan: 'professional', focus: 'Omakase, sushi, sake', priceRange: '$$$$$' },
    { name: 'The Garden', slug: 'the-garden', plan: 'starter', focus: 'Pasta, seafood, seasonal', priceRange: '$$$' },
  ];

  const tenantIds: Record<string, string> = {};

  for (const tenant of tenants) {
    const tenantId = randomUUID();
    tenantIds[tenant.slug] = tenantId;
    await prisma.$executeRaw`
      INSERT INTO "Tenant" (id, name, slug, plan, "groupId", "createdAt", "updatedAt")
      VALUES (
        ${tenantId},
        ${tenant.name},
        ${tenant.slug},
        ${tenant.plan},
        ${groupId},
        ${now}::timestamp,
        ${now}::timestamp
      )
    `;
    console.log(`✓ Tenant: ${tenant.name} (${tenant.priceRange}) — ${tenant.focus}`);
  }

  // ============================================================
  // USERS (all 3 restaurants × 6 roles)
  // ============================================================
  type Role = 'OWNER' | 'MANAGER' | 'HEAD_CHEF' | 'SERVER' | 'HOST' | 'BARTENDER';

  const userDefinitions = [
    // Luma
    { tenantSlug: 'luma', email: 'owner@luma.com', firstName: 'Marcus', lastName: 'Chen', role: 'OWNER' as Role, passwordSuffix: 'LumaOwner123!' },
    { tenantSlug: 'luma', email: 'manager@luma.com', firstName: 'Sofia', lastName: 'Reyes', role: 'MANAGER' as Role, passwordSuffix: 'LumaManager123!' },
    { tenantSlug: 'luma', email: 'headchef@luma.com', firstName: 'Daniel', lastName: 'Keller', role: 'HEAD_CHEF' as Role, passwordSuffix: 'LumaChef123!' },
    { tenantSlug: 'luma', email: 'server1@luma.com', firstName: 'Amara', lastName: 'Johnson', role: 'SERVER' as Role, passwordSuffix: 'LumaServer123!' },
    { tenantSlug: 'luma', email: 'server2@luma.com', firstName: 'Ryan', lastName: 'Patel', role: 'SERVER' as Role, passwordSuffix: 'LumaServer123!' },
    { tenantSlug: 'luma', email: 'host@luma.com', firstName: 'Elena', lastName: 'Varga', role: 'HOST' as Role, passwordSuffix: 'LumaHost123!' },
    { tenantSlug: 'luma', email: 'bartender@luma.com', firstName: 'Lucas', lastName: 'Moretti', role: 'BARTENDER' as Role, passwordSuffix: 'LumaBartender123!' },

    // Sakura
    { tenantSlug: 'sakura', email: 'owner@sakura.com', firstName: 'Kenji', lastName: 'Tanaka', role: 'OWNER' as Role, passwordSuffix: 'SakuraOwner123!' },
    { tenantSlug: 'sakura', email: 'manager@sakura.com', firstName: 'Yuki', lastName: 'Yamamoto', role: 'MANAGER' as Role, passwordSuffix: 'SakuraManager123!' },
    { tenantSlug: 'sakura', email: 'headchef@sakura.com', firstName: 'Hiroshi', lastName: 'Nakamura', role: 'HEAD_CHEF' as Role, passwordSuffix: 'SakuraChef123!' },
    { tenantSlug: 'sakura', email: 'server1@sakura.com', firstName: 'Sora', lastName: 'Kimura', role: 'SERVER' as Role, passwordSuffix: 'SakuraServer123!' },
    { tenantSlug: 'sakura', email: 'server2@sakura.com', firstName: 'Haruto', lastName: 'Watanabe', role: 'SERVER' as Role, passwordSuffix: 'SakuraServer123!' },
    { tenantSlug: 'sakura', email: 'host@sakura.com', firstName: 'Mei', lastName: 'Suzuki', role: 'HOST' as Role, passwordSuffix: 'SakuraHost123!' },
    { tenantSlug: 'sakura', email: 'bartender@sakura.com', firstName: 'Takeshi', lastName: 'Ito', role: 'BARTENDER' as Role, passwordSuffix: 'SakuraBartender123!' },

    // The Garden
    { tenantSlug: 'the-garden', email: 'owner@thegarden.com', firstName: 'Giulia', lastName: 'Rossi', role: 'OWNER' as Role, passwordSuffix: 'GardenOwner123!' },
    { tenantSlug: 'the-garden', email: 'manager@thegarden.com', firstName: 'Marco', lastName: 'Ferrara', role: 'MANAGER' as Role, passwordSuffix: 'GardenManager123!' },
    { tenantSlug: 'the-garden', email: 'headchef@thegarden.com', firstName: 'Alessandro', lastName: 'Romano', role: 'HEAD_CHEF' as Role, passwordSuffix: 'GardenChef123!' },
    { tenantSlug: 'the-garden', email: 'server1@thegarden.com', firstName: 'Chiara', lastName: 'Bianchi', role: 'SERVER' as Role, passwordSuffix: 'GardenServer123!' },
    { tenantSlug: 'the-garden', email: 'server2@thegarden.com', firstName: 'Francesca', lastName: 'Marino', role: 'SERVER' as Role, passwordSuffix: 'GardenServer123!' },
    { tenantSlug: 'the-garden', email: 'host@thegarden.com', firstName: 'Lorenzo', lastName: 'Costa', role: 'HOST' as Role, passwordSuffix: 'GardenHost123!' },
    { tenantSlug: 'the-garden', email: 'bartender@thegarden.com', firstName: 'Valentina', lastName: 'Greco', role: 'BARTENDER' as Role, passwordSuffix: 'GardenBartender123!' },
  ];

  const userIds: Record<string, string> = {};
  let userCount = 0;

  for (const def of userDefinitions) {
    const userId = randomUUID();
    userIds[def.email] = userId;
    const passwordHash = await bcrypt.hash(def.passwordSuffix, 12);
    const tenantId = tenantIds[def.tenantSlug];

    await prisma.$executeRaw`
      INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", role, "tenantId", "isActive", "createdAt", "updatedAt")
      VALUES (
        ${userId},
        ${def.email},
        ${passwordHash},
        ${def.firstName},
        ${def.lastName},
        ${def.role}::"Role",
        ${tenantId},
        true,
        ${now}::timestamp,
        ${now}::timestamp
      )
    `;
    userCount++;
  }
  console.log(`✓ Created ${userCount} users (6 roles × 3 restaurants)`);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n--- Seed Summary ---');
  console.log('Restaurant Group: 1 (The Ember Collection)');
  console.log('Tenants: 3 (Luma, Sakura, The Garden)');
  console.log('Users: 18 (6 roles × 3 restaurants)');
  console.log('Password pattern: <RestaurantName><Role><Number>!');
  console.log('  Example: LumaOwner123!, SakuraManager123!, GardenChef123!');
  console.log('\nAll records linked via UUID foreign keys.');
}

export async function seedRealistic() {
  await main();
}

seedRealistic()
  .catch(console.error)
  .finally(() => prisma.$disconnect());