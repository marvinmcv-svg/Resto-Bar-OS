import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import { TenantGuard } from './common/guards/tenant.guard';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { GuestsModule } from './modules/guests/guests.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { FloorModule } from './modules/floor/floor.module';
import { OrdersModule } from './modules/orders/orders.module';
import { KitchenModule } from './modules/kitchen/kds.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { StaffModule } from './modules/staff/staff.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { GroupsModule } from './modules/groups/groups.module';
import { PublicBookingModule } from './modules/public-booking/public-booking.module';
import { MenuModule } from './modules/menu/menu.module';
import { EventsModule } from './modules/events/events.module';
import { EmailModule } from './modules/email/email.module';
import { QueueModule } from './modules/queue/queue.module';
import { PrismaService } from './database/prisma.service';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    GuestsModule,
    ReservationsModule,
    FloorModule,
    OrdersModule,
    KitchenModule,
    InventoryModule,
    StaffModule,
    AnalyticsModule,
    MarketingModule,
    NotificationsModule,
    PaymentsModule,
    GroupsModule,
    PublicBookingModule,
    MenuModule,
    EventsModule,
    EmailModule,
    QueueModule,
  ],
  providers: [
    PrismaService,
    Reflector,
    { provide: APP_GUARD, useClass: TenantGuard },
  ],
})
export class AppModule {}
