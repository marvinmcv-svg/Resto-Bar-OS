# RestaurantOS — Data Schema (Phase 1)

## Core Entities

### Tenant
```prisma
model Tenant {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  plan      String   @default("starter")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  users     User[]
}
```

### User & Auth
```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  firstName    String
  lastName     String
  role         Role     @default(SERVER)
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  hourlyRate   Decimal?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  orders       Order[]
  sessions     Session[]
}

enum Role {
  OWNER
  MANAGER
  HEAD_CHEF
  SERVER
  HOST
  BARTENDER
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  refreshToken String
  expiresAt    DateTime
  createdAt    DateTime @default(now())
}
```

## Module 1: Guests (Phase 2)
```prisma
model Guest {
  id              String   @id @default(uuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  email           String?
  phone           String?
  firstName       String
  lastName        String?
  preferredName   String?
  seatingPref     String?
  dietaryNotes    String?
  allergies       String[]
  vipTier         VipTier  @default(NONE)
  lifetimeValue   Decimal  @default(0)
  visitCount      Int      @default(0)
  lastVisit       DateTime?
  averageSpend    Decimal  @default(0)
  tags            String[]
  staffNotes      String?
  emailOptIn      Boolean  @default(true)
  smsOptIn        Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  reservations    Reservation[]
  orders          Order[]
  @@unique([tenantId, email])
  @@unique([tenantId, phone])
}

enum VipTier { NONE BRONZE SILVER GOLD PLATINUM }
```

## Module 2: Reservations (Phase 3)
```prisma
model Reservation {
  id              String   @id @default(uuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  guestId         String?
  guest           Guest?   @relation(fields: [guestId], references: [id])
  date            DateTime @db.Date
  time            String
  partySize       Int
  status          ReservationStatus @default(CONFIRMED)
  bookingType     BookingType @default(STANDARD)
  guestFirstName  String
  guestLastName   String?
  guestEmail      String?
  guestPhone      String?
  tableId         String?
  table           Table?   @relation(fields: [tableId], references: [id])
  tablePref       String?
  depositRequired Boolean  @default(false)
  depositAmount   Decimal?
  depositPaid     Boolean  @default(false)
  noShowCount     Int      @default(0)
  notes           String?
  occasion        String?
  occasionNote    String?
  reminderSent    Boolean  @default(false)
  confirmationSent Boolean @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum ReservationStatus { PENDING CONFIRMED SEATED COMPLETED CANCELLED NO_SHOW }
enum BookingType { STANDARD DEPOSIT_REQUIRED PREPAID_EXPERIENCE WALK_IN }

model Table {
  id          String   @id @default(uuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  number      Int
  name        String?
  capacity    Int
  minCapacity Int      @default(1)
  section     String?
  positionX   Int?
  positionY   Int?
  status      TableStatus @default(AVAILABLE)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  reservations Reservation[]
  orders      Order[]
  @@unique([tenantId, number])
}

enum TableStatus { AVAILABLE RESERVED SEATED ORDERED DESSERT BILL TURNING }
```

## Module 3: Kitchen / Orders (Phase 4)
```prisma
model MenuItem {
  id           String   @id @default(uuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  name         String
  description  String?
  price        Decimal  @db.Decimal(10,2)
  category     String
  station      Station
  is86         Boolean  @default(false)
  recipeId     String?
  recipe       Recipe?  @relation(fields: [recipeId], references: [id])
  availableModifiers String[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  orderItems   OrderItem[]
}

enum Station { GRILL COLD PASTRY EXPO BAR }

model Recipe {
  id           String   @id @default(uuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  name         String
  ingredients  RecipeIngredient[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model RecipeIngredient {
  id           String   @id @default(uuid())
  recipeId     String
  recipe       Recipe   @relation(fields: [recipeId], references: [id])
  ingredientId String
  ingredient   Ingredient @relation(fields: [ingredientId], references: [id])
  quantity     Decimal  @db.Decimal(10,4)
  unit         String
}

model Order {
  id            String   @id @default(uuid())
  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  tableId       String
  table         Table    @relation(fields: [tableId], references: [id])
  serverId      String
  server        User     @relation(fields: [serverId], references: [id])
  guestId       String?
  guest         Guest?   @relation(fields: [guestId], references: [id])
  items         OrderItem[]
  status        OrderStatus @default(PENDING)
  orderedAt     DateTime @default(now())
  firedAt       DateTime?
  completedAt   DateTime?
  source        OrderSource @default(DINE_IN)
  occasion      String?
  guestNotes    String?
  subtotal      Decimal  @db.Decimal(10,2)
  tax           Decimal  @db.Decimal(10,2)
  total         Decimal  @db.Decimal(10,2)
  tip           Decimal  @db.Decimal(10,2) @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum OrderStatus { PENDING FIRED IN_PROGRESS READY SERVED COMPLETED CANCELLED }
enum OrderSource { DINE_IN EVENT ONLINE PHONE }

model OrderItem {
  id           String   @id @default(uuid())
  orderId      String
  order        Order    @relation(fields: [orderId], references: [id])
  menuItemId   String
  menuItem     MenuItem @relation(fields: [menuItemId], references: [id])
  seatNumber   Int?
  quantity     Int      @default(1)
  price        Decimal  @db.Decimal(10,2)
  modifiers    String[]
  station      Station
  courseNumber Int      @default(1)
  status       ItemStatus @default(PENDING)
  firedAt      DateTime?
  completedAt  DateTime?
  allergies    String[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

enum ItemStatus { PENDING FIRED COOKING READY SERVED }
```

## Module 5: Inventory (Phase 5)
```prisma
model Ingredient {
  id              String   @id @default(uuid())
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  name            String
  unit            String
  category        String
  currentStock    Decimal  @db.Decimal(12,4) @default(0)
  unitCost        Decimal  @db.Decimal(10,4)
  reorderThreshold Decimal @db.Decimal(12,4) @default(0)
  parLevel        Decimal  @db.Decimal(12,4) @default(0)
  supplierId      String?
  supplier        Supplier? @relation(fields: [supplierId], references: [id])
  supplierSku     String?
  wasteCostYtd    Decimal  @db.Decimal(10,2) @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  recipeIngredients RecipeIngredient[]
}

model Supplier {
  id        String   @id @default(uuid())
  tenantId   String
  tenant     Tenant   @relation(fields: [tenantId], references: [id])
  name      String
  contactName String?
  email     String?
  phone     String?
  isPreferred Boolean @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ingredients Ingredient[]
}

model WasteLog {
  id           String   @id @default(uuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  ingredientId String
  ingredient   Ingredient @relation(fields: [ingredientId], references: [id])
  quantity     Decimal  @db.Decimal(12,4)
  reason       String
  cost         Decimal  @db.Decimal(10,2)
  notes        String?
  loggedBy     String
  loggedAt     DateTime @default(now())
}
```

## Module 7: Payments (Phase 9)
```prisma
model Payment {
  id           String   @id @default(uuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  orderId      String
  order        Order    @relation(fields: [orderId], references: [id])
  amount       Decimal  @db.Decimal(10,2)
  tip          Decimal  @db.Decimal(10,2) @default(0)
  total        Decimal  @db.Decimal(10,2)
  method       PaymentMethod
  status       PaymentStatus @default(PENDING)
  stripePaymentIntentId String?
  stripeChargeId        String?
  splitOf      String?
  processedAt   DateTime?
  createdAt    DateTime @default(now())
}

enum PaymentMethod { CARD CASH DIGITAL_WALLET }
enum PaymentStatus { PENDING COMPLETED FAILED REFUNDED CANCELLED }
```

## Module 8: Marketing (Phase 8)
```prisma
model EmailCampaign {
  id           String   @id @default(uuid())
  tenantId     String
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  name         String
  type         CampaignType
  trigger      CampaignTrigger
  targetSegment String[]
  subject      String
  templateId   String
  contentJson  Json
  sendAt       DateTime?
  sentCount    Int      @default(0)
  openCount    Int      @default(0)
  clickCount   Int      @default(0)
  conversionCount Int   @default(0)
  status       CampaignStatus @default(DRAFT)
  createdAt    DateTime @default(now())
}

enum CampaignType { EMAIL SMS PUSH }
enum CampaignTrigger { IMMEDIATE SCHEDULED RESERVATION_MADE POST_DINING BIRTHDAY WINBACK_60 WINBACK_90 }
enum CampaignStatus { DRAFT SCHEDULED SENDING SENT PAUSED FAILED }

model Notification {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  type      NotificationType
  title     String
  message   String
  data      Json?
  read      Boolean  @default(false)
  readAt    DateTime?
  createdAt DateTime @default(now())
}

enum NotificationType { LOW_STOCK RESERVATION_NEW RESERVATION_REMINDER NO_SHOW CAMPAIGN_SENT CAMPAIGN_OPENED REVIEW_NEGATIVE GUEST_BIRTHDAY WINBACK_SENT }
```

---

## Input → Output Contracts (by phase)

### Phase 1: Auth
- **Input:** `{ email, password }`
- **Output:** `{ accessToken, refreshToken, user }`
- **Token验证:** JWT payload → tenantId + userId + role

### Phase 2: Guest
- **Create:** `{ firstName, email?, phone?, allergies? }` → Guest
- **Search:** `{ query }` → Guest[]
- **History:** `{ guestId }` → `{ visits: [{ date, table, server, totalSpend }] }`

### Phase 3: Reservation
- **Create:** `{ date, time, partySize, guestFirstName }` → Reservation
- **Status change:** `{ status }` → Reservation (side effects: table status, no-show count)

### Phase 4: Order
- **Create:** `{ tableId, items: [{ menuItemId, quantity, modifiers? }] }` → Order (triggers: inventory deduct, KDS ticket, CRM update)
- **Bump:** `{ orderItemId }` → OrderItem (triggers: WebSocket broadcast)

### Phase 5: Inventory
- **Receive:** `{ ingredientId, quantity }` → Ingredient (side effect: currentStock +=)
- **Low stock alert:** ingredient.currentStock <= reorderThreshold → Notification + email