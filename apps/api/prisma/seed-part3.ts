import { PrismaClient, VipTier, ReservationStatus, OrderStatus, NotificationType, ItemStatus, Station } from '@prisma/client';

const prisma = new PrismaClient();

// Realistic guest data for Luma restaurant (fine dining)
const guestsData: Array<{
  firstName: string; lastName: string; email: string | null; phone: string;
  vipTier: VipTier; visitCount: number; lifetimeSpend: number; allergies: string[];
  lapsedDays?: number;
}> = [
  // VIP Platinum + Gold + Silver (8 guests)
  { firstName: 'Victor', lastName: 'Chen', email: 'vchen@private.com', phone: '+1 212-555-0141', vipTier: 'PLATINUM', visitCount: 48, lifetimeSpend: 14200, allergies: [] },
  { firstName: 'Isabella', lastName: 'Rossi', email: 'irossi@gmail.com', phone: '+1 415-555-0177', vipTier: 'GOLD', visitCount: 32, lifetimeSpend: 9800, allergies: [] },
  { firstName: 'Ahmed', lastName: 'Al-Rashid', email: 'ahmed.alrashid@outlook.com', phone: '+1 310-555-0198', vipTier: 'SILVER', visitCount: 18, lifetimeSpend: 5400, allergies: ['tree nuts'] },
  { firstName: 'Sophie', lastName: 'Müller', email: 'sophie.muller@gmail.com', phone: '+1 212-555-0134', vipTier: 'BRONZE', visitCount: 12, lifetimeSpend: 3600, allergies: [] },
  { firstName: 'Jonathan', lastName: 'Ellis', email: 'jellis@finance.com', phone: '+1 617-555-0156', vipTier: 'PLATINUM', visitCount: 45, lifetimeSpend: 13500, allergies: ['shellfish'] },
  { firstName: 'Priya', lastName: 'Sharma', email: 'priya.s@techventures.in', phone: '+1 408-555-0189', vipTier: 'GOLD', visitCount: 28, lifetimeSpend: 8400, allergies: ['gluten'] },
  { firstName: 'Marcus', lastName: 'Thompson', email: 'marcus.t@lawfirm.com', phone: '+1 312-555-0167', vipTier: 'SILVER', visitCount: 22, lifetimeSpend: 6600, allergies: [] },
  { firstName: 'Elena', lastName: 'Volkov', email: 'elena.volkov@artemis.ru', phone: '+1 646-555-0123', vipTier: 'PLATINUM', visitCount: 50, lifetimeSpend: 15000, allergies: ['dairy'] },

  // Regular returning (12 guests)
  { firstName: 'James', lastName: 'O\'Brien', email: 'james.obrien@gmail.com', phone: '+1 718-555-0145', vipTier: 'NONE', visitCount: 4, lifetimeSpend: 1200, allergies: [] },
  { firstName: 'Yuki', lastName: 'Tanaka', email: 'ytanaka@design.jp', phone: '+1 213-555-0178', vipTier: 'NONE', visitCount: 6, lifetimeSpend: 2100, allergies: [] },
  { firstName: 'Rachel', lastName: 'Kim', email: 'rachel.kim@ucsd.edu', phone: '+1 858-555-0134', vipTier: 'NONE', visitCount: 3, lifetimeSpend: 900, allergies: ['shellfish'] },
  { firstName: 'Thomas', lastName: 'Weber', email: 'thomas.weber@web.de', phone: '+1 310-555-0156', vipTier: 'NONE', visitCount: 4, lifetimeSpend: 1400, allergies: [] },
  { firstName: 'Maria', lastName: 'Santos', email: 'maria.santos@law.br', phone: '+1 305-555-0189', vipTier: 'NONE', visitCount: 3, lifetimeSpend: 1100, allergies: [] },
  { firstName: 'Daniel', lastName: 'Cohen', email: 'danielc@startup.io', phone: '+1 512-555-0167', vipTier: 'NONE', visitCount: 2, lifetimeSpend: 650, allergies: ['tree nuts'] },
  { firstName: 'Anna', lastName: 'Petrov', email: 'anna.petrov@gmail.ru', phone: '+1 212-555-0198', vipTier: 'NONE', visitCount: 3, lifetimeSpend: 1050, allergies: [] },
  { firstName: 'Kevin', lastName: 'Nguyen', email: 'kevin.ng@tech.com', phone: '+1 408-555-0112', vipTier: 'NONE', visitCount: 4, lifetimeSpend: 1350, allergies: ['gluten'] },
  { firstName: 'Laura', lastName: 'Fernandez', email: 'lfernandez@medicine.es', phone: '+1 786-555-0145', vipTier: 'NONE', visitCount: 2, lifetimeSpend: 720, allergies: [] },
  { firstName: 'Robert', lastName: 'Kowalski', email: 'rkowalski@eu.pl', phone: '+1 773-555-0178', vipTier: 'NONE', visitCount: 3, lifetimeSpend: 980, allergies: ['dairy'] },
  { firstName: 'Sarah', lastName: 'Mitchell', email: 'sarah.m@consulting.uk', phone: '+1 617-555-0134', vipTier: 'NONE', visitCount: 4, lifetimeSpend: 1320, allergies: [] },
  { firstName: 'Hiroshi', lastName: 'Yamamoto', email: 'h.yamamoto@enterprise.jp', phone: '+1 310-555-0156', vipTier: 'NONE', visitCount: 2, lifetimeSpend: 680, allergies: [] },
  { firstName: 'Fatima', lastName: 'Hassan', email: 'fatima.hassan@email.ae', phone: '+1 571-555-0189', vipTier: 'NONE', visitCount: 3, lifetimeSpend: 1150, allergies: [] },

  // First timers (15 guests)
  { firstName: 'Marcus', lastName: 'Webb', email: null, phone: '+1 404-555-0101', vipTier: 'NONE', visitCount: 0, lifetimeSpend: 0, allergies: [] },
  { firstName: 'Jennifer', lastName: 'Liu', email: 'jliu@gmail.com', phone: '+1 626-555-0102', vipTier: 'NONE', visitCount: 0, lifetimeSpend: 0, allergies: [] },
  { firstName: 'Carlos', lastName: 'Mendez', email: 'cmendez@outlook.com', phone: '+1 713-555-0103', vipTier: 'NONE', visitCount: 0, lifetimeSpend: 0, allergies: ['shellfish'] },
  { firstName: 'Emily', lastName: 'Watson', email: 'emily.w@email.uk', phone: '+1 503-555-0104', vipTier: 'NONE', visitCount: 0, lifetimeSpend: 0, allergies: [] },
  { firstName: 'Omar', lastName: 'Khalidi', email: 'okhalidi@email.sa', phone: '+1 240-555-0105', vipTier: 'NONE', visitCount: 0, lifetimeSpend: 0, allergies: ['gluten'] },
  { firstName: 'Nina', lastName: 'Ivanova', email: 'nina.i@mail.ru', phone: '+1 718-555-0106', vipTier: 'NONE', visitCount: 0, lifetimeSpend: 0, allergies: [] },
  { firstName: 'Brian', lastName: 'Murphy', email: 'bmurphy@company.com', phone: '+1 508-555-0107', vipTier: 'NONE', visitCount: 0, lifetimeSpend: 0, allergies: [] },
  { firstName: 'Aisha', lastName: 'Patel', email: 'aisha.p@email.in', phone: '+1 732-555-0108', vipTier: 'NONE', visitCount: 0, lifetimeSpend: 0, allergies: ['tree nuts'] },
  { firstName: 'Liam', lastName: 'Johnson', email: 'liam.j@proton.me', phone: '+1 612-555-0109', vipTier: 'NONE', visitCount: 0, lifetimeSpend: 0, allergies: [] },
  { firstName: 'Mia', lastName: 'Zhang', email: 'mia.zhang@design.cn', phone: '+1 415-555-0110', vipTier: 'NONE', visitCount: 0, lifetimeSpend: 0, allergies: ['gluten'] },
  { firstName: 'David', lastName: 'Santos', email: 'd.santos@email.br', phone: '+1 305-555-0111', vipTier: 'NONE', visitCount: 0, lifetimeSpend: 0, allergies: [] },
  { firstName: 'Emma', lastName: 'Brown', email: 'emma.b@email.au', phone: '+1 702-555-0112', vipTier: 'NONE', visitCount: 0, lifetimeSpend: 0, allergies: [] },
  { firstName: 'Alex', lastName: 'Dubois', email: 'alex.d@email.fr', phone: '+1 347-555-0113', vipTier: 'NONE', visitCount: 0, lifetimeSpend: 0, allergies: [] },
  { firstName: 'Jordan', lastName: 'Lee', email: 'jordan.lee@email.sg', phone: '+1 201-555-0114', vipTier: 'NONE', visitCount: 0, lifetimeSpend: 0, allergies: [] },
  { firstName: 'Samira', lastName: 'Ali', email: 'samira.ali@email.eg', phone: '+1 469-555-0115', vipTier: 'NONE', visitCount: 0, lifetimeSpend: 0, allergies: [] },

  // Lapsed (5 guests - no visit in 60-120 days)
  { firstName: 'Michael', lastName: 'Foster', email: 'mfoster@email.com', phone: '+1 602-555-0201', vipTier: 'NONE', visitCount: 5, lifetimeSpend: 1600, allergies: [], lapsedDays: 87 },
  { firstName: 'Linda', lastName: 'Chang', email: 'lchang@email.com', phone: '+1 425-555-0202', vipTier: 'NONE', visitCount: 8, lifetimeSpend: 2400, allergies: [], lapsedDays: 103 },
  { firstName: 'Peter', lastName: 'Anderson', email: 'p.anderson@email.com', phone: '+1 614-555-0203', vipTier: 'NONE', visitCount: 4, lifetimeSpend: 1300, allergies: [], lapsedDays: 65 },
  { firstName: 'Claudia', lastName: 'Morales', email: 'cmorales@email.com', phone: '+1 520-555-0204', vipTier: 'NONE', visitCount: 6, lifetimeSpend: 1900, allergies: ['shellfish'], lapsedDays: 120 },
  { firstName: 'Derek', lastName: 'Clark', email: 'derek.c@email.com', phone: '+1 901-555-0205', vipTier: 'NONE', visitCount: 3, lifetimeSpend: 950, allergies: [], lapsedDays: 78 },
];

const occasions = ['Anniversary', 'Birthday', 'Business Dinner', 'Engagement', 'Promotion', null, null, null, null];
const timeSlots = ['11:30', '12:00', '12:30', '13:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];
const specialNotes = [
  'Guest prefers window seating', 'Quiet table requested', 'Celebrating engagement',
  'Gluten-free menu required', 'Vegetarian options needed', 'Lactose intolerant guest',
  'Tree nut allergy - please be careful', 'Shellfish allergy',
  'Regular customer - usual table 12', null, null, null, null, null, null, null,
];

async function main() {
  console.log('Starting Part 3 seed: Guests + Reservations + Orders + Notifications...\n');

  const luma = await prisma.tenant.findUnique({ where: { slug: 'luma' } });
  if (!luma) {
    console.log('ERROR: Luma tenant not found. Run Parts 1 & 2 first.');
    return;
  }
  console.log(`Found Luma tenant: ${luma.id}`);

  const tables = await prisma.table.findMany({ where: { tenantId: luma.id }, orderBy: { number: 'asc' } });
  const servers = await prisma.user.findMany({ where: { tenantId: luma.id, role: 'SERVER' } });
  const menuItems = await prisma.menuItem.findMany({ where: { tenantId: luma.id } });

  console.log(`Found ${tables.length} tables, ${servers.length} servers, ${menuItems.length} menu items`);

  if (tables.length === 0 || servers.length === 0 || menuItems.length === 0) {
    console.log('ERROR: Missing required data (tables, servers, or menu items). Run Parts 1 & 2 first.');
    return;
  }

  // Clear existing operational data
  console.log('\nClearing existing guests, reservations, orders, notifications...');
  await prisma.notification.deleteMany({ where: { tenantId: luma.id } });
  await prisma.orderItem.deleteMany({ where: { order: { tenantId: luma.id } } });
  await prisma.order.deleteMany({ where: { tenantId: luma.id } });
  await prisma.reservation.deleteMany({ where: { tenantId: luma.id } });
  await prisma.guest.deleteMany({ where: { tenantId: luma.id } });
  console.log('Cleared existing data.');

  // ============================================
  // STEP 1: Create Guests
  // ============================================
  console.log('\n--- Creating 40 Guests ---');
  const createdGuests: Array<{ id: string; firstName: string; lastName: string | null; email: string | null; allergies: string[] }> = [];
  const today = new Date();

  for (const guest of guestsData) {
    const avgSpend = guest.visitCount > 0 ? guest.lifetimeSpend / guest.visitCount : 0;
    let lastVisit: Date | null = null;
    if (guest.visitCount > 0) {
      if ('lapsedDays' in guest && guest.lapsedDays) {
        lastVisit = new Date(today.getTime() - guest.lapsedDays * 24 * 60 * 60 * 1000);
      } else {
        lastVisit = new Date(today.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      }
    }

    const created = await prisma.guest.create({
      data: {
        tenantId: luma.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phone: guest.phone,
        vipTier: guest.vipTier,
        visitCount: guest.visitCount,
        lifetimeValue: guest.lifetimeSpend,
        averageSpend: avgSpend,
        lastVisit,
        allergies: guest.allergies,
        emailOptIn: guest.email !== null,
        smsOptIn: guest.phone !== null,
      },
    });
    createdGuests.push(created);
  }
  console.log(`Created ${createdGuests.length} guests`);

  // ============================================
  // STEP 2: Create Reservations (~90 spread over 30 days)
  // ============================================
  console.log('\n--- Creating ~90 Reservations (past 30 days) ---');

  const tableMap: Map<number, typeof tables> = new Map();
  tables.forEach(t => {
    if (!tableMap.has(t.capacity)) tableMap.set(t.capacity, []);
    tableMap.get(t.capacity)!.push(t);
  });

  const reservationBatch: Array<{
    tenantId: string; guestId: string; date: Date; time: string; partySize: number;
    status: ReservationStatus; bookingType: 'STANDARD'; guestFirstName: string;
    guestLastName: string | null; guestEmail: string | null; guestPhone: string | null;
    tableId: string | null; occasion: string | null; occasionNote: string | null; notes: string | null;
  }> = [];

  let guestIndex = 0;

  for (let dayOffset = 30; dayOffset >= -2; dayOffset--) {
    const reservationDate = new Date(today);
    reservationDate.setDate(reservationDate.getDate() - dayOffset);
    const dayOfWeek = reservationDate.getDay();

    let dailyCount: number;
    if (dayOfWeek === 5 || dayOfWeek === 6) dailyCount = 5;
    else if (dayOfWeek === 0 || dayOfWeek === 1) dailyCount = 1;
    else dailyCount = 3;

    if (dayOffset < 0) dailyCount = Math.min(dailyCount, 2);

    for (let r = 0; r < dailyCount; r++) {
      const guest = createdGuests[guestIndex % createdGuests.length];
      const partySize = [2, 2, 2, 2, 2, 4, 4, 4, 4, 6, 6, 8][Math.floor(Math.random() * 12)];
      const time = timeSlots[Math.floor(Math.random() * timeSlots.length)];
      const occasion = occasions[Math.floor(Math.random() * occasions.length)];
      const note = specialNotes[Math.floor(Math.random() * specialNotes.length)];

      let status: ReservationStatus;
      if (dayOffset > 0) {
        const rand = Math.random();
        if (rand < 0.65) status = 'COMPLETED';
        else if (rand < 0.80) status = 'NO_SHOW';
        else if (rand < 0.90) status = 'CANCELLED';
        else status = 'CONFIRMED';
      } else if (dayOffset === 0) {
        status = Math.random() < 0.5 ? 'CONFIRMED' : 'SEATED';
      } else {
        status = 'CONFIRMED';
      }

      // Find appropriate table
      let selectedTable: typeof tables[0] | null = null;
      for (const cap of [partySize, partySize + 1, partySize + 2, 12]) {
        const candidates = tableMap.get(cap);
        if (candidates && candidates.length > 0) {
          selectedTable = candidates[Math.floor(Math.random() * candidates.length)];
          break;
        }
      }

      let guestNotes: string | null = null;
      if (guest.allergies && guest.allergies.length > 0) {
        guestNotes = `Allergies: ${guest.allergies.join(', ')}`;
      }

      reservationBatch.push({
        tenantId: luma.id,
        guestId: guest.id,
        date: reservationDate,
        time,
        partySize,
        status,
        bookingType: 'STANDARD',
        guestFirstName: guest.firstName,
        guestLastName: guest.lastName,
        guestEmail: guest.email,
        guestPhone: guest.phone,
        tableId: selectedTable?.id || null,
        occasion,
        occasionNote: occasion ? `${occasion} celebration` : null,
        notes: note || guestNotes,
      });

      guestIndex++;
    }
  }

  await prisma.reservation.createMany({ data: reservationBatch });
  const createdReservations = await prisma.reservation.findMany({
    where: { tenantId: luma.id },
    orderBy: { date: 'asc' },
  });
  console.log(`Created ${createdReservations.length} reservations`);

  // ============================================
  // STEP 3: Create Orders (for completed reservations in past 7 days)
  // ============================================
  console.log('\n--- Creating Orders (past 7 days, completed) ---');

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentCompletedReservations = createdReservations.filter(r => {
    const resDate = new Date(r.date);
    return resDate >= sevenDaysAgo && r.status === 'COMPLETED';
  });
  console.log(`Found ${recentCompletedReservations.length} completed reservations in past 7 days`);

  // Group menu items by category
  const menuByCategory: Map<string, typeof menuItems> = new Map();
  menuItems.forEach(m => {
    if (!menuByCategory.has(m.category)) menuByCategory.set(m.category, []);
    menuByCategory.get(m.category)!.push(m);
  });

  let totalOrderCount = 0;
  let totalOrderItemCount = 0;
  let totalRevenue = 0;

  for (const reservation of recentCompletedReservations) {
    const table = tables.find(t => t.id === reservation.tableId) || tables[0];
    const server = servers[Math.floor(Math.random() * servers.length)];
    const covers = reservation.partySize;

    const itemCount = Math.min(2 + Math.floor(Math.random() * 4) + Math.floor(covers / 2), 8);
    const usedItems = new Set<string>();
    let subtotal = 0;

    const orderItemData: Array<{
      menuItemId: string; seatNumber: number; quantity: number; price: number;
      modifiers: string[]; station: Station; courseNumber: number;
      status: ItemStatus; allergies: string[]; firedAt: Date; completedAt: Date;
    }> = [];

    for (let i = 0; i < itemCount; i++) {
      const categories = Array.from(menuByCategory.keys());
      const category = categories[Math.floor(Math.random() * categories.length)];
      const categoryItems = menuByCategory.get(category)!;
      const menuItem = categoryItems[Math.floor(Math.random() * categoryItems.length)];

      if (usedItems.has(menuItem.id) && categoryItems.length > 1) {
        const otherItems = categoryItems.filter(m => m.id !== menuItem.id);
        if (otherItems.length > 0) usedItems.add(otherItems[0].id);
      } else {
        usedItems.add(menuItem.id);
      }

      const qty = Math.random() < 0.3 ? 2 : 1;
      const price = Number(menuItem.price);
      subtotal += price * qty;

      const firedAt = new Date(reservation.date.getTime() + 19 * 60 * 60 * 1000);
      const completedAt = new Date(reservation.date.getTime() + 20.5 * 60 * 60 * 1000);

      orderItemData.push({
        menuItemId: menuItem.id,
        seatNumber: (i % covers) + 1,
        quantity: qty,
        price,
        modifiers: [],
        station: menuItem.station,
        courseNumber: 1,
        status: 'COMPLETED',
        allergies: [],
        firedAt,
        completedAt,
      });
    }

    const tax = subtotal * 0.0875;
    const total = subtotal + tax;
    const suggestedTip = total * 0.18;

    const orderedAt = new Date(reservation.date.getTime() + 18 * 60 * 60 * 1000);
    const completedAtOrder = new Date(reservation.date.getTime() + 21 * 60 * 60 * 1000);

    const order = await prisma.order.create({
      data: {
        tenantId: luma.id,
        tableId: table.id,
        serverId: server.id,
        guestId: reservation.guestId,
        items: { create: orderItemData },
        status: 'COMPLETED',
        orderedAt,
        firedAt: new Date(reservation.date.getTime() + 19 * 60 * 60 * 1000),
        completedAt: completedAtOrder,
        source: 'DINE_IN',
        occasion: reservation.occasion || undefined,
        subtotal,
        tax,
        total,
        tip: suggestedTip,
        guestNotes: reservation.notes || undefined,
      },
      include: { items: true },
    });

    totalOrderCount++;
    totalOrderItemCount += order.items.length;
    totalRevenue += Number(order.total);

    // Simulate 15% re-fire: mark one item as FIRED then we'll leave it as FIRED to show kitchen attention needed
    if (Math.random() < 0.15 && order.items.length > 0) {
      const itemToRefire = order.items[0];
      await prisma.orderItem.update({
        where: { id: itemToRefire.id },
        data: { status: 'FIRED', firedAt: new Date(orderedAt.getTime() + 90 * 60 * 1000) },
      });
    }
  }
  console.log(`Created ${totalOrderCount} orders with ${totalOrderItemCount} items`);
  console.log(`Total revenue (7 days): $${totalRevenue.toFixed(2)}`);

  // ============================================
  // STEP 4: Create Notifications (20 recent)
  // ============================================
  console.log('\n--- Creating 20 Notifications ---');

  const notifications: Array<{
    tenantId: string; type: NotificationType; title: string; message: string;
    data: Record<string, unknown> | null; read: boolean; createdAt: Date;
  }> = [];

  // 6 reservation confirmations
  for (let i = 0; i < 6; i++) {
    const res = createdReservations[Math.floor(Math.random() * createdReservations.length)];
    notifications.push({
      tenantId: luma.id,
      type: 'RESERVATION_NEW',
      title: 'New Reservation',
      message: `New reservation for ${res.guestFirstName} ${res.guestLastName || ''} - Party of ${res.partySize}`,
      data: { reservationId: res.id },
      read: i < 2,
      createdAt: new Date(today.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    });
  }

  // 5 reservation reminders
  for (let i = 0; i < 5; i++) {
    const res = createdReservations.find(r => r.status === 'CONFIRMED');
    if (res) {
      notifications.push({
        tenantId: luma.id,
        type: 'RESERVATION_REMINDER',
        title: 'Reservation Reminder',
        message: `Reminder: ${res.guestFirstName} ${res.guestLastName || ''} tomorrow at ${res.time}`,
        data: { reservationId: res.id },
        read: Math.random() < 0.5,
        createdAt: new Date(today.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000),
      });
    }
  }

  // 4 low stock alerts
  const lowStockItems = ['Wagyu A5', 'Truffle', 'Saffron', 'Lobster Tail'];
  for (let i = 0; i < 4; i++) {
    notifications.push({
      tenantId: luma.id,
      type: 'LOW_STOCK',
      title: `Low Stock: ${lowStockItems[i]}`,
      message: `${lowStockItems[i]} is below reorder threshold`,
      data: { ingredient: lowStockItems[i] },
      read: i < 1,
      createdAt: new Date(today.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000),
    });
  }

  // 3 campaign notifications
  notifications.push({
    tenantId: luma.id, type: 'CAMPAIGN_SENT', title: 'Campaign Sent',
    message: 'Win-Back campaign sent to 45 lapsed guests',
    data: { campaignId: 'campaign_1', sent: 45 }, read: false,
    createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
  });
  notifications.push({
    tenantId: luma.id, type: 'CAMPAIGN_OPENED', title: 'Campaign Opened',
    message: 'Birthday campaign: 23 opens (51% open rate)',
    data: { campaignId: 'campaign_2', opens: 23, openRate: 0.51 }, read: true,
    createdAt: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000),
  });
  notifications.push({
    tenantId: luma.id, type: 'CAMPAIGN_SENT', title: 'Campaign Sent',
    message: 'Anniversary week promotional email sent to VIP guests',
    data: { campaignId: 'campaign_3', sent: 28 }, read: true,
    createdAt: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
  });

  // 2 no-show notifications
  for (let i = 0; i < 2; i++) {
    const noShowRes = createdReservations.find(r => r.status === 'NO_SHOW');
    if (noShowRes) {
      notifications.push({
        tenantId: luma.id, type: 'NO_SHOW', title: 'No-Show Recorded',
        message: `${noShowRes.guestFirstName} ${noShowRes.guestLastName || ''} did not show up for reservation`,
        data: { reservationId: noShowRes.id }, read: false,
        createdAt: new Date(today.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000),
      });
    }
  }

  await prisma.notification.createMany({ data: notifications });
  console.log(`Created ${notifications.length} notifications`);

  // ============================================
  // SUMMARY
  // ============================================
  const completedCount = createdReservations.filter(r => r.status === 'COMPLETED').length;
  const confirmedCount = createdReservations.filter(r => r.status === 'CONFIRMED').length;
  const noShowCount = createdReservations.filter(r => r.status === 'NO_SHOW').length;
  const cancelledCount = createdReservations.filter(r => r.status === 'CANCELLED').length;
  const seatedCount = createdReservations.filter(r => r.status === 'SEATED').length;

  console.log('\n========== PART 3 SEED SUMMARY ==========');
  console.log(`Tenant: Luma (${luma.id})`);
  console.log('--------------------------------------------');
  console.log(`Guests:        ${createdGuests.length}`);
  console.log(`  - VIP Platinum/Gold/Silver/Bronze: 8`);
  console.log(`  - Regular (returning): 12`);
  console.log(`  - First-timers: 15`);
  console.log(`  - Lapsed: 5`);
  console.log(`Reservations: ${createdReservations.length}`);
  console.log(`  - Completed:  ${completedCount}`);
  console.log(`  - Confirmed:  ${confirmedCount}`);
  console.log(`  - Seated:     ${seatedCount}`);
  console.log(`  - No-show:    ${noShowCount}`);
  console.log(`  - Cancelled:  ${cancelledCount}`);
  console.log(`Orders:        ${totalOrderCount} (past 7 days, completed)`);
  console.log(`Order Items:   ${totalOrderItemCount}`);
  console.log(`Notifications: ${notifications.length}`);
  console.log('--------------------------------------------');
  const avgOrderValue = totalOrderCount > 0 ? totalRevenue / totalOrderCount : 0;
  console.log(`Total Revenue (7 days): $${totalRevenue.toFixed(2)}`);
  console.log(`Avg Order Value: $${avgOrderValue.toFixed(2)}`);
  console.log(`Expected 30-day revenue: $${(totalRevenue * 4.3).toFixed(2)}`);
  console.log('============================================\n');
}

// ============================================
// STEP 5: Public Booking Demo — next 14 days
// ============================================
// For the public reservation widget demo, seed realistic availability
// across the next 14 days. Uses WALK_IN bookingType as proxy for
// public-facing bookings (schema has no dedicated source field).
async function seedPublicBookingDemo() {
  console.log('\n--- Seeding Public Booking Demo (next 14 days) ---');

  const luma = await prisma.tenant.findUnique({ where: { slug: 'luma' } });
  if (!luma) {
    console.log('SKIP: Luma tenant not found.');
    return;
  }

  const tables = await prisma.table.findMany({
    where: { tenantId: luma.id },
    orderBy: { number: 'asc' },
  });

  if (tables.length === 0) {
    console.log('SKIP: No tables found for Luma.');
    return;
  }

  // Build capacity buckets for matching party size → table
  const tableMap: Map<number, typeof tables> = new Map();
  tables.forEach(t => {
    if (!tableMap.has(t.capacity)) tableMap.set(t.capacity, []);
    tableMap.get(t.capacity)!.push(t);
  });

  // Reuse existing Luma guests (created in STEP 1 of this seed)
  const guests = await prisma.guest.findMany({
    where: { tenantId: luma.id },
    orderBy: { createdAt: 'asc' },
    take: 40,
  });

  if (guests.length === 0) {
    console.log('SKIP: No guests found — run full seed first.');
    return;
  }

  const lunchSlots = ['11:30', '12:00', '12:30', '13:00'];
  const dinnerSlots = ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];

  const batch: Array<{
    tenantId: string; guestId: string; date: Date; time: string; partySize: number;
    status: ReservationStatus; bookingType: 'WALK_IN'; guestFirstName: string;
    guestLastName: string | null; guestEmail: string | null; guestPhone: string | null;
    tableId: string | null; occasion: string | null; occasionNote: string | null; notes: string | null;
  }> = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0); // normalise to midnight

  // dayOffset 0 = today, 1 = tomorrow, … 13 = today+13 (14 days total)
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const reservationDate = new Date(today.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const dayOfWeek = reservationDate.getDay(); // 0=Sun, 1=Mon, … 6=Sat

    let reservationsPerService: number;
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      // Fri / Sat — 80 % booked → 7 reservations per service period
      reservationsPerService = 7;
    } else if (dayOfWeek === 0) {
      // Sun — 50 % booked → 5 reservations per service period
      reservationsPerService = 5;
    } else {
      // Mon–Thu — 40 % booked → 4 reservations per service period
      reservationsPerService = 4;
    }

    // Lunch service
    for (let r = 0; r < reservationsPerService; r++) {
      const guest = guests[Math.floor(Math.random() * guests.length)];
      const partySize = [2, 2, 2, 2, 3, 3, 4, 4][Math.floor(Math.random() * 8)];
      const time = lunchSlots[Math.floor(Math.random() * lunchSlots.length)];

      // Find table big enough for party
      let selectedTable: typeof tables[0] | null = null;
      for (const cap of [partySize, partySize + 1, partySize + 2, 12]) {
        const candidates = tableMap.get(cap);
        if (candidates && candidates.length > 0) {
          selectedTable = candidates[Math.floor(Math.random() * candidates.length)];
          break;
        }
      }

      batch.push({
        tenantId: luma.id,
        guestId: guest.id,
        date: reservationDate,
        time,
        partySize,
        status: 'CONFIRMED',
        bookingType: 'WALK_IN',
        guestFirstName: guest.firstName,
        guestLastName: guest.lastName,
        guestEmail: guest.email,
        guestPhone: guest.phone,
        tableId: selectedTable?.id || null,
        occasion: null,
        occasionNote: null,
        notes: null,
      });
    }

    // Dinner service
    for (let r = 0; r < reservationsPerService; r++) {
      const guest = guests[Math.floor(Math.random() * guests.length)];
      const partySize = [2, 2, 2, 3, 3, 4, 4, 6][Math.floor(Math.random() * 8)];
      const time = dinnerSlots[Math.floor(Math.random() * dinnerSlots.length)];

      let selectedTable: typeof tables[0] | null = null;
      for (const cap of [partySize, partySize + 1, partySize + 2, 12]) {
        const candidates = tableMap.get(cap);
        if (candidates && candidates.length > 0) {
          selectedTable = candidates[Math.floor(Math.random() * candidates.length)];
          break;
        }
      }

      batch.push({
        tenantId: luma.id,
        guestId: guest.id,
        date: reservationDate,
        time,
        partySize,
        status: 'CONFIRMED',
        bookingType: 'WALK_IN',
        guestFirstName: guest.firstName,
        guestLastName: guest.lastName,
        guestEmail: guest.email,
        guestPhone: guest.phone,
        tableId: selectedTable?.id || null,
        occasion: null,
        occasionNote: null,
        notes: null,
      });
    }
  }

  await prisma.reservation.createMany({ data: batch });
  console.log(`Created ${batch.length} public booking demo reservations (next 14 days, lunch + dinner)`);
}

export async function seedPart3() {
  await main();
  await seedPublicBookingDemo();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());