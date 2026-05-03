import { Module } from '@nestjs/common';
import { PublicBookingController } from './public-booking.controller';
import { PublicBookingService } from './public-booking.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [PublicBookingController],
  providers: [PublicBookingService, PrismaService],
})
export class PublicBookingModule {}
